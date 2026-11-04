export const STORE='ram-aangan-contributions-v2',DRAFT='ram-aangan-journey-draft-v2',EVENTS='ram-aangan-events-v1';
export const LEGACY='ram-aangan-stones-browser-v1';
export const empty=()=>({version:2,orders:[],reservations:{}});
export function read(storage,key,fallback={}){try{return JSON.parse(storage.getItem(key))||fallback;}catch{return fallback;}}
export function money(minor){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(minor/100);}
export function active(order,now=Date.now()){return order.kind==='diya'&&order.status==='demo-completed'&&now<order.endsAt;}
export function cleanName(value){return String(value||'').trim().normalize('NFC').slice(0,64);}
export function occupied(state,now=Date.now(),except=''){const ids=new Set(state.orders.filter(o=>o.kind!=='diya').flatMap(o=>o.slots||[]));for(const [token,r] of Object.entries(state.reservations||{}))if(token!==except&&r.until>now)for(const id of r.slots)ids.add(id);return ids;}
export function chooseSlots(candidates,count,state,now=Date.now(),except=''){const used=occupied(state,now,except);for(const group of candidates){if(group.length>=count&&group.slice(0,count).every(id=>!used.has(id)))return group.slice(0,count);}throw Error('Those places are being previewed. Choose another location; your names are safe.');}
export function reserve(state,{token,slots,product,kind},now=Date.now()){if(!slots.length||new Set(slots).size!==slots.length)throw Error('Choose a valid place.');const used=occupied(state,now,token);if(slots.some(id=>used.has(id)))throw Error('This place was just reserved in another tab. Please choose another location.');const next=structuredClone(state);next.reservations??={};for(const [id,r] of Object.entries(next.reservations))if(r.until<=now)delete next.reservations[id];next.reservations[token]={slots,product,kind,until:now+5*60*1000};return next;}
export function release(state,token){const next=structuredClone(state);delete next.reservations[token];return next;}
export function completeDemo(state,draft,product,now=Date.now()){
 const next=structuredClone(state);if(next.orders.some(o=>o.token===draft.token))return next;
 if(!product||product.id!==draft.product||!Number.isInteger(product.amountMinor))throw Error('Please review the selected package.');
 if(draft.kind!=='diya'){const r=state.reservations[draft.token];if(!r||r.until<=now||JSON.stringify(r.slots)!==JSON.stringify(draft.slots))throw Error('Your preview hold expired. Review again; your names are safe.');const used=occupied(state,now,draft.token);if(draft.slots.some(id=>used.has(id)))throw Error('That location is no longer available. Choose another place.');}
 const order={id:'DEMO-'+draft.token,token:draft.token,kind:draft.kind,product:product.id,amountMinor:product.amountMinor,currency:'INR',names:(draft.names||[]).map(cleanName),species:draft.species||null,slots:[...(draft.slots||[])],design:draft.design||0,status:'demo-completed',paymentStatus:'not-paid',createdAt:now};
 if(draft.kind==='diya'){order.position=draft.position||0;order.startedAt=now;order.endsAt=now+(draft.testSeconds||product.durationSeconds)*1000;order.durationSeconds=draft.testSeconds||product.durationSeconds;}
 next.orders.push(order);delete next.reservations[draft.token];return next;
}
export async function transaction(storage,fn){if(!navigator.locks)throw Error('This browser cannot safely coordinate demo placement. Open the hosted site in a current browser.');return navigator.locks.request('ram-aangan-contribution-allocation',()=>{const next=fn(read(storage,STORE,empty()));storage.setItem(STORE,JSON.stringify(next));return next;});}
export function event(storage,type,kind,detail={}){try{const events=read(storage,EVENTS,[]);events.push({type,kind,at:Date.now(),...detail});storage.setItem(EVENTS,JSON.stringify(events.slice(-250)));}catch{}}
