import React, { useState } from 'react';
import { api, backendInfo } from './live.js';
const DEMO = [['+1 650-555-0001', 'Customer'], ['+1 650-555-0004', 'Rider (Karthik)']];
export function Login({ title = 'Sign in' }) {
  const [phone, setPhone] = useState('+91 '); const [code, setCode] = useState(''); const [step, setStep] = useState('phone'); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const norm = p => p.replace(/[^\d+]/g, '');
  const send = async () => { setErr(''); setBusy(true); try { await api.sendCode(norm(phone)); setStep('code'); } catch (e) { setErr(e.code === 'auth/invalid-phone-number' ? 'Enter a valid number like +91 98400 12345' : e.message); } setBusy(false); };
  const verify = async () => { setErr(''); setBusy(true); try { await api.confirmCode(code.trim()); } catch (e) { setErr(e.code === 'auth/invalid-verification-code' ? 'Wrong code, try again' : e.message); } setBusy(false); };
  return (<div className="page login">
    <div className="hero"><h1>Porur Delivery</h1><p>{title} with your mobile number. We'll send a one-time code by SMS.</p></div>
    <div className="card">
      {step === 'phone' ? <>
        <label className="lbl">Mobile number</label>
        <input className="inp" data-testid="phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} />
        <button className="primary" data-testid="send-code" disabled={busy || norm(phone).length < 10} onClick={send}>{busy ? 'Sending…' : 'Send OTP'}</button>
      </> : <>
        <p className="small">Code sent to <b>{phone}</b> · <a href="#" onClick={e => { e.preventDefault(); setStep('phone'); }}>change</a></p>
        <label className="lbl">6-digit code</label>
        <input className="inp" data-testid="otp" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value)} />
        <button className="primary" data-testid="verify" disabled={busy || code.length < 6} onClick={verify}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
      </>}
      {err && <p className="err">{err}</p>}
      <div id="recaptcha" />
    </div>
    {backendInfo.emulatorHost ? <p className="muted small">Emulator: any number works; codes appear in the emulator log / UI.</p>
      : backendInfo.testMode && <p className="muted small">Test mode: use a Firebase test number, e.g. {DEMO.map(([n, r]) => `${n} (${r})`).join(', ')}.</p>}
  </div>);
}
/** Shown when a signed-in user opens a staff view without the role. Lets them request access (admin approves). */
export function RequestAccess({ me, role, riders }) {
  const [name, setName] = useState(me?.name || ''); const [riderId, setRiderId] = useState('r1'); const [sent, setSent] = useState(false);
  const pending = me?.request;
  return (<div className="page"><div className="card">
    <h3>{role === 'rider' ? '🛵 Rider access needed' : '🔒 Admin only'}</h3>
    {role !== 'rider' ? <p className="muted">This area is for Porur Delivery admins. Ask an admin to give your number admin access.</p>
      : pending ? <p>⏳ Request sent ({pending.role}{pending.riderId ? ` · ${pending.riderId}` : ''}). An admin will approve it shortly.</p>
      : <>
        <p className="muted">Riders are approved by an admin. Send a request:</p>
        <label className="lbl">Your name</label><input className="inp" value={name} onChange={e => setName(e.target.value)} />
        <label className="lbl">Rider profile</label>
        <select className="inp" value={riderId} onChange={e => setRiderId(e.target.value)}>{riders.map(r => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}</select>
        <button className="primary" data-testid="request-rider" disabled={sent} onClick={async () => { setSent(true); await api.updateMe({ name, request: { role: 'rider', riderId, at: new Date().toISOString() } }); }}>Request rider access</button>
      </>}
    <p className="small muted">Signed in as {me?.phone}. <a href="#" onClick={e => { e.preventDefault(); api.logout(); }}>Sign out</a></p>
  </div></div>);
}
