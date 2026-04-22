import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MdArrowForward, MdClose } from 'react-icons/md';
import Header from '../../components/Header';
import './Dashboard.css';

const API_BASE_URL = 'http://localhost:8000/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [corporations, setCorporations] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCorp, setSelectedCorp] = useState('');
  const [selectedFacility, setSelectedFacility] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [shiftData, setShiftData] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [locations, setLocations] = useState([]);
  const [editingDate, setEditingDate] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editingNewDate, setEditingNewDate] = useState(null);

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

  // 法人が選択されたら、その法人の事業所を取得
  useEffect(() => {
    if (selectedCorp) {
      const fetchFacilities = async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/phase1/corporations/${selectedCorp}/facilities/`
          );
          setFacilities(response.data);
          setSelectedFacility('');
          setShiftData(null);
        } catch (error) {
          console.error('事業所取得エラー:', error);
        }
      };

      fetchFacilities();
    }
  }, [selectedCorp]);

  // 事業所が選択されたら、月選択をリセット
  useEffect(() => {
    if (selectedFacility) {
      setSelectedYear(new Date().getFullYear().toString());
      setSelectedMonth((new Date().getMonth() + 1).toString().padStart(2, '0'));
      setShiftData(null);
    }
  }, [selectedFacility]);

  // 対象月が選択されたら、Dashboard API からスタッフと申告状況を取得
  useEffect(() => {
    if (selectedFacility && selectedYear && selectedMonth) {
      const fetchDashboardData = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/dashboard/summary`, {
            params: {
              facility_id: selectedFacility,
              year: selectedYear,
              month: selectedMonth
            }
          });
          setShiftData({ staffs: response.data.staffs });
        } catch (error) {
          console.error('ダッシュボードデータ取得エラー:', error);
          setShiftData({ staffs: [] });
        }
      };

      fetchDashboardData();
    }
  }, [selectedFacility, selectedYear, selectedMonth]);

  // 詳細モーダルが開いたら、拠点情報を取得
  useEffect(() => {
    if (showDetails && selectedFacility) {
      const fetchLocations = async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/phase1/facilities/${selectedFacility}/locations/`
          );
          setLocations(response.data);
        } catch (error) {
          console.error('拠点取得エラー:', error);
          setLocations([]);
        }
      };
      fetchLocations();
    }
  }, [showDetails, selectedFacility]);


  // localStorage を更新した後、ダッシュボードデータを再取得
  const refetchDashboardData = async () => {
    if (selectedFacility && selectedYear && selectedMonth) {
      try {
        const response = await axios.get(`${API_BASE_URL}/dashboard/summary`, {
          params: {
            facility_id: selectedFacility,
            year: selectedYear,
            month: selectedMonth
          }
        });
        setShiftData({ staffs: response.data.staffs });

        // モーダルが開いていれば、該当スタッフの新しいデータで更新
        if (showDetails) {
          const updatedStaff = response.data.staffs.find(s => s.staff_id === showDetails.staff_id);
          if (updatedStaff) {
            setShowDetails(updatedStaff);
          }
        }
      } catch (error) {
        console.error('ダッシュボードデータ再取得エラー:', error);
      }
    }
  };

  // 申告データを削除
  const handleDeleteSubmission = (dateToDelete) => {
    const submittedKey = `shift_submissions_${selectedFacility}`;
    const currentSubmitted = JSON.parse(localStorage.getItem(submittedKey) || '{}');
    const staffId = String(showDetails.staff_id);

    if (currentSubmitted[staffId] && currentSubmitted[staffId][dateToDelete]) {
      delete currentSubmitted[staffId][dateToDelete];
      localStorage.setItem(submittedKey, JSON.stringify(currentSubmitted));
      refetchDashboardData();
    }
  };

  // 申告データの日付と拠点を更新
  const handleUpdateDateAndLocation = (oldDate, newDate, newLocationName) => {
    const submittedKey = `shift_submissions_${selectedFacility}`;
    const currentSubmitted = JSON.parse(localStorage.getItem(submittedKey) || '{}');
    const staffId = String(showDetails.staff_id);

    if (currentSubmitted[staffId] && currentSubmitted[staffId][oldDate]) {
      const oldData = { ...currentSubmitted[staffId][oldDate] };
      delete currentSubmitted[staffId][oldDate];
      currentSubmitted[staffId][newDate] = {
        ...oldData,
        date: newDate,
        location_name: newLocationName
      };
      localStorage.setItem(submittedKey, JSON.stringify(currentSubmitted));

      setEditingDate(null);
      setEditingNewDate(null);
      setEditingLocation(null);
      refetchDashboardData();
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Header />
        <main className="dashboard-main">
          <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
        </main>
      </div>
    );
  }

  const hasData = corporations.length > 0;

  return (
    <div className="dashboard-container">
      <Header />

      <main className="dashboard-main">
        {!hasData ? (
          <div className="setup-required">
            <div className="setup-card">
              <h2>初期設定が必要です</h2>
              <p>ハンバーガーメニューから「法人・事業所・拠点」を登録してください。</p>
            </div>
          </div>
        ) : (
          <>
            <div className="dashboard-welcome">
              <h2>ダッシュボード</h2>
            </div>

            {/* セレクタ */}
            <div className="selector-container">
              {/* 第1行：法人・事業所 */}
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

              {/* 第2行：年・月 */}
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


            {/* 申告詳細モーダル */}
            {showDetails && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '30px',
                  maxWidth: '500px',
                  width: '90%',
                  maxHeight: '80vh',
                  overflow: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>申告詳細：{showDetails.staff_name}</h3>
                    <button
                      onClick={() => setShowDetails(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#999'
                      }}
                    >
                      <MdClose />
                    </button>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>申告日付と拠点</strong>
                    </div>
                    {showDetails.submission_details && showDetails.submission_details.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {showDetails.submission_details.sort((a, b) => a.date.localeCompare(b.date)).map((detail) => (
                          <div
                            key={detail.date}
                            style={{
                              padding: '12px',
                              backgroundColor: '#f5f5f5',
                              borderLeft: '4px solid #007bff',
                              borderRadius: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>{detail.date}</div>
                              <div style={{ color: '#666', fontSize: '0.9em' }}>拠点: {detail.location_name || '-'}</div>
                            </div>
                            <button
                              onClick={() => handleDeleteSubmission(detail.date)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.8em',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              削除
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#999' }}>申告データがありません</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 申告済みスタッフ一覧 */}
            {selectedFacility && shiftData && (
              <div className="shift-preview-section">
                <h3>申告済みスタッフ一覧</h3>
                {shiftData.staffs && shiftData.staffs.length > 0 ? (
                  <div className="shift-table-wrapper">
                    <table className="shift-table">
                      <thead>
                        <tr>
                          <th>事業所名</th>
                          <th>拠点</th>
                          <th>スタッフ名</th>
                          <th>職種</th>
                          <th>勤務曜日</th>
                          <th>勤務時間</th>
                          <th>申告状況</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftData.staffs.map((staff) => {
                          const positions = Array.isArray(staff.positions) ? staff.positions : [];
                          const positionNames = positions.map(p => p.position || p).join('、') || '-';
                          const positionHours = positions.length > 0 ? (
                            positions.map((p, idx) => (
                              <div key={idx} style={{ fontSize: '0.9em' }}>
                                {(p.position || p)}: {(p.work_hours_start || p.start) && (p.work_hours_end || p.end) ? `${p.work_hours_start || p.start}～${p.work_hours_end || p.end}` : '-'}
                              </div>
                            ))
                          ) : '-';

                          return (
                            <tr key={staff.staff_id || staff.staff_name}>
                              <td>{staff.facility_name || '-'}</td>
                              <td>{staff.location || '-'}</td>
                              <td>{staff.staff_name}</td>
                              <td>{positionNames}</td>
                              <td>{staff.work_days || '-'}</td>
                              <td>{positionHours}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {staff.submission_count > 0 ? (
                                    <span style={{ color: '#28a745', fontWeight: '600' }}>
                                      申告済み ({staff.submission_count}日)
                                    </span>
                                  ) : (
                                    <span style={{ color: '#999' }}>申告なし</span>
                                  )}
                                  {staff.submission_count > 0 && (
                                    <button
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '0.85em',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => setShowDetails(staff)}
                                    >
                                      詳細
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-message">曜日登録済みのスタッフがありません</p>
                )}
              </div>
            )}

            {/* 機能パネル */}
            {selectedFacility && (
              <div className="features-section">
                <h3>次のステップ</h3>
                <div className="features-grid">
                  <div className="feature-card">
                    <div className="phase-badge">Phase 4</div>
                    <h4>シフト作成</h4>
                    <p>月次シフト表の作成・確認</p>
                    <button className="btn-secondary" onClick={() => navigate('/phase4')}>
                      進む <MdArrowForward style={{ marginLeft: '8px' }} />
                    </button>
                  </div>

                  <div className="feature-card">
                    <div className="phase-badge">Phase 5</div>
                    <h4>勤怠システム連動</h4>
                    <p>勤怠データの取得・連携</p>
                    <button className="btn-secondary" onClick={() => navigate('/phase5')}>
                      進む →
                    </button>
                  </div>

                  <div className="feature-card">
                    <div className="phase-badge">Phase 6</div>
                    <h4>勤務体制表</h4>
                    <p>勤務体制表の自動生成</p>
                    <button className="btn-secondary" onClick={() => navigate('/phase6')}>
                      進む →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
