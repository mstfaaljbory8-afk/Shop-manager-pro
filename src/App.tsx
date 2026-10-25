import React, { useState, useEffect, useRef } from 'react';
import { SyncHeader } from './components/SyncHeader';
import { BottomNavBar } from './components/BottomNavBar';
import { ExitToast } from './components/ExitToast';
import { AppExitModal } from './components/AppExitModal';
import { DeviceManagerModal } from './components/DeviceManagerModal';
import { CloudBackupsModal } from './components/CloudBackupsModal';
import { TemporaryQrModal } from './components/TemporaryQrModal';
import { LoginGatewayModal } from './components/LoginGatewayModal';
import { SourceDownloadModal } from './components/SourceDownloadModal';
import { syncManager, type SyncState } from './firebase/syncService';

export default function App() {
  const [syncState, setSyncState] = useState<SyncState>(syncManager.state);
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDevicesOpen, setIsDevicesOpen] = useState(false);
  const [isBackupsOpen, setIsBackupsOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitToastVisible, setExitToastVisible] = useState(false);

  const lastBackPressTimeRef = useRef<number>(0);
  const exitToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // QR Modal for Owner generating single-use code for Employee or Partner
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrTarget, setQrTarget] = useState<{ role: 'employee' | 'partner'; id: string; name: string } | null>(null);

  useEffect(() => {
    // 1. Subscribe to sync state updates
    const unsubState = syncManager.subscribeState((newState) => {
      setSyncState(newState);
      if ((window as any).TAB === 'set' && (window as any).render) {
        (window as any).render();
      }
    });

    // 2. Set up global bridge functions for the shop manager engine
    const win = window as any;
    win.__firebaseSyncPush = () => {
      if (win.db) {
        syncManager.queuePush(win.db);
      }
    };

    win.__firebaseSyncNow = async () => {
      if (win.db) {
        await syncManager.forceSync(win.db);
      }
    };

    win.__firebaseSignIn = async () => {
      return await syncManager.signInWithGoogle();
    };

    win.__firebaseSignOut = async () => {
      return await syncManager.signOut();
    };

    win.__firebaseGetState = () => {
      return syncManager.state;
    };

    win.__firebaseCreateBackup = async (name: string) => {
      if (win.db) {
        return await syncManager.createCloudBackup(name, win.db);
      }
    };

    win.__firebaseGetBackups = async () => {
      return await syncManager.getCloudBackups();
    };

    win.__firebaseShowDevicesModal = () => {
      setIsDevicesOpen(true);
    };

    win.__firebasePickCloudBackup = () => {
      setIsBackupsOpen(true);
    };

    win.__firebaseOpenLoginGateway = () => {
      setIsLoginModalOpen(true);
    };

    win.__firebaseOpenQrModal = (role: 'employee' | 'partner', id: string, name: string) => {
      setQrTarget({ role, id, name });
      setIsQrOpen(true);
    };

    // Bridge for App.tsx to trigger exit toast from engine
    win.__onEngineDoubleBack = () => {
      handleTriggerBack();
    };

    // Helper to hook engine navigation so BottomNavBar active tab stays synchronized
    const hookNavigation = () => {
      if (win.openTab && !win.__tabHooked) {
        const origOpenTab = win.openTab;
        win.openTab = function (t: string) {
          setCurrentTab(t);
          origOpenTab.apply(this, arguments as any);
        };
        win.__tabHooked = true;
      }
      if (win.goBack && !win.__goBackHooked) {
        const origGoBack = win.goBack;
        win.goBack = function () {
          origGoBack.apply(this, arguments as any);
          setCurrentTab(win.TAB || 'home');
        };
        win.__goBackHooked = true;
      }
    };

    // 3. Listen to incoming real-time cross-device updates
    const unsubRemote = syncManager.onRemoteData((remoteData, meta) => {
      if (win.db && remoteData) {
        win.db = Object.assign(win.db, remoteData);
        if (win.flushSave) win.flushSave();
        if (win.render) win.render();
        if (win.toast) {
          const isEnglish = win.db?.set?.lg === 'en';
          win.toast(
            isEnglish
              ? `🔄 Live cloud update received from: ${meta.deviceName || 'another device'}`
              : `🔄 تم استلام تحديث لحظي من: ${meta.deviceName || 'جهاز آخر'}`
          );
        }
      }
    });

    // 4. Tab change listener from shop-engine or popstate
    const handleTabChangeEvent = (e: CustomEvent<{ tab: string }>) => {
      if (e.detail && e.detail.tab) {
        setCurrentTab(e.detail.tab);
      }
    };
    window.addEventListener('shop:tabchange' as any, handleTabChangeEvent);

    const handlePopstate = () => {
      setTimeout(() => {
        setCurrentTab(win.TAB || 'home');
      }, 50);
    };
    window.addEventListener('popstate', handlePopstate);

    // 5. Language sync listener
    const handleLangChangeEvent = (e: CustomEvent<{ lang: 'ar' | 'en' }>) => {
      if (e.detail && e.detail.lang) {
        setLang(e.detail.lang);
        document.documentElement.lang = e.detail.lang;
        document.documentElement.dir = e.detail.lang === 'ar' ? 'rtl' : 'ltr';
      }
    };
    window.addEventListener('shop:langchange' as any, handleLangChangeEvent);

    // Check existing language from db if available
    if (win.db && win.db.set && win.db.set.lg) {
      setLang(win.db.set.lg);
      document.documentElement.lang = win.db.set.lg;
      document.documentElement.dir = win.db.set.lg === 'ar' ? 'rtl' : 'ltr';
    }

    // 6. Inject shop-engine.js once DOM containers are mounted
    if (!document.getElementById('shop-engine-script')) {
      const script = document.createElement('script');
      script.id = 'shop-engine-script';
      script.src = '/shop-engine/shop-engine.js';
      script.async = true;
      script.onload = () => {
        hookNavigation();
        if (win.TAB) {
          setCurrentTab(win.TAB);
        }
        if (win.db?.set?.lg) {
          setLang(win.db.set.lg);
          document.documentElement.lang = win.db.set.lg;
          document.documentElement.dir = win.db.set.lg === 'ar' ? 'rtl' : 'ltr';
        }
      };
      document.body.appendChild(script);
    } else {
      hookNavigation();
    }

    return () => {
      unsubState();
      unsubRemote();
      window.removeEventListener('shop:tabchange' as any, handleTabChangeEvent);
      window.removeEventListener('popstate', handlePopstate);
      window.removeEventListener('shop:langchange' as any, handleLangChangeEvent);
      if (exitToastTimerRef.current) {
        clearTimeout(exitToastTimerRef.current);
      }
    };
  }, []);

  const isAnyModalOpen =
    isLoginModalOpen ||
    isSwitchAccountOpen ||
    isDevicesOpen ||
    isBackupsOpen ||
    isDownloadsOpen ||
    isExitModalOpen ||
    isQrOpen;

  useEffect(() => {
    const ovl = document.getElementById('ovl');
    const updateModalClass = () => {
      const hasEngineModal = ovl && ovl.children.length > 0;
      if (isAnyModalOpen || hasEngineModal) {
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    };

    updateModalClass();

    if (!ovl) return;
    const observer = new MutationObserver(updateModalClass);
    observer.observe(ovl, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.body.classList.remove('modal-open');
    };
  }, [isAnyModalOpen]);

  const handleTriggerBack = () => {
    const win = window as any;
    // If not in root 'home', unwind the history stack
    if (win.TAB && win.TAB !== 'home') {
      if (win.goBack) {
        win.goBack();
        setCurrentTab(win.TAB || 'home');
      } else {
        win.TAB = 'home';
        setCurrentTab('home');
        if (win.render) win.render();
      }
      return;
    }

    // At root ('home'): Double-tap back detector
    const now = Date.now();
    if (now - lastBackPressTimeRef.current < 1000) {
      // Second tap within 1000ms -> Exit confirmation modal
      if (exitToastTimerRef.current) {
        clearTimeout(exitToastTimerRef.current);
        exitToastTimerRef.current = null;
      }
      setExitToastVisible(false);
      setIsExitModalOpen(true);
    } else {
      // First tap -> show toast bubble for exactly 1 second (1000ms)
      lastBackPressTimeRef.current = now;
      setExitToastVisible(true);
      if (exitToastTimerRef.current) {
        clearTimeout(exitToastTimerRef.current);
      }
      exitToastTimerRef.current = setTimeout(() => {
        setExitToastVisible(false);
        exitToastTimerRef.current = null;
      }, 1000);
    }
  };

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    const win = window as any;
    if (win.openTab) {
      win.openTab(tab);
    } else {
      win.TAB = tab;
      if (win.render) win.render();
    }
  };

  const handleLoginSuccess = (role: 'owner' | 'employee' | 'partner', name?: string) => {
    setIsLoginModalOpen(false);
    setIsSwitchAccountOpen(false);
    const win = window as any;

    if (role === 'employee' && syncManager.state.memberSession) {
      if (win.db) {
        win.db.set.cu = +syncManager.state.memberSession.targetId;
        if (win.save) win.save();
        if (win.render) win.render();
        if (win.toast) win.toast(lang === 'en' ? `Employee logged in: ${name || ''} 🔑` : `تم تسجيل دخول الموظف: ${name || ''} 🔑`);
      }
    } else if (role === 'partner') {
      if (win.db) {
        win.db.set.cu = '';
        if (win.render) win.render();
        if (win.toast) win.toast(lang === 'en' ? `Partner logged in: ${name || ''} 🤝` : `تم تسجيل دخول الشريك: ${name || ''} 🤝`);
      }
    } else if (role === 'owner') {
      if (win.db) {
        win.db.set.cu = '';
        if (win.render) win.render();
        if (win.toast) win.toast(lang === 'en' ? `Welcome back, Owner! 👑` : `مرحباً بعودتك! تم تسجيل دخول المالك 👑`);
      }
    }
  };

  const handleRestoreCloudBackup = (backupData: any) => {
    const win = window as any;
    if (win.applyBk) {
      win.applyBk(JSON.stringify(backupData));
      setTimeout(() => {
        syncManager.queuePush(win.db, true);
      }, 500);
    }
  };

  const isAuthenticated = syncManager.isAuthenticated();
  const isEmployee = syncManager.state.sessionRole === 'employee';

  return (
    <div
      className="min-h-screen bg-[var(--bg)] text-[var(--tx)] flex flex-col font-sans transition-colors duration-300 relative selection:bg-teal-500/30"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Real-time Cloud Synchronization Top Header (Always accessible with live sync or local offline state) */}
      <SyncHeader
        syncState={syncState}
        lang={lang}
        currentTab={currentTab}
        onGoBack={handleTriggerBack}
        onOpenLoginGateway={() => setIsLoginModalOpen(true)}
        onOpenDevices={() => setIsDevicesOpen(true)}
        onOpenBackups={() => setIsBackupsOpen(true)}
        onOpenDownloads={() => setIsDownloadsOpen(true)}
        onForceSync={() => {
          const win = window as any;
          if (win.db) {
            syncManager.forceSync(win.db);
          }
        }}
        onSignOut={() => syncManager.signOut()}
      />

      {/* Shop Manager Native Engine Containers: always present and active in DOM */}
      <main className="flex-1 transition-all duration-300 pb-28">
        <div className="w">
          <h1 id="hd"></h1>
          <div id="tb"></div>
          <div className="nav" id="nav"></div>
          <div id="pb"></div>
          <div id="main"></div>
        </div>
      </main>

      <div id="ovl"></div>

      {/* Floating Bottom Navigation Bar for Ergonomic One-Thumb Navigation */}
      <BottomNavBar
        currentTab={currentTab}
        lang={lang}
        isEmployee={isEmployee}
        isModalActive={isAnyModalOpen}
        onSelectTab={handleSelectTab}
      />

      {/* Floating Exit Toast Bubble (Lasts 1 second on single back press at root) */}
      <ExitToast visible={exitToastVisible} lang={lang} />

      {/* Double-Back Confirmation Exit Modal */}
      <AppExitModal
        isOpen={isExitModalOpen}
        lang={lang}
        onRestart={() => setIsExitModalOpen(false)}
      />

      {/* Login Gateway / Switch Account Modal */}
      <LoginGatewayModal
        isOpen={isLoginModalOpen || isSwitchAccountOpen}
        lang={lang}
        canDismiss={true}
        onClose={() => {
          setIsLoginModalOpen(false);
          setIsSwitchAccountOpen(false);
        }}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Single-Use QR Code Generation Modal for Owner */}
      {isAuthenticated && qrTarget && (
        <TemporaryQrModal
          isOpen={isQrOpen}
          lang={lang}
          onClose={() => setIsQrOpen(false)}
          targetId={qrTarget.id}
          name={qrTarget.name}
          role={qrTarget.role}
        />
      )}

      {/* Cross-Device Manager Modal */}
      {isAuthenticated && (
        <DeviceManagerModal
          isOpen={isDevicesOpen}
          lang={lang}
          onClose={() => setIsDevicesOpen(false)}
          devices={syncState.connectedDevices}
          currentDeviceId={syncState.deviceId}
        />
      )}

      {/* Cloud Backups Modal */}
      {isAuthenticated && (
        <CloudBackupsModal
          isOpen={isBackupsOpen}
          lang={lang}
          onClose={() => setIsBackupsOpen(false)}
          onRestore={handleRestoreCloudBackup}
        />
      )}

      {/* Source Code & APK Packages Download Modal */}
      <SourceDownloadModal
        isOpen={isDownloadsOpen}
        onClose={() => setIsDownloadsOpen(false)}
        lang={lang}
      />
    </div>
  );
}
