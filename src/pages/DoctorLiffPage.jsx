import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Phone,
  Paperclip,
  CheckCircle,
  Info,
  Send,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

export default function DoctorLiffPage() {
  const { currentDoctor, refreshDoctors } = useAuth();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [selectedType, setSelectedType] = useState(null);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [halfDayType, setHalfDayType] = useState('FULL_DAY');
  const [reason, setReason] = useState('');
  const [uploadLater, setUploadLater] = useState(false);
  const [files, setFiles] = useState([]);

  // Quota Status
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Is Emergency (Same-Day)
  const isEmergency = startDate === todayStr;

  // Fetch Leave Types
  useEffect(() => {
    if (!currentDoctor) return;
    const fetchTypes = async () => {
      try {
        const res = await fetch(`/api/leave-types?doctorType=${currentDoctor.doctor_type}`);
        if (res.ok) {
          const data = await res.json();
          setLeaveTypes(data);
          if (data.length > 0 && !selectedType) {
            setSelectedType(data[0]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTypes();
  }, [currentDoctor]);

  // Fetch Balances for current doctor
  const fetchBalances = async () => {
    if (!currentDoctor) return;
    try {
      const res = await fetch(`/api/balances/${currentDoctor.id}`);
      if (res.ok) {
        const data = await res.json();
        setBalances(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [currentDoctor]);

  // Check Department Quota when date or dept changes
  useEffect(() => {
    if (!currentDoctor || !startDate) return;
    const checkQuota = async () => {
      try {
        const res = await fetch(`/api/quota-check?departmentId=${currentDoctor.department_id}&date=${startDate}`);
        if (res.ok) {
          const data = await res.json();
          setQuotaInfo(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkQuota();
  }, [currentDoctor, startDate]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) {
      setErrorMessage('กรุณาเลือกประเภทการลา');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('กรุณาระบุเหตุผลการลา');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('doctor_id', currentDoctor.id);
      formData.append('leave_type_id', selectedType.id);
      formData.append('start_date', startDate);
      formData.append('end_date', halfDayType !== 'FULL_DAY' ? startDate : endDate);
      formData.append('half_day_type', halfDayType);
      formData.append('reason', reason);
      formData.append('upload_later', uploadLater ? 'true' : 'false');

      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
            try {
              const options = {
                maxSizeMB: 0.5, // บีบให้เหลือไม่เกิน 500KB
                maxWidthOrHeight: 1920,
                useWebWorker: true,
              };
              const compressedFile = await imageCompression(file, options);
              formData.append('attachments', compressedFile, file.name);
            } catch (error) {
              console.error('Image compression error:', error);
              formData.append('attachments', file); // หากเกิดข้อผิดพลาดให้ส่งไฟล์ต้นฉบับ
            }
          } else {
            // ไฟล์ที่ไม่ใช่รูปภาพ (เช่น PDF)
            formData.append('attachments', file);
          }
        }
      }

      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการยื่นใบลา');
      }

      setSuccessResult(data);
      fetchBalances();
      refreshDoctors();
      setReason('');
      setFiles([]);
      setUploadLater(false);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentDoctor) {
    return (
      <div className="p-8 text-center text-slate-500">
        กำลังโหลดข้อมูลแพทย์...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50/50 to-slate-200 py-4 px-3 sm:px-6 max-w-xl mx-auto flex flex-col justify-center">
      
      {/* Mobile LIFF Container Card */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-2xl overflow-hidden border border-white shadow-sky-900/10 transition-all duration-500 hover:shadow-sky-900/20">
        
        {/* Hospital Brand Header */}
        <div className="bg-gradient-to-r from-[#006699] via-[#0284c7] to-[#008b8b] text-white p-5 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 animate-pulse-subtle"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-300/20 rounded-full blur-xl -ml-10 -mb-10"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider block">
                  LINE Official Account • LIFF
                </span>
                <h1 className="text-lg font-bold leading-tight">
                  แบบฟอร์มยื่นใบลาแพทย์
                </h1>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-xs">
                {currentDoctor.doctor_type === 'FULL_TIME' ? 'แพทย์ประจำ (FT)' : 'แพทย์พาร์ทไทม์ (PT)'}
              </span>
            </div>
          </div>

          {/* Smart Profile Info Bar */}
          <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{currentDoctor.prefix_th}{currentDoctor.first_name_th} {currentDoctor.last_name_th}</span>
              <span className="text-sky-200 text-[11px]">({currentDoctor.employee_id})</span>
            </div>
            <span className="text-sky-200 bg-sky-950/30 px-2 py-0.5 rounded text-[11px]">
              แผนก{currentDoctor.department_name || 'อายุรกรรม'}
            </span>
          </div>
        </div>

        {/* Success Modal / Banner */}
        {successResult && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-200 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 text-xs">
                <h4 className="font-bold text-emerald-900 text-sm">ยื่นใบลาสำเร็จเรียบร้อย!</h4>
                <p className="text-emerald-700 mt-0.5">
                  เลขที่ใบลา: <span className="font-mono font-bold">{successResult.request.request_no}</span>
                </p>
                <p className="text-emerald-600 mt-1">
                  ระบบได้ส่ง LINE Flex Message แบบ 1-on-1 ไปยังหัวหน้าแผนกเรียบร้อยแล้ว
                </p>
                {successResult.quota_warning && (
                  <p className="mt-2 p-2 bg-amber-100/80 text-amber-800 rounded text-[11px] font-medium">
                    ⚠️ {successResult.quota_warning}
                  </p>
                )}
                <button
                  onClick={() => setSuccessResult(null)}
                  className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all"
                >
                  ยื่นใบลาเพิ่มเติม
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Alert Banner (Same-day leave detection - Goal G3) */}
        {isEmergency && (
          <div className="bg-rose-50 border-y border-rose-200 p-3.5 flex flex-col gap-2 animate-pulse-subtle">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-rose-500 text-white rounded-lg shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-800">
                  แจ้งเตือน: ท่านกำลังยื่นลาในวันปฏิบัติงาน (Same-Day Leave)
                </h4>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-snug">
                  กรุณาโทรแจ้งฝ่ายการแพทย์ (พี่กุ้ง) โดยตรงทันที เพื่อประสานงานปิดตารางออกตรวจหรือหาแพทย์ทดแทน
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <a
                href="tel:XXX-XXX-XXXX"
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>โทรหาพี่กุ้ง (XXX-XXX-XXXX)</span>
              </a>
              <div className="text-[10px] text-rose-600 font-semibold px-2 py-1 bg-white rounded border border-rose-200">
                ระบบจะส่ง Push Alert ด่วน
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Doctor Leave Balances Carousel / Grid */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              สิทธิ์วันลาคงเหลือประจำปี ({new Date().getFullYear()})
            </h2>
            <span className="text-[10px] text-slate-400">อัปเดตแบบ Real-time</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {balances.length === 0 ? (
              <div className="col-span-full text-center py-3 text-xs text-slate-400">
                {currentDoctor.doctor_type === 'PART_TIME'
                  ? 'แพทย์พาร์ทไทม์ไม่มีโควตาวันลาพักร้อน (ยื่นลาไม่รับค่าตอบแทนได้ตามจริง)'
                  : 'กำลังโหลดสิทธิ์คงเหลือ...'}
              </div>
            ) : (
              balances.map(b => (
                <div
                  key={b.id}
                  className="bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-sky-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-sky-300 transition-all duration-300 group cursor-default"
                >
                  <div className="text-[11px] font-semibold text-slate-600 truncate">
                    {b.leave_type_name}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-[#006699]">
                      {b.remaining_days}
                    </span>
                    <span className="text-[10px] text-slate-400">
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

        {/* Section 2: Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. เลือกประเภทการลา */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              1. เลือกประเภทการลา <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {leaveTypes.map(lt => {
                const isSelected = selectedType?.id === lt.id;
                return (
                  <button
                    type="button"
                    key={lt.id}
                    onClick={() => setSelectedType(lt)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-300 relative flex flex-col justify-between overflow-hidden group ${
                      isSelected
                        ? 'border-[#006699] bg-gradient-to-br from-sky-50 to-white shadow-md shadow-sky-900/10 ring-1 ring-[#006699]'
                        : 'border-slate-200 hover:border-sky-300 hover:shadow-sm hover:-translate-y-0.5 bg-white'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-12 h-12 bg-sky-200/30 rounded-bl-full -mr-2 -mt-2"></div>
                    )}
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-xs font-bold text-slate-800">{lt.name_th}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: lt.color || '#0ea5e9' }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {lt.allows_half_day ? 'ลาครึ่งวันได้' : 'เต็มวันเท่านั้น'}
                      {lt.min_notice_days > 0 && ` • ล่วงหน้า ${lt.min_notice_days} วัน`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. เลือกช่วงเวลา & วันที่ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. วันที่เริ่มต้นลา <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition-all"
                  required
                />
              </div>
            </div>

            {halfDayType === 'FULL_DAY' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ถึงวันที่ (กรณีหลายวัน)
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition-all"
                />
              </div>
            )}
          </div>

          {/* 3. รูปแบบวันลา (เต็มวัน / ครึ่งวัน) */}
          {selectedType?.allows_half_day && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3. ระยะเวลาการลา
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'FULL_DAY', label: 'เต็มวัน (1.0 วัน)' },
                  { id: 'MORNING', label: 'ครึ่งวันเช้า (0.5 วัน)' },
                  { id: 'AFTERNOON', label: 'ครึ่งวันบ่าย (0.5 วัน)' }
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setHalfDayType(opt.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                      halfDayType === opt.id
                        ? 'bg-[#006699] text-white border-[#006699] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Department Quota Indicator Box */}
          {quotaInfo && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              quotaInfo.status === 'FULL'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : quotaInfo.status === 'NEAR_LIMIT'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  quotaInfo.status === 'FULL' ? 'bg-rose-500' :
                  quotaInfo.status === 'NEAR_LIMIT' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <div>
                  <span className="font-bold">โควตาแผนก{quotaInfo.department_name}:</span>
                  <span className="ml-1">
                    ลาแล้ว {quotaInfo.current_on_leave} / {quotaInfo.max_allowed} ท่าน
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white shadow-2xs">
                {quotaInfo.status === 'FULL' ? '⚠️ โควตาเต็ม' :
                 quotaInfo.status === 'NEAR_LIMIT' ? 'ใกล้เต็ม' : 'ว่างปกติ'}
              </span>
            </div>
          )}

          {/* Exception Warning if Quota Full */}
          {quotaInfo?.status === 'FULL' && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
              💡 <strong>คำขอข้อยกเว้นพิเศษ:</strong> โควตาวันนี้เต็มแล้ว หากท่านจำเป็นต้องลาจริง ๆ สามารถส่งคำขอได้ ระบบจะส่งเตือนพี่กุ้งและหัวหน้าแผนกเป็นกรณีเร่งด่วนพิเศษ
            </div>
          )}

          {/* 4. เหตุผลการลา */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              4. เหตุผลความจำเป็นในการลา <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น ติดภารกิจครอบครัว, ป่วยมีไข้สูง, เข้าร่วมประชุมวิชาการ..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition-all"
              required
            />
          </div>

          {/* 5. เอกสารแนบ หรือ แนบตามหลัง (Doctor-Friendly UX) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                5. แนบเอกสารประกอบ (ใบรับรองแพทย์ / หนังสือเชิญ)
              </label>
              {selectedType?.requires_attachment && (
                <span className="text-[10px] text-rose-600 font-semibold">จำเป็นตามระเบียบ</span>
              )}
            </div>

            {!uploadLater && (
              <input
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg"
                onChange={(e) => setFiles(e.target.files)}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-[#006699] hover:file:bg-sky-200"
              />
            )}

            {/* Checkbox: แนบเอกสารตามหลังภายใน 3 วัน */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={uploadLater}
                onChange={(e) => setUploadLater(e.target.checked)}
                className="w-4 h-4 rounded text-[#006699] focus:ring-sky-400"
              />
              <span className="text-xs text-slate-700 font-medium">
                สะดวกแนบเอกสารตามหลัง (ภายใน 3 วัน)
              </span>
            </label>
            <p className="text-[10px] text-slate-400 italic">
              * ฟังก์ชันอำนวยความสะดวกสำหรับแพทย์ขณะใช้งานบนมือถือ ระบบจะส่ง LINE Reminder เตือนในภายหลัง
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-all duration-300 ${
              submitting
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#006699] to-[#008b8b] hover:shadow-floating hover:-translate-y-0.5 active:scale-[0.98]'
            }`}
          >
            {submitting ? (
              <span>กำลังประมวลผลและส่ง LINE...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>ยืนยันการส่งใบลา (ส่งเข้า LINE 1-on-1 ทันที)</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-slate-400">
            ระบบรักษาความปลอดภัยตามมาตรฐาน PDPA ข้อมูลจะไม่ถูกส่งเข้ากลุ่มรวมเด็ดขาด
          </p>
        </form>

      </div>
    </div>
  );
}
