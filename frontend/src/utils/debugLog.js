// ── Sync diagnostics (kept, hidden by default) ──────────────────────────────
// Persists a ring buffer of load/sync events to localStorage so we can read what
// happened on a PREVIOUS load directly on a phone PWA, with no tethered DevTools.
// Logging always runs (cheap, ring-buffered); the on-screen overlay is hidden by
// default — see DebugOverlay.jsx for the tap gesture that reveals it.
// See CLAUDE.md "Debug overlay" for how to turn it on/off.

const LOG_KEY = 'hq_debug_log';
const ENABLED_KEY = 'hq_debug_enabled';
const MAX = 60;

export function isDebugEnabled() {
  try { return localStorage.getItem(ENABLED_KEY) === 'true'; } catch { return false; }
}

export function setDebugEnabled(on) {
  try { localStorage.setItem(ENABLED_KEY, on ? 'true' : 'false'); } catch { /* ignore */ }
}

// Bump this on every instrumented build/deploy. If the running app logs an OLD
// stamp, the service worker served a stale bundle (hypothesis H2).
export const BUILD_STAMP = 'dbg-2026-06-24a';

export function dbg(event, fields = {}) {
  const entry = { t: new Date().toISOString().slice(11, 23), e: event, ...fields };
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    while (arr.length > MAX) arr.shift();
    localStorage.setItem(LOG_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
  // eslint-disable-next-line no-console
  console.log(`[HQ-SYNC] ${event}`, fields);
}

export function readDebugLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearDebugLog() {
  try { localStorage.removeItem(LOG_KEY); } catch { /* ignore */ }
}

// Compact fingerprint of a state/payload object — only the fields that could flip.
export function fingerprint(s) {
  if (!s || typeof s !== 'object') return { _: 'none' };
  const sp = s.activeSprint || {};
  return {
    xp: s.xp,
    streak: s.streak,
    view: s.appView,
    sprintStart: sp.sprintStartDate || null,
    selQ: (sp.selectedQuestIds || []).length,
    doneToday: (sp.completedTodayIds || []).length,
    focus: (s.focusItems || []).length,
    sprintCnt: s.sprintCount,
    saved: s.lastSavedAt || null,
    ended: s._sprintEnded,
  };
}

// Which fingerprint fields differ between two snapshots.
export function diffFingerprints(a, b) {
  const fa = fingerprint(a), fb = fingerprint(b);
  const changed = {};
  Object.keys(fa).forEach(k => {
    if (JSON.stringify(fa[k]) !== JSON.stringify(fb[k])) changed[k] = `${JSON.stringify(fa[k])}→${JSON.stringify(fb[k])}`;
  });
  return changed;
}
