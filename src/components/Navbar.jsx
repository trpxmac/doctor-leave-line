import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Clock,
  CheckSquare,
  LayoutDashboard,
  Sliders,
  History,
  MessageCircle,
  Menu,
  X
} from 'lucide-react';
import PersonaSwitcher from './PersonaSwitcher';
import LineSimulatorModal from './LineSimulatorModal';

export default function Navbar() {
  const location = useLocation();
  const { currentDoctor } = useAuth();
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [msgCount, setMsgCount] = useState(0);

  // Poll simulator messages count
  useEffect(() => {
    const checkMsgs = async () => {
      try {
        const res = await fetch('/api/line/simulator/messages');
        if (res.ok) {
          const data = await res.json();
          setMsgCount(data.length);
        }
      } catch (e) {
        // ignore
      }
    };
    checkMsgs();
    const timer = setInterval(checkMsgs, 4000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { to: '/', label: 'ยื่นใบลา (LIFF)', icon: FileText, desc: 'Doctor LIFF', allowedRoles: ['DOCTOR', 'ADMIN'] },
    { to: '/my-history', label: 'ประวัติการลา', icon: Clock, desc: 'My History', allowedRoles: ['DOCTOR'] },
    { to: '/approver', label: 'ศูนย์อนุมัติ', icon: CheckSquare, desc: 'Approver', allowedRoles: ['APPROVER'] },
    { to: '/admin', label: 'ฝ่ายการแพทย์ (พี่กุ้ง)', icon: LayoutDashboard, desc: 'Admin', allowedRoles: ['ADMIN'] },
    { to: '/admin/criteria', label: 'เกณฑ์โควตา', icon: Sliders, desc: 'Criteria', allowedRoles: ['ADMIN'] },
    { to: '/admin/audit', label: 'Audit Log (PDPA)', icon: History, desc: 'Audit', allowedRoles: ['ADMIN'] },
  ].filter(item => {
    if (!currentDoctor) return false;
    return item.allowedRoles.some(role => currentDoctor.roles.includes(role));
  });

  return (
    <>
      {/* Top Persona Bar */}
      <PersonaSwitcher />

      {/* Main Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Brand Logo & Name */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#006699] flex items-center justify-center text-white shadow-md shadow-sky-900/10">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6v12M6 12h12" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-base leading-tight tracking-tight">
                    Doctor Leave @ LINE
                  </span>
                  <span className="bg-sky-100 text-[#006699] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    BSI
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  โรงพยาบาลกรุงเทพสิริโรจน์ (Bangkok Hospital Siriroj)
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-sky-50 text-[#006699] font-bold border border-sky-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#006699]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions: LINE Simulator Button & Active Doctor Badge */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSimulatorOpen(true)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold shadow-sm transition-all hover:scale-102 active:scale-98"
                title="เปิดเครื่องจำลองการส่ง LINE Flex Message 1-on-1"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">LINE Simulator</span>
                {msgCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border-2 border-white animate-bounce">
                    {msgCount}
                  </span>
                )}
              </button>

              {/* Active Profile Info */}
              {currentDoctor && (
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-300">
                    <img
                      src={currentDoctor.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100'}
                      alt={currentDoctor.first_name_th}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left text-xs">
                    <div className="font-semibold text-slate-800 leading-tight">
                      {currentDoctor.prefix_th}{currentDoctor.first_name_th}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {currentDoctor.department_name || 'อายุรกรรม'}
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-sky-50 text-[#006699] font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* LINE Simulator Modal */}
      <LineSimulatorModal isOpen={isSimulatorOpen} onClose={() => setIsSimulatorOpen(false)} />
    </>
  );
}
