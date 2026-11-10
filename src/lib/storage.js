// USend — namespaced localStorage helpers.
//
// The project was renamed from "instantflow" to "usend". The legacy keys are
// read once and migrated so returning users keep their language choice and
// their cached star count, and the old entries are dropped afterwards.

const PREFIX = "usend:";
const LEGACY_PREFIX = "instantflow:";

export function readItem(key) {
  try {
    const current = localStorage.getItem(PREFIX + key);
    if (current !== null) return current;
    const legacy = localStorage.getItem(LEGACY_PREFIX + key);
    if (legacy === null) return null;
    localStorage.setItem(PREFIX + key, legacy);
    localStorage.removeItem(LEGACY_PREFIX + key);
    return legacy;
  } catch {
    return null;
  }
}

export function writeItem(key, value) {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Private browsing modes can reject writes — the app works without them.
  }
}
