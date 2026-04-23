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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/phase1" element={<Phase1 />} />
        <Route path="/phase2" element={<Phase2 />} />
        <Route path="/phase3" element={<Phase3 />} />
        <Route path="/phase4" element={<Phase4 />} />
        <Route path="/phase6" element={<div style={{ padding: '20px', textAlign: 'center' }}>Phase 6: 勤務体制表 - 準備中</div>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
