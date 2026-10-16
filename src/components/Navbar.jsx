import React, { useState, useEffect, useRef } from 'react';
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
  X,
  CalendarDays,
  Award,
  GitMerge,
  CalendarRange,
  ChevronDown,
  Settings2
} from 'lucide-react';
import PersonaSwitcher from './PersonaSwitcher';
import LineSimulatorModal from './LineSimulatorModal';

export default function Navbar() {
  const location = useLocation();
  const { currentDoctor } = useAuth();
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [masterDataOpen, setMasterDataOpen] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMasterDataOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const roles = currentDoctor?.roles || [];
  const isDoctorOnly = roles.length === 1 && roles.includes('DOCTOR');
  const isApprover = roles.includes('DEPT_HEAD') || roles.includes('APPROVER');
  const isAdmin = roles.includes('MEDICAL_ADMIN') || roles.includes('ADMIN');

  // Sub-items for Master Data Dropdown
  const masterDataItems = [
    { to: '/admin/criteria', label: 'เกณฑ์โควตาแผนก', desc: 'กำหนดจำนวนแพทย์ที่ลาได้พร้อมกัน', icon: Sliders },
    { to: '/admin/master-data', label: 'สายอนุมัติ & ประเภทการลา', desc: 'จัดการ Approver และเงื่อนไขการลา', icon: GitMerge },
    { to: '/admin/tenure', label: 'คำนวณอายุงาน & สิทธิ์', desc: 'Vacation Tiers & Prorating', icon: Award },
    { to: '/admin/holidays', label: 'ปฏิทินวันหยุด รพ.', desc: 'วันหยุดนักขัตฤกษ์ 19 วัน', icon: CalendarDays },
  ];

  const isMasterDataActive = masterDataItems.some(item => location.pathname === item.to);

  return (
    <>
      {/* Top Persona Bar */}
      <PersonaSwitcher />

      {/* Main Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-3 sm:gap-6">
            
            {/* Official Hospital Brand Logo & Name */}
            <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
              <img 
                src="/official_bsi_logo.svg" 
                alt="Bangkok Hospital Siriroj" 
                className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-102 shrink-0" 
              />
              <div className="border-l border-slate-200 pl-2.5 sm:pl-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm leading-tight whitespace-nowrap">
                    Doctor Leave Portal
                  </span>
                  <span className="bg-sky-100 text-[#002d74] text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-sky-200 shrink-0">
                    BSI
                  </span>
                </div>
                {/* Responsive Subtitle: Full on wide screens, concise on mid/tablets, hidden on tiny phones */}
                <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap hidden 2xl:block">
                  ระบบบริหารการลาแพทย์ • โรงพยาบาลกรุงเทพศิริโรจน์
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium whitespace-nowrap hidden sm:block 2xl:hidden">
                  ระบบบริหารการลาแพทย์ (BSI)
                </p>
              </div>
            </Link>

            {/* Desktop Navigation - Organized & Uncluttered (Active on xl screens) */}
            <nav className="hidden xl:flex items-center gap-1.5 shrink-0">
              
              {/* 1. ยื่นใบลา (LIFF) - Always Visible for Doctors & Admin */}
              <Link
                to="/"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  location.pathname === '/'
                    ? 'bg-sky-50 text-[#006699] border border-sky-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className={`w-4 h-4 shrink-0 ${location.pathname === '/' ? 'text-[#006699]' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap">ยื่นใบลา (LIFF)</span>
              </Link>

              {/* 2. ประวัติ & สิทธิ์คงเหลือ - Visible for Doctor role */}
              {isDoctorOnly && (
                <Link
                  to="/my-history"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/my-history'
                      ? 'bg-sky-50 text-[#006699] border border-sky-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Clock className={`w-4 h-4 shrink-0 ${location.pathname === '/my-history' ? 'text-[#006699]' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">ประวัติ &amp; สิทธิ์คงเหลือ</span>
                </Link>
              )}

              {/* 3. ศูนย์อนุมัติ - Visible for Dept Head / Approver */}
              {isApprover && (
                <Link
                  to="/approver"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/approver'
                      ? 'bg-sky-50 text-[#006699] border border-sky-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CheckSquare className={`w-4 h-4 shrink-0 ${location.pathname === '/approver' ? 'text-[#006699]' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">ศูนย์อนุมัติ</span>
                </Link>
              )}

              {/* 4. ตารางเวรแพทย์ (Shift Schedule) - Visible for Dept Head & Admin */}
              {(isAdmin || isApprover) && (
                <Link
                  to="/admin/shifts"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/admin/shifts'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CalendarRange className={`w-4 h-4 shrink-0 ${location.pathname === '/admin/shifts' ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">ตารางเวรแพทย์</span>
                </Link>
              )}

              {/* 5. ฝ่ายการแพทย์ (พี่กุ้ง) - Admin Dashboard */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/admin'
                      ? 'bg-sky-50 text-[#006699] border border-sky-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className={`w-4 h-4 shrink-0 ${location.pathname === '/admin' ? 'text-[#006699]' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">ฝ่ายการแพทย์</span>
                </Link>
              )}

              {/* 6. ตั้งค่า & เกณฑ์ (Master Data Dropdown) - Consolidated Admin Tools */}
              {isAdmin && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setMasterDataOpen(!masterDataOpen)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                      isMasterDataActive || masterDataOpen
                        ? 'bg-purple-50 text-purple-800 border border-purple-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings2 className={`w-4 h-4 shrink-0 ${isMasterDataActive ? 'text-purple-700' : 'text-slate-400'}`} />
                    <span className="whitespace-nowrap">ตั้งค่า &amp; เกณฑ์</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${masterDataOpen ? 'rotate-180 text-purple-700' : 'text-slate-400'}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {masterDataOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-scale-in">
                      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                        ระบบจัดการเกณฑ์ &amp; Master Data
                      </div>
                      {masterDataItems.map(item => {
                        const Icon = item.icon;
                        const isSubActive = location.pathname === item.to;
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setMasterDataOpen(false)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all ${
                              isSubActive
                                ? 'bg-purple-50 text-purple-900 font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg mt-0.5 ${isSubActive ? 'bg-purple-200/60 text-purple-800' : 'bg-slate-100 text-slate-500'}`}>
                              <Icon className="w-4 h-4 shrink-0" />
                            </div>
                            <div>
                              <div className="text-xs font-bold whitespace-nowrap">{item.label}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 7. Audit Log (PDPA) */}
              {isAdmin && (
                <Link
                  to="/admin/audit"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/admin/audit'
                      ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <History className={`w-4 h-4 shrink-0 ${location.pathname === '/admin/audit' ? 'text-slate-900' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">Audit Log (PDPA)</span>
                </Link>
              )}

            </nav>

            {/* Right Actions: LINE Simulator Button & Active Doctor Badge */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                onClick={() => setIsSimulatorOpen(true)}
                className="relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold shadow-xs transition-all hover:scale-102 active:scale-98 whitespace-nowrap"
                title="เปิดเครื่องจำลองการส่ง LINE Flex Message 1-on-1"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">LINE Simulator</span>
                {msgCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border-2 border-white animate-bounce">
                    {msgCount}
                  </span>
                )}
              </button>

              {/* Active Profile Info */}
              {currentDoctor && (
                <div className="hidden 2xl:flex items-center gap-2.5 pl-2.5 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0 shadow-xs">
                    <img
                      src={currentDoctor.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100'}
                      alt={currentDoctor.first_name_th}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left text-xs min-w-0">
                    <div className="font-bold text-slate-800 leading-tight truncate">
                      {currentDoctor.prefix_th}{currentDoctor.first_name_th}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {currentDoctor.department_name || 'อายุรกรรม'}
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile menu trigger (visible on screens below xl) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Menu (visible on screens below xl) */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <FileText className="w-4 h-4 text-[#006699]" />
              <span>ยื่นใบลา (LIFF)</span>
            </Link>

            <Link
              to="/my-history"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <Clock className="w-4 h-4 text-[#006699]" />
              <span>ประวัติ &amp; สิทธิ์คงเหลือ</span>
            </Link>

            {(isAdmin || isApprover) && (
              <Link
                to="/admin/shifts"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <CalendarRange className="w-4 h-4 text-emerald-600" />
                <span>ตารางเวรแพทย์</span>
              </Link>
            )}

            {isApprover && (
              <Link
                to="/approver"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <CheckSquare className="w-4 h-4 text-[#006699]" />
                <span>ศูนย์อนุมัติ</span>
              </Link>
            )}

            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#006699]" />
                  <span>ฝ่ายการแพทย์</span>
                </Link>

                <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  ตั้งค่าระบบ (Master Data)
                </div>

                {masterDataItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 pl-6"
                    >
                      <Icon className="w-3.5 h-3.5 text-purple-600" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <Link
                  to="/admin/audit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 mt-1 border-t border-slate-100 pt-2"
                >
                  <History className="w-4 h-4 text-slate-700" />
                  <span>Audit Log (PDPA)</span>
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* LINE Simulator Modal */}
      <LineSimulatorModal isOpen={isSimulatorOpen} onClose={() => setIsSimulatorOpen(false)} />
    </>
  );
}
