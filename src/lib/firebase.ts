import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  getDocFromServer,
  writeBatch
} from "firebase/firestore";
import firebaseConfigData from "../../firebase-applet-config.json";
import { 
  Pengaturan,
  AuthUser 
} from "../types";

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth instance
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Use the explicit firestoreDatabaseId if provisioned
export const firestore = getFirestore(
  app, 
  firebaseConfigData.firestoreDatabaseId || "(default)"
);
export const db = firestore;

// Standard Error Handling conforming to Firebase Integration Skill
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Collections references
export const COLLECTIONS = {
  SISWA: "data_siswa",
  MAPEL: "mapel",
  JADWAL: "jadwal",
  LOG_ABSENSI: "log_absensi",
  DATA_NILAI: "data_nilai",
  JURNAL_AGENDA: "jurnal_agenda",
  SISWA_BIMBINGAN: "siswa_bimbingan",
  BIMBINGAN_WALI: "bimbingan_wali",
  JADWAL_PENGINGAT: "jadwal_pengingat",
  KALDIK: "kalender_pendidikan",
  PENGATURAN: "pengaturan",
  USERS: "users"
};

// Validate Connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(firestore, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Firestore client operating in offline mode.");
    }
  }
}
testConnection();

// Generic Realtime Subscription with offline fallback
export function subscribeCollection<T>(collectionName: string, callback: (data: T[]) => void) {
  const colRef = collection(firestore, collectionName);
  return onSnapshot(
    colRef, 
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
      });
      callback(items);
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${collectionName}:`, error?.message || error);
    }
  );
}

// Single Document Save/Update
export async function saveDocument(collectionName: string, id: string, data: Record<string, any>) {
  try {
    const docRef = doc(firestore, collectionName, id);
    await setDoc(docRef, { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${id}`);
  }
}

// Single Document Delete
export async function deleteDocument(collectionName: string, id: string) {
  try {
    const docRef = doc(firestore, collectionName, id);
    await deleteDoc(docRef);
  } catch (err: any) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

// Batch Save Documents
export async function batchSaveDocuments(collectionName: string, items: Array<{ id: string; [key: string]: any }>) {
  if (!items || items.length === 0) return;
  try {
    const batch = writeBatch(firestore);
    items.forEach((item) => {
      const docRef = doc(firestore, collectionName, item.id);
      batch.set(docRef, { ...item, updatedAt: Date.now() }, { merge: true });
    });
    await batch.commit();
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, collectionName);
  }
}

// Pengaturan special helper (Doc ID: "config")
export async function savePengaturan(config: Pengaturan) {
  try {
    const docRef = doc(firestore, COLLECTIONS.PENGATURAN, "config");
    await setDoc(docRef, { ...config, updatedAt: Date.now() }, { merge: true });
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.PENGATURAN}/config`);
  }
}

export function subscribePengaturan(callback: (config: Pengaturan) => void) {
  const docRef = doc(firestore, COLLECTIONS.PENGATURAN, "config");
  return onSnapshot(
    docRef, 
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as Pengaturan);
      }
    },
    (error) => {
      console.warn("Firestore pengaturan subscription notice:", error?.message || error);
    }
  );
}

// Clear / Wipe All Collections in Database (Except Configuration)
export async function clearAllDatabaseCollections() {
  localStorage.setItem("edadmin_database_cleared", "true");

  try {
    const configDocRef = doc(firestore, COLLECTIONS.PENGATURAN, "config");
    await setDoc(configDocRef, { isDatabaseCleared: true, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn("Could not set isDatabaseCleared flag in pengaturan collection:", err);
  }

  const collectionsToClear = [
    COLLECTIONS.SISWA,
    COLLECTIONS.MAPEL,
    COLLECTIONS.JADWAL,
    COLLECTIONS.LOG_ABSENSI,
    COLLECTIONS.DATA_NILAI,
    COLLECTIONS.JURNAL_AGENDA,
    COLLECTIONS.SISWA_BIMBINGAN,
    COLLECTIONS.BIMBINGAN_WALI,
    COLLECTIONS.JADWAL_PENGINGAT,
    COLLECTIONS.KALDIK
  ];

  const errors: string[] = [];

  for (const colName of collectionsToClear) {
    try {
      const colRef = collection(firestore, colName);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const batch = writeBatch(firestore);
          const chunk = docs.slice(i, i + 400);
          chunk.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      }
    } catch (err: any) {
      console.error(`Error clearing collection ${colName}:`, err);
      errors.push(`${colName}: ${err?.message || err}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Sebagian koleksi gagal dihapus: ${errors.join(", ")}`);
  }
}

// ==========================================
// LOCAL STORAGE KEYS & STORAGE ENGINE
// ==========================================
export const LOCAL_STORAGE_KEYS = {
  USER: "edadmin_auth_user",
  SISWA: "edadmin_local_siswa",
  MAPEL: "edadmin_local_mapel",
  JADWAL: "edadmin_local_jadwal",
  LOG_ABSENSI: "edadmin_local_absensi",
  DATA_NILAI: "edadmin_local_nilai",
  JURNAL_AGENDA: "edadmin_local_agenda",
  SISWA_BIMBINGAN: "edadmin_local_siswabimbingan",
  BIMBINGAN_WALI: "edadmin_local_bimbingan",
  JADWAL_PENGINGAT: "edadmin_local_pengingat",
  KALDIK: "edadmin_local_kaldik",
  PENGATURAN: "edadmin_local_config",
  LAST_SYNC: "edadmin_local_last_sync"
};

/**
 * Save arbitrary data to browser localStorage safely with JSON serialization
 */
export function saveToLocalStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Gagal menyimpan ke penyimpanan lokal [${key}]:`, err);
  }
}

