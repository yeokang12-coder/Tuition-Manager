import React, { useState, useEffect } from 'react';
import { User, Lock, Phone, LogIn, UserPlus, X, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { Teacher } from '../types';
import { api } from '../api/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canClose?: boolean;
  onLoginSuccess: (teacher: Teacher) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  canClose = false,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTeachersList();
      setError(null);
    }
  }, [isOpen]);

  const loadTeachersList = async () => {
    try {
      const list = await api.getTeachers();
      setTeachersList(list);
      if (list.length > 0 && !name) {
        setName(list[0].name);
      }
    } catch (err) {
      console.error('Failed to load teachers list', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('请输入老师姓名或称呼');
      return;
    }
    if (!password) {
      setError('请输入登录密码/PIN码');
      return;
    }

    try {
      setSubmitting(true);
      let teacher: Teacher;
      if (mode === 'login') {
        teacher = await api.login(name.trim(), password);
      } else {
        teacher = await api.register(name.trim(), password, phone.trim());
      }
      onLoginSuccess(teacher);
      if (canClose && onClose) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white p-6 pb-7">
          {canClose && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mb-3 shadow-inner">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">大马补习助手 • 老师工作台</h2>
          <p className="text-xs text-indigo-100 mt-1">
            独立多账号体系，每位老师享有完全隔离的学生、课表与对账数据
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'login'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            老师登录
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setName('');
              setPassword('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'register'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            注册新老师账号
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Select existing teacher in login mode */}
          {mode === 'login' && teachersList.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                快速选择老师：
              </label>
              <div className="flex flex-wrap gap-2">
                {teachersList.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setName(t.name);
                      setPassword('');
                      setError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                      name === t.name
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold ring-2 ring-indigo-200'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <User className="w-3 h-3 text-slate-400" />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              老师姓名 / 称呼 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={mode === 'login' ? '例如：陈老师 或 林老师' : '例如：林老师 (Teacher Lim)'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                登录密码 / PIN码 <span className="text-rose-500">*</span>
              </label>
              {mode === 'login' && (
                <span className="text-[11px] text-slate-400">
                  初始账号默认密码: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">123456</code>
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="请输入密码 / PIN码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                手机联系电话 <span className="text-slate-400 font-normal">(选填，用于对账单展示)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="例如：012-345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Privacy Guarantee Note */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              {mode === 'login'
                ? '登录后您将进入您的专属空间，学生名单与收款设置完全保密。'
                : '新老师账号创建成功后将立即生效，拥有独立的全新学生录入和排课账单。'}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <span>处理中...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                立即登录老师账号
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                立即创建账号并进入
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
