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
  const [editingKey, setEditingKey] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
      const fetchLocations = async () => {
        try {
          const locationResponse = await axios.get(
            `${API_BASE_URL}/phase1/facilities/${selectedFacility}/locations/`
          );
          setLocations(locationResponse.data);
          setShiftTable(null);
          setShiftEdits({});
        } catch (error) {
          console.error('拠点取得エラー:', error);
        }
      };

      fetchLocations();
    }
  }, [selectedFacility]);

  useEffect(() => {
    if (selectedFacility && selectedYear && selectedMonth) {
      const loadSavedShift = async () => {
        try {
          // 保存済みシフトを確認
          const shiftResponse = await axios.get(`${API_BASE_URL}/phase4/shifts/get`, {
            params: {
              facility_id: selectedFacility,
              year: selectedYear,
              month: selectedMonth
            }
          });

          // 保存済みシフトが見つかった場合、シフト表を生成して表示
          if (shiftResponse.data.edits) {
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
            setShiftEdits(shiftResponse.data.edits);

            // 保存済み edits を反映してエラーを再判定
            setTimeout(() => {
              setShiftTable(prev => {
                if (prev) {
                  const newErrors = recalculateErrors(prev, shiftResponse.data.edits);
                  return { ...prev, errors: newErrors };
                }
                return prev;
              });
            }, 0);
          }
        } catch (error) {
          // 保存済みシフトがない場合は何もしない
          if (error.response?.status !== 404) {
            console.error('保存済みシフト取得エラー:', error);
          }
        }
      };

      loadSavedShift();
    }
  }, [selectedFacility, selectedYear, selectedMonth]);

  const handleCreateShift = async () => {
    if (!selectedFacility || !selectedYear || !selectedMonth) {
      alert('法人、事業所、年月を選択してください');
      return;
    }

    try {
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
      setShiftEdits({});
    } catch (error) {
      console.error('シフト作成エラー:', error);
      alert('シフト作成に失敗しました');
    }
  };

  // 修正後のアラート判定
  const recalculateErrors = (currentShiftTable, currentEdits) => {
    const newErrors = [];
    const dayStartMap = JSON.parse(JSON.stringify(currentShiftTable.dayStartMap || {}));

    // dayStartMap を currentEdits で更新
    Object.entries(currentEdits).forEach(([editKey, editValue]) => {
      const parsedValue = parseFloat(editValue) || 0;

      // editKey の形式: day_staffLocationKey_YYYY-MM-DD または night_staffLocationKey_YYYY-MM-DD
      let type, dateStr, staffLocationKey;
      if (editKey.startsWith('day_')) {
        type = 'day';
        const rest = editKey.slice(4); // 'day_' を削除
        const lastIndex = rest.lastIndexOf('_');
        staffLocationKey = rest.substring(0, lastIndex);
        dateStr = rest.substring(lastIndex + 1);
      } else if (editKey.startsWith('night_')) {
        type = 'night';
        const rest = editKey.slice(6); // 'night_' を削除
        const lastIndex = rest.lastIndexOf('_');
        staffLocationKey = rest.substring(0, lastIndex);
        dateStr = rest.substring(lastIndex + 1);
      }

      if (dayStartMap[dateStr] && dayStartMap[dateStr][staffLocationKey]) {
        if (type === 'day') {
          dayStartMap[dateStr][staffLocationKey].dayShift = parsedValue;
        } else if (type === 'night') {
          dayStartMap[dateStr][staffLocationKey].nightShift = parsedValue;
        }
      }
    });

    // 更新された dayStartMap でエラー判定
    Object.entries(dayStartMap).forEach(([dateStr, dayData]) => {
      const staffLocations = {};
      Object.entries(dayData).forEach(([staffLocationKey, data]) => {
        const staffId = data.staff_id;
        const location = data.location;
        const nightShiftHours = data.nightShift || 0;
        if (nightShiftHours > 0 && location !== '-') {
          if (!staffLocations[staffId]) {
            staffLocations[staffId] = new Set();
          }
          staffLocations[staffId].add(location);
        }
      });

      Object.entries(staffLocations).forEach(([staffId, locationsSet]) => {
        const uniqueLocations = Array.from(locationsSet);
        if (uniqueLocations.length > 1) {
          const staffLocationKey = `${staffId}_${uniqueLocations[0]}`;
          const staffInfo = currentShiftTable.staffLocationMap?.[staffLocationKey];
          const isNightShift = staffInfo?.positions?.some(p => p.position === '夜間世話人');

          if (isNightShift) {
            const staffName = staffInfo?.staff_name || `スタッフ${staffId}`;
            newErrors.push({
              date: dateStr,
              staffName: staffName,
              locations: uniqueLocations,
              message: `${staffName}は${dateStr}に複数拠点での勤務があります`
            });
          }
        }
      });

      // ②同じ拠点で複数人の夜間世話人が勤務している場合のエラー判定
      const locationStaffs = {};
      Object.entries(dayData).forEach(([staffLocationKey, data]) => {
        const staffId = data.staff_id;
        const location = data.location;
        const nightShiftHours = data.nightShift || 0;
        if (nightShiftHours > 0 && location !== '-') {
          if (!locationStaffs[location]) {
            locationStaffs[location] = new Set();
          }
          locationStaffs[location].add(staffId);
        }
      });

      Object.entries(locationStaffs).forEach(([location, staffIds]) => {
        const uniqueStaffIds = Array.from(staffIds);
        if (uniqueStaffIds.length > 1) {
          const staffInfo = Array.from(staffIds).map(id => {
            const key = Object.keys(currentShiftTable.staffLocationMap || {}).find(k => currentShiftTable.staffLocationMap[k].staff_id === parseInt(id) && currentShiftTable.staffLocationMap[k].location === location);
            return currentShiftTable.staffLocationMap?.[key]?.positions?.some(p => p.position === '夜間世話人') ? id : null;
          }).filter(Boolean);

          if (staffInfo.length > 1) {
            newErrors.push({
              date: dateStr,
              location: location,
              staffCount: uniqueStaffIds.length,
              message: `${location}は${dateStr}に${uniqueStaffIds.length}人が勤務しています（1人のみ）`
            });
          }
        }
      });
    });

    return newErrors;
  };

  const handleSaveShift = async () => {
    if (!selectedFacility || Object.keys(shiftEdits).length === 0) {
      alert('修正内容がありません');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSaveShift = async () => {
    setShowConfirmDialog(false);

    try {
      await axios.post(`${API_BASE_URL}/phase4/shifts/save`, {
        facility_id: selectedFacility,
        year: selectedYear,
        month: selectedMonth,
        edits: shiftEdits
      });

      // 保存後、編集値をシフト表に反映させる
      const updatedShiftTable = {
        ...shiftTable,
        dayStartMap: JSON.parse(JSON.stringify(shiftTable.dayStartMap))
      };
      Object.entries(shiftEdits).forEach(([editKey, value]) => {
        const parsedValue = parseFloat(value) || 0;

        // editKey の形式: day_staffLocationKey_YYYY-MM-DD または night_staffLocationKey_YYYY-MM-DD
        let type, dateStr, staffLocationKey;
        if (editKey.startsWith('day_')) {
          type = 'day';
          const rest = editKey.slice(4);
          const lastIndex = rest.lastIndexOf('_');
          staffLocationKey = rest.substring(0, lastIndex);
          dateStr = rest.substring(lastIndex + 1);
        } else if (editKey.startsWith('night_')) {
          type = 'night';
          const rest = editKey.slice(6);
          const lastIndex = rest.lastIndexOf('_');
          staffLocationKey = rest.substring(0, lastIndex);
          dateStr = rest.substring(lastIndex + 1);
        }

        if (updatedShiftTable.dayStartMap[dateStr] && updatedShiftTable.dayStartMap[dateStr][staffLocationKey]) {
          if (type === 'day') {
            updatedShiftTable.dayStartMap[dateStr][staffLocationKey].dayShift = parsedValue;
          } else if (type === 'night') {
            updatedShiftTable.dayStartMap[dateStr][staffLocationKey].nightShift = parsedValue;
          }
        }
      });

      // 保存後のデータを基にエラーを再判定
      const newErrors = [];
      Object.entries(updatedShiftTable.dayStartMap).forEach(([dateStr, dayData]) => {
        const staffLocations = {};
        Object.entries(dayData).forEach(([staffLocationKey, data]) => {
          const staffId = data.staff_id;
          const location = data.location;
          const nightShiftHours = data.nightShift || 0;
          if (nightShiftHours > 0 && location !== '-') {
            if (!staffLocations[staffId]) {
              staffLocations[staffId] = new Set();
            }
            staffLocations[staffId].add(location);
          }
        });

        Object.entries(staffLocations).forEach(([staffId, locationsSet]) => {
          const uniqueLocations = Array.from(locationsSet);
          if (uniqueLocations.length > 1) {
            const staffLocationKey = `${staffId}_${uniqueLocations[0]}`;
            const staffInfo = updatedShiftTable.staffLocationMap?.[staffLocationKey];
            const isNightShift = staffInfo?.positions?.some(p => p.position === '夜間世話人');

            if (isNightShift) {
              const staffName = staffInfo?.staff_name || `スタッフ${staffId}`;
              newErrors.push({
                date: dateStr,
                staffName: staffName,
                locations: uniqueLocations,
                message: `${staffName}は${dateStr}に複数拠点での勤務があります`
              });
            }
          }
        });

        // ②同じ拠点で複数人の夜間世話人が勤務している場合のエラー判定
        const locationStaffs = {};
        Object.entries(dayData).forEach(([staffLocationKey, data]) => {
          const staffId = data.staff_id;
          const location = data.location;
          const nightShiftHours = data.nightShift || 0;
          if (nightShiftHours > 0 && location !== '-') {
            if (!locationStaffs[location]) {
              locationStaffs[location] = new Set();
            }
            locationStaffs[location].add(staffId);
          }
        });

        Object.entries(locationStaffs).forEach(([location, staffIds]) => {
          const uniqueStaffIds = Array.from(staffIds);
          if (uniqueStaffIds.length > 1) {
            const staffInfo = Array.from(staffIds).map(id => {
              const key = Object.keys(updatedShiftTable.staffLocationMap || {}).find(k => updatedShiftTable.staffLocationMap[k].staff_id === parseInt(id) && updatedShiftTable.staffLocationMap[k].location === location);
              return updatedShiftTable.staffLocationMap?.[key]?.positions?.some(p => p.position === '夜間世話人') ? id : null;
            }).filter(Boolean);

            if (staffInfo.length > 1) {
              newErrors.push({
                date: dateStr,
                location: location,
                staffCount: uniqueStaffIds.length,
                message: `${location}は${dateStr}に${uniqueStaffIds.length}人が勤務しています（1人のみ）`
              });
            }
          }
        });
      });
      updatedShiftTable.errors = newErrors;

      setShiftTable(updatedShiftTable);
      // shiftEdits は保持してクリアしない（編集データは保持）
    } catch (error) {
      console.error('シフト保存エラー:', error);
      alert('シフト保存に失敗しました');
    }
  };

  const cancelSaveShift = () => {
    setShowConfirmDialog(false);
  };

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
    const duplicateErrors = []; // 重複勤務エラーを記録

    dashboardStaffs.forEach(staff => {
      // Phase 2の登録情報から勤務時間を計算
      const workHours = calculateWorkHours(staff.positions, staff.break_start, staff.break_end);
      // 職種で夜勤判定：「夜間世話人」が夜勤、その他は日勤
      const isNightShift = staff.positions && staff.positions.some(p => {
        return p.position === '夜間世話人';
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
              staffLocationMap[staffLocationKey] = {
                staff_id: staff.staff_id,
                staff_name: staff.staff_name,
                location: '-',
                positions: staff.positions || []
              };
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
            staffLocationMap[staffLocationKey] = {
              staff_id: staff.staff_id,
              staff_name: staff.staff_name,
              location: locationName,
              positions: staff.positions || []
            };
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

    // エラー判定：申告データ（修正前）を基に判定
    const errors = [];
    Object.entries(dayStartMap).forEach(([dateStr, dayData]) => {
      const staffLocations = {};
      Object.entries(dayData).forEach(([staffLocationKey, data]) => {
        const staffId = data.staff_id;
        const location = data.location;
        const nightShiftHours = data.nightShift || 0;
        if (nightShiftHours > 0 && location !== '-') {
          if (!staffLocations[staffId]) {
            staffLocations[staffId] = new Set();
          }
          staffLocations[staffId].add(location);
        }
      });

      Object.entries(staffLocations).forEach(([staffId, locationsSet]) => {
        const uniqueLocations = Array.from(locationsSet);
        if (uniqueLocations.length > 1) {
          const staffLocationKey = `${staffId}_${uniqueLocations[0]}`;
          const staffInfo = staffLocationMap[staffLocationKey];
          const isNightShift = staffInfo?.positions?.some(p => p.position === '夜間世話人');

          if (isNightShift) {
            const staffName = staffInfo?.staff_name || `スタッフ${staffId}`;
            errors.push({
              date: dateStr,
              staffName: staffName,
              locations: uniqueLocations,
              message: `${staffName}は${dateStr}に複数拠点での勤務があります`
            });
          }
        }
      });

      // ②同じ拠点で複数人の夜間世話人が勤務している場合のエラー判定
      const locationStaffs = {};
      Object.entries(dayData).forEach(([staffLocationKey, data]) => {
        const staffId = data.staff_id;
        const location = data.location;
        const nightShiftHours = data.nightShift || 0;
        if (nightShiftHours > 0 && location !== '-') {
          if (!locationStaffs[location]) {
            locationStaffs[location] = new Set();
          }
          locationStaffs[location].add(staffId);
        }
      });

      Object.entries(locationStaffs).forEach(([location, staffIds]) => {
        const uniqueStaffIds = Array.from(staffIds);
        if (uniqueStaffIds.length > 1) {
          const staffInfo = Array.from(staffIds).map(id => {
            const key = Object.keys(staffLocationMap).find(k => staffLocationMap[k].staff_id === parseInt(id) && staffLocationMap[k].location === location);
            return staffLocationMap[key]?.positions?.some(p => p.position === '夜間世話人') ? id : null;
          }).filter(Boolean);

          if (staffInfo.length > 1) {
            errors.push({
              date: dateStr,
              location: location,
              staffCount: uniqueStaffIds.length,
              message: `${location}は${dateStr}に${uniqueStaffIds.length}人が勤務しています（1人のみ）`
            });
          }
        }
      });
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
      staffMonthlySummary,
      errors: errors
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

                  <div className="selector-group" style={{ flex: 0 }}>
                    <button
                      onClick={handleCreateShift}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginTop: '24px'
                      }}
                    >
                      シフト作成
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* シフト表 */}
            {selectedFacility && shiftTable && (
              <>
              <div className="shift-table-section">
                <h3>【{selectedYear}年{selectedMonth}月 シフト表】</h3>

                {/* エラー表示 */}
                {shiftTable.errors && shiftTable.errors.length > 0 && (
                  <div style={{
                    backgroundColor: '#ffebee',
                    border: '2px solid #f44336',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px',
                    color: '#c62828'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#c62828' }}>⚠️ エラーを修正してください</h4>
                    <ul style={{ margin: '0', paddingLeft: '20px' }}>
                      {shiftTable.errors.map((error, idx) => (
                        <li key={idx} style={{ marginBottom: '5px' }}>
                          {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 日勤セクション */}
                <h4 style={{ marginTop: '30px', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>【ゆうみのいえ日勤】</h4>
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
                      {(() => {
                        // 日勤データがあるスタッフを取得（スタッフIDベースでユニーク）
                        const dayShiftStaffIds = Array.from(
                          new Set(
                            Object.entries(shiftTable.dayStartMap || {})
                              .flatMap(([date, dayData]) =>
                                Object.entries(dayData)
                                  .filter(([key, data]) => data.dayShift > 0)
                                  .map(([key]) => key.split('_')[0])
                              )
                          )
                        ).sort((a, b) => a - b);

                        return dayShiftStaffIds.map((staffId) => {
                          const numericStaffId = parseInt(staffId);
                          const staffLocationKey = Object.keys(shiftTable.staffLocationMap || {}).find(key => {
                            const mapStaff = shiftTable.staffLocationMap[key];
                            return mapStaff && mapStaff.staff_id === numericStaffId;
                          });
                          const staff = staffLocationKey ? shiftTable.staffLocationMap[staffLocationKey] : null;
                          if (!staff) return null;

                          return (
                            <tr key={staffLocationKey}>
                              <td style={{ fontWeight: '600' }}>{staff.staff_name}</td>
                              {Array.from({ length: shiftTable.daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const shiftDate = new Date(shiftTable.year, shiftTable.month - 1, day, 17, 0, 0);
                                const shiftDateStr = shiftDate.toISOString().split('T')[0];

                                let dayShiftTotal = 0;
                                Object.entries(shiftTable.dayStartMap[shiftDateStr] || {}).forEach(([key, data]) => {
                                  if (key.startsWith(`${staff.staff_id}_`)) {
                                    dayShiftTotal += data.dayShift;
                                  }
                                });

                                const editKey = `day_${staffLocationKey}_${shiftDateStr}`;
                                const displayValue = shiftEdits[editKey] !== undefined ? shiftEdits[editKey] : dayShiftTotal;
                                const isEditing = editingKey === editKey;

                                return (
                                  <td
                                    key={day}
                                    style={{ textAlign: 'center', color: displayValue > 0 ? '#333' : '#ccc', fontWeight: displayValue > 0 ? '600' : 'normal', padding: '10px 8px', cursor: 'pointer' }}
                                    onClick={() => setEditingKey(editKey)}
                                  >
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="8"
                                        value={displayValue}
                                        onChange={(e) => {
                                          let value = e.target.value;
                                          if (value === '') {
                                            const newEdits = { ...shiftEdits, [editKey]: '' };
                                            setShiftEdits(newEdits);
                                            return;
                                          }
                                          let numValue = parseFloat(value);
                                          if (isNaN(numValue)) {
                                            return;
                                          }
                                          if (numValue < 0) numValue = 0;
                                          if (numValue > 8) numValue = 8;
                                          value = numValue.toString();
                                          const newEdits = { ...shiftEdits, [editKey]: value };
                                          setShiftEdits(newEdits);
                                          const newErrors = recalculateErrors(shiftTable, newEdits);
                                          setShiftTable(prev => ({ ...prev, errors: newErrors }));
                                        }}
                                        onBlur={() => setEditingKey(null)}
                                        autoFocus
                                        onFocus={(e) => e.target.select()}
                                        style={{ width: '50px', textAlign: 'center', border: '1px solid #0066cc', padding: '4px', MozAppearance: 'textfield' }}
                                        onWheel={(e) => e.preventDefault()}
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
                                    const editKey = `day_${staffLocationKey}_${shiftDateStr}`;
                                    const value = shiftEdits[editKey] !== undefined ? parseFloat(shiftEdits[editKey]) || 0 : 0;

                                    let dayShiftData = 0;
                                    Object.entries(shiftTable.dayStartMap[shiftDateStr] || {}).forEach(([key, data]) => {
                                      if (key.startsWith(`${staff.staff_id}_`)) {
                                        dayShiftData += data.dayShift;
                                      }
                                    });

                                    sum += value > 0 ? value : dayShiftData;
                                  }
                                  return sum > 0 ? sum : '';
                                })()}
                              </td>
                            </tr>
                          );
                        });
                      })()}
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
                                      const isEditing = editingKey === editKey;

                                      return (
                                        <td
                                          key={day}
                                          style={{ textAlign: 'center', color: displayValue > 0 ? '#0066cc' : '#ccc', fontWeight: displayValue > 0 ? '600' : 'normal', padding: '2px', cursor: 'pointer' }}
                                          onClick={() => setEditingKey(editKey)}
                                        >
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              step="0.5"
                                              min="0"
                                              max="8"
                                              value={displayValue}
                                              onChange={(e) => {
                                                let value = e.target.value;
                                                if (value === '') {
                                                  const newEdits = { ...shiftEdits, [editKey]: '' };
                                                  setShiftEdits(newEdits);
                                                  return;
                                                }
                                                let numValue = parseFloat(value);
                                                if (isNaN(numValue)) {
                                                  return;
                                                }
                                                if (numValue < 0) numValue = 0;
                                                if (numValue > 8) numValue = 8;
                                                value = numValue.toString();
                                                const newEdits = { ...shiftEdits, [editKey]: value };
                                                setShiftEdits(newEdits);
                                                const newErrors = recalculateErrors(shiftTable, newEdits);
                                                setShiftTable(prev => ({ ...prev, errors: newErrors }));
                                              }}
                                              onBlur={() => setEditingKey(null)}
                                              autoFocus
                                              onFocus={(e) => e.target.select()}
                                              style={{ width: '40px', textAlign: 'center', border: '1px solid #0066cc', padding: '2px', MozAppearance: 'textfield' }}
                                              onWheel={(e) => e.preventDefault()}
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

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  onClick={handleSaveShift}
                  style={{
                    padding: '12px 30px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}
                >
                  シフト保存
                </button>
              </div>

              {shiftTable.staffLocationMap && Object.keys(shiftTable.staffLocationMap).length > 0 && (
                <div className="shift-table-section" style={{ marginTop: '30px' }}>
                  <h3>スタッフ一覧・職種別集計</h3>
                  <div className="shift-table-wrapper">
                    {(() => {
                      // スタッフデータを集計（shiftEdits を反映）
                      const staffSummary = {};

                      // staffLocationMap からスタッフ情報を初期化（重複なし）
                      const uniqueStaffs = {};
                      Object.entries(shiftTable.staffLocationMap || {}).forEach(([staffLocationKey, staffInfo]) => {
                        const staffId = String(staffInfo.staff_id);
                        if (!uniqueStaffs[staffId]) {
                          uniqueStaffs[staffId] = staffInfo;
                        }
                      });

                      // 各スタッフの初期化
                      Object.entries(uniqueStaffs).forEach(([staffId, staffInfo]) => {
                        staffSummary[staffId] = {
                          dayShift: 0,
                          nightShift: 0,
                          total: 0,
                          staffName: staffInfo.staff_name || '',
                          positions: staffInfo.positions || []
                        };
                      });

                      // 各スタッフの日勤・夜勤・合計を1日〜28日のループで計算
                      Object.entries(staffSummary).forEach(([staffId, summary]) => {
                        let dayShiftSum = 0;
                        let nightShiftSum = 0;

                        for (let day = 1; day <= 28; day++) {
                          const shiftDate = new Date(shiftTable.year, shiftTable.month - 1, day, 17, 0, 0);
                          const shiftDateStr = shiftDate.toISOString().split('T')[0];

                          // このスタッフの全ての location でのシフトを集計
                          const dayData = shiftTable.dayStartMap[shiftDateStr] || {};
                          let dayShiftValue = 0;
                          let nightShiftValue = 0;

                          Object.entries(dayData).forEach(([key, data]) => {
                            if (String(data.staff_id) === staffId) {
                              // editKey を確認（day）
                              const dayEditKey = `day_${key}_${shiftDateStr}`;
                              const editedDay = shiftEdits[dayEditKey];
                              dayShiftValue += editedDay !== undefined ? parseFloat(editedDay) || 0 : (data.dayShift || 0);

                              // editKey を確認（night）
                              const nightEditKey = `night_${key}_${shiftDateStr}`;
                              const editedNight = shiftEdits[nightEditKey];
                              nightShiftValue += editedNight !== undefined ? parseFloat(editedNight) || 0 : (data.nightShift || 0);
                            }
                          });

                          dayShiftSum += dayShiftValue;
                          nightShiftSum += nightShiftValue;
                        }

                        staffSummary[staffId].dayShift = dayShiftSum;
                        staffSummary[staffId].nightShift = nightShiftSum;
                        staffSummary[staffId].total = dayShiftSum + nightShiftSum;
                      });

                      // 職種ごとにグループ化（職種に対応する時間のみ表示）
                      const staffsByPosition = {};
                      Object.entries(staffSummary).forEach(([staffId, summary]) => {
                        const positions = Array.isArray(summary.positions) ? summary.positions : [];
                        if (positions.length === 0) {
                          const positionName = '未設定';
                          if (!staffsByPosition[positionName]) {
                            staffsByPosition[positionName] = [];
                          }
                          staffsByPosition[positionName].push({ staffId, ...summary });
                        } else {
                          positions.forEach(pos => {
                            const positionName = pos.position || '未設定';
                            if (!staffsByPosition[positionName]) {
                              staffsByPosition[positionName] = [];
                            }
                            if (!staffsByPosition[positionName].find(s => s.staffId === staffId)) {
                              const displayData = { staffId, ...summary };
                              // 職種に対応する時間のみを表示
                              if (positionName === '世話人') {
                                displayData.nightShift = 0;
                              } else if (positionName === '夜間世話人') {
                                displayData.dayShift = 0;
                              }
                              displayData.total = displayData.dayShift + displayData.nightShift;
                              staffsByPosition[positionName].push(displayData);
                            }
                          });
                        }
                      });

                      const positionSections = Object.entries(staffsByPosition).map(([positionName, staffList]) => {
                        // 職種ごとの小計を計算
                        const positionTotals = {
                          dayShift: 0,
                          nightShift: 0,
                          total: 0
                        };
                        staffList.forEach(staff => {
                          positionTotals.dayShift += staff.dayShift;
                          positionTotals.nightShift += staff.nightShift;
                          positionTotals.total += staff.total;
                        });

                        const posTotalDay = Math.round(positionTotals.dayShift * 10) / 10;
                        const posTotalNight = Math.round(positionTotals.nightShift * 10) / 10;
                        const posTotalAll = Math.round(positionTotals.total * 10) / 10;
                        const posKinteiShokuin = Math.round((positionTotals.total / 160) * 10) / 10;

                        return (
                          <div key={positionName} style={{ marginBottom: '30px' }}>
                            <h5 style={{ backgroundColor: '#e8f4f8', padding: '8px 12px', marginBottom: '0', fontSize: '14px', fontWeight: '600', borderLeft: '3px solid #0099cc' }}>
                              {positionName}
                            </h5>
                            <table className="shift-table" style={{ marginTop: '0', borderTop: 'none' }}>
                              <thead>
                                <tr>
                                  <th>スタッフ名</th>
                                  <th>日勤</th>
                                  <th>夜勤</th>
                                  <th>合計</th>
                                  <th>常勤換算数</th>
                                </tr>
                              </thead>
                              <tbody>
                                {staffList.map(staff => {
                                  const dayShift = Math.round(staff.dayShift * 10) / 10;
                                  const nightShift = Math.round(staff.nightShift * 10) / 10;
                                  const total = Math.round(staff.total * 10) / 10;
                                  const kinteiShokuin = Math.round((staff.total / 160) * 10) / 10;
                                  const isOver160 = total > 160;

                                  return (
                                    <tr key={staff.staffId} style={{ backgroundColor: isOver160 ? '#ffcccc' : 'inherit' }}>
                                      <td style={{ fontWeight: '600', color: isOver160 ? '#cc0000' : 'inherit' }}>{staff.staffName} {isOver160 && '⚠'}</td>
                                      <td style={{ textAlign: 'right', padding: '5px' }}>{dayShift}時間</td>
                                      <td style={{ textAlign: 'right', padding: '5px' }}>{nightShift}時間</td>
                                      <td style={{ textAlign: 'right', padding: '5px', fontWeight: isOver160 ? 'bold' : 'normal', color: isOver160 ? '#cc0000' : 'inherit' }}>{total}時間</td>
                                      <td style={{ textAlign: 'center', padding: '5px', fontWeight: '600' }}>{kinteiShokuin}人</td>
                                    </tr>
                                  );
                                })}
                                <tr style={{ backgroundColor: '#f9f9f9', fontWeight: '600' }}>
                                  <td>小計</td>
                                  <td style={{ textAlign: 'right', padding: '5px' }}>{posTotalDay}時間</td>
                                  <td style={{ textAlign: 'right', padding: '5px' }}>{posTotalNight}時間</td>
                                  <td style={{ textAlign: 'right', padding: '5px' }}>{posTotalAll}時間</td>
                                  <td style={{ textAlign: 'center', padding: '5px' }}>{posKinteiShokuin}人</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      });

                      return (
                        <>
                          {/* 職種別セクション */}
                          <div>
                            <h3 style={{ marginTop: '30px', marginBottom: '20px', fontSize: '18px', fontWeight: 'bold', borderBottom: '2px solid #0099cc', paddingBottom: '10px' }}>
                              【職種別集計】
                            </h3>
                            {positionSections}
                          </div>

                          {/* スタッフ一覧セクション */}
                          <div style={{ marginTop: '40px' }}>
                            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold', borderBottom: '2px solid #009900', paddingBottom: '10px' }}>
                              【スタッフ一覧】
                            </h3>
                            <table className="shift-table">
                              <thead>
                                <tr>
                                  <th>スタッフ名</th>
                                  <th>日勤</th>
                                  <th>夜勤</th>
                                  <th>合計</th>
                                  <th>常勤換算数</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(staffSummary).map(([staffId, staff]) => {
                                  const dayShift = Math.round(staff.dayShift * 10) / 10;
                                  const nightShift = Math.round(staff.nightShift * 10) / 10;
                                  const total = Math.round(staff.total * 10) / 10;
                                  const kinteiShokuin = Math.round((staff.total / 160) * 10) / 10;
                                  const isOver160 = total > 160;

                                  return (
                                    <tr key={staffId} style={{ backgroundColor: isOver160 ? '#ffcccc' : 'inherit' }}>
                                      <td style={{ fontWeight: '600', color: isOver160 ? '#cc0000' : 'inherit' }}>{staff.staffName} {isOver160 && '⚠'}</td>
                                      <td style={{ textAlign: 'right', padding: '5px' }}>{dayShift}時間</td>
                                      <td style={{ textAlign: 'right', padding: '5px' }}>{nightShift}時間</td>
                                      <td style={{ textAlign: 'right', padding: '5px', fontWeight: isOver160 ? 'bold' : 'normal', color: isOver160 ? '#cc0000' : 'inherit' }}>{total}時間</td>
                                      <td style={{ textAlign: 'center', padding: '5px', fontWeight: '600' }}>{kinteiShokuin}人</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
              </>
            )}
          </>
        )}

        {/* 確認ダイアログ */}
        {showConfirmDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
              minWidth: '300px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>シフトを保存しますか？</h3>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={confirmSaveShift}
                  style={{
                    padding: '10px 30px',
                    backgroundColor: '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  はい
                </button>
                <button
                  onClick={cancelSaveShift}
                  style={{
                    padding: '10px 30px',
                    backgroundColor: '#ccc',
                    color: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  いいえ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
