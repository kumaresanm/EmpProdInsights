const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const DEFAULT_SHIFTS = ['1st', '2nd'];

function normalizeConfigArray(val) {
  if (Array.isArray(val)) return val.map(v => (v != null ? String(v) : '')).filter(Boolean);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.map(v => (v != null ? String(v) : '')).filter(Boolean) : [];
    } catch (_) { return []; }
  }
  return [];
}

async function getConfig(key) {
  const { data, error } = await supabase.from('config').select('value').eq('key', key).single();
  if (error && error.code !== 'PGRST116') throw error;
  return normalizeConfigArray(data?.value);
}

async function setConfig(key, arr) {
  await supabase.from('config').upsert({ key, value: arr || [] }, { onConflict: 'key' });
}

async function load() {
  const { data, error } = await supabase.from('entries').select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => ({ ...row, id: Number(row.id) }));
}

async function save(entries) {
  await supabase.from('entries').delete().neq('id', 0);
  if (entries.length === 0) return;
  const rows = entries.map(e => ({
    id: e.id,
    date: e.date,
    employee_name: e.employee_name || '',
    shift: e.shift || '',
    machine: e.machine || '',
    program_no: e.program_no || '',
    cycle_time_sec: e.cycle_time_sec,
    hours_worked: e.hours_worked,
    actual_hours: e.actual_hours,
    pieces_per_hour: e.pieces_per_hour,
    actual_pdn: e.actual_pdn,
    pdn_req: e.pdn_req,
    producted_qty: e.producted_qty,
    short: e.short,
    notes: e.notes || ''
  }));
  const { error } = await supabase.from('entries').insert(rows);
  if (error) throw error;
}

async function loadAll() {
  const [entries, machines, employees, programs] = await Promise.all([
    load(),
    getConfig('machines'),
    getConfig('employees'),
    getConfig('programs')
  ]);
  let machinesList = machines.length ? machines : [...new Set(entries.map(e => e.machine).filter(Boolean))].sort();
  let employeesList = employees.length ? employees : [...new Set(entries.map(e => e.employee_name).filter(Boolean))].sort();
  let programsList = programs.length ? programs : [...new Set(entries.map(e => e.program_no).filter(Boolean))].sort();
  return { entries, machines: machinesList, employees: employeesList, programs: programsList };
}

async function saveAll(data) {
  await save(data.entries || []);
  await setConfig('machines', data.machines || []);
  await setConfig('employees', data.employees || []);
  await setConfig('programs', data.programs || []);
}

async function loadMachines() {
  return getConfig('machines');
}

async function loadEmployees() {
  return getConfig('employees');
}

async function loadPrograms() {
  const fromConfig = await getConfig('programs');
  if (fromConfig.length > 0) return fromConfig;
  const entries = await load();
  const fromEntries = [...new Set(entries.map(e => (e.program_no != null ? String(e.program_no).trim() : '')).filter(Boolean))].sort();
  return fromEntries;
}

async function addMachine(name) {
  const n = (name || '').trim();
  if (!n) return getConfig('machines');
  let list = await getConfig('machines');
  if (list.includes(n)) return list;
  list = [...list, n].sort();
  await setConfig('machines', list);
  return list;
}

async function removeMachine(name) {
  let list = await getConfig('machines');
  list = list.filter(m => m !== name);
  await setConfig('machines', list);
  return list;
}

async function addEmployee(name) {
  const n = (name || '').trim();
  if (!n) return getConfig('employees');
  let list = await getConfig('employees');
  if (list.includes(n)) return list;
  list = [...list, n].sort();
  await setConfig('employees', list);
  return list;
}

async function removeEmployee(name) {
  let list = await getConfig('employees');
  list = list.filter(e => e !== name);
  await setConfig('employees', list);
  return list;
}

async function addProgram(name) {
  const n = (name || '').trim();
  if (!n) return getConfig('programs');
  let list = await getConfig('programs');
  if (list.includes(n)) return list;
  list = [...list, n].sort();
  await setConfig('programs', list);
  return list;
}

async function removeProgram(name) {
  let list = await getConfig('programs');
  list = list.filter(p => p !== name);
  await setConfig('programs', list);
  return list;
}

async function deleteAllData() {
  await save([]);
  await setConfig('machines', []);
  await setConfig('employees', []);
  await setConfig('programs', []);
}

function getNextId(entries) {
  const max = entries.reduce((m, e) => (e.id > m ? e.id : m), 0);
  return max + 1;
}

function computeDerived(hoursWorked, cycleTimeSec, pdnReq, productedQty, actualHoursFromExcel) {
  const actualHours = (actualHoursFromExcel != null && actualHoursFromExcel > 0)
    ? Number(actualHoursFromExcel)
    : (hoursWorked * 11) / 12;
  const piecesPerHour = 3600 / cycleTimeSec;
  const actualPdn = piecesPerHour * actualHours;
  const target = pdnReq != null ? pdnReq : actualPdn;
  const short = productedQty != null ? target - productedQty : null;
  return { actualHours, piecesPerHour, actualPdn, short };
}

module.exports = {
  load,
  save,
  loadAll,
  saveAll,
  deleteAllData,
  loadMachines,
  loadEmployees,
  loadPrograms,
  addMachine,
  removeMachine,
  addEmployee,
  removeEmployee,
  addProgram,
  removeProgram,
  getNextId,
  computeDerived,
  DEFAULT_SHIFTS
};
