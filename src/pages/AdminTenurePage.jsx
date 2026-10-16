import React, { useState, useEffect } from 'react';
import {
  Award,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Sliders,
  Users,
  Edit2,
  Check,
  X,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

export default function AdminTenurePage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [previewData, setPreviewData] = useState([]);
  const [rules, setRules] = useState([]);
  const [settings, setSettings] = useState({ max_carry_over_days: 5, allow_part_time: false });
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  // Modals
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyCarryOver, setApplyCarryOver] = useState(true);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editHireDate, setEditHireDate] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });
  const showToast = (text, type = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage({ type: '', text: '' }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenure/preview?year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data.preview || []);
        setRules(data.rules || []);
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถดึงข้อมูลอายุงานได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  // Open Edit Hire Date
  const handleOpenEditHire = (item) => {
    setEditingDoctor(item);
    setEditHireDate(item.hire_date || '2023-01-01');
  };

  // Save Hire Date
  const handleSaveHireDate = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;
    try {
      const res = await fetch(`/api/doctors/${editingDoctor.doctor_id}/hire-date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hire_date: editHireDate })
      });
      if (res.ok) {
        showToast(`อัปเดตวันเริ่มงานของ ${editingDoctor.doctor_name} เรียบร้อย`);
        setEditingDoctor(null);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      showToast('ไม่สามารถบันทึกวันเริ่มงานได้', 'error');
    }
  };

  // Save Rules
  const handleSaveRules = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tenure/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules, settings })
      });
      if (res.ok) {
        showToast('บันทึกเกณฑ์คำนวณอายุงานสำเร็จ');
        setRulesModalOpen(false);
        fetchData();
      } else {
        showToast('ไม่สามารถบันทึกเกณฑ์ได้', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  };

  // Batch Apply
  const handleConfirmApply = async () => {
    setApplying(true);
    try {
      const res = await fetch('/api/tenure/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          apply_carry_over: applyCarryOver
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        setApplyModalOpen(false);
        fetchData();
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาดในการปรับสิทธิ์', 'error');
      }
    } catch (err) {
      showToast('ไม่สามารถปรับปรุงสิทธิ์ได้', 'error');
    } finally {
      setApplying(false);
    }
  };

  // Calculations for summary KPI
  const pendingChangesCount = previewData.filter(d => d.has_change).length;
  const totalCalculatedDays = previewData.reduce((sum, d) => sum + (d.calculated_entitlement || 0), 0);
  const totalProposedCarryOver = previewData.reduce((sum, d) => sum + (d.proposed_carried_over || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      
      {/* Toast */}
      {toastMessage.text && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
          toastMessage.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006699] text-white flex items-center justify-center shadow-sm shadow-sky-900/10">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                คำนวณสิทธิ์วันลาตามอายุงาน (Tenure & Prorate Engine)
              </h1>
              <p className="text-xs text-slate-500">
                ประมวลผลโควตาวันลาพักผ่อนประจำปี (Vacation) ตามอายุงานของแพทย์และคำนวณวันยกยอด (Carry-over)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setRulesModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span>ตั้งค่าเกณฑ์อายุงาน</span>
          </button>

          <button
            onClick={() => setApplyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white text-xs font-bold transition-all shadow-sm shadow-sky-900/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ประมวลผลและปรับสิทธิ์ทั้ง รพ. ({selectedYear})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">ปีงบประมาณที่ประมวลผล</span>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {[currentYear, currentYear + 1].map(yr => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    selectedYear === yr
                      ? 'bg-[#006699] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ปี {yr}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">แพทย์ที่มีสิทธิ์ปรับปรุงใหม่</span>
          <div className="text-2xl font-black text-amber-600 flex items-baseline gap-1">
            {pendingChangesCount}
            <span className="text-xs font-medium text-slate-500">/ {previewData.length} ท่าน</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">สิทธิ์พักร้อนคำนวณรวม (ปี {selectedYear})</span>
          <div className="text-2xl font-black text-[#006699] flex items-baseline gap-1">
            {totalCalculatedDays}
            <span className="text-xs font-medium text-slate-500">วัน</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">วันยกยอดจากปีก่อนรวม (Carry-over)</span>
          <div className="text-2xl font-black text-emerald-600 flex items-baseline gap-1">
            {totalProposedCarryOver}
            <span className="text-xs font-medium text-slate-500">วัน (จำกัด max {settings.max_carry_over_days} วัน/คน)</span>
          </div>
        </div>
      </div>

      {/* Main Table: Doctors & Calculated Entitlements */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800">
              ตารางแสดงอายุงานและสิทธิ์วันลาพักผ่อนประจำปี {selectedYear}
            </h2>
          </div>
          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#006699]" />
            <span className="text-xs">กำลังประมวลผลอายุงานแพทย์...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">แพทย์ / แผนก</th>
                  <th className="py-3 px-4">ประเภท</th>
                  <th className="py-3 px-4">วันเริ่มงาน</th>
                  <th className="py-3 px-4">อายุงาน (ณ สิ้นปี {selectedYear})</th>
                  <th className="py-3 px-4">เกณฑ์ที่ตรงตามระเบียบ</th>
                  <th className="py-3 px-4 text-center">สิทธิ์คำนวณใหม่</th>
                  <th className="py-3 px-4 text-center">สิทธิ์ปัจจุบันในระบบ</th>
                  <th className="py-3 px-4 text-center">วันยกยอดปีก่อน</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.map((d) => (
                  <tr key={d.doctor_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{d.doctor_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {d.employee_id} • แผนก{d.department_name}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.doctor_type === 'FULL_TIME'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {d.doctor_type === 'FULL_TIME' ? 'แพทย์ประจำ' : 'พาร์ทไทม์'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-700">{d.hire_date || '-'}</span>
                        <button
                          onClick={() => handleOpenEditHire(d)}
                          className="p-1 rounded text-slate-400 hover:text-[#006699] hover:bg-sky-50"
                          title="แก้ไขวันเริ่มงาน"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {d.tenure.formatted}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      <div className="truncate text-[11px]" title={d.rule_applied}>
                        {d.rule_applied}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-sm text-[#006699]">
                      {d.calculated_entitlement} วัน
                    </td>

                    <td className="py-3 px-4 text-center text-slate-600">
                      {d.current_entitlement !== null ? `${d.current_entitlement} วัน` : <span className="text-slate-400 italic">ยังไม่ได้ตั้ง</span>}
                    </td>

                    <td className="py-3 px-4 text-center font-semibold text-emerald-700">
                      +{d.proposed_carried_over} วัน
                    </td>

                    <td className="py-3 px-4 text-center">
                      {d.has_change ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>รอปรับสิทธิ์</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>ตรงกันแล้ว</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Hire Date Modal */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">แก้ไขวันเริ่มงานของแพทย์</h2>
              <button onClick={() => setEditingDoctor(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveHireDate} className="p-5 space-y-4 text-xs">
              <div>
                <span className="block text-slate-500 mb-1">แพทย์:</span>
                <span className="font-bold text-slate-800 text-sm">{editingDoctor.doctor_name}</span>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  วันเริ่มงาน (Hire Date) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={editHireDate}
                  onChange={(e) => setEditHireDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#006699]"
                  required
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#006699] text-white font-bold"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rules Setting Modal */}
      {rulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#006699]" />
                <h2 className="text-sm font-bold text-slate-800">
                  ตั้งค่าเกณฑ์การคำนวณวันลาพักร้อนตามอายุงาน (Tenure Policy)
                </h2>
              </div>
              <button onClick={() => setRulesModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRules} className="p-5 space-y-4 text-xs">
              <div className="space-y-3">
                <div className="font-bold text-slate-700">เกณฑ์แบ่งตามช่วงอายุงาน:</div>
                <div className="space-y-2">
                  {rules.map((rule, idx) => (
                    <div key={rule.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block text-xs">
                          {rule.min_years} - {rule.max_years === 99 ? 'ขึ้นไป' : `${rule.max_years} ปี`}
                        </span>
                        <input
                          type="text"
                          value={rule.description}
                          onChange={(e) => {
                            const updated = [...rules];
                            updated[idx].description = e.target.value;
                            setRules(updated);
                          }}
                          className="w-full mt-1 text-[11px] p-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-500">สิทธิ์วันลา:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="60"
                          value={rule.entitlement_days}
                          onChange={(e) => {
                            const updated = [...rules];
                            updated[idx].entitlement_days = parseFloat(e.target.value) || 0;
                            setRules(updated);
                          }}
                          className="w-16 p-1.5 border border-slate-300 rounded-lg text-center font-bold text-[#006699]"
                        />
                        <span className="text-slate-500">วัน</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Policy Settings */}
              <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 space-y-3">
                <div className="font-bold text-[#006699]">นโยบายการยกยอดข้ามปี (Roll-over Policy):</div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">ยกยอดวันลาพักร้อนที่เหลือไปปีถัดไปได้สูงสุด:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={settings.max_carry_over_days}
                      onChange={(e) => setSettings({ ...settings, max_carry_over_days: parseFloat(e.target.value) || 0 })}
                      className="w-16 p-1.5 border border-slate-300 rounded-lg text-center font-bold text-slate-800 bg-white"
                    />
                    <span className="text-slate-600">วัน</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-sky-100">
                  <span className="text-slate-700">ให้สิทธิ์วันลาพักผ่อนกับแพทย์ Part-Time หรือไม่:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allow_part_time}
                      onChange={(e) => setSettings({ ...settings, allow_part_time: e.target.checked })}
                      className="w-4 h-4 rounded text-[#006699]"
                    />
                    <span className="font-semibold text-slate-700">อนุญาตให้มีสิทธิ์</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRulesModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#006699] text-white font-bold"
                >
                  บันทึกการตั้งค่าเกณฑ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Apply Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-amber-50 px-5 py-4 border-b border-amber-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-900">
                ยืนยันการประมวลผลสิทธิ์วันลาทั้ง รพ. ปี {selectedYear}
              </h2>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                ระบบจะทำการประมวลผลโควตาวันลาพักผ่อน (Vacation Leave) สำหรับปี <strong>{selectedYear}</strong> ของแพทย์ทั้ง <strong>{previewData.length} ท่าน</strong> ตามอายุงานและนโยบายที่ตั้งไว้
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyCarryOver}
                    onChange={(e) => setApplyCarryOver(e.target.checked)}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                  <span className="font-semibold text-slate-800">
                    ยกยอดวันลาพักร้อนที่เหลือจากปี {selectedYear - 1} ด้วย (สูงสุด {settings.max_carry_over_days} วัน)
                  </span>
                </label>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px]">
                ℹ️ <strong>หมายเหตุ:</strong> การดำเนินการนี้จะถูกบันทึกใน Audit Trail (PDPA Compliant) เพื่อความโปร่งใสของฝ่ายการแพทย์
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  disabled={applying}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApply}
                  disabled={applying}
                  className="px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {applying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังประมวลผล...</span>
                    </>
                  ) : (
                    <span>ยืนยันและปรับปรุงสิทธิ์</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
