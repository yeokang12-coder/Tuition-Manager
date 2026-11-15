import React from 'react';
import { Calendar, Receipt, Users, BarChart3, Settings, Sparkles, User, RefreshCw, LogOut } from 'lucide-react';
import { Teacher } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  currentTeacher?: Teacher | null;
  onSwitchTeacher?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  selectedMonth,
  setSelectedMonth,
  currentTeacher,
  onSwitchTeacher,
  onLogout,
}) => {
  const tabs = [
    { id: 'calendar', label: '课表与打卡', icon: Calendar },
    { id: 'receipt', label: '对账收据', icon: Receipt },
    { id: 'students', label: '学生管理', icon: Users },
    { id: 'stats', label: '财务与统计', icon: BarChart3 },
    { id: 'settings', label: '老师设置', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-6 py-2.5 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  Tutor Receipt Maker
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hidden sm:inline-block whitespace-nowrap">
                  补习助手
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xl:block leading-none mt-0.5">
                大马补习老师专属 • 排课打卡 • 一键生成 WhatsApp 对账卡片
              </p>
            </div>
          </div>

          {/* Center Tabs (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-all whitespace-nowrap ${
                    active
                      ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right actions: Month Selector, Teacher Switcher & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Month Selector */}
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-slate-400 hidden 2xl:inline">月份:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2 py-1 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
              />
            </div>

            {/* Teacher Badge / Switcher */}
            {currentTeacher ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onSwitchTeacher}
                  title="点击切换老师账号"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold transition-all shadow-sm"
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentTeacher.name ? currentTeacher.name.charAt(0) : <User className="w-3 h-3" />}
                  </div>
                  <span className="max-w-[70px] sm:max-w-[110px] truncate">
                    {currentTeacher.name}
                  </span>
                  <RefreshCw className="w-3 h-3 text-indigo-400 shrink-0 hidden sm:inline" />
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    title="退出登录"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onSwitchTeacher}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
              >
                <User className="w-3.5 h-3.5" />
                <span>登录老师账号</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200 py-1 px-2 flex justify-around items-center shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-lg transition-all ${
                active ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className={`p-1 rounded-md ${active ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
