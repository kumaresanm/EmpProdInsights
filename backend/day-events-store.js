/**
 * Day-wide events (e.g. power cut) — one record per calendar date, shown on all entries that day.
 */

function normalizeDate(d) {
  if (!d) return '';
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const date = normalizeDate(raw.date);
  if (!date) return null;
  const summary = raw.summary != null ? String(raw.summary).trim() : '';
  if (!summary) return null;
  const id = raw.id != null ? Number(raw.id) : Date.now();
  const detail = raw.detail != null ? String(raw.detail).trim() : '';
  return { id, date, summary, detail };
}

function parseDayEventsList(val) {
  if (!Array.isArray(val)) return [];
  return val.map(normalizeEvent).filter(Boolean);
}

module.exports = { normalizeDate, normalizeEvent, parseDayEventsList };
