import { 
  SEED_PRODUCTS, 
  SEED_CLIENTS, 
  SEED_SUPPLIERS, 
  SEED_SERVICES, 
  SEED_COMPANY, 
  SEED_STORE_SETTINGS,
  SEED_USERS 
} from './localDataSeed';

// -------------------------------------------------------------
// EVENT EMITTER FOR REAL-TIME REACTIVITY
// -------------------------------------------------------------
type Listener = () => void;
const listeners: Record<string, Set<Listener>> = {};

function notifyCollection(colName: string) {
  if (listeners[colName]) {
    listeners[colName].forEach(cb => {
      try { cb(); } catch (e) { console.error("Error in snapshot callback", e); }
    });
  }
  if (listeners['*']) {
    listeners['*'].forEach(cb => {
      try { cb(); } catch (e) { console.error("Error in snapshot callback", e); }
    });
  }
}

// -------------------------------------------------------------
// IN-MEMORY & LOCALSTORAGE PERSISTENCE ENGINE
// -------------------------------------------------------------
const STORAGE_PREFIX = 'varejopro_db_';
const inMemoryCache: Record<string, string> = {};

export function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return inMemoryCache[key] || null;
}

export function safeSetItem(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
      return;
    }
  } catch {}
  inMemoryCache[key] = val;
}

export function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
  } catch {}
  delete inMemoryCache[key];
}

export function getCollectionData(colName: string): Record<string, any> {
  try {
    const raw = safeGetItem(STORAGE_PREFIX + colName);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not read from storage for", colName, e);
  }
  
  const initial = getSeedForCollection(colName);
  saveCollectionData(colName, initial);
  return initial;
}

export function saveCollectionData(colName: string, data: Record<string, any>) {
  try {
    safeSetItem(STORAGE_PREFIX + colName, JSON.stringify(data));
  } catch (e) {
    console.warn("Could not write to storage for", colName, e);
  }
  notifyCollection(colName);
}

function getSeedForCollection(colName: string): Record<string, any> {
  const result: Record<string, any> = {};
  if (colName === 'products') {
    SEED_PRODUCTS.forEach(p => { result[p.id] = p; });
  } else if (colName === 'clients') {
    SEED_CLIENTS.forEach(c => { result[c.id] = c; });
  } else if (colName === 'suppliers') {
    SEED_SUPPLIERS.forEach(s => { result[s.id] = s; });
  } else if (colName === 'services') {
    SEED_SERVICES.forEach(s => { result[s.id] = s; });
  } else if (colName === 'platform_companies') {
    result[SEED_COMPANY.id] = SEED_COMPANY;
  } else if (colName === 'settings') {
    result['init'] = { initialized: true, timestamp: new Date().toISOString() };
    result['store_empresa_principal'] = SEED_STORE_SETTINGS;
  } else if (colName === 'users') {
    Object.values(SEED_USERS).forEach(u => { result[u.uid] = u; });
  } else if (colName === 'pulse_tokens') {
    result['DEMO99'] = {
      token: 'DEMO99',
      companyId: 'empresa_principal',
      storeName: 'VarejoPro Supermercados & Conveniência',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      status: 'ACTIVE'
    };
  }
  return result;
}

// -------------------------------------------------------------
// FIRESTORE COMPATIBLE INTERFACES & FUNCTIONS
// -------------------------------------------------------------

export class LocalDocRef {
  constructor(public collectionName: string, public id: string) {}
}

export class LocalColRef {
  constructor(public collectionName: string) {}
}

export class LocalQuery {
  constructor(
    public colRef: LocalColRef,
    public constraints: Array<{ type: string; field?: string; op?: string; value?: any; dir?: string; count?: number }> = []
  ) {}
}

export function collection(dbOrCol: any, collectionName?: string): LocalColRef {
  if (typeof dbOrCol === 'string') return new LocalColRef(dbOrCol);
  if (collectionName) return new LocalColRef(collectionName);
  return new LocalColRef(dbOrCol?.collectionName || 'default');
}

export function doc(dbOrColOrDoc: any, colOrId?: string, maybeId?: string): LocalDocRef {
  if (maybeId && colOrId) {
    return new LocalDocRef(colOrId, maybeId);
  }
  if (dbOrColOrDoc instanceof LocalColRef && colOrId) {
    return new LocalDocRef(dbOrColOrDoc.collectionName, colOrId);
  }
  if (typeof dbOrColOrDoc === 'string' && colOrId) {
    return new LocalDocRef(dbOrColOrDoc, colOrId);
  }
  if (colOrId && maybeId === undefined) {
    if (typeof dbOrColOrDoc === 'object' && dbOrColOrDoc?.collectionName) {
      return new LocalDocRef(dbOrColOrDoc.collectionName, colOrId);
    }
  }
  const randomId = 'doc_' + Math.random().toString(36).substring(2, 11);
  const colName = typeof dbOrColOrDoc === 'string' ? dbOrColOrDoc : (dbOrColOrDoc?.collectionName || 'default');
  return new LocalDocRef(colName, colOrId || randomId);
}

