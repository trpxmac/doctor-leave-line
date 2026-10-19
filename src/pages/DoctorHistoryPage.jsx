import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Sparkles,
  ArrowRight,
  ShieldAlert,
  X,
  Check
} from 'lucide-react';

export default function DoctorHistoryPage() {
  const { currentDoctor } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Late Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedReqForUpload, setSelectedReqForUpload] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toastSuccess, setToastSuccess] = useState('');

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

  // Handle direct uploadId from LINE reminder link
  useEffect(() => {
    if (requests.length === 0) return;
    const params = new URLSearchParams(location.search);
    const uploadId = params.get('uploadId');
    if (uploadId) {
      const target = requests.find(r => r.id === uploadId);
      if (target && target.upload_later) {
        setSelectedReqForUpload(target);
        setUploadModalOpen(true);
      }
    }
  }, [requests, location.search]);

  const handleLateUpload = async (e) => {
    e.preventDefault();
    if (!selectedReqForUpload || selectedFiles.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('attachments', selectedFiles[i]);
      }
      const res = await fetch(`/api/leave-requests/${selectedReqForUpload.id}/attachments`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error((await res.json()).error || 'ไม่สามารถอัปโหลดไฟล์ได้');
      setToastSuccess(`แนบเอกสารสำหรับใบลา ${selectedReqForUpload.request_no} เรียบร้อยแล้ว`);
      setUploadModalOpen(false);
      setSelectedFiles([]);
      fetchHistoryAndBalances();
      setTimeout(() => setToastSuccess(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#006699]" />
              <span>สิทธิ์วันลาคงเหลือประจำปี ({new Date().getFullYear()})</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ตรวจสอบโควตาวันลาคงเหลือ สิทธิ์ที่ใช้ไปแล้ว และยอดคำขอที่อยู่ระหว่างรออนุมัติ
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-[#006699] hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-bold transition-all self-start sm:self-auto"
          >
            <span>ไปหน้ายื่นใบลา</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {balances.length === 0 ? (
            <div className="col-span-full text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              {currentDoctor?.doctor_type === 'PART_TIME'
                ? 'แพทย์พาร์ทไทม์ไม่มีโควตาวันลาพักร้อน (สามารถยื่นลาไม่รับค่าตอบแทนได้ตามจริง)'
                : 'กำลังโหลดสิทธิ์วันลาคงเหลือ...'}
            </div>
          ) : (
            balances.map(b => {
              const isFull = Number(b.remaining_days) <= 0;
              const used = Number(b.used_days || 0);
              const pending = Number(b.pending_days || 0);
              const total = Number(b.total_quota || 0);
              const pct = total > 0 ? Math.min(100, Math.max(0, (Number(b.remaining_days) / total) * 100)) : 0;

              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isFull
                      ? 'bg-rose-50/70 border-rose-200 shadow-2xs'
                      : 'bg-white border-slate-200/90 hover:border-sky-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {b.leave_type_name}
                      </span>
                      {isFull ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                          โควตาเต็ม
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                          คงเหลือ
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between my-1">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-black ${isFull ? 'text-rose-600' : 'text-[#006699]'}`}>
                          {b.remaining_days}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">วัน</span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        โควตาเต็ม {total} วัน
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden my-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull
                            ? 'bg-rose-500'
                            : pct < 25
                            ? 'bg-amber-500'
                            : 'bg-[#006699]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>ใช้แล้ว: <strong className="text-slate-700">{used}</strong> วัน</span>
                    {pending > 0 ? (
                      <span className="text-amber-600 font-semibold">(รออนุมัติ {pending} วัน)</span>
                    ) : (
                      <span className="text-slate-400">ไม่มีคำขอค้าง</span>
                    )}
                  </div>
                </div>
              );
            })
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
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                    {req.upload_later ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          ⏳ รอแนบเอกสาร (กำหนด: {req.attachment_due_date ? new Date(req.attachment_due_date).toLocaleDateString('th-TH') : 'ภายใน 3 วัน'})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReqForUpload(req);
                            setUploadModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#006699] hover:bg-[#005580] text-white font-bold text-[11px] shadow-xs transition-all"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>แนบเอกสารตอนนี้</span>
                        </button>
                      </div>
                    ) : req.attachments && req.attachments.length > 0 ? (
                      <span className="flex items-center gap-1 text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        <Paperclip className="w-3.5 h-3.5 text-[#006699]" />
                        แนบเอกสารแล้ว ({req.attachments.length} ไฟล์)
                      </span>
                    ) : (
                      <span className="text-slate-400">ไม่มีเอกสารแนบ</span>
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

      {/* Toast Notification */}
      {toastSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4" />
          <span>{toastSuccess}</span>
        </div>
      )}

      {/* Late Attachment Upload Modal */}
      {uploadModalOpen && selectedReqForUpload && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-[#006699]" />
                  <span>แนบเอกสารย้อนหลัง</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ใบลาเลขที่ <strong className="font-mono text-slate-700">{selectedReqForUpload.request_no}</strong> ({selectedReqForUpload.leave_type_name || 'ใบลา'})
                </p>
              </div>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLateUpload} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เลือกไฟล์เอกสาร (ใบรับรองแพทย์ / หนังสือเชิญ)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/png,image/jpeg"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-100 file:text-[#006699] hover:file:bg-sky-200"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  รองรับไฟล์รูปภาพ JPG, PNG และ PDF (สูงสุด 3 ไฟล์)
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={uploading || selectedFiles.length === 0}
                  className="px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold transition-all disabled:opacity-50"
                >
                  {uploading ? 'กำลังอัปโหลด...' : 'ยืนยันอัปโหลดเอกสาร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
