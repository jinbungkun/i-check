/**
 * [환경 설정] 시트 이름을 확인하세요.
 */
var SHEET_NAME = "학생명단";
var EXTRA_SHEET_NAME = "보강/체험";
var STUDENT_HEADERS = ["ID", "이름", "생년월일", "학부모전화번호", "본인전화번호", "수업스케줄", "포인트", "상태", "마지막출석일"];

function normalizeHeaderName(header) {
  return String(header || "").replace(/\s+/g, "");
}

function getValueByKeys(source, keys) {
  if (!source || typeof source !== "object") return undefined;

  for (var i = 0; i < keys.length; i++) {
    if (source[keys[i]] !== undefined) return source[keys[i]];
    if (source[normalizeHeaderName(keys[i])] !== undefined) return source[normalizeHeaderName(keys[i])];
  }

  return undefined;
}

function getHeaderIndex(headers, headerName) {
  var target = normalizeHeaderName(headerName);
  for (var i = 0; i < headers.length; i++) {
    if (normalizeHeaderName(headers[i]) === target) return i;
  }
  return -1;
}

function buildResponse(options) {
  var ok = options && options.ok !== undefined ? options.ok : true;
  return {
    ok: ok,
    status: ok ? "success" : "error",
    action: options && options.action ? options.action : "default",
    data: options && options.data !== undefined ? options.data : null,
    message: options && options.message ? options.message : "",
    meta: options && options.meta ? options.meta : {}
  };
}

/**
 * [메인 통신 함수] 리액트 앱의 모든 GET 요청 처리
 */
function doGet(e) {
  var action = e && e.parameter && e.parameter.action ? e.parameter.action : "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  checkAndSetupSheets(ss);

  try {
    if (action === "getStudents") return handleGetStudents(ss);
    if (action === "getLogs") return handleGetLogs(ss, e.parameter.studentId, e.parameter.targetDate);
    if (action === "getExtraSchedules") {
      return handleGetExtraSchedules(ss, e.parameter.startDate, e.parameter.endDate);
    }
    if (action === "getHeaders") {
      var sheet = ss.getSheetByName(SHEET_NAME);
      var lastCol = sheet.getLastColumn();
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      return returnJson(buildResponse({ ok: true, action: "getHeaders", data: headers }));
    }
    return returnJson(buildResponse({ ok: false, action: action, message: "Invalid action" }));
  } catch (err) {
    return returnJson(buildResponse({ ok: false, action: action, message: err.toString() }));
  }
}

/**
 * 학생정보 업데이트
 */
function handleUpdateStudent(ss, data) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  var headers = values[0] || STUDENT_HEADERS;
  var idCol = getHeaderIndex(headers, "ID");

  var studentData = data && data.studentData ? data.studentData : data;
  var studentId = String(getValueByKeys(studentData, ["ID", "id"]) || "").trim();

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) !== "" && String(values[i][idCol]).trim() === studentId) {
      var rowRange = sheet.getRange(i + 1, 1, 1, headers.length);
      var currentRowValues = values[i];
      var newRowValues = [];

      for (var j = 0; j < headers.length; j++) {
        var headerName = normalizeHeaderName(headers[j]);
        var newValue = getValueByKeys(studentData, [headers[j], headerName]);

        if (newValue !== undefined) {
          var isStringField = ["ID", "본인전화번호", "학부모전화번호"].indexOf(headerName) !== -1;
          newRowValues.push(isStringField ? "'" + String(newValue).trim() : newValue);
        } else {
          newRowValues.push(currentRowValues[j]);
        }
      }

      rowRange.setValues([newRowValues]);
      return returnJson(buildResponse({ ok: true, action: "updateStudent", message: String(getValueByKeys(studentData, ["이름", "name"]) || "") + " 학생 정보가 수정되었습니다." }));
    }
  }

  return returnJson(buildResponse({ ok: false, action: "updateStudent", message: "수정할 학생을 찾을 수 없습니다." }));
}