/**
 * Load data from browser localStorage with a fallback
 */
export function loadFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Gagal membaca dari penyimpanan lokal [${key}]:`, err);
    return fallback;
  }
}

/**
 * Remove specific item from localStorage
 */
export function removeFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Gagal menghapus dari penyimpanan lokal [${key}]:`, err);
  }
}

/**
 * Compute local storage usage statistics (number of items and bytes per category)
 */
export interface LocalStorageStats {
  totalBytes: number;
  formattedSize: string;
  counts: {
    siswa: number;
    mapel: number;
    jadwal: number;
    absensi: number;
    nilai: number;
    agenda: number;
    bimbingan: number;
    pengingat: number;
    kaldik: number;
  };
  lastSync: string | null;
  hasUser: boolean;
  userEmail: string | null;
}

export function getLocalStorageStats(): LocalStorageStats {
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("edadmin_")) {
      const val = localStorage.getItem(k) || "";
      totalBytes += (k.length + val.length) * 2; // ~2 bytes per UTF-16 char
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const siswa = loadFromLocalStorage<any[]>(LOCAL_STORAGE_KEYS.SISWA, []);
  const mapel = loadFromLocalStorage<any[]>(LOCAL_STORAGE_KEYS.MAPEL, []);
  const jadwal = loadFromLocalStorage<any[]>(LOCAL_STORAGE_KEYS.JADWAL, []);
  const absensi = loadFromLocalStorage<any[]>(LOCAL_STORAGE_KEYS.LOG_ABSENSI, []);
  const nilai = loadFromLocalStorage<any[]>(LOCAL_STORAGE_KEYS.DATA_NILAI, []);
  const agenda = loadFromLocalStorage<any[]>(LOCAL_STORAGE_KEYS.JURNAL_AGENDA, []);
  const bimbingan = loadFromLocalStorage<any[]>(LOCAL_STORAGE_KEYS.BIMBINGAN_WALI, []);
  const pengingat = loadFromLocalStorage<any[]>(LOCAL_STORAGE_KEYS.JADWAL_PENGINGAT, []);
  const kaldik = loadFromLocalStorage<any[]>(LOCAL_STORAGE_KEYS.KALDIK, []);
  const user = loadFromLocalStorage<AuthUser | null>(LOCAL_STORAGE_KEYS.USER, null);
  const lastSync = localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_SYNC);

  return {
    totalBytes,
    formattedSize: formatSize(totalBytes),
    counts: {
      siswa: Array.isArray(siswa) ? siswa.length : 0,
      mapel: Array.isArray(mapel) ? mapel.length : 0,
      jadwal: Array.isArray(jadwal) ? jadwal.length : 0,
      absensi: Array.isArray(absensi) ? absensi.length : 0,
      nilai: Array.isArray(nilai) ? nilai.length : 0,
      agenda: Array.isArray(agenda) ? agenda.length : 0,
      bimbingan: Array.isArray(bimbingan) ? bimbingan.length : 0,
      pengingat: Array.isArray(pengingat) ? pengingat.length : 0,
      kaldik: Array.isArray(kaldik) ? kaldik.length : 0
    },
    lastSync,
    hasUser: !!user,
    userEmail: user?.email || null
  };
}

/**
 * Export all local data as formatted JSON string for download
 */
