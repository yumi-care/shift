import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('user');
    localStorage.removeItem('phase1_complete');
    navigate('/login');
  };

  const handleMenuClick = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="app-header">
      <div className="header-wrapper">
        <button
          className="hamburger-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="メニュー"
        >
          ☰
        </button>
        <h1 className="header-title">シフト作成</h1>
      </div>

      {/* ドロップダウンメニュー */}
      <div className="menu-container" ref={menuRef}>
        {menuOpen && (
          <div className="dropdown-menu">
            <button
              className="menu-item"
              onClick={() => handleMenuClick('/')}
            >
              ダッシュボード
            </button>
            <div className="menu-section-label">事前登録</div>
            <button
              className="menu-item"
              onClick={() => handleMenuClick('/phase1')}
            >
              法人・事業所・拠点
            </button>
            <button
              className="menu-item"
              onClick={() => handleMenuClick('/phase2')}
            >
              スタッフ登録
            </button>
            <button
              className="menu-item"
              onClick={() => handleMenuClick('/phase3')}
            >
              シフト申告
            </button>
            <button
              className="menu-item"
              onClick={() => handleMenuClick('/settings')}
            >
              設定
            </button>
            <button
              className="menu-item logout"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