export function query(colRef: LocalColRef, ...constraints: any[]): LocalQuery {
  return new LocalQuery(colRef, constraints.filter(Boolean));
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, dir };
}

export function limit(count: number) {
  return { type: 'limit', count };
}

function evaluateFilter(item: any, c: { type: string; field?: string; op?: string; value?: any }): boolean {
  if (c.type !== 'where' || !c.field) return true;
  const val = item[c.field];
  switch (c.op) {
    case '==': return val === c.value;
    case '!=': return val !== c.value;
    case '>': return val > c.value;
    case '>=': return val >= c.value;
    case '<': return val < c.value;
    case '<=': return val <= c.value;
    case 'array-contains': return Array.isArray(val) && val.includes(c.value);
    case 'in': return Array.isArray(c.value) && c.value.includes(val);
    default: return true;
  }
}

export async function getDoc(docRef: LocalDocRef) {
  const col = getCollectionData(docRef.collectionName);
  const data = col[docRef.id];
  return {
    id: docRef.id,
    ref: docRef,
    exists: () => !!data,
    data: () => (data ? { ...data, id: docRef.id } : undefined)
  };
}

export async function getDocFromServer(docRef: LocalDocRef) {
  return getDoc(docRef);
}

export async function getDocs(q: LocalQuery | LocalColRef) {
  const colName = q instanceof LocalQuery ? q.colRef.collectionName : q.collectionName;
  const col = getCollectionData(colName);
  let items = Object.entries(col).map(([id, val]) => ({ id, ...val }));

  if (q instanceof LocalQuery) {
    for (const c of q.constraints) {
      if (c.type === 'where') {
        items = items.filter(item => evaluateFilter(item, c));
      }
    }
    for (const c of q.constraints) {
      if (c.type === 'orderBy' && c.field) {
        items.sort((a, b) => {
          const va = a[c.field!];
          const vb = b[c.field!];
          if (va < vb) return c.dir === 'desc' ? 1 : -1;
          if (va > vb) return c.dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
    }
    for (const c of q.constraints) {
      if (c.type === 'limit' && typeof c.count === 'number') {
        items = items.slice(0, c.count);
      }
    }
  }

  const docs = items.map(item => ({
    id: item.id,
    ref: new LocalDocRef(colName, item.id),
    exists: () => true,
    data: () => item
  }));

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (cb: (doc: any) => void) => docs.forEach(cb)
  };
}

export async function setDoc(docRef: LocalDocRef, data: any, options?: { merge?: boolean }) {
  const col = getCollectionData(docRef.collectionName);
  const existing = col[docRef.id] || {};
  const merged = options?.merge ? { ...existing, ...data } : data;
  col[docRef.id] = { ...merged, id: docRef.id };
  saveCollectionData(docRef.collectionName, col);
}

export async function addDoc(colRef: LocalColRef, data: any) {
  const id = 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  const docRef = new LocalDocRef(colRef.collectionName, id);
  await setDoc(docRef, { ...data, id });
  return docRef;
}

export async function updateDoc(docRef: LocalDocRef, data: any) {
  return setDoc(docRef, data, { merge: true });
}

export async function deleteDoc(docRef: LocalDocRef) {
  const col = getCollectionData(docRef.collectionName);
  delete col[docRef.id];
  saveCollectionData(docRef.collectionName, col);
}

export function writeBatch(_db?: any) {
  const operations: Array<() => Promise<void>> = [];
  return {
    set(docRef: LocalDocRef, data: any, options?: any) {
      operations.push(() => setDoc(docRef, data, options));
    },
    update(docRef: LocalDocRef, data: any) {
      operations.push(() => updateDoc(docRef, data));
    },
    delete(docRef: LocalDocRef) {
      operations.push(() => deleteDoc(docRef));
    },
    async commit() {
      for (const op of operations) {
        await op();
      }
    }
  };
}

export async function runTransaction(_db: any, updateFunction: (transaction: any) => Promise<any>) {
  const tx = {
    get: async (docRef: LocalDocRef) => getDoc(docRef),
    set: (docRef: LocalDocRef, data: any, options?: any) => setDoc(docRef, data, options),
    update: (docRef: LocalDocRef, data: any) => updateDoc(docRef, data),
    delete: (docRef: LocalDocRef) => deleteDoc(docRef)
  };
  return updateFunction(tx);
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export function increment(val: number) {
  return val;
}

export function arrayUnion(...elements: any[]) {
  return elements;
}

export function arrayRemove(..._elements: any[]) {
  return [];
}

export function onSnapshot(
  target: LocalQuery | LocalColRef | LocalDocRef,
  onNext: (snapshot: any) => void,
  onError?: (err: any) => void
) {
  const colName = target instanceof LocalDocRef 
    ? target.collectionName 
    : target instanceof LocalQuery 
    ? target.colRef.collectionName 
    : target.collectionName;

  const runQuery = async () => {
    try {
      if (target instanceof LocalDocRef) {
        const snap = await getDoc(target);
        onNext(snap);
      } else {
        const snap = await getDocs(target as any);
        onNext(snap);
      }
    } catch (e) {
      if (onError) onError(e);
      else console.error("onSnapshot error:", e);
    }
  };

  runQuery();

  if (!listeners[colName]) {
    listeners[colName] = new Set();
  }
  listeners[colName].add(runQuery);

  return () => {
    if (listeners[colName]) {
      listeners[colName].delete(runQuery);
    }
  };
}

// -------------------------------------------------------------
// APP INITIALIZATION MOCK
// -------------------------------------------------------------
export function initializeApp(_config?: any) {
  return { name: '[DEFAULT]' };
}

export function getApps() {
  return [{ name: '[DEFAULT]' }];
}

export function getApp() {
  return { name: '[DEFAULT]' };
}

export function getFirestore(_app?: any, _dbId?: string) {
  return { type: 'local_reactive_store' };
}

export function initializeFirestore(_app?: any, _settings?: any, _dbId?: string) {
  return { type: 'local_reactive_store' };
}

export function persistentLocalCache(_opts?: any) { return {}; }
export function persistentMultipleTabManager() { return {}; }

// -------------------------------------------------------------
// LOCAL AUTHENTICATION EMULATOR
// -------------------------------------------------------------

export interface LocalUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
  getIdToken: () => Promise<string>;
}

class LocalAuthService {
  public currentUser: LocalUser | null = null;
  private authListeners = new Set<(user: LocalUser | null) => void>();

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    try {
      const stored = safeGetItem('varejopro_auth_session');
      if (stored) {
        const userObj = JSON.parse(stored);
        this.currentUser = {
          ...userObj,
          getIdToken: async () => localStorage.getItem('varejopro_auth_token') || 'mock_token_' + userObj.uid
        };
      } else {
        const defaultAdmin = SEED_USERS['user_admin_01'];
        this.setCurrentUser({
          uid: defaultAdmin.uid,
          email: defaultAdmin.email,
          displayName: defaultAdmin.name,
          isAnonymous: false,
          getIdToken: async () => localStorage.getItem('varejopro_auth_token') || 'mock_token_' + defaultAdmin.uid
        });
      }
    } catch {
      this.currentUser = null;
    }
  }

  public setCurrentUser(user: LocalUser | null) {
    this.currentUser = user;
    if (user) {
      safeSetItem('varejopro_auth_session', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isAnonymous: user.isAnonymous
      }));
    } else {
      safeRemoveItem('varejopro_auth_session');
    }
    this.authListeners.forEach(cb => cb(this.currentUser));
  }

  public onAuthStateChanged(callback: (user: LocalUser | null) => void) {
    callback(this.currentUser);
    this.authListeners.add(callback);
    return () => {
      this.authListeners.delete(callback);
    };
  }

  public async signInWithEmailAndPassword(email: string, _pass: string) {
    const cleanEmail = email.trim().toLowerCase();
    const users = getCollectionData('users');
    const existing = Object.values(users).find((u: any) => u.email?.toLowerCase() === cleanEmail) as any;

    const uid = existing ? existing.uid : 'user_' + Math.random().toString(36).substring(2, 9);
    const displayName = existing ? existing.name : cleanEmail.split('@')[0];
    
    const user: LocalUser = {
      uid,
      email: cleanEmail,
      displayName,
      isAnonymous: false,
      getIdToken: async () => localStorage.getItem('varejopro_auth_token') || localStorage.getItem('varejopro_auth_token') || 'mock_token_' + uid
    };

    if (!existing) {
      const newProfile = {
        uid,
        email: cleanEmail,
        name: displayName,
        role: 'admin',
        companyId: 'empresa_principal',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      users[uid] = newProfile;
      saveCollectionData('users', users);
    }

    this.setCurrentUser(user);
    return { user };
  }

  public async createUserWithEmailAndPassword(email: string, _pass: string) {
    return this.signInWithEmailAndPassword(email, _pass);
  }

  public async signInWithPopup(_provider?: any) {
    const googleUser: LocalUser = {
      uid: 'user_admin_01',
      email: 'audtrilha@gmail.com',
      displayName: 'Aud Trilha (Super Admin)',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      isAnonymous: false,
      getIdToken: async () => localStorage.getItem('varejopro_auth_token') || 'mock_token_user_admin_01'
    };

    const users = getCollectionData('users');
    if (!users['user_admin_01']) {
      users['user_admin_01'] = SEED_USERS['user_admin_01'];
      saveCollectionData('users', users);
    }

    this.setCurrentUser(googleUser);
    return { 
      user: googleUser,
      credential: { accessToken: 'mock_access_token' }
    };
  }

  public async signInAnonymously() {
    const uid = 'anon_' + Math.random().toString(36).substring(2, 9);
    const anonUser: LocalUser = {
      uid,
      email: 'demo@varejopro.com',
      displayName: 'Operador Sandbox Demo',
      isAnonymous: true,
      getIdToken: async () => localStorage.getItem('varejopro_auth_token') || 'mock_token_' + uid
    };
    this.setCurrentUser(anonUser);
    return { user: anonUser };
  }

  public async signOut() {
    this.setCurrentUser(null);
  }

  public async updateProfile(user: LocalUser, profile: { displayName?: string; photoURL?: string }) {
    if (this.currentUser && this.currentUser.uid === user.uid) {
      this.currentUser.displayName = profile.displayName || this.currentUser.displayName;
      this.currentUser.photoURL = profile.photoURL || this.currentUser.photoURL;
      this.setCurrentUser({ ...this.currentUser });
    }
  }

  public async sendPasswordResetEmail(_email: string) {
    return true;
  }

  public async sendEmailVerification(_user: any) {
    return true;
  }

  public async updatePassword(_user: any, _newPass: string) {
    return true;
  }
}

