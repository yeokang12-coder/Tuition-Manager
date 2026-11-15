import React, { useState } from 'react';
import { 
  Settings, CreditCard, User, Upload, CheckCircle2, QrCode, 
  Smartphone, ShieldCheck, Wifi, Save, Trash 
} from 'lucide-react';
import { TutorProfile } from '../types';
import { api } from '../api/client';

interface SettingsViewProps {
  profile: TutorProfile;
  onRefreshProfile: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onRefreshProfile,
}) => {
  const [name, setName] = useState(profile.name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [email, setEmail] = useState(profile.email || '');
  const [bankName, setBankName] = useState(profile.bank_name || 'Maybank');
  const [bankAccount, setBankAccount] = useState(profile.bank_account || '');
  const [bankHolder, setBankHolder] = useState(profile.bank_holder || '');
  const [duitnowId, setDuitnowId] = useState(profile.duitnow_id || '');
  const [qrImage, setQrImage] = useState(profile.qr_image || '');
  const [welcomeNote, setWelcomeNote] = useState(profile.welcome_note || '');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handle QR code image file upload
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小请控制在 2MB 以内');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setQrImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateProfile({
        name,
        phone,
        email,
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder: bankHolder,
        duitnow_id: duitnowId,
        qr_image: qrImage,
        welcome_note: welcomeNote,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onRefreshProfile();
    } catch (err: any) {
      alert(`保存设置失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-8">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">老师个人信息与收款配置</h2>
            <p className="text-xs text-slate-500">
              设置您的姓名、联络方式、DuitNow / 银行转账账号与收款二维码，将自动显示在对账单卡片上
            </p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            已成功保存！
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Section 1: Personal Info */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">老师基本信息</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                老师姓名 / 辅导中心名称 *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如: 陈老师 (Teacher Chen)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                联络电话 / WhatsApp *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="如: 012-345 6789"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">联络邮箱 (可选)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="如: teacher@gmail.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">默认问候语</label>
              <input
                type="text"
                value={welcomeNote}
                onChange={(e) => setWelcomeNote(e.target.value)}
                placeholder="如: 感谢家长的支持与配合！"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Payment & Bank Info */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">银行与 DuitNow 收款信息</h3>
            <span className="text-xs text-slate-400">（这些信息会精美印制在长图收据底部，方便家长转账）</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                DuitNow 账号 (手机号 / 身份证 / 公司号)
              </label>
              <input
                type="text"
                value={duitnowId}
                onChange={(e) => setDuitnowId(e.target.value)}
                placeholder="如: 0123456789"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">银行名称</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="Maybank">Maybank (马来亚银行)</option>
                <option value="CIMB Bank">CIMB Bank (联昌国际)</option>
                <option value="Public Bank">Public Bank (大众银行)</option>
                <option value="Hong Leong Bank">Hong Leong Bank (丰隆银行)</option>
                <option value="RHB Bank">RHB Bank (兴业银行)</option>
                <option value="AmBank">AmBank (大马银行)</option>
                <option value="UOB Bank">UOB Bank (大华银行)</option>
                <option value="OCBC Bank">OCBC Bank (华侨银行)</option>
                <option value="Touch 'n Go eWallet">Touch 'n Go eWallet</option>
                <option value="其他银行">其他银行 / 电子钱包</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">银行户头号码</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="如: 1140 1234 5678"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">户头持有人英文姓名</label>
              <input
                type="text"
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                placeholder="如: TAN CHEN PIN (大写拼音)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* QR Code Upload */}
          <div className="pt-3 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              DuitNow / Touch 'n Go / 银行收款二维码图片 (可选)
            </label>

            <div className="flex items-center gap-4">
              {qrImage ? (
                <div className="relative group w-24 h-24 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs flex items-center justify-center">
                  <img src={qrImage} alt="二维码预览" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setQrImage('')}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-sm"
                    title="移除二维码"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                  <QrCode className="w-7 h-7 stroke-1" />
                  <span className="text-[10px] mt-1">未上传</span>
                </div>
              )}

              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all border border-slate-200">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  上传二维码图片
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  支持 JPG / PNG 格式，上传后将自动缩小显示在收据卡片右下角
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Architecture & Mobile Sync Tips */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-2xl p-5 border border-indigo-100/80 space-y-2">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
            <Wifi className="w-4 h-4 text-indigo-600" />
            <span>本地运行与手机局域网使用提示</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            • 您的所有学生和课时数据安全地保存在本机 SQLite 数据库中（<code className="bg-white/80 px-1.5 py-0.5 rounded text-indigo-700 font-mono text-[11px]">tutor_receipt.db</code>），不上传任何外部服务器，绝对隐私安全。<br />
            • <strong>手机同 Wi-Fi 访问</strong>：只需确保手机与此电脑连接在同一个家庭或教室 Wi-Fi，在手机浏览器中输入电脑的局域网 IP（例如 <code className="bg-white/80 px-1.5 py-0.5 rounded text-indigo-700 font-mono text-[11px]">http://192.168.x.x:5173</code>），即可在手机上像使用 App 一样随时排课打卡和生成收据！
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存全部配置'}
          </button>
        </div>
      </form>
    </div>
  );
};
