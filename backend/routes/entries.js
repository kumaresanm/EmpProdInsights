const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { load, save, getNextId, computeDerived } = require('../db');

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
const EXPORT_HEADERS = ['Date', 'Name', 'Shift', 'Machine', 'Prg. No.', 'Cycle time Sec', 'PDN HR', 'Actual PDN', 'PDN Req', 'Producted Qty', 'Short', 'Reason'];
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
    const ct = Number(cycle_time_sec);
    const hw = Number(hours_worked);
    const { actualHours, piecesPerHour, actualPdn } = computeDerived(hw, ct, null, null);
    const pr = pdn_req != null && pdn_req !== '' ? Number(pdn_req) : actualPdn;
    const pq = producted_qty != null && producted_qty !== '' ? Number(producted_qty) : null;
    const short = pq != null ? pr - pq : null;
    const entries = await load();
    const id = getNextId(entries);
    const row = {
      id, date, employee_name: employee_name || '', shift: shift || '', machine: machine || '', program_no: program_no || '',
      cycle_time_sec: ct, hours_worked: hw, actual_hours: actualHours, pieces_per_hour: piecesPerHour,
      actual_pdn: actualPdn, pdn_req: pr, producted_qty: pq, short, notes: notes || ''
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
    const ct = Number(cycle_time_sec);
    const hw = Number(hours_worked);
    const { actualHours, piecesPerHour, actualPdn } = computeDerived(hw, ct, null, null);
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
      actual_pdn: actualPdn, pdn_req: pr, producted_qty: pq, short, notes: notes || ''
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
    const entries = await load();
    const idx = entries.findIndex(e => String(e.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    entries.splice(idx, 1);
    await save(entries);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
