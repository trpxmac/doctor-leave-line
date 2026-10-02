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
  MessageSquare
} from 'lucide-react';

export default function ApproverPage() {
  const { currentDoctor } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' or 'HISTORY'

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

  const handleApprove = async (reqId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/leave-requests/${reqId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_id: currentDoctor?.id || 'c0000000-0000-0000-0000-000000000002',
          comments: 'อนุมัติเรียบร้อยตามระเบียบ'
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
          approver_id: currentDoctor?.id || 'c0000000-0000-0000-0000-000000000002',
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

  const pendingList = requests.filter(r => r.status === 'PENDING');
  const historyList = requests.filter(r => r.status !== 'PENDING');
  const displayedList = activeTab === 'PENDING' ? pendingList : historyList;

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              ศูนย์พิจารณาอนุมัติใบลาแพทย์ (Approver Portal)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ผู้อนุมัติ: {currentDoctor?.prefix_th}{currentDoctor?.first_name_th} {currentDoctor?.last_name_th} • หัวหน้าแผนกอายุรกรรม
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

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'PENDING'
              ? 'bg-[#006699] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>รอการอนุมัติ</span>
          {pendingList.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {pendingList.length}
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

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">กำลังโหลดรายการคำขอ...</div>
      ) : displayedList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">
            {activeTab === 'PENDING' ? 'ไม่มีคำขอที่รอการอนุมัติในขณะนี้' : 'ยังไม่มีประวัติการพิจารณา'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            เมื่อแพทย์ในแผนกยื่นใบลา ระบบจะส่งข้อความแจ้งเตือน 1-on-1 เข้า LINE และแสดงที่นี่ทันที
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedList.map(req => {
            const isPending = req.status === 'PENDING';
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
                      <div className="flex items-center gap-2">
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
                        รหัสแพทย์: <span className="font-mono">{req.doctor?.employee_id}</span> • แผนก{req.doctor?.department_name || 'อายุรกรรม'}
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
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status === 'APPROVED' ? 'อนุมัติแล้ว' :
                       req.status === 'REJECTED' ? 'ไม่อนุมัติ' :
                       req.status === 'CANCELLED' ? 'ยกเลิกแล้ว' : 'รอการพิจารณา'}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">ประเภทการลา:</span>
                    <span className="font-bold text-sm text-[#006699] mt-0.5 block">
                      {req.leave_type?.name_th}
                    </span>
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
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading}
                      className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-98"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>อนุมัติทันที (1-Click Approve)</span>
                    </button>
                  </div>
                ) : (
                  req.approval_logs && req.approval_logs.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                      <span>
                        ดำเนินการโดย: <strong className="text-slate-700">{req.approval_logs[0]?.action}</strong>
                      </span>
                      <span className="text-slate-400">
                        {new Date(req.approval_logs[0]?.acted_at).toLocaleString('th-TH')}
                      </span>
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
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น ติดภารกิจออกตรวจห้องผ่าตัด, โควตาแพทย์แผนกไม่เพียงพอ..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden mb-4"
              required
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {actionLoading ? 'กำลังบันทึก...' : 'ยืนยันการไม่อนุมัติ'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
