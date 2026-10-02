import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Lock,
  UserCheck
} from 'lucide-react';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const actor = log.actor_name?.toLowerCase() || '';
      const table = log.table_name?.toLowerCase() || '';
      if (!actor.includes(q) && !table.includes(q)) return false;
    }
    return true;
  });

  const getActionBadge = (action) => {
    switch (action) {
      case 'INSERT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">สร้างคำขอใหม่</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">ปรับสถานะ / อนุมัติ</span>;
      case 'OVERRIDE_APPROVE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Override อนุมัติแทน</span>;
      case 'CANCEL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">ยกเลิกคำขอ</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Audit Logs & PDPA Compliance (บันทึกประวัติการตรวจสอบ)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            เก็บบันทึกประวัติการยื่น อนุมัติ และเปลี่ยนแปลงสถานะคำขอลาแพทย์อย่างละเอียดตามมาตรฐานความปลอดภัย
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรชประวัติ
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาผู้กระทำ หรือตารางข้อมูล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden w-full sm:w-64"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500 font-medium"
            >
              <option value="ALL">Action ทั้งหมด</option>
              <option value="INSERT">สร้างคำขอใหม่ (INSERT)</option>
              <option value="UPDATE">ปรับสถานะ / อนุมัติ (UPDATE)</option>
              <option value="OVERRIDE_APPROVE">Override อนุมัติแทน</option>
              <option value="CANCEL">ยกเลิกคำขอ (CANCEL)</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">วัน-เวลา</th>
                <th className="py-3 px-4">การกระทำ (Action)</th>
                <th className="py-3 px-4">ผู้ดำเนินการ (Actor)</th>
                <th className="py-3 px-4">ตารางข้อมูล</th>
                <th className="py-3 px-4">รายละเอียดข้อมูล</th>
                <th className="py-3 px-4 font-mono text-[10px]">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    ไม่พบบันทึก Audit Log
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {new Date(log.created_at).toLocaleString('th-TH')}
                    </td>
                    <td className="py-3 px-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.actor_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {log.table_name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200/80 max-w-xs truncate">
                        {JSON.stringify(log.new_data)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[10px]">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
