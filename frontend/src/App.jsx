import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Phase1 from './pages/phase1/index';
import Phase2 from './pages/phase2/index';
import Phase3 from './pages/phase3/index';
import Phase4 from './pages/phase4/index';
import Settings from './pages/settings/Settings';
import './App.css';

// ログイン保護コンポーネント
function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem('is_logged_in');
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/phase1" element={<ProtectedRoute><Phase1 /></ProtectedRoute>} />
        <Route path="/phase2" element={<ProtectedRoute><Phase2 /></ProtectedRoute>} />
        <Route path="/phase3" element={<Phase3 />} />
        <Route path="/phase4" element={<ProtectedRoute><Phase4 /></ProtectedRoute>} />
        <Route path="/phase6" element={<ProtectedRoute><div style={{ padding: '20px', textAlign: 'center' }}>Phase 6: 勤務体制表 - 準備中</div></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
