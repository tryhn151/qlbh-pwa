// ===== FIREBASE CONFIG & INITIALIZATION =====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js';
import {
    getFirestore, collection, doc,
    getDocs, getDoc, setDoc, addDoc, deleteDoc,
    query, where, orderBy, runTransaction
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';
import {
    getAuth, GoogleAuthProvider,
    signInWithPopup, signOut as fbSignOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyCcHEnAY5XD_JCQxTuAoYJlWkUVDJodMQI",
    authDomain: "ceramics-a633a.firebaseapp.com",
    projectId: "ceramics-a633a",
    storageBucket: "ceramics-a633a.firebasestorage.app",
    messagingSenderId: "752480687950",
    appId: "1:752480687950:web:fefaa5b1804d908c29b01f",
    measurementId: "G-JB9QWQ3EGD"
};

const app = initializeApp(firebaseConfig);
const firestoreDB = getFirestore(app);
const firebaseAuth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ===== DB ADAPTER (window.DB) =====
// Wraps Firestore with a simplified API compatible with the existing codebase.
// Uses auto-increment numeric IDs (stored in _counters collection) to preserve
// backward compatibility with parseInt() calls throughout the app.

async function getNextId(storeName) {
    const counterRef = doc(firestoreDB, '_counters', storeName);
    return await runTransaction(firestoreDB, async (tx) => {
        const counterDoc = await tx.get(counterRef);
        const nextId = (counterDoc.exists() ? counterDoc.data().count : 0) + 1;
        tx.set(counterRef, { count: nextId });
        return nextId;
    });
}

class FirestoreCollection {
    constructor(name) {
        this.name = name;
        this.ref = collection(firestoreDB, name);
    }

    // Get all documents
    async getAll() {
        const snapshot = await getDocs(this.ref);
        return snapshot.docs.map(d => ({ ...d.data(), id: parseInt(d.id) || d.id }));
    }

    // Get single document by numeric or string ID
    async get(id) {
        const docRef = doc(firestoreDB, this.name, String(id));
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return undefined;
        return { ...snapshot.data(), id: parseInt(snapshot.id) || snapshot.id };
    }

    // Add new document with auto-increment numeric ID, returns numeric ID
    async add(data) {
        const newId = await getNextId(this.name);
        const docRef = doc(firestoreDB, this.name, String(newId));
        const cleanData = this._serializeDates(data);
        await setDoc(docRef, { ...cleanData, id: newId });
        return newId;
    }

    // Update/replace document (data must contain id field)
    async put(data) {
        const id = data.id;
        if (!id) throw new Error('put() requires data.id');
        const docRef = doc(firestoreDB, this.name, String(id));
        const cleanData = this._serializeDates(data);
        await setDoc(docRef, cleanData);
        return true;
    }

    // Delete document by ID
    async delete(id) {
        const docRef = doc(firestoreDB, this.name, String(id));
        await deleteDoc(docRef);
        return true;
    }

    // Query by a single field value (replaces IndexedDB index queries)
    async getByIndex(field, value) {
        const q = query(this.ref, where(field, '==', value));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ ...d.data(), id: parseInt(d.id) || d.id }));
    }

    // Count documents in collection
    async count() {
        const snapshot = await getDocs(this.ref);
        return snapshot.size;
    }

    // Clear all documents in collection
    async clear() {
        const snapshot = await getDocs(this.ref);
        const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletes);
    }

    // Serialize Date objects to ISO strings for Firestore
    _serializeDates(obj) {
        const result = { ...obj };
        for (const key in result) {
            if (result[key] instanceof Date) {
                result[key] = result[key].toISOString();
            }
        }
        return result;
    }
}

// Public DB adapter - replaces window.db (IndexedDB)
window.DB = {
    collection(name) {
        return new FirestoreCollection(name);
    },
    // Check if DB is ready (always true since Firestore is cloud)
    isReady() {
        return !!window.currentUser;
    }
};

// ===== INDEXEDDB COMPATIBILITY SHIM (window.db) =====
// Wraps window.DB (Firestore) to look like an IndexedDB `idb` database object.
// This means ALL legacy code using window.db.transaction(...) works as-is.
//
// Supported idb-style API:
//   db.transaction([storeName | storeNames], mode) → tx
//   tx.objectStore(storeName) → store
//   tx.done → Promise (resolves after all store ops complete)
//   store.getAll() → records[]
//   store.get(id) → record | undefined
//   store.add(data) → id
//   store.put(data) → true
//   store.delete(id) → true
//   store.clear() → true
//   store.index('fieldName').getAll(value) → records[]

class FirestoreObjectStore {
    constructor(storeName) {
        this.storeName = storeName;
        this._col = () => window.DB.collection(storeName);
    }

    async getAll() {
        return this._col().getAll();
    }

    async get(id) {
        if (id === undefined || id === null) return undefined;
        return this._col().get(id);
    }

