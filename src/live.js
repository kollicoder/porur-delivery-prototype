// Real-time backend for the web prototype (Firestore). Same schema as porur-native/packages/shared.
// Config: VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_API_KEY / VITE_FIREBASE_APP_ID / VITE_FIREBASE_EMULATOR_HOST (see .env.example).
// Default = local emulator with demo project "demo-porur".
import { useEffect, useRef, useState, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { PRODUCTS, SETTINGS, RIDERS } from './data.js';

const E = import.meta.env;
const projectId = E.VITE_FIREBASE_PROJECT_ID || 'demo-porur';
const emulatorHost = E.VITE_FIREBASE_EMULATOR_HOST ?? (projectId.startsWith('demo-') ? location.hostname : '');
const app = initializeApp({ projectId, apiKey: E.VITE_FIREBASE_API_KEY || 'demo-api-key', appId: E.VITE_FIREBASE_APP_ID || '1:000:web:demo', authDomain: E.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com` });
const auth = getAuth(app); const db = getFirestore(app);
if (emulatorHost) { connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true }); connectFirestoreEmulator(db, emulatorHost, 8080); }
export const backendInfo = { projectId, emulatorHost };

export const FLOW = ['placed', 'accepted', 'ready', 'picked_up', 'on_the_way', 'delivered'];
const clean = o => JSON.parse(JSON.stringify(o));
const otp = () => String(1000 + Math.floor(Math.random() * 9000));
const rid = p => p + Math.floor(1000 + Math.random() * 9000);

/** Firestore order -> prototype shape (numeric status, items as [name, qty]) */
export const toProto = o => ({ ...o, items: o.type === 'errand' ? [[`Errand: ${o.note || ''}`, 1]] : (o.lines || []).map(l => [l.name, l.qty]),
  status: FLOW.indexOf(o.status), time: new Date(o.createdAt).toTimeString().slice(0, 5), rx: o.prescriptionUri ? 'prescription.jpg' : undefined });

export const api = {
  setRole: async role => { if (!auth.currentUser) await signInAnonymously(auth); await setDoc(doc(db, 'users', auth.currentUser.uid), { role, updatedAt: new Date().toISOString() }, { merge: true }); return auth.currentUser.uid; },
  uid: () => auth.currentUser?.uid,
  updateOrder: (id, patch) => updateDoc(doc(db, 'orders', id), clean({ ...patch, updatedAt: new Date().toISOString() })),
  updateProduct: (id, patch) => updateDoc(doc(db, 'products', id), patch),
  updateSettings: patch => setDoc(doc(db, 'settings', 'app'), clean(patch), { merge: true }),
  updateRider: (id, patch) => updateDoc(doc(db, 'riders', id), patch),
  /** cart lines -> one order per store (each vendor sees only its part) */
  async placeOrder({ lines, fee, pay, address, rxDataUrl }) {
    const byStore = {}; lines.forEach(l => (byStore[l.p.store] ||= []).push(l));
    const b = writeBatch(db); const now = new Date().toISOString(); let feeLeft = fee; const ids = [];
    for (const [storeId, ls] of Object.entries(byStore)) {
      const sl = ls.map(l => ({ productId: l.p.id, name: l.p.name, qty: l.q, price: l.p.price, rx: !!l.p.rx }));
      const subtotal = sl.reduce((a, l) => a + l.price * l.qty, 0); const f = feeLeft; feeLeft = 0; const hasRx = sl.some(l => l.rx);
      const id = rid('PD'); ids.push(id);
      b.set(doc(db, 'orders', id), clean({ id, type: 'order', storeId, customer: 'You (web demo)', phone: '98400 99999', address, lines: sl, subtotal, fee: f, total: subtotal + f, pay,
        status: 'placed', createdAt: now, updatedAt: now, otp: otp(), rider: 'r1', customerUid: auth.currentUser.uid, ...(hasRx ? { rxStatus: 'pending', prescriptionUri: rxDataUrl || null } : {}) }));
    }
    await b.commit(); return ids;
  },
  async bookErrand({ pickup, drop, task, price }) {
    const id = rid('ER'), now = new Date().toISOString(), uid = auth.currentUser.uid, note = `${task} (pickup: ${pickup})`;
    const b = writeBatch(db);
    b.set(doc(db, 'orders', id), { id, type: 'errand', customer: 'You (web demo)', phone: '98400 99999', address: drop, note, lines: [], subtotal: price, fee: 0, total: price, pay: 'UPI', status: 'placed', createdAt: now, updatedAt: now, otp: otp(), rider: 'r6', customerUid: uid });
    b.set(doc(db, 'errands', id), { orderId: id, note, createdAt: now, customerUid: uid });
    await b.commit(); return id;
  },
};

/** Live data hook. Mutates the shared PRODUCTS array / SETTINGS object in place so existing helpers see live values. */
export function useLive(role) {
  const [raw, setRaw] = useState([]); const [riders, setRidersState] = useState(RIDERS); const [, bump] = useState(0);
  const [uid, setUid] = useState(); const [error, setError] = useState('');
  useEffect(() => { api.setRole(role).then(setUid).catch(e => setError(e.message)); }, [role]);
  useEffect(() => {
    if (!uid) return;
    const err = e => setError(e.message);
    const u = [
      onSnapshot(collection(db, 'orders'), s => setRaw(s.docs.map(d => d.data()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))), err),
      onSnapshot(collection(db, 'riders'), s => s.size && setRidersState(s.docs.map(d => d.data()).sort((a, b) => +a.id.slice(1) - +b.id.slice(1))), err),
      onSnapshot(collection(db, 'products'), s => { if (!s.size) return; const ps = s.docs.map(d => d.data()).sort((a, b) => +a.id.slice(1) - +b.id.slice(1)); PRODUCTS.splice(0, PRODUCTS.length, ...ps); bump(x => x + 1); }, err),
      onSnapshot(doc(db, 'settings', 'app'), s => { if (s.exists()) { Object.assign(SETTINGS, s.data()); bump(x => x + 1); } }, err),
    ];
    return () => u.forEach(f => f());
  }, [uid]);
  const orders = raw.filter(o => o.status !== 'rejected').map(toProto);
  const ordersRef = useRef(orders); ordersRef.current = orders;
  const ridersRef = useRef(riders); ridersRef.current = riders;
  // Existing UI code calls setOrders(fn) / setRiders(fn); we diff the result and write changes to Firestore.
  const setOrders = useCallback(fn => {
    const prev = ordersRef.current, next = typeof fn === 'function' ? fn(prev) : fn;
    for (const o of prev) {
      const n = next.find(x => x.id === o.id);
      if (!n) { api.updateOrder(o.id, { status: 'rejected' }); continue; }
      const patch = {};
      if (n.status !== o.status) patch.status = FLOW[n.status];
      if (n.rider !== o.rider) patch.rider = n.rider;
      if (n.rxStatus !== o.rxStatus) patch.rxStatus = n.rxStatus;
      if (Object.keys(patch).length) api.updateOrder(o.id, patch);
    }
  }, []);
  const setRiders = useCallback(fn => {
    const prev = ridersRef.current, next = typeof fn === 'function' ? fn(prev) : fn;
    next.forEach(n => { const o = prev.find(x => x.id === n.id); if (o && (o.status !== n.status || o.today !== n.today)) api.updateRider(n.id, { status: n.status, today: n.today }); });
  }, []);
  return { orders, allOrders: raw, setOrders, riders, setRiders, uid, error };
}
