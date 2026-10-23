import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDoc, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Suppress internal SDK transport & connection retry logs (e.g. offline token service propagation warnings)
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore in environments where setLogLevel might not be supported
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const isOfflineOrTokenIssue =
    rawMsg.toLowerCase().includes('offline') ||
    rawMsg.toLowerCase().includes('unavailable') ||
    rawMsg.toLowerCase().includes('token-service') ||
    rawMsg.toLowerCase().includes('token') ||
    rawMsg.toLowerCase().includes('securetoken') ||
    rawMsg.toLowerCase().includes('network') ||
    (error as any)?.code === 'unavailable';

  const isPermissionIssue =
    !isOfflineOrTokenIssue &&
    (rawMsg.toLowerCase().includes('permission') || (error as any)?.code === 'permission-denied');

  const errInfo: FirestoreErrorInfo = {
    error: rawMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isPermissionIssue) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.warn(`[Firestore ${operationType} warning on ${path}]:`, rawMsg);
  }
}

// Gentle asynchronous check that does not force server roundtrip or throw uncaught errors
export async function testConnection(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'test', 'connection'));
    return snap.exists();
  } catch (error) {
    return false;
  }
}

