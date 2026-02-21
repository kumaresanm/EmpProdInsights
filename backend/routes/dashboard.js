const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { load, loadMachines, loadEmployees, DEFAULT_SHIFTS } = require('../db');

/** Apply same filters as GET / to entries */
async function getFilteredEntries(req) {
  const { dateFrom, dateTo, employee, machine, shift, program_no } = req.query;
  let entries = await load();
  const today = new Date().toISOString().slice(0, 10);
  const from = dateFrom && String(dateFrom).trim() || today;
  const to = dateTo && String(dateTo).trim() || today;
  entries = entries.filter(e => e.date >= from && e.date <= to);
  if (employee && String(employee).trim()) {
    const q = String(employee).trim().toLowerCase();
    entries = entries.filter(e => (e.employee_name || '').toLowerCase().includes(q));
  }
  if (machine && String(machine).trim()) {
    const q = String(machine).trim().toLowerCase();
    entries = entries.filter(e => (e.machine || '').toLowerCase().includes(q));
  }
  if (shift && String(shift).trim()) {
    entries = entries.filter(e => e.shift === shift);
  }
  if (program_no && String(program_no).trim()) {
    const q = String(program_no).trim().toLowerCase();
    entries = entries.filter(e => (e.program_no || '').toLowerCase().includes(q));
  }
  return entries;
}

router.get('/', async (req, res) => {
  try {
    const filteredRows = await getFilteredEntries(req);
    const today = new Date().toISOString().slice(0, 10);
    const from = (req.query.dateFrom && String(req.query.dateFrom).trim()) || today;
    const to = (req.query.dateTo && String(req.query.dateTo).trim()) || today;
    filteredRows.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || '') || (a.machine || '').localeCompare(b.machine || ''));
    const totalActualHours = filteredRows.reduce((s, r) => s + (r.actual_hours || 0), 0);
    const totalPdnReq = filteredRows.reduce((s, r) => s + (r.pdn_req != null ? r.pdn_req : 0), 0);
    const totalProducted = filteredRows.reduce((s, r) => s + (r.producted_qty || 0), 0);
    const totalShort = filteredRows.reduce((s, r) => s + (r.short != null ? r.short : 0), 0);
    const byEmployeeProgram = {};
    filteredRows.forEach(r => {
      const name = (r.employee_name || 'Unknown').trim();
      const program = (r.program_no || '').trim();
      const key = `${name}|${program}`;
      if (!byEmployeeProgram[key]) byEmployeeProgram[key] = { employee_name: name, program_no: program, actualHours: 0, pdnReq: 0, producted: 0, short: 0 };
      byEmployeeProgram[key].actualHours += r.actual_hours || 0;
      byEmployeeProgram[key].pdnReq += r.pdn_req != null ? r.pdn_req : 0;
      byEmployeeProgram[key].producted += r.producted_qty || 0;
      byEmployeeProgram[key].short += r.short != null ? r.short : 0;
    });
    const by_employee = Object.values(byEmployeeProgram).map(v => ({
      employee_name: v.employee_name,
      program_no: v.program_no,
      actual_hours: Math.round(v.actualHours * 100) / 100,
      pdn_req: Math.round(v.pdnReq),
      producted_qty: Math.round(v.producted * 100) / 100,
      short: Math.round(v.short * 100) / 100
    }));
    by_employee.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || '') || (a.program_no || '').localeCompare(b.program_no || ''));
    res.json({
      dateFrom: from,
      dateTo: to,
      summary: {
        total_actual_hours: Math.round(totalActualHours * 100) / 100,
        total_pdn_req: Math.round(totalPdnReq),
        total_producted_qty: Math.round(totalProducted * 100) / 100,
        total_short: Math.round(totalShort * 100) / 100,
        entry_count: filteredRows.length
      },
      by_employee
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/filters', async (req, res) => {
  try {
    const [employees, machines, entries] = await Promise.all([loadEmployees(), loadMachines(), load()]);
    const shifts = DEFAULT_SHIFTS;
    const programNos = [...new Set(entries.map(e => e.program_no).filter(Boolean))].sort();
    res.json({ employees, shifts, machines, program_nos: programNos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/dashboard/export – download filtered data as Excel (same format as import) */
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
    const entries = await getFilteredEntries(req);
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

module.exports = router;
