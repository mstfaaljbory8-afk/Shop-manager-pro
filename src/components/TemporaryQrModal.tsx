import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, X, Copy, Check, ShieldCheck, Download, Sparkles, RefreshCw, Lock, AlertTriangle } from 'lucide-react';
import { syncManager } from '../firebase/syncService';

interface Props {
  isOpen: boolean;
  lang?: 'ar' | 'en';
  onClose: () => void;
  targetId: string;
  name: string;
  role: 'employee' | 'partner';
}

export const TemporaryQrModal: React.FC<Props> = ({
  isOpen,
  lang = 'ar',
  onClose,
  targetId,
  name,
  role,
}) => {
  const isAr = lang === 'ar';
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateSingleUseQr = async () => {
    setGenerating(true);
    try {
      const res = await syncManager.createSingleUseActivationToken({
        targetId,
        name,
        role,
      });

      setShortCode(res.code);

      const url = await QRCode.toDataURL(res.qrPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch (err: any) {
      alert((isAr ? 'تعذر إنشاء رمز التفعيل: ' : 'Failed to generate activation code: ') + err.message);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateSingleUseQr();
    }
  }, [isOpen, targetId]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(shortCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-Activation-${name}-${role}.png`;
    a.click();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-md ${
              role === 'partner' ? 'bg-gradient-to-tr from-purple-600 to-indigo-500' : 'bg-gradient-to-tr from-blue-600 to-cyan-500'
            }`}>
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">{name}</h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  role === 'partner'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {role === 'partner' ? (isAr ? 'شريك متجر' : 'Store Partner') : (isAr ? 'موظف' : 'Staff')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'رمز تفعيل دائم (استخدام لمرة واحدة فقط)' : 'Permanent QR code (Single-use only)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 flex flex-col items-center">
          {/* Security Banner: Single-Use Guarantee */}
          <div className="w-full p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold leading-relaxed">
              {isAr
                ? 'هذا الرمز دائم الصلاحية ولكنه صالح للاستخدام لمرة واحدة فقط. يُقفل تلقائياً بمجرد مسحه على جهاز الموظف/الشريك لمنع مشاركته.'
                : 'This permanent QR code is valid for single-use only. It locks automatically upon scanning to prevent re-sharing.'}
            </span>
          </div>

          {/* QR Code Container */}
          <div className="relative p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-slate-700/50">
            {generating ? (
              <div className="w-64 h-64 flex flex-col items-center justify-center gap-3 text-slate-700">
                <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                <span className="text-xs font-semibold">{isAr ? 'جارٍ توليد رمز التفعيل لمرة واحدة...' : 'Generating single-use QR token...'}</span>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${name}`}
                className="w-64 h-64 object-contain rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400 text-xs">
                {isAr ? 'تعذر تحميل الرمز' : 'Could not generate code'}
              </div>
            )}
          </div>

          {/* Short code & Single-Use Status */}
          <div className="w-full flex items-center justify-between gap-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">{isAr ? 'كود التفعيل:' : 'Activation Code:'}</span>
              <span className="text-base font-black font-mono tracking-wider text-teal-400">{shortCode || '...'}</span>
            </div>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block font-medium">{isAr ? 'الحالة:' : 'Status:'}</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isAr ? 'جاهز للمسح' : 'Ready to scan'}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-teal-600 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="w-full p-3.5 bg-blue-950/20 border border-blue-800/30 rounded-2xl text-xs text-blue-300 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-200">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{isAr ? `خطوات تسجيل دخول ${name}:` : `Login instructions for ${name}:`}</span>
            </div>
            {isAr ? (
              <>
                <p>1. يفتح {name} التطبيق على هاتفه أو حاسوبه.</p>
                <p>2. يختار <b>«الموظفون والشركاء (رمز QR)»</b> ويوجه كاميرا جهازه نحو هذا الرمز.</p>
                <p>3. يتم تفعيل حسابه وربط جهازه بالمتجر بشكل دائم، ويصبح الرمز غير قابل للاستخدام مجدداً على أي جهاز آخر.</p>
              </>
            ) : (
              <>
                <p>1. {name} opens the app on their phone or tablet.</p>
                <p>2. Selects <b>"Staff & Partners (QR)"</b> and scans this QR code.</p>
                <p>3. Account is permanently bound to the store, and the QR code locks automatically against re-use.</p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
          <button
            onClick={handleDownloadQr}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>{isAr ? 'حفظ كصورة' : 'Save Image'}</span>
          </button>

          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