export const localAuthInstance = new LocalAuthService();

export function getAuth(_app?: any) {
  return localAuthInstance;
}

export function onAuthStateChanged(auth: any, callback: (user: any) => void) {
  return (auth || localAuthInstance).onAuthStateChanged(callback);
}

export async function signInWithEmailAndPassword(auth: any, email: string, pass: string) {
  return (auth || localAuthInstance).signInWithEmailAndPassword(email, pass);
}

export async function createUserWithEmailAndPassword(auth: any, email: string, pass: string) {
  return (auth || localAuthInstance).createUserWithEmailAndPassword(email, pass);
}

export async function signInWithPopup(auth: any, provider?: any) {
  return (auth || localAuthInstance).signInWithPopup(provider);
}

export async function signInAnonymously(auth: any) {
  return (auth || localAuthInstance).signInAnonymously();
}

export async function signOut(auth: any) {
  return (auth || localAuthInstance).signOut();
}

export async function updateProfile(user: any, profile: any) {
  return localAuthInstance.updateProfile(user, profile);
}

export async function sendPasswordResetEmail(auth: any, email: string) {
  return (auth || localAuthInstance).sendPasswordResetEmail(email);
}

export async function sendEmailVerification(user: any) {
  return localAuthInstance.sendEmailVerification(user);
}

