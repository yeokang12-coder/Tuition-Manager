import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toPng, toBlob } from 'html-to-image';
import {
  Award,
  Sparkles,
  Wand2,
  Save,
  Download,
  Copy,
  Check,
  MessageSquareText,
  Star,
  CalendarCheck,
  KeyRound,
  X,
  FileEdit,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import {
  Student,
  TutorProfile,
  LessonSession,
  AnnualReport,
  AnnualReportRatings,
  AnnualReportStats,
  AnnualReportTone,
} from '../types';
import { api } from '../api/client';
import {
  EVALUATION_DIMENSIONS,
  TONE_OPTIONS,
  synthesizeAnnualComment,
  buildAnnualReportPrompt,
  generateWithGeminiAPI,
} from '../utils/annualReportAI';

interface AnnualReportViewProps {
  students: Student[];
  tutorProfile: TutorProfile;
  initialStudentId?: number;
}

const GEMINI_KEY_STORAGE = 'tutor_gemini_api_key';

const DEFAULT_RATINGS: AnnualReportRatings = {
  focus: 5,
  homework: 5,
  progress: 5,
  exam: 4,
};

export const AnnualReportView: React.FC<AnnualReportViewProps> = ({
  students,
  tutorProfile,
  initialStudentId,
}) => {
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => [String(currentYear - 1), String(currentYear), String(currentYear + 1)],
    [currentYear]
  );

  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedStudentId, setSelectedStudentId] = useState<number>(
    initialStudentId || students[0]?.id || 0
  );

  // Sync if user clicked shortcut from StudentManager
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  useEffect(() => {
    if (students.length > 0 && !students.some(s => s.id === selectedStudentId)) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Sessions & saved reports state
  const [yearSessions, setYearSessions] = useState<LessonSession[]>([]);
  const [savedReportIds, setSavedReportIds] = useState<Set<number>>(new Set());
  const [loadingData, setLoadingData] = useState(false);

  // Form state
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<AnnualReportRatings>(DEFAULT_RATINGS);
  const [highlights, setHighlights] = useState('');
  const [nextYearGoal, setNextYearGoal] = useState('');
  const [tone, setTone] = useState<AnnualReportTone>('warm');
  const [showAttendance, setShowAttendance] = useState(true);
  const [comment, setComment] = useState('');

  // AI & export states
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    () => localStorage.getItem(GEMINI_KEY_STORAGE) || ''
  );
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(geminiApiKey);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copyImgSuccess, setCopyImgSuccess] = useState(false);
  const [copyWaSuccess, setCopyWaSuccess] = useState(false);
  const [copyPromptSuccess, setCopyPromptSuccess] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Load saved status badge for all students in selectedYear
  const refreshYearReportIndex = async (year: string) => {
    try {
      const list = await api.getAnnualReportsByYear(year);
      setSavedReportIds(new Set(list.map(r => r.student_id)));
    } catch (err) {
      console.error('Failed to load annual report index', err);
    }
  };

  useEffect(() => {
    refreshYearReportIndex(selectedYear);
  }, [selectedYear]);

  // Load selected student's year sessions + saved annual report
  useEffect(() => {
    if (!selectedStudentId) return;
    let cancelled = false;

    const loadStudentYearData = async () => {
      setLoadingData(true);
      setAiStatusMsg('');
      try {
        const [sessionsData, existingReport] = await Promise.all([
          api.getSessions({
            student_id: selectedStudentId,
            start_date: `${selectedYear}-01-01`,
            end_date: `${selectedYear}-12-31`,
          }),
          api.getAnnualReport(selectedStudentId, selectedYear),
        ]);

        if (cancelled) return;
        setYearSessions(sessionsData);

        if (existingReport) {
          setSelectedTags(existingReport.selected_tags || {});
          setCustomNotes(existingReport.custom_notes || {});
          setRatings(existingReport.ratings || DEFAULT_RATINGS);
          setHighlights(existingReport.highlights || '');
          setNextYearGoal(existingReport.next_year_goal || '');
          setTone(existingReport.tone || 'warm');
          setShowAttendance(existingReport.show_attendance !== false);
          setComment(existingReport.comment || '');
        } else {
          setSelectedTags({});
          setCustomNotes({});
          setRatings(DEFAULT_RATINGS);
          setHighlights('');
          setNextYearGoal('');
          setTone('warm');
          setShowAttendance(true);
          setComment('');
        }
      } catch (err) {
        console.error('Failed to load student annual data', err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    loadStudentYearData();
    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, selectedYear]);

  // Compute full-year attendance stats automatically from sessions
  const yearStats: AnnualReportStats = useMemo(() => {
    const completed = yearSessions.filter(s => s.status === 'completed' || s.status === 'makeup');
    const leaveCount = yearSessions.filter(s => s.status === 'leave').length;
    const makeupCount = yearSessions.filter(s => s.status === 'makeup').length;
    const cancelledCount = yearSessions.filter(s => s.status === 'cancelled').length;

    const effectiveTotal = yearSessions.length - cancelledCount;
    const attendanceRate =
      effectiveTotal > 0 ? Math.round((completed.length / effectiveTotal) * 100) : 100;

    const completedHours = completed.reduce((sum, s) => sum + (Number(s.duration_hours) || 0), 0);
    const subjectSet = new Set<string>();
    yearSessions.forEach(s => {
      if (s.subject?.trim()) subjectSet.add(s.subject.trim());
    });
    if (subjectSet.size === 0 && selectedStudent?.subjects) {
      subjectSet.add(selectedStudent.subjects);
    }

    return {
      totalSessions: yearSessions.length,
      completedSessions: completed.length,
      completedHours,
      leaveCount,
      makeupCount,
      attendanceRate,
      subjects: Array.from(subjectSet),
    };
  }, [yearSessions, selectedStudent]);

  // Toggle tag selection
  const handleToggleTag = (dimKey: string, tag: string) => {
    setSelectedTags(prev => {
      const current = prev[dimKey] || [];
      const next = current.includes(tag)
        ? current.filter(t => t !== tag)
        : [...current, tag];
      return { ...prev, [dimKey]: next };
    });
  };

  // Update star rating
  const handleSetRating = (key: keyof AnnualReportRatings, val: number) => {
    setRatings(prev => ({ ...prev, [key]: val }));
  };

  // Semi-auto assemble draft (instant offline synthesizer)
  const handleAssembleDraft = () => {
    if (!selectedStudent) return;
    const draft = synthesizeAnnualComment({
      student: selectedStudent,
      year: selectedYear,
      stats: yearStats,
      selectedTags,
      customNotes,
      ratings,
      highlights,
      nextYearGoal,
      tone,
    });
    setComment(draft);
    setAiStatusMsg('已根据勾选与手写补充自动生成拟人化评语，您可以继续微调。');
  };

  // AI Generate or Polish
  const handleAiAssist = async (mode: 'generate' | 'polish') => {
    if (!selectedStudent) return;

    if (mode === 'polish' && !comment.trim()) {
      alert('请先在下方文本框输入一些手写内容或先点击“拼装草稿”，再使用 AI 润色。');
      return;
    }

    // If no Gemini API key is configured, use built-in synthesizer for 'generate', or prompt user for 'polish'
    if (!geminiApiKey.trim()) {
      if (mode === 'generate') {
        handleAssembleDraft();
        setAiStatusMsg('已使用内置智能引擎生成评语（如需接入 Gemini AI 深度润色，可点击右上角「AI 设置」填入免费 Key）。');
        return;
      } else {
        setTempApiKey(geminiApiKey);
        setIsAiModalOpen(true);
        return;
      }
    }

    try {
      setAiLoading(true);
      setAiStatusMsg(mode === 'polish' ? 'AI 正在润色您的手写评语...' : 'AI 正在结合全年数据撰写评语...');
      const prompt = buildAnnualReportPrompt({
        student: selectedStudent,
        year: selectedYear,
        stats: yearStats,
        selectedTags,
        customNotes,
        ratings,
        highlights,
        nextYearGoal,
        tone,
        existingDraft: comment,
        mode,
      });
      const result = await generateWithGeminiAPI(geminiApiKey, prompt);
      setComment(result);
      setAiStatusMsg(mode === 'polish' ? 'AI 润色完成！您可以继续微调。' : 'AI 撰写完成！您可以继续手动修改。');
    } catch (err: any) {
      console.error('Gemini AI failed', err);
      const msg = String(err?.message || '');
      if (mode === 'generate' && (msg.startsWith('TIMEOUT:') || msg.startsWith('BUSY:'))) {
        const draft = synthesizeAnnualComment({
          student: selectedStudent,
          year: selectedYear,
          stats: yearStats,
          selectedTags,
          customNotes,
          ratings,
          highlights,
          nextYearGoal,
          tone,
        });
        setComment(draft);
        setAiStatusMsg('Google AI 响应较慢/拥堵，已自动改用内置拟人化引擎为您生成评语！');
      } else {
        alert(`AI 生成失败：${msg.replace(/^(TIMEOUT|BUSY):\s*/, '')}\n\n已为您保留当前内容，您也可以先使用「根据选项拼装草稿」功能。`);
        setAiStatusMsg('');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!selectedStudent) return;
    const prompt = buildAnnualReportPrompt({
      student: selectedStudent,
      year: selectedYear,
      stats: yearStats,
      selectedTags,
      customNotes,
      ratings,
      highlights,
      nextYearGoal,
      tone,
      existingDraft: comment,
      mode: comment.trim() ? 'polish' : 'generate',
    });
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyPromptSuccess(true);
      setTimeout(() => setCopyPromptSuccess(false), 2500);
    } catch {
      alert('复制失败，请检查浏览器剪贴板权限');
    }
  };

  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim();
    setGeminiApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
    setIsAiModalOpen(false);
  };

  // Save report to Firestore
  const handleSaveReport = async () => {
    if (!selectedStudent) return;
    try {
      setSaving(true);
      await api.saveAnnualReport({
        student_id: selectedStudent.id,
        student_name: selectedStudent.name,
        year: selectedYear,
        selected_tags: selectedTags,
        custom_notes: customNotes,
        ratings,
        highlights,
        comment,
        next_year_goal: nextYearGoal,
        tone,
        show_attendance: showAttendance,
        stats_snapshot: yearStats,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refreshYearReportIndex(selectedYear);
    } catch (err: any) {
      alert(`保存失败：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Copy WhatsApp text version
  const handleCopyWhatsAppText = async () => {
    if (!selectedStudent) return;
    const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
    const lines = [
      `🎓 *${selectedYear} 年度补习表现总结报告*`,
      `学生：*${selectedStudent.name}*${selectedStudent.grade ? ` (${selectedStudent.grade})` : ''}`,
      `科目：${yearStats.subjects.join('、') || selectedStudent.subjects || '-'}`,
      ``,
    ];

    if (showAttendance) {
      lines.push(
        `📊 *年度出勤概况*`,
        `• 完成课节：${yearStats.completedSessions} 节（共 ${yearStats.completedHours.toFixed(1)} 小时）`,
        `• 出勤率：${yearStats.attendanceRate}%（请假 ${yearStats.leaveCount} 次 / 补课 ${yearStats.makeupCount} 次）`,
        ``
      );
    }

    lines.push(
      `⭐ *综合能力评价*`,
      `• 课堂专注：${stars(ratings.focus)}`,
      `• 功课完成：${stars(ratings.homework)}`,
      `• 理解进步：${stars(ratings.progress)}`,
      `• 测验表现：${stars(ratings.exam)}`,
      ``
    );

    if (comment.trim()) {
      lines.push(`📝 *老师评语与寄语*`, comment.trim(), ``);
    }

    lines.push(`—— ${tutorProfile.name || '补习老师'} 敬上`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyWaSuccess(true);
      setTimeout(() => setCopyWaSuccess(false), 2500);
    } catch {
      alert('复制失败，请手动选中复制');
    }
  };

  // Download PNG card
  const handleDownloadImage = async () => {
    if (!cardRef.current || !selectedStudent) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        quality: 0.95,
      });
      const link = document.createElement('a');
      link.download = `年度表现总结-${selectedStudent.name}-${selectedYear}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Image export failed', err);
      alert('下载图片失败，请重试');
    } finally {
      setDownloading(false);
    }
  };

  // Copy PNG card to clipboard
  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    try {
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
      });
      if (!blob) throw new Error('Blob generation failed');
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopyImgSuccess(true);
        setTimeout(() => setCopyImgSuccess(false), 2500);
      } else {
        handleDownloadImage();
      }
    } catch {
      handleDownloadImage();
    }
  };

  const allSelectedTagList = useMemo(
    () => Object.values(selectedTags).flat(),
    [selectedTags]
  );

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-2xl mx-auto mt-6">
        <Award className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">暂无学生档案</h3>
        <p className="text-sm text-slate-500 mt-1">请先在「学生管理」中添加学生，再制作年度表现总结。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">学生全年补习表现总结</h2>
            <p className="text-xs text-slate-500">
              自动汇总全年出勤 · 半自动快捷勾选 · 支持手写与 AI 辅助润色 · 一键发给家长
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Year Picker */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>
                {y} 年度
              </option>
            ))}
          </select>

          {/* Student Picker */}
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(Number(e.target.value))}
            className="px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[170px]"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {savedReportIds.has(s.id) ? '✓ 已保存' : ''}
              </option>
            ))}
          </select>

          {/* Optional AI Key Settings */}
          <button
            type="button"
            onClick={() => {
              setTempApiKey(geminiApiKey);
              setIsAiModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              geminiApiKey
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{geminiApiKey ? 'Gemini AI 已配置' : 'AI 接口设置 (可选)'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Editor + Right Live Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Semi-auto + Manual + AI Editor */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Auto Attendance Summary */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  {selectedYear} 年自动出勤统计
                </h3>
                {loadingData && <span className="text-xs text-slate-400">读取中...</span>}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAttendance}
                  onChange={e => setShowAttendance(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                在家长报告卡中显示
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <div className="text-[11px] text-slate-500">完成课节</div>
                <div className="text-lg font-extrabold text-indigo-700">
                  {yearStats.completedSessions} <span className="text-xs font-normal">节</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-500">累计课时</div>
                <div className="text-lg font-extrabold text-slate-800">
                  {yearStats.completedHours.toFixed(1)} <span className="text-xs font-normal">小时</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="text-[11px] text-slate-500">出勤率</div>
                <div className="text-lg font-extrabold text-emerald-700">
                  {yearStats.attendanceRate}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                <div className="text-[11px] text-slate-500">请假 / 补课</div>
                <div className="text-sm font-bold text-amber-800 mt-1">
                  {yearStats.leaveCount} 次 / {yearStats.makeupCount} 次
                </div>
              </div>
            </div>
          </div>

          {/* 2. Semi-automated Selection Panel */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">半自动化表现选择栏</h3>
              </div>
              <span className="text-[11px] text-slate-400">点击标签多选，右侧与草稿将自动同步</span>
            </div>

            <div className="space-y-4">
              {EVALUATION_DIMENSIONS.map(dim => {
                const picked = selectedTags[dim.key] || [];
                const ratingVal = dim.ratingKey ? ratings[dim.ratingKey] : null;
                return (
                  <div key={dim.key} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-700">{dim.label}</span>
                      {dim.ratingKey && ratingVal !== null && (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleSetRating(dim.ratingKey!, star)}
                              className="p-0.5 transition-transform hover:scale-110"
                              title={`${star} 星`}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  star <= ratingVal
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {dim.tags.map(tag => {
                        const isSelected = picked.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleTag(dim.key, tag)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      autoComplete="off"
                      value={customNotes[dim.key] || ''}
                      onChange={e =>
                        setCustomNotes(prev => ({ ...prev, [dim.key]: e.target.value }))
                      }
                      placeholder={dim.placeholder}
                      className="w-full px-3 py-1.5 text-xs bg-white/90 border border-slate-200/90 rounded-lg text-slate-700 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            {/* Extra optional facts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  年度亮点 / 具体成绩（选填）
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  name="annual_highlights"
                  value={highlights}
                  onChange={e => setHighlights(e.target.value)}
                  placeholder="例：UASA 数学从 62 分进步到 81 分"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  来年补充建议（选填）
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  name="annual_next_year_goal"
                  value={nextYearGoal}
                  onChange={e => setNextYearGoal(e.target.value)}
                  placeholder="例：多练习应用题步骤表达"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Manual Writing + AI Assist */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">老师评语与 AI 辅助撰写</h3>
              </div>

              {/* Tone selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {TONE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTone(opt.value)}
                    title={opt.desc}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      tone === opt.value
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAssembleDraft}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>根据选项拼装草稿</span>
              </button>

              <button
                type="button"
                disabled={aiLoading}
                onClick={() => handleAiAssist('generate')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-60"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{aiLoading ? 'AI 生成中...' : 'AI 辅助写'}</span>
              </button>

              <button
                type="button"
                disabled={aiLoading}
                onClick={() => handleAiAssist('polish')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all disabled:opacity-60"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>AI 润色手写内容</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-all ml-auto"
                title="复制完整提示词，粘贴到 ChatGPT / Gemini 网页版使用"
              >
                {copyPromptSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copyPromptSuccess ? '已复制提示词' : '复制 AI 提示词'}</span>
              </button>
            </div>

            {aiStatusMsg && (
              <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                {aiStatusMsg}
              </div>
            )}

            {/* Freehand editable textarea */}
            <div>
              <textarea
                rows={7}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="老师可以在这里直接手写完整评语，或者先点击上方「根据选项拼装草稿」/「AI 辅助写」生成初稿后再修改..."
                className="w-full p-3.5 text-sm leading-relaxed text-slate-800 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
              />
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
                <span>支持完全自由编辑，右侧报告卡会实时同步显示</span>
                <span>{comment.length} 字</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveReport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-60"
              >
                {saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{saving ? '正在保存...' : saveSuccess ? '已保存至云端' : '保存年度总结'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Parent Report Card Preview & Export */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          {/* Action Buttons */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200/80 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsAppText}
              className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              {copyWaSuccess ? <Check className="w-3.5 h-3.5" /> : <MessageSquareText className="w-3.5 h-3.5" />}
              <span>{copyWaSuccess ? '已复制文字' : '复制 WhatsApp 文字'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all"
            >
              {copyImgSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copyImgSuccess ? '已复制图片' : '复制卡片图'}</span>
            </button>

            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadImage}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? '导出中...' : '下载 PNG'}</span>
            </button>
          </div>

          {/* Printable / Exportable Card */}
          <div
            ref={cardRef}
            className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-200 text-slate-800"
          >
            {/* Card Header */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  <Award className="w-3 h-3" />
                  {selectedYear} 年度学习表现总结
                </span>
                <span className="text-xs text-indigo-100 font-medium">
                  {tutorProfile.name || '补习老师'}
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-xl font-extrabold tracking-tight">
                  {selectedStudent?.name || '学生'}
                </h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  {selectedStudent?.grade || '补习学生'} · 科目：{yearStats.subjects.join('、') || selectedStudent?.subjects || '-'}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Attendance block */}
              {showAttendance && (
                <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div>
                    <div className="text-[11px] text-slate-400">完成课节</div>
                    <div className="text-base font-extrabold text-indigo-700">{yearStats.completedSessions} 节</div>
                  </div>
                  <div className="border-x border-slate-200">
                    <div className="text-[11px] text-slate-400">累计课时</div>
                    <div className="text-base font-extrabold text-slate-800">{yearStats.completedHours.toFixed(1)} h</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">年度出勤率</div>
                    <div className="text-base font-extrabold text-emerald-600">{yearStats.attendanceRate}%</div>
                  </div>
                </div>
              )}

              {/* Star Ratings */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">综合能力评价</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: '课堂专注', val: ratings.focus },
                    { label: '功课完成', val: ratings.homework },
                    { label: '理解进步', val: ratings.progress },
                    { label: '测验表现', val: ratings.exam },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between bg-slate-50/70 px-3 py-2 rounded-xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= item.val ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Tags */}
              {allSelectedTagList.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">表现关键词</div>
                  <div className="flex flex-wrap gap-1.5">
                    {allSelectedTagList.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Teacher Comment */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">老师评语与寄语</div>
                <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-100/80 text-sm text-slate-700 leading-relaxed whitespace-pre-line min-h-[100px]">
                  {comment.trim() || '（请在左侧勾选标签拼装草稿，或直接手写您对该学生的年度总结评语）'}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>指导老师：{tutorProfile.name || '补习老师'}</span>
                <span>日期：{new Date().toISOString().split('T')[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Gemini API Key Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">AI 接口设置（可选）</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              系统自带<strong>免配置智能拼装引擎</strong>，不填 Key 也能正常使用「根据选项拼装草稿」和「AI 辅助写」。
              <br />
              如果您希望使用 <strong>Google Gemini 大模型</strong>直接深度撰写或润色您的手写草稿，可填入免费的 Gemini API Key（仅保存在您当前浏览器的本地存储中）。
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gemini API Key
              </label>
              <input
                type="password"
                value={tempApiKey}
                onChange={e => setTempApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
