const SHEET_ID = '1n75In-uqipFeZcigKUyLgK_F21cTnXmY9gYPwQRnMWE';

function doPost(e) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var stateSheet = ss.getSheetByName('State');

  try {
    var raw = e.postData.contents;
    if (raw.indexOf('payload=') === 0) {
      raw = decodeURIComponent(raw.substring(8).replace(/\+/g, '%20'));
    }
    var data = JSON.parse(raw);

    // Phase 1: Log goals on mission launch (completion % and week left blank)
    if (data.action === 'log_goals') {
      logGoalsOnLaunch(ss, data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'goals_logged' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Phase 2a: Update Weekly Goals row with completion % and week on submit
    if (data.action === 'update_goals') {
      updateGoalsOnSubmit(ss, data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'goals_updated' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Goals Tracker: update on mission launch
    if (data.action === 'track_goals_launch') {
      trackGoalsOnLaunch(ss, data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'tracker_launch_logged' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Goals Tracker: update on sprint submit
    if (data.action === 'track_goals_submit') {
      trackGoalsOnSubmit(ss, data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'tracker_submit_updated' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Phase 2b: Log to WeeklyLogs sheet on submit
    if (data.action === 'log') {
      var logSheet = ss.getSheetByName('WeeklyLogs');
      logSheet.appendRow([
        new Date(), data.week, data.percentage,
        data.xpEarned, data.totalQuests, data.completedQuests,
      ]);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'logged' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Accountability: manual Daily Submit — store today's row + send the report immediately
    if (data.action === 'request_daily_report') {
      handleRequestDailyReport(ss, data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'daily_report_sent' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Accountability: immediate Weekly WhatsApp report on submit (payload carries all data — race-safe)
    if (data.action === 'send_weekly_report') {
      sendWeeklyFromPayload(data, true); // explicit submit — always send
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'weekly_report_sent' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Default: save state — but protect an active sprint from being wiped by a
    // stale client (e.g. a backgrounded browser tab still on the planning screen).
    var stored = null;
    try { var cur = stateSheet.getRange('A1').getValue(); if (cur) stored = JSON.parse(cur); } catch (e3) {}
    if (!shouldAcceptStateWrite(data, stored)) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'rejected_stale' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    // Also capture the daily snapshot (if present) into the Daily Log sheet.
    if (data._daily) { try { upsertDailyLog(ss, data._daily); } catch (e2) {} }
    stateSheet.getRange('A1').setValue(JSON.stringify(data));
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'success' })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    stateSheet.getRange('A2').setValue('ERROR: ' + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('State');
  var data = sheet.getRange('A1').getValue();
  return ContentService.createTextOutput(
    data || JSON.stringify({})
  ).setMimeType(ContentService.MimeType.JSON);
}

// ── Sync write guard ─────────────────────────────────────────────────────────
// Mirror of frontend/src/utils/syncGuard.js — keep the two in sync.
// Protects an active sprint from being clobbered by a stale no-sprint (planning)
// client. Submit/auto-submit/reset carry _sprintEnded:true to legitimately clear it.
function hasActiveSprint_(state) {
  var s = (state && state.activeSprint) || {};
  return !!s.sprintStartDate && (s.selectedQuestIds || []).length > 0;
}
function shouldAcceptStateWrite(incoming, stored) {
  if (!incoming || typeof incoming !== 'object') return false;
  if (!stored) return true;
  if (hasActiveSprint_(stored) && !hasActiveSprint_(incoming) && !incoming._sprintEnded) {
    return false;
  }
  return true;
}

/**
 * Phase 1 (LAUNCH_MISSION): Append row with S.no + goals only.
 * Week and Completion % are left blank — filled on submit.
 */
function logGoalsOnLaunch(ss, data) {
  var sheet = ss.getSheetByName('Weekly Goals');

  if (!sheet) {
    sheet = ss.insertSheet('Weekly Goals');
    var headers = ['S.no', 'Week', 'Completion %'];
    for (var i = 1; i <= 19; i++) {
      headers.push('Goal ' + i);
    }
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  var sno = sheet.getLastRow(); // header is row 1, so lastRow = serial number

  var row = [sno, '', '']; // Week and Completion % blank
  var goals = data.goalNames || [];
  for (var g = 0; g < 19; g++) {
    row.push(g < goals.length ? goals[g] : '');
  }

  sheet.appendRow(row);
}

/**
 * Phase 2 (SUBMIT/AUTO_SUBMIT): Find the last row with empty Completion %,
 * fill in Week and Completion %.
 */
function updateGoalsOnSubmit(ss, data) {
  var sheet = ss.getSheetByName('Weekly Goals');

  if (!sheet) {
    sheet = ss.insertSheet('Weekly Goals');
    var headers = ['S.no', 'Week', 'Completion %'];
    for (var i = 1; i <= 19; i++) {
      headers.push('Goal ' + i);
    }
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  var lastRow = sheet.getLastRow();

  // Scan from bottom to find last row with empty Completion % (column 3)
  for (var r = lastRow; r >= 2; r--) {
    var cellValue = sheet.getRange(r, 3).getValue();
    if (cellValue === '' || cellValue === null) {
      sheet.getRange(r, 2).setValue(data.week || '');
      sheet.getRange(r, 3).setValue((data.percentage || 0) + '%');
      return;
    }
  }

  // Fallback: no launch row found (legacy sprint) — create full row
  var sno = lastRow;
  var row = [sno, data.week || '', (data.percentage || 0) + '%'];
  var goals = data.goalNames || [];
  for (var g = 0; g < 19; g++) {
    row.push(g < goals.length ? goals[g] : '');
  }
  sheet.appendRow(row);
}

/**
 * Goals Tracker: On mission launch, add new quests or increment No of Weeks for existing ones.
 * Payload: { action: 'track_goals_launch', quests: [{mission, goal}, ...] }
 */
function trackGoalsOnLaunch(ss, data) {
  var sheet = ss.getSheetByName('Goals Tracker');

  if (!sheet) {
    sheet = ss.insertSheet('Goals Tracker');
    sheet.appendRow(['Mission', 'Goal', 'No of Weeks', 'Average %', 'Recent %']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  var quests = data.quests || [];
  if (quests.length === 0) return;

  var lastRow = sheet.getLastRow();
  var existingData = lastRow >= 2
    ? sheet.getRange(2, 1, lastRow - 1, 5).getValues()
    : [];

  for (var i = 0; i < quests.length; i++) {
    var mission = quests[i].mission;
    var goal = quests[i].goal;
    var found = false;

    for (var r = 0; r < existingData.length; r++) {
      if (existingData[r][0] === mission && existingData[r][1] === goal) {
        var rowNum = r + 2;
        var currentWeeks = existingData[r][2] || 0;
        sheet.getRange(rowNum, 3).setValue(currentWeeks + 1);
        existingData[r][2] = currentWeeks + 1;
        found = true;
        break;
      }
    }

    if (!found) {
      sheet.appendRow([mission, goal, 1, '', '']);
      existingData.push([mission, goal, 1, '', '']);
    }
  }
}

/**
 * Goals Tracker: On sprint submit, update Recent % and recalculate Average % for each quest.
 * Payload: { action: 'track_goals_submit', quests: [{mission, goal, percentage}, ...] }
 */
function trackGoalsOnSubmit(ss, data) {
  var sheet = ss.getSheetByName('Goals Tracker');
  if (!sheet) return;

  var quests = data.quests || [];
  if (quests.length === 0) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var existingData = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  for (var i = 0; i < quests.length; i++) {
    var mission = quests[i].mission;
    var goal = quests[i].goal;
    var pct = quests[i].percentage || 0;

    for (var r = 0; r < existingData.length; r++) {
      if (existingData[r][0] === mission && existingData[r][1] === goal) {
        var rowNum = r + 2;
        var weeks = existingData[r][2] || 1;
        var rawAvg = existingData[r][3];
        var oldAvg = (rawAvg === '' || rawAvg === null) ? 0 : (typeof rawAvg === 'number' ? rawAvg : parseFloat(String(rawAvg).replace('%', '')) || 0);

        var newAvg;
        if (weeks <= 1) {
          newAvg = pct;
        } else {
          newAvg = Math.round(((oldAvg * (weeks - 1)) + pct) / weeks);
        }

        sheet.getRange(rowNum, 4).setNumberFormat('0').setValue(newAvg);
        sheet.getRange(rowNum, 5).setNumberFormat('0').setValue(pct);
        break;
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Accountability WhatsApp reports (CallMeBot)
//
// One-time setup (Script Properties → Project Settings):
//   CALLMEBOT_RECIPIENTS = [{"phone":"+91...","apikey":"...","name":"Anurag"}]
//   WENT_WRONG_THRESHOLD = 50   (optional; quest % below this = "slipped")
//   REPORT_ERROR_EMAIL   = you@gmail.com  (optional; notified if a send fails)
//   TELEGRAM_BOT_TOKEN   = 123:ABC...      (optional fallback — used if WhatsApp delivers nothing)
//   TELEGRAM_CHAT_IDS    = ["123456789"]   (optional fallback — Telegram chat ids)
// Then run setupTriggers() once. Project timezone must be Asia/Kolkata.
// ════════════════════════════════════════════════════════════════════════════

// ── Channel: WhatsApp primary, Telegram fallback if WhatsApp delivers nothing ──
function notify(text) {
  var msg = truncateMsg(text, 3500);
  var wa = sendViaWhatsApp(msg);
  // Fallback: if WhatsApp isn't configured or every send failed, try Telegram so nothing is lost.
  if (wa.delivered === 0) {
    sendViaTelegram(msg);
  }
}

// Returns { attempted, delivered } so the caller can decide whether to fall back.
function sendViaWhatsApp(msg) {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('CALLMEBOT_RECIPIENTS');
  if (!raw) return { attempted: 0, delivered: 0 };
  var recipients;
  try { recipients = JSON.parse(raw); } catch (e) { logReportError('notify: bad CALLMEBOT_RECIPIENTS JSON'); return { attempted: 0, delivered: 0 }; }
  var attempted = 0, delivered = 0;
  for (var i = 0; i < recipients.length; i++) {
    var r = recipients[i];
    if (!r || !r.phone || !r.apikey) continue;
    attempted++;
    try {
      var url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(r.phone) +
                '&text=' + encodeURIComponent(msg) + '&apikey=' + encodeURIComponent(r.apikey);
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      var code = resp.getResponseCode();
      if (code >= 200 && code < 300) { delivered++; }
      else { logReportError('CallMeBot ' + (r.name || r.phone) + ' HTTP ' + code + ': ' + String(resp.getContentText()).slice(0, 180)); }
    } catch (err) {
      logReportError('CallMeBot ' + (r.name || r.phone) + ' failed: ' + err.message);
    }
    Utilities.sleep(2000); // small gap — CallMeBot relay is rate-limited
  }
  return { attempted: attempted, delivered: delivered };
}

// Telegram fallback — sends to every configured chat id.
function sendViaTelegram(msg) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_BOT_TOKEN');
  var raw = props.getProperty('TELEGRAM_CHAT_IDS');
  if (!token || !raw) { logReportError('telegram fallback not configured (WhatsApp delivered nothing)'); return; }
  var ids;
  try { ids = JSON.parse(raw); } catch (e) { ids = raw; }
  if (!Array.isArray(ids)) ids = String(ids).split(','); // tolerate a bare id like 533263782 or "1,2"
  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i]).trim();
    if (!id) continue;
    try {
      var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post',
        muteHttpExceptions: true,
        payload: { chat_id: id, text: msg }
      });
      var code = resp.getResponseCode();
      if (code < 200 || code >= 300) {
        logReportError('Telegram ' + id + ' HTTP ' + code + ': ' + String(resp.getContentText()).slice(0, 180));
      }
    } catch (err) {
      logReportError('Telegram ' + id + ' failed: ' + err.message);
    }
  }
}

function logReportError(msg) {
  try {
    SpreadsheetApp.openById(SHEET_ID).getSheetByName('State').getRange('A3').setValue('REPORT_ERR ' + new Date() + ': ' + msg);
  } catch (e) {}
  try {
    var email = PropertiesService.getScriptProperties().getProperty('REPORT_ERROR_EMAIL');
    if (email) MailApp.sendEmail(email, 'Superhero HQ — report send failed', msg);
  } catch (e) {}
}

function truncateMsg(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// ── Daily Log sheet (the source of truth for daily reports) ───────────────────
function upsertDailyLog(ss, daily) {
  if (!daily || !daily.date) return;
  var sheet = ss.getSheetByName('Daily Log');
  if (!sheet) {
    sheet = ss.insertSheet('Daily Log');
    sheet.appendRow(['Date', 'Completion %', 'Done', 'Missed']);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }
  var done = (daily.done || []).join(' · ');
  var missed = (daily.missed || []).join(' · ');
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var dates = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = dates.length - 1; i >= 0; i--) {
      if (rowDateStr(dates[i][0]) === daily.date) {
        sheet.getRange(i + 2, 2).setValue(daily.pct);
        sheet.getRange(i + 2, 3).setValue(done);
        sheet.getRange(i + 2, 4).setValue(missed);
        return;
      }
    }
  }
  sheet.appendRow([daily.date, daily.pct, done, missed]);
}

function rowDateStr(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Kolkata', 'yyyy-MM-dd');
  return String(v);
}

// ── Manual Daily Submit: store today's row and send the report immediately ────
function handleRequestDailyReport(ss, data) {
  upsertDailyLog(ss, { date: data.date, pct: data.pct, done: data.done, missed: data.missed });
  sendDailyReport(data.date, true); // explicit user action — always send
}

// ── Build + send a daily report for a given IST date (default: yesterday) ─────
// force=true (manual submit) always sends; force=false (nightly trigger) dedups per date.
function sendDailyReport(targetDate, force) {
  var props = PropertiesService.getScriptProperties();
  if (!targetDate) targetDate = istDateString(-1);
  if (!force && props.getProperty('lastDailySent') === targetDate) return; // dedup nightly only

  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Daily Log');
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  var row = null;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (rowDateStr(rows[i][0]) === targetDate) { row = rows[i]; break; }
  }
  if (!row) return;

  var pct = row[1];
  var done = row[2] ? String(row[2]).split(' · ') : [];
  var missed = row[3] ? String(row[3]).split(' · ') : [];
  notify(buildDailyMessage(targetDate, pct, done, missed));
  props.setProperty('lastDailySent', targetDate);
}

function bulletList(items) {
  if (!items || !items.length) return ['• —'];
  return items.map(function (x) { return '• ' + x; });
}

function buildDailyMessage(dateStr, pct, done, missed) {
  var lines = [];
  lines.push('🦸 Anurag — Daily Report · ' + formatNiceDate(dateStr));
  lines.push('📊 Score: ' + pct + '%');
  lines.push('');
  lines.push('✅ Done:');
  lines = lines.concat(bulletList(done));
  lines.push('');
  lines.push('❌ Missed:');
  lines = lines.concat(bulletList(missed));
  return lines.join('\n');
}

// ── Weekly report (immediate on submit; payload carries everything) ───────────
// force=true (manual end-mission) always sends; force=false (Monday backstop) dedups per week.
function sendWeeklyFromPayload(data, force) {
  var props = PropertiesService.getScriptProperties();
  var week = data.week || '';
  // Persist the latest payload so the Monday backstop can resend if this notify failed.
  props.setProperty('lastWeeklyPayload', JSON.stringify(data));
  if (!force && week && props.getProperty('lastWeeklySent') === week) return; // dedup backstop only
  notify(buildWeeklyMessage(week, data.percentage || 0, data.xpEarned || 0, data.quests || [], data.daysLogged));
  if (week) props.setProperty('lastWeeklySent', week);
}

function buildWeeklyMessage(week, pct, xp, quests, daysLogged) {
  var threshold = Number(PropertiesService.getScriptProperties().getProperty('WENT_WRONG_THRESHOLD') || 50);
  var nailed = [], slipped = [];
  for (var i = 0; i < quests.length; i++) {
    var q = quests[i];
    var p = q.percentage || 0;
    var label = q.goal + ' (' + (q.type || 'W') + ') — ' + p + '%';
    if (p >= threshold) nailed.push(label); else slipped.push(label);
  }
  var verdict = pct >= 100 ? 'MISSION ACCOMPLISHED' : pct >= 50 ? 'SOLID EFFORT' : 'RESET & CONQUER';
  var closing = pct >= 100 ? 'Perfect week, Anurag! 🔥'
              : pct >= 50 ? 'Almost there — keep pushing. 💪'
              : 'Rough week. Reset and conquer. 🦾';
  var bar = '━━━━━━━━━━━━━━━';
  var lines = [];
  lines.push('🏆  WEEKLY MISSION REPORT');
  lines.push(bar);
  lines.push('🗓  ' + week);
  lines.push('🎯  ' + verdict + '  —  ' + pct + '%');
  var meta = '⭐  XP +' + xp;
  if (daysLogged != null) meta += '     📅  ' + daysLogged + '/7 days';
  lines.push(meta);
  lines.push(bar);
  lines.push('');
  lines.push('✅  NAILED IT');
  lines = lines.concat(bulletList(nailed));
  lines.push('');
  lines.push('⚠️  SLIPPED');
  lines = lines.concat(bulletList(slipped));
  lines.push('');
  lines.push(bar);
  lines.push(closing);
  return lines.join('\n');
}

// ── Recurring trigger handlers (00:15 IST window) ─────────────────────────────
function dailyRecurringTrigger() { sendDailyReport(istDateString(-1)); }    // report yesterday
function weeklyRecurringTrigger() {
  var raw = PropertiesService.getScriptProperties().getProperty('lastWeeklyPayload');
  if (!raw) return;
  try { sendWeeklyFromPayload(JSON.parse(raw)); } catch (e) { logReportError('weekly backstop: ' + e.message); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function istDateString(offsetDays) {
  var d = new Date(Date.now() + (offsetDays || 0) * 86400000);
  return Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
}

function formatNiceDate(dateStr) {
  try {
    return Utilities.formatDate(new Date(dateStr + 'T12:00:00+05:30'), 'Asia/Kolkata', 'EEE d MMM');
  } catch (e) { return dateStr; }
}

function cleanupTriggers(fnName) {
  var ts = ScriptApp.getProjectTriggers();
  for (var i = 0; i < ts.length; i++) {
    if (ts[i].getHandlerFunction() === fnName) ScriptApp.deleteTrigger(ts[i]);
  }
}

// ── Run in the editor to verify your channel works (WhatsApp or Telegram) ─────
function testReport() {
  notify('🦸 Test from Superhero HQ — if you can read this, your accountability channel works.');
}

// ── Run ONCE in the editor to register the recurring time-triggers ────────────
function setupTriggers() {
  cleanupTriggers('dailyRecurringTrigger');
  cleanupTriggers('weeklyRecurringTrigger');
  // atHour uses the project timezone (set appsscript.json timeZone to Asia/Kolkata).
  // GAS fires within a ~15-min window of the hour — "00:15" is approximate, which is fine.
  ScriptApp.newTrigger('dailyRecurringTrigger').timeBased().atHour(0).nearMinute(15).everyDays(1).create();
  ScriptApp.newTrigger('weeklyRecurringTrigger').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(0).nearMinute(15).create();
}