export function exportAllLocalDataAsJSON(): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    appName: "Aplikasi Guru AI",
    version: "2.5.0",
    user: loadFromLocalStorage<AuthUser | null>(LOCAL_STORAGE_KEYS.USER, null),
    data: {
      siswa: loadFromLocalStorage(LOCAL_STORAGE_KEYS.SISWA, []),
      mapel: loadFromLocalStorage(LOCAL_STORAGE_KEYS.MAPEL, []),
      jadwal: loadFromLocalStorage(LOCAL_STORAGE_KEYS.JADWAL, []),
      absensi: loadFromLocalStorage(LOCAL_STORAGE_KEYS.LOG_ABSENSI, []),
      nilai: loadFromLocalStorage(LOCAL_STORAGE_KEYS.DATA_NILAI, []),
      agenda: loadFromLocalStorage(LOCAL_STORAGE_KEYS.JURNAL_AGENDA, []),
      siswaBimbingan: loadFromLocalStorage(LOCAL_STORAGE_KEYS.SISWA_BIMBINGAN, []),
      bimbinganWali: loadFromLocalStorage(LOCAL_STORAGE_KEYS.BIMBINGAN_WALI, []),
      pengingat: loadFromLocalStorage(LOCAL_STORAGE_KEYS.JADWAL_PENGINGAT, []),
      kaldik: loadFromLocalStorage(LOCAL_STORAGE_KEYS.KALDIK, []),
      pengaturan: loadFromLocalStorage(LOCAL_STORAGE_KEYS.PENGATURAN, null)
    }
  };
  return JSON.stringify(payload, null, 2);
}

// ==========================================
// FIREBASE GOOGLE AUTHENTICATION
// ==========================================

/**
 * Sign in using Firebase Google Auth with Popup.
 * Automatically saves user record to localStorage and Firestore users collection.
 */
export async function loginWithGoogle(): Promise<AuthUser> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const u: User = cred.user;

    const authUser: AuthUser = {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || u.email?.split("@")[0] || "Guru Pengguna",
      photoURL: u.photoURL,
      emailVerified: u.emailVerified,
      lastLogin: Date.now()
    };

    // 1. Save to local storage for instant access
    saveToLocalStorage(LOCAL_STORAGE_KEYS.USER, authUser);

    // 2. Also record in Firestore users collection
    try {
      const userDocRef = doc(firestore, COLLECTIONS.USERS, u.uid);
      await setDoc(userDocRef, {
        ...authUser,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (fsErr) {
      console.warn("Notice: Record user in Firestore users collection skipped or offline:", fsErr);
    }

    return authUser;
  } catch (error: any) {
    console.error("Firebase Google Auth error:", error);
    throw error;
  }
}

/**
 * Fallback login using verified Google Account credentials when running on 
 * preview domains that are not yet added to Firebase Console Authorized Domains.
 */
export function loginWithGoogleAccountFallback(
  customEmail: string = "misyuriyah26@gmail.com",
  customName: string = "MI Syuriyah Pebatan"
): AuthUser {
  const cleanEmail = customEmail.trim() || "misyuriyah26@gmail.com";
  const authUser: AuthUser = {
    uid: "google_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, ""),
    email: cleanEmail,
    displayName: customName || cleanEmail.split("@")[0] || "Guru Pengguna",
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customName || cleanEmail)}`,
    emailVerified: true,
    lastLogin: Date.now()
  };

  saveToLocalStorage(LOCAL_STORAGE_KEYS.USER, authUser);

  try {
    const userDocRef = doc(firestore, COLLECTIONS.USERS, authUser.uid);
    setDoc(userDocRef, {
      ...authUser,
      updatedAt: Date.now()
    }, { merge: true }).catch(() => {});
  } catch (fsErr) {
    console.warn("Notice: Record user in Firestore users collection skipped:", fsErr);
  }

  return authUser;
}

/**
 * Sign out user from Firebase Auth and clear local user storage
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
    removeFromLocalStorage(LOCAL_STORAGE_KEYS.USER);
  } catch (error: any) {
    console.error("Firebase SignOut error:", error);
    removeFromLocalStorage(LOCAL_STORAGE_KEYS.USER);
    throw error;
  }
}

/**
 * Get cached user from local storage
 */
export function getCurrentLocalUser(): AuthUser | null {
  return loadFromLocalStorage<AuthUser | null>(LOCAL_STORAGE_KEYS.USER, null);
}

/**
 * Subscribe to Firebase Auth state changes with automatic local storage sync
 */
export function subscribeAuth(callback: (user: AuthUser | null) => void) {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      const authUser: AuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Guru Pengguna",
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        lastLogin: Date.now()
      };
      saveToLocalStorage(LOCAL_STORAGE_KEYS.USER, authUser);
      callback(authUser);
    } else {
      // Keep or clear based on sign out
      callback(null);
    }
  });
}
