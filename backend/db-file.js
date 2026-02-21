const fs = require('fs');
const path = require('path');

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
    return { entries, machines, employees, programs };
  } catch {
    return { entries: [], machines: [], employees: [], programs: [] };
  }
}

function saveAll(data) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify({
    entries: data.entries,
    machines: data.machines || [],
    employees: data.employees || [],
    programs: data.programs || []
  }, null, 2), 'utf8');
}

function load() {
  return loadAll().entries;
}

function save(entries) {
  const data = loadAll();
  data.entries = entries;
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
  saveAll({ entries: [], machines: [], employees: [], programs: [] });
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
