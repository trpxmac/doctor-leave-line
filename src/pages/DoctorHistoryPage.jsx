import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Paperclip,
  Trash2,
  RefreshCw,
  FileText,
  Sparkles
} from 'lucide-react';

export default function DoctorHistoryPage() {
  const { currentDoctor } = useAuth();
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchHistoryAndBalances = async () => {
    if (!currentDoctor) return;
    setLoading(true);
    try {
      const [reqRes, balRes] = await Promise.all([
        fetch(`/api/leave-requests?doctorId=${currentDoctor.id}`),
        fetch(`/api/balances/${currentDoctor.id}`)
      ]);
      if (reqRes.ok) setRequests(await reqRes.json());
      if (balRes.ok) setBalances(await balRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryAndBalances();
  }, [currentDoctor]);

  const handleCancel = async (requestId) => {
    if (!window.confirm('คุณต้องการยกเลิกคำขอการลานี้ใช่หรือไม่? ระบบจะทำการคืนสิทธิ์วันลาให้ทันที')) {
      return;
    }

    try {
      const res = await fetch(`/api/leave-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: currentDoctor.id,
          reason: 'แพทย์ยกเลิกคำขอด้วยตนเอง'
        })
      });

      if (res.ok) {
        fetchHistoryAndBalances();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = requests.filter(r => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            อนุมัติแล้ว
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            ไม่อนุมัติ
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            ยกเลิกแล้ว
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            รอการอนุมัติ
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#006699]" />
            ประวัติการยื่นใบลา & สิทธิ์คงเหลือ
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            แพทย์: {currentDoctor?.prefix_th}{currentDoctor?.first_name_th} {currentDoctor?.last_name_th} • แผนก{currentDoctor?.department_name}
          </p>
        </div>

        <button
          onClick={fetchHistoryAndBalances}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรชรายการ
        </button>
      </div>

      {/* Section 1: Doctor Leave Balances (สิทธิ์วันลาคงเหลือ) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#006699]" />
            <span>สิทธิ์วันลาคงเหลือประจำปี ({new Date().getFullYear()})</span>
          </h2>
          <span className="text-[10px] text-slate-400">อัปเดตแบบ Real-time</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {balances.length === 0 ? (
            <div className="col-span-full text-center py-4 text-xs text-slate-400">
              {currentDoctor?.doctor_type === 'PART_TIME'
                ? 'แพทย์พาร์ทไทม์ไม่มีโควตาวันลาพักร้อน (ยื่นลาไม่รับค่าตอบแทนได้ตามจริง)'
                : 'กำลังโหลดสิทธิ์คงเหลือ...'}
            </div>
          ) : (
            balances.map(b => (
              <div
                key={b.id}
                className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 hover:border-sky-300 transition-all shadow-2xs"
              >
                <div className="text-[11px] font-semibold text-slate-600 truncate">
                  {b.leave_type_name}
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-[#006699]">
                    {b.remaining_days}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    / {b.total_quota} วัน
                  </span>
                </div>
                {b.pending_days > 0 && (
                  <div className="text-[9px] text-amber-600 font-medium mt-0.5">
                    (รออนุมัติ {b.pending_days} วัน)
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5 bg-slate-200/60 p-1 rounded-xl">
        {[
          { id: 'ALL', label: 'ทั้งหมด' },
          { id: 'PENDING', label: 'รออนุมัติ' },
          { id: 'APPROVED', label: 'อนุมัติแล้ว' },
          { id: 'REJECTED', label: 'ไม่อนุมัติ' },
          { id: 'CANCELLED', label: 'ยกเลิก' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === tab.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400">กำลังโหลดประวัติการลา...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">ไม่พบรายการใบลาตามเงื่อนไข</h3>
          <p className="text-xs text-slate-400 mt-1">ท่านสามารถยื่นใบลาใหม่ได้ผ่านเมนู "ยื่นใบลา (LIFF)"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const isPending = req.status === 'PENDING';
            const periodText = req.half_day_type === 'MORNING' ? ' (ครึ่งวันเช้า)' :
                               req.half_day_type === 'AFTERNOON' ? ' (ครึ่งวันบ่าย)' : '';

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-card transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {req.request_no}
                    </span>
                    <span className="text-xs font-bold text-[#006699]">
                      {req.leave_type?.name_th}
                    </span>
                    {req.is_emergency && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">
                        🚨 ลาฉุกเฉิน
                      </span>
                    )}
                    {req.is_exception && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                        ⚠️ ข้อยกเว้นพิเศษ
                      </span>
                    )}
                  </div>
                  <div>
                    {getStatusBadge(req.status)}
                  </div>
                </div>

                <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">ช่วงวันที่ลา:</span>
                    <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {req.start_date === req.end_date ? (
                        <span>{req.start_date}{periodText}</span>
                      ) : (
                        <span>{req.start_date} ถึง {req.end_date}</span>
                      )}
                      <span className="text-slate-500 font-normal">({req.duration_days} วัน)</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400">เหตุผลความจำเป็น:</span>
                    <p className="text-slate-700 mt-0.5 font-medium line-clamp-2">
                      {req.reason || '-'}
                    </p>
                  </div>
                </div>

                {/* Attachments / Upload later info */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    {req.upload_later ? (
                      <span className="text-amber-600 font-medium">
                        ⏳ เลือกแนบเอกสารตามหลัง (ภายใน 3 วัน)
                      </span>
                    ) : req.attachments && req.attachments.length > 0 ? (
                      <span className="flex items-center gap-1 text-sky-600 font-medium">
                        <Paperclip className="w-3.5 h-3.5" />
                        แนบเอกสารแล้ว ({req.attachments.length} ไฟล์)
                      </span>
                    ) : (
                      <span>ไม่มีเอกสารแนบ</span>
                    )}
                  </div>

                  {/* Actions */}
                  {isPending && (
                    <button
                      onClick={() => handleCancel(req.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ขอยกเลิกคำขอนี้
                    </button>
                  )}
                </div>

                {/* Approval Comments if any */}
                {req.approval_logs && req.approval_logs.length > 0 && (
                  <div className="mt-2.5 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">บันทึกการพิจารณา:</span>{' '}
                    {req.approval_logs[req.approval_logs.length - 1].comments || 'ดำเนินการแล้ว'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
