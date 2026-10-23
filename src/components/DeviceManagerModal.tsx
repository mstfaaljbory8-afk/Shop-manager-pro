import React from 'react';
import { Smartphone, Laptop, Monitor, Trash2, X, CheckCircle2, Clock } from 'lucide-react';
import { syncManager, type DeviceInfo } from '../firebase/syncService';

interface Props {
  isOpen: boolean;
  lang?: 'ar' | 'en';
  onClose: () => void;
  devices: DeviceInfo[];
  currentDeviceId: string;
}

export const DeviceManagerModal: React.FC<Props> = ({
  isOpen,
  lang = 'ar',
  onClose,
  devices,
  currentDeviceId,
}) => {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  const getDeviceIcon = (name: string) => {
    if (/هاتف|أندرويد|آيفون|جوال|phone|android|iphone/i.test(name)) return <Smartphone className="w-5 h-5 text-emerald-500" />;
    if (/كمبيوتر|ويندوز|ماك|لينكس|لابتوب|windows|mac|laptop|pc/i.test(name)) return <Laptop className="w-5 h-5 text-blue-500" />;
    return <Monitor className="w-5 h-5 text-indigo-500" />;
  };

  const handleRemove = async (deviceId: string) => {
    if (deviceId === currentDeviceId) {
      alert(isAr ? 'لا يمكنك إزالة جهازك الحالي من هنا.' : 'You cannot remove your current active device.');
      return;
    }
    const confirmMsg = isAr
      ? 'هل أنت متأكد من رغبتك في إزالة هذا الجهاز من قائمة المزامنة؟'
      : 'Are you sure you want to remove this device from sync list?';
    if (confirm(confirmMsg)) {
      await syncManager.removeDevice(deviceId);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isAr ? 'الأجهزة المتزامنة لحظياً' : 'Live Synced Devices'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'جميع أجهزتك المتصلة بنفس حساب Google' : 'All devices connected to your store cloud account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl text-xs text-emerald-300 leading-relaxed">
            {isAr
              ? '💡 أي عملية بيع، إضافة منتج، أو تسديد دين تتم على أي جهاز من هذه الأجهزة ستظهر فورياً على باقي الأجهزة تلقائياً دون الحاجة لإعادة تحميل الصفحة.'
              : '💡 Any sale, new item, or debt payment recorded on any of these devices will sync instantly across all devices without reloading.'}
          </div>

          <div className="space-y-2 mt-4">
            {devices.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                {isAr ? 'جهازك الحالي هو الجهاز الوحيد المتصل حالياً' : 'Your current device is the only connected device'}
              </div>
            ) : (
              devices.map((dev) => {
                const isCurrent = dev.deviceId === currentDeviceId;
                const lastActiveStr = dev.lastActive?.toDate
                  ? dev.lastActive.toDate().toLocaleString(isAr ? 'ar-IQ' : 'en-US')
                  : (isAr ? 'متصل الآن' : 'Connected now');

                return (
                  <div
                    key={dev.deviceId}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                      isCurrent
                        ? 'bg-slate-800/80 border-emerald-500/40 ring-1 ring-emerald-500/20'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
                        {getDeviceIcon(dev.deviceName || '')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-100">
                            {dev.deviceName || (isAr ? 'جهاز بدون اسم' : 'Unnamed Device')}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              {isAr ? 'هذا الجهاز' : 'This Device'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{isAr ? 'آخر نشاط:' : 'Last active:'} {lastActiveStr}</span>
                        </div>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => handleRemove(dev.deviceId)}
                        title={isAr ? 'إلغاء مزامنة هذا الجهاز' : 'Unlink this device'}
                        className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
