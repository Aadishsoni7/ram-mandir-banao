import postgres from 'postgres';
import supabaseCA from '../server/supabase-ca.mjs';
import {createPostgresDB} from '../server/postgres-adapter.mjs';
import {templeService} from '../server/live-temple-service.mjs';
import {createHash} from 'node:crypto';
import {createRazorpayGateway,normalizeKeyId} from '../server/razorpay-gateway.mjs';
import {createPaymentStore} from '../server/payment-store.mjs';
export const config={api:{bodyParser:false}};
const gateway=createRazorpayGateway({keyId:process.env.RAZORPAY_KEY_ID?.trim(),keySecret:process.env.RAZORPAY_KEY_SECRET?.trim(),webhookSecret:process.env.RAZORPAY_WEBHOOK_SECRET?.trim()});
let db,payments;
function database(){if(!process.env.DATABASE_URL&&!process.env.DATABASE_PASSWORD)return undefined;if(!db){const options={ssl:{rejectUnauthorized:true,ca:supabaseCA},prepare:false,max_pipeline:1,max:1,idle_timeout:20,connect_timeout:10};const sql=process.env.DATABASE_PASSWORD?postgres({...options,host:'aws-0-ap-south-1.pooler.supabase.com',port:6543,database:'postgres',username:'postgres.cvqriwfggppcbmmbcrro',password:process.env.DATABASE_PASSWORD}):postgres(process.env.DATABASE_URL,options);db=createPostgresDB(sql);payments=createPaymentStore(sql,gateway);}return db;}
export default async function handler(req,res){
 try{
  const origin=(process.env.VERCEL?'https':'http')+'://'+req.headers.host;
  const incoming=new URL(req.url,origin),route=incoming.searchParams.get('route')||incoming.pathname.replace(/^\/api\/temple\/?/,'');
  if(!/^[a-zA-Z0-9/?=&%.\-]*$/.test(route)){res.status(400).json({error:'Invalid request'});return;}
  const url=new URL('/api/temple/'+route,origin);for(const [key,value] of incoming.searchParams)if(key!=='route')url.searchParams.set(key,value);
  let body;if(req.method!=='GET'&&req.method!=='HEAD'){if(req.body!==undefined)body=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>65536){res.status(413).json({error:'Request too large'});return;}parts.push(part);}body=Buffer.concat(parts).toString();}}
  const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
  if(route==='payment-config'){const k=normalizeKeyId(process.env.RAZORPAY_KEY_ID); res.setHeader('Cache-Control','no-store');res.status(200).json({paymentEnabled:gateway.configured,mode:k.startsWith('rzp_live_')?'live':k.startsWith('rzp_test_')?'test':k?'invalid':'missing',keySecretPresent:!!process.env.RAZORPAY_KEY_SECRET?.trim(),keySecretIsKeyId:/rzp_(live|test)_/.test(process.env.RAZORPAY_KEY_SECRET||''),webhookSecretPresent:!!process.env.RAZORPAY_WEBHOOK_SECRET?.trim()});return;}
  const DB=database();res.setHeader('Cache-Control','no-store');
  if(!DB){res.status(503).json({error:'Shared records unavailable Please retry'});return;}
  if(route==='payment-webhook'){if(req.method!=='POST'){res.status(405).end();return;}await payments.webhook(body||'',headers.get('x-razorpay-signature'));res.status(200).json({received:true});return;}
  if(route==='payment-reconcile'){
   if(req.method!=='POST'){res.status(405).end();return;}
   if(headers.get('Origin')&&headers.get('Origin')!==origin){res.status(403).end();return;}
   let input;try{input=JSON.parse(body);}catch{res.status(400).json({error:'Invalid request'});return;}
   res.status(200).json(await payments.reconcileOrder(input.orderId));return;
  }
  if(['payment-start','payment-verify','payment-status'].includes(route)){
   if(req.method!=='POST'){res.status(405).end();return;}
   if(headers.get('Origin')&&headers.get('Origin')!==origin){res.status(403).end();return;}
   const token=(headers.get('Authorization')||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(token)){res.status(401).json({error:'Recovery key required'});return;}
   const key=createHash('sha256').update(token).digest('hex');let input;try{input=JSON.parse(body);}catch{res.status(400).json({error:'Invalid request'});return;}
   const session=route==='payment-start'?await payments.start(input.ids,key):route==='payment-verify'?await payments.verify(input.sessionId,key,input):await payments.status(input.sessionId,key);
   res.status(200).json({session,serverTime:Date.now(),demo:false,paymentEnabled:gateway.configured});return;
  }
  if(req.method==='POST'&&!gateway.configured){res.status(503).json({error:'Payments are being prepared Please return shortly'});return;}
  const response=await templeService(new Request(url,{method:req.method,headers,...(body!==undefined?{body}:{})}),{DB,PAYMENTS:payments});
  res.statusCode=response.status;for(const [key,value] of response.headers)res.setHeader(key,value);res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error('payment_handler_failure',JSON.stringify({code:String(error.code||'UNKNOWN'),status:error.status||503,message:String(error.message||'').replace(/rzp_[A-Za-z0-9_]+/g,'[key ID]').slice(0,240)}));res.status(error.status||503).json({error:error.status?error.message:'Payment or shared records are temporarily unavailable Keep your reference and retry verification',paymentEnabled:false});}
}
