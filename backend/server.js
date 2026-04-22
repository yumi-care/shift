const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'test-secret-key-shift-saas';
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// JSON ファイルから DB を読み込む
function loadDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.warn('DB ファイルが見つかりません。デフォルト DB を使用します。');
    return getDefaultDB();
  }
}

// DB をファイルに保存
function saveDB(database) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');
  } catch (err) {
    console.error('DB 保存エラー:', err);
  }
}

// デフォルト DB
function getDefaultDB() {
  return {
    corporations: [
      { corp_id: 1, corp_name: 'ゆうみ株式会社' }
    ],
    facilities: {
      1: [
        { facility_id: 1, corp_id: 1, facility_name: 'ゆうみのいえ' }
      ]
    },
    locations: {
      1: [
        { location_id: 1, facility_id: 1, location_name: '三本木' },
        { location_id: 2, facility_id: 1, location_name: '江島' },
        { location_id: 3, facility_id: 1, location_name: '牛川' }
      ]
    },
    staffs: {
      1: []
    },
    submissions: {
      1: []
    },
    shifts: {
      1: []
    }
  };
}

// DB を読み込み
let db = loadDB();

// nextId を復元または初期化
function initializeCounters() {
  let nextCorpId = 2;
  let nextFacilityId = 2;
  let nextLocationId = 4;
  let nextStaffId = 1;
  let nextSubmissionId = 1;

  // 最大 ID を検出
  if (db.corporations.length > 0) {
    nextCorpId = Math.max(...db.corporations.map(c => c.corp_id)) + 1;
  }

  Object.values(db.facilities).forEach(facilities => {
    if (facilities.length > 0) {
      nextFacilityId = Math.max(nextFacilityId, Math.max(...facilities.map(f => f.facility_id)) + 1);
    }
  });

  Object.values(db.locations).forEach(locations => {
    if (locations.length > 0) {
      nextLocationId = Math.max(nextLocationId, Math.max(...locations.map(l => l.location_id)) + 1);
    }
  });

  Object.values(db.staffs).forEach(staffs => {
    if (staffs.length > 0) {
      nextStaffId = Math.max(nextStaffId, Math.max(...staffs.map(s => s.staff_id)) + 1);
    }
  });

  Object.values(db.submissions).forEach(submissions => {
    if (submissions.length > 0) {
      nextSubmissionId = Math.max(nextSubmissionId, Math.max(...submissions.map(s => s.submission_id)) + 1);
    }
  });

  return { nextCorpId, nextFacilityId, nextLocationId, nextStaffId, nextSubmissionId };
}

const { nextCorpId: initCorpId, nextFacilityId: initFacilityId, nextLocationId: initLocationId, nextStaffId: initStaffId, nextSubmissionId: initSubmissionId } = initializeCounters();

let nextCorpId = initCorpId;
let nextFacilityId = initFacilityId;
let nextLocationId = initLocationId;
let nextStaffId = initStaffId;
let nextSubmissionId = initSubmissionId;

// ========== ユーティリティ関数 ==========
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function verifyTenant(req, corpId) {
  if (req.user && req.user.corp_id !== corpId) {
    return false;
  }
  return true;
}

// 指定月の勤務日付を生成（work_days から）
function generateSubmissionDates(workDays, year, month) {
  if (!workDays) return [];

  const dayMap = { '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6, '日': 0 };
  const dates = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
    const dayLabel = dayLabels[dayOfWeek];

    if (workDays.includes(dayLabel)) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dates.push(dateStr);
    }
  }
  return dates;
}

// ========== 認証 ==========
app.post('/api/auth/login', (req, res) => {
  const { corp_id } = req.body;
  const token = jwt.sign({ corp_id }, JWT_SECRET);
  res.json({ token });
});

// ========== 法人 ==========
app.get('/api/phase1/corporations/', (req, res) => {
  res.json(db.corporations);
});

app.post('/api/phase1/corporations/', (req, res) => {
  const { corp_name } = req.body;
  const corp = {
    corp_id: nextCorpId++,
    corp_name
  };
  db.corporations.push(corp);
  db.facilities[corp.corp_id] = [];
  db.locations[corp.corp_id] = {};
  saveDB(db);
  res.status(201).json(corp);
});

