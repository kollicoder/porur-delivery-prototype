export const STORES = [
  { id: 's1', name: 'Porur Fresh Fruits & Veg', cat: 'fv', eta: '20-30 min', rating: 4.5, open: '5 AM – 11 PM', lat: 13.0359, lng: 80.1574 },
  { id: 's2', name: 'Sri Murugan Supermarket', cat: 'grocery', eta: '25-35 min', rating: 4.3, open: '24 x 7 (via hub)', lat: 13.0382, lng: 80.1617 },
  { id: 's3', name: 'Porur Pharmacy (tie-up)', cat: 'med', eta: '20-30 min', rating: 4.7, open: '24 x 7', lat: 13.0331, lng: 80.1532 },
];
export const PRODUCTS = [
  { id:'p1', store:'s1', cat:'fv', name:'Tomato', ta:'தக்காளி', unit:'kg', price:32, emoji:'🍅', kw:['tomato','thakkali','தக்காளி'] },
  { id:'p2', store:'s1', cat:'fv', name:'Onion', ta:'வெங்காயம்', unit:'kg', price:38, emoji:'🧅', kw:['onion','vengayam','வெங்காயம்'] },
  { id:'p3', store:'s1', cat:'fv', name:'Potato', ta:'உருளைக்கிழங்கு', unit:'kg', price:35, emoji:'🥔', kw:['potato','urulai','உருளைக்கிழங்கு','உருளை'] },
  { id:'p4', store:'s1', cat:'fv', name:'Banana (Robusta)', ta:'வாழைப்பழம்', unit:'dozen', price:60, emoji:'🍌', kw:['banana','vazhaipazham','வாழைப்பழம்'] },
  { id:'p5', store:'s1', cat:'fv', name:'Apple (Shimla)', ta:'ஆப்பிள்', unit:'kg', price:180, emoji:'🍎', kw:['apple','ஆப்பிள்'] },
  { id:'p6', store:'s1', cat:'fv', name:'Coriander', ta:'கொத்தமல்லி', unit:'bunch', price:10, emoji:'🌿', kw:['coriander','kothamalli','கொத்தமல்லி'] },
  { id:'p7', store:'s2', cat:'grocery', name:'Aavin Milk (Toned)', ta:'பால்', unit:'litre', price:44, emoji:'🥛', kw:['milk','paal','பால்'] },
  { id:'p8', store:'s2', cat:'grocery', name:'Ponni Rice', ta:'அரிசி', unit:'kg', price:62, emoji:'🍚', kw:['rice','arisi','அரிசி'] },
  { id:'p9', store:'s2', cat:'grocery', name:'Toor Dal', ta:'துவரம் பருப்பு', unit:'kg', price:150, emoji:'🫘', kw:['dal','paruppu','பருப்பு'] },
  { id:'p10', store:'s2', cat:'grocery', name:'Eggs', ta:'முட்டை', unit:'dozen', price:84, emoji:'🥚', kw:['egg','eggs','muttai','முட்டை'] },
  { id:'p11', store:'s2', cat:'grocery', name:'Bread', ta:'ரொட்டி', unit:'pack', price:45, emoji:'🍞', kw:['bread','rotti','ரொட்டி'] },
  { id:'p12', store:'s2', cat:'grocery', name:'Sunflower Oil', ta:'எண்ணெய்', unit:'litre', price:155, emoji:'🛢️', kw:['oil','ennai','எண்ணெய்'] },
  { id:'p13', store:'s2', cat:'grocery', name:'Sugar', ta:'சர்க்கரை', unit:'kg', price:46, emoji:'🧂', kw:['sugar','sakkarai','சர்க்கரை'] },
  { id:'p14', store:'s3', cat:'med', name:'Paracetamol 500mg (10 tabs)', ta:'பாராசிட்டமால்', unit:'strip', price:20, emoji:'💊', kw:['paracetamol','dolo','crocin','பாராசிட்டமால்'] },
  { id:'p15', store:'s3', cat:'med', name:'ORS Sachet', ta:'ஓஆர்எஸ்', unit:'sachet', price:22, emoji:'🧃', kw:['ors'] },
  { id:'p16', store:'s3', cat:'med', name:'Amoxicillin 500mg (Rx)', ta:'அமாக்ஸிசிலின்', unit:'strip', price:95, emoji:'💊', kw:['amoxicillin'], rx:true },
  { id:'p17', store:'s3', cat:'med', name:'Band-aid (20 pcs)', ta:'பேண்டேஜ்', unit:'pack', price:50, emoji:'🩹', kw:['bandaid','band-aid','plaster'] },
  { id:'p18', store:'s3', cat:'med', name:'Digital Thermometer', ta:'தெர்மாமீட்டர்', unit:'piece', price:199, emoji:'🌡️', kw:['thermometer','தெர்மாமீட்டர்'] },
];
export const RIDERS = [
  ['Karthik','online'],['Suresh','delivering'],['Prakash','online'],['Murali','delivering'],['Arun','offline'],
  ['Vijay','online'],['Senthil','delivering'],['Ramesh','break'],['Dinesh','online'],['Bala','offline'],
].map(([name,status],i)=>({ id:'r'+(i+1), name, status, phone:'98400 1'+(1000+i*37), today: [6,9,4,11,0,7,8,5,3,0][i] }));
// Live values (overwritten in place by Firestore settings/app — see live.js)
export const SETTINGS = { fee:25, min:199, free:499, radius:5, nightFrom:'23:00', nightTo:'06:00', nightMedOnly:true, errandBase:99, errandHour:249, errandPerKm:12, zones:{ Porur:true, Ramapuram:true, Valasaravakkam:true, Mangadu:false, Iyyappanthangal:true } };
export const deliveryFee = (sub) => (sub >= SETTINGS.free ? 0 : SETTINGS.fee);
export const NUMWORDS = { one:1,two:2,three:3,four:4,five:5,half:0.5,oru:1,rendu:2,moonu:3,naalu:4,anju:5,'ஒரு':1,'ஒன்று':1,'இரண்டு':2,'ரெண்டு':2,'மூன்று':3,'நான்கு':4,'ஐந்து':5,'அரை':0.5 };
export function parseOrder(text) {
  const parts = text.toLowerCase().split(/,|\band\b|\bum\b|மற்றும்|\n/).map(s=>s.trim()).filter(Boolean);
  const items = [], unknown = [];
  for (const part of parts) {
    const p = PRODUCTS.find(pr => pr.kw.some(k => part.includes(k)));
    if (!p) { unknown.push(part); continue; }
    let qty = 1; const m = part.match(/(\d+(\.\d+)?)/);
    if (m) qty = parseFloat(m[1]); else { for (const [w,n] of Object.entries(NUMWORDS)) if (part.split(/\s+/).includes(w)) { qty=n; break; } }
    items.push({ product: p, qty });
  }
  return { items, unknown };
}
