const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { load, save, computeDerived, addMachine, addEmployee } = require('../db');
const { getSchema, listSchemas, mapHeaders, getMappedValue } = require('../import-schemas');

const upload = multer({ dest: path.join(__dirname, '../uploads/'), limits: { fileSize: 5 * 1024 * 1024 } });

/** GET /api/upload/schemas – list available import types (for UI dropdown) */
router.get('/schemas', (req, res) => {
  try {
    res.json(listSchemas());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/upload – upload Excel. Query: ?type=production (default). Body: file */
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const importType = (req.query.type || 'production').toLowerCase();
  const schema = getSchema(importType);
  if (!schema) return res.status(400).json({ error: `Unknown import type: ${importType}` });

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 2) {
      return res.status(400).json({ error: 'Sheet must have header row and at least one data row' });
    }

    const headerRow = rows[0].map(h => (h != null ? String(h).trim() : ''));
    const { fieldToIndex, mappedHeaders, missing } = mapHeaders(headerRow, schema);
    if (missing.length > 0) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(400).json({
        error: 'Required columns not found in Excel',
        missing,
        hint: `Expected headers like: ${missing.map(m => schema.columns.find(c => c.key === m)?.aliases?.[0] || m).join(', ')}`,
        detected: mappedHeaders
      });
    }

    if (schema.id === 'production') {
      let lastDate = null;
      const toInsert = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cycleTime = getMappedValue(row, 'cycle_time_sec', fieldToIndex, schema) || 0;
        const name = getMappedValue(row, 'employee_name', fieldToIndex, schema) || '';
        if (cycleTime <= 0 || !name) continue;
        const date = getMappedValue(row, 'date', fieldToIndex, schema) || lastDate;
        if (!date) continue;
        lastDate = date;
        const hw = (getMappedValue(row, 'hours_worked', fieldToIndex, schema) || 0) > 0
          ? getMappedValue(row, 'hours_worked', fieldToIndex, schema) : 12;
        const excelActualHours = getMappedValue(row, 'actual_hours', fieldToIndex, schema);
        const rPdnReq = getMappedValue(row, 'pdn_req', fieldToIndex, schema);
        const rProductedQty = getMappedValue(row, 'producted_qty', fieldToIndex, schema);
        const { actualHours, piecesPerHour, actualPdn } = computeDerived(hw, cycleTime, null, null, excelActualHours);
        const pr = rPdnReq != null && rPdnReq !== '' ? rPdnReq : actualPdn;
        const pq = rProductedQty != null && rProductedQty !== '' ? rProductedQty : null;
        const short = pq != null ? pr - pq : null;
        toInsert.push({
          date,
          employee_name: name,
          shift: getMappedValue(row, 'shift', fieldToIndex, schema) || '',
          machine: getMappedValue(row, 'machine', fieldToIndex, schema) || '',
          program_no: getMappedValue(row, 'program_no', fieldToIndex, schema) || '',
          cycle_time_sec: cycleTime,
          hours_worked: hw,
          actual_hours: actualHours,
          pieces_per_hour: piecesPerHour,
          actual_pdn: actualPdn,
          pdn_req: pr,
          producted_qty: pq,
          short,
          notes: getMappedValue(row, 'notes', fieldToIndex, schema) || ''
        });
      }
      const entries = load();
      let maxId = entries.reduce((m, e) => (e.id > m ? e.id : m), 0);
      toInsert.forEach(row => {
        maxId++;
        entries.push({ id: maxId, ...row });
      });
      save(entries);
      const machines = [...new Set(toInsert.map(e => e.machine).filter(Boolean))];
      const employees = [...new Set(toInsert.map(e => e.employee_name).filter(Boolean))];
      machines.forEach(m => addMachine(m));
      employees.forEach(e => addEmployee(e));
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.json({
        imported: toInsert.length,
        message: `Imported ${toInsert.length} production rows`,
        type: 'production',
        mappedColumns: mappedHeaders
      });
    }

    // Future: handle other schema types (orders, raw_material) here
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(400).json({ error: `Import type "${schema.id}" is not implemented yet` });
  } catch (e) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
