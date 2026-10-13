// Real-time backend for the web prototype (Firestore + Firebase Phone Auth). Same schema as porur-native/packages/shared.
// Config via VITE_FIREBASE_* (.env = live project, .env.emulator = local emulator).
import { useEffect, useRef, useState, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, onSnapshot, setDoc, updateDoc, writeBatch, getDoc, getDocs, query, where, deleteField } from 'firebase/firestore';
import { PRODUCTS, SETTINGS, RIDERS } from './data.js';
import { pickRider } from './dispatch.js';
import { sendPushMany } from './push.js';

const E = import.meta.env;
const projectId = E.VITE_FIREBASE_PROJECT_ID || 'demo-porur';
const emulatorHost = E.VITE_FIREBASE_EMULATOR_HOST ?? (projectId.startsWith('demo-') ? location.hostname : '');
const app = initializeApp({ projectId, apiKey: E.VITE_FIREBASE_API_KEY || 'demo-api-key', appId: E.VITE_FIREBASE_APP_ID || '1:000:web:demo', authDomain: E.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com` });
export const auth = getAuth(app); const db = getFirestore(app);
if (emulatorHost) { connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true }); connectFirestoreEmulator(db, emulatorHost, 8080); }
// Emulator, or Firebase *test* phone numbers (opt-in with ?test=1 / localStorage.pd_test): skip reCAPTCHA. Real numbers always need reCAPTCHA.
const testMode = !!emulatorHost || /[?&]test=1/.test(location.search) || localStorage.getItem('pd_test') === '1';
if (/[?&]test=1/.test(location.search)) localStorage.setItem('pd_test', '1');
if (testMode) auth.settings.appVerificationDisabledForTesting = true;
export const backendInfo = { projectId, emulatorHost, testMode };

const STORE_POS = { s1: { lat: 13.0359, lng: 80.1574 }, s2: { lat: 13.0382, lng: 80.1617 }, s3: { lat: 13.0331, lng: 80.1532 } };
export const FLOW = ['placed', 'accepted', 'ready', 'picked_up', 'on_the_way', 'delivered'];
export const FLOW_LABEL = { placed: 'Order placed', accepted: 'Store accepted your order', ready: 'Packed and ready for pickup', picked_up: 'Rider picked up your order', on_the_way: 'Rider is on the way', delivered: 'Delivered — enjoy!', rejected: 'Store could not take the order' };
const clean = o => JSON.parse(JSON.stringify(o));
export const PAY_LABEL = { COD: 'Cash on delivery', UPI_DOD: 'UPI on delivery', UPI: 'UPI (legacy demo)' };
const otp = () => String(1000 + Math.floor(Math.random() * 9000));
const rid = p => p + Math.floor(1000 + Math.random() * 9000);

export const toProto = o => ({ ...o, items: o.type === 'errand' ? [[`Errand: ${o.note || ''}`, 1]] : (o.lines || []).map(l => [l.name, l.qty]),
  status: FLOW.indexOf(o.status), time: new Date(o.createdAt).toTimeString().slice(0, 5), rx: o.prescriptionUri ? 'prescription.jpg' : undefined });

let confirmation = null, verifier = null;
let resolveReady; let ready = new Promise(r => (resolveReady = r));
const w = f => async (...a) => { await ready; return f(...a); };
export const api = {
  // ---- phone OTP ----
  async sendCode(phone, containerId = 'recaptcha') {
    if (!verifier) verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    confirmation = await signInWithPhoneNumber(auth, phone, verifier);
  },
  async confirmCode(code) { await confirmation.confirm(code); },
  async logout() { await signOut(auth); ready = new Promise(r => (resolveReady = r)); },
  uid: () => auth.currentUser?.uid,
  updateMe: w(patch => { const p = { ...patch, updatedAt: new Date().toISOString() }; if (patch.request === null) p.request = deleteField(); return updateDoc(doc(db, 'users', auth.currentUser.uid), p); }),
  setUserRole: w((uid, role, extra = {}) => updateDoc(doc(db, 'users', uid), { role: role || deleteField(), storeId: extra.storeId || deleteField(), riderId: extra.riderId || deleteField(), request: deleteField(), updatedAt: new Date().toISOString() })),
  rejectRequest: w(uid => updateDoc(doc(db, 'users', uid), { request: deleteField() })),
  updateOrder: w((id, patch) => updateDoc(doc(db, 'orders', id), clean({ ...patch, updatedAt: new Date().toISOString() }))),
  updateProduct: w((id, patch) => updateDoc(doc(db, 'products', id), patch)),
  updateSettings: w(patch => setDoc(doc(db, 'settings', 'app'), clean(patch), { merge: true })),
  updateRider: w((id, patch) => updateDoc(doc(db, 'riders', id), clean(patch))),
  /** One order per store. ONE delivery fee per checkout (on part 1, labelled on every part). OTP + prescription go to private docs. */
  async placeOrder({ lines, fee, pay, address, rxDataUrl, name, dropLat, dropLng }) {
    await ready;
    const byStore = {}; lines.forEach(l => (byStore[l.p.store] ||= []).push(l));
    const groups = Object.entries(byStore); const groupId = rid('G');
    const b = writeBatch(db); const now = new Date().toISOString(); const ids = []; const uid = auth.currentUser.uid;
    groups.forEach(([storeId, ls], i) => {
      const sl = ls.map(l => ({ productId: l.p.id, name: l.p.name, qty: l.q, price: l.p.price, rx: !!l.p.rx }));
      const subtotal = sl.reduce((a, l) => a + l.price * l.qty, 0); const f = i === 0 ? fee : 0;
      const hasRx = sl.some(l => l.rx) || (!!rxDataUrl && ls.some(l => l.p.cat === 'med'));
      const id = rid('PD'); ids.push(id);
      b.set(doc(db, 'orders', id), clean({ id, type: 'order', storeId, customer: name, phone: auth.currentUser.phoneNumber, address, lines: sl, subtotal, fee: f, total: subtotal + f, pay, paymentStatus: 'due',
        status: 'placed', createdAt: now, updatedAt: now, customerUid: uid, dropLat, dropLng,
        ...(groups.length > 1 ? { groupId, part: i + 1, parts: groups.length, feeNote: i === 0 ? `Delivery fee for all ${groups.length} parts of this checkout` : 'Delivery fee charged on part 1' } : {}),
        ...(hasRx ? { rxStatus: 'pending', hasRxPhoto: !!rxDataUrl } : {}) }));
      b.set(doc(db, 'orderSecrets', id), { otp: otp(), customerUid: uid, createdAt: now });
      if (hasRx && rxDataUrl) b.set(doc(db, 'prescriptions', id), { img: rxDataUrl, storeId, customerUid: uid, createdAt: now });
    });
    await b.commit(); groups.forEach(([storeId], i) => pushTo({ storeId }, '🛎️ New order ' + ids[i], name || ''));
    return ids;
  },
  async bookErrand({ pickup, drop, task, price, name, dropLat, dropLng, pay = 'COD', riders = [] }) {
    await ready;
    const id = rid('ER'), now = new Date().toISOString(), uid = auth.currentUser.uid, note = `${task} (pickup: ${pickup})`;
    const rider = pickRider(riders, dropLat ? { lat: dropLat, lng: dropLng } : undefined);
    const b = writeBatch(db);
    b.set(doc(db, 'orders', id), clean({ id, type: 'errand', customer: name, phone: auth.currentUser.phoneNumber, address: drop, note, lines: [], subtotal: price, fee: 0, total: price, pay, paymentStatus: 'due', status: 'placed', createdAt: now, updatedAt: now, ...(rider ? { rider } : {}), customerUid: uid, dropLat, dropLng }));
    b.set(doc(db, 'orderSecrets', id), { otp: otp(), customerUid: uid, createdAt: now });
    b.set(doc(db, 'errands', id), { orderId: id, note, createdAt: now, customerUid: uid });
    await b.commit(); if (rider) pushTo({ riderId: rider }, '🛵 New errand ' + id, note);
    return id;
  },
  /** Rider submits the customer's code; Firestore rules check it against orderSecrets/{id}. */
  deliver: w((id, code, collectedVia) => updateDoc(doc(db, 'orders', id), clean({ status: 'delivered', deliveryCode: code, deliveredAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...(collectedVia ? { paymentStatus: 'collected', collectedVia } : {}) }))),
  watchSecret(id, cb) { return onSnapshot(doc(db, 'orderSecrets', id), s => cb(s.exists() ? s.data().otp : null), () => cb(null)); },
  watchPrescription(id, cb) { return onSnapshot(doc(db, 'prescriptions', id), s => cb(s.exists() ? s.data().img : null), () => cb(null)); },
};

async function pushTo(to, title, body) {
  try { const k = to.storeId ? 'storeId' : 'riderId', v = to.storeId || to.riderId; if (!v) return;
    const s = await getDocs(query(collection(db, 'pushTokens'), where(k, '==', v))); await sendPushMany(s.docs.map(d => d.data().token), title, body); } catch (e) { console.warn('pushTo', e); }
}
export { pushTo };

// ---- Web notifications (while the tab is open; background web push needs a server — next step) ----
export const notifySupported = typeof Notification !== 'undefined';
export function notify(title, body) {
  if (notifySupported && Notification.permission === 'granted') { try { new Notification(title, { body, icon: './favicon.ico' }); } catch {} }
  window.dispatchEvent(new CustomEvent('pd-toast', { detail: `${title} — ${body}` }));
}

/** Live data hook. Mutates the shared PRODUCTS array / SETTINGS object in place so existing helpers see live values. */
export function useLive() {
  const [user, setUser] = useState(undefined); const [me, setMe] = useState(null); const [isAdmin, setIsAdmin] = useState(false);
  const [own, setOwn] = useState([]); const [extra, setExtra] = useState([]); const [users, setUsers] = useState([]);
  const [riders, setRidersState] = useState(RIDERS); const [, bump] = useState(0); const [error, setError] = useState('');
  useEffect(() => onAuthStateChanged(auth, async u => {
    if (u && u.phoneNumber) {
      const ref = doc(db, 'users', u.uid);
      try { if (!(await getDoc(ref)).exists()) await setDoc(ref, { phone: u.phoneNumber, createdAt: new Date().toISOString() }); } catch (e) { setError(e.message); }
      resolveReady(); setUser(u);
    } else { setUser(null); setMe(null); setIsAdmin(false); }
  }), []);
  const err = e => setError(e.message);
  useEffect(() => {
    if (!user) return;
    const u = [
      onSnapshot(doc(db, 'users', user.uid), s => setMe(s.exists() ? { uid: s.id, ...s.data() } : null), err),
      // Admin check = can we list users? (bootstrap admin phone is only known to the rules)
      onSnapshot(collection(db, 'users'), s => { if (s.metadata.fromCache) return; setIsAdmin(true); setUsers(s.docs.map(d => ({ uid: d.id, ...d.data() }))); }, () => setIsAdmin(false)),
      onSnapshot(query(collection(db, 'orders'), where('customerUid', '==', user.uid)), s => setOwn(s.docs.map(d => d.data())), err),
      onSnapshot(collection(db, 'riders'), s => s.size && setRidersState(s.docs.map(d => d.data()).sort((a, b) => +a.id.slice(1) - +b.id.slice(1))), err),
      onSnapshot(collection(db, 'products'), s => { if (!s.size) return; const ps = s.docs.map(d => d.data()).sort((a, b) => +a.id.slice(1) - +b.id.slice(1)); PRODUCTS.splice(0, PRODUCTS.length, ...ps); bump(x => x + 1); }, err),
      onSnapshot(doc(db, 'settings', 'app'), s => { if (s.exists()) { Object.assign(SETTINGS, s.data()); bump(x => x + 1); } }, err),
    ];
    return () => u.forEach(f => f());
  }, [user]);
  // Staff order feeds: admin sees all orders; a rider sees orders assigned to them.
  useEffect(() => {
    if (!user) return;
    if (isAdmin) return onSnapshot(collection(db, 'orders'), s => setExtra(s.docs.map(d => d.data())), err);
    if (me?.role === 'rider' && me.riderId) return onSnapshot(query(collection(db, 'orders'), where('rider', '==', me.riderId)), s => setExtra(s.docs.map(d => d.data())), err);
    setExtra([]);
  }, [user, isAdmin, me?.role, me?.riderId]);
  const map = new Map(); [...extra, ...own].forEach(o => map.set(o.id, o));
  const raw = [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // notifications on changes
  const seen = useRef(null);
  useEffect(() => {
    const prev = seen.current; seen.current = Object.fromEntries(raw.map(o => [o.id, o.status]));
    if (!prev) return;
    for (const o of raw) {
      const was = prev[o.id];
      if (o.customerUid === user?.uid && was && was !== o.status) notify(`Order ${o.id}`, FLOW_LABEL[o.status] || o.status);
      else if (!was && o.customerUid !== user?.uid && (isAdmin || me?.role === 'rider')) notify('New order ' + o.id, `${o.customer || ''} · ₹${o.total}`);
      else if (was && was !== o.status && me?.role === 'rider' && o.status === 'ready') notify(`Order ${o.id} is ready`, 'Head to the store for pickup');
    }
  }, [raw.map(o => o.id + o.status).join()]);
  const orders = raw.filter(o => o.status !== 'rejected').map(toProto);
  const ordersRef = useRef(orders); ordersRef.current = orders;
  const ridersRef = useRef(riders); ridersRef.current = riders;
  const setOrders = useCallback(fn => {
    const prev = ordersRef.current, next = typeof fn === 'function' ? fn(prev) : fn;
    for (const o of prev) {
      const n = next.find(x => x.id === o.id);
      if (!n) { api.updateOrder(o.id, { status: 'rejected' }).catch(err); continue; }
      const patch = {};
      if (n.status !== o.status) patch.status = FLOW[n.status];
      if (n.rider !== o.rider) patch.rider = n.rider;
      // auto-dispatch: accepted with no rider → nearest online rider (GPS) / least busy; admin can still change it
      if (patch.status === 'accepted' && !n.rider && !patch.rider) { const st = STORE_POS[o.storeId]; const r = pickRider(ridersRef.current, st); if (r) patch.rider = r; }
      if (patch.status && o.customerPushToken) sendPushMany([o.customerPushToken], `Order ${o.id}`, FLOW_LABEL[patch.status] || patch.status);
      if (n.rxStatus !== o.rxStatus) patch.rxStatus = n.rxStatus;
      if (Object.keys(patch).length) api.updateOrder(o.id, patch).catch(err);
    }
  }, []);
  const setRiders = useCallback(fn => {
    const prev = ridersRef.current, next = typeof fn === 'function' ? fn(prev) : fn;
    next.forEach(n => { const o = prev.find(x => x.id === n.id); if (o && (o.status !== n.status || o.today !== n.today)) api.updateRider(n.id, { status: n.status, today: n.today }).catch(err); });
  }, []);
  return { user, me, isAdmin, users, orders, allOrders: raw, setOrders, riders, setRiders, uid: user?.uid, error, name: me?.name || user?.phoneNumber || '' };
}
