import {createHash} from 'node:crypto';
import manifest from '../public/unit-manifest.mjs';
import catalogue from '../public/products-v5.mjs';
import {unitsFor} from '../public/construction-groups.mjs';
const schema='ram_mandir';
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
export function createPaymentStore(sql,gateway){
 let initialized;
 async function init(){if(!initialized)initialized=sql.unsafe(`CREATE TABLE IF NOT EXISTS ${schema}.temple_payments (id text PRIMARY KEY,recovery_hash text NOT NULL,edition text NOT NULL,order_ids jsonb NOT NULL,amount bigint NOT NULL,provider_order text UNIQUE,payment_id text UNIQUE,state text NOT NULL DEFAULT 'created',created_at bigint NOT NULL,updated_at bigint NOT NULL); CREATE INDEX IF NOT EXISTS temple_payments_order_ids ON ${schema}.temple_payments USING GIN(order_ids); CREATE INDEX IF NOT EXISTS temple_payments_owner ON ${schema}.temple_payments(recovery_hash,edition,state); UPDATE ${schema}.temple_payments SET order_ids=(order_ids #>> '{}')::jsonb WHERE jsonb_typeof(order_ids)='string'; ALTER TABLE ${schema}.temple_payments ENABLE ROW LEVEL SECURITY; REVOKE ALL ON ${schema}.temple_payments FROM PUBLIC,anon,authenticated;`).catch(e=>{initialized=null;throw e;});return initialized;}
 const rows=async(tx,q,args=[])=>{const result=await tx.unsafe(q,args);for(const row of result)if(typeof row.order_ids==='string')row.order_ids=JSON.parse(row.order_ids);return result;};
 async function owned(tx,id,key){const [s]=await rows(tx,`SELECT * FROM ${schema}.temple_payments WHERE id=$1 AND recovery_hash=$2 AND edition=$3 FOR UPDATE`,[id,key,manifest.edition]);if(!s)fail('This payment reference was not found',404);return s;}
 async function output(s){return {sessionId:s.id,keyId:gateway.publicKey,orderId:s.provider_order,amount:Number(s.amount),currency:'INR',state:s.state};}
 async function start(ids,key){
  if(!gateway.configured)fail('Payments are being prepared Please return shortly',503);
  if(!Array.isArray(ids)||ids.length<1||ids.length>8||ids.some(id=>typeof id!=='string'||!/^[A-Za-z0-9-]{16,80}$/.test(id))||new Set(ids).size!==ids.length)fail('Please review your contribution again',400);
  await init();ids=[...ids].sort();const id=createHash('sha256').update(key+'|'+ids.join('|')).digest('hex').slice(0,32);
  return sql.begin(async tx=>{
   await rows(tx,'SELECT pg_advisory_xact_lock(hashtext($1))',['payment:'+id]);
   const [previous]=await rows(tx,`SELECT * FROM ${schema}.temple_payments WHERE id=$1`,[id]);if(previous)return output(previous);
   const orders=await rows(tx,`SELECT * FROM ${schema}.temple_orders WHERE id IN (SELECT jsonb_array_elements_text(($1::text)::jsonb)) ORDER BY id FOR UPDATE`,[JSON.stringify(ids)]);
   if(orders.length!==ids.length||orders.some(o=>o.recovery_hash!==key||o.edition!==manifest.edition||o.payment_mode!=='live'||!['reserved','payment_pending'].includes(o.state)))fail('Your basket is no longer available Please review it again');
   const now=Date.now();if(orders.some(o=>Number(o.created_at)+300000<=now))fail('Your preview hold expired Please review again');
   const a=await rows(tx,`SELECT * FROM ${schema}.temple_allocations WHERE order_id IN (SELECT jsonb_array_elements_text(($1::text)::jsonb)) FOR UPDATE`,[JSON.stringify(ids)]);if(a.length!==ids.length||a.some(r=>Number(r.expires_at)<=now))fail('A selected place is no longer available Please review again');
   const amount=orders.reduce((n,o)=>n+Number(o.amount_minor),0);
   const provider=await gateway.createOrder({amount,receipt:id});
   const [session]=await rows(tx,`INSERT INTO ${schema}.temple_payments(id,recovery_hash,edition,order_ids,amount,provider_order,created_at,updated_at) VALUES($1,$2,$3,($4::text)::jsonb,$5,$6,$7,$7) RETURNING *`,[id,key,manifest.edition,JSON.stringify(ids),amount,provider.id,now]);
   await rows(tx,`UPDATE ${schema}.temple_allocations SET expires_at=$1 WHERE order_id IN (SELECT jsonb_array_elements_text(($2::text)::jsonb)) AND confirmed_at=0`,[now+3600000,JSON.stringify(ids)]);
   return output(session);
  });
 }
 async function fulfill(sessionId,payment){
  await init();return sql.begin(async tx=>{
   // All fulfilments serialize; reserves still use their atomic allocation constraint.
   await rows(tx,'SELECT pg_advisory_xact_lock(hashtext($1))',['temple-paid-fulfilment:'+manifest.edition]);
   const [s]=await rows(tx,`SELECT * FROM ${schema}.temple_payments WHERE id=$1 FOR UPDATE`,[sessionId]);if(!s)fail('Payment reference was not found',404);
   if(payment.order_id!==s.provider_order||payment.amount!==Number(s.amount)||payment.currency!=='INR'||payment.status!=='captured'||payment.captured!==true||Number(payment.amount_refunded||0)!==0)fail('Payment is still awaiting capture');
   if(s.state==='paid')return output(s);
   if(s.payment_id&&s.payment_id!==payment.id)fail('A different payment is already recorded');
   const orders=await rows(tx,`SELECT * FROM ${schema}.temple_orders WHERE id IN (SELECT jsonb_array_elements_text(($1::text)::jsonb)) ORDER BY id FOR UPDATE`,[JSON.stringify(s.order_ids)]);
   const now=Date.now();let unavailable=false;
   for(const o of orders){
    const [allocation]=await rows(tx,`SELECT * FROM ${schema}.temple_allocations WHERE unit_id=$1 FOR UPDATE`,[o.unit_id]);
    if(allocation?.order_id===o.id)continue;
    // A delayed captured payment may arrive after the preview hold expires.
    const candidates=(o.kind==='brick'?unitsFor(manifest,o.product):o.kind==='plant'?catalogue.gardenSlots.filter(x=>x.size===catalogue.plants.find(p=>p.id===o.product)?.size):[{id:'shared-diya-'+o.position}]).map(u=>manifest.edition+':'+u.id);
    let chosen;
    for(const unit of candidates){const result=await rows(tx,`INSERT INTO ${schema}.temple_allocations(unit_id,order_id,expires_at,confirmed_at) VALUES($1,$2,$3,0) ON CONFLICT(unit_id) DO UPDATE SET order_id=EXCLUDED.order_id,expires_at=EXCLUDED.expires_at WHERE ${schema}.temple_allocations.confirmed_at=0 AND ${schema}.temple_allocations.expires_at<=$4 RETURNING unit_id`,[unit,o.id,now+3600000,now]);if(result.length){chosen=unit;break;}}
    if(!chosen){unavailable=true;break;}await rows(tx,`UPDATE ${schema}.temple_orders SET unit_id=$1 WHERE id=$2`,[chosen,o.id]);o.unit_id=chosen;
   }
   if(unavailable||orders.length!==s.order_ids.length){const [pending]=await rows(tx,`UPDATE ${schema}.temple_payments SET state='needs_attention',payment_id=$1,updated_at=$2 WHERE id=$3 RETURNING *`,[payment.id,now,s.id]);return output(pending);}
   for(const o of orders){const end=o.kind==='diya'?now+Number(o.duration_seconds)*1000:null;
    await rows(tx,`UPDATE ${schema}.temple_allocations SET confirmed_at=$1,expires_at=$2 WHERE order_id=$3`,[o.kind==='diya'?0:now,end||0,o.id]);
    await rows(tx,`UPDATE ${schema}.temple_orders SET state='confirmed',updated_at=$1,starts_at=$2,ends_at=$3 WHERE id=$4`,[now,o.kind==='diya'?now:null,end,o.id]);
   }
   const [paid]=await rows(tx,`UPDATE ${schema}.temple_payments SET state='paid',payment_id=$1,updated_at=$2 WHERE id=$3 RETURNING *`,[payment.id,now,s.id]);return output(paid);
  });
 }
 async function verify(id,key,input){await init();const s=await sql.begin(tx=>owned(tx,id,key));const payment=await gateway.verifyPayment({orderId:s.provider_order,paymentId:input.razorpay_payment_id,signature:input.razorpay_signature,amount:Number(s.amount)});return fulfill(id,payment);}
 async function status(id,key){await init();const s=await sql.begin(tx=>owned(tx,id,key));if(s.state==='paid')return output(s);const payments=await gateway.orderPayments(s.provider_order);const p=payments.find(p=>p.status==='captured'&&p.captured===true&&p.amount===Number(s.amount)&&p.currency==='INR'&&!Number(p.amount_refunded||0));return p?fulfill(id,p):output({...s,state:payments.some(p=>p.status==='authorized')?'processing':s.state});}
 async function webhook(raw,signature){const event=gateway.verifyWebhook(raw,signature);if(!['payment.captured','order.paid'].includes(event.event))return;const p=event.payload?.payment?.entity;if(!p?.order_id)return;await init();const [s]=await rows(sql,`SELECT * FROM ${schema}.temple_payments WHERE provider_order=$1 AND edition=$2`,[p.order_id,manifest.edition]);if(s){const payments=await gateway.capturedPayments(s.provider_order),paid=payments.find(x=>x.id===p.id);if(paid)await fulfill(s.id,paid);}}
 async function isBound(orderId){await init();const [s]=await rows(sql,`SELECT id FROM ${schema}.temple_payments WHERE order_ids @> ($1::text)::jsonb LIMIT 1`,[JSON.stringify([orderId])]);return !!s;}
 async function sessionForOrder(orderId){await init();const [s]=await rows(sql,`SELECT id FROM ${schema}.temple_payments WHERE order_ids @> ($1::text)::jsonb LIMIT 1`,[JSON.stringify([orderId])]);return s?.id||null;}
 async function reconcileOrder(orderId){if(!/^order_[A-Za-z0-9]+$/.test(orderId||''))fail('Invalid payment reference',400);await init();const [s]=await rows(sql,`SELECT * FROM ${schema}.temple_payments WHERE provider_order=$1 AND edition=$2`,[orderId,manifest.edition]);if(!s)fail('This payment order is not linked to a temple dedication',404);if(s.state==='paid')return {state:'paid'};const captured=await gateway.capturedPayments(orderId);const payment=captured.find(p=>p.amount===Number(s.amount)&&p.currency==='INR'&&!Number(p.amount_refunded||0));if(!payment)return {state:'pending'};const result=await fulfill(s.id,payment);return {state:result.state};}
 return {start,verify,status,webhook,isBound,sessionForOrder,reconcileOrder};
}
