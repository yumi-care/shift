import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { MdAssignment, MdArrowForward, MdArrowBack } from 'react-icons/md';
import Header from '../../components/Header';
import './Phase3.css';

const API_BASE_URL = '/api';

export default function Phase3() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ========== 状態管理 ==========
  const [corporations, setCorporations] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // 管理側モード
  const [adminSelectedCorp, setAdminSelectedCorp] = useState('');
  const [adminSelectedFacility, setAdminSelectedFacility] = useState('');
  const [adminSelectedYear, setAdminSelectedYear] = useState(new Date().getFullYear().toString());
  const [adminSelectedMonth, setAdminSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [generatedLink, setGeneratedLink] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);

  // スタッフモード
  const [selectedCorp, setSelectedCorp] = useState('');
  const [selectedFacility, setSelectedFacility] = useState('');
  const [corpName, setCorpName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [registeredStaffs, setRegisteredStaffs] = useState([]);
  const [targetYear, setTargetYear] = useState(null);
  const [targetMonth, setTargetMonth] = useState(null);
  const [confirmedDeadline, setConfirmedDeadline] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState({}); // { 'YYYY-MM-DD': { location_id, location_name } }

  const [showConfirm, setShowConfirm] = useState(false);
  const [submittedShifts, setSubmittedShifts] = useState({});
  const [submissionComplete, setSubmissionComplete] = useState(false);

  // 勤務曜日の有無で申告フローを分岐
  const [isFixedStaff, setIsFixedStaff] = useState(false); // 勤務曜日がある = 固定勤務
  const [autoSubmittedDates, setAutoSubmittedDates] = useState([]); // 自動申告済みの日付

  const isStaffMode = searchParams.get('corp_id') && searchParams.get('facility_id');

  // 管理者モードはログイン必須
  useEffect(() => {
    if (!isStaffMode) {
      const isLoggedIn = localStorage.getItem('is_logged_in');
      if (!isLoggedIn) {
        navigate('/login', { replace: true });
      }
    }
  }, [isStaffMode, navigate]);

  // ========== 初期化 ==========
  useEffect(() => {
    fetchCorporations();
  }, []);

  // ========== URL パラメータ処理（スタッフモード） ==========
  useEffect(() => {
    const corpId = searchParams.get('corp_id');
    const facilityId = searchParams.get('facility_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // 年月を設定
    if (year && month) {
      setTargetYear(parseInt(year));
      setTargetMonth(parseInt(month));
      setCurrentMonth(new Date(parseInt(year), parseInt(month) - 1));
    }

    if (corpId && facilityId) {
      // Phase 2 から登録済みスタッフを取得
      fetchStaffs(facilityId);

      // 拠点情報を取得
      fetchLocations(facilityId);

      // スタッフモード：設定
      setSelectedFacility(facilityId);

      // corporationsが読み込まれたら法人名と事業所名を設定
      if (corporations.length > 0) {
        const corp = corporations.find(c => c.corp_id === parseInt(corpId));
        if (corp) {
          setSelectedCorp(corpId);
          setCorpName(corp.corp_name);
        }
      }

      // facilitiesが読み込まれたら事業所名を設定
      if (facilities.length > 0) {
        const facility = facilities.find(f => f.facility_id === parseInt(facilityId));
        if (facility) {
          setFacilityName(facility.facility_name);
        }
      }
    }
  }, [searchParams, corporations, facilities]);

  // ========== API 呼び出し ==========
  const fetchCorporations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/phase1/corporations/`);
      setCorporations(response.data);

      const corpId = searchParams.get('corp_id');
      if (corpId) {
        const corp = response.data.find(c => c.corp_id === parseInt(corpId));
        if (corp) {
          await fetchFacilities(corpId);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('法人取得エラー:', error);
      setLoading(false);
    }
  };

  const fetchFacilities = async (corpId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/phase1/corporations/${corpId}/facilities/`);
      setFacilities(response.data);
    } catch (error) {
      console.error('事業所取得エラー:', error);
    }
  };

  const fetchLocations = async (facilityId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/phase1/facilities/${facilityId}/locations/`);
      setLocations(response.data);
    } catch (error) {
      console.error('拠点取得エラー:', error);
    }
  };

  const fetchStaffs = async (facilityId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/phase2/facilities/${facilityId}/staffs`);
      setRegisteredStaffs(response.data);
    } catch (error) {
      console.error('スタッフ取得エラー:', error);
      setRegisteredStaffs([]);
    }
  };

  // ========== 管理側：リンク生成 ==========
  const handleAdminCorpChange = async (corpId) => {
    setAdminSelectedCorp(corpId);
    setAdminSelectedFacility('');
    if (corpId) {
      await fetchFacilities(corpId);
    }
  };

  const handleAdminFacilityChange = (facilityId) => {
    setAdminSelectedFacility(facilityId);
  };

  const generateLink = () => {
    if (!adminSelectedCorp || !adminSelectedFacility) {
      alert('法人と事業所を選択してください');
      return;
    }

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/phase3?corp_id=${adminSelectedCorp}&facility_id=${adminSelectedFacility}&year=${adminSelectedYear}&month=${adminSelectedMonth}`;
    setGeneratedLink(link);
    setShowLinkModal(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('リンクをコピーしました');
  };

  // ========== スタッフ側：カレンダー ==========
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDateClick = (day) => {
    const dateStr = formatDate(currentMonth.getFullYear(), currentMonth.getMonth(), day);

    // スタッフモード：指定月のみ選択可能
    if (isStaffMode && (currentMonth.getFullYear() !== targetYear || currentMonth.getMonth() + 1 !== targetMonth)) {
      alert(`指定月（${targetYear}年${targetMonth}月）のみ選択できます`);
      return;
    }

    if (submittedShifts[selectedStaffId]?.[dateStr]) {
      return;
    }

    setSelectedDates({
      ...selectedDates,
      [dateStr]: selectedDates[dateStr] || { location_id: '', location_name: '' }
    });
  };

  const handleDateRemove = (dateStr) => {
    const newDates = { ...selectedDates };
    delete newDates[dateStr];
    setSelectedDates(newDates);
  };

  const handleLocationChange = (dateStr, locationId) => {
    const locationData = locations.find(l => l.location_id === parseInt(locationId));
    setSelectedDates({
      ...selectedDates,
      [dateStr]: {
        location_id: locationId,
        location_name: locationData?.location_name || ''
      }
    });
  };

  // スタッフ選択ハンドラ
  const handleStaffSelect = (staffId) => {
    const staff = registeredStaffs.find(s => s.staff_id === parseInt(staffId));
    if (staff) {
      setSelectedStaffId(staffId);
      setSelectedStaffName(staff.staff_name);

      // 勤務曜日の有無で申告フロー分岐
      const hasWorkDays = staff.work_days && staff.work_days.length > 0;
      setIsFixedStaff(hasWorkDays);

      if (hasWorkDays) {
        // 固定勤務：申告対象月の該当曜日を自動申告済みにする
        const autoSubmittedDatesList = generateAutoSubmittedDates(
          staff.work_days,
          targetYear,
          targetMonth
        );
        setAutoSubmittedDates(autoSubmittedDatesList);

        // 自動申告を登録
        registerAutoSubmission(staffId, autoSubmittedDatesList, staff.staff_name);

        // UIリセット
        setSelectedDates({});
      } else {
        // シフト申告制：リセット
        setAutoSubmittedDates([]);
        setSelectedDates({});
      }
    }
  };

  // 勤務曜日から該当月の申告日付を生成
  const generateAutoSubmittedDates = (workDays, year, month) => {
    if (!year || !month || !workDays) return [];

    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      // 曜日を日本語に変換
      const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
      const dayLabel = dayLabels[dayOfWeek];

      if (workDays.includes(dayLabel)) {
        dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    }

    return dates;
  };

  // 自動申告を登録
  const registerAutoSubmission = async (staffId, autoDatesList, staffName) => {
    if (autoDatesList.length === 0) return;

    try {
      // API で自動申告
      await axios.post(`${API_BASE_URL}/phase3/shift-submissions/auto`, {
        staff_id: parseInt(staffId),
        facility_id: parseInt(selectedFacility),
        year: targetYear,
        month: targetMonth
      });
    } catch (error) {
      console.error('自動申告エラー:', error);
      alert('申告に失敗しました');
    }
  };

  const isSubmitted = (dateStr) => {
    return submittedShifts[selectedStaffId]?.[dateStr] !== undefined;
  };

  const canSubmit = () => {
    if (!selectedStaffId) return false;

    // 固定勤務：自動申告済み
    if (isFixedStaff) {
      return true;
    }

    // シフト申告制：日付選択必須
    if (Object.keys(selectedDates).length === 0) return false;

    // 全日付に拠点が選択されているか確認
    return Object.values(selectedDates).every(item => item.location_id !== '');
  };

  const handleShowConfirm = () => {
    if (!canSubmit()) {
      alert('全ての日付に拠点を選択してください');
      return;
    }

    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    try {
      // API に手動申告を送信
      const submissions = Object.entries(selectedDates).map(([dateStr, locData]) => ({
        date: dateStr,
        location_id: parseInt(locData.location_id)
      }));

      await axios.post(`${API_BASE_URL}/phase3/shift-submissions/manual`, {
        staff_id: parseInt(selectedStaffId),
        facility_id: parseInt(selectedFacility),
        submissions: submissions
      });

      setShowConfirm(false);
      setSubmissionComplete(true);
    } catch (error) {
      console.error('申告送信エラー:', error);
      alert('申告送信に失敗しました。拠点を選択してください。');
    }
  };

  if (loading) {
    return (
      <div className="phase3-container">
        <Header />
        <main className="phase3-main">
          <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
        </main>
      </div>
    );
  }

  const calendarDays = [];
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // ========== 管理側モード（リンク生成） ==========
  if (!isStaffMode) {
    return (
      <div className="phase3-container">
        <Header />
        <div className="phase3-subtitle">
          <p>Phase 3：シフト申告リンク生成</p>
        </div>

        <div className="phase3-main">
          {/* 管理者向け注意喚起 */}
          <div style={{
            background: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#004085' }}>
              リンク生成に関する注意事項
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#004085', lineHeight: '1.8' }}>
              <li>
                <strong>申告期限は毎月20日です。</strong>
                スタッフが申告できるのは、シフト作成月の前月20日までになります。
              </li>
              <li>
                <strong>月末までにリンクを発行してください。</strong>
                例）2026年6月分のシフト申告リンクは、2026年4月30日までに配布してください。スタッフの提出は5月20日までになります。
              </li>
              <li>
                1つのリンクは特定の月の申告専用です。翌月の申告には新しいリンクが必要です。
              </li>
            </ul>
          </div>

          {/* リンク生成モーダル */}
          {showLinkModal && (
            <div className="link-modal-overlay">
              <div className="link-modal">
                <h3>スタッフ向けシフト申告リンク</h3>
                <p className="link-description">
                  以下のリンクをコピーして、スタッフにメールなどで配布してください。
                </p>
                <div className="link-display">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="link-input"
                  />
                  <button className="btn-copy" onClick={copyToClipboard}>
                    コピー
                  </button>
                </div>
                <button className="btn-close" onClick={() => setShowLinkModal(false)}>
                  閉じる
                </button>
              </div>
            </div>
          )}

          {/* リンク生成フォーム */}
          <div className="input-section">
            <h3>スタッフ向けシフト申告リンクを生成</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="admin-corp-select">法人</label>
                <select
                  id="admin-corp-select"
                  value={adminSelectedCorp}
                  onChange={(e) => handleAdminCorpChange(e.target.value)}
                  className="form-input"
                >
                  <option value="">--- 選択してください ---</option>
                  {corporations.map((corp) => (
                    <option key={corp.corp_id} value={corp.corp_id}>
                      {corp.corp_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {adminSelectedCorp && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="admin-facility-select">事業所</label>
                  <select
                    id="admin-facility-select"
                    value={adminSelectedFacility}
                    onChange={(e) => handleAdminFacilityChange(e.target.value)}
                    className="form-input"
                  >
                    <option value="">--- 選択してください ---</option>
                    {facilities.map((facility) => (
                      <option key={facility.facility_id} value={facility.facility_id}>
                        {facility.facility_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {adminSelectedFacility && (
              <>
                <div className="form-row">
                  <h4>申告年月</h4>
                </div>
                <div className="form-row">
                  <div style={{ display: 'flex', gap: '15px', maxWidth: '350px' }}>
                    <div className="form-group" style={{ minWidth: '150px' }}>
                      <label htmlFor="admin-year-select">年</label>
                      <select
                        id="admin-year-select"
                        value={adminSelectedYear}
                        onChange={(e) => setAdminSelectedYear(e.target.value)}
                        className="form-input"
                      >
                        {[2024, 2025, 2026, 2027, 2028].map((year) => (
                          <option key={year} value={year.toString()}>
                            {year}年
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ minWidth: '120px' }}>
                      <label htmlFor="admin-month-select">月</label>
                      <select
                        id="admin-month-select"
                        value={adminSelectedMonth}
                        onChange={(e) => setAdminSelectedMonth(e.target.value)}
                        className="form-input"
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
                </div>

                <div className="form-row">
                  <button className="btn-generate" onClick={generateLink}>
                    <MdAssignment style={{ marginRight: '8px' }} />
                    リンク生成
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== スタッフモード（シフト申告） ==========
  return (
    <div className="phase3-container">
      <Header />
      <div className="phase3-subtitle">
        <p>Phase 3：シフト申告</p>
      </div>

      <div className="phase3-main">
        {/* 確認モーダル */}
        {showConfirm && (
          <div className="confirm-modal-overlay">
            <div className="confirm-modal">
              <h3>シフト申告確認</h3>
              <div className="confirm-content">
                <div className="confirm-item">
                  <label>スタッフ名</label>
                  <p>{selectedStaffName}</p>
                </div>
                <div className="confirm-item">
                  <label>申告日付と拠点</label>
                  <div className="dates-list">
                    {Object.entries(selectedDates)
                      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                      .map(([dateStr, locData]) => (
                        <div key={dateStr} className="date-entry">
                          <span>{dateStr}</span>
                          <span className="location-badge">{locData.location_name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              <div className="confirm-message">
                <p>上記内容でよろしければ、「送信」ボタンをクリックしてください。</p>
                <p style={{ color: '#ff6b6b', fontSize: '0.9em', marginTop: '10px' }}>
                  ※ スクリーンショットを撮ることをお勧めします。
                </p>
              </div>
              <div className="confirm-buttons">
                <button className="btn-cancel" onClick={() => setShowConfirm(false)}>
                  キャンセル
                </button>
                <button className="btn-submit" onClick={handleSubmit}>
                  送信
                </button>
              </div>
            </div>
          </div>
        )}

        {/* シフト申告フォーム */}
        <div className="input-section">
          {/* 法人・事業所表示 */}
          {selectedCorp && selectedFacility && (
            <div className="header-info">
              <div className="info-item">
                <span className="label">法人：</span>
                <span className="value">{corpName}</span>
              </div>
              <div className="info-item">
                <span className="label">事業所：</span>
                <span className="value">{facilityName}</span>
              </div>
            </div>
          )}

          {selectedFacility && (
            <>
              {submissionComplete ? (
                <div className="completion-section">
                  <div className="completion-card">
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                      <div style={{
                        fontSize: '3em',
                        color: '#28a745',
                        marginBottom: '15px'
                      }}>
                        ✓
                      </div>
                      <h2 style={{ color: '#28a745', margin: '0 0 10px 0' }}>
                        申告完了
                      </h2>
                      <p style={{ color: '#666', margin: 0, fontSize: '1.05em' }}>
                        シフト申告が正常に送信されました
                      </p>
                    </div>

                    <div style={{
                      background: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}>
                      <h4 style={{ color: '#333', margin: '0 0 15px 0' }}>
                        送信内容
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <span style={{ color: '#666', fontSize: '0.9em' }}>スタッフ名：</span>
                          <strong>{selectedStaffName}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#666', fontSize: '0.9em' }}>申告月：</span>
                          <strong>{targetYear}年{targetMonth}月</strong>
                        </div>
                        <div>
                          <span style={{ color: '#666', fontSize: '0.9em' }}>申告日付数：</span>
                          <strong>{Object.keys(submittedShifts[selectedStaffId] || {}).length}日</strong>
                        </div>
                      </div>
                    </div>

                    <p style={{
                      background: '#e7f3ff',
                      padding: '15px',
                      borderRadius: '8px',
                      color: '#004085',
                      lineHeight: '1.6',
                      margin: 0
                    }}>
                      スクリーンショットやメール確認等で、この内容を記録することをお勧めします。
                    </p>
                  </div>
                </div>
              ) : !confirmedDeadline ? (
                <div className="form-row" style={{
                  background: '#fff3cd',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #ffc107',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#856404' }}>
                    シフト申告の期限について
                  </h4>
                  <p style={{ margin: '0 0 15px 0', color: '#856404', lineHeight: '1.6' }}>
                    毎月の申告期限は<strong>20日</strong>です。<br />
                    申告対象月の20日までに、下記の項目を選択して送信してください。<br />
                    21日以降の申告は受け付けられません。
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="deadline-confirm"
                      checked={confirmedDeadline}
                      onChange={(e) => setConfirmedDeadline(e.target.checked)}
                    />
                    <label htmlFor="deadline-confirm" style={{ margin: 0, cursor: 'pointer' }}>
                      上記の内容を確認しました
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="staff-select">スタッフ名</label>
                      {registeredStaffs.length > 0 ? (
                        <select
                          id="staff-select"
                          value={selectedStaffId}
                          onChange={(e) => handleStaffSelect(e.target.value)}
                          className="form-input"
                        >
                          <option value="">--- スタッフを選択してください ---</option>
                          {registeredStaffs.map(staff => (
                            <option key={staff.staff_id} value={staff.staff_id}>
                              {staff.staff_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p style={{ color: '#999', padding: '10px', margin: 0 }}>
                          このシステムにはスタッフが登録されていません。<br />
                          管理者に依頼して、まずスタッフを登録してください。
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedStaffId && (
                    <>
                      {isFixedStaff ? (
                        // 固定勤務：自動申告済み
                        <div className="form-row" style={{
                          background: '#e8f5e9',
                          padding: '20px',
                          borderRadius: '8px',
                          border: '2px solid #4caf50',
                          marginBottom: '20px'
                        }}>
                          <h4 style={{ color: '#2e7d32', margin: '0 0 15px 0' }}>
                            ✓ 申告完了
                          </h4>
                          <p style={{ color: '#2e7d32', margin: '0 0 10px 0' }}>
                            このスタッフは固定勤務のため、勤務曜日({autoSubmittedDates.length}日)が自動申告されました。
                          </p>
                          <div style={{ fontSize: '0.9em', color: '#558b2f', background: 'white', padding: '10px', borderRadius: '4px' }}>
                            <strong>申告済み日付:</strong> {autoSubmittedDates.length}日
                          </div>
                        </div>
                      ) : (
                        // シフト申告制：日付選択
                        <div>
                          <div className="form-row">
                            <h4>シフト申告日付を選択（カレンダー）</h4>
                          </div>

                          {/* カレンダー */}
                          <div className="calendar-section">
                    <div className="calendar-header">
                      {!isStaffMode && (
                        <button
                          className="calendar-nav"
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        >
                          <MdArrowBack />
                        </button>
                      )}
                      <span className="calendar-title">
                        {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                      </span>
                      {!isStaffMode && (
                        <button
                          className="calendar-nav"
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        >
                          <MdArrowForward />
                        </button>
                      )}
                    </div>

                    <div className="calendar-weekdays">
                      {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                        <div key={day} className="weekday">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="calendar-days">
                      {calendarDays.map((day, idx) => {
                        const dateStr = day
                          ? formatDate(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                          : null;
                        const isSelected = dateStr && selectedDates[dateStr] !== undefined;
                        const isSubmittedDate = dateStr && isSubmitted(dateStr);

                        return (
                          <div
                            key={idx}
                            className={`calendar-day ${day ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isSubmittedDate ? 'submitted' : ''}`}
                            onClick={() => day && !isSubmittedDate && handleDateClick(day)}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 選択日付の拠点設定 */}
                  {Object.keys(selectedDates).length > 0 && (
                    <div className="selected-dates-section">
                      <h4>選択日付と拠点</h4>
                      <div className="dates-selection">
                        {Object.entries(selectedDates)
                          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                          .map(([dateStr, locData]) => (
                            <div key={dateStr} className="date-location-card">
                              <div className="date-header">
                                <span className="date-badge">{dateStr}</span>
                                <button
                                  className="btn-remove-small"
                                  onClick={() => handleDateRemove(dateStr)}
                                  title="この日付を削除"
                                >
                                  ✕
                                </button>
                              </div>
                              <select
                                value={locData.location_id}
                                onChange={(e) => handleLocationChange(dateStr, e.target.value)}
                                className="form-input location-select"
                              >
                                <option value="">--- 拠点を選択 ---</option>
                                {(locations.length > 0 ? locations : [{ location_id: 1, location_name: facilityName }]).map((location) => (
                                  <option key={location.location_id} value={location.location_id}>
                                    {location.location_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                          <div className="form-row">
                            <button
                              className="btn-confirm"
                              onClick={handleShowConfirm}
                              disabled={!canSubmit()}
                            >
                              確認画面へ
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* 提出済みシフトはダッシュボードで表示するため、ここには表示しない */}
      </div>
    </div>
  );
}
