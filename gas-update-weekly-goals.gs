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

    // Default: save state
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
