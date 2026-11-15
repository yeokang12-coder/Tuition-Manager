import React, { useState, useEffect, useRef } from 'react';
import { 
  toPng, toBlob 
} from 'html-to-image';
import { 
  Download, Copy, Check, Plus, Trash2, Calendar, FileText, 
  CreditCard, Sparkles, CheckCircle2, DollarSign, QrCode, AlertCircle, Eye
} from 'lucide-react';
import { Student, LessonSession, TutorProfile, BillAdjustment, BillReceipt } from '../types';
import { api } from '../api/client';

interface ReceiptMakerProps {
  students: Student[];
  tutorProfile: TutorProfile;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  onRefreshStats?: () => void;
}

export const ReceiptMaker: React.FC<ReceiptMakerProps> = ({
  students,
  tutorProfile,
  selectedMonth,
  setSelectedMonth,
  onRefreshStats,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<number>(students[0]?.id || 0);
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
  const [adjustments, setAdjustments] = useState<BillAdjustment[]>([]);
  const [newAdjDesc, setNewAdjDesc] = useState('');
  const [newAdjAmount, setNewAdjAmount] = useState<number>(0);
  const [isPaid, setIsPaid] = useState(false);
  const [billNotes, setBillNotes] = useState('请在转账后将付款收据截图发送至 WhatsApp，感谢支持与配合！');
  const [savedBill, setSavedBill] = useState<BillReceipt | null>(null);

  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Reference to the rendered card for image export
  const cardRef = useRef<HTMLDivElement>(null);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Fetch sessions for this student & month
  const loadStudentSessions = async () => {
    if (!selectedStudentId) return;
    try {
      const data = await api.getSessions({
        month: selectedMonth,
        student_id: selectedStudentId,
      });
      setSessions(data);
      // Automatically select completed, makeup, and cancelled/leave sessions so receipt shows full transparency
      const defaultSelectedIds = data
        .filter((s) => s.status === 'completed' || s.status === 'makeup' || s.status === 'cancelled' || s.status === 'leave')
        .map((s) => s.id);
      setSelectedSessionIds(defaultSelectedIds.length > 0 ? defaultSelectedIds : data.map((s) => s.id));
    } catch (err) {
      console.error('Failed to load student sessions', err);
    }
  };

  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students]);

  useEffect(() => {
    loadStudentSessions();
  }, [selectedStudentId, selectedMonth]);

  // Toggle session selection
  const handleToggleSession = (id: number) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add adjustment (e.g. material fee or discount)
  const handleAddAdjustment = () => {
    if (!newAdjDesc.trim() || newAdjAmount === 0) return;
    setAdjustments((prev) => [
      ...prev,
      { id: Date.now().toString(), description: newAdjDesc.trim(), amount: Number(newAdjAmount) },
    ]);
    setNewAdjDesc('');
    setNewAdjAmount(0);
  };

  const handleRemoveAdjustment = (id: string) => {
    setAdjustments((prev) => prev.filter((a) => a.id !== id));
  };

  // Calculate bill amounts (cancelled and leave sessions are RM 0.00)
  const activeSessions = sessions.filter((s) => selectedSessionIds.includes(s.id));
  const billableSessions = activeSessions.filter((s) => s.status !== 'cancelled' && s.status !== 'leave');
  const cancelledSessions = activeSessions.filter((s) => s.status === 'cancelled' || s.status === 'leave');
  
  // If student is monthly billing, subtotal is the fixed rate; otherwise sum billable session fees
  const isMonthlyStudent = selectedStudent?.billing_type === 'monthly';
  const subtotal = isMonthlyStudent
    ? (selectedStudent?.default_rate || 0)
    : billableSessions.reduce((sum, s) => sum + s.fee, 0);

  const adjustmentsTotal = adjustments.reduce((sum, a) => sum + a.amount, 0);
  const totalAmount = Math.max(0, subtotal + adjustmentsTotal);

  // Generate bill reference
  const billNo = savedBill?.bill_number || `INV-${selectedMonth.replace('-', '')}-${String(selectedStudentId).padStart(2, '0')}${String(selectedSessionIds.length).padStart(2, '0')}`;
  const currentDateFormatted = new Date().toISOString().split('T')[0];

  // Export card as PNG download
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5, // Crisp HD rendering for mobile
        quality: 0.95,
      });
      const link = document.createElement('a');
      link.download = `补习收据-${selectedStudent?.name}-${selectedMonth}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error('Image export failed', err);
      alert('下载图片失败，请重试');
    } finally {
      setDownloading(false);
    }
  };

  // Copy card image directly to clipboard
  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    try {
      setCopying(true);
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
      });
      if (!blob) throw new Error('Blob generation failed');

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      } else {
        // Fallback for browsers that don't support ClipboardItem
        handleDownloadImage();
        alert('您的浏览器不支持直接复制图片到剪贴板，已为您自动下载图片！');
      }
    } catch (err: any) {
      console.error('Copy to clipboard failed', err);
      // If permission denied or unsupported, fallback to download
      handleDownloadImage();
    } finally {
      setCopying(false);
    }
  };

  // Save bill to local database
  const handleSaveBill = async () => {
    if (!selectedStudentId) return;
    try {
      const created = await api.createBill({
        student_id: selectedStudentId,
        student_name: selectedStudent?.name || '',
        month_period: selectedMonth,
        session_ids: selectedSessionIds,
        subtotal,
        adjustments,
        total_amount: totalAmount,
        notes: billNotes,
        status: isPaid ? 'paid' : 'pending',
      });
      setSavedBill(created);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefreshStats?.();
    } catch (err: any) {
      alert(`保存账单失败: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-8">
      {/* Top Banner / Student Selector */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">对账单与收据卡片制作</h2>
            <p className="text-xs text-slate-500">
              自动按月汇总课时，生成排版优雅的对账长图，一键发送 WhatsApp 给家长
            </p>
          </div>
        </div>

        {/* Student & Month Pickers */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">学生:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.grade || '补习'}) - {s.billing_type === 'monthly' ? '包月收费' : '按课时收费'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">对账月份:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls, Right Preview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Course selection and adjustment controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Step 1: Session Selector */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>1. 选择纳入对账的课时</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                  已选 {selectedSessionIds.length} / {sessions.length} 节
                </span>
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedSessionIds(sessions.map((s) => s.id))}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  全选
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedSessionIds([])}
                  className="text-slate-500 hover:text-slate-700 font-medium"
                >
                  清空
                </button>
              </div>
            </div>

            {/* Multi-subject quick selector if student has multiple subjects */}
            {Array.from(new Set(sessions.map((s) => s.subject).filter(Boolean))).length > 1 && (
              <div className="flex items-center flex-wrap gap-1.5 pt-0.5 pb-1">
                <span className="text-[11px] text-slate-500 font-medium">按科目快捷勾选:</span>
                <button
                  type="button"
                  onClick={() => setSelectedSessionIds(sessions.map((s) => s.id))}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-medium transition-all"
                >
                  全部合单 ({sessions.length}节)
                </button>
                {Array.from(new Set(sessions.map((s) => s.subject).filter(Boolean))).map((sub) => {
                  const subIds = sessions.filter((s) => s.subject === sub).map((s) => s.id);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSessionIds(subIds)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200/60 transition-all"
                    >
                      仅选 {sub} ({subIds.length}节)
                    </button>
                  );
                })}
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                <p>该月份暂未找到 {selectedStudent?.name} 的课时记录</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  可在“课表与打卡”页面点击“自动排课”或临时加课
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {sessions.map((session) => {
                  const isChecked = selectedSessionIds.includes(session.id);
                  const isCompleted = session.status === 'completed';
                  const isCancelledOrLeave = session.status === 'cancelled' || session.status === 'leave';

                  return (
                    <label
                      key={session.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isCancelledOrLeave
                          ? isChecked
                            ? 'bg-rose-50/80 border-rose-300'
                            : 'bg-rose-50/30 border-rose-200/70 opacity-75'
                          : isCompleted
                          ? isChecked
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-white border-slate-200/70'
                          : isChecked
                          ? 'bg-indigo-50/50 border-indigo-200'
                          : 'bg-white border-slate-200/70 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSession(session.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <span className={isCancelledOrLeave ? 'line-through text-rose-800' : ''}>{session.date}</span>
                            <span className="text-slate-400 font-normal">({session.start_time})</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isCancelledOrLeave
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isCompleted ? '🟢 已上课' : isCancelledOrLeave ? '🔴 取消/缺席 (不计费)' : '🔵 待打卡'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {session.subject} • {session.duration_hours}小时
                            {session.notes && ` • ${session.notes}`}
                          </div>
                        </div>
                      </div>

                      <span className={`text-xs font-extrabold ${isCancelledOrLeave ? 'text-rose-600' : 'text-emerald-800'}`}>
                        {isCancelledOrLeave ? 'RM 0.00' : `RM ${session.fee.toFixed(2)}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Additional Adjustments (Material Fee / Discounts) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">2. 附加杂费 / 优惠减免 (可选)</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="如: 教材复印费 / 报名优惠"
                value={newAdjDesc}
                onChange={(e) => setNewAdjDesc(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="number"
                step="1"
                placeholder="RM 金额 (负数为优惠)"
                value={newAdjAmount || ''}
                onChange={(e) => setNewAdjAmount(parseFloat(e.target.value) || 0)}
                className="w-28 px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddAdjustment}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-all"
              >
                添加
              </button>
            </div>

            {adjustments.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {adjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="font-medium text-slate-700">{adj.description}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${adj.amount >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                        {adj.amount >= 0 ? `+RM ${adj.amount.toFixed(2)}` : `-RM ${Math.abs(adj.amount).toFixed(2)}`}
                      </span>
                      <button
                        onClick={() => handleRemoveAdjustment(adj.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Card Options & Remarks */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">3. 收费状态与温馨附言</h3>
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">卡片底部温馨提示:</label>
              <textarea
                rows={2}
                value={billNotes}
                onChange={(e) => setBillNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">直接盖上“已付款”确认水印</span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Receipt Card Preview & Export Actions (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>对账单长图实时预览</span>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyImage}
                disabled={copying}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
                title="复制卡片图片，可直接在微信/WhatsApp中Ctrl+V粘贴发送"
              >
                {copySuccess ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                {copySuccess ? '已复制到剪贴板！' : copying ? '生成中...' : '复制图片 (秒发WhatsApp)'}
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all"
                title="保存为高清 PNG 图片"
              >
                <Download className="w-4 h-4" />
                {downloading ? '导出中...' : '下载卡片'}
              </button>

              <button
                type="button"
                onClick={handleSaveBill}
                className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-all"
                title="保存账单记录到系统数据库"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {saveSuccess ? '已保存记录！' : '保存记录'}
              </button>
            </div>
          </div>

          {/* THE RECEIPT CARD DOM (Will be converted to Image) */}
          <div className="flex justify-center p-2 bg-slate-200/50 rounded-2xl border border-slate-200/60 overflow-x-auto">
            <div
              ref={cardRef}
              className="receipt-card-container w-full max-w-[480px] bg-white rounded-2xl p-6 sm:p-7 text-slate-800 border border-slate-100 relative selection:bg-none"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}
            >
              {/* Watermark Paid Stamp if marked paid */}
              {isPaid && (
                <div className="absolute top-20 right-6 border-4 border-emerald-600/70 text-emerald-600 font-extrabold text-lg px-4 py-1.5 rounded-xl uppercase tracking-widest rotate-12 select-none pointer-events-none opacity-85">
                  ✓ 已完成结清 PAID
                </div>
              )}

              {/* CARD HEADER */}
              <div className="border-b-2 border-dashed border-slate-200 pb-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                      课时明细与收费凭据
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">
                      {tutorProfile.name || '补习辅导'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      联络方式: {tutorProfile.phone || '请在老师设置中补充'}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-mono font-medium">单号: {billNo}</div>
                    <div className="text-xs font-semibold text-slate-600 mt-0.5">开单日期: {currentDateFormatted}</div>
                  </div>
                </div>

                {/* Student Info Pill */}
                <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block">对账学生 / 年级</span>
                    <span className="text-sm font-bold text-slate-800">
                      {selectedStudent?.name}
                      <span className="text-xs font-normal text-slate-500 ml-1.5">({selectedStudent?.grade})</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-medium text-slate-400 block">对账周期</span>
                    <span className="text-xs font-bold text-indigo-700">{selectedMonth} 月度</span>
                  </div>
                </div>
              </div>

              {/* LESSON DETAILS TABLE */}
              <div className="py-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                  <span>上课日期 / 科目</span>
                  <span>时长 / 状态</span>
                  <span className="text-right">金额 (RM)</span>
                </div>

                {activeSessions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic">
                    暂无勾选课时（请在左侧勾选上课记录）
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activeSessions.map((s) => {
                      const isCancelledOrLeave = s.status === 'cancelled' || s.status === 'leave';
                      return (
                        <div
                          key={s.id}
                          className={`py-2.5 flex items-center justify-between text-xs ${
                            isCancelledOrLeave ? 'bg-rose-50/70 px-2.5 -mx-2.5 rounded-lg my-0.5 border border-rose-100' : ''
                          }`}
                        >
                          <div className="pr-2">
                            <div className="font-bold flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                                  isCancelledOrLeave ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                              />
                              <span className={isCancelledOrLeave ? 'text-rose-800 line-through' : 'text-slate-800'}>
                                {s.date}
                              </span>
                              <span className={`font-medium text-[11px] ${isCancelledOrLeave ? 'text-rose-700' : 'text-slate-500'}`}>
                                ({s.subject})
                              </span>
                            </div>
                            {s.notes && (
                              <div className={`text-[10px] truncate max-w-[180px] pl-3.5 ${isCancelledOrLeave ? 'text-rose-600 font-medium' : 'text-slate-400'}`}>
                                {s.notes}
                              </div>
                            )}
                          </div>

                          <div className="text-[11px] text-center font-medium">
                            {isCancelledOrLeave ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] border border-rose-200">
                                已取消/缺席 · 不计费
                              </span>
                            ) : (
                              <span className="text-slate-600">{s.duration_hours}h × RM{s.rate}</span>
                            )}
                          </div>

                          <div className={`font-extrabold text-right ${isCancelledOrLeave ? 'text-rose-600' : 'text-emerald-800'}`}>
                            {isCancelledOrLeave ? 'RM 0.00' : `RM ${s.fee.toFixed(2)}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ADJUSTMENTS & TOTAL SECTION */}
              <div className="border-t-2 border-dashed border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>
                    课时小计 (实上 {billableSessions.length} 节
                    {cancelledSessions.length > 0 ? `，取消/缺席 ${cancelledSessions.length} 节 RM 0` : ''}):
                  </span>
                  <span className="font-bold text-slate-800">RM {subtotal.toFixed(2)}</span>
                </div>

                {adjustments.map((adj) => (
                  <div key={adj.id} className="flex justify-between text-xs text-slate-600">
                    <span>{adj.description}:</span>
                    <span className={`font-semibold ${adj.amount >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                      {adj.amount >= 0 ? `+RM ${adj.amount.toFixed(2)}` : `-RM ${Math.abs(adj.amount).toFixed(2)}`}
                    </span>
                  </div>
                ))}

                {/* Prominent Total Due */}
                <div className="bg-indigo-50/80 rounded-xl p-3 mt-2 flex items-center justify-between border border-indigo-100">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-700 uppercase block tracking-wider">
                      本期应付总额 (Total Due)
                    </span>
                    <span className="text-[10px] text-slate-500">马币 (MYR) 结算</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-indigo-900">
                    RM {totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* PAYMENT DETAILS BOX (DuitNow & Bank info) */}
              <div className="mt-5 pt-4 border-t border-slate-100 bg-slate-50 rounded-xl p-3.5 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    付款方式与转账资料
                  </span>
                  <span className="text-[10px] text-slate-400">支持 DuitNow / 线上转账</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 text-xs text-slate-600 flex-1">
                    {tutorProfile.duitnow_id && (
                      <div>
                        <span className="text-slate-400 text-[11px]">DuitNow 账号: </span>
                        <strong className="text-slate-800 font-mono">{tutorProfile.duitnow_id}</strong>
                      </div>
                    )}
                    {tutorProfile.bank_name && (
                      <div>
                        <span className="text-slate-400 text-[11px]">银行名称: </span>
                        <span className="font-semibold text-slate-800">{tutorProfile.bank_name}</span>
                      </div>
                    )}
                    {tutorProfile.bank_account && (
                      <div>
                        <span className="text-slate-400 text-[11px]">户头号码: </span>
                        <strong className="text-slate-800 font-mono tracking-wider">{tutorProfile.bank_account}</strong>
                      </div>
                    )}
                    {tutorProfile.bank_holder && (
                      <div>
                        <span className="text-slate-400 text-[11px]">户头姓名: </span>
                        <span className="font-semibold text-slate-800">{tutorProfile.bank_holder}</span>
                      </div>
                    )}
                  </div>

                  {/* QR Code image if available */}
                  {tutorProfile.qr_image ? (
                    <div className="w-20 h-20 shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-xs flex items-center justify-center">
                      <img
                        src={tutorProfile.qr_image}
                        alt="收款二维码"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 shrink-0 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                      <QrCode className="w-6 h-6 stroke-1" />
                      <span className="text-[8px] mt-0.5">收款码</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD FOOTER REMARKS */}
              {billNotes && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <p className="text-[11px] text-slate-500 italic">
                    “{billNotes}”
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
