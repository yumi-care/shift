import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import Header from '../../components/Header';
import './Phase1.css';

export default function Phase1() {
  const navigate = useNavigate();

  // ========== 状態管理 ==========
  const [step, setStep] = useState('corporation'); 
  const [corporations, setCorporations] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [locations, setLocations] = useState([]);

  // 入力フォーム
  const [formData, setFormData] = useState({
    corp_name: '',
    facility_name: '',
    department: '',
    service_type: '',
    location_name: ''
  });

  // 選択済みデータ
  const [selected, setSelected] = useState({
    corp_id: null,
    corp_name: '',
    facility_id: null,
    facility_name: ''
  });

  // セレクトボックス用の一時保持
  const [tempSelect, setTempSelect] = useState({
    corp_id: '',
    facility_id: '',
    location_id: ''
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  // サービス種別マスタ
  const serviceDepartments = {
    welfare: {
      label: '福祉部門',
      types: ['共同生活援助', '就労継続支援B型', '生活介護', '相談支援']
    },
    care: {
      label: '介護部門',
      types: ['地域密着型通所介護', '通所介護', '訪問介護', '訪問看護', '居宅介護支援']
    }
  };

  // ========== データ取得 (useEffect) ==========

  // 1. 初回マウント時に法人一覧を取得
  useEffect(() => {
    fetchCorporations();
  }, []);

  // 2. 法人が選択されたら事業所一覧を取得
  useEffect(() => {
    if (selected.corp_id) {
      fetchFacilities(selected.corp_id);
    } else {
      setFacilities([]);
    }
  }, [selected.corp_id]);

  // 3. 事業所が選択されたら拠点一覧を取得
  useEffect(() => {
    if (selected.facility_id) {
      fetchLocations(selected.facility_id);
    } else {
      setLocations([]);
    }
  }, [selected.facility_id]);

  // ========== API 呼び出し関数 ==========

  const fetchCorporations = async () => {
    try {
      const { data, error } = await supabase.from('corporations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCorporations(data || []);
    } catch (error) {
      console.error('法人一覧取得エラー:', error);
    }
  };

  const fetchFacilities = async (corpId) => {
    try {
      const { data, error } = await supabase.from('facilities').select('*').eq('corp_id', corpId);
      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error('事業所一覧取得エラー:', error);
    }
  };

  const fetchLocations = async (facilityId) => {
    try {
      const { data, error } = await supabase.from('locations').select('*').eq('facility_id', facilityId);
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('拠点一覧取得エラー:', error);
    }
  };

  // ========== イベントハンドラ ==========

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectCorporation = () => {
    if (!tempSelect.corp_id) return alert('法人を選択してください');
    const corpIdNum = parseInt(tempSelect.corp_id);
    const corp = corporations.find(c => c.corp_id === corpIdNum);
    setSelected({
      ...selected,
      corp_id: corpIdNum,
      corp_name: corp?.corp_name || ''
    });
    setStep('facility');
  };

  const handleSelectFacility = () => {
    if (!tempSelect.facility_id) return alert('事業所を選択してください');
    const facIdNum = parseInt(tempSelect.facility_id);
    const facility = facilities.find(f => f.facility_id === facIdNum);
    setSelected({
      ...selected,
      facility_id: facIdNum,
      facility_name: facility?.facility_name || ''
    });
    setStep('location');
  };

  // ========== 作成処理 (確認モーダルへ) ==========

  const handleCreateCorporation = () => {
    if (!formData.corp_name) return alert('法人名を入力してください');
    setConfirmData({ type: 'corporation', data: { corp_name: formData.corp_name } });
    setShowConfirm(true);
  };

  const handleCreateFacility = () => {
    if (!formData.facility_name || !formData.department || !formData.service_type) {
      return alert('事業所名、部門、サービス種別を入力してください');
    }
    setConfirmData({
      type: 'facility',
      data: {
        corp_id: selected.corp_id,
        facility_name: formData.facility_name,
        department: formData.department,
        service_type: formData.service_type
      }
    });
    setShowConfirm(true);
  };

  // ========== 確定保存処理 ==========

  const handleConfirmCreate = async () => {
    try {
      if (confirmData.type === 'corporation') {
        const { data, error } = await supabase.from('corporations').insert({ corp_name: confirmData.data.corp_name }).select();
        if (error) throw error;
        const newCorp = data[0];
        setCorporations([newCorp, ...corporations]);
        setSelected({ ...selected, corp_id: newCorp.corp_id, corp_name: newCorp.corp_name });
        setStep('facility');
      } 
      else if (confirmData.type === 'facility') {
        const { data, error } = await supabase.from('facilities').insert(confirmData.data).select();
        if (error) throw error;
        const newFac = data[0];
        setFacilities([newFac, ...facilities]);
        setSelected({ ...selected, facility_id: newFac.facility_id, facility_name: newFac.facility_name });
        setStep('location');
      } 
      else if (confirmData.type === 'location') {
        const { error } = await supabase.from('locations').insert({
          facility_id: selected.facility_id,
          location_name: confirmData.data.location_name
        });
        if (error) throw error;
        fetchLocations(selected.facility_id); // 拠点一覧を再取得
      }

      setFormData({ ...formData, corp_name: '', facility_name: '', department: '', service_type: '', location_name: '' });
      setShowConfirm(false);
      alert('登録しました');
    } catch (error) {
      console.error('作成エラー:', error);
      alert('登録に失敗しました');
    }
  };

  // ========== 削除処理 ==========

  const handleDeleteItem = async (table, idField, idValue, callback) => {
    if (!window.confirm('本当に削除しますか？')) return;
    try {
      const { error } = await supabase.from(table).delete().eq(idField, idValue);
      if (error) throw error;
      alert('削除しました');
      callback();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const handleCompletePhase1 = () => {
    localStorage.setItem('phase1_complete', 'true');
    navigate('/');
  };

  return (
    <div className="phase1-container">
      <Header />
      <div className="phase1-subtitle"><p>Phase 1：法人・事業所・拠点の登録</p></div>

      <div className="progress-bar">
        <div className={`progress-step ${step === 'corporation' ? 'active' : 'completed'}`}>
          <span className="step-num">1</span><span className="step-label">法人</span>
        </div>
        <div className={`progress-step ${step === 'facility' ? 'active' : (step === 'location' ? 'completed' : '')}`}>
          <span className="step-num">2</span><span className="step-label">事業所</span>
        </div>
        <div className={`progress-step ${step === 'location' ? 'active' : ''}`}>
          <span className="step-num">3</span><span className="step-label">拠点</span>
        </div>
      </div>

      {/* 確認モーダル */}
      {showConfirm && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h2>入力内容の確認</h2>
            <div className="confirm-content">
              {confirmData.type === 'corporation' && <p>法人名: {confirmData.data.corp_name}</p>}
              {confirmData.type === 'facility' && (
                <>
                  <p>事業所名: {confirmData.data.facility_name}</p>
                  <p>部門: {serviceDepartments[confirmData.data.department]?.label}</p>
                  <p>種別: {confirmData.data.service_type}</p>
                </>
              )}
              {confirmData.type === 'location' && <p>拠点名: {confirmData.data.location_name}</p>}
            </div>
            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>修正</button>
              <button className="btn-primary" onClick={handleConfirmCreate}>登録確定</button>
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      {!showConfirm && (
        <div className="phase1-content">
          {/* STEP 1: 法人選択 */}
          {step === 'corporation' && (
            <div className="section">
              <h2>既存の法人を選択</h2>
              <select value={tempSelect.corp_id} onChange={(e) => setTempSelect({ ...tempSelect, corp_id: e.target.value })}>
                <option value="">選択してください</option>
                {corporations.map(c => <option key={c.corp_id} value={c.corp_id}>{c.corp_name}</option>)}
              </select>
              <button className="btn-primary" onClick={handleSelectCorporation}>選択</button>
              {tempSelect.corp_id && (
                <button className="btn-danger" onClick={() => handleDeleteItem('corporations', 'corp_id', tempSelect.corp_id, fetchCorporations)}>削除</button>
              )}
              <div className="divider">または新規作成</div>
              <input type="text" name="corp_name" value={formData.corp_name} onChange={handleInputChange} placeholder="法人名を入力" />
              <button className="btn-primary" onClick={handleCreateCorporation}>新規登録</button>
            </div>
          )}

          {/* STEP 2: 事業所選択 */}
          {step === 'facility' && (
            <div className="section">
              <button className="btn-back" onClick={() => setStep('corporation')}>← 戻る</button>
              <p>選択中の法人: <strong>{selected.corp_name}</strong></p>
              <h2>事業所を選択</h2>
              <select value={tempSelect.facility_id} onChange={(e) => setTempSelect({ ...tempSelect, facility_id: e.target.value })}>
                <option value="">選択してください</option>
                {facilities.map(f => <option key={f.facility_id} value={f.facility_id}>{f.facility_name}</option>)}
              </select>
              <button className="btn-primary" onClick={handleSelectFacility}>選択</button>
              <div className="divider">または新規作成</div>
              <input type="text" name="facility_name" value={formData.facility_name} onChange={handleInputChange} placeholder="事業所名" />
              <select name="department" value={formData.department} onChange={handleInputChange}>
                <option value="">部門を選択</option>
                <option value="welfare">福祉部門</option>
                <option value="care">介護部門</option>
              </select>
              {formData.department && (
                <select name="service_type" value={formData.service_type} onChange={handleInputChange}>
                  <option value="">種別を選択</option>
                  {serviceDepartments[formData.department].types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              <button className="btn-primary" onClick={handleCreateFacility}>新規登録</button>
            </div>
          )}

          {/* STEP 3: 拠点登録 */}
          {step === 'location' && (
            <div className="section">
              <button className="btn-back" onClick={() => setStep('facility')}>← 戻る</button>
              <p>法人: {selected.corp_name} / 事業所: {selected.facility_name}</p>
              <h2>拠点の登録</h2>
              {locations.length > 0 && (
                <div className="locations-list">
                  {locations.map(l => (
                    <div key={l.location_id} className="location-item">
                      {l.location_name} 
                      <button onClick={() => handleDeleteItem('locations', 'location_id', l.location_id, () => fetchLocations(selected.facility_id))}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <input type="text" name="location_name" value={formData.location_name} onChange={handleInputChange} placeholder="拠点名を入力" />
              <button className="btn-primary" onClick={() => {
                if(!formData.location_name) return alert('拠点名を入力してください');
                setConfirmData({ type: 'location', data: { location_name: formData.location_name } });
                setShowConfirm(true);
              }}>拠点を追加</button>
              <div className="divider"></div>
              <button className="btn-primary btn-complete" onClick={handleCompletePhase1}>完了してダッシュボードへ</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}