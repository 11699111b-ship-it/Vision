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