    async add(data) {
        return this._col().add(data);
    }

    async put(data) {
        // idb put with keyPath 'id' — data must have .id already set for updates
        if (data.id) {
            return this._col().put(data);
        }
        return this._col().add(data);
    }

    async delete(id) {
        return this._col().delete(id);
    }

    async clear() {
        return this._col().clear();
    }

    // Mimics idb index – supports getAll(value) and get(value)
    index(fieldName) {
        const col = this._col();
        return {
            async getAll(value) {
                return col.getByIndex(fieldName, value);
            },
            async get(value) {
                const results = await col.getByIndex(fieldName, value);
                return results[0];
            }
        };
    }
}

class FirestoreTransaction {
    constructor(storeNames) {
        this._stores = {};
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        names.forEach(n => { this._stores[n] = new FirestoreObjectStore(n); });
        // done is a resolved promise (Firestore ops are immediate)
        this.done = Promise.resolve();
        // abort is a no-op
        this.abort = () => { };
    }

    objectStore(name) {
        if (!this._stores[name]) {
            this._stores[name] = new FirestoreObjectStore(name);
        }
        return this._stores[name];
    }
}

// window.db shim — looks exactly like an idb database object
window.db = {
    transaction(storeNames, _mode) {
        return new FirestoreTransaction(storeNames);
    },
    // Convenience: direct store access (some code uses db.objectStore)
    objectStore(name) {
        return new FirestoreObjectStore(name);
    },
    // IDB-style convenience methods
    async getAll(storeName) { return this.objectStore(storeName).getAll(); },
    async get(storeName, id) { return this.objectStore(storeName).get(id); },
    async add(storeName, data) { return this.objectStore(storeName).add(data); },
    async put(storeName, data) { return this.objectStore(storeName).put(data); },
    async delete(storeName, id) { return this.objectStore(storeName).delete(id); }
};

// ===== AUTH SETUP =====
window.__firebaseAuth = firebaseAuth;
window.__googleProvider = googleProvider;
window.__signInWithGoogle = () => signInWithPopup(firebaseAuth, googleProvider);
window.__signOut = () => fbSignOut(firebaseAuth);

// ===== EMAIL WHITELIST =====
// Chỉ các email này mới được phép truy cập hệ thống.
// Tất cả user được phép sẽ CHIA SẺ cùng một database (dùng nội bộ).
// Thêm email vào đây nếu muốn cho phép thêm người.
const ALLOWED_EMAILS = [];

function isAllowed(email) {
    // Nếu whitelist trống → cho phép tất cả (chỉ dùng khi development)
    if (ALLOWED_EMAILS.length === 0) return true;
    return ALLOWED_EMAILS.includes(email?.toLowerCase());
}

onAuthStateChanged(firebaseAuth, async (user) => {
    if (user) {
        if (!isAllowed(user.email)) {
            // Không được phép → đăng xuất ngay lập tức
            await fbSignOut(firebaseAuth);
            const errEl = document.getElementById('login-error');
            if (errEl) errEl.textContent = `⛔ Tài khoản ${user.email} không được cấp quyền truy cập.`;
            return;
        }

        window.currentUser = user;
        _hideLoginOverlay();
        // _updateUserBar(user);

        // Trigger app init if not yet started
        if (!window.__appStarted) {
            window.__appStarted = true;
            if (typeof initApp === 'function') {
                initApp();
            }
        }
    } else {
        window.currentUser = null;
        _showLoginOverlay();
        // _updateUserBar(null);
    }
});

function _showLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function _hideLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
}
/*
function _updateUserBar(user) {
    let bar = document.getElementById('user-bar');

    if (!user) {
        if (bar) bar.remove();
        return;
    }

    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'user-bar';
        bar.style.cssText = `
            position: fixed; bottom: 16px; right: 16px; z-index: 1000;
            background: rgba(255,255,255,0.12); backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.2); border-radius: 50px;
            padding: 8px 16px; display: flex; align-items: center; gap: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3); font-family: 'Segoe UI', sans-serif;
        `;
        document.body.appendChild(bar);
    }

    const avatar = user.photoURL
        ? `<img src="${user.photoURL}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" />`
        : `<div style="width:28px;height:28px;border-radius:50%;background:#4285F4;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px">${(user.email || '?')[0].toUpperCase()}</div>`;

    bar.innerHTML = `
        ${avatar}
        <span style="color:rgba(255,255,255,0.8);font-size:0.8rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user.email}</span>
        <button onclick="window.__signOut && window.__signOut()" style="
            background: rgba(255,255,255,0.15); border: none; border-radius: 20px;
            color: rgba(255,255,255,0.7); padding: 4px 12px; font-size: 0.75rem;
            cursor: pointer; transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,80,80,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
            Đăng xuất
        </button>
    `;
}
*/

console.log('🔥 Firebase initialized - project: ceramics-a633a');

