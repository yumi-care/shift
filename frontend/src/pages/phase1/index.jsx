/**
 * Phase 1：法人・事業所・拠点の登録
 *
 * 画面フロー：
 * 1. 法人を選択 or 新規作成
 * 2. 事業所を選択 or 新規作成
 * 3. 拠点を追加 or 拠点なし
 * 4. 完了
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import Header from '../../components/Header';
import './Phase1.css';

export default function Phase1() {
  const navigate = useNavigate();

  // ========== 状態管理 ==========
  const [step, setStep] = useState('corporation'); // corporation, facility, location
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

  // 選択済み
  const [selected, setSelected] = useState({
    corp_id: null,
    corp_name: '',
    facility_id: null,
    facility_name: ''
  });

  // セレクトボックス用の選択中の値
  const [tempSelect, setTempSelect] = useState({
    corp_id: '',
    facility_id: '',
    location_id: ''
  });

  // 確認画面表示
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  // ========== API 呼び出し ==========
  useEffect(() => {
    if (step === 'corporation') {
      fetchCorporations();
    }
  }, [step]);

  const fetchCorporations = async () => {
    try {
      const { data, error } = await supabase.from('corporations').select('*');
      if (error) throw error;
      setCorporations(data);
    } catch (error) {
      console.error('法人一覧取得エラー:', error);
    }
  };

  const fetchFacilities = async (corpId) => {
    try {
      const { data, error } = await supabase.from('facilities').select('*').eq('corp_id', corpId);
      if (error) throw error;
      setFacilities(data);
    } catch (error) {
      console.error('事業所一覧取得エラー:', error);
    }
  };

  const fetchLocations = async (facilityId) => {
    try {
      const { data, error } = await supabase.from('locations').select('*').eq('facility_id', facilityId);
      if (error) throw error;
      setLocations(data);
    } catch (error) {
      console.error('拠点一覧取得エラー:', error);
    }
  };

  // ========== イベント ==========
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ========== 削除処理 ==========
  const handleDeleteCorporation = async (corpId) => {
    if (!window.confirm('この法人を削除しますか？配下の事業所・拠点もすべて削除されます。')) {
      return;
    }
    try {
      const { error } = await supabase.from('corporations').delete().eq('corp_id', corpId);
      if (error) throw error;
      alert('法人を削除しました');
      setTempSelect({ ...tempSelect, corp_id: '' });
      fetchCorporations();
    } catch (error) {
      console.error('法人削除エラー:', error);
      alert('法人の削除に失敗しました');
    }
  };

  const handleDeleteFacility = async (facilityId) => {
    if (!window.confirm('この事業所を削除しますか？配下の拠点もすべて削除されます。')) {
      return;
    }
    try {
      const { error } = await supabase.from('facilities').delete().eq('facility_id', facilityId);
      if (error) throw error;
      alert('事業所を削除しました');
      setTempSelect({ ...tempSelect, facility_id: '' });
      fetchFacilities(selected.corp_id);
    } catch (error) {
      console.error('事業所削除エラー:', error);
      alert('事業所の削除に失敗しました');
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('この拠点を削除しますか？')) {
      return;
    }
    try {
      const { error } = await supabase.from('locations').delete().eq('location_id', locationId);
      if (error) throw error;
      alert('拠点を削除しました');
      setTempSelect({ ...tempSelect, location_id: '' });
      fetchLocations(selected.facility_id);
    } catch (error) {
      console.error('拠点削除エラー:', error);
      alert('拠点の削除に失敗しました');
    }
  };

  const handleSelectCorporation = (corpId) => {
    const corp = corporations.find(c => c.corp_id === corpId);
    setSelected({
      ...selected,
      corp_id: corpId,
      corp_name: corp?.corp_name || ''
    });
    fetchFacilities(corpId);
    setStep('facility');
  };

  const handleCreateCorporation = async () => {
    if (!formData.corp_name) {
      alert('法人名を入力してください');
      return;
    }

    setConfirmData({
      type: 'corporation',
      data: {
        corp_name: formData.corp_name
      }
    });
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    try {
      const { data, error } = await supabase.from('corporations').insert({
        corp_name: confirmData.data.corp_name
      }).select();
      if (error) throw error;

      const newCorp = data[0];
      alert('法人を登録しました');
      setSelected({
        ...selected,
        corp_id: newCorp.corp_id,
        corp_name: newCorp.corp_name
      });
      setFormData({ ...formData, corp_name: '' });
      setShowConfirm(false);
      setStep('facility');
    } catch (error) {
      console.error('法人作成エラー:', error);
      alert('法人の作成に失敗しました');
    }
  };

  const handleSelectFacility = (facilityId) => {
    const facility = facilities.find(f => f.facility_id === facilityId);
    setSelected({
      ...selected,
      facility_id: facilityId,
      facility_name: facility?.facility_name || ''
    });
    fetchLocations(facilityId);
    setStep('location');
  };

  const handleCreateFacility = async () => {
    if (!formData.facility_name || !formData.department || !formData.service_type) {
      alert('事業所名、部門、サービス種別を入力してください');
      return;
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

  const handleConfirmCreateFacility = async () => {
    try {
      const { error } = await supabase.from('facilities').insert({
        corp_id: selected.corp_id,
        facility_name: confirmData.data.facility_name,
        department: confirmData.data.department,
        service_type: confirmData.data.service_type
      });
      if (error) throw error;

      alert('事業所を登録しました');
      setFormData({ ...formData, facility_name: '', department: '', service_type: '' });
      setShowConfirm(false);
      await fetchFacilities(selected.corp_id);
      setStep('location');
    } catch (error) {
      console.error('事業所作成エラー:', error);
      alert('事業所の作成に失敗しました');
    }
  };

  const handleCompletePhase1 = () => {
    // Phase 1 完了フラグを保存
    localStorage.setItem('phase1_complete', 'true');
    alert('Phase 1 が完了しました！');
    navigate('/');
  };

  const handleConfirmCreateLocation = async () => {
    try {
      const { error } = await supabase.from('locations').insert({
        facility_id: selected.facility_id,
        location_name: confirmData.data.location_name
      });
      if (error) throw error;
      alert('拠点を登録しました');
      setFormData({ ...formData, location_name: '' });
      setShowConfirm(false);
      await fetchLocations(selected.facility_id);
    } catch (error) {
      console.error('拠点作成エラー:', error);
      alert('拠点の作成に失敗しました');
    }
  };

  // ========== レンダリング ==========
  return (
    <div className="phase1-container">
      <Header />
      <div className="phase1-subtitle">
        <p>Phase 1：法人・事業所・拠点の登録</p>
      </div>

      <div className="progress-bar">
        <div className={`progress-step ${step === 'corporation' ? 'active' : ''} ${step !== 'corporation' ? 'completed' : ''}`}>
          <span className="step-num">1</span>
          <span className="step-label">法人</span>
        </div>
        <div className={`progress-step ${step === 'facility' ? 'active' : ''} ${step !== 'corporation' && step !== 'facility' ? 'completed' : ''}`}>
          <span className="step-num">2</span>
          <span className="step-label">事業所</span>
        </div>
        <div className={`progress-step ${step === 'location' ? 'active' : ''}`}>
          <span className="step-num">3</span>
          <span className="step-label">拠点</span>
        </div>
      </div>

      {/* 確認画面 */}
      {showConfirm && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h2>入力内容の確認</h2>
            <p className="confirm-subtitle">以下の内容で登録しますか？</p>

            <div className="confirm-content">
              {confirmData.type === 'corporation' && (
                <>
                  <div className="confirm-item">
                    <span className="label">法人名</span>
                    <span className="value">{confirmData.data.corp_name}</span>
                  </div>
                </>
              )}

              {confirmData.type === 'facility' && (
                <>
                  <div className="confirm-item">
                    <span className="label">事業所名</span>
                    <span className="value">{confirmData.data.facility_name}</span>
                  </div>
                  <div className="confirm-item">
                    <span className="label">部門</span>
                    <span className="value">{serviceDepartments[confirmData.data.department]?.label}</span>
                  </div>
                  <div className="confirm-item">
                    <span className="label">サービス種別</span>
                    <span className="value">{confirmData.data.service_type}</span>
                  </div>
                </>
              )}

              {confirmData.type === 'location' && (
                <>
                  <div className="confirm-item">
                    <span className="label">拠点名</span>
                    <span className="value">{confirmData.data.location_name}</span>
                  </div>
                </>
              )}
            </div>

            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
                修正する
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (confirmData.type === 'corporation') handleConfirmCreate();
                  else if (confirmData.type === 'facility') handleConfirmCreateFacility();
                  else if (confirmData.type === 'location') handleConfirmCreateLocation();
                }}
              >
                {confirmData.type === 'corporation' && '法人を登録'}
                {confirmData.type === 'facility' && '事業所を登録'}
                {confirmData.type === 'location' && '拠点を登録'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1：法人 */}
      {step === 'corporation' && !showConfirm && (
        <div className="phase1-content">
          <div className="section">
            <h2>既存の法人から選択</h2>
            {corporations.length > 0 ? (
              <div className="form-group">
                <select
                  value={tempSelect.corp_id}
                  onChange={(e) => setTempSelect({ ...tempSelect, corp_id: e.target.value })}
                >
                  <option value="">選択してください</option>
                  {corporations.map((corp) => (
                    <option key={corp.corp_id} value={corp.corp_id}>
                      {corp.corp_name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (tempSelect.corp_id) {
                      handleSelectCorporation(parseInt(tempSelect.corp_id));
                    } else {
                      alert('法人を選択してください');
                    }
                  }}
                >
                  選択
                </button>
                {tempSelect.corp_id && (
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteCorporation(parseInt(tempSelect.corp_id))}
                  >
                    選択した法人を削除
                  </button>
                )}
              </div>
            ) : (
              <p className="empty-message">既存の法人がありません</p>
            )}
          </div>

          <div className="divider">または</div>

          <div className="section">
            <h2>新しい法人を作成</h2>
            <div className="form-group">
              <label htmlFor="corp_name">法人名</label>
              <input
                id="corp_name"
                type="text"
                name="corp_name"
                value={formData.corp_name}
                onChange={handleInputChange}
                placeholder="例）〇〇株式会社"
              />
            </div>
            <button className="btn-primary" onClick={handleCreateCorporation}>
              新しい法人を作成
            </button>
          </div>
        </div>
      )}

      {/* Step 2：事業所 */}
      {step === 'facility' && !showConfirm && (
        <div className="phase1-content">
          <div className="breadcrumb">
            <span className="breadcrumb-item">選択中の法人：<strong>{selected.corp_name}</strong></span>
          </div>
          <button className="btn-back" onClick={() => setStep('corporation')}>
            ← 法人を選択し直す
          </button>
          <div className="section">
            <h2>既存の事業所から選択</h2>
            {facilities.length > 0 ? (
              <div className="form-group">
                <select
                  value={tempSelect.facility_id}
                  onChange={(e) => setTempSelect({ ...tempSelect, facility_id: e.target.value })}
                >
                  <option value="">選択してください</option>
                  {facilities.map((facility) => (
                    <option key={facility.facility_id} value={facility.facility_id}>
                      {facility.facility_name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (tempSelect.facility_id) {
                      handleSelectFacility(parseInt(tempSelect.facility_id));
                    } else {
                      alert('事業所を選択してください');
                    }
                  }}
                >
                  選択
                </button>
                {tempSelect.facility_id && (
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteFacility(parseInt(tempSelect.facility_id))}
                  >
                    選択した事業所を削除
                  </button>
                )}
              </div>
            ) : (
              <p className="empty-message">既存の事業所がありません</p>
            )}
          </div>

          <div className="divider">または</div>

          <div className="section">
            <h2>新しい事業所を作成</h2>
            <div className="form-group">
              <label htmlFor="facility_name">事業所名</label>
              <input
                id="facility_name"
                type="text"
                name="facility_name"
                value={formData.facility_name}
                onChange={handleInputChange}
                placeholder="例）ゆうみのいえ"
              />
            </div>
            <div className="form-group">
              <label htmlFor="department">部門</label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
              >
                <option value="">選択してください</option>
                <option value="welfare">福祉部門</option>
                <option value="care">介護部門</option>
              </select>
            </div>
            {formData.department && (
              <div className="form-group">
                <label htmlFor="service_type">サービス種別</label>
                <select
                  id="service_type"
                  name="service_type"
                  value={formData.service_type}
                  onChange={handleInputChange}
                >
                  <option value="">選択してください</option>
                  {serviceDepartments[formData.department].types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button className="btn-primary" onClick={handleCreateFacility}>
              新しい事業所を作成
            </button>
          </div>
        </div>
      )}

      {/* Step 3：拠点 */}
      {step === 'location' && !showConfirm && (
        <div className="phase1-content">
          <div className="breadcrumb">
            <span className="breadcrumb-item">選択中の法人：<strong>{selected.corp_name}</strong></span>
            <span className="breadcrumb-item">選択中の事業所：<strong>{selected.facility_name}</strong></span>
          </div>
          <button className="btn-back" onClick={() => setStep('facility')}>
            ← 事業所を選択し直す
          </button>

          <div className="section">
            <h2>拠点を追加または拠点なしで完了</h2>
            <p className="section-description">
              この事業所に複数の拠点がある場合は拠点を追加してください。拠点がない場合は「拠点なし」で完了します。
            </p>

            {locations.length > 0 && (
              <div className="subsection">
                <h3>✓ 登録済み拠点一覧</h3>
                <div className="locations-list">
                  {locations.map((location) => (
                    <div key={location.location_id} className="location-item">
                      {location.location_name}
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label htmlFor="delete-location">拠点を削除する場合：</label>
                  <select
                    id="delete-location"
                    value={tempSelect.location_id}
                    onChange={(e) => setTempSelect({ ...tempSelect, location_id: e.target.value })}
                  >
                    <option value="">選択してください</option>
                    {locations.map((location) => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.location_name}
                      </option>
                    ))}
                  </select>
                  {tempSelect.location_id && (
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteLocation(parseInt(tempSelect.location_id))}
                    >
                      選択した拠点を削除
                    </button>
                  )}
                </div>
                <button className="btn-primary" onClick={handleCompletePhase1}>
                  拠点登録を完了してダッシュボードに戻る
                </button>
              </div>
            )}

            <div className="subsection">
              <h3>新しい拠点を作成</h3>
              <div className="form-group">
                <label htmlFor="location_name">拠点名</label>
                <input
                  id="location_name"
                  type="text"
                  name="location_name"
                  value={formData.location_name}
                  onChange={handleInputChange}
                  placeholder="例）ゆうみのいえ三本木"
                />
              </div>
              <button className="btn-primary" onClick={() => {
                if (formData.location_name) {
                  setConfirmData({
                    type: 'location',
                    data: {
                      facility_id: selected.facility_id,
                      location_name: formData.location_name,
                      corp_id: selected.corp_id
                    }
                  });
                  setShowConfirm(true);
                } else {
                  alert('拠点名を入力してください');
                }
              }}>
                新しい拠点を作成
              </button>
            </div>

            <div className="divider">または</div>

            <div className="subsection">
              <h3>拠点なしで完了</h3>
              <p className="subsection-description">
                この事業所に拠点がない場合、またはまだ拠点を登録しない場合は下のボタンをクリックしてください。
              </p>
              <button className="btn-primary btn-complete" onClick={handleCompletePhase1}>
                拠点を登録せずにダッシュボードに戻る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
