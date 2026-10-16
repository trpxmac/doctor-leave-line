import React, { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentDoctor, doctors, switchDoctor, isLiffMode, loading } = useAuth();

  const userRoles = currentDoctor?.roles || [];
  const hasRole = !allowedRoles || allowedRoles.length === 0 || allowedRoles.some(role => userRoles.includes(role));

  // 1. If in dev/demo mode (outside real LINE client lock), auto-switch to a persona with the required role!
  useEffect(() => {
    if (!loading && currentDoctor && !hasRole && !isLiffMode && doctors && doctors.length > 0) {
      const eligibleDoc = doctors.find(d => 
        (d.roles || []).some(r => allowedRoles.includes(r))
      );
      if (eligibleDoc) {
        console.log(`[Auto-Switch Persona] Switching to ${eligibleDoc.first_name_th} (${eligibleDoc.employee_id}) to access route`);
        switchDoctor(eligibleDoc.id);
      }
    }
  }, [loading, currentDoctor, hasRole, isLiffMode, doctors, allowedRoles]);

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
    // If eligible doctor can be auto-switched in demo mode, show a brief loading while switching
    if (!isLiffMode && doctors && doctors.some(d => (d.roles || []).some(r => allowedRoles.includes(r)))) {
      const eligibleDoc = doctors.find(d => (d.roles || []).some(r => allowedRoles.includes(r)));
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-700 font-bold text-sm">กำลังสลับบทบาทเป็น {eligibleDoc?.first_name_th} ({eligibleDoc?.roles?.join(', ')})...</p>
          <p className="text-xs text-slate-400 mt-1">เพื่อเข้าสู่หน้าตามสิทธิ์อัตโนมัติ</p>
        </div>
      );
    }

    // 2. If user is medical admin, allow viewing all doctor pages
    if (userRoles.includes('ADMIN') || userRoles.includes('MEDICAL_ADMIN')) {
      return children;
    }

    // 3. Show friendly Access Restricted screen with 1-click switcher instead of silent redirect
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              หน้านี้สำหรับเจ้าหน้าที่ฝ่ายการแพทย์เท่านั้น ขณะนี้คุณกำลังเข้าใช้งานในฐานะ{' '}
              <strong className="text-slate-800">{currentDoctor.prefix_th}{currentDoctor.first_name_th} {currentDoctor.last_name_th}</strong> ({currentDoctor.department_name || 'แพทย์'})
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {doctors && doctors.some(d => (d.roles || []).includes('ADMIN') || (d.roles || []).includes('MEDICAL_ADMIN')) && (
              <button
                onClick={() => {
                  const adminDoc = doctors.find(d => (d.roles || []).includes('ADMIN') || (d.roles || []).includes('MEDICAL_ADMIN'));
                  if (adminDoc) switchDoctor(adminDoc.id);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>คลิกที่นี่เพื่อสลับเป็นบทบาท ฝ่ายการแพทย์ (Admin)</span>
              </button>
            )}
            <Link
              to="/"
              className="w-full py-2 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all flex items-center justify-center gap-1"
            >
              <span>กลับสู่หน้าหลัก / ยื่นใบลา</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
