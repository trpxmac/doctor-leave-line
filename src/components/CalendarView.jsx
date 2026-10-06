import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';

export default function CalendarView({ requests }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const monthNamesTh = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const requestsByDate = useMemo(() => {
    const map = {};
    requests.forEach(req => {
      if (req.status === 'CANCELLED') return;
      
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(req);
      }
    });
    return map;
  }, [requests]);

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-28 bg-slate-50/50 rounded-xl border border-dashed border-slate-200"></div>);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayReqs = requestsByDate[dStr] || [];
    
    dayReqs.sort((a,b) => {
      if(a.is_emergency && !b.is_emergency) return -1;
      if(!a.is_emergency && b.is_emergency) return 1;
      return 0;
    });

    const isTodayStr = new Date().toISOString().split('T')[0] === dStr;
    const isWeekend = new Date(year, month, i).getDay() === 0 || new Date(year, month, i).getDay() === 6;

    days.push(
      <div key={`day-${i}`} className={`min-h-28 p-2 rounded-xl border ${isTodayStr ? 'border-sky-400 bg-sky-50 shadow-xs ring-1 ring-sky-400' : isWeekend ? 'bg-slate-50/50 border-slate-200' : 'border-slate-200 bg-white hover:bg-slate-50 transition-colors'} flex flex-col group`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-bold ${isTodayStr ? 'text-[#006699]' : isWeekend ? 'text-rose-500' : 'text-slate-700'}`}>{i}</span>
          {dayReqs.length > 0 && (
            <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md group-hover:bg-[#006699] group-hover:text-white transition-colors">
              {dayReqs.length} ลา
            </span>
          )}
        </div>
        <div className="space-y-1.5 flex-1 overflow-y-auto max-h-32 pr-0.5 custom-scrollbar">
          {dayReqs.map(req => {
            let bgColor = 'bg-amber-50 text-amber-800 border-amber-200';
            if (req.status === 'APPROVED') bgColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            if (req.status === 'REJECTED') bgColor = 'bg-rose-50 text-rose-800 border-rose-200';
            
            return (
              <div key={`${req.id}-${i}`} className={`text-[10px] p-1.5 rounded-lg border leading-tight transition-transform hover:scale-[1.02] cursor-default ${bgColor} ${req.is_emergency ? 'ring-1 ring-rose-500 shadow-sm' : ''}`} title={req.reason}>
                <div className="font-bold flex items-center justify-between">
                  <span className="truncate">{req.doctor?.name}</span>
                  {req.is_emergency && <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0 ml-1" />}
                </div>
                <div className="text-[9px] opacity-80 truncate">{req.leave_type?.name_th}</div>
              </div>
            )
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">ปฏิทินรายการลา (Calendar View)</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">ภาพรวมตารางการลาของแพทย์ประจำเดือน ช่วยตรวจสอบการซ้อนทับ</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
          <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg text-slate-600 hover:shadow-xs transition-all active:scale-95">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={today} className="px-4 py-2 text-sm font-bold text-[#006699] hover:bg-white rounded-lg hover:shadow-xs transition-all">
            {monthNamesTh[month]} {year + 543}
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg text-slate-600 hover:shadow-xs transition-all active:scale-95">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 mb-3">
        {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((d, i) => (
          <div key={d} className={`text-center text-xs font-bold ${i === 0 || i === 6 ? 'text-rose-500' : 'text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-3">
        {days}
      </div>
      
      <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-50 border border-amber-200"></div> รออนุมัติ</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200"></div> อนุมัติแล้ว</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-50 border border-rose-200"></div> ไม่อนุมัติ</div>
        <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> ลาฉุกเฉิน</div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
      `}} />
    </div>
  );
}
