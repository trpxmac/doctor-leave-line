import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CalendarDays,
  Search,
  Filter,
  Check,
  X,
  Clock,
  ShieldCheck
} from 'lucide-react';

export default function AdminHolidaysPage() {
  const currentSystemYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentSystemYear);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('ALL'); // ALL, ACTIVE, INACTIVE

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null); // null = add, obj = edit
  const [formDate, setFormDate] = useState('');
  const [formName, setFormName] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });

  const showToast = (text, type = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage({ type: '', text: '' }), 3500);
  };

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/holidays?year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setHolidays(data);
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถดึงข้อมูลวันหยุดได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const handleOpenAdd = () => {
    setEditingHoliday(null);
    setFormDate(`${selectedYear}-01-01`);
    setFormName('');
    setFormActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (h) => {
    setEditingHoliday(h);
    setFormDate(h.holiday_date);
    setFormName(h.name_th);
    setFormActive(h.is_active);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingHoliday(null);
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (!formDate || !formName.trim()) {
      showToast('กรุณากรอกวันที่และชื่อวันหยุดให้ครบถ้วน', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingHoliday) {
        // PUT
        const res = await fetch(`/api/holidays/${editingHoliday.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            holiday_date: formDate,
            name_th: formName.trim(),
            is_active: formActive
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการแก้ไข');
        showToast('แก้ไขข้อมูลวันหยุดสำเร็จ');
      } else {
        // POST
        const res = await fetch('/api/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            holiday_date: formDate,
            name_th: formName.trim(),
            is_active: formActive
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการเพิ่มวันหยุด');
        showToast('เพิ่มวันหยุดใหม่สำเร็จ');
      }
      handleCloseModal();
      fetchHolidays();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (h) => {
    try {
      const res = await fetch(`/api/holidays/${h.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !h.is_active })
      });
      if (res.ok) {
        setHolidays(prev =>
          prev.map(item => (item.id === h.id ? { ...item, is_active: !h.is_active } : item))
        );
        showToast(`${!h.is_active ? 'เปิด' : 'ปิด'}การใช้งานวันหยุดเรียบร้อย`);
      }
    } catch (err) {
      showToast('ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  };

  const handleDelete = async (h) => {
    if (!window.confirm(`ยืนยันการลบวันหยุด "${h.name_th}" (${h.holiday_date})?`)) return;

    try {
      const res = await fetch(`/api/holidays/${h.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('ลบวันหยุดเรียบร้อย');
        fetchHolidays();
      } else {
        const data = await res.json();
        showToast(data.error || 'ลบไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการลบ', 'error');
    }
  };

  const handleSeedYear = async () => {
    if (!window.confirm(`ต้องการเติมวันหยุดนักขัตฤกษ์มาตรฐานประเทศไทย ประจำปี ${selectedYear} อัตโนมัติหรือไม่?`)) return;

    try {
      const res = await fetch('/api/holidays/seed-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        fetchHolidays();
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการเติมวันหยุด', 'error');
    }
  };

  // Helper formatting Thai date
  const formatThaiDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const dayName = thaiDays[date.getDay()];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const thaiYear = date.getFullYear() + 543;
    return {
      dayName,
      displayDate: `${day} ${month} ${thaiYear}`,
      rawYear: date.getFullYear()
    };
  };

  // Filtered Holidays
  const filteredHolidays = holidays.filter(h => {
    if (filterActive === 'ACTIVE' && !h.is_active) return false;
    if (filterActive === 'INACTIVE' && h.is_active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = h.name_th.toLowerCase().includes(q);
      const matchDate = h.holiday_date.includes(q);
      if (!matchName && !matchDate) return false;
    }
    return true;
  });

  const activeCount = holidays.filter(h => h.is_active).length;

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      
      {/* Toast Notification */}
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
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                จัดการวันหยุดนักขัตฤกษ์ (Hospital Public Holidays)
              </h1>
              <p className="text-xs text-slate-500">
                กำหนดปฏิทินวันหยุดเพื่อคำนวณวันลาทำการ (Working Days) ของแพทย์ตามระเบียบโรงพยาบาล
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSeedYear}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#006699] border border-sky-200 text-xs font-bold transition-all shadow-2xs"
            title="นำเข้าวันหยุดมาตรฐานประจำปีอัตโนมัติ"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#006699]" />
            <span>เติมวันหยุดมาตรฐานปี {selectedYear}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white text-xs font-bold transition-all shadow-sm shadow-sky-900/10"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มวันหยุดใหม่</span>
          </button>
        </div>
      </div>

      {/* KPI Stats & Working Days Calculation Notice */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">ปีที่กำลังจัดการ</span>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {[currentSystemYear - 1, currentSystemYear, currentSystemYear + 1].map(yr => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    selectedYear === yr
                      ? 'bg-[#006699] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">วันหยุดทั้งหมดในปี {selectedYear}</span>
          <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
            {holidays.length}
            <span className="text-xs font-medium text-slate-500">วัน</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">สถานะเปิดใช้งาน (Active)</span>
          <div className="text-2xl font-black text-emerald-600 flex items-baseline gap-1">
            {activeCount}
            <span className="text-xs font-medium text-slate-500">/ {holidays.length} วัน</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 p-4 rounded-xl border border-sky-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#006699]">
            <ShieldCheck className="w-4 h-4 text-[#006699]" />
            <span>Working Days Engine</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
            วันหยุดที่เปิดใช้งาน จะถูกนำไปหักลบออกจากวันลาประเภทนับเฉพาะวันทำการ (เช่น พักร้อน) โดยอัตโนมัติ
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อวันหยุด หรือ วันที่..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#006699]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setFilterActive('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterActive === 'ALL' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({holidays.length})
            </button>
            <button
              onClick={() => setFilterActive('ACTIVE')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterActive === 'ACTIVE' ? 'bg-white shadow-2xs text-emerald-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เปิดใช้ ({activeCount})
            </button>
            <button
              onClick={() => setFilterActive('INACTIVE')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterActive === 'INACTIVE' ? 'bg-white shadow-2xs text-slate-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ปิด ({holidays.length - activeCount})
            </button>
          </div>

          <button
            onClick={fetchHolidays}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Holidays List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#006699]" />
            <span className="text-xs">กำลังโหลดข้อมูลวันหยุด...</span>
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Calendar className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-600">ไม่พบข้อมูลวันหยุดในปี {selectedYear}</p>
            <p className="text-xs text-slate-400">
              {searchQuery ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'คุณสามารถกดปุ่ม "เติมวันหยุดมาตรฐาน" เพื่อนำเข้าวันหยุดทางการได้ทันที'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleSeedYear}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-[#006699] font-bold text-xs hover:bg-sky-100"
              >
                <Sparkles className="w-3.5 h-3.5" />
                นำเข้าวันหยุดมาตรฐานปี {selectedYear}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">วันที่</th>
                  <th className="py-3 px-4">วันในสัปดาห์</th>
                  <th className="py-3 px-4">ชื่อวันหยุด (ไทย)</th>
                  <th className="py-3 px-4 text-center">สถานะใช้งาน</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHolidays.map((h) => {
                  const thai = formatThaiDate(h.holiday_date);
                  const isWeekendDay = thai.dayName === 'เสาร์' || thai.dayName === 'อาทิตย์';

                  return (
                    <tr
                      key={h.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !h.is_active ? 'opacity-60 bg-slate-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#006699]" />
                          <span>{h.holiday_date}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isWeekendDay
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          วัน{thai.dayName}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{h.name_th}</div>
                        <div className="text-[10px] text-slate-400">{thai.displayDate}</div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(h)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                            h.is_active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                          title="คลิกเพื่อสลับสถานะ"
                        >
                          {h.is_active ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span>เปิดใช้งาน</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 text-slate-500" />
                              <span>ปิดใช้งาน</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(h)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#006699] hover:bg-sky-50 transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(h)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Holiday Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#006699]" />
                <h2 className="text-sm font-bold text-slate-800">
                  {editingHoliday ? 'แก้ไขข้อมูลวันหยุด' : 'เพิ่มวันหยุดนักขัตฤกษ์ใหม่'}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  วันที่หยุด (YYYY-MM-DD) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#006699] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อวันหยุด (ภาษาไทย) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น วันขึ้นปีใหม่, วันสงกรานต์..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#006699] focus:outline-hidden"
                  required
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#006699] focus:ring-[#006699]"
                  />
                  <span className="font-semibold text-slate-700">เปิดใช้งานวันหยุดนี้ในระบบคำนวณวันลา</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>{editingHoliday ? 'บันทึกการแก้ไข' : 'เพิ่มวันหยุด'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
