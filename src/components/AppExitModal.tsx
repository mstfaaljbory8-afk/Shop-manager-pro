import React from 'react';
import { LogOut, RotateCcw, XCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  lang: 'ar' | 'en';
  onRestart: () => void;
}

export const AppExitModal: React.FC<Props> = ({ isOpen, lang, onRestart }) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <LogOut className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-100">
            {isAr ? 'تم الخروج من التطبيق' : 'Application Exited'}
          </h2>
          <p className="text-xs text-slate-400">
            {isAr
              ? 'تم حفظ جميع التغييرات بنجاح. يمكنك إغلاق علامة التبويب أو نافذة المتصفح بأمان.'
              : 'All changes have been safely saved. You can close this browser tab or window.'}
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => {
              try {
                window.close();
              } catch (e) {}
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-600/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            <span>{isAr ? 'إغلاق نافذة المتصفح' : 'Close Window'}</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition border border-slate-700 active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-teal-400" />
            <span>{isAr ? 'إعادة فتح التطبيق' : 'Re-open Application'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
