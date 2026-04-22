const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'test-secret-key-shift-saas';

// Supabaseクライアント初期化
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Supabase 移行完了 - JSON ファイル操作不要
// ID はデータベースの SERIAL/SEQUENCE で自動生成

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
// ========== Phase 1：法人・事業所・拠点管理 ==========
app.get('/api/phase1/corporations/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('corporations').select('*');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/phase1/corporations/', async (req, res) => {
  try {
    const { corp_name } = req.body;
    const { data, error } = await supabase
      .from('corporations')
      .insert({ corp_name })
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/phase1/corporations/:corpId', async (req, res) => {
  try {
    const corpId = parseInt(req.params.corpId);
    const { error } = await supabase
      .from('corporations')
      .delete()
      .eq('corp_id', corpId);
    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 事業所 ==========
app.get('/api/phase1/corporations/:corpId/facilities/', async (req, res) => {
  try {
    const corpId = parseInt(req.params.corpId);
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('corp_id', corpId);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/phase1/corporations/:corpId/facilities/', async (req, res) => {
  try {
    const corpId = parseInt(req.params.corpId);
    const { facility_name } = req.body;
    const { data, error } = await supabase
      .from('facilities')
      .insert({ facility_name, corp_id: corpId })
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/phase1/facilities/:facilityId', async (req, res) => {
  try {
    const facilityId = parseInt(req.params.facilityId);
    const { error } = await supabase
      .from('facilities')
      .delete()
      .eq('facility_id', facilityId);
    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 拠点 ==========
app.get('/api/phase1/facilities/:facilityId/locations/', async (req, res) => {
  try {
    const facilityId = parseInt(req.params.facilityId);
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('facility_id', facilityId);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/phase1/facilities/:facilityId/locations/', async (req, res) => {
  try {
    const facilityId = parseInt(req.params.facilityId);
    const { location_name } = req.body;
    const { data, error } = await supabase
      .from('locations')
      .insert({ location_name, facility_id: facilityId })
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/phase1/locations/:locationId', async (req, res) => {
  try {
    const locationId = parseInt(req.params.locationId);
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('location_id', locationId);
    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Phase 2：スタッフ管理 ==========
// ========== Phase 2：スタッフ管理 ==========
app.get('/api/phase2/facilities/:facilityId/staffs', async (req, res) => {
  try {
    const facilityId = parseInt(req.params.facilityId);
    const { data, error } = await supabase
      .from('staffs')
      .select('*')
      .eq('facility_id', facilityId);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/phase2/facilities/:facilityId/staffs', async (req, res) => {
  try {
    const facilityId = parseInt(req.params.facilityId);
    const { staff_name, positions, work_days, break_start, break_end } = req.body;

    if (!staff_name) {
      return res.status(400).json({ error: 'staff_name is required' });
    }

    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('corp_id')
      .eq('facility_id', facilityId)
      .single();

    if (facilityError) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const { data: staff, error } = await supabase
      .from('staffs')
      .insert({
        facility_id: facilityId,
        corp_id: facility.corp_id,
        staff_name,
        positions: positions || [],
        work_days: work_days || '',
        break_start: break_start || '',
        break_end: break_end || ''
      })
      .select();

    if (error) throw error;
    res.status(201).json(staff[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/phase2/staffs/:staffId', async (req, res) => {
  try {
    const staffId = parseInt(req.params.staffId);
    const { staff_name, positions, work_days, break_start, break_end } = req.body;

    const { data: staff, error } = await supabase
      .from('staffs')
      .update({
        staff_name,
        positions,
        work_days,
        break_start,
        break_end
      })
      .eq('staff_id', staffId)
      .select();

    if (error) throw error;
    if (staff.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json(staff[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/phase2/staffs/:staffId', async (req, res) => {
  try {
    const staffId = parseInt(req.params.staffId);
    const { error } = await supabase
      .from('staffs')
      .delete()
      .eq('staff_id', staffId);

    if (error) throw error;
    res.json({ message: 'Staff deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Phase 3：シフト申告 ==========
// ========== Phase 3：シフト申告 ==========
app.post('/api/phase3/shift-submissions/auto', async (req, res) => {
  try {
    const { staff_id, facility_id, year, month } = req.body;

    if (!staff_id || !facility_id || !year || !month) {
      return res.status(400).json({ error: 'staff_id, facility_id, year, month are required' });
    }

    const { data: staff, error: staffError } = await supabase
      .from('staffs')
      .select('staff_id, staff_name, work_days')
      .eq('staff_id', staff_id)
      .eq('facility_id', facility_id)
      .single();

    if (staffError) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const dates = generateSubmissionDates(staff.work_days, year, month);
    const submissions = dates.map(date => ({
      staff_id,
      facility_id,
      date,
      location_id: null,
      location_name: '（勤務曜日により自動申告）',
      submitted_at: new Date().toISOString(),
      type: 'auto'
    }));

    const { data, error } = await supabase
      .from('submissions')
      .insert(submissions)
      .select();

    if (error) throw error;

    res.status(201).json({
      message: 'Auto-submission created',
      submission_count: dates.length,
      staff_id,
      staff_name: staff.staff_name,
      year,
      month,
      submitted_dates: dates
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/phase3/shift-submissions/manual', async (req, res) => {
  try {
    const { staff_id, facility_id, submissions: submissionDates } = req.body;

    if (!staff_id || !facility_id || !Array.isArray(submissionDates)) {
      return res.status(400).json({ error: 'staff_id, facility_id, submissions array are required' });
    }

    const { data: staff, error: staffError } = await supabase
      .from('staffs')
      .select('staff_id, staff_name')
      .eq('staff_id', staff_id)
      .eq('facility_id', facility_id)
      .single();

    if (staffError) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const submissions = await Promise.all(
      submissionDates.map(async (sub) => {
        const { data: location } = await supabase
          .from('locations')
          .select('location_name')
          .eq('location_id', sub.location_id)
          .single();

        return {
          staff_id,
          facility_id,
          date: sub.date,
          location_id: sub.location_id,
          location_name: location?.location_name || '',
          submitted_at: new Date().toISOString(),
          type: 'manual'
        };
      })
    );

    const { data, error } = await supabase
      .from('submissions')
      .insert(submissions)
      .select();

    if (error) throw error;

    res.status(201).json({
      message: 'Manual submission created',
      staff_id,
      staff_name: staff.staff_name,
      submission_count: submissions.length,
      submissions: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/phase3/facilities/:facilityId/submissions', async (req, res) => {
  try {
    const facilityId = parseInt(req.params.facilityId);
    const { year, month } = req.query;

    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('facility_id', facilityId);

    if (error) throw error;

    const filtered = submissions.filter(sub => {
      const [subYear, subMonth] = sub.date.split('-');
      return subYear === String(year) && subMonth === String(month).padStart(2, '0');
    });

    res.json({
      year: parseInt(year),
      month: parseInt(month),
      submissions: filtered
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ダッシュボード API ==========
// ========== ダッシュボード：要約 ==========
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const { facility_id, year, month } = req.query;
    const facilityId = parseInt(facility_id);
    const yearInt = parseInt(year);
    const monthInt = parseInt(month);

    // 事業所名を取得
    const { data: facility } = await supabase
      .from('facilities')
      .select('facility_name')
      .eq('facility_id', facilityId)
      .single();

    const facilityName = facility?.facility_name || '';

    // スタッフを取得
    const { data: staffs, error: staffError } = await supabase
      .from('staffs')
      .select('*')
      .eq('facility_id', facilityId);

    if (staffError) throw staffError;

    // 申告データを取得
    const { data: submissions, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('facility_id', facilityId);

    if (submissionError) throw submissionError;

    const summary = staffs.map(staff => {
      const yearMonthStr = `${yearInt}-${String(monthInt).padStart(2, '0')}`;
      const staffSubmissions = (submissions || []).filter(
        sub => sub.staff_id === staff.staff_id && sub.date.startsWith(yearMonthStr)
      );

      const submissionDetails = staffSubmissions.map(s => ({
        submission_id: s.submission_id,
        date: s.date,
        location_id: s.location_id,
        location_name: s.location_name || '',
        type: s.type
      }));

      const submittedLocations = [...new Set(
        staffSubmissions
          .map(s => s.location_name)
          .filter(l => l && l !== '（勤務曜日により自動申告）')
      )];
      const locationDisplay = submittedLocations.join('、');

      let submission_count = 0;
      let submission_status = 'not_submitted';

      if (staff.work_days && staff.work_days !== '') {
        const autoSubmittedDates = generateSubmissionDates(staff.work_days, yearInt, monthInt);
        submission_count = autoSubmittedDates.length;
        submission_status = 'submitted';
      } else {
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
        submission_status,
        submission_count,
        submission_dates: staffSubmissions.map(s => s.date),
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ダッシュボード：申告追加 ==========
app.post('/api/dashboard/submissions/add', async (req, res) => {
  try {
    const { facility_id, staff_id, date, location_id } = req.body;

    if (!facility_id || !staff_id || !date || !location_id) {
      return res.status(400).json({ error: 'facility_id, staff_id, date, location_id are required' });
    }

    const facilityId = parseInt(facility_id);

    const { data: staff, error: staffError } = await supabase
      .from('staffs')
      .select('staff_id')
      .eq('staff_id', staff_id)
      .eq('facility_id', facilityId)
      .single();

    if (staffError) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const { data: location } = await supabase
      .from('locations')
      .select('location_name')
      .eq('location_id', parseInt(location_id))
      .single();

    const locationName = location?.location_name || '';

    // 重複チェック
    const { data: existing } = await supabase
      .from('submissions')
      .select('submission_id')
      .eq('staff_id', staff_id)
      .eq('date', date)
      .eq('facility_id', facilityId);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: '同じ日に申告済みです。複数の棟での勤務は出来ません。' });
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        staff_id,
        facility_id: facilityId,
        date,
        location_id: parseInt(location_id),
        location_name: locationName,
        submitted_at: new Date().toISOString(),
        type: 'manual'
      })
      .select();

    if (error) throw error;

    res.status(201).json({
      message: 'Submission added',
      submission: submission[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ダッシュボード：申告削除 ==========
app.delete('/api/dashboard/submissions/:submissionId', async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submissionId);

    const { data: submission, error: getError } = await supabase
      .from('submissions')
      .select('*')
      .eq('submission_id', submissionId)
      .single();

    if (getError) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('submission_id', submissionId);

    if (error) throw error;

    res.json({ message: 'Submission deleted', deleted: submission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ダッシュボード：申告更新 ==========
app.put('/api/dashboard/submissions/:submissionId', async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submissionId);
    const { date, location_id } = req.body;

    const { data: submission, error: getError } = await supabase
      .from('submissions')
      .select('*')
      .eq('submission_id', submissionId)
      .single();

    if (getError) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const newDate = date || submission.date;
    const newLocationId = location_id !== undefined ? location_id : submission.location_id;

    // 重複チェック
    const { data: existing } = await supabase
      .from('submissions')
      .select('submission_id')
      .eq('staff_id', submission.staff_id)
      .eq('date', newDate)
      .eq('facility_id', submission.facility_id)
      .neq('submission_id', submissionId);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: '同じ日に他の申告がある為、修正出来ません。複数の棟での勤務は出来ません。' });
    }

    let locationName = submission.location_name;
    if (location_id !== undefined) {
      const { data: location } = await supabase
        .from('locations')
        .select('location_name')
        .eq('location_id', location_id)
        .single();
      locationName = location?.location_name || '';
    }

    const { data: updated, error } = await supabase
      .from('submissions')
      .update({
        date: newDate,
        location_id: newLocationId,
        location_name: locationName,
        updated_at: new Date().toISOString()
      })
      .eq('submission_id', submissionId)
      .select();

    if (error) throw error;

    res.json({ message: 'Submission updated', submission: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Phase 4：シフト取得 ==========
app.get('/api/phase4/shifts/get', async (req, res) => {
  try {
    const { facility_id, year, month } = req.query;
    const facilityId = parseInt(facility_id);

    console.log(`[GET /api/phase4/shifts/get] ${year}-${String(month).padStart(2, '0')} のシフトを取得`);

    const { data: shift, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('year', parseInt(year))
      .eq('month', parseInt(month))
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Phase 4：シフト保存 ==========
app.post('/api/phase4/shifts/save', async (req, res) => {
  try {
    console.log('[POST /api/phase4/shifts/save] リクエスト受信:', req.body);
    const { facility_id, year, month, edits } = req.body;

    if (!facility_id || !year || !month || !edits) {
      console.log('[POST /api/phase4/shifts/save] バリデーションエラー');
      return res.status(400).json({ error: 'facility_id, year, month, edits are required' });
    }

    const facilityId = parseInt(facility_id);
    const yearInt = parseInt(year);
    const monthInt = parseInt(month);

    // Check if shift already exists
    const { data: existing } = await supabase
      .from('shifts')
      .select('shift_id')
      .eq('facility_id', facilityId)
      .eq('year', yearInt)
      .eq('month', monthInt)
      .single();

    const shiftData = {
      facility_id: facilityId,
      year: yearInt,
      month: monthInt,
      edits: edits,
      saved_at: new Date().toISOString()
    };

    let result;
    if (existing) {
      // Update existing shift
      const { data, error } = await supabase
        .from('shifts')
        .update(shiftData)
        .eq('facility_id', facilityId)
        .eq('year', yearInt)
        .eq('month', monthInt)
        .select();

      if (error) throw error;
      result = data;
    } else {
      // Insert new shift
      const { data, error } = await supabase
        .from('shifts')
        .insert(shiftData)
        .select();

      if (error) throw error;
      result = data;
    }

    res.status(200).json({
      message: 'Shift saved successfully',
      facility_id: facilityId,
      year: yearInt,
      month: monthInt,
      edits_count: Object.keys(edits).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
