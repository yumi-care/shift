import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MdArrowForward, MdClose } from 'react-icons/md';
import Header from '../../components/Header';
import './Dashboard.css';

const API_BASE_URL = 'https://ohdndxzjjhiqievsjdit.supabase.co/rest/v1';

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
  const handleDeleteSubmission = async (submissionId) => {
    try {
      await axios.delete(`${API_BASE_URL}/dashboard/submissions/${submissionId}`);
      refetchDashboardData();
    } catch (error) {
      console.error('申告削除エラー:', error);
      alert('申告削除に失敗しました');
    }
  };

  // 申告データの日付と拠点を更新
  const handleUpdateDateAndLocation = async (submissionId, newDate, newLocationId) => {
    try {
      await axios.put(`${API_BASE_URL}/dashboard/submissions/${submissionId}`, {
        date: newDate,
        location_id: newLocationId
      });

      setEditingDate(null);
      setEditingNewDate(null);
      setEditingLocation(null);
      refetchDashboardData();
    } catch (error) {
      console.error('申告更新エラー:', error);
      const errorMessage = error.response?.data?.error || '申告更新に失敗しました';
      alert(errorMessage);
    }
  };

  // スタッフを職種ごとにグループ化
  const groupStaffsByPosition = (staffs) => {
    const grouped = {};

    staffs.forEach(staff => {
      const positions = Array.isArray(staff.positions) ? staff.positions : [];

      if (positions.length === 0) {
        // 職種がない場合は「未設定」グループに追加
        if (!grouped['未設定']) {
          grouped['未設定'] = [];
        }
        grouped['未設定'].push(staff);
      } else {
        // 各職種ごとにスタッフを追加
        positions.forEach(pos => {
          const positionName = pos.position || '未設定';
          if (!grouped[positionName]) {
            grouped[positionName] = [];
          }
          // 同じスタッフが複数職種の場合、各職種に1回だけ追加
          if (!grouped[positionName].find(s => s.staff_id === staff.staff_id)) {
            grouped[positionName].push(staff);
          }
        });
      }
    });

    return grouped;
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
                            key={detail.submission_id}
                            style={{
                              padding: '12px',
                              backgroundColor: '#f5f5f5',
                              borderLeft: '4px solid #007bff',
                              borderRadius: '4px'
                            }}
                          >
                            {editingDate === detail.submission_id ? (
                              // 編集モード
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div>
                                  <label style={{ fontSize: '0.85em', color: '#666' }}>日付</label>
                                  <input
                                    type="date"
                                    value={editingNewDate || detail.date}
                                    onChange={(e) => setEditingNewDate(e.target.value)}
                                    style={{
                                      padding: '6px',
                                      fontSize: '0.9em',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      width: '100%'
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.85em', color: '#666' }}>拠点</label>
                                  <select
                                    value={editingLocation || detail.location_id || ''}
                                    onChange={(e) => setEditingLocation(e.target.value)}
                                    style={{
                                      padding: '6px',
                                      fontSize: '0.9em',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      width: '100%'
                                    }}
                                  >
                                    <option value="">--- 選択してください ---</option>
                                    {locations.map((loc) => (
                                      <option key={loc.location_id} value={loc.location_id}>
                                        {loc.location_name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() =>
                                      handleUpdateDateAndLocation(
                                        detail.submission_id,
                                        editingNewDate || detail.date,
                                        editingLocation ? parseInt(editingLocation) : detail.location_id
                                      )
                                    }
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '0.8em',
                                      backgroundColor: '#28a745',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      flex: 1
                                    }}
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingDate(null);
                                      setEditingNewDate(null);
                                      setEditingLocation(null);
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '0.8em',
                                      backgroundColor: '#6c757d',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      flex: 1
                                    }}
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // 表示モード
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>{detail.date}</div>
                                  <div style={{ color: '#666', fontSize: '0.9em' }}>拠点: {detail.location_name || '-'}</div>
                                  {detail.type === 'auto' && (
                                    <div style={{ color: '#999', fontSize: '0.8em', marginTop: '4px' }}>（自動申告）</div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {detail.type === 'manual' && (
                                    <button
                                      onClick={() => setEditingDate(detail.submission_id)}
                                      style={{
                                        padding: '6px 12px',
                                        fontSize: '0.8em',
                                        backgroundColor: '#ffc107',
                                        color: '#333',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      編集
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteSubmission(detail.submission_id)}
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
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#999' }}>申告データがありません</p>
                    )}

                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                      <button
                        onClick={() => setEditingDate('new')}
                        style={{
                          padding: '10px 16px',
                          fontSize: '14px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          width: '100%',
                          fontWeight: '600'
                        }}
                      >
                        + 新規追加
                      </button>
                    </div>

                    {editingDate === 'new' && (
                      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '0.85em', color: '#666', fontWeight: '600' }}>日付</label>
                          <input
                            type="date"
                            value={editingNewDate || ''}
                            onChange={(e) => setEditingNewDate(e.target.value)}
                            style={{
                              padding: '8px',
                              fontSize: '0.9em',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              width: '100%',
                              marginTop: '4px'
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '0.85em', color: '#666', fontWeight: '600' }}>拠点</label>
                          <select
                            value={editingLocation || ''}
                            onChange={(e) => setEditingLocation(e.target.value)}
                            style={{
                              padding: '8px',
                              fontSize: '0.9em',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              width: '100%',
                              marginTop: '4px'
                            }}
                          >
                            <option value="">--- 選択してください ---</option>
                            {locations.map((loc) => (
                              <option key={loc.location_id} value={loc.location_id}>
                                {loc.location_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              if (!editingNewDate || !editingLocation) {
                                alert('日付と拠点を選択してください');
                                return;
                              }
                              try {
                                const response = await axios.post(`${API_BASE_URL}/dashboard/submissions/add`, {
                                  facility_id: selectedFacility,
                                  staff_id: showDetails.staff_id,
                                  date: editingNewDate,
                                  location_id: parseInt(editingLocation),
                                  year: selectedYear,
                                  month: selectedMonth
                                });

                                // 新しい申告をshowDetailsに追加
                                const newDetail = {
                                  submission_id: response.data.submission.submission_id,
                                  date: editingNewDate,
                                  location_id: parseInt(editingLocation),
                                  location_name: response.data.submission.location_name,
                                  type: 'manual'
                                };

                                setShowDetails({
                                  ...showDetails,
                                  submission_details: [...(showDetails.submission_details || []), newDetail],
                                  submission_count: (showDetails.submission_count || 0) + 1
                                });

                                setEditingDate(null);
                                setEditingNewDate(null);
                                setEditingLocation(null);
                              } catch (err) {
                                console.error('追加エラー:', err);
                                const errorMessage = err.response?.data?.error || '追加に失敗しました';
                                alert(errorMessage);
                              }
                            }}
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.9em',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              flex: 1,
                              fontWeight: '600'
                            }}
                          >
                            追加
                          </button>
                          <button
                            onClick={() => {
                              setEditingDate(null);
                              setEditingNewDate(null);
                              setEditingLocation(null);
                            }}
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.9em',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              flex: 1
                            }}
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 申告済みスタッフ一覧 */}
            {selectedFacility && shiftData && (
              <div className="shift-preview-section">
                <h3>申告済みスタッフ</h3>
                {shiftData.staffs && shiftData.staffs.length > 0 ? (
                  <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                    {(() => {
                      const submittedStaffs = shiftData.staffs.filter(staff => staff.submission_count > 0);
                      return submittedStaffs.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            {submittedStaffs.map((staff) => (
                              <tr key={staff.staff_id} style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>
                                <td style={{ padding: '10px 0', fontSize: '16px', flex: 1 }}>
                                  {staff.staff_name}
                                </td>
                                <td style={{ padding: '10px 0', textAlign: 'center', fontSize: '14px', color: '#28a745', fontWeight: '600' }}>
                                  申告済み
                                </td>
                                <td style={{ padding: '10px 0', textAlign: 'right' }}>
                                  <button
                                    onClick={() => setShowDetails(staff)}
                                    style={{
                                      padding: '6px 12px',
                                      marginRight: '8px',
                                      fontSize: '14px',
                                      backgroundColor: '#007bff',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    修正
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`${staff.staff_name}の申告を削除しますか？`)) {
                                        try {
                                          const submissionIds = staff.submission_details?.map(d => d.submission_id) || [];
                                          for (const id of submissionIds) {
                                            await axios.delete(`${API_BASE_URL}/dashboard/submissions/${id}`);
                                          }
                                          // 画面をリフレッシュ
                                          window.location.reload();
                                        } catch (err) {
                                          console.error('削除エラー:', err);
                                          alert('削除に失敗しました');
                                        }
                                      }
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '14px',
                                      backgroundColor: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    削除
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="empty-message" style={{ margin: 0 }}>申告済みスタッフはありません</p>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="empty-message">スタッフがありません</p>
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
