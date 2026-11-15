import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, CheckCircle2, Clock, 
  AlertCircle, RefreshCw, CalendarDays, Edit3, Trash2, X, Sparkles, Filter 
} from 'lucide-react';
import { LessonSession, Student, SessionStatus } from '../types';
import { api } from '../api/client';

interface CalendarViewProps {
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
  students: Student[];
  initialStudentFilter?: number | 'all';
  onRefreshStats?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedMonth,
  setSelectedMonth,
  students,
  initialStudentFilter = 'all',
  onRefreshStats,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<number | 'all'>(initialStudentFilter);

  useEffect(() => {
    setSelectedStudentFilter(initialStudentFilter);
  }, [initialStudentFilter]);

  // Modal states
  const [editingSession, setEditingSession] = useState<LessonSession | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState('');
  const [generating, setGenerating] = useState(false);

  // New session form state
  const [newSessionStudentId, setNewSessionStudentId] = useState<number>(students[0]?.id || 0);
  const [newSessionSubject, setNewSessionSubject] = useState('数学');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionStartTime, setNewSessionStartTime] = useState('14:00');
  const [newSessionEndTime, setNewSessionEndTime] = useState('15:30');
  const [newSessionDuration, setNewSessionDuration] = useState(1.5);
  const [newSessionRate, setNewSessionRate] = useState(50);
  const [newSessionNotes, setNewSessionNotes] = useState('');

  const [year, monthStr] = selectedMonth.split('-');
  const currentYear = parseInt(year);
  const currentMonth = parseInt(monthStr); // 1-12

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.getSessions({ month: selectedMonth });
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [selectedMonth]);

  // Handle month navigation
  const handlePrevMonth = () => {
    const d = new Date(currentYear, currentMonth - 2, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  const handleNextMonth = () => {
    const d = new Date(currentYear, currentMonth, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  const handleGoToday = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  // Auto-generate recurring sessions for the month
  const handleGenerateRecurring = async () => {
    if (!window.confirm(`确定要根据排课规律，自动生成 ${selectedMonth} 的所有固定课时吗？`)) return;
    try {
      setGenerating(true);
      const res = await api.generateRecurringSessions(currentYear, currentMonth);
      alert(`已成功生成 ${res.generatedCount} 节周期课程！`);
      await loadSessions();
      onRefreshStats?.();
    } catch (err: any) {
      alert(`生成失败: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Quick attendance update
  const handleQuickStatusChange = async (session: LessonSession, newStatus: SessionStatus) => {
    try {
      await api.updateSession(session.id, { status: newStatus });
      await loadSessions();
      onRefreshStats?.();
      if (editingSession?.id === session.id) {
        setEditingSession(null);
      }
    } catch (err: any) {
      alert(`打卡失败: ${err.message}`);
    }
  };

  // Save edited session details
  const handleSaveEdit = async () => {
    if (!editingSession) return;
    try {
      await api.updateSession(editingSession.id, {
        status: editingSession.status,
        duration_hours: Number(editingSession.duration_hours),
        rate: Number(editingSession.rate),
        fee: Number(editingSession.duration_hours) * Number(editingSession.rate),
        notes: editingSession.notes,
        subject: editingSession.subject,
        start_time: editingSession.start_time,
        end_time: editingSession.end_time,
        date: editingSession.date,
      });
      setEditingSession(null);
      await loadSessions();
      onRefreshStats?.();
    } catch (err: any) {
      alert(`更新失败: ${err.message}`);
    }
  };

  // Delete session
  const handleDeleteSession = async (id: number) => {
    if (!window.confirm('确定要删除这节课时记录吗？')) return;
    try {
      await api.deleteSession(id);
      setEditingSession(null);
      await loadSessions();
      onRefreshStats?.();
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    }
  };

  // Open add session modal
  const handleOpenAddModal = (dateStr?: string) => {
    const targetDate = dateStr || `${selectedMonth}-01`;
    setSelectedDateForAdd(targetDate);
    setNewSessionDate(targetDate);
    if (students.length > 0) {
      const s = students[0];
      setNewSessionStudentId(s.id);
      setNewSessionRate(s.default_rate);
      setNewSessionSubject(s.subjects.split('、')[0] || '补习');
    }
    setIsAddModalOpen(true);
  };

  // Submit new session
  const handleCreateNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionStudentId || !newSessionDate) return;
    try {
      const fee = Number(newSessionDuration) * Number(newSessionRate);
      await api.createSession({
        student_id: newSessionStudentId,
        subject: newSessionSubject,
        date: newSessionDate,
        start_time: newSessionStartTime,
        end_time: newSessionEndTime,
        duration_hours: Number(newSessionDuration),
        rate: Number(newSessionRate),
        fee,
        status: 'scheduled',
        notes: newSessionNotes,
      });
      setIsAddModalOpen(false);
      await loadSessions();
      onRefreshStats?.();
    } catch (err: any) {
      alert(`创建课时失败: ${err.message}`);
    }
  };

  // Filtered sessions
  const filteredSessions = sessions.filter(s => {
    if (selectedStudentFilter === 'all') return true;
    return s.student_id === selectedStudentFilter;
  });

  // Calendar grid calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const leadingBlanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getSessionsForDay = (day: number) => {
    const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    return filteredSessions.filter((s) => s.date === dayStr);
  };

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300"><CheckCircle2 className="w-3 h-3 text-emerald-700" /> 🟢 已上课</span>;
      case 'scheduled':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200/60"><Clock className="w-3 h-3 text-indigo-600" /> 🔵 待上课</span>;
      case 'leave':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-md border border-rose-300"><AlertCircle className="w-3 h-3 text-rose-700" /> 🔴 请假缺席 (RM 0)</span>;
      case 'makeup':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200/60"><RefreshCw className="w-3 h-3 text-purple-600" /> 🟣 补课</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-md border border-rose-300"><X className="w-3 h-3 text-rose-700" /> 🔴 已取消 (RM 0)</span>;
      default:
        return null;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-20 md:pb-8">
      {/* Action and Controls Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation & Month Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-all"
              title="上个月"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-800">
              {currentYear}年 {currentMonth}月
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-all"
              title="下个月"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleGoToday}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
          >
            回到今天
          </button>
        </div>

        {/* Filters & View switcher */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Student Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent border-none focus:outline-none cursor-pointer font-semibold text-slate-800"
            >
              <option value="all">所有学生 ({students.length})</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.grade || '补习'})
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'month' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              月历
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              列表
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleGenerateRecurring}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200/80 transition-all shadow-xs"
            title="根据设定的每周周期自动批量排课"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            {generating ? '生成中...' : '自动按规律排课'}
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            临时排课
          </button>
        </div>
      </div>

      {/* Color Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center flex-wrap gap-4">
          <span className="font-bold text-slate-700">状态颜色说明：</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
            🟢 绿色 = 已上课 (正常计费)
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700">
            <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block"></span>
            🔴 红色 = 已取消 / 请假缺席 (对账单显示 RM 0.00 不计费)
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700">
            <span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block"></span>
            🔵 蓝色 = 待上课
          </span>
        </div>
        <span className="text-[11px] text-slate-400">💡 点击日历上的任意课程即可一键变绿（已上）或变红（取消）</span>
      </div>

      {/* MONTH CALENDAR VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-600 py-2.5">
            <div className="text-red-500">周日 (Sun)</div>
            <div>周一 (Mon)</div>
            <div>周二 (Tue)</div>
            <div>周三 (Wed)</div>
            <div>周四 (Thu)</div>
            <div>周五 (Fri)</div>
            <div className="text-indigo-600">周六 (Sat)</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[580px]">
            {/* Leading blanks */}
            {leadingBlanks.map((_, index) => (
              <div key={`blank-${index}`} className="bg-slate-50/50 min-h-[95px] sm:min-h-[115px]" />
            ))}

            {/* Month days */}
            {daysArray.map((day) => {
              const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
              const isToday = dayStr === todayStr;
              const daySessions = getSessionsForDay(day);

              return (
                <div
                  key={`day-${day}`}
                  className={`p-1.5 sm:p-2 min-h-[95px] sm:min-h-[115px] transition-colors flex flex-col justify-between group hover:bg-indigo-50/30 ${
                    isToday ? 'bg-indigo-50/40 font-bold' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 font-semibold'
                      }`}
                    >
                      {day}
                    </span>
                    <button
                      onClick={() => handleOpenAddModal(dayStr)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-all"
                      title="在此日期加课"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Sessions pills inside cell */}
                  <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[85px]">
                    {daySessions.map((session) => {
                      const isCompleted = session.status === 'completed';
                      const isCancelledOrLeave = session.status === 'cancelled' || session.status === 'leave';
                      const isMakeup = session.status === 'makeup';

                      return (
                        <div
                          key={session.id}
                          onClick={() => setEditingSession(session)}
                          className={`text-[11px] p-1 sm:p-1.5 rounded-lg cursor-pointer border transition-all flex flex-col gap-0.5 shadow-xs ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-400 hover:bg-emerald-200/80'
                              : isCancelledOrLeave
                              ? 'bg-rose-100 text-rose-950 border-rose-400 hover:bg-rose-200/80'
                              : isMakeup
                              ? 'bg-purple-100 text-purple-950 border-purple-300 hover:bg-purple-200/80'
                              : 'bg-indigo-50/80 text-indigo-950 border-indigo-200 hover:bg-indigo-100/80'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold leading-tight">
                            <span className={`truncate ${isCancelledOrLeave ? 'line-through opacity-85' : ''}`}>
                              {isCompleted ? '✓ ' : isCancelledOrLeave ? '✕ ' : ''}{session.student_name}
                            </span>
                            <span className="text-[10px] font-normal opacity-80">{session.start_time}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] opacity-85">
                            <span className="truncate font-medium">{session.subject}</span>
                            <span className="font-semibold">
                              {isCancelledOrLeave ? '取消(RM0)' : `${session.duration_hours}h`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              {selectedMonth} 课时打卡清单 ({filteredSessions.length} 节课)
            </h3>
            <span className="text-xs text-slate-500">点击右侧按钮可一键变绿（已上课）或变红（取消/缺席）</span>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-sm">该月份暂无排课记录</p>
              <button
                onClick={handleGenerateRecurring}
                className="mt-3 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-all"
              >
                点此按周期批量生成课时
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSessions.map((session) => {
                const isCompleted = session.status === 'completed';
                const isCancelledOrLeave = session.status === 'cancelled' || session.status === 'leave';

                return (
                  <div
                    key={session.id}
                    className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCompleted
                        ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                        : isCancelledOrLeave
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-12 text-center shrink-0">
                        <div className="text-xs font-bold text-slate-800">{session.date.slice(5)}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{session.start_time}</div>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isCancelledOrLeave ? 'line-through text-rose-800' : 'text-slate-900'}`}>
                            {session.student_name}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">({session.student_grade})</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                            {session.subject}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                          <span>时长: {session.duration_hours} 小时 ({session.start_time} - {session.end_time})</span>
                          <span className={isCancelledOrLeave ? 'text-rose-600 font-bold' : 'font-semibold text-slate-700'}>
                            {isCancelledOrLeave ? '费用: RM 0.00 (取消不计费)' : `费用: RM ${session.fee.toFixed(2)}`}
                          </span>
                          {session.notes && <span className="italic text-slate-400 truncate max-w-xs">备注: {session.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {getStatusBadge(session.status)}
                      
                      {/* Quick green/red buttons */}
                      {!isCompleted && (
                        <button
                          onClick={() => handleQuickStatusChange(session, 'completed')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs"
                        >
                          已上(绿)
                        </button>
                      )}
                      {!isCancelledOrLeave && (
                        <button
                          onClick={() => handleQuickStatusChange(session, 'cancelled')}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs"
                        >
                          取消(红)
                        </button>
                      )}
                      {(isCompleted || isCancelledOrLeave) && (
                        <button
                          onClick={() => handleQuickStatusChange(session, 'scheduled')}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs border border-slate-200 rounded-lg hover:bg-white transition-all"
                        >
                          重设
                        </button>
                      )}

                      <button
                        onClick={() => setEditingSession(session)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all"
                        title="编辑详情"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EDIT & ATTENDANCE MODAL */}
      {editingSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">课时打卡与状态设置</h3>
                <p className="text-xs text-slate-500">
                  {editingSession.date} • {editingSession.student_name} ({editingSession.subject})
                </p>
              </div>
              <button
                onClick={() => setEditingSession(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attendance Status Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">点击切换出勤状态（已上变绿 / 取消变红）</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { status: 'completed', label: '🟢 已上课 (正常计费)', color: 'border-emerald-500 bg-emerald-100 text-emerald-900' },
                  { status: 'cancelled', label: '🔴 取消/缺席 (变红·RM 0)', color: 'border-rose-500 bg-rose-100 text-rose-900' },
                  { status: 'leave', label: '🔴 请假调课 (变红·RM 0)', color: 'border-rose-400 bg-rose-50 text-rose-800' },
                  { status: 'scheduled', label: '🔵 待上课', color: 'border-indigo-500 bg-indigo-50 text-indigo-800' },
                ].map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => setEditingSession({ ...editingSession, status: item.status as SessionStatus })}
                    className={`text-xs py-2.5 px-2 rounded-xl border font-medium transition-all text-center ${
                      editingSession.status === item.status
                        ? `${item.color} font-bold shadow-xs ring-2 ring-offset-1 ${
                            item.status === 'completed' ? 'ring-emerald-400' : item.status === 'cancelled' || item.status === 'leave' ? 'ring-rose-400' : 'ring-indigo-300'
                          }`
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">上课时长 (小时)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editingSession.duration_hours}
                  onChange={(e) => setEditingSession({ ...editingSession, duration_hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">费率 (RM / 小时)</label>
                <input
                  type="number"
                  step="1"
                  value={editingSession.rate}
                  onChange={(e) => setEditingSession({ ...editingSession, rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">开始时间</label>
                <input
                  type="time"
                  value={editingSession.start_time}
                  onChange={(e) => setEditingSession({ ...editingSession, start_time: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">结束时间</label>
                <input
                  type="time"
                  value={editingSession.end_time}
                  onChange={(e) => setEditingSession({ ...editingSession, end_time: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">取消原因 / 教学进度备注（会同步显示在对账单）</label>
              <textarea
                rows={2}
                value={editingSession.notes || ''}
                onChange={(e) => setEditingSession({ ...editingSession, notes: e.target.value })}
                placeholder="例如：学生家中有事请假取消 / 或：完成第4章练习"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Calculated Fee Banner */}
            {editingSession.status === 'cancelled' || editingSession.status === 'leave' ? (
              <div className="bg-rose-50 p-3 rounded-xl flex items-center justify-between border border-rose-200">
                <span className="text-xs font-bold text-rose-700">🔴 已取消/请假（对账单显示记录，不收钱）:</span>
                <span className="text-base font-extrabold text-rose-700">
                  RM 0.00
                </span>
              </div>
            ) : (
              <div className="bg-emerald-50/70 p-3 rounded-xl flex items-center justify-between border border-emerald-200">
                <span className="text-xs font-medium text-emerald-800">🟢 本节课正常计费:</span>
                <span className="text-base font-bold text-emerald-800">
                  RM {(Number(editingSession.duration_hours) * Number(editingSession.rate)).toFixed(2)}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDeleteSession(editingSession.id)}
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 p-1 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除课时
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  保存变更
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD SINGLE LESSON MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewSession}
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">添加课时记录</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">选择学生</label>
              <select
                value={newSessionStudentId}
                onChange={(e) => {
                  const sId = Number(e.target.value);
                  setNewSessionStudentId(sId);
                  const st = students.find((s) => s.id === sId);
                  if (st) {
                    setNewSessionRate(st.default_rate);
                    setNewSessionSubject(st.subjects.split('、')[0] || '补习');
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.grade || '补习'}) - 默认 RM {s.default_rate}/时
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">上课日期</label>
                <input
                  type="date"
                  required
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">辅导科目</label>
                <input
                  type="text"
                  required
                  value={newSessionSubject}
                  onChange={(e) => setNewSessionSubject(e.target.value)}
                  placeholder="如: 数学"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">开始时间</label>
                <input
                  type="time"
                  required
                  value={newSessionStartTime}
                  onChange={(e) => setNewSessionStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">结束时间</label>
                <input
                  type="time"
                  required
                  value={newSessionEndTime}
                  onChange={(e) => setNewSessionEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">课时 (小时)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={newSessionDuration}
                  onChange={(e) => setNewSessionDuration(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">费率 (RM / 时)</label>
                <input
                  type="number"
                  required
                  value={newSessionRate}
                  onChange={(e) => setNewSessionRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">备注说明 (可选)</label>
              <input
                type="text"
                value={newSessionNotes}
                onChange={(e) => setNewSessionNotes(e.target.value)}
                placeholder="例如: 临时加课 / 专项复习"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                确认创建
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