app.delete('/api/phase1/corporations/:corpId', (req, res) => {
  const corpId = parseInt(req.params.corpId);
  db.corporations = db.corporations.filter(c => c.corp_id !== corpId);
  delete db.facilities[corpId];
  delete db.locations[corpId];
  saveDB(db);
  res.json({ message: 'Deleted' });
});

// ========== 事業所 ==========
app.get('/api/phase1/corporations/:corpId/facilities/', (req, res) => {
  const corpId = parseInt(req.params.corpId);
  res.json(db.facilities[corpId] || []);
});

app.post('/api/phase1/corporations/:corpId/facilities/', (req, res) => {
  const corpId = parseInt(req.params.corpId);
  const { facility_name } = req.body;
  const facility = {
    facility_id: nextFacilityId++,
    facility_name,
    corp_id: corpId
  };
  if (!db.facilities[corpId]) {
    db.facilities[corpId] = [];
    db.locations[corpId] = {};
  }
  db.facilities[corpId].push(facility);
  db.locations[facility.facility_id] = [];
  saveDB(db);
  res.status(201).json(facility);
});

app.delete('/api/phase1/facilities/:facilityId', (req, res) => {
  const facilityId = parseInt(req.params.facilityId);
  const corpId = parseInt(req.query.corp_id);
  if (db.facilities[corpId]) {
    db.facilities[corpId] = db.facilities[corpId].filter(f => f.facility_id !== facilityId);
  }
  delete db.locations[facilityId];
  saveDB(db);
  res.json({ message: 'Deleted' });
});

// ========== 拠点 ==========
app.get('/api/phase1/facilities/:facilityId/locations/', (req, res) => {
  const facilityId = parseInt(req.params.facilityId);
  res.json(db.locations[facilityId] || []);
});

app.post('/api/phase1/facilities/:facilityId/locations/', (req, res) => {
  const facilityId = parseInt(req.params.facilityId);
  const { location_name } = req.body;
  const location = {
    location_id: nextLocationId++,
    location_name,
    facility_id: facilityId
  };
  if (!db.locations[facilityId]) {
    db.locations[facilityId] = [];
  }
  db.locations[facilityId].push(location);
  saveDB(db);
  res.status(201).json(location);
});

app.delete('/api/phase1/locations/:locationId', (req, res) => {
  const locationId = parseInt(req.params.locationId);
  // 全拠点から削除
  Object.keys(db.locations).forEach(facilityId => {
    db.locations[facilityId] = db.locations[facilityId].filter(l => l.location_id !== locationId);
  });
  saveDB(db);
  res.json({ message: 'Deleted' });
});

// ========== Phase 2：スタッフ管理 ==========
app.get('/api/phase2/facilities/:facilityId/staffs', (req, res) => {
  const facilityId = parseInt(req.params.facilityId);
  const staffs = db.staffs[facilityId] || [];
  res.json(staffs);
});

app.post('/api/phase2/facilities/:facilityId/staffs', (req, res) => {
  const facilityId = parseInt(req.params.facilityId);
  const { staff_name, positions, work_days, break_start, break_end } = req.body;

  if (!staff_name) {
    return res.status(400).json({ error: 'staff_name is required' });
  }

  const facility = db.facilities[1]?.find(f => f.facility_id === facilityId);
  if (!facility) {
    return res.status(404).json({ error: 'Facility not found' });
  }

  const staff = {
    staff_id: nextStaffId++,
    facility_id: facilityId,
    corp_id: facility.corp_id,
    staff_name,
    positions: positions || [],
    work_days: work_days || '',
    break_start: break_start || '',
    break_end: break_end || ''
  };

  if (!db.staffs[facilityId]) {
    db.staffs[facilityId] = [];
  }
  db.staffs[facilityId].push(staff);
  saveDB(db);
  res.status(201).json(staff);
});

app.put('/api/phase2/staffs/:staffId', (req, res) => {
  const staffId = parseInt(req.params.staffId);
  const { staff_name, positions, work_days, break_start, break_end } = req.body;

  for (const facilityId in db.staffs) {
    const staff = db.staffs[facilityId].find(s => s.staff_id === staffId);
    if (staff) {
      staff.staff_name = staff_name || staff.staff_name;
      staff.positions = positions !== undefined ? positions : staff.positions;
      staff.work_days = work_days !== undefined ? work_days : staff.work_days;
      staff.break_start = break_start !== undefined ? break_start : (staff.break_start || '');
      staff.break_end = break_end !== undefined ? break_end : (staff.break_end || '');
      saveDB(db);
      return res.json(staff);
    }
  }
  res.status(404).json({ error: 'Staff not found' });
});

