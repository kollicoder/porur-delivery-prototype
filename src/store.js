import { useState, useEffect } from 'react';
export function useLS(key, init) {
  const [v, setV] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; } });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(v)); }, [key, v]);
  return [v, setV];
}
export const STEPS = ['Placed','Accepted','Picked up','On the way','Delivered'];
export const seedOrders = () => [
  { id:'PD1042', customer:'Lakshmi R', address:'Flat 3B, Ramaniyam Apts, Porur', items:[['Tomato',2],['Aavin Milk (Toned)',1],['Ponni Rice',5]], total:439, pay:'UPI', status:1, rider:'r1', otp:'4821', type:'order', time:'09:12' },
  { id:'PD1043', customer:'Ganesh K', address:'12, Kundrathur Main Rd', items:[['Paracetamol 500mg (10 tabs)',2],['ORS Sachet',4]], total:153, pay:'COD', status:3, rider:'r2', otp:'1904', type:'order', time:'09:20' },
  { id:'ER2001', customer:'Priya S', address:'Drop: Ramachandra Hospital gate', items:[['Errand: Pick up file from Iyyappanthangal',1]], total:99, pay:'UPI', status:2, rider:'r4', otp:'7733', type:'errand', time:'09:31' },
  { id:'PD1044', customer:'Mohan V', address:'Gerugambakkam, 2nd St', items:[['Banana (Robusta)',1],['Apple (Shimla)',1],['Bread',1]], total:310, pay:'UPI', status:0, rider:'r1', otp:'5560', type:'order', time:'09:40' },
];
