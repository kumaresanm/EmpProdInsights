const { createClient } = require('@supabase/supabase-js');
const { normalizeDate, parseDayEventsList } = require('./day-events-store');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const DEFAULT_SHIFTS = ['1st', '2nd'];

/** Set to 1 after: ALTER TABLE entries ADD COLUMN IF NOT EXISTS time_from TEXT; ADD COLUMN IF NOT EXISTS time_to TEXT; */
const INCLUDE_ENTRY_SHIFT_TIMES = /^1|true$/i.test(String(process.env.SUPABASE_ENTRY_SHIFT_TIMES || '').trim());

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

async function loadDayEventsFromConfig() {
  const { data, error } = await supabase.from('config').select('value').eq('key', 'day_events').single();
  if (error && error.code !== 'PGRST116') throw error;
  return parseDayEventsList(data?.value);
}

async function saveDayEventsToConfig(list) {
  await supabase.from('config').upsert({ key: 'day_events', value: list || [] }, { onConflict: 'key' });
}

const ENTRIES_PAGE = 1000;
const UPSERT_CHUNK = 400;

/** Fetch all rows — Supabase/PostgREST defaults to 1000 rows per request; without paging, sync would miss rows. */
async function load() {
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + ENTRIES_PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < ENTRIES_PAGE) break;
    from += ENTRIES_PAGE;
  }
  return all.map(row => ({ ...row, id: Number(row.id) }));
}

async function deleteEntryById(id) {
  const numId = Number(id);
  const { data, error } = await supabase.from('entries').delete().eq('id', numId).select('id');
  if (error) throw error;
  return !!(data && data.length > 0);
}

function entryToDbRow(e) {
  const row = {
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
    notes: e.notes || '',
    payment: (() => {
      const v = e.payment;
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
    })()
  };
  if (INCLUDE_ENTRY_SHIFT_TIMES) {
    row.time_from = e.time_from != null && String(e.time_from).trim() !== '' ? String(e.time_from).trim() : null;
    row.time_to = e.time_to != null && String(e.time_to).trim() !== '' ? String(e.time_to).trim() : null;
  }
  return row;
}

/**
 * Upsert entries only — never deletes rows. Empty `entries` is a no-op (avoids accidental wipes).
 * Removing production data is only done via deleteAllData() (Admin → Delete all data).
 */
async function save(entries) {
  const list = Array.isArray(entries) ? entries : [];
  if (list.length === 0) return;

  const rows = list.map(entryToDbRow);
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabase.from('entries').upsert(chunk, { onConflict: 'id' });
    if (error) throw error;
  }
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

/** Admin only: wipe all production entries, machines/employees/programs lists, and day events. */
async function deleteAllData() {
  const { error: delErr } = await supabase.from('entries').delete().neq('id', 0);
  if (delErr) throw delErr;
  await setConfig('machines', []);
  await setConfig('employees', []);
  await setConfig('programs', []);
  await saveDayEventsToConfig([]);
}

async function loadDayEvents() {
  return loadDayEventsFromConfig();
}

async function upsertDayEvent({ date, summary, detail }) {
  const d = normalizeDate(date);
  if (!d) throw new Error('Invalid date');
  const sum = (summary || '').trim();
  if (!sum) throw new Error('Summary required');
  const list = await loadDayEventsFromConfig();
  const rest = list.filter(e => e.date !== d);
  rest.push({ id: Date.now(), date: d, summary: sum, detail: (detail || '').trim() });
  rest.sort((a, b) => a.date.localeCompare(b.date));
  await saveDayEventsToConfig(rest);
  return rest;
}

async function removeDayEvent(date) {
  const d = normalizeDate(date);
  const list = (await loadDayEventsFromConfig()).filter(e => e.date !== d);
  await saveDayEventsToConfig(list);
  return list;
}

function getNextId(entries) {
  const max = entries.reduce((m, e) => (e.id > m ? e.id : m), 0);
  return max + 1;
}

/**
 * @param actualWorkingHours Explicit hours spent producing (form / Excel). If missing or invalid, uses legacy (login hours × 11/12).
 */
function computeDerived(hoursWorked, cycleTimeSec, pdnReq, productedQty, actualWorkingHours) {
  const explicit = actualWorkingHours != null && actualWorkingHours !== ''
    ? Number(actualWorkingHours)
    : NaN;
  const actualHours = (Number.isFinite(explicit) && explicit > 0)
    ? Math.round(explicit * 100) / 100
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
  deleteEntryById,
  deleteAllData,
  loadDayEvents,
  upsertDayEvent,
  removeDayEvent,
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
