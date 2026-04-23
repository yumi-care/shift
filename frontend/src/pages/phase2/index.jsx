import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { MdAssignment } from 'react-icons/md';
import Header from '../../components/Header';
import './Phase2.css';

export default function Phase2() {
  const navigate = useNavigate();

  // ========== 状態管理 ==========
  const [corporations, setCorporations] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [locations, setLocations] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCorp, setSelectedCorp] = useState('');
  const [selectedFacility, setSelectedFacility] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // フォーム入力
  const [formData, setFormData] = useState({
    staff_name: '',
    employment_type: 'fixed', // 'fixed' or 'shift'
    positions: [], // チェックボックス選択用
    work_days: [], // 月火水木金土日
    position_hours: [], // { position: '', scheduleId: 0, start: '', end: '' }
    break_start: '',
    break_end: ''
  });

  const [editingStaffId, setEditingStaffId] = useState(null);

  const daysOfWeek = ['月', '火', '水', '木', '金', '土', '日'];

  // 職種マスタ（介護・福祉共通）
  const positionOptions = [
    { label: '管理者', value: '管理者' },
    { label: 'サビ管', value: 'サビ管' },
    { label: '生活支援員', value: '生活支援員' },
    { label: '世話人', value: '世話人' },
    { label: '夜間世話人', value: '夜間世話人' }
  ];

  // ========== API 呼び出し ==========
  useEffect(() => {
    fetchCorporations();
  }, []);

  const fetchCorporations = async () => {
    try {
      const { data, error } = await supabase.from('corporations').select('*');
      if (error) throw error;
      setCorporations(data);
      setLoading(false);
    } catch (error) {
      console.error('法人取得エラー:', error);
      setLoading(false);
    }
  };

  const fetchFacilities = async (corpId) => {
    try {
      const { data, error } = await supabase.from('facilities').select('*').eq('corp_id', corpId);
      if (error) throw error;
      setFacilities(data);
      setSelectedFacility('');
      setStaffs([]);
    } catch (error) {
      console.error('事業所取得エラー:', error);
    }
  };

  const fetchLocations = async (facilityId) => {
    try {
      const { data, error } = await supabase.from('locations').select('*').eq('facility_id', facilityId);
      if (error) throw error;
      setLocations(data);
    } catch (error) {
      console.error('拠点取得エラー:', error);
    }
  };

  const fetchStaffs = async (facilityId) => {
    try {
      const { data, error } = await supabase.from('staffs').select('*').eq('facility_id', facilityId);
      if (error) throw error;
      setStaffs(data);
    } catch (error) {
      console.error('スタッフ取得エラー:', error);
      setStaffs([]);
    }
  };

  // ========== イベント ==========
  const handleSelectCorp = (corpId) => {
    setSelectedCorp(corpId);
    fetchFacilities(corpId);
  };

  const handleSelectFacility = (facilityId) => {
    setSelectedFacility(facilityId);
    setSelectedLocation('');
    fetchLocations(facilityId);
    fetchStaffs(facilityId);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePositionChange = (e) => {
    const { value, checked } = e.target;
    let newPositionHours = [...formData.position_hours];
    let newFormData = { ...formData };

    if (checked) {
      const exists = newPositionHours.some(ph => ph.position === value);
      if (!exists) {
        if (value === '世話人') {
          newPositionHours.push({ position: value, scheduleId: 0, start: '17:00', end: '22:00' });
          newPositionHours.push({ position: value, scheduleId: 1, start: '06:00', end: '09:00' });
          newFormData.break_start = '22:00';
          newFormData.break_end = '23:00';
        } else if (value === '夜間世話人') {
          newPositionHours.push({ position: value, scheduleId: 0, start: '22:00', end: '06:00' });
        } else {
          newPositionHours.push({ position: value, scheduleId: 0, start: '09:00', end: '18:00' });
        }
      }
    } else {
      newPositionHours = newPositionHours.filter(ph => ph.position !== value);
    }

    newFormData.position_hours = newPositionHours;
    setFormData(newFormData);
  };

  const handleWorkDayChange = (day) => {
    setFormData({
      ...formData,
      work_days: formData.work_days.includes(day)
        ? formData.work_days.filter(d => d !== day)
        : [...formData.work_days, day]
    });
  };

  const handlePositionHourChange = (position, scheduleId, field, value) => {
    setFormData({
      ...formData,
      position_hours: formData.position_hours.map(ph =>
        ph.position === position && ph.scheduleId === scheduleId ? { ...ph, [field]: value } : ph
      )
    });
  };

  const handleAddPositionSchedule = (position) => {
    const newScheduleId = Math.max(...formData.position_hours
      .filter(ph => ph.position === position)
      .map(ph => ph.scheduleId), -1) + 1;

    setFormData({
      ...formData,
      position_hours: [
        ...formData.position_hours,
        { position, scheduleId: newScheduleId, start: '09:00', end: '18:00' }
      ]
    });
  };

  const handleRemovePositionSchedule = (position, scheduleId) => {
    setFormData({
      ...formData,
      position_hours: formData.position_hours.filter(
        ph => !(ph.position === position && ph.scheduleId === scheduleId)
      )
    });
  };

  const handleAddStaff = async () => {
    if (!formData.staff_name || formData.position_hours.length === 0) {
      alert('名前と職種を選択してください');
      return;
    }

    if (formData.employment_type === 'fixed' && formData.work_days.length === 0) {
      alert('固定勤務の場合、勤務曜日を選択してください');
      return;
    }

    try {
      const positions = formData.position_hours.map(ph => ({
        position: ph.position,
        work_hours_start: ph.start,
        work_hours_end: ph.end
      }));

      const { error } = await supabase.from('staffs').insert({
        facility_id: selectedFacility,
        staff_name: formData.staff_name,
        positions: positions,
        work_days: formData.employment_type === 'fixed' ? formData.work_days.join('') : '',
        break_start: formData.break_start,
        break_end: formData.break_end
      });

      if (error) throw error;
      alert('スタッフを登録しました');
      setFormData({
        staff_name: '',
        employment_type: 'fixed',
        positions: [],
        work_days: [],
        position_hours: [],
        break_start: '',
        break_end: ''
      });

      await fetchStaffs(selectedFacility);
    } catch (error) {
      console.error('スタッフ登録エラー:', error);
      alert('スタッフ登録に失敗しました');
    }
  };

  const handleEditStaff = (staff) => {
    setEditingStaffId(staff.staff_id);
    const positions = Array.isArray(staff.positions) ? staff.positions : [];
    const positionHours = positions.map(p => ({
      position: p.position || p,
      start: p.work_hours_start || '09:00',
      end: p.work_hours_end || '18:00',
      scheduleId: 0
    }));
    setFormData({
      staff_name: staff.staff_name,
      employment_type: staff.employment_type || 'fixed',
      positions: [],
      work_days: staff.work_days ? staff.work_days.split('') : [],
      position_hours: positionHours,
      break_start: staff.break_start || '',
      break_end: staff.break_end || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!formData.staff_name || formData.position_hours.length === 0) {
      alert('名前と職種を選択してください');
      return;
    }

    if (formData.employment_type === 'fixed' && formData.work_days.length === 0) {
      alert('固定勤務の場合、勤務曜日を選択してください');
      return;
    }

    try {
      const positions = formData.position_hours.map(ph => ({
        position: ph.position,
        work_hours_start: ph.start,
        work_hours_end: ph.end
      }));

      const { error } = await supabase.from('staffs').update({
        staff_name: formData.staff_name,
        positions: positions,
        work_days: formData.employment_type === 'fixed' ? formData.work_days.join('') : '',
        break_start: formData.break_start,
        break_end: formData.break_end
      }).eq('staff_id', editingStaffId);

      if (error) throw error;
      setEditingStaffId(null);
      setFormData({
        staff_name: '',
        employment_type: 'fixed',
        positions: [],
        work_days: [],
        position_hours: [],
        break_start: '',
        break_end: ''
      });
      alert('スタッフ情報を更新しました');
      await fetchStaffs(selectedFacility);
    } catch (error) {
      console.error('スタッフ更新エラー:', error);
      alert('スタッフ更新に失敗しました');
    }
  };

  const handleCancelEdit = () => {
    setEditingStaffId(null);
    setFormData({
      staff_name: '',
      employment_type: 'fixed',
      positions: [],
      work_days: [],
      position_hours: [],
      break_start: '',
      break_end: ''
    });
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('このスタッフを削除しますか？')) {
      return;
    }

    try {
      const { error } = await supabase.from('staffs').delete().eq('staff_id', staffId);
      if (error) throw error;
      alert('スタッフを削除しました');
      await fetchStaffs(selectedFacility);
    } catch (error) {
      console.error('スタッフ削除エラー:', error);
      alert('スタッフ削除に失敗しました');
    }
  };

  // ========== レンダリング ==========
  if (loading) {
    return (
      <div className="phase2-container">
        <Header />
        <main className="phase2-main">
          <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="phase2-container">
      <Header />
      <div className="phase2-subtitle">
        <p>Phase 2：スタッフ登録</p>
      </div>

      <div className="phase2-main">
        {/* 法人・事業所選択 */}
        <div className="selector-section">
          <div className="selector-group">
            <label htmlFor="corp-select">法人</label>
            <select
              id="corp-select"
              value={selectedCorp}
              onChange={(e) => handleSelectCorp(e.target.value)}
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
            <div className="selector-group">
              <label htmlFor="facility-select">事業所</label>
              <select
                id="facility-select"
                value={selectedFacility}
                onChange={(e) => handleSelectFacility(e.target.value)}
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

        {/* スタッフ登録フォーム */}
        {selectedFacility && (
          <div className="staff-form-section">
            <h3>{editingStaffId ? 'スタッフを修正' : 'スタッフを追加'}</h3>
            <div className="form-group">
              <label htmlFor="staff-name">名前</label>
              <input
                id="staff-name"
                type="text"
                name="staff_name"
                value={formData.staff_name}
                onChange={handleInputChange}
                placeholder="スタッフ名"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>雇用形態</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="radio"
                    name="employment_type"
                    value="fixed"
                    checked={formData.employment_type === 'fixed'}
                    onChange={(e) => setFormData({
                      ...formData,
                      employment_type: e.target.value,
                      work_days: []
                    })}
                  />
                  固定勤務
                </label>
                <label className="checkbox-label">
                  <input
                    type="radio"
                    name="employment_type"
                    value="shift"
                    checked={formData.employment_type === 'shift'}
                    onChange={(e) => setFormData({
                      ...formData,
                      employment_type: e.target.value,
                      work_days: []
                    })}
                  />
                  シフト申告制
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>職種（複数選択）</label>
              <div className="checkbox-group">
                {positionOptions.map((option) => (
                  <label key={option.value} className="checkbox-label">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={formData.position_hours.some(p => p.position === option.value)}
                      onChange={handlePositionChange}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            {formData.position_hours.length > 0 && (
              <div className="form-group">
                <label>職種ごとの勤務時間</label>
                {Array.from(new Set(formData.position_hours.map(ph => ph.position))).map((position) => (
                  <div key={position} style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #ddd' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>{position}</div>
                    {formData.position_hours
                      .filter(ph => ph.position === position)
                      .map((ph) => (
                        <div key={`${ph.position}-${ph.scheduleId}`} className="form-row" style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="HH"
                                maxLength="2"
                                value={ph.start.split(':')[0] || ''}
                                onChange={(e) => {
                                  const hour = e.target.value;
                                  if (hour.length === 2) {
                                    document.getElementById(`min-start-${ph.position}-${ph.scheduleId}`)?.focus();
                                  }
                                  const minutes = ph.start.split(':')[1] || '00';
                                  handlePositionHourChange(ph.position, ph.scheduleId, 'start', `${hour}:${minutes}`);
                                }}
                                style={{
                                  width: '50px',
                                  padding: '6px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  textAlign: 'center',
                                  fontSize: '14px'
                                }}
                              />
                              <span>:</span>
                              <input
                                id={`min-start-${ph.position}-${ph.scheduleId}`}
                                type="text"
                                inputMode="numeric"
                                placeholder="MM"
                                maxLength="2"
                                value={ph.start.split(':')[1] || ''}
                                onChange={(e) => {
                                  const minutes = e.target.value;
                                  const hours = ph.start.split(':')[0] || '09';
                                  handlePositionHourChange(ph.position, ph.scheduleId, 'start', `${hours}:${minutes}`);
                                }}
                                style={{
                                  width: '50px',
                                  padding: '6px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  textAlign: 'center',
                                  fontSize: '14px'
                                }}
                              />
                            </div>

                            <span style={{ margin: '0 8px' }}>〜</span>

                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="HH"
                                maxLength="2"
                                value={ph.end.split(':')[0] || ''}
                                onChange={(e) => {
                                  const hour = e.target.value;
                                  if (hour.length === 2) {
                                    document.getElementById(`min-end-${ph.position}-${ph.scheduleId}`)?.focus();
                                  }
                                  const minutes = ph.end.split(':')[1] || '00';
                                  handlePositionHourChange(ph.position, ph.scheduleId, 'end', `${hour}:${minutes}`);
                                }}
                                style={{
                                  width: '50px',
                                  padding: '6px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  textAlign: 'center',
                                  fontSize: '14px'
                                }}
                              />
                              <span>:</span>
                              <input
                                id={`min-end-${ph.position}-${ph.scheduleId}`}
                                type="text"
                                inputMode="numeric"
                                placeholder="MM"
                                maxLength="2"
                                value={ph.end.split(':')[1] || ''}
                                onChange={(e) => {
                                  const minutes = e.target.value;
                                  const hours = ph.end.split(':')[0] || '18';
                                  handlePositionHourChange(ph.position, ph.scheduleId, 'end', `${hours}:${minutes}`);
                                }}
                                style={{
                                  width: '50px',
                                  padding: '6px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  textAlign: 'center',
                                  fontSize: '14px'
                                }}
                              />
                            </div>

                            {formData.position_hours.filter(p => p.position === position).length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePositionSchedule(ph.position, ph.scheduleId)}
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                削除
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    <button
                      type="button"
                      onClick={() => handleAddPositionSchedule(position)}
                      style={{
                        padding: '5px 15px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      + 時間帯を追加
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>休憩開始時間</label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="HH"
                    maxLength="2"
                    value={formData.break_start.split(':')[0] || ''}
                    onChange={(e) => {
                      const hour = e.target.value;
                      if (hour.length === 2) {
                        document.getElementById('min-break-start')?.focus();
                      }
                      const minutes = formData.break_start.split(':')[1] || '00';
                      setFormData({ ...formData, break_start: `${hour}:${minutes}` });
                    }}
                    style={{
                      width: '50px',
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}
                  />
                  <span>:</span>
                  <input
                    id="min-break-start"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM"
                    maxLength="2"
                    value={formData.break_start.split(':')[1] || ''}
                    onChange={(e) => {
                      const minutes = e.target.value;
                      const hours = formData.break_start.split(':')[0] || '12';
                      setFormData({ ...formData, break_start: `${hours}:${minutes}` });
                    }}
                    style={{
                      width: '50px',
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>休憩終了時間</label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="HH"
                    maxLength="2"
                    value={formData.break_end.split(':')[0] || ''}
                    onChange={(e) => {
                      const hour = e.target.value;
                      if (hour.length === 2) {
                        document.getElementById('min-break-end')?.focus();
                      }
                      const minutes = formData.break_end.split(':')[1] || '00';
                      setFormData({ ...formData, break_end: `${hour}:${minutes}` });
                    }}
                    style={{
                      width: '50px',
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}
                  />
                  <span>:</span>
                  <input
                    id="min-break-end"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM"
                    maxLength="2"
                    value={formData.break_end.split(':')[1] || ''}
                    onChange={(e) => {
                      const minutes = e.target.value;
                      const hours = formData.break_end.split(':')[0] || '13';
                      setFormData({ ...formData, break_end: `${hours}:${minutes}` });
                    }}
                    style={{
                      width: '50px',
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>

            {formData.employment_type === 'fixed' && (
              <div className="form-group">
                <label>勤務曜日（複数選択）</label>
                <div className="checkbox-group">
                  {daysOfWeek.map((day) => (
                    <label key={day} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.work_days.includes(day)}
                        onChange={() => handleWorkDayChange(day)}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {editingStaffId ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-primary" onClick={handleSaveEdit}>
                  保存
                </button>
                <button className="btn-secondary" onClick={handleCancelEdit}>
                  キャンセル
                </button>
              </div>
            ) : (
              <button className="btn-primary" onClick={handleAddStaff}>
                スタッフを追加
              </button>
            )}
          </div>
        )}

        {/* スタッフ一覧 */}
        {selectedFacility && staffs.length > 0 && (
          <div className="staff-list-section">
            <h3>登録済みスタッフ</h3>
            <div className="staff-list">
              {staffs.map((staff) => (
                <div key={staff.staff_id} className="staff-item">
                  <div className="staff-info">
                    <div className="staff-name">{staff.staff_name}</div>
                    <div className="staff-details">
                      <span className="position">
                        {Array.isArray(staff.positions)
                          ? staff.positions.map(p => p.position || p).join('、')
                          : (staff.position || '-')}
                      </span>
                      {Array.isArray(staff.positions) && staff.positions.length > 0 ? (
                        <span className="work-time">
                          {staff.positions.map((p, idx) => (
                            <div key={idx}>
                              {p.position || p}: {(p.work_hours_start || p.start) ? `${p.work_hours_start || p.start}〜${p.work_hours_end || p.end}` : '-'}
                            </div>
                          ))}
                        </span>
                      ) : (
                        <span className="work-time">
                          {staff.work_hours_start && staff.work_hours_end ? `${staff.work_hours_start}〜${staff.work_hours_end}` : '-'}
                        </span>
                      )}
                      <span className="work-days">{staff.work_days || '-'}</span>
                      <span className="break-time">
                        休憩: {staff.break_start && staff.break_end ? `${staff.break_start}〜${staff.break_end}` : '-'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-edit"
                      onClick={() => handleEditStaff(staff)}
                    >
                      修正
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteStaff(staff.staff_id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFacility && staffs.length === 0 && (
          <div className="empty-message">
            <p>登録されたスタッフがありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