export async function updatePassword(user: any, newPass: string) {
  return localAuthInstance.updatePassword(user, newPass);
}

export class GoogleAuthProvider {
  static credentialFromResult(_result: any) {
    return { accessToken: 'mock_google_token' };
  }
}

// -------------------------------------------------------------
// LOCAL STORAGE SIMULATOR
// -------------------------------------------------------------

export function getStorage(_app?: any) {
  return {};
}

export function ref(_storage: any, path: string) {
  return { path };
}

export function uploadBytes(storageRef: any, file: Blob | File) {
  return uploadBytesResumable(storageRef, file);
}

export function uploadBytesResumable(storageRef: any, file: Blob | File) {
  const promise = new Promise<{ downloadURL: string }>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string || '';
      try {
        localStorage.setItem(`storage_${storageRef.path}`, url);
      } catch (err) {
        console.warn("Failed to store file in localStorage:", err);
      }
      resolve({ downloadURL: url });
    };
    reader.readAsDataURL(file);
  });

  return {
    on: (
      _event: string,
      _onProgress: (snap: any) => void,
      _onError: (err: any) => void,
      onComplete: () => void
    ) => {
      promise.then(() => {
        onComplete();
      });
    },
    snapshot: {
      ref: storageRef
    },
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise)
  };
}

export async function getDownloadURL(storageRef: any): Promise<string> {
  const stored = localStorage.getItem(`storage_${storageRef.path}`);
  if (stored) return stored;
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=300&fit=crop';
}

export const db: any = {
  type: 'local_reactive_store',
  name: 'VarejoPro LocalDB'
};
export const auth: any = localAuthInstance;
export const storage: any = {};
export type User = LocalUser;
