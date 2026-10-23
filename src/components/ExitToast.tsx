import React from 'react';
import { LogOut } from 'lucide-react';

interface Props {
  visible: boolean;
  lang: 'ar' | 'en';
}

export const ExitToast: React.FC<Props> = ({ visible, lang }) => {
  if (!visible) return null;

  const isAr = lang === 'ar';
  const text = isAr ? 'اضغط مرة ثانية للخروج من التطبيق' : 'Press again to exit the app';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 inset-x-0 mx-auto w-max max-w-[90vw] z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white border border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-md">
        <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
          <LogOut className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-100 whitespace-nowrap">
          {text}
        </p>
      </div>
    </div>
  );
};
