import React, { useState, useEffect } from 'react';
import { BRAND, isTestMode } from './brand.js';
import { api, backendInfo } from './live.js';
const DEMO = [['+1 650-555-0001', 'Customer'], ['+1 650-555-0004', 'Rider (Karthik)']];
export function Login({ title = 'Sign in', staff }) {
  const [phone, setPhone] = useState('+91 '); const [code, setCode] = useState(''); const [step, setStep] = useState('phone'); const [busy, setBusy] = useState(false); const [err, setErr] = useState(null);
  const [left, setLeft] = useState(0); useEffect(() => { if (left <= 0) return; const t = setTimeout(() => setLeft(l => l - 1), 1000); return () => clearTimeout(t); }, [left]);
  const norm = p => p.replace(/[^\d+]/g, '');
  const net = e => (!navigator.onLine || /network/i.test(e.code || e.message)) ? { t: "You're offline", b: 'Check your internet and try again.' } : null;
  const send = async () => { setErr(null); setBusy(true); try { await api.sendCode(norm(phone)); setStep('code'); setCode(''); setLeft(30); }
    catch (e) { setErr(net(e) || (e.code === 'auth/invalid-phone-number' ? { t: 'Check the number', b: 'Enter a valid number like +91 98400 12345' } : e.code === 'auth/too-many-requests' ? { t: 'Too many tries', b: 'Please wait a few minutes before asking for another code.' } : { t: "Couldn't send the code", b: e.message })); } setBusy(false); };
  const verify = async () => { setErr(null); setBusy(true); try { await api.confirmCode(code.trim()); }
    catch (e) { setErr(net(e) || (e.code === 'auth/invalid-verification-code' ? { t: 'Wrong code', b: "That code doesn't match. Check the SMS and try again.", k: 'wrong' } : /expired/.test(e.code || '') ? { t: 'Code expired', b: 'Codes last a few minutes. Tap “Resend code” for a new one.' } : { t: "Couldn't verify", b: e.message })); } setBusy(false); };
  return (<div className="page dd-login">
    <div className="logo">🛵</div>
    <h1 data-testid="brand-name">{BRAND.name}{staff ? ' · staff' : ''}</h1>
    <p className="dd-h" style={{fontSize:20,margin:0}}>Groceries, fruits &amp; veg and medicines in about 30 minutes.</p>
    <p className="ta small" style={{margin:'6px 0'}}>30 நிமிடத்தில் வீட்டுக்கே டெலிவரி</p>
    <p className="muted">{title} with your mobile number.</p>
    <div className="card">
      {step === 'phone' ? <>
        <b className="dd-h" style={{fontSize:19}}>Enter your mobile number</b><p className="muted small" style={{margin:'2px 0 8px'}}>We'll text you a 6-digit code. No password needed.</p>
        <input className="inp" data-testid="phone" aria-label="Mobile number" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} />
        <button className="primary" data-testid="send-code" disabled={busy || norm(phone).length < 10} onClick={send}>{busy ? 'Sending…' : 'Send OTP'}</button>
      </> : <>
        <b className="dd-h" style={{fontSize:19}}>Enter the 6-digit code</b>
        <p className="small" style={{margin:'2px 0'}}>Sent to <b>{phone}</b> <button className="linkbtn" data-testid="change-number" onClick={() => { setStep('phone'); setErr(null); }}>Change</button></p>
        <input className="inp" data-testid="otp" aria-label="6-digit code" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value)} style={{letterSpacing:10,textAlign:'center',borderColor:err?.k==='wrong'?'var(--red)':undefined}} />
        <button className="primary" data-testid="verify" disabled={busy || code.length < 6} onClick={verify}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
        <div style={{textAlign:'center'}}><button className="linkbtn" data-testid="resend" disabled={left > 0 || busy} onClick={send}>{left > 0 ? `Resend code in 0:${String(left).padStart(2,'0')}` : 'Resend code'}</button></div>
      </>}
      {err && <div className="errbox" role="alert" data-testid="login-error"><b>⚠️ {err.t}</b>{err.b}</div>}
      <div id="recaptcha" />
    </div>
    {isTestMode() && (backendInfo.emulatorHost ? <p className="muted small" data-testid="test-hint">Emulator: any number works; codes appear in the emulator log / UI.</p>
      : backendInfo.testMode && <p className="muted small" data-testid="test-hint">Test mode: use a Firebase test number, e.g. {DEMO.map(([n, r]) => `${n} (${r})`).join(', ')}.</p>)}
  </div>);
}
/** Shown when a signed-in user opens a staff view without the role. Lets them request access (admin approves). */
export function RequestAccess({ me, role, riders }) {
  const [name, setName] = useState(me?.name || ''); const [riderId, setRiderId] = useState('r1'); const [sent, setSent] = useState(false);
  const pending = me?.request;
  return (<div className="page"><div className="card">
    <h3>{role === 'rider' ? '🛵 Rider access needed' : '🔒 Admin only'}</h3>
    {role !== 'rider' ? <p className="muted">This area is for {BRAND.name} admins. Ask an admin to give your number admin access.</p>
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
