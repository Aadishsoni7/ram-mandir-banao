import manifest from '../public/unit-manifest.mjs';
import catalogue from '../public/products-v5.mjs';
import {unitsFor} from '../public/construction-groups.mjs';
export const EDITION=manifest.edition;
const confirmed=o=>o&&['confirmed','placement_presented'].includes(o.state);
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const publicHeaders={...headers,'Cache-Control':'public, max-age=0, must-revalidate','Vercel-CDN-Cache-Control':'public, s-maxage=10, stale-while-revalidate=20'};
const json=(data,status=200)=>new Response(JSON.stringify({...data,serverTime:Date.now(),demo:false,paymentEnabled:true}),{status,headers});
const issue=(message,status=400)=>{const error=new Error(message);error.status=status;throw error;};
async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function publicOrder(o){if(!o)return null;return {id:o.id,edition:o.edition,kind:o.kind,product:o.product,unitId:o.unit_id?.startsWith(EDITION+':')?o.unit_id.slice(EDITION.length+1):o.unit_id,name:o.anonymous?'':o.name,anonymous:!!o.anonymous,amountMinor:o.amount_minor,currency:'INR',state:o.state,demo:false,paymentStatus:confirmed(o)?'paid':'pending',createdAt:o.created_at,updatedAt:o.updated_at,presentedAt:o.presented_at,startsAt:o.starts_at,endsAt:o.ends_at,durationSeconds:o.duration_seconds,position:o.position};}
async function identity(request){const key=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(key))issue('Your recovery key is missing. Reload to create a browser recovery key.',401);return hash(key);}
async function body(request){const raw=await request.text();if(raw.length>4096)issue('This request is too large.',413);try{return JSON.parse(raw);}catch{issue('The request could not be read.');}}
function productFor(kind,id){const group=catalogue[kind==='brick'?'bricks':kind==='plant'?'plants':'diyas'];return group?.find(p=>p.id===id);}
async function mineOrder(db,id,key){const o=await db.prepare('SELECT * FROM temple_orders WHERE id=? AND recovery_hash=? AND edition=?').bind(id,key,EDITION).first();if(!o)issue('This contribution was not found for your recovery key.',404);return o;}
export async function templeService(request,env){
 let reserveId=null,recoveryHash=null;
 try{
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/temple\/?/,'');
 if(request.method==='POST'&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)issue('Please submit from this temple website.',403);
 if(path==='time')return json({});
 if(path==='catalogue')return json({catalogue});
 if(path==='payment-webhook')return json({error:'Real payment verification is not configured. No payment or fulfilment is accepted by this endpoint.'},501);
 const db=env.DB;if(!db)return json({error:'Shared records are temporarily unavailable. Please retry; no payment has been taken.'},503);
 if(path==='contributors'&&request.method==='GET'){
  const cursor=url.searchParams.get('before');let before=null;if(cursor){const match=/^(\d{10,16})\.([a-zA-Z0-9-]{16,80})$/.exec(cursor);if(!match)issue('Invalid contribution page.');before=[Number(match[1]),match[2]];}
  const rows=await db.prepare("SELECT * FROM temple_orders WHERE edition=? AND state IN ('confirmed','placement_presented')"+(before?' AND (created_at<? OR (created_at=? AND id<?))':'')+" ORDER BY created_at DESC,id DESC LIMIT 31").bind(EDITION,...(before?[before[0],before[0],before[1]]:[])).all();
  const all=rows.results||[],page=all.slice(0,30),last=page.at(-1);const response=json({contributors:page.map(publicOrder),nextCursor:all.length>30?last.created_at+'.'+last.id:null,paidAmountMinor:page.reduce((sum,o)=>sum+o.amount_minor,0),currency:'INR'});for(const [key,value] of Object.entries(publicHeaders))response.headers.set(key,value);return response;
 }
 if(path==='snapshot'&&request.method==='GET'){
  const result=await db.prepare("SELECT * FROM temple_orders WHERE edition=? AND state IN ('confirmed','placement_presented') AND (kind!='diya' OR ends_at>?) ORDER BY created_at,id").bind(EDITION,Date.now()).all();
  const all=result.results||[],bricks=all.filter(o=>o.kind==='brick'),revision=all.reduce((n,o)=>Math.max(n,o.updated_at),0);
  const etag='"live-'+revision+'-'+all.length+'"';if(request.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers:{...publicHeaders,ETag:etag,'X-Server-Time':String(Date.now())}});
  const h={...publicHeaders,ETag:etag};return new Response(JSON.stringify({edition:EDITION,total:manifest.total,confirmed:bricks.map(publicOrder),diyas:all.filter(o=>o.kind==='diya').map(publicOrder),plants:all.filter(o=>o.kind==='plant').map(publicOrder),count:bricks.length,percentage:bricks.length/manifest.total*100,revision,serverTime:Date.now(),demo:false,paymentEnabled:true}),{headers:h});
 }
 if(path.startsWith('public/')&&request.method==='GET'){const id=path.slice(7);const o=await db.prepare("SELECT * FROM temple_orders WHERE id=? AND edition=? AND state IN ('confirmed','placement_presented')").bind(id,EDITION).first();if(!o)issue('This confirmed contribution was not found.',404);return json({order:publicOrder(o)});}
 const key=await identity(request);recoveryHash=key;
 if(path==='mine'&&request.method==='GET'){const r=await db.prepare('SELECT * FROM temple_orders WHERE recovery_hash=? AND edition=? ORDER BY created_at DESC').bind(key,EDITION).all();return json({orders:await Promise.all((r.results||[]).map(async o=>({...publicOrder(o),paymentSession:await env.PAYMENTS.sessionForOrder(o.id)})))});}
 if(request.method!=='POST')issue('This action is unavailable.',405);
 const input=await body(request),now=Date.now();
 if(path==='reserve'){
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(input.id||''))issue('Please start a new preview.');
  reserveId=input.id;
  if('amountMinor' in input||'paymentStatus' in input||'confirmed' in input)issue('Prices and contribution states are determined by the server.');
  const existing=await db.prepare('SELECT * FROM temple_orders WHERE id=?').bind(input.id).first();
  if(existing){if(existing.edition!==EDITION)issue('Please start a new contribution on the fresh temple',409);if(existing.recovery_hash!==key)issue('Please start a new preview.',409);if(existing.state==='cancelled')issue('This checkout was cancelled. Start a fresh review; your name can be kept.',409);return json({order:publicOrder(existing),expiresAt:existing.created_at+300000});}
  const rate=await db.prepare('SELECT COUNT(*) AS n FROM temple_orders WHERE recovery_hash=? AND created_at>?').bind(key,now-60000).first();if(rate?.n>=8)issue('Please pause briefly before starting another contribution.',429);
  const kind=input.kind,product=productFor(kind,input.product);if(!product||!['brick','plant','diya'].includes(kind))issue('Choose an available digital contribution.');
  const name=String(input.name||'').normalize('NFC').trim();if(/[\u0000-\u001f<>]/.test(name))issue('Please use a name without markup or control characters.');
  const count=[...new Intl.Segmenter('hi',{granularity:'grapheme'}).segment(name)].length;if(count>36)issue('Please use up to 36 characters, or a shorter family name.');if(kind==='brick'&&!input.anonymous&&!name)issue('Enter a name or choose the anonymous option.');
  const isAnonymous=kind==='brick'&&!!input.anonymous,position=Number.isInteger(input.position)&&input.position>=0&&input.position<5?input.position:0;
  const duration=kind==='diya'?product.durationSeconds:null;
  if(input.unitId!=null)issue('Building units are assigned automatically. Start a normal brick preview.');
  if(kind==='diya'){const active=await db.prepare("SELECT id FROM temple_orders WHERE edition=? AND kind='diya' AND position=? AND state IN ('confirmed','placement_presented') AND ends_at>?").bind(EDITION,position,now).first();if(active)issue('This diya is already glowing Please choose another diya or return when its time ends',409);}
  const candidateIds=(kind==='diya'?['shared-diya-'+position]:kind==='brick'?unitsFor(manifest,product.id).map(u=>u.id):kind==='plant'?catalogue.gardenSlots.filter(s=>s.size===product.size).map(s=>s.id):[]).map(id=>EDITION+':'+id);
  const insertOrder=unit=>db.prepare('INSERT INTO temple_orders (id,recovery_hash,edition,kind,product,unit_id,name,anonymous,amount_minor,currency,state,payment_mode,created_at,updated_at,duration_seconds,position) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?'+(unit?' WHERE EXISTS (SELECT 1 FROM temple_allocations WHERE unit_id=? AND order_id=?)':''))
    .bind(...[input.id,key,EDITION,kind,product.id,unit||null,isAnonymous?'':name,isAnonymous?1:0,product.amountMinor,'INR','reserved','live',now,now,duration,position,...(unit?[unit,input.id]:[])]);
  
  for(let attempt=0;attempt<12;attempt++){
   const used=await db.prepare('SELECT unit_id FROM temple_allocations WHERE confirmed_at>0 OR expires_at>?').bind(now).all(),occupied=new Set((used.results||[]).map(r=>r.unit_id));const unit=candidateIds.find(id=>!occupied.has(id));if(!unit)issue(input.unitId?'This exact brick is already reserved or contributed. Choose another place.':kind==='brick'?'This construction group has no available units. Choose another shape or retry later.':'These garden beds are full. Existing plants remain saved.',409);
   const rows=await db.batch([db.prepare('INSERT INTO temple_allocations (unit_id,order_id,expires_at,confirmed_at) VALUES (?,?,?,0) ON CONFLICT(unit_id) DO UPDATE SET order_id=excluded.order_id,expires_at=excluded.expires_at WHERE temple_allocations.confirmed_at=0 AND temple_allocations.expires_at<=?').bind(unit,input.id,now+300000,now),insertOrder(unit)]);
   if(rows[1]?.meta?.changes>0)return json({order:publicOrder(await mineOrder(db,input.id,key)),expiresAt:now+300000});
  }issue('That place was just assigned elsewhere. Please retry; your name is kept.',409);
 }
 const order=await mineOrder(db,input.id,key);
 if(path==='cancel'&&await env.PAYMENTS.isBound(order.id))return json({order:publicOrder(order)});
 if(path==='cancel'){if(confirmed(order))issue('A confirmed contribution cannot be cancelled through the preview.',409);await db.batch([db.prepare("UPDATE temple_orders SET state='cancelled',updated_at=? WHERE id=? AND state IN ('reserved','payment_pending')").bind(now,order.id),db.prepare('DELETE FROM temple_allocations WHERE order_id=? AND confirmed_at=0').bind(order.id)]);return json({order:publicOrder(await mineOrder(db,order.id,key))});}
 if(path==='checkout'){
  if(confirmed(order))return json({order:publicOrder(order)});if(order.created_at+300000<=now||order.state==='cancelled')issue('The temporary hold expired. Review again; your name is kept.',409);
  await db.prepare("UPDATE temple_orders SET state='payment_pending',updated_at=? WHERE id=? AND state='reserved'").bind(now,order.id).run();return json({order:publicOrder(await mineOrder(db,order.id,key))});
 }
 if(path==='confirm-demo')return json({error:'A verified Razorpay payment is required'},403);
 if(path==='presented'){if(!confirmed(order))issue('This contribution is not confirmed.',409);await db.prepare("UPDATE temple_orders SET state='placement_presented',presented_at=COALESCE(presented_at,?),updated_at=? WHERE id=? AND state='confirmed'").bind(now,now,order.id).run();return json({order:publicOrder(await mineOrder(db,order.id,key))});}
 issue('This action is unavailable.',404);
 }catch(error){
  // A simultaneous retry may lose the unique-order insert after the first request commits.
  if(!error.status&&reserveId&&recoveryHash&&env.DB){try{const saved=await env.DB.prepare('SELECT * FROM temple_orders WHERE id=? AND recovery_hash=?').bind(reserveId,recoveryHash).first();if(saved&&saved.state!=='cancelled')return json({order:publicOrder(saved),expiresAt:saved.created_at+300000});}catch{}}
  return json({error:error.status?error.message:'Shared records could not be reached. Please retry; no payment has been taken.'},error.status||503);
 }
}
