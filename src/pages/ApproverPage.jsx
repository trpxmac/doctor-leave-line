import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  Paperclip,
  FileText,
  RefreshCw,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function ApproverPage() {
  const { currentDoctor } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' or 'HISTORY'
  const [stepFilter, setStepFilter] = useState('ALL'); // 'ALL', 'STEP1', 'STEP2'

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leave-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const handleUpdate = () => fetchRequests();
    window.addEventListener('leave-status-updated', handleUpdate);
    return () => window.removeEventListener('leave-status-updated', handleUpdate);
  }, []);

  const handleApprove = async (reqItem) => {
    setActionLoading(true);
    try {
      const isStep1 = reqItem.current_step === 1 && reqItem.total_steps === 2;
      const res = await fetch(`/api/leave-requests/${reqItem.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_id: currentDoctor?.id || (isStep1 ? 'c0000000-0000-0000-0000-000000000011' : 'c0000000-0000-0000-0000-000000000099'),
          comments: isStep1 ? 'หัวหน้าแพทย์อนุมัติขั้นที่ 1 ส่งต่อ นพ.ปริวรรธน์ ระเด่น' : 'นพ.ปริวรรธน์ ระเด่น อนุมัติขั้นสุดท้ายเรียบร้อย'
        })
      });

      if (res.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error('Approve error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReq) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/leave-requests/${rejectModalReq.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_id: currentDoctor?.id || 'c0000000-0000-0000-0000-000000000099',
          comments: rejectReason || 'ติดภารกิจออกตรวจ / ไม่ตรงเงื่อนไข'
        })
      });

      if (res.ok) {
        setRejectModalReq(null);
        setRejectReason('');
        fetchRequests();
      }
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter based on tabs and step
  const pendingList = requests.filter(r => {
    if (r.status !== 'PENDING') return false;
    if (stepFilter === 'STEP1') return (r.current_step === 1 && r.total_steps === 2);
    if (stepFilter === 'STEP2') return (r.current_step === 2 || r.total_steps === 1);
    return true;
  });

  const allPendingCount = requests.filter(r => r.status === 'PENDING').length;
  const step1PendingCount = requests.filter(r => r.status === 'PENDING' && r.current_step === 1 && r.total_steps === 2).length;
  const step2PendingCount = requests.filter(r => r.status === 'PENDING' && (r.current_step === 2 || r.total_steps === 1)).length;

  const historyList = requests.filter(r => r.status !== 'PENDING');
  const displayedList = activeTab === 'PENDING' ? pendingList : historyList;

  // Header Role Description
  const isExecutive = currentDoctor?.roles?.includes('EXECUTIVE_APPROVER');
  const isMedicalAdmin = currentDoctor?.roles?.includes('MEDICAL_ADMIN');
  const isDeptHead = currentDoctor?.roles?.includes('DEPT_HEAD');

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${isExecutive ? 'bg-purple-700' : 'bg-emerald-600'} text-white flex items-center justify-center shadow-xs`}>
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                ศูนย์พิจารณาอนุมัติใบลาแพทย์ (Approver Portal)
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-800">
              ผู้อนุมัติ: {currentDoctor?.prefix_th}{currentDoctor?.first_name_th} {currentDoctor?.last_name_th}
            </span>
            <span className="text-slate-400">•</span>
            {isExecutive ? (
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
                ผู้ช่วยผู้อำนวยการ รพ. (ผู้อนุมัติขั้นสุดท้าย ทุกแผนก)
              </span>
            ) : isDeptHead ? (
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
                หัวหน้าแผนก (ผู้อนุมัติขั้นที่ 1)
              </span>
            ) : isMedicalAdmin ? (
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
                ฝ่ายการแพทย์ (กำกับดูแล Flow อนุมัติ 2 ขั้นตอน)
              </span>
            ) : (
              <span className="text-slate-500">{currentDoctor?.position || 'แพทย์'}</span>
            )}
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* 2-Step Flow Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-2xs">
        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#006699]" />
          <span>โครงสร้าง Flow การอนุมัติใบลา 2 ขั้นตอน (Bangkok Hospital Siriroj):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-2.5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
            <div>
              <div className="font-bold text-sky-900">แพทย์ผู้ขอลา ยื่นคำขอ</div>
              <div className="text-[10px] text-sky-700">ส่งแจ้งเตือนเข้า LINE 1-on-1</div>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
            <div>
              <div className="font-bold text-emerald-900">หัวหน้าแพทย์ประจำแผนก</div>
              <div className="text-[10px] text-emerald-700">พิจารณาขั้นที่ 1 (10 แผนก)</div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-2.5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
            <div>
              <div className="font-bold text-purple-900">นพ.ปริวรรธน์ ระเด่น</div>
              <div className="text-[10px] text-purple-700">ผช.ผอ.รพ. พิจารณาขั้นสุดท้าย</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PENDING'
                ? 'bg-[#006699] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>รอการอนุมัติ</span>
            {allPendingCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {allPendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-[#006699] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>ประวัติที่ดำเนินการแล้ว</span>
            <span className="text-[10px] text-slate-400">({historyList.length})</span>
          </button>
        </div>

        {/* Step Filter for Pending tab */}
        {activeTab === 'PENDING' && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setStepFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                stepFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({allPendingCount})
            </button>
            <button
              onClick={() => setStepFilter('STEP1')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                stepFilter === 'STEP1' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>ขั้นที่ 1: หัวหน้าแพทย์</span>
              <span className="text-[10px] bg-emerald-700/50 px-1.5 py-0.2 rounded-full">{step1PendingCount}</span>
            </button>
            <button
              onClick={() => setStepFilter('STEP2')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                stepFilter === 'STEP2' ? 'bg-purple-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>ขั้นที่ 2: นพ.ปริวรรธน์ (ผช.ผอ.)</span>
              <span className="text-[10px] bg-purple-700/50 px-1.5 py-0.2 rounded-full">{step2PendingCount}</span>
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">กำลังโหลดรายการคำขอ...</div>
      ) : displayedList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">
            {activeTab === 'PENDING' ? 'ไม่มีคำขอที่รอการอนุมัติในหมวดนี้' : 'ยังไม่มีประวัติการพิจารณา'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            เมื่อแพทย์ยื่นใบลา ระบบจะส่งข้อความแจ้งเตือน 1-on-1 เข้า LINE และแสดงที่นี่ทันที
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedList.map(req => {
            const isPending = req.status === 'PENDING';
            const isStep1 = req.current_step === 1 && req.total_steps === 2;
            const isStep2 = req.current_step === 2 || req.total_steps === 1;

            const periodText = req.half_day_type === 'MORNING' ? ' (ครึ่งวันเช้า)' :
                               req.half_day_type === 'AFTERNOON' ? ' (ครึ่งวันบ่าย)' : '';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl p-5 border shadow-2xs transition-all ${
                  req.is_emergency ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
                }`}
              >
                {/* Top Row: Doctor Info & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                      <img
                        src={req.doctor?.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100'}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {req.doctor?.name || 'แพทย์'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {req.doctor?.doctor_type === 'FULL_TIME' ? 'แพทย์ประจำ FT' : 'แพทย์พาร์ทไทม์ PT'}
                        </span>
                        {req.is_emergency && (
                          <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            🚨 ลาฉุกเฉิน
                          </span>
                        )}
                        {req.is_exception && (
                          <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                            ⚠️ เกินโควตาแผนก
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        รหัสแพทย์: <span className="font-mono">{req.doctor?.employee_id}</span>
                        {req.doctor?.license_no && (
                          <span className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 ml-1.5 text-[11px] font-semibold">
                            {req.doctor.license_no}
                          </span>
                        )} • <span className="font-semibold text-slate-700">{req.doctor?.department_name || 'อายุรกรรม'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                      {req.request_no}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                      req.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                      isStep2 ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-300' :
                      'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                    }`}>
                      {req.status === 'APPROVED' ? 'อนุมัติสมบูรณ์แล้ว' :
                       req.status === 'REJECTED' ? 'ไม่อนุมัติ' :
                       req.status === 'CANCELLED' ? 'ยกเลิกแล้ว' :
                       isStep2 ? 'รอ นพ.ปริวรรธน์ (ขั้นที่ 2)' : 'รอหัวหน้าแพทย์ (ขั้นที่ 1)'}
                    </span>
                  </div>
                </div>

                {/* 2-Step Flow Progress Tracker Indicator */}
                <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-semibold text-slate-600">สถานะขั้นตอนการอนุมัติ (Approval Pipeline):</span>
                    <span className="font-mono font-bold text-slate-500">
                      {req.status === 'APPROVED' ? 'ผ่านครบทั้ง 2 ขั้นตอน' : `ขั้นที่ ${req.current_step || 1} จาก ${req.total_steps || 2}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Step 1 Box */}
                    <div className={`p-2 rounded-lg border flex items-center justify-between ${
                      req.status === 'APPROVED' || req.current_step > 1
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold'
                        : req.status === 'REJECTED' && req.current_step === 1
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-amber-50/70 border-amber-200 text-amber-900 font-semibold animate-pulse'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                        <span>ขั้นที่ 1: หัวหน้าแพทย์</span>
                      </div>
                      <span className="text-[10px]">
                        {req.status === 'APPROVED' || req.current_step > 1 ? '✅ ผ่านแล้ว' : '⏳ รอพิจารณา'}
                      </span>
                    </div>

                    {/* Step 2 Box */}
                    <div className={`p-2 rounded-lg border flex items-center justify-between ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold'
                        : req.status === 'REJECTED' && req.current_step === 2
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : req.current_step === 2
                        ? 'bg-purple-50 border-purple-200 text-purple-900 font-semibold animate-pulse'
                        : 'bg-slate-100/70 border-slate-200 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                        <span>ขั้นที่ 2: นพ.ปริวรรธน์ (ผช.ผอ.)</span>
                      </div>
                      <span className="text-[10px]">
                        {req.status === 'APPROVED' ? '✅ อนุมัติสมบูรณ์' : req.current_step === 2 ? '⏳ รอพิจารณา' : 'รอดำเนินการ'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="py-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">ประเภทการลา:</span>
                    <span className="font-bold text-sm text-[#006699] mt-0.5 block">
                      {req.leave_type?.name_th}
                    </span>
                    {req.reimbursement_requested !== null && req.reimbursement_requested !== undefined && (
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        req.reimbursement_requested
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {req.reimbursement_requested ? '💰 ต้องการเบิกค่าใช้จ่าย' : 'ไม่เบิกค่าใช้จ่าย'}
                      </span>
                    )}
                    {req.swap_date && (
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        🔄 สลับออกตรวจกับวันที่: {req.swap_date}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">วันที่ขอลา:</span>
                    <span className="font-bold text-slate-800 mt-0.5 block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {req.start_date === req.end_date ? (
                        `${req.start_date}${periodText}`
                      ) : (
                        `${req.start_date} ถึง ${req.end_date}`
                      )}
                      <span className="text-slate-500 font-normal">({req.duration_days} วัน)</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">เอกสารแนบ:</span>
                    <div className="mt-0.5">
                      {req.upload_later ? (
                        <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                          ⏳ ติ๊กเลือกแนบตามหลัง ภายใน 3 วัน
                        </span>
                      ) : req.attachments && req.attachments.length > 0 ? (
                        <span className="text-sky-700 font-medium flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5" />
                          แนบเอกสารแล้ว ({req.attachments.length} ไฟล์)
                        </span>
                      ) : (
                        <span className="text-slate-400">ไม่มีเอกสาร</span>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <span className="text-slate-400 block font-medium">เหตุผลความจำเป็น:</span>
                    <p className="mt-1 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                      {req.reason || 'ไม่ระบุเหตุผล'}
                    </p>
                  </div>
                </div>

                {/* Approver Action Buttons (1-Click Approve / Reject) */}
                {isPending ? (
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2">
                    <button
                      onClick={() => setRejectModalReq(req)}
                      disabled={actionLoading}
                      className="w-full sm:w-auto px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>ระบุเหตุผล / ไม่อนุมัติ</span>
                    </button>

                    <button
                      onClick={() => handleApprove(req)}
                      disabled={actionLoading}
                      className={`w-full sm:w-auto px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-98 ${
                        isStep1
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-purple-700 hover:bg-purple-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isStep1
                          ? '✅ อนุมัติขั้นที่ 1 (ส่งต่อ นพ.ปริวรรธน์ ระเด่น)'
                          : '✅ อนุมัติขั้นสุดท้าย (Final Approve - นพ.ปริวรรธน์)'}
                      </span>
                    </button>
                  </div>
                ) : (
                  req.approval_logs && req.approval_logs.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                      <span className="font-semibold text-slate-700 block">ประวัติการพิจารณา:</span>
                      {req.approval_logs.map((log, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg">
                          <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold">
                              {log.step_order || idx + 1}
                            </span>
                            <strong>{log.action}</strong> โดย {log.comments || 'อนุมัติเรียบร้อย'}
                          </span>
                          <span className="text-slate-400">
                            {new Date(log.acted_at).toLocaleString('th-TH')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" />
              ระบุเหตุผลที่ไม่อนุมัติใบลา
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ใบลาเลขที่ <span className="font-mono font-bold text-slate-700">{rejectModalReq.request_no}</span> ของ {rejectModalReq.doctor?.name}
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น ติดภารกิจออกตรวจ, โควตาแพทย์ไม่เพียงพอ..."
              className="w-full h-24 p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalReq(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                ยืนยันการไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
