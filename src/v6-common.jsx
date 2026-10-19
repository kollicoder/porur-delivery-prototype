// v0.6 shared web UI bits (same design language as v0.5)
import React, { useEffect, useState } from 'react';
export const rs = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
/** subscribe helper: useSub(() => models.watchX(cb), deps) */
export function useSub(fn, deps, init = null) { const [v, setV] = useState(init); useEffect(() => { try { return fn(setV); } catch (e) { console.warn(e); } }, deps); return v; }
export const useNow = (ms = 30000) => { const [n, setN] = useState(Date.now()); useEffect(() => { const i = setInterval(() => setN(Date.now()), ms); return () => clearInterval(i); }, [ms]); return n; };
export const MeterBar = ({ count, threshold, light, testid }) => { const pct = Math.min(100, Math.round(count / threshold * 100));
  return <div data-testid={testid} role="progressbar" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={count}><div className={'mbar' + (light ? ' lt' : '')}><i style={{ width: pct + '%' }} /></div>
    <div className="kv small" style={{ fontWeight: 700 }}><span>{count} / {threshold} baskets</span><span>{pct}%</span></div></div>; };
export const Kv = ({ k, v, b, testid }) => <div className={'kv' + (b ? ' b' : '')} data-testid={testid}><span>{k}</span><b>{v}</b></div>;
export const Code = ({ label, code, sub, testid }) => <div className="codebox" data-testid={testid}><small>{label}</small><b>{code || '····'}</b>{sub && <small>{sub}</small>}</div>;
export const Step = ({ v, set, testid, min = 0 }) => <div className="step6" data-testid={testid}><button aria-label="less" onClick={() => set(Math.max(min, v - 1))}>−</button><span>{v}</span><button aria-label="more" onClick={() => set(v + 1)}>+</button></div>;
export const Seg = ({ value, set, opts }) => <div className="seg" style={{ display: 'flex' }}>{opts.map(([k, n]) => <button key={k} style={{ flex: 1 }} className={value === k ? 'on' : ''} onClick={() => set(k)}>{n}</button>)}</div>;
export const Chips = ({ value, set, opts, testid }) => <div className="chiprow">{opts.map(([k, n]) => <button key={k} data-testid={testid ? testid + '-' + k : undefined} className={'chipbtn' + ((Array.isArray(value) ? value.includes(k) : value === k) ? ' on' : '')} onClick={() => set(k)}>{n}</button>)}</div>;
export const Stars = ({ v, set, testid }) => <div className="stars6" data-testid={testid}>{[1, 2, 3, 4, 5].map(n => <button key={n} aria-label={n + ' star'} data-testid={testid + '-' + n} onClick={() => set(n)}>{n <= v ? '★' : '☆'}</button>)}</div>;
export const Field = ({ label, value, set, testid, ...p }) => <label style={{ display: 'block', marginTop: 10 }}><span className="lbl">{label}</span><input className="inp" style={{ width: '100%', boxSizing: 'border-box', marginTop: 6 }} data-testid={testid} aria-label={label} value={value} onChange={e => set(e.target.value)} {...p} /></label>;
export const Empty = ({ emoji, title, body, testid }) => <div className="card" style={{ textAlign: 'center' }} data-testid={testid}><div style={{ fontSize: 44 }}>{emoji}</div><b className="dd-h" style={{ fontSize: 19 }}>{title}</b>{body && <p className="muted small">{body}</p>}</div>;
export const Sk = ({ n = 3 }) => <div data-testid="skeleton">{Array.from({ length: n }).map((_, i) => <div key={i} className="card"><div className="sk" style={{ height: 18, width: '60%', borderRadius: 10 }} /><div className="sk" style={{ height: 12, width: '40%', borderRadius: 10, marginTop: 8 }} /></div>)}</div>;
export const Err = ({ e }) => e ? <p className="err" role="alert">{e}</p> : null;
export const run = (setErr, setBusy) => f => async () => { setErr(''); setBusy && setBusy(true); try { await f(); } catch (e) { setErr(/permission/i.test(e.message) ? 'Not allowed — check the code / rules.' : e.message); } finally { setBusy && setBusy(false); } };
