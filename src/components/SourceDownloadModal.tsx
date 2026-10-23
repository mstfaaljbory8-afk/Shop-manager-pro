import React from 'react';
import { X, Download, FileCode, FolderArchive, Smartphone, CheckCircle2, Sparkles, ExternalLink, Layers } from 'lucide-react';

interface SourceDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export const SourceDownloadModal: React.FC<SourceDownloadModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar'
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const downloadItems = [
    {
      id: 'github-apk',
      title: isAr ? 'حزمة GitHub الجاهزة لتوليد APK آلياً' : 'GitHub-Ready APK Builder Package',
      filename: 'shop-manager-github-apk-builder.zip',
      size: '~52 KB',
      icon: Smartphone,
      color: 'amber',
      description: isAr
        ? 'حزمة متكاملة تحتوي على ملفات التطبيق وإعدادات Capacitor وملف سير العمل (.github/workflows/build-apk.yml). عند رفعها على GitHub يتم بناء ملف APK تلقائياً في دقيقتين!'
        : 'Pre-configured repository package with Capacitor and GitHub Actions workflow. Auto-builds APK in 2 minutes on GitHub.',
      url: '/downloads/shop-manager-github-apk-builder.zip',
      badge: isAr ? 'جاهز للبناء على GitHub 🚀' : 'GitHub Actions Auto-Build 🚀'
    },
    {
      id: 'html',
      title: isAr ? 'ملف التطبيق المستقل (HTML كامل مثل الأصلي)' : 'Standalone App File (Full Single HTML)',
      filename: 'shop-manager.html',
      size: '~159 KB',
      icon: FileCode,
      color: 'teal',
      description: isAr
        ? 'ملف HTML مدمج وشامل، يعمل بنقرة واحدة بدون إنترنت على أي جهاز، محدّث بخط Cairo وتبديل سلس للوضع الليلي.'
        : 'Self-contained single HTML app. Works offline on any browser with Cairo typography and smooth dark/light transitions.',
      url: '/downloads/shop-manager.html',
      badge: isAr ? 'نفس الملف الأصلي محدّث' : 'Original Single File Updated'
    },
    {
      id: 'modular',
      title: isAr ? 'الكود المصدري المجزأ (المجلد المنظم بالكامل)' : 'Modular Source Code Package',
      filename: 'shop-manager-modular.zip',
      size: '~118 KB',
      icon: FolderArchive,
      color: 'blue',
      description: isAr
        ? 'الأكواد المنظمة تماماً مثل النسخة الأصلية: 37 ملف JavaScript مقسمة في مجلد js/ (مبيعات، مخزون، ديون، أمان، تقارير) بالإضافة إلى CSS و index.html و build.js.'
        : 'Cleanly organized project archive containing all 37 modular JS files in js/, stylesheets, build.js, and index.html.',
      url: '/downloads/shop-manager-modular.zip',
      badge: isAr ? 'الكود المنظم للاطلاع' : 'Organized Modular Code'
    },
    {
      id: 'full',
      title: isAr ? 'المشروع السحابي الشامل (React + Firebase + GitHub Actions)' : 'Full Cloud Platform (React + Firebase)',
      filename: 'full-project-src.zip',
      size: '~320 KB',
      icon: Layers,
      color: 'purple',
      description: isAr
        ? 'الكود المصدري الكامل للتطبيق الحديث شاملاً واجهات React، مكونات Tailwind، محرك المزامنة السحابية اللحظية Firestore، وبوابة الأجهزة وسير عمل GitHub Actions.'
        : 'Complete full-stack source code with React components, Tailwind styling, real-time Firebase sync, device gateway, and GitHub CI/CD.',
      url: '/downloads/full-project-src.zip',
      badge: isAr ? 'مشروع السحاب المتقدم' : 'Full Web Platform'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-[100050] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                {isAr ? 'تحميل ملفات التطبيق وكود المصدر' : 'Download Application Files & Source Code'}
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'نسخ التطبيق الأصلية والمنظمة للاطلاع والمعاينة وتوليد تطبيق APK'
                  : 'Original & modular source files ready for inspection, offline usage, and APK packaging'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-200 text-sm">
          {/* Section 1: Direct Source Downloads */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
              {isAr ? 'ملفات كود المصدر للتنزيل المباشر' : 'Direct Source Code Downloads'}
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {downloadItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-lg bg-slate-700/50 text-teal-300 shrink-0 mt-0.5">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100">{item.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                          {item.description}
                        </p>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 pt-0.5">
                          <span>{item.filename}</span>
                          <span>•</span>
                          <span>{item.size}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={item.url}
                      download={item.filename}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition shadow-md active:scale-95 shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isAr ? 'تحميل الملف' : 'Download File'}</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: How to get / install APK */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/90 to-slate-800/40 border border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Smartphone className="w-5 h-5" />
              <span>{isAr ? 'طرق تشغيل وتثبيت التطبيق على هاتف أندرويد (APK / PWA)' : 'Android Installation & APK Packaging'}</span>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              {/* Option 1: GitHub Actions */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{isAr ? 'الطريقة 1 (عبر GitHub): بناء ملف APK تلقائياً في دقيقتين' : 'Method 1 (GitHub Actions): Auto-Build APK in 2 Minutes'}</span>
                </div>
                <p className="text-slate-300 pl-6 rtl:pr-6 rtl:pl-0">
                  {isAr
                    ? 'حمّل حزمة «shop-manager-github-apk-builder.zip» أعلاه، وأنشئ مستودعاً جديداً على GitHub وارفع الملفات إليه. ستجد في تبويب (Actions) أن خوادم GitHub قامت تلقائياً ببناء ملف ShopManager.apk وجعله جاهزاً للتحميل والتثبيت فوراً على هاتفك!'
                    : 'Download "shop-manager-github-apk-builder.zip" above, create a GitHub repo, and push the files. Under the "Actions" tab, GitHub will auto-compile ShopManager.apk ready to download and install.'}
                </p>
              </div>

              {/* Option 2: Instant PWA */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isAr ? 'الطريقة 2 (الفورية الموصى بها): تثبيت فوري كتطبيق أندرويد PWA' : 'Method 2 (Instant): Install as Native PWA App'}</span>
                </div>
                <p className="text-slate-400 pl-6 rtl:pr-6 rtl:pl-0">
                  {isAr
                    ? 'افتح رابط التطبيق على هاتفك بواسطة متصفح Google Chrome، واضغط على القائمة (ثلاث نقاط) ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». سيتثبت التطبيق فوراً بأيقونته الرسمية وشاشته الكاملة، ويعمل كلياً بدون إنترنت ويدعم كاميرا الباركود.'
                    : 'Open the app link on Android in Chrome, tap the menu (3 dots) -> "Install app" or "Add to Home screen". It installs directly as a native-like standalone app with offline database and barcode camera.'}
                </p>
              </div>

              {/* Option 3: PWABuilder */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>{isAr ? 'الطريقة 3 (توليد ملف APK جاهز خلال دقيقة عبر PWABuilder)' : 'Method 3: Generate APK via PWABuilder'}</span>
                </div>
                <p className="text-slate-400 pl-6 rtl:pr-6 rtl:pl-0">
                  {isAr
                    ? 'توجه إلى موقع pwabuilder.com وضَع رابط هذا التطبيق، ثم اضغط على زر Package for Android، وسيقوم بإنشاء ملف APK / AAB جاهز لتنزيله وتثبيته مباشرة على أي جهاز أندرويد.'
                    : 'Visit pwabuilder.com, paste this app URL, and click "Package for Android" to download a compiled signed APK directly.'}
                </p>
              </div>

              {/* Option 4: Local Capacitor */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{isAr ? 'الطريقة 4: بناء APK محلياً باستخدام Capacitor و Android Studio' : 'Method 4: Build APK via Capacitor & Android Studio'}</span>
                </div>
                <p className="text-slate-400 pl-6 rtl:pr-6 rtl:pl-0 font-mono text-[11px] bg-slate-950/70 p-2 rounded border border-slate-800">
                  npm install @capacitor/core @capacitor/cli @capacitor/android<br />
                  npx cap add android<br />
                  npx cap open android
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
