import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';
import './Phase4.css';

const API_BASE_URL = 'http://localhost:8000/api';

export default function Phase4() {
  const navigate = useNavigate();
  const [corporations, setCorporations] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCorp, setSelectedCorp] = useState('');
  const [selectedFacility, setSelectedFacility] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));

  const [shiftTable, setShiftTable] = useState(null);
  const [staffSummaryEdits, setStaffSummaryEdits] = useState({});
  const [shiftEdits, setShiftEdits] = useState({});

  useEffect(() => {
    const fetchCorporations = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/phase1/corporations/`);
        setCorporations(response.data);
        setLoading(false);
      } catch (error) {
        console.error('法人取得エラー:', error);
        setLoading(false);
      }
    };

    fetchCorporations();
  }, []);

  useEffect(() => {
    if (selectedCorp) {
      const fetchFacilities = async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/phase1/corporations/${selectedCorp}/facilities/`
          );
          setFacilities(response.data);
          setSelectedFacility('');
          setShiftTable(null);
        } catch (error) {
          console.error('事業所取得エラー:', error);
        }
      };

      fetchFacilities();
    }
  }, [selectedCorp]);

  useEffect(() => {
    if (selectedFacility) {
      const fetchData = async () => {
        try {
          const locationResponse = await axios.get(
            `${API_BASE_URL}/phase1/facilities/${selectedFacility}/locations/`
          );
          setLocations(locationResponse.data);

          const dashboardResponse = await axios.get(
            `${API_BASE_URL}/dashboard/summary`,
            {
              params: {
                facility_id: selectedFacility,
                year: selectedYear,
                month: selectedMonth
              }
            }
          );

          generateShiftTable(dashboardResponse.data.staffs || [], selectedYear, parseInt(selectedMonth));
        } catch (error) {
          console.error('データ取得エラー:', error);
        }
      };

      fetchData();
    }
  }, [selectedFacility, selectedYear, selectedMonth]);

  // 曜日マップ
  const dayMap = { '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6, '日': 0 };
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  // 日付と曜日を取得
  const getDateWithDay = (day) => {
    const date = new Date(shiftTable?.year, shiftTable?.month - 1, day);
    const dayOfWeek = dayLabels[date.getDay()];
    return `${day}日（${dayOfWeek}）`;
  };

  // 勤務時間計算関数（Phase 2情報から正確な勤務時間を算出）
  const calculateWorkHours = (positions, breakStart, breakEnd) => {
    if (!Array.isArray(positions) || positions.length === 0) return 0;

    let totalHours = 0;
    positions.forEach(pos => {
      const startHour = parseInt((pos.work_hours_start || '06').split(':')[0]);
      const startMin = parseInt((pos.work_hours_start || '06').split(':')[1]) || 0;
      const endHour = parseInt((pos.work_hours_end || '22').split(':')[0]);
      const endMin = parseInt((pos.work_hours_end || '22').split(':')[1]) || 0;

      let hours = startHour > endHour
        ? (24 - startHour) + endHour
        : endHour - startHour;
      hours += (endMin - startMin) / 60;

      totalHours += hours;
    });

    // 複数職種全体の合計から、休憩時間は1回だけ差し引く
    if (breakStart && breakEnd) {
      const breakStartHour = parseInt(breakStart.split(':')[0]);
      const breakStartMin = parseInt(breakStart.split(':')[1]) || 0;
      const breakEndHour = parseInt(breakEnd.split(':')[0]);
      const breakEndMin = parseInt(breakEnd.split(':')[1]) || 0;
      const breakHours = (breakEndHour + breakEndMin / 60) - (breakStartHour + breakStartMin / 60);
      totalHours -= breakHours;
    }

    return totalHours;
  };

  // 17時起点でのシフト表生成ロジック
  const generateShiftTable = (dashboardStaffs, year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayStartMap = {}; // { 'YYYY-MM-DD': { staffId_location: { dayShift: 0, nightShift: 0, staff_id, location } } }
    const staffLocationMap = {}; // { staffId_location: { staff_id, staff_name, location } }

    dashboardStaffs.forEach(staff => {
      // Phase 2の登録情報から勤務時間を計算
      const workHours = calculateWorkHours(staff.positions, staff.break_start, staff.break_end);
      const isNightShift = staff.positions && staff.positions.some(p => {
        const startHour = parseInt((p.work_hours_start || '06').split(':')[0]);
        return startHour >= 22;
      });

      // パターン1：固定勤務（work_days がある）
      if (staff.work_days && staff.work_days !== '') {
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day);
          const dayOfWeek = date.getDay();
          const dayLabel = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);

          if (dayLabel && staff.work_days.includes(dayLabel)) {
            const shiftDate = new Date(year, month - 1, day, 17, 0, 0);
            const shiftDateStr = shiftDate.toISOString().split('T')[0];
            const staffLocationKey = `${staff.staff_id}_-`;

            if (!dayStartMap[shiftDateStr]) {
              dayStartMap[shiftDateStr] = {};
            }
            if (!dayStartMap[shiftDateStr][staffLocationKey]) {
              dayStartMap[shiftDateStr][staffLocationKey] = { dayShift: 0, nightShift: 0, staff_id: staff.staff_id, location: '-' };
            }

            if (!staffLocationMap[staffLocationKey]) {
              staffLocationMap[staffLocationKey] = { staff_id: staff.staff_id, staff_name: staff.staff_name, location: '-' };
            }

            if (isNightShift) {
              dayStartMap[shiftDateStr][staffLocationKey].nightShift += workHours;
            } else {
              dayStartMap[shiftDateStr][staffLocationKey].dayShift += workHours;
            }
          }
        }
      }
      // パターン2：申告制（Phase 3の申告データ）
      else if (staff.submission_details && staff.submission_details.length > 0) {
        staff.submission_details.forEach(detail => {
          const [subYear, subMonth, subDay] = detail.date.split('-').map(Number);
          const shiftDate = new Date(subYear, subMonth - 1, subDay, 17, 0, 0);
          const shiftDateStr = shiftDate.toISOString().split('T')[0];
          const locationName = detail.location_name || '-';
          const staffLocationKey = `${staff.staff_id}_${locationName}`;

          if (!dayStartMap[shiftDateStr]) {
            dayStartMap[shiftDateStr] = {};
          }
          if (!dayStartMap[shiftDateStr][staffLocationKey]) {
            dayStartMap[shiftDateStr][staffLocationKey] = { dayShift: 0, nightShift: 0, staff_id: staff.staff_id, location: locationName };
          }

          if (!staffLocationMap[staffLocationKey]) {
            staffLocationMap[staffLocationKey] = { staff_id: staff.staff_id, staff_name: staff.staff_name, location: locationName };
          }

          // 複数職種を個別に処理
          let dayShiftHours = 0;
          let nightShiftHours = 0;
          let nextDayShiftHours = 0;

          staff.positions.forEach(pos => {
            const startHour = parseInt((pos.work_hours_start || '06').split(':')[0]);
            const endHour = parseInt((pos.work_hours_end || '22').split(':')[0]);
            let hours = startHour > endHour
              ? (24 - startHour) + endHour
              : endHour - startHour;

            // 夜勤（22:00-06:00）
            if (startHour >= 22) {
              nightShiftHours += hours;
            }
            // 日勤（06:00-22:00）
            // 17時起点なので、17時未満で終了するシフトは翌日のシフト日に属する
            else if (endHour < 17) {
              nextDayShiftHours += hours;
            } else {
              dayShiftHours += hours;
            }
          });

          // 夜勤から休憩時間を差し引く
          if (nightShiftHours > 0 && staff.break_start && staff.break_end) {
            const breakStartHour = parseInt(staff.break_start.split(':')[0]);
            const breakStartMin = parseInt(staff.break_start.split(':')[1]) || 0;
            const breakEndHour = parseInt(staff.break_end.split(':')[0]);
            const breakEndMin = parseInt(staff.break_end.split(':')[1]) || 0;
            const breakHours = (breakEndHour + breakEndMin / 60) - (breakStartHour + breakStartMin / 60);
            nightShiftHours -= breakHours;
          }

          dayStartMap[shiftDateStr][staffLocationKey].dayShift += dayShiftHours;
          dayStartMap[shiftDateStr][staffLocationKey].nightShift += nightShiftHours;

          // 翌日の日勤を追加
          if (nextDayShiftHours > 0) {
            const nextDate = new Date(subYear, subMonth - 1, subDay + 1, 17, 0, 0);
            const nextDateStr = nextDate.toISOString().split('T')[0];
            if (!dayStartMap[nextDateStr]) {
              dayStartMap[nextDateStr] = {};
            }
            if (!dayStartMap[nextDateStr][staffLocationKey]) {
              dayStartMap[nextDateStr][staffLocationKey] = { dayShift: 0, nightShift: 0, staff_id: staff.staff_id, location: locationName };
            }
            dayStartMap[nextDateStr][staffLocationKey].dayShift += nextDayShiftHours;
          }
        });
      }
    });

    // スタッフ別・月別の合計時間を計算（1～28日分のみ）
    const staffMonthlySummary = {};
    Object.entries(dayStartMap).forEach(([dateStr, dayData]) => {
      const [, , day] = dateStr.split('-');
      const dayNum = parseInt(day);
      if (dayNum > 28) return;

      Object.entries(dayData).forEach(([staffLocationKey, hours]) => {
        if (!staffMonthlySummary[staffLocationKey]) {
          staffMonthlySummary[staffLocationKey] = {
            dayShift: 0,
            nightShift: 0,
            total: 0
          };
        }
        staffMonthlySummary[staffLocationKey].dayShift += hours.dayShift;
        staffMonthlySummary[staffLocationKey].nightShift += hours.nightShift;
        staffMonthlySummary[staffLocationKey].total += hours.dayShift + hours.nightShift;
      });
    });

    setShiftTable({
      year,
      month,
      daysInMonth,
      dayStartMap,
      staffLocationMap,
      staffMonthlySummary
    });
  };

  if (loading) {
    return (
      <div className="phase4-container">
        <Header />
        <main className="phase4-main">
          <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
        </main>
      </div>
    );
  }

  const hasData = corporations.length > 0;

  return (
    <div className="phase4-container">
      <Header />

      <main className="phase4-main">
        {!hasData ? (
          <div className="setup-required">
            <div className="setup-card">
              <h2>初期設定が必要です</h2>
              <p>ハンバーガーメニューから「法人・事業所・拠点」を登録してください。</p>
            </div>
          </div>
        ) : (
          <>
            <div className="phase4-welcome">
              <h2>Phase 4：シフト作成</h2>
            </div>

            {/* セレクタ */}
            <div className="selector-container">
              <div className="selector-row">
                <div className="selector-group" style={{ flex: 1 }}>
                  <label htmlFor="corp-select">法人</label>
                  <select
                    id="corp-select"
                    value={selectedCorp}
                    onChange={(e) => setSelectedCorp(e.target.value)}
                    className="selector-input"
                  >
                    <option value="">--- 選択してください ---</option>
                    {corporations.map((corp) => (
                      <option key={corp.corp_id} value={corp.corp_id}>
                        {corp.corp_name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCorp && (
                  <div className="selector-group" style={{ flex: 1 }}>
                    <label htmlFor="facility-select">事業所</label>
                    <select
                      id="facility-select"
                      value={selectedFacility}
                      onChange={(e) => setSelectedFacility(e.target.value)}
                      className="selector-input"
                      disabled={facilities.length === 0}
                    >
                      <option value="">--- 選択してください ---</option>
                      {facilities.map((facility) => (
                        <option key={facility.facility_id} value={facility.facility_id}>
                          {facility.facility_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedFacility && (
                <div className="selector-row">
                  <div className="selector-group" style={{ flex: 1 }}>
                    <label htmlFor="year-select">年</label>
                    <select
                      id="year-select"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="selector-input"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((year) => (
                        <option key={year} value={year.toString()}>
                          {year}年
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="selector-group" style={{ flex: 1 }}>
                    <label htmlFor="month-select">月</label>
                    <select
                      id="month-select"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="selector-input"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = String(i + 1).padStart(2, '0');
                        return (
                          <option key={month} value={month}>
                            {i + 1}月
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* シフト表 */}
            {selectedFacility && shiftTable && (
              <>
              <div className="shift-table-section">
                <h3>【{selectedYear}年{selectedMonth}月 シフト表】</h3>

                {/* 日勤セクション */}
                <h4 style={{ marginTop: '30px', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>【ゆうみのいえ日勤】</h4>
                <div className="shift-table-wrapper">
                  <table className="shift-table">
                    <thead>
                      <tr>
                        <th>氏名</th>
                        {Array.from({ length: shiftTable.daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const date = new Date(shiftTable.year, shiftTable.month - 1, day);
                          const dayOfWeek = dayLabels[date.getDay()];
                          return (
                            <th key={day}>{day}日（{dayOfWeek}）</th>
                          );
                        })}
                        <th>合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        new Set(
                          Object.entries(shiftTable.dayStartMap || {})
                            .flatMap(([date, dayData]) =>
                              Object.entries(dayData)
                                .filter(([key, data]) => data.dayShift > 0)
                                .map(([key]) => key.split('_')[0])
                            )
                        )
                      ).sort().map((staffId) => {
                        const staffKey = Object.keys(shiftTable.staffLocationMap || {})
                          .find(key => key.startsWith(`${staffId}_`));
                        const staff = staffKey ? shiftTable.staffLocationMap[staffKey] : null;

                        return staff ? (
                          <tr key={`day-${staffId}`}>
                            <td style={{ fontWeight: '600' }}>{staff.staff_name}</td>
                            {Array.from({ length: shiftTable.daysInMonth }, (_, i) => {
                              const day = i + 1;
                              const shiftDate = new Date(shiftTable.year, shiftTable.month - 1, day, 17, 0, 0);
                              const shiftDateStr = shiftDate.toISOString().split('T')[0];
                              const editKey = `day_${staffId}_${shiftDateStr}`;

                              let totalDayShift = 0;
                              Object.entries(shiftTable.dayStartMap[shiftDateStr] || {}).forEach(([key, data]) => {
                                if (key.startsWith(`${staffId}_`)) {
                                  totalDayShift += data.dayShift;
                                }
                              });

                              const displayValue = shiftEdits[editKey] !== undefined ? shiftEdits[editKey] : totalDayShift;

                              return (
                                <td
                                  key={day}
                                  style={{ textAlign: 'center', color: displayValue > 0 ? '#333' : '#ccc', fontWeight: displayValue > 0 ? '600' : 'normal', padding: '10px 8px', cursor: 'pointer' }}
                                  onDoubleClick={() => setShiftEdits(prev => ({ ...prev, [editKey]: displayValue === '' ? '' : displayValue }))}
                                >
                                  {shiftEdits[editKey] !== undefined ? (
                                    <input
                                      type="number"
                                      step="0.5"
                                      value={displayValue}
                                      onChange={(e) => setShiftEdits(prev => ({ ...prev, [editKey]: e.target.value }))}
                                      onBlur={() => setShiftEdits(prev => { const newEdits = { ...prev }; delete newEdits[editKey]; return newEdits; })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          setShiftEdits(prev => { const newEdits = { ...prev }; delete newEdits[editKey]; return newEdits; });
                                        }
                                      }}
                                      autoFocus
                                      style={{ width: '35px', textAlign: 'center', border: '1px solid #0066cc', padding: '2px' }}
                                    />
                                  ) : (
                                    displayValue > 0 ? displayValue : ''
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ textAlign: 'center', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9' }}>
                              {(() => {
                                let sum = 0;
                                for (let day = 1; day <= 28; day++) {
                                  const shiftDate = new Date(shiftTable.year, shiftTable.month - 1, day, 17, 0, 0);
                                  const shiftDateStr = shiftDate.toISOString().split('T')[0];
                                  const editKey = `day_${staffId}_${shiftDateStr}`;
                                  const value = shiftEdits[editKey] !== undefined ? parseFloat(shiftEdits[editKey]) || 0 : 0;
                                  const dayData = shiftTable.dayStartMap[shiftDateStr] ? Object.entries(shiftTable.dayStartMap[shiftDateStr])
                                    .filter(([key]) => key.startsWith(`${staffId}_`))
                                    .reduce((acc, [, data]) => acc + data.dayShift, 0) : 0;
                                  sum += value > 0 ? value : dayData;
                                }
                                return sum > 0 ? sum : '';
                              })()}
                            </td>
                          </tr>
                        ) : null;
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 夜勤セクション */}
                <h4 style={{ marginTop: '30px', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>【ゆうみのいえ夜勤】</h4>
                <div className="shift-table-wrapper">
                  <table className="shift-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '80px' }}>氏名</th>
                        {Array.from({ length: shiftTable.daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const date = new Date(shiftTable.year, shiftTable.month - 1, day);
                          const dayOfWeek = dayLabels[date.getDay()];
                          return (
                            <th key={day} style={{ minWidth: '60px' }}>{day}日（{dayOfWeek}）</th>
                          );
                        })}
                        <th>合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        new Set(
                          Object.values(shiftTable.staffLocationMap || {})
                            .filter(s => s.location && s.location !== '-')
                            .map(s => s.location)
                        )
                      ).map((location) => {
                        const locationStaffs = Object.entries(shiftTable.staffLocationMap || {})
                          .filter(([key, staff]) => staff.location === location)
                          .filter(([key, staff]) => {
                            // 夜勤データがあるもののみ表示
                            return Object.values(shiftTable.dayStartMap || {}).some(dayData => dayData[key]?.nightShift > 0);
                          })
                          .map(([key, staff]) => staff);

                        return (
                          <React.Fragment key={location}>
                            <tr className="location-header">
                              <td colSpan={1 + shiftTable.daysInMonth + 1} style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: '10px' }}>
                                {location}
                              </td>
                            </tr>
                            {locationStaffs.length > 0 ? (
                              locationStaffs.map((staff) => {
                                const staffKey = `${staff.staff_id}_${location}`;
                                return (
                                  <tr key={staffKey}>
                                    <td style={{ fontWeight: '600' }}>{staff.staff_name}</td>
                                    {Array.from({ length: shiftTable.daysInMonth }, (_, i) => {
                                      const day = i + 1;
                                      const shiftDate = new Date(shiftTable.year, shiftTable.month - 1, day, 17, 0, 0);
                                      const shiftDateStr = shiftDate.toISOString().split('T')[0];
                                      const dayData = shiftTable.dayStartMap[shiftDateStr]?.[staffKey];
                                      const editKey = `night_${staffKey}_${shiftDateStr}`;
                                      const displayValue = shiftEdits[editKey] !== undefined ? shiftEdits[editKey] : (dayData?.nightShift || 0);
                                      const isEditing = shiftEdits[editKey] !== undefined;

                                      return (
                                        <td
                                          key={day}
                                          style={{ textAlign: 'center', color: displayValue > 0 ? '#0066cc' : '#ccc', fontWeight: displayValue > 0 ? '600' : 'normal', padding: '2px', cursor: 'pointer' }}
                                          onClick={() => setShiftEdits(prev => ({ ...prev, [editKey]: displayValue }))}
                                        >
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={displayValue}
                                              onChange={(e) => setShiftEdits(prev => ({ ...prev, [editKey]: e.target.value }))}
                                              onBlur={() => setShiftEdits(prev => { const newEdits = { ...prev }; delete newEdits[editKey]; return newEdits; })}
                                              autoFocus
                                              style={{ width: '40px', textAlign: 'center', border: '1px solid #0066cc', padding: '2px' }}
                                            />
                                          ) : (
                                            displayValue > 0 ? displayValue : ''
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#0066cc', backgroundColor: '#f9f9f9' }}>
                                      {(() => {
                                        let sum = 0;
                                        for (let day = 1; day <= 28; day++) {
                                          const shiftDate = new Date(shiftTable.year, shiftTable.month - 1, day, 17, 0, 0);
                                          const shiftDateStr = shiftDate.toISOString().split('T')[0];
                                          const dayData = shiftTable.dayStartMap[shiftDateStr]?.[staffKey];
                                          if (dayData?.nightShift > 0) {
                                            sum += dayData.nightShift;
                                          }
                                        }
                                        return sum > 0 ? sum : '';
                                      })()}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={1 + shiftTable.daysInMonth} style={{ textAlign: 'center', color: '#999', fontSize: '12px', padding: '8px' }}>
                                  該当スタッフなし
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {shiftTable.staffLocationMap && Object.keys(shiftTable.staffLocationMap).length > 0 && (
                <div className="shift-table-section" style={{ marginTop: '30px' }}>
                  <h3>スタッフ一覧</h3>
                  <div className="shift-table-wrapper">
                    <table className="shift-table">
                      <thead>
                        <tr>
                          <th>スタッフ名</th>
                          <th>日勤</th>
                          <th>夜勤</th>
                          <th>合計</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const staffSummary = {};
                          Object.entries(shiftTable.staffMonthlySummary || {}).forEach(([key, summary]) => {
                            const staffId = key.split('_')[0];
                            if (!staffSummary[staffId]) {
                              staffSummary[staffId] = { dayShift: 0, nightShift: 0, total: 0, staffName: '' };
                            }
                            const staffInfo = Object.values(shiftTable.staffLocationMap || {}).find(s => String(s.staff_id) === staffId);
                            staffSummary[staffId].staffName = staffInfo?.staff_name || '';
                            staffSummary[staffId].dayShift += summary.dayShift;
                            staffSummary[staffId].nightShift += summary.nightShift;
                            staffSummary[staffId].total += summary.total;
                          });

                          return Object.entries(staffSummary).map(([staffId, summary]) => {
                            const dayShift = Math.round(summary.dayShift * 10) / 10;
                            const nightShift = Math.round(summary.nightShift * 10) / 10;
                            const total = Math.round(summary.total * 10) / 10;
                            const isOverLimit = total > 160;

                            return (
                              <tr key={staffId} style={isOverLimit ? { backgroundColor: '#fff3cd' } : {}}>
                                <td style={{ fontWeight: '600' }}>{summary.staffName}</td>
                                <td style={{ textAlign: 'center', padding: '5px' }}>日勤{dayShift}時間</td>
                                <td style={{ textAlign: 'center', padding: '5px' }}>夜勤{nightShift}時間</td>
                                <td style={{ textAlign: 'center', fontWeight: '600', color: isOverLimit ? '#d9534f' : '#0066cc', padding: '5px' }}>合計{total}時間</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
