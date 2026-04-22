import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('user');
    localStorage.removeItem('phase1_complete');
    navigate('/login');
  };

  return (
    <div className="settings-container">
      <Header />

      <main className="settings-main">
        <div className="settings-content">
          <h2>設定</h2>

          <section className="settings-section">
            <h3>ユーザー情報</h3>
            <div className="info-group">
              <label>ユーザーID</label>
              <p>{userInfo.user_id || '設定されていません'}</p>
            </div>
            <div className="info-group">
              <label>ユーザー名</label>
              <p>{userInfo.username || '設定されていません'}</p>
            </div>
          </section>

          <section className="settings-section">
            <h3>セキュリティ</h3>
            <p className="section-description">
              パスワード変更やセキュリティ設定はこちらから行えます
            </p>
            <button className="btn-secondary" disabled>
              パスワード変更（準備中）
            </button>
          </section>

          <section className="settings-section danger-zone">
            <h3>アカウント</h3>
            <button
              className="btn-logout"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