/**
 * [메인 통신 함수] 리액트 앱의 모든 POST 요청 처리
 */
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData && requestData.action ? requestData.action : "";

    checkAndSetupSheets(ss);

    if (action === "addExtraSchedule") {
      return handleAddExtraSchedule(ss, requestData);
    }
    if (action === "checkIn") return handleCheckIn(ss, requestData);
    if (action === "registerStudent") return handleRegister(ss, requestData.studentData || requestData);
    if (action === "updatePoints") return handleUpdatePoints(ss, requestData);
    if (action === "updateStudentId") return handleUpdateStudentId(ss, requestData);
    if (action === "updateStudent") return handleUpdateStudent(ss, requestData);

    return returnJson(buildResponse({ ok: false, action: action, message: "Invalid action: " + action }));
  } catch (err) {
    return returnJson(buildResponse({ ok: false, action: "post", message: "GAS 오류: " + err.toString() }));
  }
}

// --- 보강/체험 관련 함수 ---

function handleGetExtraSchedules(ss, startDate, endDate) {
  var sheet = ss.getSheetByName(EXTRA_SHEET_NAME);
  if (!sheet) {
    return returnJson(buildResponse({ ok: true, action: "getExtraSchedules", data: [] }));
  }
  
  var data = sheet.getDataRange().getDisplayValues();

  if (data.length <= 1) {
    return returnJson(buildResponse({ ok: true, action: "getExtraSchedules", data: [] }));
  }

  var headers = data.shift();
  
  var startLimit = startDate ? String(startDate).replace(/\D/g, '') : ""; // "20260702"
  var endLimit = endDate ? String(endDate).replace(/\D/g, '') : "";

  var result = data.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var cleanHeader = normalizeHeaderName(h);
      obj[cleanHeader] = row[i];
      if (h !== cleanHeader) {
        obj[h] = row[i];
      }
    });
    return obj;
  }).filter(function(item) {
    var rawDate = item["날짜"] || item["date"] || "";
    if (!rawDate) return false;
    
    // 안전한 날짜 정규화
    var cleanDate = String(rawDate).replace(/\D/g, '').substring(0, 8); // "20260702"
    if (!cleanDate) return false;

    // 만약 startDate와 endDate 범위가 지정되었다면 그 범위로 필터링
    if (startLimit && cleanDate < startLimit) return false;
    if (endLimit && cleanDate > endLimit) return false;
    
    return true;
  });

  return returnJson(buildResponse({ ok: true, action: "getExtraSchedules", data: result }));
}

/**
 * [보강/체험 추가] ID 필드 제외하고 기록
 */
function handleAddExtraSchedule(ss, data) {
  var sheet = ss.getSheetByName(EXTRA_SHEET_NAME);
  var payload = data.extraData || data;

  var date = payload.date;
  var name = payload.name;
  var time = payload.time;
  var type = payload.type;

  if (!name || !date) {
    return returnJson(buildResponse({ ok: false, action: "addExtraSchedule", message: "이름 또는 날짜가 없습니다." }));
  }

  sheet.appendRow([date, name, time, type]);

  return returnJson(buildResponse({
    ok: true,
    action: "addExtraSchedule",
    message: name + " 학생의 " + type + " 일정이 등록되었습니다."
  }));
}

// --- 기존 핵심 기능 유지 ---

function handleUpdateStudentId(ss, data) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  var headers = values[0] || STUDENT_HEADERS;
  var nameCol = getHeaderIndex(headers, "이름");
  var idCol = getHeaderIndex(headers, "ID");
  var targetName = String(getValueByKeys(data, ["name", "이름"]) || "").trim();
  var newId = String(getValueByKeys(data, ["newId", "newID"]) || "").trim();

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][nameCol]).trim() === targetName) {
      sheet.getRange(i + 1, idCol + 1).setValue("'" + newId);
      return returnJson(buildResponse({ ok: true, action: "updateStudentId", message: targetName + " 학생의 카드 ID가 교체되었습니다." }));
    }
  }
  return returnJson(buildResponse({ ok: false, action: "updateStudentId", message: "교체 대상을 찾을 수 없습니다." }));
}

