import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentDoctor, doctors, switchDoctor, isLiffMode, loading } = useAuth();

  const userRoles = currentDoctor?.roles || [];
  const hasRole = !allowedRoles || allowedRoles.length === 0 || allowedRoles.some(role => userRoles.includes(role));

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-[#002d74] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-600 font-medium text-sm">กำลังโหลดข้อมูลระบบ...</p>
      </div>
    );
  }

  if (!currentDoctor) {
    return <Navigate to="/" replace />;
  }

  if (!hasRole) {
    // Allow medical admin to view all doctor pages
    if (userRoles.includes('ADMIN') || userRoles.includes('MEDICAL_ADMIN')) {
      return children;
    }

    // Show friendly Access Restricted screen with 1-click switcher instead of forcing silent persona revert
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              สงวนสิทธิ์เฉพาะผู้ดูแลระบบ / ผู้อนุมัติ
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              หน้านี้จำกัดสิทธิ์ตามบทบาท ขณะนี้คุณกำลังเข้าใช้งานในฐานะ{' '}
              <strong className="text-slate-800">{currentDoctor.prefix_th}{currentDoctor.first_name_th} {currentDoctor.last_name_th}</strong> ({currentDoctor.department_name || 'แพทย์'})
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {!isLiffMode && doctors && doctors.some(d => (d.roles || []).includes('ADMIN') || (d.roles || []).includes('MEDICAL_ADMIN')) && (
              <button
                onClick={() => {
                  const adminDoc = doctors.find(d => (d.roles || []).includes('MEDICAL_ADMIN') || (d.roles || []).includes('ADMIN'));
                  if (adminDoc) switchDoctor(adminDoc.id);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>สลับเป็นบทบาท ฝ่ายการแพทย์ (Admin) เพื่อดูหน้านี้</span>
              </button>
            )}
            <Link
              to="/"
              className="w-full py-2 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all flex items-center justify-center gap-1"
            >
              <span>ไปหน้ายื่นใบลาสำหรับแพทย์ (LIFF)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
