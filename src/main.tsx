import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import QRVerification from './components/QRVerification';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* 🌍 PUBLIC ROUTES — No login required */}
        <Route path="/verify" element={<QRVerification />} />

        {/* 🔒 PRIVATE APP — Wrapped in AuthProvider */}
        <Route
          path="/*"
          element={
            <AuthProvider>
              <App />
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);