function handleRegister(ss, studentData) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  var headers = sheet.getDataRange().getValues()[0] || STUDENT_HEADERS;
  var newRow = new Array(headers.length).fill("");

  headers.forEach(function(header, index) {
    var cleanHeader = normalizeHeaderName(header);
    var value = getValueByKeys(studentData, [header, cleanHeader, normalizeHeaderName(header)]);
    if (value !== undefined) {
      var isStringField = ["ID", "본인전화번호", "학부모전화번호"].indexOf(cleanHeader) !== -1;
      newRow[index] = isStringField ? "'" + String(value).trim() : value;
    }
  });

  var statusIdx = getHeaderIndex(headers, "상태");
  if (statusIdx !== -1 && !newRow[statusIdx]) newRow[statusIdx] = "재원";

  sheet.appendRow(newRow);
  return returnJson(buildResponse({ ok: true, action: "registerStudent", message: String(getValueByKeys(studentData, ["이름", "name"]) || "") + " 학생 등록 완료" }));
}

function handleUpdatePoints(ss, data) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  var headers = values[0] || STUDENT_HEADERS;
  var idCol = getHeaderIndex(headers, "ID");
  var pointCol = getHeaderIndex(headers, "포인트");
  var studentId = String(getValueByKeys(data, ["studentId", "studentID"]) || "").trim();
  var amount = Number(getValueByKeys(data, ["amount"]) || 0);

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]).trim() === studentId) {
      var currentPoint = Number(values[i][pointCol]) || 0;
      var newTotal = currentPoint + amount;
      sheet.getRange(i + 1, pointCol + 1).setValue(newTotal);
      return returnJson(buildResponse({ ok: true, action: "updatePoints", data: { newTotal: newTotal } }));
    }
  }
  return returnJson(buildResponse({ ok: false, action: "updatePoints", message: "학생을 찾을 수 없습니다." }));
}

function handleCheckIn(ss, data) {
  var studentId = String(getValueByKeys(data, ["studentId", "studentID"]) || "").trim();
  var studentName = getValueByKeys(data, ["studentName", "studentName"]) || "";
  var now = new Date();
  var formattedDate = Utilities.formatDate(now, "GMT+9", "yyyy-MM-dd HH:mm:ss");

  var studentSheet = ss.getSheetByName(SHEET_NAME);
  var studentData = studentSheet.getDataRange().getValues();
  var headers = studentData[0] || STUDENT_HEADERS;
  var idCol = getHeaderIndex(headers, "ID");
  var lastAttendCol = getHeaderIndex(headers, "마지막출석일");
  var pointCol = getHeaderIndex(headers, "포인트");

  var found = false;
  for (var i = 1; i < studentData.length; i++) {
    if (String(studentData[i][idCol]).trim() === studentId) {
      if (lastAttendCol !== -1) {
        studentSheet.getRange(i + 1, lastAttendCol + 1).setValue(Utilities.formatDate(now, "GMT+9", "yyyy-MM-dd"));
      }

      if (pointCol !== -1) {
        var currentPoint = Number(studentData[i][pointCol]) || 0;
        studentSheet.getRange(i + 1, pointCol + 1).setValue(currentPoint + 100);
      }

      found = true;
      break;
    }
  }

  if (!found) {
    return returnJson(buildResponse({ ok: false, action: "checkIn", message: "학생을 찾을 수 없습니다." }));
  }

  var logSheetName = "출석로그_" + now.getFullYear();
  var logSheet = ss.getSheetByName(logSheetName) || ss.insertSheet(logSheetName);
  if (logSheet.getLastRow() === 0) logSheet.appendRow(["일시", "ID", "이름"]);
  logSheet.appendRow([formattedDate, "'" + studentId, studentName]);

  return returnJson(buildResponse({
    ok: true,
    action: "checkIn",
    message: studentName + " 출석 완료 (+100P)",
    data: { date: formattedDate }
  }));
}

