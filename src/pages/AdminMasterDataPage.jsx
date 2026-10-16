import React, { useState, useEffect } from 'react';
import {
  GitMerge,
  FileText,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Users,
  Search,
  Filter,
  Check,
  X,
  ShieldCheck,
  Layers,
  Settings,
  ArrowRight,
  UserCheck,
  Clock,
  Paperclip,
  Calendar
} from 'lucide-react';

export default function AdminMasterDataPage() {
  const [activeTab, setActiveTab] = useState('APPROVAL_ROUTES'); // 'APPROVAL_ROUTES' or 'LEAVE_TYPES'
  const [loading, setLoading] = useState(true);

  // Doctors & Depts (for dropdowns)
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Approval Routes State
  const [routes, setRoutes] = useState([]);
  const [routeSearch, setRouteSearch] = useState('');
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDoctorId, setRouteDoctorId] = useState('');
  const [routeApproverId, setRouteApproverId] = useState('');
  const [routeStepOrder, setRouteStepOrder] = useState(1);
  const [batchDeptId, setBatchDeptId] = useState('');
  const [batchApproverId, setBatchApproverId] = useState('');

  // Leave Types State
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [typeSearch, setTypeSearch] = useState('');
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [typeForm, setTypeForm] = useState({
    code: '',
    name_th: '',
    name_en: '',
    count_mode: 'WORKING_DAYS',
    allows_half_day: true,
    requires_attachment: false,
    attachment_threshold_days: 2.0,
    min_notice_days: 0,
    allows_backdate: false,
    is_full_time_only: false,
    color: '#006699'
  });

  // Toast
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });
  const showToast = (text, type = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage({ type: '', text: '' }), 3500);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [docRes, deptRes, routeRes, typeRes] = await Promise.all([
        fetch('/api/doctors'),
        fetch('/api/departments'),
        fetch('/api/approval-routes'),
        fetch('/api/leave-types?includeAll=true')
      ]);

      if (docRes.ok) setDoctors(await docRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (routeRes.ok) setRoutes(await routeRes.json());
      if (typeRes.ok) setLeaveTypes(await typeRes.json());
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // --- Handlers: Approval Routes ---
  const handleOpenAddRoute = () => {
    setSelectedRoute(null);
    setRouteDoctorId(doctors[0]?.id || '');
    setRouteApproverId(doctors[1]?.id || doctors[0]?.id || '');
    setRouteStepOrder(1);
    setRouteModalOpen(true);
  };

  const handleOpenEditRoute = (r) => {
    setSelectedRoute(r);
    setRouteDoctorId(r.doctor_id);
    setRouteApproverId(r.approver_id);
    setRouteStepOrder(r.step_order);
    setRouteModalOpen(true);
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    if (!routeDoctorId || !routeApproverId) {
      showToast('กรุณาเลือกแพทย์และผู้อนุมัติ', 'error');
      return;
    }
    if (routeDoctorId === routeApproverId) {
      showToast('แพทย์ไม่สามารถเป็นผู้อนุมัติตนเองได้', 'error');
      return;
    }

    try {
      if (selectedRoute) {
        const res = await fetch(`/api/approval-routes/${selectedRoute.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approver_id: routeApproverId,
            step_order: routeStepOrder
          })
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast('แก้ไขสายอนุมัติสำเร็จ');
      } else {
        const res = await fetch('/api/approval-routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doctor_id: routeDoctorId,
            approver_id: routeApproverId,
            step_order: routeStepOrder
          })
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast('กำหนดสายอนุมัติเรียบร้อย');
      }
      setRouteModalOpen(false);
      const res2 = await fetch('/api/approval-routes');
      if (res2.ok) setRoutes(await res2.json());
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteRoute = async (r) => {
    if (!window.confirm(`ยืนยันการลบสายอนุมัติของ ${r.doctor_name}?`)) return;
    try {
      const res = await fetch(`/api/approval-routes/${r.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('ลบสายอนุมัติเรียบร้อย');
        setRoutes(prev => prev.filter(item => item.id !== r.id));
      }
    } catch (err) {
      showToast('ไม่สามารถลบสายอนุมัติได้', 'error');
    }
  };

  const handleBatchAssign = async (e) => {
    e.preventDefault();
    if (!batchDeptId || !batchApproverId) {
      showToast('กรุณาเลือกแผนกและผู้อนุมัติ', 'error');
      return;
    }
    try {
      const res = await fetch('/api/approval-routes/batch-department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_id: batchDeptId,
          approver_id: batchApproverId,
          step_order: 1
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        setBatchModalOpen(false);
        const res2 = await fetch('/api/approval-routes');
        if (res2.ok) setRoutes(await res2.json());
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (err) {
      showToast('ไม่สามารถตั้งค่าสายอนุมัติตามแผนกได้', 'error');
    }
  };

  // --- Handlers: Leave Types ---
  const handleOpenAddType = () => {
    setSelectedType(null);
    setTypeForm({
      code: '',
      name_th: '',
      name_en: '',
      count_mode: 'WORKING_DAYS',
      allows_half_day: true,
      requires_attachment: false,
      attachment_threshold_days: 2.0,
      min_notice_days: 0,
      allows_backdate: false,
      is_full_time_only: false,
      color: '#0ea5e9'
    });
    setTypeModalOpen(true);
  };

  const handleOpenEditType = (lt) => {
    setSelectedType(lt);
    setTypeForm({
      code: lt.code,
      name_th: lt.name_th,
      name_en: lt.name_en || '',
      count_mode: lt.count_mode || 'WORKING_DAYS',
      allows_half_day: lt.allows_half_day !== false,
      requires_attachment: Boolean(lt.requires_attachment),
      attachment_threshold_days: lt.attachment_threshold_days || 0,
      min_notice_days: lt.min_notice_days || 0,
      allows_backdate: Boolean(lt.allows_backdate),
      is_full_time_only: Boolean(lt.is_full_time_only),
      color: lt.color || '#006699'
    });
    setTypeModalOpen(true);
  };

  const handleSaveType = async (e) => {
    e.preventDefault();
    try {
      if (selectedType) {
        const res = await fetch(`/api/leave-types/${selectedType.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(typeForm)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast('แก้ไขประเภทการลาสำเร็จ');
      } else {
        const res = await fetch('/api/leave-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(typeForm)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast('เพิ่มประเภทการลาใหม่สำเร็จ');
      }
      setTypeModalOpen(false);
      const res2 = await fetch('/api/leave-types?includeAll=true');
      if (res2.ok) setLeaveTypes(await res2.json());
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleTypeActive = async (lt) => {
    try {
      const res = await fetch(`/api/leave-types/${lt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !lt.is_active })
      });
      if (res.ok) {
        setLeaveTypes(prev =>
          prev.map(item => (item.id === lt.id ? { ...item, is_active: !lt.is_active } : item))
        );
        showToast(`${!lt.is_active ? 'เปิด' : 'ปิด'}การใช้งานเรียบร้อย`);
      }
    } catch (err) {
      showToast('ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  };

  // Filtered lists
  const filteredRoutes = routes.filter(r => {
    if (!routeSearch.trim()) return true;
    const q = routeSearch.toLowerCase();
    return (
      r.doctor_name.toLowerCase().includes(q) ||
      r.approver_name.toLowerCase().includes(q) ||
      r.department_name.toLowerCase().includes(q) ||
      r.doctor_employee_id.toLowerCase().includes(q)
    );
  });

  const filteredLeaveTypes = leaveTypes.filter(lt => {
    if (!typeSearch.trim()) return true;
    const q = typeSearch.toLowerCase();
    return lt.name_th.toLowerCase().includes(q) || lt.code.toLowerCase().includes(q);
  });

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
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                จัดการข้อมูลหลัก & สายอนุมัติ (Master Data Portal)
              </h1>
              <p className="text-xs text-slate-500">
                ตั้งค่าสายบังคับบัญชาผู้อนุมัติการลา (Approver) และกำหนดประเภทการลาพร้อมกฎเงื่อนไขประจำโรงพยาบาล
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('APPROVAL_ROUTES')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'APPROVAL_ROUTES'
                ? 'bg-white text-[#006699] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>สายการอนุมัติ ({routes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('LEAVE_TYPES')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'LEAVE_TYPES'
                ? 'bg-white text-[#006699] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ประเภทการลา ({leaveTypes.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: APPROVAL ROUTES (ITEM 24)                          */}
      {/* ========================================================= */}
      {activeTab === 'APPROVAL_ROUTES' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Action Row */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                placeholder="ค้นหาแพทย์, ผู้อนุมัติ, แผนก..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#006699]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                onClick={() => {
                  setBatchDeptId(departments[0]?.id || '');
                  setBatchApproverId(doctors[1]?.id || doctors[0]?.id || '');
                  setBatchModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-50 text-[#006699] border border-sky-200 hover:bg-sky-100 text-xs font-bold transition-all shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ตั้งค่าด่วนตามแผนก</span>
              </button>

              <button
                onClick={handleOpenAddRoute}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white text-xs font-bold transition-all shadow-sm shadow-sky-900/10"
              >
                <Plus className="w-4 h-4" />
                <span>ผูกสายอนุมัติรายบุคคล</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#006699]" />
                <span className="text-xs">กำลังโหลดสายอนุมัติ...</span>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <GitMerge className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-600">ยังไม่มีสายอนุมัติที่ตั้งค่าไว้</p>
                <p className="text-xs text-slate-400">คุณสามารถกดปุ่ม "ตั้งค่าด่วนตามแผนก" เพื่อผูกผู้อนุมัติให้อัตโนมัติ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">แพทย์ผู้ขอลา</th>
                      <th className="py-3 px-4">แผนก</th>
                      <th className="py-3 px-4 text-center">ขั้นที่</th>
                      <th className="py-3 px-4">ผู้อนุมัติ (Approver)</th>
                      <th className="py-3 px-4 text-center">สถานะ</th>
                      <th className="py-3 px-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoutes.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-[#006699]" />
                            <span>{r.doctor_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({r.doctor_employee_id})</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          แผนก{r.department_name}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-700 text-[11px]">
                            {r.step_order}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{r.approver_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({r.approver_employee_id})</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            เปิดใช้งาน
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditRoute(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-sky-50"
                              title="เปลี่ยนผู้อนุมัติ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoute(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="ลบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: LEAVE TYPES (ITEM 25)                              */}
      {/* ========================================================= */}
      {activeTab === 'LEAVE_TYPES' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Action Row */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                placeholder="ค้นหาประเภทการลา..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#006699]"
              />
            </div>

            <button
              onClick={handleOpenAddType}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white text-xs font-bold transition-all shadow-sm shadow-sky-900/10"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มประเภทการลาใหม่</span>
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeaveTypes.map((lt) => (
              <div
                key={lt.id}
                className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between transition-all ${
                  lt.is_active ? 'border-slate-200 hover:border-sky-300' : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: lt.color || '#006699' }}
                      />
                      <span className="font-bold text-sm text-slate-900">{lt.name_th}</span>
                    </div>

                    <button
                      onClick={() => handleToggleTypeActive(lt)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                        lt.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {lt.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono mb-4">
                    CODE: {lt.code} {lt.name_en ? `• ${lt.name_en}` : ''}
                  </div>

                  {/* Policy Badges */}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">การนับจำนวนวัน:</span>
                      <span className="font-semibold text-slate-800">
                        {lt.count_mode === 'WORKING_DAYS' ? 'นับเฉพาะวันทำการ' : 'นับทุกวันตามปฏิทิน'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">แจ้งล่วงหน้าอย่างน้อย:</span>
                      <span className="font-semibold text-slate-800">
                        {lt.min_notice_days > 0 ? `${lt.min_notice_days} วัน` : 'ไม่ต้องแจ้งล่วงหน้า'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">การแนบเอกสาร:</span>
                      <span className="font-semibold text-slate-800">
                        {lt.requires_attachment
                          ? lt.attachment_threshold_days > 0
                            ? `ลาเกิน ${lt.attachment_threshold_days} วัน`
                            : 'จำเป็นทุกกรณี'
                          : 'ไม่บังคับ'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">ลาย้อนหลังได้:</span>
                      <span className={`font-semibold ${lt.allows_backdate ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {lt.allows_backdate ? 'อนุญาต' : 'ไม่อนุญาต'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">แพทย์พาร์ทไทม์:</span>
                      <span className={`font-semibold ${lt.is_full_time_only ? 'text-amber-700' : 'text-slate-800'}`}>
                        {lt.is_full_time_only ? 'เฉพาะแพทย์ประจำ' : 'ใช้ได้ทุกคน'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleOpenEditType(lt)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#006699] hover:bg-sky-50 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไขกฎ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD/EDIT APPROVAL ROUTE                          */}
      {/* ========================================================= */}
      {routeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                {selectedRoute ? 'แก้ไขผู้อนุมัติ' : 'ผูกสายอนุมัติรายบุคคล'}
              </h2>
              <button onClick={() => setRouteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">แพทย์ผู้ขอลา</label>
                <select
                  value={routeDoctorId}
                  onChange={(e) => setRouteDoctorId(e.target.value)}
                  disabled={Boolean(selectedRoute)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#006699]"
                  required
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.prefix_th}{d.first_name_th} {d.last_name_th} ({d.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ลำดับขั้นการอนุมัติ (Step Order)</label>
                <select
                  value={routeStepOrder}
                  onChange={(e) => setRouteStepOrder(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#006699]"
                >
                  <option value={1}>ขั้นที่ 1 (หัวหน้าแผนก / Line Approver)</option>
                  <option value={2}>ขั้นที่ 2 (ผู้อำนวยการแพทย์ / Medical Director)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ผู้อนุมัติ (Approver)</label>
                <select
                  value={routeApproverId}
                  onChange={(e) => setRouteApproverId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#006699]"
                  required
                >
                  {doctors.filter(d => d.id !== routeDoctorId).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.prefix_th}{d.first_name_th} {d.last_name_th} ({d.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRouteModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold"
                >
                  บันทึกสายอนุมัติ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: BATCH ASSIGN APPROVER BY DEPT                    */}
      {/* ========================================================= */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-sky-50 px-5 py-4 border-b border-sky-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#006699]" />
                <h2 className="text-sm font-bold text-slate-800">ตั้งค่าผู้อนุมัติตามแผนก (Batch Assign)</h2>
              </div>
              <button onClick={() => setBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchAssign} className="p-5 space-y-4 text-xs">
              <p className="text-slate-500 leading-relaxed">
                กำหนดผู้อนุมัติให้กับแพทย์ทุกคนในแผนกที่เลือกใน 1 คลิก เพื่อความสะดวกรวดเร็ว
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เลือกแผนก</label>
                <select
                  value={batchDeptId}
                  onChange={(e) => setBatchDeptId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                >
                  {departments.map(dp => (
                    <option key={dp.id} value={dp.id}>แผนก{dp.name_th} ({dp.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ผู้อนุมัติหลักของแผนก</label>
                <select
                  value={batchApproverId}
                  onChange={(e) => setBatchApproverId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.prefix_th}{d.first_name_th} {d.last_name_th} ({d.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#006699] text-white font-bold"
                >
                  ปรับใช้ทันที
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD/EDIT LEAVE TYPE                              */}
      {/* ========================================================= */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                {selectedType ? 'แก้ไขประเภทการลา' : 'เพิ่มประเภทการลาใหม่'}
              </h2>
              <button onClick={() => setTypeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รหัส (CODE) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={typeForm.code}
                    onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                    disabled={Boolean(selectedType)}
                    placeholder="เช่น VACATION, SICK"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">สีประจำประเภท</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={typeForm.color}
                      onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                      className="w-9 h-8 p-0.5 rounded border border-slate-300 cursor-pointer"
                    />
                    <span className="font-mono text-slate-500 text-[11px]">{typeForm.color}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อภาษาไทย <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={typeForm.name_th}
                    onChange={(e) => setTypeForm({ ...typeForm, name_th: e.target.value })}
                    placeholder="เช่น ลาพักผ่อน, ลาป่วย"
                    className="w-full p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อภาษาอังกฤษ</label>
                  <input
                    type="text"
                    value={typeForm.name_en}
                    onChange={(e) => setTypeForm({ ...typeForm, name_en: e.target.value })}
                    placeholder="e.g. Annual Leave"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วิธีการนับจำนวนวัน</label>
                  <select
                    value={typeForm.count_mode}
                    onChange={(e) => setTypeForm({ ...typeForm, count_mode: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="WORKING_DAYS">วันทำการ (WORKING_DAYS)</option>
                    <option value="CALENDAR_DAYS">ทุกวันปฏิทิน (CALENDAR_DAYS)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">แจ้งล่วงหน้าอย่างน้อย (วัน)</label>
                  <input
                    type="number"
                    min="0"
                    value={typeForm.min_notice_days}
                    onChange={(e) => setTypeForm({ ...typeForm, min_notice_days: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.allows_half_day}
                    onChange={(e) => setTypeForm({ ...typeForm, allows_half_day: e.target.checked })}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                  <span className="font-semibold text-slate-700">อนุญาตให้ลาครึ่งวันได้ (0.5 วัน)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.allows_backdate}
                    onChange={(e) => setTypeForm({ ...typeForm, allows_backdate: e.target.checked })}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                  <span className="font-semibold text-slate-700">อนุญาตให้ยื่นลาย้อนหลังได้</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.requires_attachment}
                    onChange={(e) => setTypeForm({ ...typeForm, requires_attachment: e.target.checked })}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                  <span className="font-semibold text-slate-700">บังคับแนบเอกสาร (ใบรับรองแพทย์ / หนังสือเชิญ)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.is_full_time_only}
                    onChange={(e) => setTypeForm({ ...typeForm, is_full_time_only: e.target.checked })}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                  <span className="font-semibold text-slate-700">สงวนสิทธิ์เฉพาะแพทย์ประจำ (Full-Time Only)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTypeModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#006699] text-white font-bold"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
