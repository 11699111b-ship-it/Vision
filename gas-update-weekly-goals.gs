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

    if (data.action === 'log') {
      var logSheet = ss.getSheetByName('WeeklyLogs');
      logSheet.appendRow([
        new Date(), data.week, data.percentage,
        data.xpEarned, data.totalQuests, data.completedQuests,
      ]);

      // Also log to "Weekly Goals" sheet
      logWeeklyGoals(ss, data);

      return ContentService.createTextOutput(
        JSON.stringify({ status: 'logged' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

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
 * Appends a row to the "Weekly Goals" sheet.
 * Format: S.no | Week | Completion % | Goal 1 | Goal 2 | ... | Goal 19
 * - Week uses the same data.week string as WeeklyLogs (from formatWeekRange)
 * - Completion % comes from the same data.percentage
 * - Goal columns are filled from data.goalNames[] (includes custom goals)
 */
function logWeeklyGoals(ss, data) {
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

  var row = [sno, data.week || '', (data.percentage || 0) + '%'];
  var goals = data.goalNames || [];
  for (var g = 0; g < 19; g++) {
    row.push(g < goals.length ? goals[g] : '');
  }

  sheet.appendRow(row);
}