function handleGetStudents(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return returnJson(buildResponse({ ok: true, action: "getStudents", data: [] }));
  }

  var headers = data.shift();
  var jsonData = data.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var val = row[i];
      var formattedVal = (val instanceof Date) ? Utilities.formatDate(val, "GMT+9", "yyyy-MM-dd") : String(val);
      var headerKey = normalizeHeaderName(h);
      obj[headerKey] = formattedVal;
      if (h !== headerKey) {
        obj[h] = formattedVal;
      }
    });
    return obj;
  });

  return returnJson(buildResponse({ ok: true, action: "getStudents", data: jsonData }));
}

function handleGetLogs(ss, studentId, targetDate) {
  var year;

  if (targetDate) {
    year = new Date(targetDate).getFullYear();
  } else {
    year = new Date().getFullYear();
  }

  var logSheetName = "출석로그_" + year;
  var sheet = ss.getSheetByName(logSheetName);

  if (!sheet || sheet.getLastRow() <= 1) {
    return returnJson(buildResponse({ ok: true, action: "getLogs", data: [] }));
  }

  var data = sheet.getDataRange().getValues();
  data.shift();

  var searchId = String(studentId).trim();
  var logs = [];

  data.forEach(function(row) {
    if (String(row[1]).trim() === searchId) {
      var dateVal = row[0];
      var formatted = (dateVal instanceof Date)
        ? Utilities.formatDate(dateVal, "GMT+9", "yyyy-MM-dd")
        : String(dateVal).substring(0, 10);

      if (logs.indexOf(formatted) === -1) logs.push(formatted);
    }
  });

  return returnJson(buildResponse({ ok: true, action: "getLogs", data: logs }));
}

/**
 * [시트 설정] 보강/체험 시트 이름 및 컬럼 최적화
 */
function checkAndSetupSheets(ss) {
  var studentSheet = ss.getSheetByName(SHEET_NAME);

  if (!studentSheet) {
    studentSheet = ss.insertSheet(SHEET_NAME);
    studentSheet.appendRow(STUDENT_HEADERS);

    studentSheet.getRange("1:1").setBackground("#202124").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    studentSheet.setFrozenRows(1);

    [100, 100, 120, 180, 180, 200, 80, 80, 150].forEach(function(w, i) {
      studentSheet.setColumnWidth(i + 1, w);
    });

    var statusColIndex = STUDENT_HEADERS.indexOf("상태") + 1;
    var dropdownRange = studentSheet.getRange(2, statusColIndex, 1000, 1);

    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["재원", "휴원"], true)
      .setAllowInvalid(false)
      .build();
    dropdownRange.setDataValidation(rule);

    var rules = [];

    var greenRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("재원")
      .setBackground("#b7e1cd")
      .setRanges([dropdownRange])
      .build();
    rules.push(greenRule);

    var yellowRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("휴원")
      .setBackground("#fff2cc")
      .setRanges([dropdownRange])
      .build();
    rules.push(yellowRule);

    studentSheet.setConditionalFormatRules(rules);
  }

  var extraSheet = ss.getSheetByName(EXTRA_SHEET_NAME);
  if (!extraSheet) {
    extraSheet = ss.insertSheet(EXTRA_SHEET_NAME);
    var extraHeaders = ["날짜", "이름", "시간", "유형"];
    extraSheet.appendRow(extraHeaders);
    extraSheet.getRange("1:1").setBackground("#8b5cf6").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    extraSheet.setFrozenRows(1);
    [120, 100, 100, 100].forEach(function(w, i) { extraSheet.setColumnWidth(i + 1, w); });
  }

  var logSheetName = "출석로그_" + new Date().getFullYear();
  if (!ss.getSheetByName(logSheetName)) {
    var logSheet = ss.insertSheet(logSheetName);
    logSheet.appendRow(["시간", "ID", "이름"]);
    logSheet.getRange("1:1").setBackground("#1da1f2").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    logSheet.setFrozenRows(1);
  }
}

function returnJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}