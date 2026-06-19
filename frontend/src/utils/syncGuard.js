// ── Sync write guard ─────────────────────────────────────────────────────────
// Decides whether an incoming state write may replace what's already stored.
//
// The sheet is the single source of truth, but every open client (PWA, a
// backgrounded browser tab) can POST to it. A stale client still showing the
// planning screen must NOT be allowed to overwrite an active sprint another
// client just launched — that was the "tick works, then it jumps to planning"
// bug. Submit / auto-submit / reset legitimately end a sprint and carry the
// `_sprintEnded` marker, which is the only way a no-sprint state may win.
//
// IMPORTANT: this exact logic is mirrored in `gas-update-weekly-goals.gs`
// (`shouldAcceptStateWrite`). Keep the two in sync.

function hasActiveSprint(state) {
  const s = (state && state.activeSprint) || {};
  return !!s.sprintStartDate && ((s.selectedQuestIds || []).length > 0);
}

export function shouldAcceptStateWrite(incoming, stored) {
  if (!incoming || typeof incoming !== 'object') return false;
  if (!stored) return true; // nothing stored yet — accept

  // Protect an active sprint: a planning / no-sprint write may only replace it
  // if the writer explicitly ended the sprint (submit / auto-submit / reset).
  if (hasActiveSprint(stored) && !hasActiveSprint(incoming) && !incoming._sprintEnded) {
    return false;
  }
  return true;
}
