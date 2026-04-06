const fs = require('fs');
const path = require('path');
const { normalizeDate, parseDayEventsList } = require('./day-events-store');

const dataPath = path.join(__dirname, 'data.json');

const DEFAULT_SHIFTS = ['1st', '2nd'];

function loadAll() {
  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(raw);
    const entries = Array.isArray(data.entries) ? data.entries : [];
    let machines = Array.isArray(data.machines) ? data.machines : [];
    let employees = Array.isArray(data.employees) ? data.employees : [];
    let programs = Array.isArray(data.programs) ? data.programs : [];
    if (machines.length === 0 && entries.length > 0) {
      machines = [...new Set(entries.map(e => e.machine).filter(Boolean))].sort();
    }
    if (employees.length === 0 && entries.length > 0) {
      employees = [...new Set(entries.map(e => e.employee_name).filter(Boolean))].sort();
    }
    if (programs.length === 0 && entries.length > 0) {
      programs = [...new Set(entries.map(e => e.program_no).filter(Boolean))].sort();
    }
    const day_events = parseDayEventsList(data.day_events);
    return { entries, machines, employees, programs, day_events };
  } catch {
    return { entries: [], machines: [], employees: [], programs: [], day_events: [] };
  }
}

function saveAll(data) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify({
    entries: data.entries,
    machines: data.machines || [],
    employees: data.employees || [],
    programs: data.programs || [],
    day_events: data.day_events || []
  }, null, 2), 'utf8');
}

function load() {
  return loadAll().entries;
}

/** Merge by id — never removes rows (only Admin → Delete all data can clear entries). */
function save(entries) {
  const data = loadAll();
  const incoming = Array.isArray(entries) ? entries : [];
  if (incoming.length === 0) return;
  const byId = new Map();
  for (const e of data.entries || []) {
    byId.set(e.id, { ...e });
  }
  for (const e of incoming) {
    byId.set(e.id, { ...e });
  }
  data.entries = Array.from(byId.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
  saveAll(data);
}

function loadMachines() {
  return loadAll().machines;
}

function loadEmployees() {
  return loadAll().employees;
}

function addMachine(name) {
  const data = loadAll();
  const n = (name || '').trim();
  if (!n || data.machines.includes(n)) return data.machines;
  data.machines.push(n);
  data.machines.sort();
  saveAll(data);
  return data.machines;
}

function removeMachine(name) {
  const data = loadAll();
  data.machines = data.machines.filter(m => m !== name);
  saveAll(data);
  return data.machines;
}

function addEmployee(name) {
  const data = loadAll();
  const n = (name || '').trim();
  if (!n || data.employees.includes(n)) return data.employees;
  data.employees.push(n);
  data.employees.sort();
  saveAll(data);
  return data.employees;
}

function removeEmployee(name) {
  const data = loadAll();
  data.employees = data.employees.filter(e => e !== name);
  saveAll(data);
  return data.employees;
}

function loadPrograms() {
  return loadAll().programs;
}

function addProgram(name) {
  const data = loadAll();
  const n = (name || '').trim();
  if (!n || data.programs.includes(n)) return data.programs;
  data.programs.push(n);
  data.programs.sort();
  saveAll(data);
  return data.programs;
}

function removeProgram(name) {
  const data = loadAll();
  data.programs = data.programs.filter(p => p !== name);
  saveAll(data);
  return data.programs;
}

function deleteAllData() {
  saveAll({
    entries: [],
    machines: [],
    employees: [],
    programs: [],
    day_events: []
  });
}

function loadDayEvents() {
  return loadAll().day_events || [];
}

function upsertDayEvent({ date, summary, detail }) {
  const d = normalizeDate(date);
  if (!d) throw new Error('Invalid date');
  const sum = (summary || '').trim();
  if (!sum) throw new Error('Summary required');
  const data = loadAll();
  const list = parseDayEventsList(data.day_events);
  const rest = list.filter(e => e.date !== d);
  rest.push({ id: Date.now(), date: d, summary: sum, detail: (detail || '').trim() });
  rest.sort((a, b) => a.date.localeCompare(b.date));
  data.day_events = rest;
  saveAll(data);
  return rest;
}

function removeDayEvent(date) {
  const d = normalizeDate(date);
  const data = loadAll();
  data.day_events = parseDayEventsList(data.day_events).filter(e => e.date !== d);
  saveAll(data);
  return data.day_events;
}

function deleteEntryById(id) {
  const data = loadAll();
  const numId = Number(id);
  const list = data.entries || [];
  const next = list.filter(e => Number(e.id) !== numId);
  if (next.length === list.length) return false;
  data.entries = next;
  saveAll(data);
  return true;
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
