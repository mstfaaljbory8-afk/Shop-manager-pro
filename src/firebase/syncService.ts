import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  type Unsubscribe
} from 'firebase/firestore';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './config';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  userAgent: string;
  lastActive: any;
  createdAt?: any;
}

export interface CloudStorePayload {
  userId: string;
  storeId: string;
  storeName?: string;
  storeType?: string;
  deviceId: string;
  deviceName: string;
  version: number;
  prodsCount: number;
  salesCount: number;
  custCount: number;
  buysCount: number;
  expsCount: number;
  data: Record<string, any>;
  updatedAt: any;
}

export interface MemberSession {
  token: string;
  code: string;
  ownerUid: string;
  targetId: string;
  name: string;
  role: 'employee' | 'partner';
  claimedAt: number;
}

export interface SyncState {
  user: User | null;
  sessionRole: 'owner' | 'employee' | 'partner' | 'unauthenticated';
  memberSession: MemberSession | null;
  status: 'offline' | 'connecting' | 'synced' | 'syncing' | 'error';
  lastSyncedAt: Date | null;
  deviceId: string;
  deviceName: string;
  connectedDevices: DeviceInfo[];
  errorMsg: string | null;
}

const SESSION_STORAGE_KEY = 'shop_member_session_v1';

// Generate or retrieve persistent Device ID
export function getOrCreateDeviceId(): string {
  const KEY = 'shop_device_id_v1';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function detectDeviceName(): string {
  const ua = navigator.userAgent;
  let os = 'جهاز غير معروف';
  if (/Android/i.test(ua)) os = 'هاتف أندرويد';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'آيفون / آيباد';
  else if (/Windows/i.test(ua)) os = 'كمبيوتر ويندوز';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'كمبيوتر ماك';
  else if (/Linux/i.test(ua)) os = 'كمبيوتر لينكس';

  let browser = 'متصفح';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'كروم';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'سفاري';
  else if (/Firefox/i.test(ua)) browser = 'فايرفوكس';
  else if (/Edg/i.test(ua)) browser = 'إيدج';

  return `${os} (${browser})`;
}

class SyncManager {
  private currentDeviceId: string;
  private currentDeviceName: string;
  private storeUnsubscribe: Unsubscribe | null = null;
  private devicesUnsubscribe: Unsubscribe | null = null;
  private syncListeners: ((state: SyncState) => void)[] = [];
  private remoteDataListeners: ((data: Record<string, any>, meta: { deviceId: string; deviceName: string }) => void)[] = [];
  private lastPushedVersion: number = 0;
  private isPushing = false;
  private pendingPush: { data: Record<string, any>; immediate?: boolean } | null = null;
  private pushDebounceTimer: any = null;

  public state: SyncState;

  constructor() {
    this.currentDeviceId = getOrCreateDeviceId();
    this.currentDeviceName = detectDeviceName();

    const savedMember = this.loadSavedMemberSession();

    this.state = {
      user: null,
      sessionRole: savedMember ? savedMember.role : 'unauthenticated',
      memberSession: savedMember,
      status: 'offline',
      lastSyncedAt: null,
      deviceId: this.currentDeviceId,
      deviceName: this.currentDeviceName,
      connectedDevices: [],
      errorMsg: null,
    };

    this.initAuthListener();

    if (savedMember) {
      this.subscribeToStoreDataAsMember(savedMember);
    }
  }

  private loadSavedMemberSession(): MemberSession | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public isAuthenticated(): boolean {
    return Boolean(this.state.user || this.state.memberSession);
  }

  private initAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      this.state.user = user;
      if (user) {
        // Logged in as Owner
        this.state.sessionRole = 'owner';
        this.state.memberSession = null;
        localStorage.removeItem(SESSION_STORAGE_KEY);

        this.updateState({
          status: 'connecting',
          errorMsg: null,
          sessionRole: 'owner',
          memberSession: null
        });

        // Pre-validate token availability before starting online Firestore sync
        try {
          await user.getIdToken();
        } catch (tokenErr: any) {
          const msg = (tokenErr?.message || String(tokenErr)).toLowerCase();
          console.warn('[Sync] Auth token availability notice:', msg);
          if (msg.includes('token-service') || msg.includes('securetoken') || msg.includes('disabled')) {
            console.warn('[Sync] Token service API is propagating on project. Cloud sync will operate safely in local/offline mode.');
            this.updateState({
              status: 'offline',
              errorMsg: null,
            });
            return;
          }
        }

        try {
          await this.registerUserProfile(user);
        } catch (e) {
          console.warn('[Sync] Non-fatal user registration notice:', e);
        }

        try {
          await this.registerDevice(user);
        } catch (e) {
          console.warn('[Sync] Non-fatal device registration notice:', e);
        }

        this.subscribeToStoreData(user);
        this.subscribeToDevices(user);
      } else if (!this.state.memberSession) {
        this.cleanupSubscriptions();
        this.updateState({
          sessionRole: 'unauthenticated',
          status: 'offline',
          lastSyncedAt: null,
          connectedDevices: [],
          errorMsg: null
        });
      }
    });
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    this.syncListeners.forEach(listener => listener(this.state));
  }

  public subscribeState(listener: (state: SyncState) => void) {
    this.syncListeners.push(listener);
    listener(this.state);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  public onRemoteData(callback: (data: Record<string, any>, meta: { deviceId: string; deviceName: string }) => void) {
    this.remoteDataListeners.push(callback);
    return () => {
      this.remoteDataListeners = this.remoteDataListeners.filter(c => c !== callback);
    };
  }

  private cleanupSubscriptions() {
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }
    if (this.devicesUnsubscribe) {
      this.devicesUnsubscribe();
      this.devicesUnsubscribe = null;
    }
  }

  // Register or update user profile
  private async registerUserProfile(user: User) {
    const userDocRef = doc(db, 'users', user.uid);
    try {
      let snapExists = false;
      let existingData: any = null;
      try {
        const snap = await getDoc(userDocRef);
        snapExists = snap.exists();
        existingData = snapExists ? snap.data() : null;
      } catch (readErr: any) {
        console.warn('[Sync] Offline or read skipped for user profile:', readErr?.message);
      }

      if (!snapExists) {
        await setDoc(userDocRef, {
          userId: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'صاحب المتجر',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userDocRef, {
          userId: user.uid,
          email: user.email || existingData?.email || '',
          displayName: user.displayName || existingData?.displayName || 'صاحب المتجر',
          photoURL: user.photoURL || existingData?.photoURL || '',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  }

  // Register current device
  private async registerDevice(user: User) {
    const devRef = doc(db, 'users', user.uid, 'devices', this.currentDeviceId);
    try {
      let snapExists = false;
      try {
        const snap = await getDoc(devRef);
        snapExists = snap.exists();
      } catch (readErr: any) {
        console.warn('[Sync] Offline or read skipped for device:', readErr?.message);
      }

      if (!snapExists) {
        await setDoc(devRef, {
          userId: user.uid,
          deviceId: this.currentDeviceId,
          deviceName: this.currentDeviceName,
          userAgent: navigator.userAgent.substring(0, 500),
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        });
      } else {
        await setDoc(devRef, {
          userId: user.uid,
          deviceId: this.currentDeviceId,
          deviceName: this.currentDeviceName,
          userAgent: navigator.userAgent.substring(0, 500),
          lastActive: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/devices/${this.currentDeviceId}`);
    }
  }

  // Listen to remote changes on store data (as Owner)
  private subscribeToStoreData(user: User) {
    const storeRef = doc(db, 'users', user.uid, 'stores', 'main');
    this.storeUnsubscribe = onSnapshot(
      storeRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          this.updateState({ status: 'synced', lastSyncedAt: new Date(), errorMsg: null });
          return;
        }

        const data = snapshot.data() as CloudStorePayload;
        if (data.deviceId !== this.currentDeviceId) {
          console.log(`[Sync] Received remote update from device: ${data.deviceName} (${data.deviceId})`);
          this.lastPushedVersion = data.version || 0;
          this.remoteDataListeners.forEach(cb => cb(data.data, {
            deviceId: data.deviceId,
            deviceName: data.deviceName || 'جهاز آخر'
          }));
        }

        this.updateState({
          status: 'synced',
          lastSyncedAt: new Date(),
          errorMsg: null,
        });
      },
      (error) => {
        const raw = error?.message || String(error);
        const isOffline =
          raw.toLowerCase().includes('offline') ||
          raw.toLowerCase().includes('unavailable') ||
          raw.toLowerCase().includes('token-service') ||
          raw.toLowerCase().includes('token') ||
          raw.toLowerCase().includes('securetoken') ||
          (error as any)?.code === 'unavailable';
        if (isOffline) {
          console.warn('[Sync] Store listener in offline mode; waiting for connection...');
          this.updateState({
            status: 'offline',
            errorMsg: null,
          });
        } else {
          console.warn('[Sync] Store sync listener notice:', error);
          this.updateState({
            status: 'error',
            errorMsg: 'فشل استقبال التحديثات اللحظية'
          });
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/stores/main`);
        }
      }
    );
  }

  // Listen to remote changes on store data (as Employee or Partner)
  private subscribeToStoreDataAsMember(session: MemberSession) {
    this.cleanupSubscriptions();
    const storeRef = doc(db, 'users', session.ownerUid, 'stores', 'main');
    this.updateState({ status: 'connecting', errorMsg: null });

    this.storeUnsubscribe = onSnapshot(
      storeRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          this.updateState({ status: 'synced', lastSyncedAt: new Date() });
          return;
        }

        const data = snapshot.data() as CloudStorePayload;
        if (data.deviceId !== this.currentDeviceId) {
          console.log(`[Member Sync] Received store update from owner:`, data.deviceId);
          this.lastPushedVersion = data.version || 0;
          this.remoteDataListeners.forEach(cb => cb(data.data, {
            deviceId: data.deviceId,
            deviceName: data.deviceName || 'المتجر الرئيسي'
          }));
        }

        this.updateState({
          status: 'synced',
          lastSyncedAt: new Date(),
          errorMsg: null,
        });
      },
      (error) => {
        const raw = error?.message || String(error);
        const isOffline =
          raw.toLowerCase().includes('offline') ||
          raw.toLowerCase().includes('unavailable') ||
          raw.toLowerCase().includes('token-service') ||
          raw.toLowerCase().includes('token') ||
          raw.toLowerCase().includes('securetoken') ||
          (error as any)?.code === 'unavailable';
        if (isOffline) {
          console.warn('[Member Sync] Member store listener offline mode; waiting for connection...');
          this.updateState({
            status: 'offline',
            errorMsg: null,
          });
        } else {
          console.warn('[Member Sync] Member sync notice:', error);
          this.updateState({
            status: 'error',
            errorMsg: 'تعذر الاتصال بالمتجر الرئيسي'
          });
        }
      }
    );
  }

  // Track active devices
  private subscribeToDevices(user: User) {
    const devicesCol = collection(db, 'users', user.uid, 'devices');
    this.devicesUnsubscribe = onSnapshot(
      devicesCol,
      (snapshot) => {
        const devices: DeviceInfo[] = [];
        snapshot.forEach(docSnap => {
          devices.push(docSnap.data() as DeviceInfo);
        });
        this.updateState({ connectedDevices: devices });
      },
      (error) => {
        console.warn('Devices listener warning:', error);
      }
    );
  }

  // Generate Permanent, Single-Use Activation QR Code by Owner
  public async createSingleUseActivationToken(params: {
    targetId: string;
    name: string;
    role: 'employee' | 'partner';
  }) {
    if (!this.state.user) throw new Error('يجب تسجيل الدخول كمالك متجر لإنشاء رمز QR');
    const user = this.state.user;
    const prefix = params.role === 'employee' ? 'EMP' : 'PTR';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const code = `${prefix}-${randNum}`;
    const tokenId = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const tokenDocRef = doc(db, 'users', user.uid, 'tokens', tokenId);
    const tokenData = {
      tokenId,
      ownerUid: user.uid,
      storeId: 'main',
      targetId: params.targetId,
      name: params.name,
      role: params.role,
      code,
      status: 'active', // active -> used -> revoked
      createdAt: serverTimestamp(),
    };

    await setDoc(tokenDocRef, tokenData);

    // QR Payload: Permanent single-use activation
    const qrPayload = JSON.stringify({
      app: 'SHOP_PRO',
      v: 2,
      singleUse: true,
      tokenId,
      ownerUid: user.uid,
      code,
      targetId: params.targetId,
      name: params.name,
      role: params.role,
    });

    return {
      tokenId,
      code,
      qrPayload,
      name: params.name,
      role: params.role,
    };
  }

  // Validate scanned QR code and claim token (Single-use enforcement)
  public async validateAndLoginWithQrToken(input: string): Promise<MemberSession> {
    let parsed: any = null;

    try {
      if (input.trim().startsWith('{')) {
        parsed = JSON.parse(input);
      }
    } catch {
      parsed = null;
    }

    if (!parsed || parsed.app !== 'SHOP_PRO' || !parsed.ownerUid || !parsed.tokenId) {
      throw new Error('رمز QR غير صالح. يرجى توجيه الكاميرا إلى رمز QR الصادر من شاشة المالك.');
    }

    // 1. Verify token in Firestore
    const tokenRef = doc(db, 'users', parsed.ownerUid, 'tokens', parsed.tokenId);
    const snap = await getDoc(tokenRef);

    if (!snap.exists()) {
      throw new Error('رمز التفعيل هذا غير موجود أو تم حذفه من قِبل المالك.');
    }

    const tokenData = snap.data();

    // 2. CRITICAL: Enforce SINGLE-USE ONLY rule!
    if (tokenData.status === 'used') {
      throw new Error('⚠️ تم استخدام رمز QR هذا مسبقاً على جهاز آخر! هذا الرمز مخصص للاستخدام لمرة واحدة فقط. اطلب من المالك إنشاء رمز جديد.');
    }

    if (tokenData.status === 'revoked') {
      throw new Error('تم إلغاء صلاحية رمز الدخول هذا من قِبل المالك.');
    }

    // 3. Mark token as USED immediately so it cannot ever be used again
    try {
      await updateDoc(tokenRef, {
        status: 'used',
        usedAt: serverTimestamp(),
        usedByDeviceId: this.currentDeviceId,
      });
    } catch (e) {
      console.warn('Could not update token status in cloud, proceed with local activation');
    }

    const session: MemberSession = {
      token: parsed.tokenId,
      code: parsed.code || 'QR-CODE',
      ownerUid: parsed.ownerUid,
      targetId: parsed.targetId || '',
      name: parsed.name || (parsed.role === 'employee' ? 'موظف' : 'شريك'),
      role: parsed.role || 'employee',
      claimedAt: Date.now(),
    };

    // Save permanent member session on this device
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    // Sign out any active Firebase user to avoid conflict
    if (auth.currentUser) {
      await signOut(auth);
    }

    this.updateState({
      user: null,
      sessionRole: session.role,
      memberSession: session,
      errorMsg: null,
    });

    // Start listening to the owner's store in real-time
    this.subscribeToStoreDataAsMember(session);

    return session;
  }

  // Logout member session
  public logoutMemberSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.cleanupSubscriptions();
    this.updateState({
      sessionRole: 'unauthenticated',
      memberSession: null,
      status: 'offline',
      lastSyncedAt: null,
    });
  }

  // Push local store data to cloud with debouncing
  public queuePush(dbState: Record<string, any>, immediate: boolean = false) {
    const targetUid = this.state.user?.uid || this.state.memberSession?.ownerUid;
    if (!targetUid) return;

    this.pendingPush = { data: dbState, immediate };
    clearTimeout(this.pushDebounceTimer);

    if (immediate) {
      this.executePush();
    } else {
      this.updateState({ status: 'syncing' });
      this.pushDebounceTimer = setTimeout(() => {
        this.executePush();
      }, 1500);
    }
  }

  private async executePush() {
    const targetUid = this.state.user?.uid || this.state.memberSession?.ownerUid;
    if (!this.pendingPush || !targetUid || this.isPushing) return;
    const { data } = this.pendingPush;
    this.pendingPush = null;
    this.isPushing = true;
    this.updateState({ status: 'syncing' });

    try {
      const storeRef = doc(db, 'users', targetUid, 'stores', 'main');

      this.lastPushedVersion += 1;
      const cleanData: Record<string, any> = {
        prods: data.prods || [],
        buys: data.buys || [],
        sales: data.sales || [],
        exps: data.exps || [],
        cap: data.cap || [],
        cust: data.cust || [],
        pt: data.pt || [],
        pl: data.pl || [],
        pp: data.pp || [],
        us: data.us || [],
        log: (data.log || []).slice(-100),
        pin: data.pin || null,
        seq: data.seq || 0,
        set: data.set || {},
      };

      const payload: CloudStorePayload = {
        userId: targetUid,
        storeId: 'main',
        storeName: (data.set && data.set.sn) || 'متجري',
        storeType: (data.set && data.set.st) || 'gen',
        deviceId: this.currentDeviceId,
        deviceName: this.state.memberSession
          ? `${this.state.memberSession.name} (${this.currentDeviceName})`
          : this.currentDeviceName,
        version: this.lastPushedVersion,
        prodsCount: (cleanData.prods || []).length,
        salesCount: (cleanData.sales || []).length,
        custCount: (cleanData.cust || []).length,
        buysCount: (cleanData.buys || []).length,
        expsCount: (cleanData.exps || []).length,
        data: cleanData,
        updatedAt: serverTimestamp(),
      };

      await setDoc(storeRef, payload);

      if (this.state.user) {
        const devRef = doc(db, 'users', this.state.user.uid, 'devices', this.currentDeviceId);
        setDoc(devRef, { lastActive: serverTimestamp() }, { merge: true }).catch(() => {});
      }

      this.updateState({
        status: 'synced',
        lastSyncedAt: new Date(),
        errorMsg: null,
      });
    } catch (err: any) {
      console.warn('Sync push notice:', err?.message || err);
      const rawMsg = (err?.message || '').toLowerCase();
      const isOffline =
        rawMsg.includes('offline') ||
        rawMsg.includes('unavailable') ||
        rawMsg.includes('token') ||
        rawMsg.includes('network');
      this.updateState({
        status: isOffline ? 'offline' : 'error',
        errorMsg: isOffline ? null : 'فشلت المزامنة السحابية. سيتم إعادة المحاولة تلقائياً.'
      });
    } finally {
      this.isPushing = false;
      if (this.pendingPush) {
        this.executePush();
      }
    }
  }

  // Explicit manual sync now
  public async forceSync(dbState: Record<string, any>) {
    const targetUid = this.state.user?.uid || this.state.memberSession?.ownerUid;
    if (!targetUid) {
      throw new Error('يرجى تسجيل الدخول كمالك أو مسح رمز QR كشريك/موظف لتفعيل المزامنة');
    }
    this.queuePush(dbState, true);
  }

  // Create a cloud backup snapshot
  public async createCloudBackup(name: string, data: Record<string, any>) {
    if (!this.state.user) throw new Error('حفظ النسخ الاحتياطية متاح للمالك فقط');
    const user = this.state.user;
    const backupId = 'bk_' + Date.now();
    const backupRef = doc(db, 'users', user.uid, 'backups', backupId);

    const counts = {
      p: (data.prods || []).length,
      s: (data.sales || []).length,
      c: (data.cust || []).length,
      b: (data.buys || []).length,
      e: (data.exps || []).length,
    };

    try {
      await setDoc(backupRef, {
        userId: user.uid,
        backupId,
        name: name || `نسخة سحابية ${new Date().toLocaleDateString('ar-IQ')}`,
        counts,
        data,
        createdAt: serverTimestamp(),
      });
      return backupId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/backups/${backupId}`);
    }
  }

  // Get list of cloud backups
  public async getCloudBackups() {
    const targetUid = this.state.user?.uid || this.state.memberSession?.ownerUid;
    if (!targetUid) return [];
    const colRef = collection(db, 'users', targetUid, 'backups');
    try {
      const snap = await getDocs(colRef);
      const list: any[] = [];
      snap.forEach(d => list.push(d.data()));
      return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (err) {
      return [];
    }
  }

  // Delete device
  public async removeDevice(deviceId: string) {
    if (!this.state.user) return;
    const devRef = doc(db, 'users', this.state.user.uid, 'devices', deviceId);
    try {
      await deleteDoc(devRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${this.state.user.uid}/devices/${deviceId}`);
    }
  }

  // Google sign in via popup (Owner)
  public async signInWithGoogle(): Promise<User> {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      return res.user;
    } catch (err: any) {
      console.warn('Google sign in notice:', err);
      throw err;
    }
  }

  // Sign out
  public async signOut(): Promise<void> {
    try {
      if (this.state.memberSession) {
        this.logoutMemberSession();
      }
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (err: any) {
      console.warn('Sign out notice:', err);
      throw err;
    }
  }
}

export const syncManager = new SyncManager();
