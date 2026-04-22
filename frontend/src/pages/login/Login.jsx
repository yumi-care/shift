/**
 * ログイン画面
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 簡略版認証（実際にはバックエンドで検証）
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      setIsLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      setIsLoading(false);
      return;
    }

    // 認証成功時の処理（デモ用）
    setTimeout(() => {
      // localStorage にユーザー情報を保存
      localStorage.setItem('user', JSON.stringify({
        email: email,
        login_time: new Date().toISOString()
      }));
      localStorage.setItem('is_logged_in', 'true');

      setIsLoading(false);
      navigate('/');
    }, 800);
  };

  const handleDemoLogin = () => {
    // デモログイン
    localStorage.setItem('user', JSON.stringify({
      email: 'demo@example.com',
      login_time: new Date().toISOString()
    }));
    localStorage.setItem('is_logged_in', 'true');
    navigate('/');
  };

  return (
    <div className="login-container">
      {/* ヘッダー */}
      <header className="login-header">
        <h1 className="login-title">シフト管理システム</h1>
      </header>

      {/* メインコンテンツ */}
      <main className="login-main">
        <div className="login-card">
          <h2>ログイン</h2>

          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">メールアドレス</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@company.jp"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={isLoading}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="divider">または</div>

          <button
            type="button"
            className="btn-demo"
            onClick={handleDemoLogin}
          >
            デモでログイン
          </button>

          <div className="login-footer">
            <p className="demo-note">
              デモアカウントでシステムの動作をお試しいただけます
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
