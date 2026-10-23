import React, { useState, useEffect } from 'react';
import { Cloud, Download, Plus, X, Calendar, Package, ShoppingCart, Users, Check, RefreshCw } from 'lucide-react';
import { syncManager } from '../firebase/syncService';

interface Props {
  isOpen: boolean;
  lang?: 'ar' | 'en';
  onClose: () => void;
  onRestore: (backupData: any) => void;
}

export const CloudBackupsModal: React.FC<Props> = ({
  isOpen,
  lang = 'ar',
  onClose,
  onRestore,
}) => {
  const isAr = lang === 'ar';
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const list = await syncManager.getCloudBackups();
      setBackups(list);
    } catch (e: any) {
      console.warn('Backup fetch notice:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const defaultName = isAr
      ? `نسخة احتياطية ${new Date().toLocaleDateString('ar-IQ')}`
      : `Backup ${new Date().toLocaleDateString('en-US')}`;
    const name = backupName.trim() || defaultName;
    setCreating(true);
    try {
      const currentDb = (window as any).db;
      if (!currentDb) throw new Error(isAr ? 'لا توجد بيانات متجر متاحة حالياً' : 'No store data available currently');
      await syncManager.createCloudBackup(name, currentDb);
      setSuccessMsg(isAr ? 'تم حفظ النسخة السحابية بنجاح! ☁️' : 'Cloud backup saved successfully! ☁️');
      setBackupName('');
      setShowCreateInput(false);
      await fetchBackups();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e: any) {
      alert((isAr ? 'تعذر حفظ النسخة: ' : 'Failed to save backup: ') + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreClick = (backup: any) => {
    const c = backup.counts || {};
    const confirmPrompt = isAr
      ? `هل تريد استعادة هذه النسخة السحابية؟\n«${backup.name}»\nالمحتوى: ${c.p || 0} منتج، ${c.s || 0} مبيعات، ${c.c || 0} زبائن.\n\nستحل هذه البيانات محل البيانات الحالية على هذا الجهاز وتتزامن فوراً مع باقي أجهزتك.`
      : `Do you want to restore this cloud backup?\n"${backup.name}"\nContent: ${c.p || 0} products, ${c.s || 0} sales, ${c.c || 0} customers.\n\nThis will replace local data and sync across all your devices.`;

    if (confirm(confirmPrompt)) {
      onRestore(backup.data);
      onClose();
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
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isAr ? 'النسخ الاحتياطية السحابية' : 'Cloud Store Backups'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'حفظ واستعادة بيانات متجرك من أي مكان' : 'Save and restore your store database anytime'}
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
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Create Backup Button / Input */}
          {!showCreateInput ? (
            <button
              onClick={() => setShowCreateInput(true)}
              className="w-full py-3 px-4 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-300 font-semibold text-sm hover:bg-teal-600/30 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'حفظ نسخة سحابية جديدة الآن' : 'Create New Cloud Backup Now'}</span>
            </button>
          ) : (
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                {isAr ? 'اسم النسخة الاحتياطية:' : 'Backup Snapshot Name:'}
              </label>
              <input
                type="text"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder={isAr ? 'مثال: نهاية الشهر، قبل الجرد، إلخ' : 'e.g., Month End, Pre-Audit, etc.'}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                  <span>{creating ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ في السحابة' : 'Save to Cloud')}</span>
                </button>
                <button
                  onClick={() => setShowCreateInput(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* List of Backups */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
              <span>{isAr ? `النسخ المحفوظة (${backups.length})` : `Saved Snapshots (${backups.length})`}</span>
              <button
                onClick={fetchBackups}
                className="hover:text-teal-400 flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'تحديث' : 'Refresh'}</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-400 text-sm flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-teal-400" />
                <span>{isAr ? 'جارٍ تحميل النسخ السحابية...' : 'Loading cloud snapshots...'}</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm bg-slate-800/20 rounded-xl border border-slate-800/50">
                {isAr
                  ? 'لا توجد نسخ احتياطية محفوظة في السحابة بعد. اضغط على الزر أعلاه لإنشاء نسختك الأولى!'
                  : 'No backups saved in cloud yet. Click the button above to create your first snapshot!'}
              </div>
            ) : (
              backups.map((bk) => {
                const c = bk.counts || {};
                const dateStr = bk.createdAt?.toDate
                  ? bk.createdAt.toDate().toLocaleString(isAr ? 'ar-IQ' : 'en-US')
                  : (isAr ? 'تاريخ غير محدد' : 'Unknown date');

                return (
                  <div
                    key={bk.backupId}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-100">{bk.name || (isAr ? 'نسخة احتياطية' : 'Backup')}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Package className="w-3 h-3 text-amber-400" />
                          <span>{c.p || 0} {isAr ? 'منتج' : 'items'}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <ShoppingCart className="w-3 h-3 text-emerald-400" />
                          <span>{c.s || 0} {isAr ? 'مبيعات' : 'sales'}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Users className="w-3 h-3 text-blue-400" />
                          <span>{c.c || 0} {isAr ? 'زبائن' : 'customers'}</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestoreClick(bk)}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-teal-600 hover:text-white border border-slate-700 text-teal-400 font-semibold text-xs transition flex items-center justify-center gap-1.5 self-end sm:self-center"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isAr ? 'استعادة' : 'Restore'}</span>
                    </button>
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
