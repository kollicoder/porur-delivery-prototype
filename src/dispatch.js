/** Client-side dispatch (no server on the Spark plan). Picks an available rider:
 *  1) nearest ONLINE rider with a fresh GPS fix (< 30 min), else
 *  2) least-busy rider who is online (then 'delivering'), by tasks done today.
 *  Returns undefined when nobody is on duty — the order stays unassigned and the admin assigns it. */
export const GPS_FRESH_MS = 30 * 60 * 1000;
const km = (a, b) => {
  const R = 6371, d = Math.PI / 180, x = (b.lat - a.lat) * d, y = (b.lng - a.lng) * d;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h));
};
export function pickRider(riders, from, activeCount = {}, now = Date.now()) {
  const online = riders.filter(r => r.status === 'online');
  if (from) {
    const fresh = online.filter(r => r.lat != null && r.lng != null && r.locAt && now - +new Date(r.locAt) < GPS_FRESH_MS);
    if (fresh.length) return fresh.sort((a, b) => km(from, a) - km(from, b))[0].id;
  }
  const load = (r) => (activeCount[r.id] || 0) * 100 + (r.today || 0);
  const pool = online.length ? online : riders.filter(r => r.status === 'delivering');
  return pool.sort((a, b) => load(a) - load(b))[0]?.id;
}
export const RIDER_AVAILABLE = ['online', 'delivering'];
