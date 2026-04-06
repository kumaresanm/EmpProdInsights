const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { load, save, getNextId, computeDerived, deleteEntryById } = require('../db');

function shiftTimesFromBody(body) {
  const rawF = body.time_from;
  const rawT = body.time_to;
  const tf = rawF != null && rawF !== '' && String(rawF).trim() !== '' ? String(rawF).trim() : null;
  const tt = rawT != null && rawT !== '' && String(rawT).trim() !== '' ? String(rawT).trim() : null;
  return { time_from: tf, time_to: tt };
}

/** Pay cycle length in hours (e.g. 6, 12); empty → null. */
function paymentFromBody(body) {
  const v = body.payment;
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Hours actually spent working (drives PDN target with cycle time). Prefer actual_working_hours; actual_hours accepted for older clients. */
function actualWorkingHoursFromBody(body) {
  const v = body.actual_working_hours != null ? body.actual_working_hours : body.actual_hours;
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** Same filter logic as GET / – no default dates when empty */
async function getFilteredEntries(req) {
  const { dateFrom, dateTo, employee, shift, machine, program_no } = req.query;
  let entries = await load();
  if (dateFrom && String(dateFrom).trim()) entries = entries.filter(e => e.date >= dateFrom.trim());
  if (dateTo && String(dateTo).trim()) entries = entries.filter(e => e.date <= dateTo.trim());
  if (employee && String(employee).trim()) {
    const q = String(employee).trim().toLowerCase();
    entries = entries.filter(e => (e.employee_name || '').toLowerCase().includes(q));
  }
  if (shift && String(shift).trim()) entries = entries.filter(e => e.shift === shift);
  if (machine && String(machine).trim()) {
    const q = String(machine).trim().toLowerCase();
    entries = entries.filter(e => (e.machine || '').toLowerCase().includes(q));
  }
  if (program_no && String(program_no).trim()) {
    const q = String(program_no).trim().toLowerCase();
    entries = entries.filter(e => (e.program_no || '').toLowerCase().includes(q));
  }
  return entries;
}

router.get('/', async (req, res) => {
  try {
    let entries = await getFilteredEntries(req);
    entries.sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/entries/export – Excel with same filters as list (no default dates) */
const EXPORT_HEADERS = ['Date', 'Name', 'Shift', 'Machine', 'Prg. No.', 'Cycle time Sec', 'Login (h)', 'Actual work (h)', 'PDN Req', 'Producted Qty', 'Short', 'Pay cycle (hrs)', 'Reason'];
function round2(x) {
  return x != null ? Math.round(Number(x) * 100) / 100 : null;
}
function rowToExportRow(e) {
  const actualHours = round2(e.actual_hours);
  const pdnReq = e.pdn_req != null ? Math.round(Number(e.pdn_req)) : '';
  const productedQty = round2(e.producted_qty);
  const shortVal = round2(e.short);
  return [
    e.date || '',
    (e.employee_name || '').trim(),
    e.shift || '',
    (e.machine || '').trim(),
    (e.program_no || '').trim(),
    e.cycle_time_sec != null ? e.cycle_time_sec : '',
    e.hours_worked != null ? e.hours_worked : '',
    actualHours != null ? actualHours : '',
    pdnReq !== '' ? pdnReq : '',
    productedQty != null ? productedQty : '',
    shortVal != null ? shortVal : '',
    e.payment != null ? round2(e.payment) : '',
    (e.notes || '').trim()
  ];
}

router.get('/export', async (req, res) => {
  try {
    let entries = await getFilteredEntries(req);
    entries.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.employee_name || '').localeCompare(b.employee_name || ''));
    const rows = [EXPORT_HEADERS, ...entries.map(rowToExportRow)];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Production');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `production-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const entries = await load();
    const row = entries.find(e => String(e.id) === req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      date, employee_name, shift, machine, program_no,
      cycle_time_sec, hours_worked, pdn_req, producted_qty, notes
    } = req.body;
    const { time_from: tf, time_to: tt } = shiftTimesFromBody(req.body);
    const pay = paymentFromBody(req.body);
    const awh = actualWorkingHoursFromBody(req.body);
    const ct = Number(cycle_time_sec);
    const hw = Number(hours_worked);
    const { actualHours, piecesPerHour, actualPdn } = computeDerived(hw, ct, null, null, awh);
    const pr = pdn_req != null && pdn_req !== '' ? Number(pdn_req) : actualPdn;
    const pq = producted_qty != null && producted_qty !== '' ? Number(producted_qty) : null;
    const short = pq != null ? pr - pq : null;
    const entries = await load();
    const id = getNextId(entries);
    const row = {
      id, date, employee_name: employee_name || '', shift: shift || '', machine: machine || '', program_no: program_no || '',
      cycle_time_sec: ct, hours_worked: hw, actual_hours: actualHours, pieces_per_hour: piecesPerHour,
      actual_pdn: actualPdn, pdn_req: pr, producted_qty: pq, short, notes: notes || '',
      time_from: tf, time_to: tt, payment: pay
    };
    entries.push(row);
    await save(entries);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      date, employee_name, shift, machine, program_no,
      cycle_time_sec, hours_worked, pdn_req, producted_qty, notes
    } = req.body;
    const { time_from: tf, time_to: tt } = shiftTimesFromBody(req.body);
    const pay = paymentFromBody(req.body);
    const awh = actualWorkingHoursFromBody(req.body);
    const ct = Number(cycle_time_sec);
    const hw = Number(hours_worked);
    const { actualHours, piecesPerHour, actualPdn } = computeDerived(hw, ct, null, null, awh);
    const pr = pdn_req != null && pdn_req !== '' ? Number(pdn_req) : actualPdn;
    const pq = producted_qty != null && producted_qty !== '' ? Number(producted_qty) : null;
    const short = pq != null ? pr - pq : null;
    const entries = await load();
    const idx = entries.findIndex(e => String(e.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const row = {
      ...entries[idx],
      date, employee_name: employee_name || '', shift: shift || '', machine: machine || '', program_no: program_no || '',
      cycle_time_sec: ct, hours_worked: hw, actual_hours: actualHours, pieces_per_hour: piecesPerHour,
      actual_pdn: actualPdn, pdn_req: pr, producted_qty: pq, short, notes: notes || '',
      time_from: tf, time_to: tt, payment: pay
    };
    entries[idx] = row;
    await save(entries);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ok = await deleteEntryById(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