app.delete('/api/phase2/staffs/:staffId', (req, res) => {
  const staffId = parseInt(req.params.staffId);
  for (const facilityId in db.staffs) {
    const staff = db.staffs[facilityId].find(s => s.staff_id === staffId);
    if (staff) {
      db.staffs[facilityId] = db.staffs[facilityId].filter(s => s.staff_id !== staffId);
      saveDB(db);
      return res.json({ message: 'Staff deleted' });
    }
  }
  res.status(404).json({ error: 'Staff not found' });
});

// ========== Phase 3：シフト申告 ==========
app.post('/api/phase3/shift-submissions/auto', (req, res) => {
  const { staff_id, facility_id, year, month } = req.body;

  if (!staff_id || !facility_id || !year || !month) {
    return res.status(400).json({ error: 'staff_id, facility_id, year, month are required' });
  }

  const staff = db.staffs[facility_id]?.find(s => s.staff_id === staff_id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  const dates = generateSubmissionDates(staff.work_days, year, month);
  const submissions = dates.map(date => ({
    submission_id: nextSubmissionId++,
    staff_id,
    facility_id,
    date,
    location_id: null,
    location_name: '（勤務曜日により自動申告）',
    submitted_at: new Date().toISOString(),
    type: 'auto'
  }));

  if (!db.submissions[facility_id]) {
    db.submissions[facility_id] = [];
  }
  db.submissions[facility_id].push(...submissions);
  saveDB(db);

  res.status(201).json({
    message: 'Auto-submission created',
    submission_count: dates.length,
    staff_id,
    staff_name: staff.staff_name,
    year,
    month,
    submitted_dates: dates
  });
});

app.post('/api/phase3/shift-submissions/manual', (req, res) => {
  const { staff_id, facility_id, submissions: submissionDates } = req.body;

  if (!staff_id || !facility_id || !Array.isArray(submissionDates)) {
    return res.status(400).json({ error: 'staff_id, facility_id, submissions array are required' });
  }

  const staff = db.staffs[facility_id]?.find(s => s.staff_id === staff_id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  const submissions = submissionDates.map(sub => {
    const location = db.locations[facility_id]?.find(l => l.location_id === sub.location_id);
    return {
      submission_id: nextSubmissionId++,
      staff_id,
      facility_id,
      date: sub.date,
      location_id: sub.location_id,
      location_name: location?.location_name || '',
      submitted_at: new Date().toISOString(),
      type: 'manual'
    };
  });

  if (!db.submissions[facility_id]) {
    db.submissions[facility_id] = [];
  }
  db.submissions[facility_id].push(...submissions);
  saveDB(db);

  res.status(201).json({
    message: 'Manual submission created',
    staff_id,
    staff_name: staff.staff_name,
    submission_count: submissions.length,
    submissions
  });
});

app.get('/api/phase3/facilities/:facilityId/submissions', (req, res) => {
  const facilityId = parseInt(req.params.facilityId);
  const { year, month } = req.query;

  const submissions = db.submissions[facilityId] || [];
  const filtered = submissions.filter(sub => {
    const [subYear, subMonth] = sub.date.split('-');
    return subYear === String(year) && subMonth === String(month).padStart(2, '0');
  });

  res.json({
    year: parseInt(year),
    month: parseInt(month),
    submissions: filtered
  });
});

// ========== ダッシュボード API ==========
app.get('/api/dashboard/summary', (req, res) => {
  const { facility_id, year, month } = req.query;
  const facilityId = parseInt(facility_id);
  const yearInt = parseInt(year);
  const monthInt = parseInt(month);

  // 事業所名を取得
  const facility = db.facilities[1]?.find(f => f.facility_id === facilityId);
  const facilityName = facility?.facility_name || '';

  const staffs = db.staffs[facilityId] || [];
  const submissions = db.submissions[facilityId] || [];
  const locations = db.locations[facilityId] || [];

  const summary = staffs.map(staff => {
    const staffSubmissions = submissions.filter(sub => sub.staff_id === staff.staff_id && sub.date.startsWith(`${yearInt}-${String(monthInt).padStart(2, '0')}`));

    // 日付ごとの拠点情報を保持
    const submissionDetails = staffSubmissions.map(s => ({
      submission_id: s.submission_id,
      date: s.date,
      location_id: s.location_id,
      location_name: s.location_name || '',
      type: s.type
    }));
    const submissionDates = staffSubmissions.map(s => s.date);

    // 申告された拠点を取得（重複なし）
    const submittedLocations = [...new Set(staffSubmissions.map(s => s.location_name))].filter(l => l && l !== '（勤務曜日により自動申告）');
    const locationDisplay = submittedLocations.length > 0 ? submittedLocations.join('、') : '';

    // 申告状況の判定
    let submission_count = 0;
    let submission_status = 'not_submitted';

    // 固定勤務（work_days がある）= 無条件で申告済み
    if (staff.work_days && staff.work_days !== '') {
      const autoSubmittedDates = generateSubmissionDates(staff.work_days, yearInt, monthInt);
      submission_count = autoSubmittedDates.length;
      submission_status = 'submitted';
    } else {
      // シフト申告制（work_days がない）= 実申告データのみ
      submission_count = staffSubmissions.length;
      if (submission_count > 0) {
        submission_status = 'submitted';
      }
    }

    return {
      facility_name: facilityName,
      staff_id: staff.staff_id,
      staff_name: staff.staff_name,
      positions: staff.positions || [],
      work_days: staff.work_days || '',
      break_start: staff.break_start || '',
      break_end: staff.break_end || '',
      location: locationDisplay,
      submission_status: submission_status,
      submission_count: submission_count,
      submission_dates: submissionDates,
      submission_details: submissionDetails
    };
  });

  res.json({
    facility_id: facilityId,
    facility_name: facilityName,
    year: yearInt,
    month: monthInt,
    staffs: summary
  });
});

// ========== ダッシュボード：申告追加 ==========
app.post('/api/dashboard/submissions/add', (req, res) => {
  const { facility_id, staff_id, date, location_id } = req.body;

  if (!facility_id || !staff_id || !date || !location_id) {
    return res.status(400).json({ error: 'facility_id, staff_id, date, location_id are required' });
  }

  const facilityId = parseInt(facility_id);
  const staff = db.staffs[facilityId]?.find(s => s.staff_id === staff_id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  const location = db.locations[facilityId]?.find(l => l.location_id === parseInt(location_id));
  const locationName = location?.location_name || '';

  const newSubmission = {
    submission_id: nextSubmissionId++,
    staff_id,
    facility_id: facilityId,
    date,
    location_id: parseInt(location_id),
    location_name: locationName,
    submitted_at: new Date().toISOString(),
    type: 'manual'
  };

  if (!db.submissions[facilityId]) {
    db.submissions[facilityId] = [];
  }

  // 重複チェック1: 同じスタッフが同じ日に既に申告しているか（別棟含む）
  const sameStaffSameDay = db.submissions[facilityId].find(
    s => s.staff_id === staff_id && s.date === date
  );
  if (sameStaffSameDay) {
    return res.status(400).json({ error: '同じ日に申告済みです。複数の棟での勤務は出来ません。' });
  }

  // 重複チェック2: 同じ日の同じ場所に既に申告しているか
  const sameDateSameLocation = db.submissions[facilityId].find(
    s => s.date === date && s.location_id === parseInt(location_id) && s.staff_id === staff_id
  );
  if (sameDateSameLocation) {
    return res.status(400).json({ error: 'この日時の申告は既に存在します。' });
  }

  db.submissions[facilityId].push(newSubmission);
  saveDB(db);

  res.status(201).json({
    message: 'Submission added',
    submission: newSubmission
  });
});

// ========== ダッシュボード：申告削除 ==========
app.delete('/api/dashboard/submissions/:submissionId', (req, res) => {
  const submissionId = parseInt(req.params.submissionId);

  for (const facilityId in db.submissions) {
    const index = db.submissions[facilityId].findIndex(s => s.submission_id === submissionId);
    if (index !== -1) {
      const deleted = db.submissions[facilityId].splice(index, 1)[0];
      saveDB(db);
      return res.json({ message: 'Submission deleted', deleted });
    }
  }

  res.status(404).json({ error: 'Submission not found' });
});

// ========== ダッシュボード：申告更新 ==========
app.put('/api/dashboard/submissions/:submissionId', (req, res) => {
  const submissionId = parseInt(req.params.submissionId);
  const { date, location_id } = req.body;

  for (const facilityId in db.submissions) {
    const submission = db.submissions[facilityId].find(s => s.submission_id === submissionId);
    if (submission) {
      const newDate = date || submission.date;
      const newLocationId = location_id !== undefined ? location_id : submission.location_id;

      // 重複チェック1: 同じスタッフが同じ日に既に申告しているか（別棟含む、自分以外）
      const sameStaffSameDay = db.submissions[facilityId].find(
        s => s.staff_id === submission.staff_id && s.date === newDate && s.submission_id !== submissionId
      );
      if (sameStaffSameDay) {
        return res.status(400).json({ error: '同じ日に他の申告がある為、修正出来ません。複数の棟での勤務は出来ません。' });
      }

      // 重複チェック2: 同じ日の同じ場所に既に申告しているか（自分以外）
      const sameDateSameLocation = db.submissions[facilityId].find(
        s => s.date === newDate && s.location_id === newLocationId && s.submission_id !== submissionId && s.staff_id === submission.staff_id
      );
      if (sameDateSameLocation) {
        return res.status(400).json({ error: 'この日時の申告は既に存在します。' });
      }

      if (date) {
        submission.date = date;
      }
      if (location_id !== undefined) {
        const location = db.locations[facilityId]?.find(l => l.location_id === location_id);
        submission.location_id = location_id;
        submission.location_name = location?.location_name || '';
      }
      submission.updated_at = new Date().toISOString();
      saveDB(db);
      return res.json({ message: 'Submission updated', submission });
    }
  }

  res.status(404).json({ error: 'Submission not found' });
});

// ========== Phase 4：シフト取得 ==========
app.get('/api/phase4/shifts/get', (req, res) => {
  const { facility_id, year, month } = req.query;
  const facilityId = parseInt(facility_id);
  const shiftKey = `${year}-${String(month).padStart(2, '0')}`;

  console.log(`[GET /api/phase4/shifts/get] ${shiftKey} のシフトを取得`);

  const shifts = db.shifts?.[facilityId] || [];
  const shift = shifts.find(s => s.key === shiftKey);

  if (shift) {
    res.json({
      message: 'Shift found',
      facility_id: facilityId,
      year: year,
      month: month,
      edits: shift.edits,
      saved_at: shift.saved_at
    });
  } else {
    res.status(404).json({
      message: 'No saved shift',
      facility_id: facilityId,
      year: year,
      month: month
    });
  }
});

// ========== Phase 4：シフト保存 ==========
app.post('/api/phase4/shifts/save', (req, res) => {
  console.log('[POST /api/phase4/shifts/save] リクエスト受信:', req.body);
  const { facility_id, year, month, edits } = req.body;

  if (!facility_id || !year || !month || !edits) {
    console.log('[POST /api/phase4/shifts/save] バリデーションエラー');
    return res.status(400).json({ error: 'facility_id, year, month, edits are required' });
  }

  // shifts テーブルを初期化
  if (!db.shifts) {
    db.shifts = {};
  }
  if (!db.shifts[facility_id]) {
    db.shifts[facility_id] = [];
  }

  const shiftKey = `${year}-${String(month).padStart(2, '0')}`;
  const existingIndex = db.shifts[facility_id].findIndex(s => s.key === shiftKey);

  const shiftData = {
    key: shiftKey,
    facility_id: facility_id,
    year: year,
    month: month,
    edits: edits,
    saved_at: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    db.shifts[facility_id][existingIndex] = shiftData;
  } else {
    db.shifts[facility_id].push(shiftData);
  }

  saveDB(db);

  res.status(200).json({
    message: 'Shift saved successfully',
    facility_id: facility_id,
    year: year,
    month: month,
    edits_count: Object.keys(edits).length
  });
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`\n========== バックエンドサーバー起動 ==========`);
  console.log(`✓ API Server running on http://localhost:${PORT}`);
  console.log(`✓ Phase 1 endpoint: http://localhost:${PORT}/api/phase1/`);
  console.log(`✓ Phase 2 endpoint: http://localhost:${PORT}/api/phase2/`);
  console.log(`✓ Phase 3 endpoint: http://localhost:${PORT}/api/phase3/`);
  console.log(`✓ Dashboard endpoint: http://localhost:${PORT}/api/dashboard/\n`);
});
