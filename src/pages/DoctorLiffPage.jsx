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
  Check,
  Info,
  Send,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  FileText,
  CalendarDays
} from 'lucide-react';

// Helper for Instant Real-Time Duration Calculation (Working Days vs Calendar Days)
function getClientCalculatedDuration(startDate, endDate, halfDayType, countMode = 'WORKING_DAYS') {
  if (!startDate) return 0;
  if (halfDayType === 'MORNING' || halfDayType === 'AFTERNOON') {
    return 0.5;
  }
  const end = endDate || startDate;
  const startD = new Date(startDate);
  startD.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(0, 0, 0, 0);

  if (startD > endD) return 1;

  if (countMode === 'CALENDAR_DAYS') {
    const diffTime = Math.abs(endD - startD);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // WORKING_DAYS (skip Saturday = 6 and Sunday = 0)
  let days = 0;
  const current = new Date(startD);
  while (current <= endD) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  return Math.max(1, days);
}

export default function DoctorLiffPage() {
  const { currentDoctor, doctors, refreshDoctors } = useAuth();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [contactSettings, setContactSettings] = useState({
    department_name: 'ฝ่ายการแพทย์ (Medical Affairs)',
    coordinator_name: 'คุณสิริมาศ',
    phone_emergency: '076-361-888',
    phone_ext: '1234'
  });

  useEffect(() => {
    fetch('/api/settings/contact')
      .then(res => res.json())
      .then(data => {
        if (data && data.phone_emergency) setContactSettings(data);
      })
      .catch(() => { });
  }, []);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [halfDayType, setHalfDayType] = useState('FULL_DAY');
  const [reason, setReason] = useState('');
  const [uploadLater, setUploadLater] = useState(false);
  const [files, setFiles] = useState([]);

  // Shift Conflict & Duty Handover State (Feature #26)
  const [shiftConflict, setShiftConflict] = useState(null);
  const [substituteDoctorId, setSubstituteDoctorId] = useState('');
  const [dutyHandoverNotes, setDutyHandoverNotes] = useState('');

  // Quota Status & Duration Preview
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [durationPreview, setDurationPreview] = useState(null);
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

  // Live Calculate Duration (with Working Days & Holidays check)
  useEffect(() => {
    if (!startDate || !selectedType) return;
    const finalEnd = halfDayType !== 'FULL_DAY' ? startDate : (endDate || startDate);

    const calc = async () => {
      try {
        const res = await fetch('/api/calculate-duration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_date: startDate,
            end_date: finalEnd,
            half_day_type: halfDayType,
            leave_type_id: selectedType.id
          })
        });
        if (res.ok) {
          const data = await res.json();
          setDurationPreview(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    calc();
  }, [startDate, endDate, halfDayType, selectedType]);

  // Live Shift Conflict Check (Feature #26)
  useEffect(() => {
    if (!currentDoctor || !startDate) return;
    const finalEnd = halfDayType !== 'FULL_DAY' ? startDate : (endDate || startDate);

    const checkShifts = async () => {
      try {
        const res = await fetch(`/api/shifts/check-conflict?doctor_id=${currentDoctor.id}&start_date=${startDate}&end_date=${finalEnd}&half_day_type=${halfDayType}`);
        if (res.ok) {
          const data = await res.json();
          setShiftConflict(data);
        }
      } catch (err) {
        console.error('Shift conflict check error:', err);
      }
    };
    checkShifts();
  }, [currentDoctor, startDate, endDate, halfDayType]);

  // Department Colleagues for Handover
  const departmentColleagues = (doctors || []).filter(
    d => d.id !== currentDoctor?.id && d.department_id === currentDoctor?.department_id && d.is_active
  );

  // Real-time Duration & Leave Balance Calculations
  const countMode = selectedType?.count_mode || 'WORKING_DAYS';
  const currentFinalEnd = halfDayType !== 'FULL_DAY' ? startDate : (endDate || startDate);
  const clientDays = getClientCalculatedDuration(startDate, currentFinalEnd, halfDayType, countMode);
  const activeDuration = durationPreview?.duration_days !== undefined ? Number(durationPreview.duration_days) : clientDays;
  const fullDayDuration = getClientCalculatedDuration(startDate, endDate || startDate, 'FULL_DAY', countMode);

  const selectedBalance = balances.find(b => b.leave_type_id === selectedType?.id);
  const remainingDays = selectedBalance !== undefined ? Number(selectedBalance.remaining_days) : null;
  const isPersonalQuotaExhausted = selectedBalance !== undefined && remainingDays !== null && remainingDays <= 0;
  const isRequestedExceeded = selectedBalance !== undefined && remainingDays !== null && activeDuration > remainingDays;
  const isDeptQuotaFull = Boolean(quotaInfo && quotaInfo.status === 'FULL' && !isEmergency);
  const isBlockedByQuota = isPersonalQuotaExhausted || isRequestedExceeded || isDeptQuotaFull;

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) {
      setErrorMessage('กรุณาเลือกประเภทการลา');
      return;
    }

    // Quota Full Checks
    if (isPersonalQuotaExhausted) {
      setErrorMessage(`ไม่สามารถยื่นลาได้ เนื่องจากสิทธิ์${selectedType.name_th}คงเหลือ 0 วัน (โควตาเต็ม)`);
      return;
    }
    if (isRequestedExceeded) {
      setErrorMessage(`สิทธิ์วันลาคงเหลือไม่เพียงพอ (ต้องการลา ${durationPreview.duration_days} วัน แต่คงเหลือ ${remainingDays} วัน)`);
      return;
    }
    if (isDeptQuotaFull) {
      setErrorMessage(`โควตาการลาของแผนก${quotaInfo.department_name}ในวันที่เลือกเต็มแล้ว (${quotaInfo.current_on_leave}/${quotaInfo.max_allowed} ท่าน) ไม่สามารถยื่นลาได้`);
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('กรุณาระบุเหตุผลการลา');
      return;
    }
    if (shiftConflict?.requires_substitute && !substituteDoctorId) {
      setErrorMessage('คำขอนี้ชนกับเวรสำคัญ (ER / Night Duty) กรุณาระบุแพทย์ผู้ปฏิบัติหน้าที่แทน');
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
      if (substituteDoctorId) {
        formData.append('substitute_doctor_id', substituteDoctorId);
      }
      if (dutyHandoverNotes) {
        formData.append('duty_handover_notes', dutyHandoverNotes);
      }

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
      setSubstituteDoctorId('');
      setDutyHandoverNotes('');
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
              <span className="text-sky-200 text-[11px] font-mono">
                ({currentDoctor.employee_id}{currentDoctor.license_no ? ` • ${currentDoctor.license_no}` : ''})
              </span>
            </div>
            <span className="text-sky-200 bg-sky-950/30 px-2 py-0.5 rounded text-[11px]">
              แผนก{currentDoctor.department_name || 'อายุรกรรม'}
            </span>
          </div>
        </div>



        {/* Leave Request Form */}
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
                const bal = balances.find(b => b.leave_type_id === lt.id);
                const hasQuota = bal !== undefined;
                const isFull = hasQuota && Number(bal.remaining_days) <= 0;

                return (
                  <button
                    type="button"
                    key={lt.id}
                    onClick={() => setSelectedType(lt)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-300 relative flex flex-col justify-between overflow-hidden group ${isSelected
                        ? isFull
                          ? 'border-rose-400 bg-gradient-to-br from-rose-50 to-white shadow-md ring-1 ring-rose-400'
                          : 'border-[#006699] bg-gradient-to-br from-sky-50 to-white shadow-md shadow-sky-900/10 ring-1 ring-[#006699]'
                        : isFull
                          ? 'border-rose-200/90 bg-rose-50/30 hover:border-rose-300'
                          : 'border-slate-200 hover:border-sky-300 hover:shadow-sm hover:-translate-y-0.5 bg-white'
                      }`}
                  >
                    {isSelected && (
                      <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-full -mr-2 -mt-2 ${isFull ? 'bg-rose-200/40' : 'bg-sky-200/30'}`} />
                    )}
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-xs font-bold text-slate-800">{lt.name_th}</span>
                      <div className="flex items-center gap-1.5">
                        {isFull && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                            โควตาเต็ม
                          </span>
                        )}
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: isFull ? '#ef4444' : (lt.color || '#0ea5e9') }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between gap-1 flex-wrap">
                      <span>{lt.allows_half_day ? 'ลาครึ่งวันได้' : 'เต็มวันเท่านั้น'}</span>
                      {hasQuota ? (
                        isSelected && activeDuration > 0 ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px] flex items-center gap-1">
                            <span className="text-slate-400 line-through text-[9px]">{bal.remaining_days}</span>
                            <span>เหลือ {Math.max(0, Number(bal.remaining_days) - activeDuration)} วัน</span>
                            <span className="text-rose-600 font-extrabold text-[9px]">(-{activeDuration})</span>
                          </span>
                        ) : (
                          <span className={`font-semibold ${isFull ? 'text-rose-600 font-bold' : 'text-[#006699]'}`}>
                            เหลือ {bal.remaining_days} วัน
                          </span>
                        )
                      ) : (
                        <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          lt.code === 'UNPAID'
                            ? 'text-slate-600 bg-slate-100 border border-slate-200/80'
                            : 'text-amber-700 bg-amber-50 border border-amber-200/60'
                        }`}>
                          {lt.code === 'UNPAID' ? 'ไม่จำกัดสิทธิ์' : 'ตามเกณฑ์ รพ.'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quota Exhausted Alert */}
            {isPersonalQuotaExhausted && (
              <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">สิทธิ์วันลาคงเหลือหมดแล้ว (โควตาเต็ม 0 วัน):</strong>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-rose-700">
                    ท่านใช้สิทธิ์ <strong>{selectedType?.name_th}</strong> ครบตามโควตาประจำปีแล้ว ระบบไม่อนุญาตให้กดส่งใบลาประเภทนี้ (ปุ่มส่งใบลาถูกปิดใช้งาน)
                  </p>
                </div>
              </div>
            )}

            {isRequestedExceeded && !isPersonalQuotaExhausted && (
              <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">จำนวนวันลาเกินสิทธิ์คงเหลือ:</strong>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                    ท่านเลือกวันลา {activeDuration} วัน แต่มีสิทธิ์คงเหลือ {remainingDays} วัน กรุณาปรับลดจำนวนวันลา
                  </p>
                </div>
              </div>
            )}
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
                    const newStart = e.target.value;
                    setStartDate(newStart);
                    if (newStart > endDate) setEndDate(newStart);
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  3. ระยะเวลาการลา
                </label>
                <span className="text-[11px] font-bold text-[#006699] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 animate-in fade-in">
                  รวมวันลา: {activeDuration} วัน
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'FULL_DAY', label: `เต็มวัน (${fullDayDuration.toFixed(1)} วัน)` },
                  { id: 'MORNING', label: 'ครึ่งวันเช้า (0.5 วัน)' },
                  { id: 'AFTERNOON', label: 'ครึ่งวันบ่าย (0.5 วัน)' }
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setHalfDayType(opt.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition-all ${halfDayType === opt.id
                        ? 'bg-[#006699] text-white border-[#006699] shadow-xs font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Duration Calculation Card */}
          <div className="p-3 bg-sky-50/90 border border-sky-100 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#006699]" />
              <div>
                <span className="font-semibold text-slate-700">คำนวณวันลาสุทธิ: </span>
                <span className="font-bold text-[#006699] text-sm">{activeDuration} วัน</span>
                <span className="text-[10px] text-slate-500 ml-1">
                  ({countMode === 'WORKING_DAYS' ? 'นับเฉพาะวันทำการ' : 'นับทุกวันตามปฏิทิน'})
                </span>
              </div>
            </div>
            {durationPreview?.holidays_in_range?.length > 0 && (
              <span
                className="text-[10px] bg-white text-[#006699] font-bold px-2 py-0.5 rounded-full border border-sky-200"
                title={durationPreview.holidays_in_range.map(h => `${h.holiday_date}: ${h.name_th}`).join(', ')}
              >
                เว้นวันหยุด รพ. {durationPreview.holidays_in_range.length} วัน
              </span>
            )}
          </div>

          {/* Department Quota Indicator Box */}
          {quotaInfo && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${quotaInfo.status === 'FULL'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : quotaInfo.status === 'NEAR_LIMIT'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${quotaInfo.status === 'FULL' ? 'bg-rose-500' :
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

          {/* Department Quota Full Alert */}
          {quotaInfo?.status === 'FULL' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">โควตาแพทย์ลาของแผนกเต็มแล้ว ({quotaInfo.current_on_leave} / {quotaInfo.max_allowed} ท่าน):</strong>
                <p className="text-[11px] mt-0.5 leading-relaxed text-rose-700">
                  ระบบจำกัดแพทย์ลาพร้อมกันไม่เกิน {quotaInfo.max_allowed} ท่านต่อวันเพื่อความปลอดภัยของผู้ป่วย จึงไม่สามารถกดส่งใบลาในวันที่เลือกได้ หากมีเหตุจำเป็นเร่งด่วน กรุณาติดต่อหัวหน้าแผนกหรือฝ่ายการแพทย์
                </p>
              </div>
            </div>
          )}

          {/* Shift Collision Alert & Substitute Doctor Handover (Feature #26) */}
          {shiftConflict && shiftConflict.has_conflict && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-300 rounded-2xl p-3.5 shadow-sm space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <h4 className="text-xs font-bold text-amber-950">
                      ตรวจพบตารางเวรตรงกับวันลา ({shiftConflict.conflict_count} รายการ)
                    </h4>
                    {shiftConflict.requires_substitute && (
                      <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
                        ต้องระบุผู้รับเวรแทน
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {shiftConflict.conflicts.map((conf, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/90 rounded-lg px-2.5 py-1.5 text-[11px] border border-amber-200/80">
                        <span className="font-semibold text-slate-800">
                          📅 {conf.shift_date} • <span className="text-amber-800 font-bold">{conf.shift_label}</span> ({conf.time})
                        </span>
                        <span className="text-[10px] text-slate-500">{conf.notes || 'เวรประจำ'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Handover & Substitute Doctor Picker */}
              <div className="pt-2 border-t border-amber-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  👨‍⚕️ แพทย์ผู้ปฏิบัติหน้าที่แทน (Substitute Doctor) {shiftConflict.requires_substitute && <span className="text-rose-500">*</span>}
                </label>
                <select
                  value={substituteDoctorId}
                  onChange={(e) => setSubstituteDoctorId(e.target.value)}
                  className="w-full text-xs font-medium border border-amber-300 rounded-xl px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#006699] outline-hidden"
                >
                  <option value="">-- เลือกแพทย์ผู้รับเวรแทนในแผนก --</option>
                  {departmentColleagues.map((colleague) => (
                    <option key={colleague.id} value={colleague.id}>
                      {colleague.prefix_th}{colleague.first_name_th} {colleague.last_name_th} ({colleague.doctor_type === 'FULL_TIME' ? 'แพทย์ประจำ' : 'พาร์ทไทม์'})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="บันทึกส่งมอบเวร / ข้อมูลเคสคนไข้สำคัญ (Handover Notes)"
                  value={dutyHandoverNotes}
                  onChange={(e) => setDutyHandoverNotes(e.target.value)}
                  className="w-full text-xs border border-amber-200 rounded-xl px-3 py-2 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#006699] outline-hidden"
                />
              </div>
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
            disabled={submitting || isBlockedByQuota}
            className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-all duration-300 ${submitting || isBlockedByQuota
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#006699] to-[#008b8b] hover:shadow-floating hover:-translate-y-0.5 active:scale-[0.98]'
              }`}
          >
            {submitting ? (
              <span>กำลังประมวลผลและส่ง LINE...</span>
            ) : isPersonalQuotaExhausted ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>🚫 สิทธิ์วันลาหมดแล้ว (โควตาเต็ม 0 วัน) ไม่สามารถยื่นได้</span>
              </>
            ) : isRequestedExceeded ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>🚫 จำนวนวันลาเกินสิทธิ์คงเหลือ (เหลือ {remainingDays} วัน)</span>
              </>
            ) : isDeptQuotaFull ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>🚫 โควตาแพทย์ลาของแผนกเต็มแล้ว ({quotaInfo?.current_on_leave}/{quotaInfo?.max_allowed} ท่าน)</span>
              </>
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

      {/* Centered Success Modal Pop-up (Guaranteed visible anywhere on screen) */}
      {successResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle className="w-9 h-9" />
            </div>

            <h3 className="text-base font-bold text-slate-800">
              ยื่นใบลาสำเร็จเรียบร้อย!
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              ระบบได้ส่ง LINE Flex Message แบบ 1-on-1 ไปยังหัวหน้าแผนกเรียบร้อยแล้ว
            </p>

            {/* Leave Details Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2.5 mb-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">เลขที่ใบลา:</span>
                <span className="font-mono font-bold text-[#006699] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {successResult.request?.request_no}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ประเภทการลา:</span>
                <span className="font-bold text-slate-800">
                  {selectedType?.name_th || 'ใบลาแพทย์'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ช่วงวันที่ลา:</span>
                <span className="font-semibold text-slate-800">
                  {successResult.request?.start_date}
                  {successResult.request?.end_date && successResult.request.end_date !== successResult.request.start_date
                    ? ` ถึง ${successResult.request.end_date}`
                    : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">จำนวนวันลา:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  {successResult.request?.duration_days} วัน
                </span>
              </div>

              {successResult.quota_warning && (
                <div className="p-2 bg-amber-50 text-amber-800 rounded-lg text-[11px] font-medium border border-amber-200 mt-2">
                  ⚠️ {successResult.quota_warning}
                </div>
              )}
              {successResult.line_quota_error && (
                <div className="p-2 bg-rose-50 text-rose-800 rounded-lg text-[11px] font-medium border border-rose-200 mt-2">
                  ⚠️ โควตาข้อความ LINE เต็ม กรุณาโทรแจ้งหัวหน้าแผนกโดยตรง
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    if (window.liff && window.liff.isInClient && window.liff.isInClient()) {
                      window.liff.closeWindow();
                    } else {
                      setSuccessResult(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  } catch {
                    setSuccessResult(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="w-full bg-[#006699] hover:bg-[#005580] text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>ปิดหน้าต่าง (กลับเข้าแชท LINE)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยื่นใบลาเพิ่มเติม / ตรวจสอบสิทธิ์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
