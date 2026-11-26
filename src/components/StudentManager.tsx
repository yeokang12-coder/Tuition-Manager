import React, { useState } from 'react';
import { 
  Users, Plus, Search, Edit2, Trash2, Phone, 
  Receipt, Calendar, X, Clock, Sparkles, Award 
} from 'lucide-react';
import { Student, BillingType, WeeklyScheduleSlot } from '../types';
import { api } from '../api/client';

interface StudentManagerProps {
  students: Student[];
  selectedMonth: string;
  onRefreshStudents: () => void;
  onGoToReceipt: (studentId: number) => void;
  onGoToCalendar: (studentId?: number) => void;
  onGoToAnnualReport?: (studentId: number) => void;
}

const DAY_NAMES = ['周日 (Sun)', '周一 (Mon)', '周二 (Tue)', '周三 (Wed)', '周四 (Thu)', '周五 (Fri)', '周六 (Sat)'];
const SHORT_DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function calcDurationHours(start: string, end: string): number {
  if (!start || !end) return 1.5;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
  return diff > 0 ? Math.round(diff * 100) / 100 : 1.5;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  selectedMonth,
  onRefreshStudents,
  onGoToReceipt,
  onGoToCalendar,
  onGoToAnnualReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [schedulingId, setSchedulingId] = useState<number | 'all' | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('初中一 / Form 1');
  const [subjects, setSubjects] = useState('数学');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [billingType, setBillingType] = useState<BillingType>('per_hour');
  const [defaultRate, setDefaultRate] = useState(50);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleSlot[]>([]);
  const [notes, setNotes] = useState('');

  const [yearStr, monthStr] = selectedMonth.split('-');
  const currentYear = parseInt(yearStr);
  const currentMonth = parseInt(monthStr);

  const openAddModal = () => {
    setEditingStudent(null);
    setName('');
    setGrade('初中一 / Form 1');
    setSubjects('数学');
    setParentName('');
    setParentPhone('');
    setBillingType('per_hour');
    setDefaultRate(50);
    setWeeklySchedules([
      { day_of_week: 6, start_time: '10:00', end_time: '11:30', duration_hours: 1.5, subject: '数学' }
    ]);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setGrade(student.grade);
    setSubjects(student.subjects);
    setParentName(student.parent_name);
    setParentPhone(student.parent_phone);
    setBillingType(student.billing_type);
    setDefaultRate(student.default_rate);
    setWeeklySchedules(student.weekly_schedules && student.weekly_schedules.length > 0 ? [...student.weekly_schedules] : []);
    setNotes(student.notes);
    setIsModalOpen(true);
  };

  const handleAddSlot = () => {
    const defaultSub = subjects.split('、')[0]?.trim() || '数学';
    setWeeklySchedules(prev => [
      ...prev,
      { day_of_week: 6, start_time: '14:00', end_time: '15:30', duration_hours: 1.5, subject: defaultSub }
    ]);
  };

  const handleUpdateSlot = (index: number, field: keyof WeeklyScheduleSlot, value: string | number) => {
    setWeeklySchedules(prev => {
      const updated = [...prev];
      const slot = { ...updated[index], [field]: value };
      if (field === 'start_time' || field === 'end_time') {
        slot.duration_hours = calcDurationHours(
          field === 'start_time' ? String(value) : slot.start_time,
          field === 'end_time' ? String(value) : slot.end_time
        );
      }
      updated[index] = slot;
      return updated;
    });
  };

  const handleRemoveSlot = (index: number) => {
    setWeeklySchedules(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, {
          name: name.trim(),
          grade,
          subjects,
          parent_name: parentName.trim(),
          parent_phone: parentPhone.trim(),
          billing_type: billingType,
          default_rate: Number(defaultRate),
          weekly_schedules: weeklySchedules,
          notes,
        });
      } else {
        await api.createStudent({
          name: name.trim(),
          grade,
          subjects,
          parent_name: parentName.trim(),
          parent_phone: parentPhone.trim(),
          billing_type: billingType,
          default_rate: Number(defaultRate),
          weekly_schedules: weeklySchedules,
          notes,
          active: 1,
        });
      }
      setIsModalOpen(false);
      onRefreshStudents();
    } catch (err: any) {
      alert(`保存失败: ${err.message}`);
    }
  };

  // Auto-schedule single student for the whole month and jump to calendar
  const handleAutoScheduleStudent = async (student: Student) => {
    const slots = student.weekly_schedules || [];
    if (slots.length === 0) {
      alert(`请先点击【${student.name}】右上角的编辑图标，设置每周固定上课时间！`);
      openEditModal(student);
      return;
    }

    try {
      setSchedulingId(student.id);
      const res = await api.generateRecurringSessions(currentYear, currentMonth, student.id);
      if (res.generatedCount > 0) {
        alert(`✅ 已成功为【${student.name}】自动排入 ${selectedMonth} 整月共 ${res.generatedCount} 节固定课程！\n即将为您跳转到课表日历查看。`);
      } else {
        alert(`📅 【${student.name}】在 ${selectedMonth} 的固定课程已经全部排在课表里啦（无重复新增）！\n即将为您跳转到课表日历查看。`);
      }
      onGoToCalendar(student.id);
    } catch (err: any) {
      alert(`自动排课失败: ${err.message}`);
    } finally {
      setSchedulingId(null);
    }
  };

  // Auto-schedule ALL students for the whole month
  const handleAutoScheduleAll = async () => {
    try {
      setSchedulingId('all');
      const res = await api.generateRecurringSessions(currentYear, currentMonth);
      alert(`✅ 全员整月自动排课完成！已为 ${selectedMonth} 新增 ${res.generatedCount} 节固定课程（已有日期自动跳过防重）。\n现在为您跳转到课表与打卡页面！`);
      onGoToCalendar();
    } catch (err: any) {
      alert(`全员自动排课失败: ${err.message}`);
    } finally {
      setSchedulingId(null);
    }
  };

  const handleDelete = async (id: number, studentName: string) => {
    if (!window.confirm(`确定要删除学生【${studentName}】吗？`)) return;
    try {
      await api.deleteStudent(id);
      onRefreshStudents();
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    }
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.subjects.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parent_phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-8">
      {/* Top Header & Search */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">学生档案、固定排课与计费设置</h2>
            <p className="text-xs text-slate-500">
              设置每位学生的每周固定上课时间，点击“自动排课（整月）”即可一键铺满【{selectedMonth}】课表
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索姓名 / 年级 / 家长电话..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-48 sm:w-56"
            />
          </div>

          <button
            onClick={handleAutoScheduleAll}
            disabled={schedulingId === 'all'}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all"
            title="根据所有学生的每周固定时间，一键排满当前月份的课表"
          >
            <Sparkles className="w-4 h-4" />
            {schedulingId === 'all' ? '正在排课...' : `一键全员排满 ${selectedMonth} 整月课表`}
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            新增学生
          </button>
        </div>
      </div>

      {/* Student Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
          <Users className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-1" />
          <p className="text-sm">未找到匹配的学生档案</p>
          <button
            onClick={openAddModal}
            className="mt-3 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg"
          >
            立即添加第一位学生
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((student) => {
            const slots = student.weekly_schedules || [];
            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:border-indigo-200 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {student.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {student.grade || '未设置年级'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                          {student.subjects || '全科'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(student)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                        title="编辑档案与固定上课时间"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id, student.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Fixed Weekly Schedule Section on Card */}
                  <div className="mt-3.5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        每周固定上课时间
                      </span>
                      <button
                        onClick={() => openEditModal(student)}
                        className="text-[11px] text-indigo-600 hover:underline font-medium"
                      >
                        修改时间
                      </button>
                    </div>
                    {slots.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-0.5">
                        暂未设置固定时间（点击“修改时间”配置）
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {slots.map((slot, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-xs font-semibold bg-white text-indigo-900 px-2.5 py-1 rounded-lg border border-indigo-200/70 shadow-2xs"
                          >
                            <span className="text-indigo-600 font-bold">每{SHORT_DAY_NAMES[slot.day_of_week]}</span>
                            <span>{slot.start_time}-{slot.end_time}</span>
                            <span className="text-[10px] text-slate-500">
                              ({slot.subject} · {slot.duration_hours}h
                              {slot.rate && slot.rate !== student.default_rate ? ` · RM${slot.rate}` : ''})
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rate Info & Billing Mode */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block uppercase">计费方式</span>
                      <span className="text-xs font-bold text-slate-700">
                        {student.billing_type === 'per_hour'
                          ? '按课时 (Hourly)'
                          : student.billing_type === 'per_session'
                          ? '按每次上课 (Per Session)'
                          : '包月收费 (Monthly)'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium text-slate-400 block uppercase">默认基础费率</span>
                      <span className="text-sm font-extrabold text-indigo-700">
                        RM {student.default_rate}
                        <span className="text-[10px] font-normal text-slate-500">
                          {student.billing_type === 'per_hour' ? '/时' : student.billing_type === 'per_session' ? '/次' : '/月'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Parent & Contact */}
                  <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                    {(student.parent_name || student.parent_phone) && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{student.parent_name || '家长'} : </span>
                        <strong className="font-mono text-slate-800">{student.parent_phone || '暂无电话'}</strong>
                      </div>
                    )}
                    {student.notes && (
                      <div className="text-slate-400 text-[11px] italic truncate mt-1">
                        备注: {student.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  {/* Prominent Auto-schedule whole month button */}
                  <button
                    onClick={() => handleAutoScheduleStudent(student)}
                    disabled={schedulingId === student.id}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {schedulingId === student.id
                      ? '正在排课...'
                      : `自动排课 (${selectedMonth}整月) 到课表与打卡`}
                  </button>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onGoToCalendar(student.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-all border border-slate-200"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      查看该生课表
                    </button>
                    <button
                      onClick={() => onGoToReceipt(student.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-all border border-indigo-100"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      制作对账卡片
                    </button>
                  </div>

                  {onGoToAnnualReport && (
                    <button
                      onClick={() => onGoToAnnualReport(student.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition-all border border-amber-200/80"
                    >
                      <Award className="w-3.5 h-3.5" />
                      撰写年度表现总结
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT STUDENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingStudent ? `编辑学生设置：${editingStudent.name}` : '新增学生与固定上课时间'}
                </h3>
                <p className="text-xs text-slate-500">支持添加多个不同科目的固定时段，并为不同科目设置独立收费单价</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">学生姓名 *</label>
                <input
                  type="text"
                  required
                  placeholder="如: 张小明 (Lucas)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">年级</label>
                <input
                  type="text"
                  placeholder="如: 初中一 / Form 1 / 高二"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                辅导科目（多个科目请用顿号“、”隔开，如：数学、科学、华文）
              </label>
              <input
                type="text"
                placeholder="如: 数学、科学、华文"
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* FIXED WEEKLY SCHEDULE CONFIGURATION */}
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    每周固定上课时间 & 科目单价设置 (可添加多科/多节)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    同个学生上多个科目时，点右侧“+ 添加固定时段”，每行可填不同科目及专属单价
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加固定时段
                </button>
              </div>

              {weeklySchedules.length === 0 ? (
                <div className="text-center py-4 bg-white/80 rounded-lg border border-dashed border-indigo-200 text-xs text-slate-500">
                  暂未添加固定上课时段，请点击右上角 <strong>“+ 添加固定时段”</strong>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {weeklySchedules.map((slot, idx) => {
                    const parsedSubjects = subjects
                      .split(/[、,，/]/)
                      .map(s => s.trim())
                      .filter(Boolean);

                    return (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-2"
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
                          <div className="col-span-2 sm:col-span-2">
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">上课星期</label>
                            <select
                              value={slot.day_of_week}
                              onChange={(e) => handleUpdateSlot(idx, 'day_of_week', Number(e.target.value))}
                              className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                              {DAY_NAMES.map((dName, dIdx) => (
                                <option key={dIdx} value={dIdx}>
                                  {dName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">开始时间</label>
                            <input
                              type="time"
                              value={slot.start_time}
                              onChange={(e) => handleUpdateSlot(idx, 'start_time', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">结束时间</label>
                            <input
                              type="time"
                              value={slot.end_time}
                              onChange={(e) => handleUpdateSlot(idx, 'end_time', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-1">
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">时长(h)</label>
                            <input
                              type="number"
                              step="0.25"
                              value={slot.duration_hours}
                              onChange={(e) => handleUpdateSlot(idx, 'duration_hours', parseFloat(e.target.value) || 1)}
                              className="w-full px-1.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">科目</label>
                            <input
                              type="text"
                              value={slot.subject}
                              onChange={(e) => handleUpdateSlot(idx, 'subject', e.target.value)}
                              placeholder="如: 数学"
                              className="w-full px-2 py-1.5 text-xs font-bold text-indigo-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">该科单价(RM)</label>
                            <input
                              type="number"
                              step="1"
                              value={slot.rate !== undefined ? slot.rate : defaultRate}
                              onChange={(e) => handleUpdateSlot(idx, 'rate', parseFloat(e.target.value) || 0)}
                              placeholder={`${defaultRate}`}
                              className="w-full px-2 py-1.5 text-xs font-bold text-emerald-700 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="移除此时段"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Quick subject tags for multi-subject convenience */}
                        {parsedSubjects.length > 1 && (
                          <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400">快捷切换科目:</span>
                            {parsedSubjects.map((sub) => (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => handleUpdateSlot(idx, 'subject', sub)}
                                className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all ${
                                  slot.subject === sub
                                    ? 'bg-indigo-600 text-white font-bold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                                }`}
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">家长称呼</label>
                <input
                  type="text"
                  placeholder="如: 张妈妈 / Mr. Lee"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">家长电话 / WhatsApp</label>
                <input
                  type="text"
                  placeholder="如: 016-888 1234"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">计费模式与费率 (RM)</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'per_hour', label: '按课时 (RM/时)' },
                  { id: 'per_session', label: '按单次 (RM/次)' },
                  { id: 'monthly', label: '包月收费 (RM/月)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setBillingType(item.id as BillingType)}
                    className={`py-2 px-1 text-xs rounded-lg border font-medium text-center transition-all ${
                      billingType === item.id
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">默认费率金额 (RM)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">备注信息</label>
              <textarea
                rows={2}
                placeholder="例如：每周六固定上课，备考 SPM"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {editingStudent ? '保存修改' : '确认新增'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
