// The lesson or chapter each item was last open at, so the library and the list page can offer «continue».
// It is a convenience for this browser only (the done ticks live on the server), so a blocked storage
// (private mode, cleared site data) simply means no «continue». The storage is passed in for the tests.
const STORAGE_KEY = "ymd-read-last";
const browserStorage = () => localStorage;

function readAll(storage) {
  try {
    const value = JSON.parse(storage().getItem(STORAGE_KEY) ?? "{}");
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {}; // storage blocked or the value unreadable: same as nothing saved
  }
}

/** The unit number last open for item id, or null when none is saved. */
export function lastUnitOf(id, storage = browserStorage) {
  const n = readAll(storage)[id];
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Saves n as the unit last open for item id. */
export function rememberUnit(id, n, storage = browserStorage) {
  try {
    const all = readAll(storage);
    all[id] = n;
    storage().setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (error) {
    console.error("reader: storage unwritable, no «continue» for this item", error.name);
  }
}
