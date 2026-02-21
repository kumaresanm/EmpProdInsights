/**
 * DB layer: file-based (default) or Supabase.
 * Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use Supabase.
 * All exports are async (return Promises).
 */
const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const db = useSupabase ? require('./db-supabase') : require('./db-file');

function wrap(fn) {
  return (...args) => Promise.resolve(fn(...args));
}

if (!useSupabase) {
  module.exports = {
    load: () => wrap(db.load)(),
    save: (e) => wrap(db.save)(e),
    loadAll: () => wrap(db.loadAll)(),
    saveAll: (d) => wrap(db.saveAll)(d),
    deleteAllData: () => wrap(db.deleteAllData)(),
    loadMachines: () => wrap(db.loadMachines)(),
    loadEmployees: () => wrap(db.loadEmployees)(),
    loadPrograms: () => wrap(db.loadPrograms)(),
    addMachine: (n) => wrap(db.addMachine)(n),
    removeMachine: (n) => wrap(db.removeMachine)(n),
    addEmployee: (n) => wrap(db.addEmployee)(n),
    removeEmployee: (n) => wrap(db.removeEmployee)(n),
    addProgram: (n) => wrap(db.addProgram)(n),
    removeProgram: (n) => wrap(db.removeProgram)(n),
    getNextId: db.getNextId,
    computeDerived: db.computeDerived,
    DEFAULT_SHIFTS: db.DEFAULT_SHIFTS
  };
} else {
  module.exports = db;
}
