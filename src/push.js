/** Expo push service (https://exp.host) called straight from the client — there is no server on the Firebase Spark plan.
 *  Native: normal JSON POST. Web: exp.host sends no CORS headers, so we fire-and-forget with no-cors + text/plain (accepted by Expo). */
export async function sendPushMany(tokens, title, body) {
  const to = [...new Set(tokens.filter((t) => !!t && t.startsWith('ExponentPushToken')))]; if (!to.length) return;
  const isWeb = typeof document !== 'undefined';
  const payload = JSON.stringify(to.map(t => ({ to: t, title, body, sound: 'default', channelId: 'orders', priority: 'high' })));
  try {
    await fetch('https://exp.host/--/api/v2/push/send', isWeb ? { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: payload }
      : { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: payload });
  } catch {}
}
