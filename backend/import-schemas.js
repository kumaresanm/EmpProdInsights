/**
 * Import schemas: define what each "type" of Excel contains and where to store it.
 * Add new schemas here for future Excel types (e.g. raw material, orders).
 */

const SCHEMAS = {
  production: {
    id: 'production',
    label: 'Production entries',
    description: 'Employee, shift, machine, cycle time, hours worked. In Excel, "Actual PDN" = hours employee actually worked. PDN Req, Produced qty optional.',
    storeKey: 'entries',
    required: ['date', 'employee_name', 'cycle_time_sec', 'hours_worked'],
    columns: [
      { key: 'date', aliases: ['Date', 'date', 'Production Date'], type: 'date' },
      { key: 'employee_name', aliases: ['Name', 'name', 'Employee', 'employee', 'Employee Name'], type: 'string' },
      { key: 'shift', aliases: ['Shift', 'shift'], type: 'string' },
      { key: 'machine', aliases: ['Machine', 'machine', 'Machine No', 'Machine No.'], type: 'string' },
      { key: 'program_no', aliases: ['Prg. No.', 'Prg No', 'program_no', 'Program No', 'Program No.', 'Program', 'program', 'Prg No.', 'Prg'], type: 'string' },
      { key: 'cycle_time_sec', aliases: ['Cycle time Sec', 'Cycle time', 'cycle_time_sec', 'Cycle time (sec)'], type: 'number' },
      { key: 'hours_worked', aliases: ['PDN HR', 'hours_worked', 'Hours worked', 'Hours Worked'], type: 'number' },
      { key: 'actual_hours', aliases: ['Actual PDN', 'Actual pdn', 'actual pdn', 'Actual PDN (hours)', 'Hours actually worked'], type: 'number' },
      { key: 'pdn_req', aliases: ['PDN Req', 'pdn_req', 'PDN Required'], type: 'number' },
      { key: 'producted_qty', aliases: ['PDN Actual Qty', 'PDN Actual qty', 'Producted Qty', 'producted_qty', 'Produced Qty', 'Produced qty'], type: 'number' },
      { key: 'notes', aliases: ['Notes', 'notes', 'Remarks', 'remarks', 'Reason', 'reason'], type: 'string' }
    ]
  }
  // Future examples (uncomment and implement when needed):
  // orders: {
  //   id: 'orders',
  //   label: 'Client orders',
  //   storeKey: 'orders',
  //   required: ['order_id', 'client', 'quantity'],
  //   columns: [
  //     { key: 'order_id', aliases: ['Order ID', 'Order Id', 'Order No'], type: 'string' },
  //     { key: 'client', aliases: ['Client', 'Customer', 'client'], type: 'string' },
  //     { key: 'quantity', aliases: ['Quantity', 'Qty', 'quantity'], type: 'number' },
  //     { key: 'order_date', aliases: ['Date', 'Order Date'], type: 'date' }
  //   ]
  // },
  // raw_material: {
  //   id: 'raw_material',
  //   label: 'Raw material usage',
  //   storeKey: 'raw_material',
  //   required: ['material_type', 'quantity'],
  //   columns: [ ... ]
  // }
};

function getSchema(type) {
  return SCHEMAS[type] || null;
}

function listSchemas() {
  return Object.values(SCHEMAS).map(s => ({ id: s.id, label: s.label, description: s.description || '' }));
}

/**
 * Map Excel header row to schema fields.
 * Returns { fieldToIndex: { date: 0, employee_name: 1, ... }, mappedHeaders: { date: 'Date', ... }, missing: ['cycle_time_sec'] }
 */
function mapHeaders(headerRow, schema) {
  const normalized = headerRow.map(h => (h != null ? String(h).trim() : ''));
  const fieldToIndex = {};
  const mappedHeaders = {};
  const missing = [];

  for (const col of schema.columns) {
    let found = false;
    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i];
      if (!h) continue;
      const match = col.aliases.some(alias => {
        const a = String(alias).trim().toLowerCase();
        const b = h.toLowerCase();
        return a === b || b.includes(a) || a.includes(b);
      });
      if (match) {
        fieldToIndex[col.key] = i;
        mappedHeaders[col.key] = h;
        found = true;
        break;
      }
    }
    if (!found && schema.required.includes(col.key)) missing.push(col.key);
  }

  return { fieldToIndex, mappedHeaders, missing };
}

/**
 * Get value from row by field name using the column map.
 */
function getMappedValue(row, fieldKey, fieldToIndex, schema) {
  const col = schema.columns.find(c => c.key === fieldKey);
  if (!col) return null;
  const i = fieldToIndex[fieldKey];
  if (i === undefined || i < 0) return null;
  const raw = row[i];
  if (raw == null || raw === '') return col.type === 'number' ? null : '';
  if (col.type === 'number') return parseFloat(raw) || null;
  if (col.type === 'date') {
    const n = Number(raw);
    if (Number.isFinite(n)) {
      const d = new Date((n - 25569) * 86400 * 1000);
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    return String(raw).trim() || null;
  }
  return String(raw).trim();
}

module.exports = { SCHEMAS, getSchema, listSchemas, mapHeaders, getMappedValue };
