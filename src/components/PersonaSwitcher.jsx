import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Shield, Stethoscope, UserCog } from 'lucide-react';

export default function PersonaSwitcher() {
  const { doctors, currentDoctor, switchDoctor } = useAuth();

  if (!doctors || doctors.length === 0) return null;

  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 font-semibold text-sky-400">
          <UserCog className="w-3.5 h-3.5" />
          สลับบทบาทจำลอง (Persona Switcher):
        </span>
        <span className="text-slate-400 hidden md:inline">
          คลิกเพื่อสลับผู้ใช้งานทดสอบ Flow อนุมัติ 2 ขั้นตอน (หัวหน้าแพทย์ &gt;&gt; นพ.ปริวรรธน์)
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 max-h-24 sm:max-h-none overflow-y-auto">
        {doctors.map(doc => {
          const isActive = currentDoctor?.id === doc.id;
          let roleBadge = 'แพทย์';
          let roleColor = 'bg-slate-700 text-slate-200';

          if (doc.roles.includes('EXECUTIVE_APPROVER')) {
            roleBadge = 'ผู้ช่วย ผอ. (Step 2)';
            roleColor = 'bg-purple-600 text-white font-bold ring-1 ring-purple-300';
          } else if (doc.roles.includes('MEDICAL_ADMIN')) {
            roleBadge = 'ฝ่ายการแพทย์ (Admin)';
            roleColor = 'bg-amber-500 text-white font-bold';
          } else if (doc.roles.includes('DEPT_HEAD')) {
            roleBadge = 'หัวหน้าแผนก (Step 1)';
            roleColor = 'bg-emerald-600 text-white font-bold';
          } else if (doc.doctor_type === 'PART_TIME') {
            roleBadge = 'แพทย์ PT';
            roleColor = 'bg-indigo-600 text-white';
          } else {
            roleBadge = 'แพทย์ FT';
            roleColor = 'bg-sky-600 text-white';
          }

          return (
            <button
              key={doc.id}
              onClick={() => switchDoctor(doc.id)}
              title={`${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th} (${doc.position || doc.department_name || ''})`}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm ring-2 ring-sky-400 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{doc.prefix_th}{doc.first_name_th}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded ${roleColor}`}>
                {roleBadge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
