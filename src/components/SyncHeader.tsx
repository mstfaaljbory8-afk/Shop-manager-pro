import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  Smartphone,
  Cloud,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Wifi,
  WifiOff,
  Store,
  LogIn,
  UserCheck,
  Languages,
  ArrowRight,
  ArrowLeft,
  Download
} from 'lucide-react';
import { type SyncState } from '../firebase/syncService';

interface Props {
  syncState: SyncState;
  lang: 'ar' | 'en';
  currentTab: string;
  onGoBack: () => void;
  onOpenLoginGateway: (tab?: 'owner' | 'qr' | 'guest') => void;
  onOpenDevices: () => void;
  onOpenBackups: () => void;
  onOpenDownloads: () => void;
  onForceSync: () => void;
  onSignOut: () => void;
}

export const SyncHeader: React.FC<Props> = ({
  syncState,
  lang,
  currentTab,
  onGoBack,
  onOpenLoginGateway,
  onOpenDevices,
  onOpenBackups,
  onOpenDownloads,
  onForceSync,
  onSignOut,
}) => {
  const isAr = lang === 'ar';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualSync = () => {
    setIsRotating(true);
    onForceSync();
    setTimeout(() => setIsRotating(false), 1200);
  };

  const isConnected = !!syncState.user || !!syncState.memberSession;

  const getStatusBadge = () => {
    if (syncState.sessionRole === 'employee') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <span className="w-2 h-2 rounded-full bg-blue-400 pulse-dot" />
          <span>
            {isAr ? 'وضع الموظف: ' : 'Staff: '}
            {syncState.memberSession?.name || (isAr ? 'موظف' : 'Staff')}
          </span>
        </div>
      );
    }

    if (syncState.sessionRole === 'partner') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
          <span className="w-2 h-2 rounded-full bg-purple-400 pulse-dot" />
          <span>
            {isAr ? 'وضع الشريك: ' : 'Partner: '}
            {syncState.memberSession?.name || (isAr ? 'شريك' : 'Partner')}
          </span>
        </div>
      );
    }

    if (!syncState.user) {
      return (
        <button
          onClick={() => onOpenLoginGateway('owner')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>{isAr ? 'متجر محلي · تسجيل الدخول' : 'Local · Sign In'}</span>
        </button>
      );
    }

    switch (syncState.status) {
      case 'syncing':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{isAr ? 'جارٍ المزامنة السحابية...' : 'Syncing cloud...'}</span>
          </div>
        );
      case 'synced':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
            <span>{isAr ? 'متزامن لحظياً' : 'Live Synced'}</span>
          </div>
        );
      case 'offline':
        return (
          <div
            title={isAr ? 'يعمل التطبيق محلياً بكفاءة كاملة وسيتم رفع البيانات تلقائياً عند توفر الاتصال السحابي' : 'Working offline with local storage. Cloud will sync automatically.'}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
          >
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'وضع محلي (أوفلاين)' : 'Offline (Local DB)'}</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <WifiOff className="w-3.5 h-3.5" />
            <span>{isAr ? 'أوفلاين (إعادة المحاولة)' : 'Offline (Retrying)'}</span>
          </div>
        );
      case 'connecting':
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <Wifi className="w-3.5 h-3.5" />
            <span>{isAr ? 'جارٍ الاتصال...' : 'Connecting...'}</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 cloud-sync-bar px-3 sm:px-4 py-2 transition-all shadow-md">
      <div className="max-w-[860px] mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Branding & Back Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentTab !== 'home' ? (
            <button
              onClick={onGoBack}
              title={isAr ? 'الرجوع للقائمة السابقة' : 'Go back to previous menu'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 font-bold text-xs transition active:scale-95 shadow-sm"
            >
              {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isAr ? 'رجوع' : 'Back'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm">
                <Store className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-slate-100 leading-tight">
                  {isAr ? 'إدارة المتجر' : 'Shop Manager Pro'}
                </h1>
                <p className="text-[10px] text-teal-400 font-medium">
                  {isAr ? 'نظام المبيعات والمخزون' : 'POS & Inventory Engine'}
                </p>
              </div>
            </div>
          )}

          <div className="hidden md:flex items-center">
            {getStatusBadge()}
          </div>
        </div>

        {/* Right: Actions & User Account */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Status badge for mobile */}
          <div className="block md:hidden">
            {getStatusBadge()}
          </div>

          {isConnected && (
            <>
              {/* Quick Sync Button */}
              <button
                onClick={handleManualSync}
                title={isAr ? 'مزامنة فورية الآن' : 'Sync now'}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isRotating || syncState.status === 'syncing' ? 'animate-spin text-teal-400' : ''
                  }`}
                />
                <span className="hidden sm:inline">{isAr ? 'مزامنة' : 'Sync'}</span>
              </button>

              {/* Source Code & APK Downloads */}
              <button
                onClick={onOpenDownloads}
                title={isAr ? 'تحميل كود المصدر وحزمة بناء APK' : 'Download Source & APK Package'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-600/40 transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{isAr ? 'تحميل / APK' : 'APK / Code'}</span>
              </button>

              {/* Devices count pill (for Owner) */}
              {syncState.sessionRole === 'owner' && (
                <button
                  onClick={onOpenDevices}
                  title={isAr ? 'عرض الأجهزة المتزامنة' : 'View connected devices'}
                  className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>{syncState.connectedDevices.length || 1}</span>
                </button>
              )}
            </>
          )}

          {/* User Profile / Login Gateway Button */}
          {!isConnected ? (
            <button
              onClick={() => onOpenLoginGateway('owner')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition shadow-sm border border-slate-200 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5 text-teal-600" />
              <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
            </button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
              >
                {syncState.user?.photoURL ? (
                  <img
                    src={syncState.user.photoURL}
                    alt="Account Avatar"
                    className="w-7 h-7 rounded-full object-cover border border-teal-500/40"
                  />
                ) : (
                  <div
                    className={`w-7 h-7 rounded-full text-white font-bold flex items-center justify-center text-xs ${
                      syncState.sessionRole === 'partner'
                        ? 'bg-purple-600'
                        : syncState.sessionRole === 'employee'
                        ? 'bg-blue-600'
                        : 'bg-teal-600'
                    }`}
                  >
                    {syncState.sessionRole === 'employee'
                      ? 'E'
                      : syncState.sessionRole === 'partner'
                      ? 'P'
                      : (syncState.user?.displayName || 'G')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-200 hidden sm:inline max-w-[100px] truncate">
                  {syncState.memberSession?.name || syncState.user?.displayName || (isAr ? 'الحساب' : 'Account')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  className={`absolute ${
                    isAr ? 'left-0' : 'right-0'
                  } mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-right animate-in fade-in slide-in-from-top-2`}
                  dir={isAr ? 'rtl' : 'ltr'}
                >
                  <div className="p-3 border-b border-slate-800/80 mb-1">
                    <p className="text-xs font-bold text-slate-100 truncate">
                      {syncState.memberSession?.name || syncState.user?.displayName || (isAr ? 'المستخدم' : 'User')}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {syncState.memberSession
                        ? syncState.sessionRole === 'partner'
                          ? isAr ? 'شريك متجر (رمز QR)' : 'Store Partner (QR)'
                          : isAr ? 'موظف مبيعات (رمز QR)' : 'Sales Staff (QR)'
                        : syncState.user?.email}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isAr ? 'المزامنة السحابية اللحظية نشطة' : 'Live Sync Active'}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {syncState.sessionRole === 'owner' && (
                      <>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenDevices();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl transition font-medium text-start"
                        >
                          <Smartphone className="w-4 h-4 text-blue-400" />
                          <span>
                            {isAr ? 'الأجهزة المتزامنة' : 'Connected Devices'} ({syncState.connectedDevices.length || 1})
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenBackups();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl transition font-medium text-start"
                        >
                          <Cloud className="w-4 h-4 text-teal-400" />
                          <span>{isAr ? 'النسخ الاحتياطية السحابية' : 'Cloud Backups'}</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenLoginGateway();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl transition font-medium text-start"
                    >
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                      <span>{isAr ? 'تبديل الحساب أو تسجيل دخول آخر' : 'Switch Account / Login'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenDownloads();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-300 hover:bg-amber-950/40 rounded-xl transition font-medium text-start"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>{isAr ? 'تحميل ملفات المشروع و APK' : 'Download Project & APK'}</span>
                    </button>
                  </div>

                  <div className="pt-1 mt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition font-medium text-start"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
