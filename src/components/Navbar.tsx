import React from 'react';
import { Calendar, Receipt, Users, BarChart3, Settings, Sparkles, User, RefreshCw } from 'lucide-react';
import { Teacher } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  currentTeacher?: Teacher | null;
  onSwitchTeacher?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  selectedMonth,
  setSelectedMonth,
  currentTeacher,
  onSwitchTeacher,
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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-8 py-3.5 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Tutor Receipt Maker
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hidden sm:inline-block">
                  补习课时与对账助手
                </span>
              </h1>
              <p className="text-xs text-slate-500 hidden md:block">
                专为大马补习老师设计 • 轻松排课打卡 • 一键生成 WhatsApp 对账卡片
              </p>
            </div>
          </div>

          {/* Center Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right actions: Month Selector & Teacher Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Month Selector */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-500 hidden xl:inline">月份:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
              />
            </div>

            {/* Teacher Badge / Switcher */}
            {onSwitchTeacher && (
              <button
                type="button"
                onClick={onSwitchTeacher}
                title="点击切换老师账号"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold transition-all shadow-sm hover:shadow"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {currentTeacher?.name ? currentTeacher.name.charAt(0) : <User className="w-3 h-3" />}
                </div>
                <span className="max-w-[80px] sm:max-w-[120px] truncate">
                  {currentTeacher?.name || '未登录'}
                </span>
                <span className="text-[10px] text-indigo-400 hover:text-indigo-600 border-l border-indigo-200 pl-1.5 hidden sm:inline-flex items-center gap-0.5">
                  <RefreshCw className="w-2.5 h-2.5" />
                  切换
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200 py-1.5 px-3 flex justify-around items-center shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg transition-all ${
                active ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className={`p-1 rounded-md ${active ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
