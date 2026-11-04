export const BRICK_KEY='ram-aangan-stones-browser-v1';
export const DIYA_KEY='ram-aangan-diyas-demo-v1';
export const DIYA_COUNT=5;
export const DEMO_DURATIONS=[30,120,300];
export function readObject(storage,key){try{const v=JSON.parse(storage.getItem(key)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}}
export function brickState({selected=false,name='',serverConfirmed=false,visualDemo=false}={}){if(serverConfirmed)return 'confirmed';if(visualDemo)return 'solid-demo';if(name.trim())return 'preview';return selected?'selected':'available';}
export function saveDraft(records,id,name,meta={},now=Date.now()){name=String(name).trim();if(!name)throw Error('Enter a name first.');return {...records,[id]:{...records[id],...meta,name,status:'draft',paymentStatus:'unconfirmed',updatedAt:now}};}
export function diyaStatus(record,now=Date.now()){return record?.demo===true&&Number.isFinite(record.endsAt)&&record.endsAt>now?'demo-lit':'available';}
export function remainingSeconds(record,now=Date.now()){return diyaStatus(record,now)==='demo-lit'?Math.ceil((record.endsAt-now)/1000):0;}
export function startDemo(records,id,duration,now=Date.now(),token='demo',allowed=DEMO_DURATIONS){if(!Number.isInteger(id)||id<0||id>=DIYA_COUNT)throw Error('Choose one of the five diyas.');if(!Number.isInteger(duration)||duration<5||duration>604800||!allowed.includes(duration))throw Error('Choose an available test duration.');if(diyaStatus(records[id],now)==='demo-lit')throw Error('This diya is already lit. Choose another or wait for it to finish.');return {...records,[id]:{demo:true,paymentStatus:'not-paid',startedAt:now,endsAt:now+duration*1000,token}};}
export function clearDemo(records,id){const next={...records};if(next[id]?.demo===true)delete next[id];return next;}
export function formatRemaining(seconds){const m=Math.floor(seconds/60),s=seconds%60;return `${m}:${String(s).padStart(2,'0')}`;}
export function configuredPrice(config,id){const rate=config?.diya?.rates?.find(r=>r.id===id);if(!rate||!Number.isInteger(rate.amountMinor)||rate.amountMinor<0||!Number.isFinite(rate.durationSeconds)||rate.durationSeconds<=0||!/^[A-Z]{3}$/.test(rate.currency||''))return null;return rate;}
// A local draft, demo click or localStorage field is never proof of payment.
// Production must reserve inventory and verify payment on the server atomically.
