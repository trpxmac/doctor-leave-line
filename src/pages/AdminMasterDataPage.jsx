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
  Sliders,
  ArrowRight,
  UserCheck,
  Clock,
  Paperclip,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Smartphone,
  UserX,
  MessageSquare,
  Copy,
  Building
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

  // Doctor LINE Accounts State
  const [doctorSearch, setDoctorSearch] = useState('');

  // Medical Affairs Contact Settings State
  const [contactSettings, setContactSettings] = useState({
    department_name: 'ฝ่ายการแพทย์ (Medical Affairs)',
    coordinator_name: 'คุณสิริมาศ',
    phone_emergency: '076-361-888',
    phone_ext: '1234',
    phone_hotline: '081-999-8888',
    email: 'medical_affairs@bsi.hospital',
    location: 'อาคาร A ชั้น 3 ฝ่ายการแพทย์ โรงพยาบาลกรุงเทพศิริโรจน์',
    notify_line: true
  });
  const [contactLoading, setContactLoading] = useState(false);

  // Doctor Quota Modal State
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [selectedDoctorForQuota, setSelectedDoctorForQuota] = useState(null);
  const [doctorQuotaList, setDoctorQuotaList] = useState([]);
  const [savingQuota, setSavingQuota] = useState(false);
  const currentFiscalYear = new Date().getFullYear();

  // Toast
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });
  const showToast = (text, type = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage({ type: '', text: '' }), 3500);
  };

  // Quota Handlers
  const handleOpenQuotaModal = async (doc) => {
    setSelectedDoctorForQuota(doc);
    try {
      const res = await fetch(`/api/balances/${doc.id}`);
      const balances = res.ok ? await res.json() : [];

      const activeTypes = leaveTypes.filter(lt => {
        if (doc.doctor_type === 'PART_TIME') return !lt.is_full_time_only;
        return true;
      });

      const initialList = activeTypes.map(lt => {
        const existing = balances.find(b => b.leave_type_id === lt.id);
        return {
          leave_type_id: lt.id,
          leave_type_code: lt.code,
          leave_type_name: lt.name_th,
          color: lt.color || '#006699',
          entitlement_days: existing !== undefined ? existing.entitlement_days : '',
          carried_over_days: existing !== undefined ? existing.carried_over_days : 0,
          used_days: existing ? existing.used_days : 0,
          pending_days: existing ? existing.pending_days : 0,
          has_quota: existing !== undefined
        };
      });

      setDoctorQuotaList(initialList);
      setQuotaModalOpen(true);
    } catch (err) {
      showToast('ไม่สามารถดึงข้อมูลโควตาวันลาได้', 'error');
    }
  };

  const handleApplyPreset = () => {
    setDoctorQuotaList(prev => prev.map(item => {
      let ent = item.entitlement_days;
      if (item.leave_type_code === 'VACATION') ent = 10;
      else if (item.leave_type_code === 'SICK') ent = 30;
      else if (item.leave_type_code === 'PERSONAL') ent = 5;
      else if (item.leave_type_code === 'TRAINING') ent = 10;
      else if (item.leave_type_code === 'UNPAID') ent = '';
      return {
        ...item,
        entitlement_days: ent,
        has_quota: ent !== ''
      };
    }));
    showToast('ปรับใช้ค่าโควตามาตรฐานแล้ว (อย่าลืมกดบันทึก)');
  };

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    if (!selectedDoctorForQuota) return;
    setSavingQuota(true);
    try {
      const payload = doctorQuotaList
        .filter(item => item.entitlement_days !== '' && !isNaN(Number(item.entitlement_days)))
        .map(item => ({
          leave_type_id: item.leave_type_id,
          entitlement_days: Number(item.entitlement_days),
          carried_over_days: Number(item.carried_over_days) || 0
        }));

      const res = await fetch(`/api/balances/${selectedDoctorForQuota.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balances: payload, fiscal_year: currentFiscalYear })
      });

      if (!res.ok) throw new Error((await res.json()).error || 'เกิดข้อผิดพลาดในการบันทึก');
      showToast(`บันทึกโควตาวันลาของ ${selectedDoctorForQuota.prefix_th}${selectedDoctorForQuota.first_name_th} สำเร็จ`);
      setQuotaModalOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingQuota(false);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [docRes, deptRes, routeRes, typeRes, contactRes] = await Promise.all([
        fetch('/api/doctors'),
        fetch('/api/departments'),
        fetch('/api/approval-routes'),
        fetch('/api/leave-types?includeAll=true'),
        fetch('/api/settings/contact')
      ]);

      if (docRes.ok) setDoctors(await docRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (routeRes.ok) setRoutes(await routeRes.json());
      if (typeRes.ok) setLeaveTypes(await typeRes.json());
      if (contactRes.ok) setContactSettings(await contactRes.json());
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

  // Save Medical Affairs Contact Settings
  const handleSaveContact = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      const res = await fetch('/api/settings/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactSettings)
      });
      if (res.ok) {
        showToast('บันทึกข้อมูลติดต่อฝ่ายการแพทย์เรียบร้อย');
      } else {
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setContactLoading(false);
    }
  };

  // Unlink Doctor LINE Account
  const handleUnlinkDoctorLine = async (docId, docName) => {
    if (!window.confirm(`ท่านต้องการยกเลิกการผูกบัญชี LINE ของ ${docName} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/doctors/${docId}/unlink-line`, { method: 'POST' });
      if (res.ok) {
        showToast(`ยกเลิกการผูก LINE ของ ${docName} เรียบร้อย`);
        const docRes = await fetch('/api/doctors');
        if (docRes.ok) setDoctors(await docRes.json());
      } else {
        showToast('เกิดข้อผิดพลาดในการยกเลิก', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
  };

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
        <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('APPROVAL_ROUTES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'LEAVE_TYPES'
                ? 'bg-white text-[#006699] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ประเภทการลา ({leaveTypes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DOCTORS_LINE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'DOCTORS_LINE'
                ? 'bg-white text-[#006699] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>แพทย์ & บัญชี LINE ({doctors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CONTACT_INFO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'CONTACT_INFO'
                ? 'bg-white text-[#006699] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>ข้อมูลติดต่อฝ่ายการแพทย์</span>
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
      {/* TAB 3: DOCTORS & LINE ACCOUNTS                            */}
      {/* ========================================================= */}
      {activeTab === 'DOCTORS_LINE' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Action Row & Summary */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="ค้นหาแพทย์, แผนก, รหัสพนักงาน, เลข ว...."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#006699]"
              />
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ผูก LINE แล้ว: {doctors.filter(d => d.line_user_id).length} ท่าน</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 font-semibold">
                <span>ยังไม่ผูก: {doctors.filter(d => !d.line_user_id).length} ท่าน</span>
              </div>
            </div>
          </div>

          {/* Doctors Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">แพทย์ / รหัส</th>
                    <th className="py-3 px-4">แผนก</th>
                    <th className="py-3 px-4">ประเภทแพทย์</th>
                    <th className="py-3 px-4">สถานะ LINE Official</th>
                    <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                    <th className="py-3 px-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors
                    .filter(d => {
                      if (!doctorSearch.trim()) return true;
                      const q = doctorSearch.toLowerCase();
                      const name = `${d.prefix_th || ''}${d.first_name_th || ''} ${d.last_name_th || ''}`.toLowerCase();
                      const emp = (d.employee_id || '').toLowerCase();
                      const dept = (d.department_name || '').toLowerCase();
                      const lic = (d.license_no || '').toLowerCase();
                      return name.includes(q) || emp.includes(q) || dept.includes(q) || lic.includes(q);
                    })
                    .map(doc => {
                      const isLinked = Boolean(doc.line_user_id);
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={doc.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100'}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-slate-800 block text-xs">
                                  {doc.prefix_th}{doc.first_name_th} {doc.last_name_th}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {doc.employee_id}
                                  </span>
                                  {doc.license_no && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-mono">
                                      {doc.license_no}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {doc.department_name || 'ไม่ระบุ'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              doc.doctor_type === 'FULL_TIME'
                                ? 'bg-sky-50 text-[#006699] border border-sky-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {doc.doctor_type === 'FULL_TIME' ? 'ประจำ (FT)' : 'Part-Time (PT)'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isLinked ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>ผูกแล้ว</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]" title={doc.line_user_id}>
                                  {doc.line_display_name || doc.line_user_id.slice(0, 10) + '...'}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>ยังไม่ผูก LINE</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                            {doc.phone || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenQuotaModal(doc)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-sky-200 text-[#006699] hover:bg-sky-50 text-[11px] font-semibold transition-colors shadow-2xs"
                                title="ตั้งค่า/แก้ไขโควตาวันลาประจำปีของแพทย์ท่านนี้"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>ตั้งค่าโควตา</span>
                              </button>

                              {isLinked ? (
                                <button
                                  onClick={() => handleUnlinkDoctorLine(doc.id, `${doc.prefix_th}${doc.first_name_th}`)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition-colors"
                                  title="ยกเลิกการผูกเพื่ออนุญาตให้แพทย์ผูก LINE ใหม่ได้"
                                >
                                  <UserX className="w-3 h-3" />
                                  <span>ปลด LINE</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(window.location.origin);
                                    showToast('คัดลอกลิงก์หน้าลงทะเบียนเข้าใช้งานให้แพทย์แล้ว');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px] font-medium transition-colors"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>คัดลอกลิงก์</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: MEDICAL AFFAIRS CONTACT SETTINGS                   */}
      {/* ========================================================= */}
      {activeTab === 'CONTACT_INFO' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Column */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#006699] flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    ตั้งค่าข้อมูลติดต่อฝ่ายการแพทย์ & แจ้งเหตุฉุกเฉิน
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ข้อมูลนี้จะถูกนำไปแสดงบนปุ่มโทรออก One-Tap Call ในหน้ายื่นใบลา และข้อความแจ้งเตือนอัตโนมัติใน LINE
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ชื่อหน่วยงาน / ฝ่าย <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contactSettings.department_name}
                      onChange={(e) => setContactSettings({ ...contactSettings, department_name: e.target.value })}
                      placeholder="เช่น ฝ่ายการแพทย์ (Medical Affairs)"
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#006699]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ชื่อผู้ประสานงานหลัก (ที่จะแสดงให้แพทย์เห็น) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contactSettings.coordinator_name}
                      onChange={(e) => setContactSettings({ ...contactSettings, coordinator_name: e.target.value })}
                      placeholder="เช่น คุณสิริมาศ หรือ เจ้าหน้าที่ฝ่ายการแพทย์"
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#006699]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      เบอร์โทรศัพท์ฉุกเฉิน (เบอร์หลักของโรงพยาบาล) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={contactSettings.phone_emergency}
                        onChange={(e) => setContactSettings({ ...contactSettings, phone_emergency: e.target.value })}
                        placeholder="076-361-888"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#006699]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      เบอร์ต่อ (Extension)
                    </label>
                    <input
                      type="text"
                      value={contactSettings.phone_ext}
                      onChange={(e) => setContactSettings({ ...contactSettings, phone_ext: e.target.value })}
                      placeholder="เช่น 1234"
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-[#006699]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      เบอร์มือถือสายตรง (Hotline 24 ชม.)
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={contactSettings.phone_hotline}
                        onChange={(e) => setContactSettings({ ...contactSettings, phone_hotline: e.target.value })}
                        placeholder="081-999-8888"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-[#006699]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      อีเมลติดต่อฝ่ายการแพทย์
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={contactSettings.email}
                        onChange={(e) => setContactSettings({ ...contactSettings, email: e.target.value })}
                        placeholder="medical_affairs@bsi.hospital"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#006699]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    สถานที่ติดต่อภายในโรงพยาบาล
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={contactSettings.location}
                      onChange={(e) => setContactSettings({ ...contactSettings, location: e.target.value })}
                      placeholder="เช่น อาคาร A ชั้น 3 ฝ่ายการแพทย์ โรงพยาบาลกรุงเทพศิริโรจน์"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#006699]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#006699]" />
                    <span className="font-semibold text-slate-700">ส่ง Push Alert ด่วนเข้า LINE แอดมินทันทีที่มีการลาฉุกเฉิน</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={contactSettings.notify_line}
                    onChange={(e) => setContactSettings({ ...contactSettings, notify_line: e.target.checked })}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {contactLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>บันทึกข้อมูลติดต่อ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview Box */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ตัวอย่างการแสดงผลบนหน้าจอแพทย์ (Live Preview)</span>
              </h4>

              {/* Simulation of Emergency banner */}
              <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-sm space-y-3">
                <div className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                  กล่องแจ้งเตือนลาฉุกเฉิน (Same-day Leave)
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                  <p className="text-[11px] text-rose-800 leading-snug">
                    กรุณาโทรแจ้งฝ่ายการแพทย์ ({contactSettings.coordinator_name || 'เจ้าหน้าที่'}) โดยตรงทันที เพื่อประสานงานปิดตารางออกตรวจ
                  </p>
                  <div className="py-2 px-3 bg-rose-600 text-white rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-xs">
                    <Phone className="w-3.5 h-3.5" />
                    <span>โทรแจ้งฝ่ายการแพทย์ ({contactSettings.phone_emergency || '076-361-888'}{contactSettings.phone_ext ? ` ต่อ ${contactSettings.phone_ext}` : ''})</span>
                  </div>
                </div>
              </div>

              {/* Contact Card Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  นามบัตรหน่วยงาน
                </div>
                <div className="font-bold text-slate-800 text-sm">
                  {contactSettings.department_name || 'ฝ่ายการแพทย์'}
                </div>
                <div className="text-slate-500 text-[11px] space-y-1">
                  <div>ผู้ประสานงาน: <strong className="text-slate-700">{contactSettings.coordinator_name || '-'}</strong></div>
                  <div>เบอร์โทรศัพท์: <strong className="text-slate-700">{contactSettings.phone_emergency || '-'} {contactSettings.phone_ext ? `(ต่อ ${contactSettings.phone_ext})` : ''}</strong></div>
                  {contactSettings.phone_hotline && (
                    <div>สายด่วน: <strong className="text-slate-700">{contactSettings.phone_hotline}</strong></div>
                  )}
                  {contactSettings.email && (
                    <div>อีเมล: <strong className="text-slate-700">{contactSettings.email}</strong></div>
                  )}
                  {contactSettings.location && (
                    <div>สถานที่: <span className="text-slate-600">{contactSettings.location}</span></div>
                  )}
                </div>
              </div>

            </div>

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

      {/* ========================================================= */}
      {/* MODAL 4: MANAGE DOCTOR LEAVE QUOTAS                       */}
      {/* ========================================================= */}
      {quotaModalOpen && selectedDoctorForQuota && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#006699]" />
                  <span>จัดการโควตาสิทธิ์วันลาประจำปี ({currentFiscalYear})</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  แพทย์: <strong className="text-slate-700">{selectedDoctorForQuota.prefix_th}{selectedDoctorForQuota.first_name_th} {selectedDoctorForQuota.last_name_th}</strong> 
                  <span className="font-mono text-slate-400 ml-1">({selectedDoctorForQuota.employee_id} • {selectedDoctorForQuota.doctor_type === 'FULL_TIME' ? 'แพทย์ประจำ' : 'พาร์ทไทม์'})</span>
                </p>
              </div>
              <button 
                onClick={() => setQuotaModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-sky-50/60 px-5 py-2.5 border-b border-sky-100 flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="text-sky-900 font-medium text-[11px]">
                💡 ช่องว่าง = ไม่กำหนดโควตา (จะแสดงเป็น "ตามเกณฑ์ รพ." หรือ "ไม่จำกัดสิทธิ์")
              </span>
              <button
                type="button"
                onClick={handleApplyPreset}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-sky-50 text-[#006699] border border-sky-200 rounded-lg font-bold text-[11px] shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ใส่ค่ามาตรฐาน (พักผ่อน 10, ป่วย 30, กิจ 5, อบรม 10)</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuota} className="p-5 space-y-4">
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">ประเภทการลา</th>
                      <th className="py-2.5 px-3 text-center w-28">โควตาประจำปี (วัน)</th>
                      <th className="py-2.5 px-3 text-center w-24">ยกยอดมา (วัน)</th>
                      <th className="py-2.5 px-3 text-center">ใช้ไปแล้ว</th>
                      <th className="py-2.5 px-3 text-right">คงเหลือสุทธิ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doctorQuotaList.map((item, idx) => {
                      const ent = item.entitlement_days === '' ? null : Number(item.entitlement_days);
                      const carry = Number(item.carried_over_days) || 0;
                      const used = Number(item.used_days) || 0;
                      const pending = Number(item.pending_days) || 0;
                      const hasQ = ent !== null && !isNaN(ent);
                      const remaining = hasQ ? Math.max(0, ent + carry - used - pending) : null;

                      return (
                        <tr key={item.leave_type_id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-bold text-slate-800">{item.leave_type_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({item.leave_type_code})</span>
                            </div>
                          </td>

                          {/* Entitlement Days */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="ไม่กำหนด"
                              value={item.entitlement_days}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDoctorQuotaList(prev => prev.map((q, i) => i === idx ? { ...q, entitlement_days: val } : q));
                              }}
                              className="w-24 text-center py-1 px-2 rounded-lg border border-slate-200 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#006699]"
                            />
                          </td>

                          {/* Carried Over Days */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={item.carried_over_days}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDoctorQuotaList(prev => prev.map((q, i) => i === idx ? { ...q, carried_over_days: val } : q));
                              }}
                              disabled={!hasQ}
                              className="w-20 text-center py-1 px-2 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 disabled:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-[#006699]"
                            />
                          </td>

                          {/* Used Days */}
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                            {used} {pending > 0 && <span className="text-amber-600 font-sans text-[10px]">(รอ {pending})</span>}
                          </td>

                          {/* Remaining */}
                          <td className="py-2.5 px-3 text-right">
                            {hasQ ? (
                              <span className="font-extrabold text-[#006699] text-xs">
                                เหลือ {remaining} วัน
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">
                                {item.leave_type_code === 'UNPAID' ? 'ไม่จำกัดสิทธิ์' : 'ตามเกณฑ์ รพ.'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  ระบบจะอัปเดตสิทธิ์ให้แพทย์ทันทีแบบ Real-time
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuotaModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={savingQuota}
                    className="px-5 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingQuota ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกโควตา</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
