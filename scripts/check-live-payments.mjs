import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
import {createPaymentStore} from '../server/payment-store.mjs';
import {createPostgresDB} from '../server/postgres-adapter.mjs';
import {templeService} from '../server/live-temple-service.mjs';
import manifest from '../public/unit-manifest.mjs';
import {unitsFor} from '../public/construction-groups.mjs';
const pg=new PGlite();await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');await pg.exec(await readFile(new URL('../database/supabase-schema.sql',import.meta.url),'utf8'));
function wrap(db){return {unsafe:async(q,args=[])=>{if(q.startsWith('CREATE TABLE')){await db.exec(q);return [];}for(const match of q.matchAll(/\$(\d+)::jsonb\b/g)){const i=Number(match[1])-1;args[i]=JSON.stringify(args[i]);}const result=await db.query(q,args);for(const row of result.rows)if(Array.isArray(row.order_ids))row.order_ids=JSON.stringify(row.order_ids);result.rows.count=result.affectedRows??result.rows.length;return result.rows;},begin:fn=>db.transaction(tx=>fn(wrap(tx)))};}
const sql=wrap(pg),entities=new Map();let providerCreates=0,checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},reject=async fn=>{await assert.rejects(fn);checks++;};
const gateway={configured:true,publicKey:'rzp_live_fixture',async createOrder({amount,receipt}){providerCreates++;const id='order_fixture'+providerCreates;entities.set(id,{id:'pay_fixture'+providerCreates,order_id:id,amount,currency:'INR',status:'created',captured:false,amount_refunded:0});return{id,amount,currency:'INR',receipt};},async verifyPayment({orderId,amount}){assert.equal(amount,entities.get(orderId).amount);return entities.get(orderId);},async orderPayments(id){return [entities.get(id)];},async capturedPayments(id){return [entities.get(id)].filter(p=>p.status==='captured');},verifyWebhook:raw=>JSON.parse(raw)};
const key='a'.repeat(64),other='b'.repeat(64),store=createPaymentStore(sql,gateway),unitIds=unitsFor(manifest,'brick').map(u=>manifest.edition+':'+u.id);
async function reserve(index,{owner=key,kind='brick',product='brick',age=0}={}){const id=randomUUID(),now=Date.now()-age,unit=kind==='diya'?manifest.edition+':shared-diya-0':unitIds[index];await pg.query(`INSERT INTO ram_mandir.temple_orders(id,recovery_hash,edition,kind,product,unit_id,name,anonymous,amount_minor,currency,state,payment_mode,created_at,updated_at,duration_seconds,position) VALUES($1,$2,$3,$4,$5,$6,'Fixture',0,10100,'INR','payment_pending','live',$7,$7,$8,0)`,[id,owner,manifest.edition,kind,product,unit,now,kind==='diya'?900:null]);await pg.query('INSERT INTO ram_mandir.temple_allocations VALUES($1,$2,$3,0)',[unit,id,now+300000]);return id;}
try{
const ids=[await reserve(0),await reserve(1)],session=await store.start(ids,key);eq(session.amount,20200);eq(session.state,'created');eq(providerCreates,1);
eq((await store.start([...ids].reverse(),key)).sessionId,session.sessionId);eq(providerCreates,1);
await reject(()=>store.start(ids,other));await reject(()=>store.start([ids[0],ids[0]],key));await reject(()=>store.start([],key));
await reject(()=>store.status(session.sessionId,other));
eq((await store.status(session.sessionId,key)).state,'created');
const p=entities.get(session.orderId);p.status='authorized';eq((await store.status(session.sessionId,key)).state,'processing');
await reject(()=>store.verify(session.sessionId,key,{}));
await pg.query("UPDATE ram_mandir.temple_payments SET order_ids=to_jsonb(order_ids::text) WHERE id=$1",[session.sessionId]);
const repaired=createPaymentStore(sql,gateway);eq((await repaired.status(session.sessionId,key)).state,'processing');eq((await pg.query("SELECT jsonb_typeof(order_ids) AS type FROM ram_mandir.temple_payments WHERE id=$1",[session.sessionId])).rows[0].type,'array');
p.status='captured';p.captured=true;eq((await store.verify(session.sessionId,key,{})).state,'paid');
eq((await store.status(session.sessionId,key)).state,'paid');eq((await pg.query("SELECT count(*)::int AS n FROM ram_mandir.temple_orders WHERE state='confirmed'")).rows[0].n,2);
await store.webhook(JSON.stringify({event:'payment.captured',payload:{payment:{entity:p}}}),'fixture');eq((await pg.query("SELECT count(*)::int AS n FROM ram_mandir.temple_orders WHERE state='confirmed'")).rows[0].n,2);
eq(await store.isBound(ids[0]),true);eq(await store.sessionForOrder(ids[1]),session.sessionId);
eq((await createPaymentStore(sql,gateway).status(session.sessionId,key)).state,'paid');
const expired=await reserve(2,{age:400000});await reject(()=>store.start([expired],key));
const third=await reserve(3),late=await store.start([third],key);await pg.query('UPDATE ram_mandir.temple_allocations SET order_id=$1,expires_at=$2 WHERE order_id=$3',[randomUUID(),Date.now()+300000,third]);
const lp=entities.get(late.orderId);Object.assign(lp,{status:'captured',captured:true});eq((await store.status(late.sessionId,key)).state,'paid');
eq((await pg.query('SELECT unit_id FROM ram_mandir.temple_orders WHERE id=$1',[third])).rows[0].unit_id===unitIds[3],false);
const diya=await reserve(0,{kind:'diya',product:'quarter-hour'}),light=await store.start([diya],key),dp=entities.get(light.orderId);Object.assign(dp,{status:'captured',captured:true});
await store.webhook(JSON.stringify({event:'order.paid',payload:{payment:{entity:dp}}}),'fixture');
const [d]=(await pg.query('SELECT * FROM ram_mandir.temple_orders WHERE id=$1',[diya])).rows;eq(d.state,'confirmed');eq(Number(d.ends_at)-Number(d.starts_at),900000);
const fourth=await reserve(4),bad=await store.start([fourth],key),bp=entities.get(bad.orderId);Object.assign(bp,{status:'captured',captured:true,currency:'USD'});await reject(()=>store.verify(bad.sessionId,key,{}));
eq((await pg.query('SELECT state FROM ram_mandir.temple_orders WHERE id=$1',[fourth])).rows[0].state,'payment_pending');
const DB=createPostgresDB(sql),ownerToken='c'.repeat(64);
async function call(path,input,{owner=ownerToken,origin='https://temple.test'}={}){const response=await templeService(new Request('https://temple.test/api/temple/'+path,{method:input?'POST':'GET',headers:{Authorization:'Bearer '+owner,Origin:origin},...(input?{body:JSON.stringify(input)}:{})}),{DB,PAYMENTS:store});return {status:response.status,data:await response.json()};}
const beforeSnapshot=await call('snapshot');eq(beforeSnapshot.status,200);eq(beforeSnapshot.data.demo,false);
const requestId=randomUUID();const reserved=await call('reserve',{id:requestId,kind:'brick',product:'brick',anonymous:true,name:''});eq(reserved.status,200);eq(reserved.data.order.paymentStatus,'pending');eq(reserved.data.order.amountMinor,10100);
eq((await call('checkout',{id:requestId})).status,200);
eq((await call('confirm-demo',{id:requestId})).status,403);
eq((await call('snapshot')).data.count,beforeSnapshot.data.count);
eq((await call('public/'+requestId)).status,404);
eq((await call('mine',undefined,{owner:'d'.repeat(64)})).data.orders.length,0);
const mine=await call('mine');eq(mine.data.orders.length,1);eq(mine.data.orders[0].paymentSession,null);
eq((await call('reserve',{id:randomUUID(),kind:'brick',product:'brick',anonymous:true,amountMinor:1})).status,400);
eq((await call('reserve',{id:randomUUID(),kind:'brick',product:'brick',anonymous:true},{origin:'https://other.test'})).status,403);
eq((await call('cancel',{id:requestId})).data.order.state,'cancelled');
console.log(`PASS ${checks} PostgreSQL payment lifecycle checks — isolated database, no real transactions`);
}finally{await pg.close();}
