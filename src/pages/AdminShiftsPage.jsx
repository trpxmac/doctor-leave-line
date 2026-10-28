import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Sparkles,
  ArrowLeftRight,
  Filter,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  ShieldAlert,
  Info
} from 'lucide-react';

const SHIFT_TYPES = [
  { id: 'OPD_MORNING', label: 'OPD เช้า', time: '08:00 - 12:00', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'OPD_AFTERNOON', label: 'OPD บ่าย', time: '13:00 - 17:00', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'IPD_ROUND', label: 'Ward Round', time: '09:00 - 13:00', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'ER_DUTY', label: 'เวร ER', time: '08:00 - 20:00', color: 'bg-rose-50 text-rose-700 border-rose-200', isHigh: true },
  { id: 'NIGHT_DUTY', label: 'เวรดึก', time: '20:00 - 08:00', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', isHigh: true },
  { id: 'ON_CALL', label: 'On-Call', time: '08:00 - 08:00', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', isHigh: true },
];

export default function AdminShiftsPage() {
  const { currentDoctor, doctors } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [viewMode, setViewMode] = useState('MATRIX'); // 'MATRIX' | 'LIST'

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  // Form State
  const [formDoctorId, setFormDoctorId] = useState('');
  const [formShiftDate, setFormShiftDate] = useState('');
  const [formShiftType, setFormShiftType] = useState('OPD_MORNING');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('16:00');
  const [formNotes, setFormNotes] = useState('');

  // Swap Form State
  const [swapShiftId, setSwapShiftId] = useState('');
  const [swapTargetDoctorId, setSwapTargetDoctorId] = useState('');
  const [swapReason, setSwapReason] = useState('');

  // Batch Form State
  const [batchOverwrite, setBatchOverwrite] = useState(false);

  // Fetch Departments on Mount
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch('/api/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartments(data);
          if (data.length > 0) {
            setSelectedDeptId(data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDepts();
  }, []);

  // Fetch Shifts
  const fetchShifts = async () => {
    if (!selectedDeptId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?department_id=${selectedDeptId}&month=${selectedMonth}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setShifts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [selectedDeptId, selectedMonth, selectedYear]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Doctors belonging to the selected department
  const deptDoctors = doctors.filter(d => d.department_id === selectedDeptId && d.is_active);

  // Calculate days in the selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Metrics
  const totalShifts = shifts.length;
  const highIntensityCount = shifts.filter(s => s.shift_type === 'ER_DUTY' || s.shift_type === 'NIGHT_DUTY').length;
  const leaveConflictCount = shifts.filter(s => s.has_leave_conflict).length;
  const coveredCount = shifts.filter(s => s.status === 'COVERED' || s.status === 'SWAPPED').length;

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Open Add Modal
  const openAddModal = (doctorId = '', day = 1) => {
    const padMonth = String(selectedMonth).padStart(2, '0');
    const padDay = String(day).padStart(2, '0');
    setFormDoctorId(doctorId || (deptDoctors[0]?.id || ''));
    setFormShiftDate(`${selectedYear}-${padMonth}-${padDay}`);
    setFormShiftType('OPD_MORNING');
    setFormStartTime('08:00');
    setFormEndTime('12:00');
    setFormNotes('');
    setEditingShift(null);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (shift) => {
    setEditingShift(shift);
    setFormDoctorId(shift.doctor_id);
    setFormShiftDate(shift.shift_date);
    setFormShiftType(shift.shift_type);
    setFormStartTime(shift.start_time || '08:00');
    setFormEndTime(shift.end_time || '16:00');
    setFormNotes(shift.notes || '');
    setShowAddModal(true);
  };

  // Save Shift (Create or Update)
  const handleSaveShift = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const url = editingShift ? `/api/shifts/${editingShift.id}` : '/api/shifts';
      const method = editingShift ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: formDoctorId,
          shift_date: formShiftDate,
          shift_type: formShiftType,
          department_id: selectedDeptId,
          start_time: formStartTime,
          end_time: formEndTime,
          notes: formNotes,
          actor_id: currentDoctor?.id
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }

      showToast(editingShift ? 'แก้ไขตารางเวรสำเร็จ' : 'เพิ่มเวรแพทย์เรียบร้อยแล้ว');
      setShowAddModal(false);
      fetchShifts();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Delete Shift
  const handleDeleteShift = async (id) => {
    if (!window.confirm('ยืนยันการลบรายการเวรนี้?')) return;
    try {
      const res = await fetch(`/api/shifts/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_id: currentDoctor?.id })
      });
      if (res.ok) {
        showToast('ลบรายการเวรสำเร็จ');
        fetchShifts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Execute Shift Swap
  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/shifts/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: swapShiftId,
          target_doctor_id: swapTargetDoctorId,
          reason: swapReason,
          actor_id: currentDoctor?.id
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'แลกเวรไม่สำเร็จ');
      }

      showToast('บันทึกการแลกเวรสำเร็จ');
      setShowSwapModal(false);
      setSwapShiftId('');
      setSwapTargetDoctorId('');
      setSwapReason('');
      fetchShifts();
    } catch (err) {
      alert(err.message);
    }
  };

  // Auto-Generate Monthly Roster
  const handleBatchGenerate = async () => {
    try {
      const res = await fetch('/api/shifts/batch-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_id: selectedDeptId,
          year: selectedYear,
          month: selectedMonth,
          overwrite: batchOverwrite,
          actor_id: currentDoctor?.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างตารางเวรไม่สำเร็จ');

      showToast(data.message);
      setShowBatchModal(false);
      fetchShifts();
    } catch (err) {
      alert(err.message);
    }
  };

  const monthNamesThai = [
    '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const currentDept = departments.find(d => d.id === selectedDeptId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#006699] via-[#0284c7] to-[#008b8b] rounded-3xl p-6 text-white shadow-xl shadow-sky-950/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
              Hospital Duty Roster & Schedule Management
            </span>
            <span className="bg-emerald-400/20 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Collision Detection Ready
            </span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <CalendarRange className="w-7 h-7 text-white" />
            ระบบบริหารจัดการตารางเวรแพทย์ (Shift Schedule)
          </h1>
          <p className="text-xs text-sky-100 max-w-2xl">
            โรงพยาบาลกรุงเทพสิริโรจน์ (BSI) • จัดตารางเวร OPD, ER, Night Duty, On-Call ตรวจจับวันลาชนเวร และระบุแพทย์ปฏิบัติหน้าที่แทนอัตโนมัติ
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSwapModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all hover:scale-102"
          >
            <ArrowLeftRight className="w-4 h-4 text-sky-200" />
            <span>แลกเวร</span>
          </button>
          <button
            onClick={() => openAddModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#006699] hover:bg-sky-50 text-xs font-bold shadow-md transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มเวรแพทย์</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#006699] flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">เวรทั้งหมดเดือนนี้</div>
            <div className="text-xl font-bold text-slate-900">{totalShifts} รายการ</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">เวร ER & Night Duty</div>
            <div className="text-xl font-bold text-slate-900">{highIntensityCount} เวร</div>
          </div>
        </div>

        <div className={`bg-white p-4 rounded-2xl border shadow-xs flex items-center gap-3 ${
          leaveConflictCount > 0 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
        }`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
            leaveConflictCount > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">ตรวจพบวันลาชนเวร</div>
            <div className={`text-xl font-bold ${leaveConflictCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {leaveConflictCount} จุดที่ชน
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">มีผู้รับเวรแทน / แลกแล้ว</div>
            <div className="text-xl font-bold text-slate-900">{coveredCount} รายการ</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Department & Month Selector & View Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Department Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-slate-700 text-xs font-bold shrink-0">
            <Building2 className="w-4 h-4 text-[#006699]" />
            <span>แผนก:</span>
          </div>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#006699] outline-hidden min-w-[200px]"
          >
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name_th} ({d.code})
              </option>
            ))}
          </select>
        </div>

        {/* Month & Year Navigator */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold text-slate-800 min-w-[140px] text-center">
            {monthNamesThai[selectedMonth]} {selectedYear + 543}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('MATRIX')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'MATRIX'
                ? 'bg-white text-[#006699] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ตารางเมทริกซ์ (Matrix)
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'LIST'
                ? 'bg-white text-[#006699] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ตารางรายการ (List)
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium">กำลังโหลดตารางเวร...</div>
      ) : viewMode === 'MATRIX' ? (
        
        /* ---------------- MATRIX VIEW ---------------- */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800">
                ตารางเวรแผนก{currentDept?.name_th} — เดือน{monthNamesThai[selectedMonth]} {selectedYear + 543}
              </span>
              <span className="text-[11px] text-slate-500">
                (แพทย์ในแผนก {deptDoctors.length} ท่าน)
              </span>
            </div>
            
            {/* Shift Color Legend */}
            <div className="hidden lg:flex items-center gap-3 text-[11px]">
              {SHIFT_TYPES.map(st => (
                <div key={st.id} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full border ${st.color.split(' ')[0]}`} />
                  <span className="text-slate-600">{st.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-600 font-bold">ชนวันลา</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-center">
                  <th className="p-3 text-left font-bold sticky left-0 bg-slate-100 z-10 min-w-[200px] border-r border-slate-200 shadow-xs">
                    แพทย์ผู้ปฏิบัติงาน
                  </th>
                  {daysArray.map(day => {
                    const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                    const dayOfWeek = dateObj.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const thaiDayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

                    return (
                      <th
                        key={day}
                        className={`p-1.5 min-w-[55px] font-semibold border-r border-slate-200 ${
                          isWeekend ? 'bg-amber-50/70 text-amber-900 font-bold' : ''
                        }`}
                      >
                        <div className="text-[10px] text-slate-400">{thaiDayNames[dayOfWeek]}</div>
                        <div className="text-xs">{day}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deptDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="p-8 text-center text-slate-400">
                      ไม่พบแพทย์ในแผนกนี้
                    </td>
                  </tr>
                ) : (
                  deptDoctors.map(doctor => {
                    const docShifts = shifts.filter(s => s.doctor_id === doctor.id);

                    return (
                      <tr key={doctor.id} className="hover:bg-slate-50/60 transition-colors">
                        
                        {/* Doctor Sticky Column */}
                        <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={doctor.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100'}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {doctor.prefix_th}{doctor.first_name_th} {doctor.last_name_th}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <span>{doctor.employee_id}</span>
                                <span>•</span>
                                <span className={doctor.doctor_type === 'FULL_TIME' ? 'text-sky-600 font-semibold' : 'text-amber-600'}>
                                  {doctor.doctor_type === 'FULL_TIME' ? 'FT' : 'PT'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Day Cells */}
                        {daysArray.map(day => {
                          const padMonth = String(selectedMonth).padStart(2, '0');
                          const padDay = String(day).padStart(2, '0');
                          const dateStr = `${selectedYear}-${padMonth}-${padDay}`;
                          const cellShifts = docShifts.filter(s => s.shift_date === dateStr);

                          const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                          const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                          return (
                            <td
                              key={day}
                              onClick={() => {
                                if (cellShifts.length === 0) {
                                  openAddModal(doctor.id, day);
                                }
                              }}
                              className={`p-1 text-center align-top border-r border-slate-100 transition-colors group cursor-pointer ${
                                isWeekend ? 'bg-amber-50/20' : ''
                              } hover:bg-sky-50/50`}
                            >
                              {cellShifts.length === 0 ? (
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-sky-400 font-bold block pt-1">
                                  +
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {cellShifts.map(shift => {
                                    const meta = SHIFT_TYPES.find(t => t.id === shift.shift_type) || {
                                      label: shift.shift_type,
                                      color: 'bg-slate-100 text-slate-700 border-slate-300'
                                    };

                                    return (
                                      <div
                                        key={shift.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditModal(shift);
                                        }}
                                        className={`rounded-md p-1 border text-[10px] font-bold leading-tight cursor-pointer transition-all hover:scale-105 relative ${meta.color} ${
                                          shift.has_leave_conflict
                                            ? 'ring-2 ring-rose-500 bg-rose-100 text-rose-800 animate-pulse'
                                            : ''
                                        }`}
                                        title={`${meta.label} (${shift.start_time}-${shift.end_time})${shift.has_leave_conflict ? ' ⚠️ ชนกับวันลา!' : ''}`}
                                      >
                                        <div className="truncate">{meta.label}</div>
                                        <div className="text-[9px] font-normal opacity-75">{shift.start_time}</div>
                                        
                                        {/* Leave Conflict Warning Badge */}
                                        {shift.has_leave_conflict && (
                                          <div className="text-[8px] bg-rose-600 text-white rounded-xs px-1 mt-0.5 font-bold">
                                            ชนใบลา
                                          </div>
                                        )}

                                        {/* Substitute Doctor Handover Badge */}
                                        {shift.substitute_doctor && (
                                          <div className="text-[8px] bg-emerald-600 text-white rounded-xs px-1 mt-0.5 truncate font-normal" title={`ผู้รับเวรแทน: ${shift.substitute_doctor.name}`}>
                                            แทน: {shift.substitute_doctor.name.split(' ')[0]}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* ---------------- LIST / TABLE VIEW ---------------- */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">
              รายการเวรแพทย์ทั้งหมดในแผนก ({shifts.length} รายการ)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">วันที่</th>
                  <th className="p-3">แพทย์</th>
                  <th className="p-3">ประเภทเวร</th>
                  <th className="p-3">เวลาปฏิบัติงาน</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3">ผู้ปฏิบัติหน้าที่แทน</th>
                  <th className="p-3">บันทึก</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      ไม่พบตารางเวรในเดือนนี้
                    </td>
                  </tr>
                ) : (
                  shifts.map(shift => {
                    const meta = SHIFT_TYPES.find(t => t.id === shift.shift_type) || {
                      label: shift.shift_type,
                      color: 'bg-slate-100 text-slate-700'
                    };

                    return (
                      <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">
                          {shift.shift_date}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">
                            {shift.doctor ? shift.doctor.name : 'ไม่ระบุแพทย์'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {shift.doctor?.employee_id}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.color}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">
                          {shift.start_time} - {shift.end_time}
                        </td>
                        <td className="p-3">
                          {shift.has_leave_conflict ? (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              ชนใบลา ({shift.conflict_leave?.request_no})
                            </span>
                          ) : shift.status === 'COVERED' ? (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                              ส่งมอบเวรแล้ว
                            </span>
                          ) : shift.status === 'SWAPPED' ? (
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-200">
                              แลกเวรแล้ว
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                              ปกติ
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {shift.substitute_doctor ? (
                            <span className="font-semibold text-emerald-700 text-xs">
                              {shift.substitute_doctor.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">
                          {shift.notes || '-'}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => openEditModal(shift)}
                            className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: ADD / EDIT SHIFT ---------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-scale-in">
            <div className="bg-gradient-to-r from-[#006699] to-[#0284c7] p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{editingShift ? 'แก้ไขรายการเวรแพทย์' : 'เพิ่มตารางเวรแพทย์'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  แพทย์ผู้ปฏิบัติงาน <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formDoctorId}
                  onChange={(e) => setFormDoctorId(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#006699] outline-hidden"
                  required
                >
                  <option value="">-- เลือกแพทย์ --</option>
                  {deptDoctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.prefix_th}{d.first_name_th} {d.last_name_th} ({d.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วันที่เข้าเวร <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formShiftDate}
                  onChange={(e) => setFormShiftDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#006699] outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ประเภทเวร <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formShiftType}
                  onChange={(e) => {
                    const st = e.target.value;
                    setFormShiftType(st);
                    const meta = SHIFT_TYPES.find(t => t.id === st);
                    if (meta) {
                      const [s, end] = meta.time.split(' - ');
                      setFormStartTime(s);
                      setFormEndTime(end);
                    }
                  }}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#006699] outline-hidden"
                  required
                >
                  {SHIFT_TYPES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.time}) {t.isHigh ? '• สำคัญ' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เวลาเริ่ม</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#006699] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เวลาสิ้นสุด</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#006699] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ / จุดประจำการ</label>
                <input
                  type="text"
                  placeholder="เช่น ห้องฉุกเฉินชั้น 1, คลินิกตรวจ 3, Ward 5"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#006699] outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#006699] text-white hover:bg-sky-700 shadow-md transition-all"
                >
                  {editingShift ? 'บันทึกการแก้ไข' : 'เพิ่มเวร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: SHIFT SWAP ---------------- */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-scale-in">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                <span>ขอแลกเวร / มอบหมายเวรให้แพทย์ท่านอื่น</span>
              </h3>
              <button
                onClick={() => setShowSwapModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSwapSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. เลือกเวรที่ต้องการส่งมอบ / แลก <span className="text-rose-500">*</span>
                </label>
                <select
                  value={swapShiftId}
                  onChange={(e) => setSwapShiftId(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 outline-hidden"
                  required
                >
                  <option value="">-- เลือกรายการเวร --</option>
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.shift_date} • {s.doctor?.name || 'แพทย์'} — {s.shift_type_meta?.label || s.shift_type} ({s.start_time})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. แพทย์ผู้รับเวรแทน <span className="text-rose-500">*</span>
                </label>
                <select
                  value={swapTargetDoctorId}
                  onChange={(e) => setSwapTargetDoctorId(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 outline-hidden"
                  required
                >
                  <option value="">-- เลือกแพทย์ผู้รับเวร --</option>
                  {deptDoctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.prefix_th}{d.first_name_th} {d.last_name_th} ({d.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เหตุผลในการแลกเวร</label>
                <input
                  type="text"
                  placeholder="เช่น ติดภารกิจด่วน, แลกเวรข้ามสัปดาห์"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSwapModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-700 text-white hover:bg-purple-800 shadow-md transition-all"
                >
                  ยืนยันการแลกเวร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: BATCH AUTO-GENERATE ---------------- */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-scale-in">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>สร้างตารางเวรแผนกอัตโนมัติ (Auto-Generate Roster)</span>
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-900 space-y-1.5">
                <div className="font-bold">✨ ระบบจัดตารางเวรหมุนเวียนอัจฉริยะ:</div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-emerald-800">
                  <li>เกลี่ยเวร OPD เช้า, บ่าย, Ward Round และ ER สลับกันในแผนก</li>
                  <li>คำนวณตลอดทั้งเดือน ({monthNamesThai[selectedMonth]} {selectedYear + 543}) ทั้งสิ้น {daysInMonth} วัน</li>
                  <li>แพทย์ในแผนก: {deptDoctors.map(d => d.first_name_th).join(', ')}</li>
                </ul>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="overwriteShifts"
                  checked={batchOverwrite}
                  onChange={(e) => setBatchOverwrite(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="overwriteShifts" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  เขียนทับเวรเดิมทั้งหมดในเดือนนี้ (Overwrite Existing)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleBatchGenerate}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>สร้างตารางเวรทันที</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
