import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertTriangle } from 'lucide-react';

export default function OnboardingPage() {
  const { liffProfile, setNeedsOnboarding, setCurrentDoctor } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLinkAccount = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!employeeId) {
      setError('กรุณากรอกรหัสพนักงาน');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: liffProfile.userId,
          employeeId: employeeId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentDoctor(data.doctor);
        setNeedsOnboarding(false);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการผูกบัญชี');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-sky-900/5 max-w-sm w-full border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-[#006699]" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">ลงทะเบียนเข้าใช้งานครั้งแรก</h1>
          <p className="text-sm text-slate-500 mt-2">
            กรุณาระบุรหัสพนักงานของคุณเพื่อผูกกับบัญชี LINE
          </p>
        </div>

        {liffProfile && (
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl mb-6 border border-slate-200">
            <img src={liffProfile.pictureUrl} alt="Profile" className="w-10 h-10 rounded-full" />
            <div className="text-left">
              <div className="text-xs text-slate-500">บัญชี LINE ของคุณ</div>
              <div className="text-sm font-semibold text-slate-800">{liffProfile.displayName}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 mb-6">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLinkAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">รหัสพนักงาน (Employee ID)</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="เช่น DOC-001"
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#006699] focus:ring-1 focus:ring-[#006699] outline-none text-sm"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#006699] hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'ผูกบัญชี LINE'}
          </button>
        </form>
      </div>
    </div>
  );
}
