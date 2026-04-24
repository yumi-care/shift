import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<div style={{ padding: '20px', textAlign: 'center' }}>Shift System - Rebuilding with Supabase...</div>} />
        <Route path="/phase1" element={<div style={{ padding: '20px', textAlign: 'center' }}>Phase 1 - Coming Soon</div>} />
        <Route path="/phase2" element={<div style={{ padding: '20px', textAlign: 'center' }}>Phase 2 - Coming Soon</div>} />
        <Route path="/phase3" element={<div style={{ padding: '20px', textAlign: 'center' }}>Phase 3 - Coming Soon</div>} />
        <Route path="/phase4" element={<div style={{ padding: '20px', textAlign: 'center' }}>Phase 4 - Coming Soon</div>} />
      </Routes>
    </BrowserRouter>
  );
}
