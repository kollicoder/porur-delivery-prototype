// GENERATED from porur-native/packages/shared/src/models.ts by scripts/sync-models.mjs — do not edit.
const IST_OFFSET = 5.5 * 36e5;
const HOUR = 36e5, DAY = 24 * HOUR;
const istParts = (ms) => {
  const d = new Date(ms + IST_OFFSET);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes() };
};
const istMs = (y, m, d, h = 0, min = 0) => Date.UTC(y, m, d, h, min) - IST_OFFSET;
const istDayNo = (ms) => Math.floor((ms + IST_OFFSET) / DAY);
const istDate = (ms) => new Date(ms + IST_OFFSET).toISOString().slice(0, 10);
const istHourFloat = (ms) => (ms + IST_OFFSET) % DAY / HOUR;
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDay = (ms) => {
  const p = istParts(ms);
  return `${WD[p.dow]} ${p.d} ${MO[p.m]}`;
};
const fmtTime = (ms) => {
  const p = istParts(ms);
  const h = p.h % 12 || 12;
  return `${h}${p.min ? ":" + String(p.min).padStart(2, "0") : ""} ${p.h < 12 ? "am" : "pm"}`;
};
const fmtLeft = (ms) => {
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / HOUR), m = Math.floor(ms % HOUR / 6e4);
  return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${Math.max(1, m)} min`;
};
const rs = (n) => "\u20B9" + Math.round(n).toLocaleString("en-IN");
const r2 = (n) => Math.round(n * 100) / 100;
const METER = {
  threshold: 100,
  minBasket: 300,
  leaderPct: 5,
  floor: 25,
  fillCheckHour: 21,
  cutoffDow: 6,
  cutoffHour: 21,
  fillSlot: "7\u20139 am",
  sundaySlot: "Sun 9\u201311 am",
  fillMarkup: 1.38,
  sundayMarkup: 1.45
};
const sku = (id, name, ta, emoji, unit, step, cost, caseQty, caseUnit, supplier, max) => ({ id, name, ta, emoji, unit, step, cost, sundayPrice: Math.round(cost * METER.sundayMarkup), fillPrice: Math.round(cost * METER.fillMarkup), caseQty, caseUnit, supplier, maxPerHousehold: max });
const STARTER_SKUS = [
  sku("m1", "Onion (big)", "\u0BAA\u0BC6\u0BB0\u0BBF\u0BAF \u0BB5\u0BC6\u0B99\u0BCD\u0B95\u0BBE\u0BAF\u0BAE\u0BCD", "\u{1F9C5}", "kg", 1, 56, 50, "50 kg sack", "Koyambedu \u2013 onion mandi", 5),
  sku("m2", "Tomato", "\u0BA4\u0B95\u0BCD\u0B95\u0BBE\u0BB3\u0BBF", "\u{1F345}", "kg", 1, 30, 15, "15 kg crate", "Koyambedu \u2013 veg", 5),
  sku("m3", "Potato", "\u0B89\u0BB0\u0BC1\u0BB3\u0BC8\u0B95\u0BCD\u0B95\u0BBF\u0BB4\u0B99\u0BCD\u0B95\u0BC1", "\u{1F954}", "kg", 1, 31, 50, "50 kg sack", "Koyambedu \u2013 veg", 5),
  sku("m4", "Carrot", "\u0B95\u0BC7\u0BB0\u0B9F\u0BCD", "\u{1F955}", "kg", 0.5, 38, 10, "10 kg bag", "Koyambedu \u2013 veg", 3),
  sku("m5", "Beans (French)", "\u0BAA\u0BC0\u0BA9\u0BCD\u0BB8\u0BCD", "\u{1FADB}", "kg", 0.5, 65, 10, "10 kg bag", "Koyambedu \u2013 veg", 3),
  sku("m6", "Brinjal", "\u0B95\u0BA4\u0BCD\u0BA4\u0BBF\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BBE\u0BAF\u0BCD", "\u{1F346}", "kg", 0.5, 36, 10, "10 kg bag", "Koyambedu \u2013 veg", 3),
  sku("m7", "Ladies finger", "\u0BB5\u0BC6\u0BA3\u0BCD\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BBE\u0BAF\u0BCD", "\u{1FAD1}", "kg", 0.5, 32, 10, "10 kg bag", "Koyambedu \u2013 veg", 3),
  sku("m8", "Cabbage", "\u0BAE\u0BC1\u0B9F\u0BCD\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BCB\u0BB8\u0BCD", "\u{1F96C}", "kg", 1, 22, 20, "20 kg bag", "Koyambedu \u2013 veg", 3),
  sku("m9", "Cauliflower", "\u0B95\u0BBE\u0BB2\u0BBF\u0B83\u0BAA\u0BBF\u0BB3\u0BB5\u0BB0\u0BCD", "\u{1F966}", "piece", 1, 28, 12, "dozen", "Koyambedu \u2013 veg", 2),
  sku("m10", "Green chilli", "\u0BAA\u0B9A\u0BCD\u0B9A\u0BC8 \u0BAE\u0BBF\u0BB3\u0B95\u0BBE\u0BAF\u0BCD", "\u{1F336}\uFE0F", "kg", 0.25, 60, 5, "5 kg bag", "Koyambedu \u2013 veg", 1),
  sku("m11", "Ginger", "\u0B87\u0B9E\u0BCD\u0B9A\u0BBF", "\u{1FADA}", "kg", 0.25, 90, 5, "5 kg bag", "Koyambedu \u2013 veg", 1),
  sku("m12", "Garlic", "\u0BAA\u0BC2\u0BA3\u0BCD\u0B9F\u0BC1", "\u{1F9C4}", "kg", 0.25, 140, 5, "5 kg bag", "Koyambedu \u2013 veg", 1),
  sku("m13", "Coriander", "\u0B95\u0BCA\u0BA4\u0BCD\u0BA4\u0BAE\u0BB2\u0BCD\u0BB2\u0BBF", "\u{1F33F}", "bunch", 1, 6, 50, "50 bunches", "Koyambedu \u2013 greens", 4),
  sku("m14", "Curry leaves", "\u0B95\u0BB1\u0BBF\u0BB5\u0BC7\u0BAA\u0BCD\u0BAA\u0BBF\u0BB2\u0BC8", "\u{1F331}", "bunch", 1, 4, 50, "50 bunches", "Koyambedu \u2013 greens", 4),
  sku("m15", "Drumstick", "\u0BAE\u0BC1\u0BB0\u0BC1\u0B99\u0BCD\u0B95\u0BC8\u0B95\u0BCD\u0B95\u0BBE\u0BAF\u0BCD", "\u{1F962}", "kg", 0.5, 70, 10, "10 kg bundle", "Koyambedu \u2013 veg", 2),
  sku("m16", "Beetroot", "\u0BAA\u0BC0\u0B9F\u0BCD\u0BB0\u0BC2\u0B9F\u0BCD", "\u{1F7E3}", "kg", 0.5, 34, 10, "10 kg bag", "Koyambedu \u2013 veg", 3),
  sku("m17", "Cucumber", "\u0BB5\u0BC6\u0BB3\u0BCD\u0BB3\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BBE\u0BAF\u0BCD", "\u{1F952}", "kg", 0.5, 30, 10, "10 kg bag", "Koyambedu \u2013 veg", 3),
  sku("m18", "Banana (Robusta)", "\u0BB5\u0BBE\u0BB4\u0BC8\u0BAA\u0BCD\u0BAA\u0BB4\u0BAE\u0BCD", "\u{1F34C}", "dozen", 1, 40, 12, "bunch of 12 dozen", "Koyambedu \u2013 fruit", 3),
  sku("m19", "Apple (Shimla)", "\u0B86\u0BAA\u0BCD\u0BAA\u0BBF\u0BB3\u0BCD", "\u{1F34E}", "kg", 0.5, 120, 10, "10 kg box", "Koyambedu \u2013 fruit", 3),
  sku("m20", "Orange (Nagpur)", "\u0B86\u0BB0\u0B9E\u0BCD\u0B9A\u0BC1", "\u{1F34A}", "kg", 1, 60, 10, "10 kg box", "Koyambedu \u2013 fruit", 3),
  sku("m21", "Papaya", "\u0BAA\u0BAA\u0BCD\u0BAA\u0BBE\u0BB3\u0BBF", "\u{1F96D}", "piece", 1, 35, 10, "10 pcs", "Koyambedu \u2013 fruit", 2),
  sku("m22", "Lemon", "\u0B8E\u0BB2\u0BC1\u0BAE\u0BBF\u0B9A\u0BCD\u0B9A\u0BC8", "\u{1F34B}", "piece", 5, 3, 100, "100 pcs", "Koyambedu \u2013 fruit", 20),
  sku("m23", "Coconut", "\u0BA4\u0BC7\u0B99\u0BCD\u0B95\u0BBE\u0BAF\u0BCD", "\u{1F965}", "piece", 1, 22, 50, "50 pcs", "Koyambedu \u2013 coconut", 4),
  sku("m24", "Ponni rice (raw)", "\u0BAA\u0BCA\u0BA9\u0BCD\u0BA9\u0BBF \u0B85\u0BB0\u0BBF\u0B9A\u0BBF", "\u{1F35A}", "kg", 5, 52, 25, "25 kg bag", "Redhills rice mill (distributor)", 25),
  sku("m25", "Toor dal", "\u0BA4\u0BC1\u0BB5\u0BB0\u0BAE\u0BCD \u0BAA\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1", "\u{1FAD8}", "kg", 1, 118, 30, "30 kg bag", "Kothawal Chavadi \u2013 pulses", 3),
  sku("m26", "Urad dal", "\u0B89\u0BB3\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1", "\u26AA", "kg", 1, 112, 30, "30 kg bag", "Kothawal Chavadi \u2013 pulses", 3),
  sku("m27", "Sugar", "\u0B9A\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB0\u0BC8", "\u{1F9C2}", "kg", 1, 41, 50, "50 kg bag", "Kothawal Chavadi \u2013 grocery", 5),
  sku("m28", "Groundnut oil", "\u0B95\u0B9F\u0BB2\u0BC8 \u0B8E\u0BA3\u0BCD\u0BA3\u0BC6\u0BAF\u0BCD", "\u{1F6E2}\uFE0F", "litre", 1, 165, 15, "15 L tin", "Oil distributor", 5),
  sku("m29", "Tamarind", "\u0BAA\u0BC1\u0BB3\u0BBF", "\u{1F7E4}", "kg", 0.5, 120, 10, "10 kg bag", "Kothawal Chavadi \u2013 grocery", 2),
  sku("m30", "Eggs", "\u0BAE\u0BC1\u0B9F\u0BCD\u0B9F\u0BC8", "\u{1F95A}", "tray of 30", 1, 150, 6, "6 trays", "Namakkal egg agent", 2),
  sku("m31", "Aavin ghee", "\u0BA8\u0BC6\u0BAF\u0BCD", "\u{1F9C8}", "500 ml", 1, 320, 12, "carton of 12", "Aavin distributor", 2),
  sku("m32", "Turmeric powder", "\u0BAE\u0B9E\u0BCD\u0B9A\u0BB3\u0BCD \u0BA4\u0BC2\u0BB3\u0BCD", "\u{1F7E1}", "200 g", 1, 38, 50, "carton of 50", "Spice distributor", 3)
];
const SAMPLE_BASKET = { m1: 2, m2: 2, m3: 2, m4: 0.5, m5: 0.5, m6: 0.5, m7: 0.5 };
const COMMUNITIES = [
  { id: "c1", name: "Ramaniyam Callista", ta: "\u0BB0\u0BAE\u0BA3\u0BBF\u0BAF\u0BAE\u0BCD \u0B95\u0BBE\u0BB2\u0BBF\u0BB8\u0BCD\u0B9F\u0BBE", clusterId: "porur-west", gate: "Gate 2 security cabin", flats: 320, lat: 13.0361, lng: 80.1512 },
  { id: "c2", name: "Prestige Bella Vista", ta: "\u0BAA\u0BBF\u0BB0\u0BC6\u0BB8\u0BCD\u0B9F\u0BC0\u0B9C\u0BCD \u0BAA\u0BC6\u0BB2\u0BCD\u0BB2\u0BBE \u0BB5\u0BBF\u0BB8\u0BCD\u0B9F\u0BBE", clusterId: "porur-west", gate: "Tower A drop zone", flats: 900, lat: 13.0412, lng: 80.1489 },
  { id: "c3", name: "Casagrand Royale", ta: "\u0B95\u0BBE\u0B9A\u0BBE\u0B95\u0BBF\u0BB0\u0BBE\u0BA3\u0BCD\u0B9F\u0BCD \u0BB0\u0BBE\u0BAF\u0BB2\u0BCD", clusterId: "porur-west", gate: "Main gate clubhouse", flats: 410, lat: 13.0318, lng: 80.1561 },
  { id: "c4", name: "Jains Pebble Brook", ta: "\u0B9C\u0BC6\u0BAF\u0BBF\u0BA9\u0BCD\u0BB8\u0BCD \u0BAA\u0BC6\u0BAA\u0BCD\u0BAA\u0BBF\u0BB3\u0BCD \u0BAA\u0BC1\u0BB0\u0BC2\u0B95\u0BCD", clusterId: "porur-west", gate: "Gate 1 visitor bay", flats: 260, lat: 13.0447, lng: 80.1555 }
];
const CLUSTERS = { "porur-west": "Porur West cluster" };
function nextCutoffMs(now = Date.now()) {
  const p = istParts(now);
  const add = (METER.cutoffDow - p.dow + 7) % 7;
  let ms = istMs(p.y, p.m, p.d + add, METER.cutoffHour);
  if (ms <= now) ms = istMs(p.y, p.m, p.d + add + 7, METER.cutoffHour);
  return ms;
}
const sundayDeliveryMs = (cutoffMs) => cutoffMs + 12 * HOUR;
const cycleIdFor = (cutoffMs) => "wk-" + istDate(cutoffMs);
function basketTotals(lines, skus) {
  const ls = [];
  for (const l of lines) {
    const k = skus.find((x) => x.id === l.skuId);
    if (!k || !(l.qty > 0)) continue;
    ls.push({ skuId: k.id, name: k.name, ta: k.ta, emoji: k.emoji, unit: k.unit, qty: l.qty, sundayPrice: k.sundayPrice, fillPrice: k.fillPrice });
  }
  const sundayTotal = Math.round(ls.reduce((a, l) => a + l.sundayPrice * l.qty, 0)), fillTotal = Math.round(ls.reduce((a, l) => a + l.fillPrice * l.qty, 0));
  return { lines: ls, sundayTotal, fillTotal, saving: sundayTotal - fillTotal, ok: sundayTotal >= METER.minBasket, short: Math.max(0, METER.minBasket - sundayTotal) };
}
function meterForecast(m, now = Date.now()) {
  const left = Math.max(0, m.threshold - m.count), pct = Math.min(100, Math.round(m.count / m.threshold * 100));
  const sundayMs = sundayDeliveryMs(m.cutoffMs);
  if (m.status !== "open") return {
    left,
    pct,
    pace: 0,
    certain: true,
    fillMs: void 0,
    deliveryMs: m.deliveryMs ?? sundayMs,
    sundayMs,
    text: m.status === "filled" ? `Batch closed at ${m.threshold} \xB7 delivery ${fmtDay(m.deliveryMs ?? sundayMs)} ${METER.fillSlot}` : `Sunday buy \xB7 delivery ${fmtDay(m.deliveryMs ?? sundayMs)} 9\u201311 am`
  };
  const hrs = (now - m.openedMs) / HOUR, pace = hrs > 0 ? m.count / hrs : 0;
  if (left === 0) {
    const p = istParts(now);
    let check2 = istMs(p.y, p.m, p.d, METER.fillCheckHour);
    if (check2 < now) check2 += DAY;
    const del2 = istMs(istParts(check2 + DAY).y, istParts(check2 + DAY).m, istParts(check2 + DAY).d, 7);
    return { left, pct, pace, certain: true, fillMs: now, deliveryMs: del2, sundayMs, text: `Full! Closes ${fmtTime(check2)} today \xB7 delivery ${fmtDay(del2)} ${METER.fillSlot}` };
  }
  if (m.count < 5 || hrs < 12 || pace <= 0) return { left, pct, pace, certain: false, fillMs: void 0, deliveryMs: sundayMs, sundayMs, text: `Delivery ${fmtDay(sundayMs)} 9\u201311 am (Sunday buy) \u2014 or sooner if the meter fills` };
  const fillAt = now + left / pace * HOUR;
  if (fillAt >= m.cutoffMs) return { left, pct, pace, certain: true, fillMs: void 0, deliveryMs: sundayMs, sundayMs, text: `At this pace it won't fill before Saturday \u2014 delivery ${fmtDay(sundayMs)} 9\u201311 am at the Sunday price` };
  const fp = istParts(fillAt);
  let check = istMs(fp.y, fp.m, fp.d, METER.fillCheckHour);
  if (check < fillAt) check += DAY;
  const dp = istParts(check + DAY);
  const del = istMs(dp.y, dp.m, dp.d, 7);
  return { left, pct, pace, certain: true, fillMs: fillAt, deliveryMs: del, sundayMs, text: `At the current pace it should fill ${fmtDay(check)} night \u2192 delivery ${fmtDay(del)} ${METER.fillSlot}. Otherwise ${fmtDay(sundayMs)} 9\u201311 am.` };
}
function settleBasket(o, tier, walletBalance2 = 0) {
  const finalAmount = tier === "fill" ? o.fillTotal : o.sundayTotal;
  const refundDue = o.sundayTotal - finalAmount;
  const walletApplied = Math.min(Math.max(0, walletBalance2), finalAmount);
  return {
    finalTier: tier,
    finalAmount,
    refundDue,
    refundTo: o.prepaid ? "wallet" : "not_charged",
    refundStatus: refundDue > 0 ? o.prepaid ? "credited" : "applied" : "none",
    walletApplied,
    amountDue: finalAmount - walletApplied
  };
}
function aggregateSkus(orders, skus) {
  const tot = {};
  orders.filter((o) => o.status !== "cancelled").forEach((o) => o.lines.forEach((l) => tot[l.skuId] = r2((tot[l.skuId] || 0) + l.qty)));
  return Object.entries(tot).map(([id, qty]) => {
    const k = skus.find((x) => x.id === id);
    const caseQty = k?.caseQty || 1;
    const cases = Math.ceil(qty / caseQty - 1e-9);
    return { skuId: id, name: k?.name || id, unit: k?.unit || "", qty, cases, orderQty: cases * caseQty, caseQty, caseUnit: k?.caseUnit || "", supplier: k?.supplier || "Unassigned", estCost: Math.round((k?.cost || 0) * cases * caseQty) };
  }).sort((a, b) => a.supplier.localeCompare(b.supplier) || a.name.localeCompare(b.name));
}
const groupPos = (lines) => lines.reduce((m, l) => {
  var _a;
  return (m[_a = l.supplier] || (m[_a] = [])).push(l), m;
}, {});
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function poCsv(batchId, lines) {
  const rows = [["batch", "supplier", "item", "unit", "ordered_by_households", "case_size", "cases", "order_qty", "est_cost_inr"]];
  lines.forEach((l) => rows.push([batchId, l.supplier, l.name, l.unit, String(l.qty), `${l.caseQty} (${l.caseUnit})`, String(l.cases), String(l.orderQty), String(l.estCost)]));
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}
function pickLists(orders) {
  return orders.filter((o) => o.status !== "cancelled").reduce((m, o) => {
    var _a;
    return (m[_a = o.communityId] || (m[_a] = [])).push(o), m;
  }, {});
}
const leaderEarnings = (orders) => {
  const delivered = orders.filter((o) => o.handoverStatus === "handed" || o.status === "handed");
  const sales = delivered.reduce((a, o) => a + (o.finalAmount ?? o.sundayTotal), 0);
  return { delivered: delivered.length, sales, commission: Math.round(sales * METER.leaderPct) / 100 };
};
const walletBalance = (entries) => entries.reduce((a, e) => a + e.amount, 0);
const shareText = (m, link) => `\u{1F9FA} ${m.clusterName} group buy: ${m.count}/${m.threshold} baskets. Fresh Koyambedu veg & staples at the gate \u2014 price drops when we hit ${m.threshold}. Join: ${link}`;
const LUNCH = { minPacks: 5, minPrice: 130, maxPrice: 150, slot: "12:15\u201312:45", cutoffHour: 20, slotStartH: 12.25 };
const OFFICES = [
  { id: "dlf-b5", name: "DLF Cybercity Manapakkam \u2014 Block 5", short: "DLF Block 5", lat: 13.0213, lng: 80.1771 },
  { id: "dlf-b9", name: "DLF Cybercity Manapakkam \u2014 Block 9", short: "DLF Block 9", lat: 13.0201, lng: 80.1795 },
  { id: "lnt-mm", name: "L&T Business Park, Manapakkam", short: "L&T Manapakkam", lat: 13.0186, lng: 80.1712 },
  { id: "porur-tp", name: "Porur IT Park (Mount-Poonamallee Rd)", short: "Porur IT Park", lat: 13.0355, lng: 80.1631 }
];
const HYGIENE_ITEMS = [["hairnet", "Hairnet, apron & gloves on"], ["surfaces", "Surfaces & vessels cleaned"], ["fridge", "Fridge below 5 \xB0C (checked)"], ["water", "Drinking water from RO / boiled"], ["packed", "Meals packed & sealed, sample kept 48 h"]];
const ONBOARD_ITEMS = [["fssai", "FSSAI registration certificate (\u20B9100/yr)"], ["medical", "Medical fitness certificate"], ["pest", "Kitchen pest-controlled"], ["water", "Potable water source"], ["visit", "Agree to a kitchen visit before day 1"]];
const lunchCutoffMs = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return istMs(y, m - 1, d - 1, LUNCH.cutoffHour);
};
function nextLunchDate(now = Date.now()) {
  for (let i = 1; i < 8; i++) {
    const p = istParts(now + i * DAY);
    const ds = istDate(istMs(p.y, p.m, p.d));
    if (p.dow !== 0 && lunchCutoffMs(ds) > now) return ds;
  }
  return istDate(now + DAY);
}
function lunchTotals(vegPacks, nonVegPacks, menu, now = Date.now()) {
  const packs = vegPacks + nonVegPacks, total = vegPacks * menu.vegPrice + nonVegPacks * (menu.nonVegPrice || 0);
  const errors = [];
  if (packs < LUNCH.minPacks) errors.push(`Minimum ${LUNCH.minPacks} packs per office order (you have ${packs}).`);
  if (nonVegPacks > 0 && !menu.nonVegPrice) errors.push("This cook has no non-veg meal tomorrow.");
  if (menu.booked + packs > menu.capacity) errors.push(`Only ${Math.max(0, menu.capacity - menu.booked)} packs left with this cook.`);
  if (now >= menu.cutoffMs) errors.push("Orders for this day closed at 8 pm yesterday.");
  return { packs, total, errors, ok: !errors.length };
}
const priceOk = (p) => p == null || p >= LUNCH.minPrice && p <= LUNCH.maxPrice;
const SERVICE_FEE = 149, WARRANTY_DAYS = 30;
const SERVICES = [
  { id: "plumber", name: "Plumber", ta: "\u0BAA\u0BBF\u0BB3\u0BAE\u0BCD\u0BAA\u0BB0\u0BCD", emoji: "\u{1F527}", blurb: "Leaks, taps, flush tanks, blocked drains", sla: "Same day", rateCard: [["Tap / mixer replace", 199], ["Flush tank repair", 349], ["Blocked drain", 399], ["Pipe leak (per joint)", 249]] },
  { id: "electrician", name: "Electrician", ta: "\u0B8E\u0BB2\u0B95\u0BCD\u0B9F\u0BCD\u0BB0\u0BC0\u0BB7\u0BBF\u0BAF\u0BA9\u0BCD", emoji: "\u{1F4A1}", blurb: "Petty repairs: switches, fans, lights, MCB trips", sla: "Same day", rateCard: [["Switch / socket", 99], ["Fan install / repair", 249], ["Light fitting", 149], ["MCB / fuse check", 199]] },
  { id: "appliance", name: "Appliance repair", ta: "\u0B9A\u0BBE\u0BA4\u0BA9\u0BAE\u0BCD \u0BAA\u0BB4\u0BC1\u0BA4\u0BC1", emoji: "\u{1F50C}", blurb: "Mixie, washing machine, fridge, geyser, RO", sla: "Next day", rateCard: [["Mixie / grinder", 299], ["Geyser service", 449], ["Washing machine", 499], ["RO service", 399]] },
  { id: "deepclean", name: "Deep cleaning", ta: "\u0B86\u0BB4\u0BCD\u0BA8\u0BCD\u0BA4 \u0B9A\u0BC1\u0BA4\u0BCD\u0BA4\u0BAE\u0BCD", emoji: "\u{1F9FD}", blurb: "Kitchen, bathroom or full-home deep clean (2-person team)", sla: "Next day", rateCard: [["Bathroom", 599], ["Kitchen", 1199], ["1 BHK full home", 2999], ["2 BHK full home", 3999]] }
];
const SLOTS = [["08", "8\u201310 am"], ["10", "10 am\u201312 pm"], ["12", "12\u20132 pm"], ["14", "2\u20134 pm"], ["16", "4\u20136 pm"], ["18", "6\u20138 pm"]];
const JOB_STEPS = [["requested", "Requested"], ["assigned", "Pro assigned"], ["en_route", "On the way"], ["started", "Inspection started"], ["quoted", "Quote sent"], ["quote_approved", "Quote approved"], ["done", "Done"]];
const slotStartMs = (date, slot) => {
  const [y, m, d] = date.split("-").map(Number);
  return istMs(y, m - 1, d, +slot);
};
const jobPayable = (j) => j.inspectionFee + (j.status === "done" || j.status === "quote_approved" ? j.quoteTotal || 0 : 0);
const inWarranty = (j, now = Date.now()) => j.status === "done" && !!j.warrantyUntilMs && now < j.warrantyUntilMs;
const KYC_FIELDS = [["idType", "ID type (Aadhaar / Voter ID / DL)"], ["idLast4", "Last 4 digits of ID"], ["addressProof", "Address proof (type)"], ["policeRef", "Police verification ref. no."], ["eshram", "e-Shram / UAN number"], ["tnelb", "TNELB licence no. (electricians)"]];
const DEALS = { maxPriceRatio: 0.7, minMinutes: 60, maxMinutes: 90, capDeals: 2, capUnits: 20, deliveryFee: 39, radiusKm: 3, quietAfter: 22.5, fromHour: 21, toHour: 23, minRating: 4, maxComplaints7d: 2, runs: ["9:45 pm", "10:30 pm"] };
const AREAS = [["Porur", 13.0382, 80.1565], ["Ramapuram", 13.0317, 80.1817], ["Valasaravakkam", 13.0405, 80.1726], ["Iyyappanthangal", 13.0405, 80.1347], ["Manapakkam", 13.021, 80.177], ["Gerugambakkam", 13.0153, 80.1371]];
const kmBetween = (a, b) => {
  const R = 6371, d = Math.PI / 180, x = (b.lat - a.lat) * d, y = (b.lng - a.lng) * d;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
function shouldPush(p, deal, now = Date.now()) {
  if (!p?.optIn) return "not opted in";
  if (istHourFloat(now) >= DEALS.quietAfter || istHourFloat(now) < 7) return "quiet hours";
  if (p.vegOnly && !deal.veg) return "veg only";
  if (kmBetween(p, deal) > (p.radiusKm || DEALS.radiusKm)) return "too far";
  if (p.lastPushDay === istDayNo(now)) return "already pushed today";
  return "";
}
function validateDeal(d, used = { deals: 0, units: 0 }) {
  const errors = [], warnings = [];
  const pct = d.regularPrice ? Math.round((1 - d.dealPrice / d.regularPrice) * 100) : 0;
  if (!(d.qty >= 1)) errors.push("Quantity must be at least 1.");
  if (!(d.dealPrice > 0)) errors.push("Enter a deal price.");
  if (d.dealPrice > d.regularPrice * DEALS.maxPriceRatio) errors.push(`Deal price must be at least 30% off \u2014 max ${rs(Math.floor(d.regularPrice * DEALS.maxPriceRatio))} for this item.`);
  if (d.minutes < DEALS.minMinutes || d.minutes > DEALS.maxMinutes) errors.push("A deal runs 60\u201390 minutes.");
  if (used.deals + 1 > DEALS.capDeals) errors.push(`Tonight's limit is ${DEALS.capDeals} deals \u2014 you've used ${used.deals}.`);
  if (used.units + d.qty > DEALS.capUnits) errors.push(`Tonight's limit is ${DEALS.capUnits} portions \u2014 ${Math.max(0, DEALS.capUnits - used.units)} left.`);
  if (pct >= 30 && pct < 35) warnings.push("Just above the 30% minimum \u2014 bigger discounts sell faster.");
  return { ok: !errors.length, errors, warnings, pct };
}
const UNITS = {
  zero: 0,
  one: 1,
  a: 1,
  an: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  oru: 1,
  onnu: 1,
  rendu: 2,
  irandu: 2,
  moonu: 3,
  naalu: 4,
  anju: 5,
  aaru: 6,
  ezhu: 7,
  ettu: 8,
  onbadhu: 9,
  pathu: 10,
  padhu: 10,
  "\u0B92\u0BB0\u0BC1": 1,
  "\u0B92\u0BA9\u0BCD\u0BB1\u0BC1": 1,
  "\u0B92\u0BA3\u0BCD\u0BA3\u0BC1": 1,
  "\u0B87\u0BB0\u0BA3\u0BCD\u0B9F\u0BC1": 2,
  "\u0BB0\u0BC6\u0BA3\u0BCD\u0B9F\u0BC1": 2,
  "\u0BAE\u0BC2\u0BA9\u0BCD\u0BB1\u0BC1": 3,
  "\u0BAE\u0BC2\u0BA3\u0BC1": 3,
  "\u0BA8\u0BBE\u0BA9\u0BCD\u0B95\u0BC1": 4,
  "\u0BA8\u0BBE\u0BB2\u0BC1": 4,
  "\u0B90\u0BA8\u0BCD\u0BA4\u0BC1": 5,
  "\u0B85\u0B9E\u0BCD\u0B9A\u0BC1": 5,
  "\u0B86\u0BB1\u0BC1": 6,
  "\u0B8F\u0BB4\u0BC1": 7,
  "\u0B8E\u0B9F\u0BCD\u0B9F\u0BC1": 8,
  "\u0B92\u0BA9\u0BCD\u0BAA\u0BA4\u0BC1": 9,
  "\u0BAA\u0BA4\u0BCD\u0BA4\u0BC1": 10,
  "\u0BAA\u0BA4\u0BBF\u0BA9\u0BCA\u0BA9\u0BCD\u0BB1\u0BC1": 11,
  "\u0BAA\u0BA9\u0BCD\u0BA9\u0BBF\u0BB0\u0BA3\u0BCD\u0B9F\u0BC1": 12,
  "\u0BAA\u0BA4\u0BBF\u0BA9\u0BC8\u0BA8\u0BCD\u0BA4\u0BC1": 15,
  "\u0BAA\u0BA4\u0BBF\u0BA9\u0B9E\u0BCD\u0B9A\u0BC1": 15
};
const TENS = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  irupathu: 20,
  mupathu: 30,
  naarpathu: 40,
  aimbathu: 50,
  arupathu: 60,
  ezhupathu: 70,
  enbathu: 80,
  "\u0B87\u0BB0\u0BC1\u0BAA\u0BA4\u0BC1": 20,
  "\u0BAE\u0BC1\u0BAA\u0BCD\u0BAA\u0BA4\u0BC1": 30,
  "\u0BA8\u0BBE\u0BB1\u0BCD\u0BAA\u0BA4\u0BC1": 40,
  "\u0B90\u0BAE\u0BCD\u0BAA\u0BA4\u0BC1": 50,
  "\u0B85\u0BB1\u0BC1\u0BAA\u0BA4\u0BC1": 60,
  "\u0B8E\u0BB4\u0BC1\u0BAA\u0BA4\u0BC1": 70,
  "\u0B8E\u0BA3\u0BCD\u0BAA\u0BA4\u0BC1": 80,
  "\u0BA4\u0BCA\u0BA3\u0BCD\u0BA3\u0BC2\u0BB1\u0BC1": 90,
  "\u0B87\u0BB0\u0BC1\u0BAA\u0BA4\u0BCD\u0BA4\u0BBF": 20,
  "\u0BAE\u0BC1\u0BAA\u0BCD\u0BAA\u0BA4\u0BCD\u0BA4\u0BBF": 30,
  "\u0BA8\u0BBE\u0BB1\u0BCD\u0BAA\u0BA4\u0BCD\u0BA4\u0BBF": 40,
  "\u0B90\u0BAE\u0BCD\u0BAA\u0BA4\u0BCD\u0BA4\u0BBF": 50,
  "\u0B85\u0BB1\u0BC1\u0BAA\u0BA4\u0BCD\u0BA4\u0BBF": 60,
  "\u0B8E\u0BB4\u0BC1\u0BAA\u0BA4\u0BCD\u0BA4\u0BBF": 70,
  "\u0B8E\u0BA3\u0BCD\u0BAA\u0BA4\u0BCD\u0BA4\u0BBF": 80,
  "\u0BA4\u0BCA\u0BA3\u0BCD\u0BA3\u0BC2\u0BB1\u0BCD\u0BB1\u0BBF": 90
};
const HUNDREDS = { hundred: 100, nooru: 100, "\u0BA8\u0BC2\u0BB1\u0BC1": 100, "\u0BA8\u0BC2\u0BB1\u0BCD\u0BB1\u0BBF": 100, "\u0BA8\u0BC2\u0BA4\u0BCD\u0BA4\u0BBF": 100, irunooru: 200, "\u0B87\u0BB0\u0BC1\u0BA8\u0BC2\u0BB1\u0BC1": 200, "\u0B87\u0BB0\u0BC1\u0BA8\u0BC2\u0BB1\u0BCD\u0BB1\u0BBF": 200, "\u0BAE\u0BC1\u0BA9\u0BCD\u0BA9\u0BC2\u0BB1\u0BC1": 300, "\u0BAE\u0BC1\u0BA9\u0BCD\u0BA9\u0BC2\u0BB1\u0BCD\u0BB1\u0BBF": 300 };
function wordsToNumbers(text) {
  const toks = text.toLowerCase().replace(/₹\s*/g, " \u20B9").replace(/rs\.?\s*(?=\d)/g, "\u20B9").split(/\s+/).filter(Boolean);
  const out = [];
  let acc = null, prevUnit = false;
  const flush = () => {
    if (acc != null) out.push(String(acc));
    acc = null;
    prevUnit = false;
  };
  for (const raw of toks) {
    const t = raw.replace(/[.,!?]+$/, "");
    if (t in HUNDREDS) {
      if (prevUnit && acc != null && acc < 10) acc = acc * 100;
      else acc = (acc || 0) + HUNDREDS[t];
      prevUnit = false;
      continue;
    }
    if (t in TENS) {
      acc = (acc || 0) + TENS[t];
      prevUnit = false;
      continue;
    }
    if (t in UNITS && !(t === "a" || t === "an")) {
      acc = (acc || 0) + UNITS[t];
      prevUnit = true;
      continue;
    }
    if ((t === "a" || t === "an") && acc == null) {
      out.push(raw);
      continue;
    }
    flush();
    out.push(raw);
  }
  flush();
  return out.join(" ");
}
const OFF_RE = /^\s*(?:rs\.?|rupees?|ரூபாய்\S*|roobai|rupa\S*)?\s*(?:off|discount|தள்ளுபடி|குறைவு|kammi|less|கம்மி)/;
const RUPEE_AFTER = /^\s*(?:rs\.?|rupees?|ரூபாய்\S*|roobai|rupa\S*|off|discount|தள்ளுபடி|குறைவு)/;
function parseDeal(text, catalogue) {
  let t = wordsToNumbers(text).replace(/(\d)\s*(%|percent|சதவீதம்)/g, "$1%");
  const notes = [];
  let best;
  for (const p of catalogue) for (const k of [p.name.toLowerCase(), ...p.kw || [], ...p.ta ? [p.ta] : []]) if (k && t.includes(k.toLowerCase()) && (!best || k.length > best.len)) best = { p, len: k.length };
  const product = best?.p;
  let minutes = 60;
  const mm = t.match(/(\d+)\s*(?:min|mins|minutes|நிமிட\S*)/), hh = t.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|மணி\S*)/);
  if (mm) {
    minutes = +mm[1];
    t = t.replace(mm[0], " ");
  } else if (hh) {
    minutes = Math.round(+hh[1] * 60);
    t = t.replace(hh[0], " ");
  } else if (/ஒன்றரை மணி|one and a half hour|1 and half hour/.test(t)) minutes = 90;
  let offPct;
  const pm = t.match(/(\d+(?:\.\d+)?)%/);
  if (pm) {
    offPct = +pm[1];
    t = t.replace(pm[0], " % ");
  }
  const nums = [...t.matchAll(/(₹)?\s?(\d+(?:\.\d+)?)/g)].map((m) => ({ v: parseFloat(m[2]), rupee: !!m[1], after: t.slice(m.index + m[0].length, m.index + m[0].length + 30) }));
  const qtyN = nums.find((n) => !n.rupee && !RUPEE_AFTER.test(n.after));
  const qty = qtyN?.v;
  let offRs, dealPrice;
  for (const n of nums) {
    if (n === qtyN) continue;
    if (OFF_RE.test(n.after)) offRs ?? (offRs = n.v);
    else dealPrice ?? (dealPrice = n.v);
  }
  const reg = product?.price;
  if (reg != null && dealPrice == null) {
    if (offPct != null) dealPrice = Math.round(reg * (1 - offPct / 100));
    else if (offRs != null) dealPrice = reg - offRs;
  }
  if (!product) notes.push("Couldn't match an item from your menu \u2014 pick it below.");
  if (qty == null) notes.push('Say how many portions, e.g. "10 biriyani".');
  if (dealPrice == null) notes.push('Say the discount, e.g. "100 off", "40% off" or "at 150".');
  const fulfil = /deliver|டெலிவரி/.test(t) ? "both" : "pickup";
  return { productId: product?.id, item: product?.name, qty, dealPrice, offRs, offPct, minutes: Math.min(DEALS.maxMinutes, Math.max(DEALS.minMinutes, minutes)), regularPrice: reg, fulfil, notes };
}
const FOOD_STORES = [{ id: "s4", name: "Porur Biryani Point", cat: "food", type: "Restaurant (FSSAI licensed)", eta: "Pickup", rating: 4.4, open: "11 AM \u2013 11 PM", commission: 15, lat: 13.0371, lng: 80.159, fssaiNo: "12426999000123" }];
const FOOD_PRODUCTS = [
  { id: "p19", store: "s4", cat: "food", name: "Chicken Biryani", ta: "\u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BA9\u0BCD \u0BAA\u0BBF\u0BB0\u0BBF\u0BAF\u0BBE\u0BA3\u0BBF", unit: "plate", price: 250, emoji: "\u{1F357}", kw: ["biryani", "biriyani", "briyani", "\u0BAA\u0BBF\u0BB0\u0BBF\u0BAF\u0BBE\u0BA3\u0BBF", "chicken biryani"], veg: false },
  { id: "p20", store: "s4", cat: "food", name: "Veg Biryani", ta: "\u0BB5\u0BC6\u0B9C\u0BCD \u0BAA\u0BBF\u0BB0\u0BBF\u0BAF\u0BBE\u0BA3\u0BBF", unit: "plate", price: 180, emoji: "\u{1F35A}", kw: ["veg biryani", "\u0BB5\u0BC6\u0B9C\u0BCD \u0BAA\u0BBF\u0BB0\u0BBF\u0BAF\u0BBE\u0BA3\u0BBF"], veg: true },
  { id: "p21", store: "s4", cat: "food", name: "Parotta + Salna (2 pcs)", ta: "\u0BAA\u0BB0\u0BCB\u0B9F\u0BCD\u0B9F\u0BBE", unit: "set", price: 90, emoji: "\u{1FAD3}", kw: ["parotta", "porotta", "\u0BAA\u0BB0\u0BCB\u0B9F\u0BCD\u0B9F\u0BBE"], veg: false },
  { id: "p22", store: "s4", cat: "food", name: "Veg Meals", ta: "\u0B9A\u0BC8\u0BB5 \u0B9A\u0BBE\u0BAA\u0BCD\u0BAA\u0BBE\u0B9F\u0BC1", unit: "meal", price: 140, emoji: "\u{1F35B}", kw: ["meals", "saapadu", "\u0B9A\u0BBE\u0BAA\u0BCD\u0BAA\u0BBE\u0B9F\u0BC1"], veg: true },
  { id: "p23", store: "s4", cat: "food", name: "Idli (4) + Vada", ta: "\u0B87\u0B9F\u0BCD\u0BB2\u0BBF \u0BB5\u0B9F\u0BC8", unit: "plate", price: 70, emoji: "\u{1F365}", kw: ["idli", "\u0B87\u0B9F\u0BCD\u0BB2\u0BBF"], veg: true },
  { id: "p24", store: "s4", cat: "food", name: "Mutton Chukka", ta: "\u0BAE\u0B9F\u0BCD\u0B9F\u0BA9\u0BCD \u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBE", unit: "plate", price: 320, emoji: "\u{1F356}", kw: ["mutton", "chukka", "\u0BAE\u0B9F\u0BCD\u0B9F\u0BA9\u0BCD"], veg: false }
];
const dealDayNo = istDayNo;
const isDealLive = (d, now = Date.now()) => d.status === "live" && d.expiresAtMs > now && d.qtyLeft > 0;
function vendorQuality(claims, now = Date.now()) {
  const rated = claims.filter((c) => c.rating), avg = rated.length ? rated.reduce((a, c) => a + (c.rating || 0), 0) / rated.length : 0;
  const complaints7d = claims.filter((c) => c.complaint && now - +new Date(c.createdAt) < 7 * DAY).length;
  const pause = rated.length >= 3 && avg < DEALS.minRating || complaints7d >= DEALS.maxComplaints7d;
  return { avg: Math.round(avg * 10) / 10, ratings: rated.length, complaints7d, pause, reason: pause ? complaints7d >= DEALS.maxComplaints7d ? `${complaints7d} complaints in 7 days` : `rating ${avg.toFixed(1)} < 4.0` : "" };
}
const newCode = () => String(1e3 + Math.floor(Math.random() * 9e3));
const newId = (p) => p + Date.now().toString(36).slice(-5).toUpperCase() + Math.floor(Math.random() * 90 + 10);
const WEB_URL = "https://kollicoder.github.io/porur-delivery-prototype/";
const joinLink = (communityId) => `${WEB_URL}#/customer/meter${communityId ? "/" + communityId : ""}`;
export {
  AREAS,
  CLUSTERS,
  COMMUNITIES,
  DAY,
  DEALS,
  FOOD_PRODUCTS,
  FOOD_STORES,
  HOUR,
  HYGIENE_ITEMS,
  IST_OFFSET,
  JOB_STEPS,
  KYC_FIELDS,
  LUNCH,
  METER,
  OFFICES,
  ONBOARD_ITEMS,
  SAMPLE_BASKET,
  SERVICES,
  SERVICE_FEE,
  SLOTS,
  STARTER_SKUS,
  WARRANTY_DAYS,
  WEB_URL,
  aggregateSkus,
  basketTotals,
  cycleIdFor,
  dealDayNo,
  fmtDay,
  fmtLeft,
  fmtTime,
  groupPos,
  inWarranty,
  isDealLive,
  istDate,
  istDayNo,
  istHourFloat,
  istMs,
  istParts,
  jobPayable,
  joinLink,
  kmBetween,
  leaderEarnings,
  lunchCutoffMs,
  lunchTotals,
  meterForecast,
  newCode,
  newId,
  nextCutoffMs,
  nextLunchDate,
  parseDeal,
  pickLists,
  poCsv,
  priceOk,
  settleBasket,
  shareText,
  shouldPush,
  slotStartMs,
  sundayDeliveryMs,
  validateDeal,
  vendorQuality,
  walletBalance,
  wordsToNumbers
};
