/**
 * Workspace Dashboard — Google Calendar API
 * 部署為 Web App 後，提供 JSON API 供 Cloudflare Worker 呼叫
 *
 * 部署步驟：
 * 1. 到 https://script.google.com 建立新專案
 * 2. 把這段程式碼貼上
 * 3. 點「部署」→「新增部署作業」
 * 4. 類型選「網頁應用程式」
 * 5. 執行身分：「我」
 * 6. 誰可以存取：「所有人」（Dashboard 已有 Cloudflare Access 保護）
 * 7. 部署後複製 Web App URL
 */

// 共用：回傳 JSON Response
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET：取得行事曆事件
function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = params.action || 'list';

    if (action === 'list') {
      return listEvents(params);
    }

    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// POST：新增/更新/刪除事件
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'create';

    if (action === 'create') {
      return createEvent(body);
    }
    if (action === 'update') {
      return updateEvent(body);
    }
    if (action === 'delete') {
      return deleteEvent(body);
    }

    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// 列出事件（預設：今天起 14 天內）
function listEvents(params) {
  var calendarId = params.calendarId || 'primary';
  var daysAhead = parseInt(params.days) || 14;

  // 台北時區
  var tz = 'Asia/Taipei';
  var now = new Date();

  // 今天 00:00（台北時間）
  var todayStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var timeMin = new Date(todayStr + 'T00:00:00+08:00');

  // N 天後 23:59
  var future = new Date(timeMin.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  var calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    calendar = CalendarApp.getDefaultCalendar();
  }

  var events = calendar.getEvents(timeMin, future);
  var result = events.map(function(evt) {
    var startTime = evt.getStartTime();
    var endTime = evt.getEndTime();
    var isAllDay = evt.isAllDayEvent();

    return {
      id: evt.getId(),
      title: evt.getTitle(),
      description: evt.getDescription() || '',
      location: evt.getLocation() || '',
      start: Utilities.formatDate(startTime, tz, "yyyy-MM-dd'T'HH:mm:ss"),
      end: Utilities.formatDate(endTime, tz, "yyyy-MM-dd'T'HH:mm:ss"),
      date: Utilities.formatDate(startTime, tz, 'yyyy-MM-dd'),
      time: isAllDay ? '' : Utilities.formatDate(startTime, tz, 'HH:mm'),
      endTime: isAllDay ? '' : Utilities.formatDate(endTime, tz, 'HH:mm'),
      isAllDay: isAllDay,
      color: evt.getColor() || '',
    };
  });

  return jsonResponse({
    success: true,
    today: todayStr,
    count: result.length,
    events: result,
  });
}

// 新增事件
function createEvent(body) {
  var calendar = CalendarApp.getDefaultCalendar();
  var title = body.title || '(無標題)';
  var date = body.date; // yyyy-MM-dd
  var time = body.time || ''; // HH:mm
  var endTime = body.endTime || '';
  var description = body.description || '';

  var event;
  if (!time) {
    // 全天事件
    var startDate = new Date(date + 'T00:00:00+08:00');
    event = calendar.createAllDayEvent(title, startDate);
  } else {
    var startDt = new Date(date + 'T' + time + ':00+08:00');
    var endDt;
    if (endTime) {
      endDt = new Date(date + 'T' + endTime + ':00+08:00');
    } else {
      // 預設 1 小時
      endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
    }
    event = calendar.createEvent(title, startDt, endDt);
  }

  if (description) {
    event.setDescription(description);
  }

  return jsonResponse({
    success: true,
    event: {
      id: event.getId(),
      title: event.getTitle(),
      date: date,
      time: time,
    },
  });
}

// 更新事件
function updateEvent(body) {
  var calendar = CalendarApp.getDefaultCalendar();
  var eventId = body.id;
  if (!eventId) return jsonResponse({ error: 'Missing event id' });

  var event = calendar.getEventById(eventId);
  if (!event) return jsonResponse({ error: 'Event not found' });

  if (body.title) event.setTitle(body.title);
  if (body.description !== undefined) event.setDescription(body.description);

  if (body.date && body.time) {
    var startDt = new Date(body.date + 'T' + body.time + ':00+08:00');
    var endDt;
    if (body.endTime) {
      endDt = new Date(body.date + 'T' + body.endTime + ':00+08:00');
    } else {
      endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
    }
    event.setTime(startDt, endDt);
  }

  return jsonResponse({
    success: true,
    event: {
      id: event.getId(),
      title: event.getTitle(),
    },
  });
}

// 刪除事件
function deleteEvent(body) {
  var calendar = CalendarApp.getDefaultCalendar();
  var eventId = body.id;
  if (!eventId) return jsonResponse({ error: 'Missing event id' });

  var event = calendar.getEventById(eventId);
  if (!event) return jsonResponse({ error: 'Event not found' });

  var title = event.getTitle();
  event.deleteEvent();

  return jsonResponse({
    success: true,
    deleted: { id: eventId, title: title },
  });
}
