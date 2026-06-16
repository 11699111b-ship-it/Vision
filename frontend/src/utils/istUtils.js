// IST Time Engine Utilities
// All time calculations relative to Asia/Kolkata (IST = UTC+5:30)

export function getISTNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

// Returns YYYY-MM-DD in IST
export function getISTDate() {
  return getISTNow().toLocaleDateString('en-CA');
}

// 0–23 hour in IST
export function getISTHour() {
  return getISTNow().getHours();
}

/**
 * Returns the Sunday 23:58:00 IST deadline for a sprint started at `launchTimestamp`.
 * Rule: find the NEXT Sunday (relative to launch day) at 23:58:00 IST.
 * If launched on a Sunday at/after 23:58, the deadline is the following Sunday.
 */
export function getSprintDeadlineIST(launchTimestamp) {
  if (!launchTimestamp) return null;
  const ist = new Date(new Date(launchTimestamp).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dow = ist.getDay();            // 0 = Sun, 6 = Sat
  const deadline = new Date(ist);

  if (dow === 0) {
    // Launched on Sunday — if before 23:58 use today, else push 7 days
    deadline.setHours(23, 58, 0, 0);
    if (ist.getHours() >= 23 && ist.getMinutes() >= 58) {
      deadline.setDate(deadline.getDate() + 7);
    }
  } else {
    deadline.setDate(ist.getDate() + (7 - dow));
    deadline.setHours(23, 58, 0, 0);
  }
  return deadline;
}

export function isSprintExpired(sprintStartDate) {
  if (!sprintStartDate) return false;
  const nowIST = getISTNow();
  const deadline = getSprintDeadlineIST(sprintStartDate);
  return deadline ? nowIST > deadline : false;
}

// Formats "10 Feb 26 - 17 Feb 26" style week range from sprint start → end (IST)
export function formatWeekRange(sprintStartDate) {
  if (!sprintStartDate) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const start = new Date(new Date(sprintStartDate).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const fmt = (d) => `${d.getDate()} ${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  const endIST = getISTNow();
  return `${fmt(start)} - ${fmt(endIST)}`;
}
