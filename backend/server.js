const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'test-secret-key-shift-saas';

// インメモリデータベース
const db = {
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
  }
};

let nextCorpId = 2;
let nextFacilityId = 2;
let nextLocationId = 4;
let nextStaffId = 1;
let nextSubmissionId = 1;

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
  res.status(201).json(corp);
});

app.delete('/api/phase1/corporations/:corpId', (req, res) => {
  const corpId = parseInt(req.params.corpId);
  db.corporations = db.corporations.filter(c => c.corp_id !== corpId);
  delete db.facilities[corpId];
  delete db.locations[corpId];
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
  res.status(201).json(facility);
});

app.delete('/api/phase1/facilities/:facilityId', (req, res) => {
  const facilityId = parseInt(req.params.facilityId);
  const corpId = parseInt(req.query.corp_id);
  if (db.facilities[corpId]) {
    db.facilities[corpId] = db.facilities[corpId].filter(f => f.facility_id !== facilityId);
  }
  delete db.locations[facilityId];
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
  res.status(201).json(location);
});

app.delete('/api/phase1/locations/:locationId', (req, res) => {
  const locationId = parseInt(req.params.locationId);
  // 全拠点から削除
  Object.keys(db.locations).forEach(facilityId => {
    db.locations[facilityId] = db.locations[facilityId].filter(l => l.location_id !== locationId);
  });
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
      date: s.date,
      location_name: s.location_name || ''
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

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`\n========== バックエンドサーバー起動 ==========`);
  console.log(`✓ API Server running on http://localhost:${PORT}`);
  console.log(`✓ Phase 1 endpoint: http://localhost:${PORT}/api/phase1/`);
  console.log(`✓ Phase 2 endpoint: http://localhost:${PORT}/api/phase2/`);
  console.log(`✓ Phase 3 endpoint: http://localhost:${PORT}/api/phase3/`);
  console.log(`✓ Dashboard endpoint: http://localhost:${PORT}/api/dashboard/\n`);
});
