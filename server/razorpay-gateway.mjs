// Server-only Razorpay boundary. Never import this module into public assets.
import {createHmac,timingSafeEqual} from 'node:crypto';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export function normalizeKeyId(value){const matches=[...new Set(String(value||'').match(/\brzp_(?:live|test)_[A-Za-z0-9]+\b/g)||[])];return matches.length===1?matches[0]:'';}
export function normalizeKeySecret(value){let s=String(value||'').trim();if((s.startsWith('"')&&s.endsWith('"'))||(s.startsWith("'")&&s.endsWith("'")))s=s.slice(1,-1);return s;}
export function validSignature(message,signature,secret){
 if(typeof message!=='string'||typeof secret!=='string'||!secret||typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature))return false;
 const expected=createHmac('sha256',secret).update(message).digest();
 return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
export function assertCaptured(payment,{orderId,amount,currency='INR'}){
 if(!payment||payment.order_id!==orderId||payment.amount!==amount||payment.currency!==currency||payment.status!=='captured'||payment.captured!==true||Number(payment.amount_refunded||0)!==0)fail('Payment is not yet verified as captured for this contribution',409);
 return payment;
}
export function createRazorpayGateway({keyId,keySecret,webhookSecret,fetcher=fetch,allowTest=false}={}){
 keyId=normalizeKeyId(keyId);
 keySecret=normalizeKeySecret(keySecret);
 const configured=typeof keyId==='string'&&(allowTest?/^rzp_(live|test)_[A-Za-z0-9]+$/:/^rzp_live_[A-Za-z0-9]+$/).test(keyId)&&typeof keySecret==='string'&&keySecret.length>=10&&!/\brzp_(live|test)_/.test(keySecret);
 async function request(path,body){
  if(!configured)fail('Secure payment setup is not ready Please return shortly',503);
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetcher('https://api.razorpay.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+Buffer.from(keyId+':'+keySecret).toString('base64'),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});
   if(!response.ok){if(response.status===401)fail('Razorpay could not authenticate the live key pair Please contact payment support',502);let code='';try{const error=await response.json();code=String(error.error?.code||'').replace(/[^A-Z_]/g,'').slice(0,40);}catch{}fail('Razorpay could not create or verify this payment '+(code?'('+code+')':'')+' Please retry or contact payment support',502);}
   return await response.json();
  }catch(error){if(error.status)throw error;fail('Payment status could not be checked Please keep your reference and retry verification',503);}finally{clearTimeout(timeout);}
 }
 return {
  get configured(){return configured;},get publicKey(){return configured?keyId:null;},
  async createOrder({amount,receipt}){
   if(!Number.isSafeInteger(amount)||amount<100||amount>100000000||typeof receipt!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(receipt))fail('Invalid server payment order');
   const order=await request('orders',{amount,currency:'INR',receipt,partial_payment:false});
   if(!/^order_[A-Za-z0-9]+$/.test(order.id||'')||order.amount!==amount||order.currency!=='INR'||order.receipt!==receipt)fail('The payment order could not be verified',502);
   return order;
  },
  async verifyPayment({orderId,paymentId,signature,amount}){
   if(!configured)fail('Secure payment setup is not ready',503);
   if(!/^order_[A-Za-z0-9]+$/.test(orderId||'')||!/^pay_[A-Za-z0-9]+$/.test(paymentId||'')||!validSignature(orderId+'|'+paymentId,signature,keySecret))fail('Payment signature could not be verified',400);
   return assertCaptured(await request('payments/'+paymentId),{orderId,amount});
  },
  verifyWebhook(raw,signature){if(!webhookSecret||!validSignature(raw,signature,webhookSecret))fail('Webhook signature could not be verified',400);try{return JSON.parse(raw);}catch{fail('Invalid webhook body');}},
  async orderPayments(orderId){
   if(!/^order_[A-Za-z0-9]+$/.test(orderId||''))fail('Invalid payment order');
   return (await request('orders/'+orderId+'/payments')).items||[];
  },
  async capturedPayments(orderId){
   if(!/^order_[A-Za-z0-9]+$/.test(orderId||''))fail('Invalid payment order');
   const result=await request('orders/'+orderId+'/payments');return (result.items||[]).filter(p=>p.status==='captured'&&p.captured===true);
  }
 };
}
