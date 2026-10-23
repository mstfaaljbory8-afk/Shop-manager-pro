import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  QrCode,
  Shield,
  Camera,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  RefreshCw,
  Lock,
  Smartphone
} from 'lucide-react';
import { syncManager } from '../firebase/syncService';

interface Props {
  isOpen: boolean;
  lang?: 'ar' | 'en';
  canDismiss?: boolean;
  onClose?: () => void;
  onLoginSuccess: (role: 'owner' | 'employee' | 'partner', name?: string) => void;
}

export const LoginGatewayModal: React.FC<Props> = ({
  isOpen,
  lang = 'ar',
  canDismiss = false,
  onClose,
  onLoginSuccess,
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'owner' | 'qr'>('owner');
  const [shortCode, setShortCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen) return null;

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setErrorMsg(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanVideoLoop();
      }
    } catch (err: any) {
      console.warn('Camera start notice:', err);
      setErrorMsg('تعذر فتح الكاميرا تلقائياً. تأكد من منح إذن الكاميرا أو الصق كود الرمز.');
      setCameraActive(false);
    }
  };

  const scanVideoLoop = async () => {
    if (!videoRef.current || !streamRef.current) return;

    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const detect = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              const scannedRaw = codes[0].rawValue;
              stopCamera();
              handleProcessScannedToken(scannedRaw);
              return;
            }
          } catch (e) {}
          if (streamRef.current) {
            requestAnimationFrame(detect);
          }
        };
        detect();
        return;
      } catch (e) {}
    }
  };

  const handleProcessScannedToken = async (tokenString: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const session = await syncManager.validateAndLoginWithQrToken(tokenString);
      onLoginSuccess(session.role, session.name);
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل التحقق من رمز QR');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await syncManager.signInWithGoogle();
      onLoginSuccess('owner', user.displayName || 'المالك');
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر تسجيل الدخول بـ Google');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortCode.trim()) {
      setErrorMsg('يرجى لصق بيانات رمز QR أو مسحه عبر الكاميرا');
      return;
    }
    handleProcessScannedToken(shortCode.trim());
  };

  return (
    <div
      onClick={canDismiss && onClose ? onClose : undefined}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 relative text-center sm:text-start">
          {canDismiss && onClose && (
            <button
              onClick={onClose}
              className={`absolute top-5 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition ${isAr ? 'left-5' : 'right-5'}`}
            >
              ✕
            </button>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black shadow-lg shadow-teal-500/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                {isAr ? 'إدارة المتجر الذكية' : 'Smart Shop Manager Pro'}
              </h2>
              <p className="text-xs text-teal-400 font-medium">
                {isAr
                  ? 'تسجيل الدخول إلزامي للوصول إلى بيانات المتجر'
                  : 'Authentication required to access store cloud data'}
              </p>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl mt-5">
            <button
              onClick={() => {
                stopCamera();
                setActiveTab('owner');
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                activeTab === 'owner'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>{isAr ? 'دخول المالك (Google)' : 'Owner Login (Google)'}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('qr');
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                activeTab === 'qr'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{isAr ? 'الموظفون والشركاء (رمز QR)' : 'Staff & Partners (QR)'}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: OWNER (GOOGLE) */}
          {activeTab === 'owner' && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-teal-950/20 border border-teal-800/30 rounded-2xl space-y-2 text-xs text-teal-300 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-teal-200">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>{isAr ? 'دخول المالك الرئيسي:' : 'Store Owner Access:'}</span>
                </div>
                {isAr ? (
                  <>
                    <p>• تسجيل دخول آمن باستخدام حساب Google المعتمد للمتجر.</p>
                    <p>• صلاحيات إدارية كاملة لإدارة المبيعات، المخزون، الشركاء، والموظفين.</p>
                    <p>• إنشاء رموز QR دائمة للاستخدام لمرة واحدة لربط أجهزة الموظفين والشركاء.</p>
                  </>
                ) : (
                  <>
                    <p>• Secure Google Sign-In with verified store owner account.</p>
                    <p>• Full admin privileges for sales, inventory, partners, and finances.</p>
                    <p>• Generate permanent, single-use QR activation codes for staff & partners.</p>
                  </>
                )}
              </div>

              <button
                onClick={handleOwnerGoogleSignIn}
                disabled={loading}
                className="w-full py-4 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>{isAr ? 'تسجيل الدخول بحساب Google (المالك)' : 'Sign In with Google (Owner)'}</span>
              </button>
            </div>
          )}

          {/* TAB 2: EMPLOYEE / PARTNER (SINGLE-USE QR) */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-950/20 border border-blue-800/30 rounded-2xl text-xs text-blue-300 leading-relaxed space-y-1">
                <div className="font-bold text-blue-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isAr ? 'رمز QR دائم للاستخدام لمرة واحدة فقط:' : 'Permanent Single-Use QR Activation:'}</span>
                </div>
                {isAr ? (
                  <>
                    <p>اطلب من مالك المتجر فتح شاشته والانتقال إلى <b>الإعدادات ← الحسابات</b> والضغط على <b>«رمز QR لمرة واحدة»</b> بجانب اسمك.</p>
                    <p className="text-[11px] text-amber-300">ملاحظة: بمجرد مسح الرمز على هاتفك يُقفل تلقائياً ويبقى جهازك مربوطاً بالمتجر.</p>
                  </>
                ) : (
                  <>
                    <p>Ask the store owner to navigate to <b>Settings ← Accounts</b> and click <b>"Single-Use QR"</b> next to your name.</p>
                    <p className="text-[11px] text-amber-300">Notice: Once scanned, the token locks automatically and permanently pairs your device.</p>
                  </>
                )}
              </div>

              {/* Camera Scanner View */}
              {cameraActive ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500 bg-black aspect-video flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                  <div className="absolute inset-0 border-2 border-teal-400/50 m-8 rounded-xl pointer-events-none animate-pulse" />
                  <button
                    onClick={stopCamera}
                    className="absolute bottom-3 px-4 py-1.5 rounded-full bg-slate-900/80 text-white text-xs font-semibold hover:bg-slate-900"
                  >
                    {isAr ? 'إيقاف الكاميرا' : 'Stop Camera'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={startCamera}
                  className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2.5 transition active:scale-98"
                >
                  <Camera className="w-5 h-5" />
                  <span>{isAr ? 'توجيه الكاميرا لمسح رمز QR' : 'Open Camera to Scan QR'}</span>
                </button>
              )}

              {/* Manual Input Fallback */}
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-500 font-medium">
                  {isAr ? 'أو إدخال بيانات الرمز يدوياً' : 'Or enter activation code manually'}
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <form onSubmit={handleCodeSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value)}
                    placeholder={isAr ? 'الصق محتوى رمز QR هنا' : 'Paste QR token payload here'}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin text-blue-400" /> : <Keyboard className="w-4 h-4" />}
                  <span>{isAr ? 'تفعيل الدخول' : 'Activate Login'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>{isAr ? 'نظام محمي ومشفر بالكامل عبر Firebase Firestore' : 'Fully protected & live-synced via Firebase Firestore'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
