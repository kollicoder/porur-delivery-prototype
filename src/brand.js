/** BRAND — single constant. FINAL NAME NOT DECIDED: 'ding-dong' is the design placeholder. Override with VITE_BRAND_NAME at build time. */
export const BRAND = { name: import.meta.env.VITE_BRAND_NAME || 'ding-dong', area: 'Porur, Chennai 600116' };
/** Demo-only helpers are visible only in dev, emulator, or with ?test=1 */
export const isTestMode = () => import.meta.env.DEV || /[?&]test=1/.test(location.search + location.hash);
