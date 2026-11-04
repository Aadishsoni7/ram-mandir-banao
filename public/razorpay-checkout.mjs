// Receives only the public key and server-created order — never a secret.
let loading;
function load(){
 if(window.Razorpay)return Promise.resolve();
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;const timer=setTimeout(()=>{loading=null;script.remove();reject(Error('Checkout is taking longer than expected Check your connection and retry'));},15000);script.onload=()=>{clearTimeout(timer);if(window.Razorpay)resolve();else{loading=null;reject(Error('Checkout could not open Please retry'));}};script.onerror=()=>{clearTimeout(timer);loading=null;script.remove();reject(Error('Checkout could not load Check your connection and retry'));};document.head.append(script);});return loading;
}
export async function openRazorpayCheckout(session,{name='',language='en'}={}){
 if(!/^rzp_live_[A-Za-z0-9]+$/.test(session?.keyId||'')||!/^order_[A-Za-z0-9]+$/.test(session?.orderId||'')||!Number.isSafeInteger(session?.amount)||session.amount<100||session.currency!=='INR')throw Error('Please request a fresh secure checkout');
 await load();
 return new Promise((resolve,reject)=>{
  let finished=false;const finish=(fn,value)=>{if(finished)return;finished=true;fn(value);};
  const checkout=new window.Razorpay({key:session.keyId,order_id:session.orderId,amount:session.amount,currency:'INR',name:'Ram Mandir Banao',description:'Digital temple dedication',prefill:{name},theme:{color:'#853b2d'},config:{display:{language:language==='hi'?'hi':'en'}},handler:result=>finish(resolve,result),modal:{escape:true,confirm_close:true,ondismiss:()=>finish(reject,Object.assign(Error('Checkout closed Your dedication is kept You can retry'),{cancelled:true}))}});
  checkout.on('payment.failed',()=>{ /* Razorpay displays the failure and allows a retry in the same checkout */ });
  try{checkout.open();}catch{finish(reject,Error('Checkout could not open Please retry'));}
 });
}
