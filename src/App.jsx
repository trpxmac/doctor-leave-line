import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import DoctorLiffPage from './pages/DoctorLiffPage';
import DoctorHistoryPage from './pages/DoctorHistoryPage';
import ApproverPage from './pages/ApproverPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminCriteriaPage from './pages/AdminCriteriaPage';
import AdminAuditPage from './pages/AdminAuditPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-100">
          <Navbar />
          <main className="flex-1 pb-12">
            <Routes>
              <Route path="/" element={<DoctorLiffPage />} />
              <Route path="/my-history" element={<DoctorHistoryPage />} />
              <Route path="/approver" element={<ApproverPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/criteria" element={<AdminCriteriaPage />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="font-semibold text-slate-700">
                Doctor Leave @ LINE — โรงพยาบาลกรุงเทพสิริโรจน์ (BSI)
              </span>
              <span className="text-slate-400 text-[11px]">
                Informatics Development Team • PDPA Compliant 100%
              </span>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
