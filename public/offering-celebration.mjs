import {ui} from './language.mjs?v=33';
const shown=new Set();
export async function celebrateOffering(order,world){
 if(!['brick','diya','plant'].includes(order.kind)||order.paymentStatus!=='paid'||order.demo||shown.has(order.id))return;
 shown.add(order.id);
 const lamp=`<svg viewBox="0 0 320 300" aria-hidden="true"><defs><radialGradient id="offeringGlow"><stop stop-color="#ffd987" stop-opacity=".7"/><stop offset="1" stop-color="#ffd987" stop-opacity="0"/></radialGradient><linearGradient id="offeringClay" x2="0" y2="1"><stop stop-color="#d69960"/><stop offset="1" stop-color="#83351d"/></linearGradient></defs><circle cx="160" cy="135" r="130" fill="url(#offeringGlow)"/><path d="M57 211 Q160 310 263 211Z" fill="url(#offeringClay)" stroke="#f2c887" stroke-width="3"/><ellipse cx="160" cy="211" rx="103" ry="22" fill="#b66b30" stroke="#efc680" stroke-width="4"/><ellipse cx="160" cy="207" rx="85" ry="12" fill="#efbb59"/><path d="M160 211Q174 193 161 180" fill="none" stroke="#fff0bf" stroke-width="6"/><g class="offering-flame"><path d="M160 187C105 158 174 115 158 60C220 134 198 180 160 187" fill="#ffad37"/><path d="M162 184C137 161 165 132 169 108C190 148 184 176 162 184" fill="#fff1b5"/></g></svg>`;
 const plant=`<svg viewBox="0 0 320 300" aria-hidden="true"><ellipse cx="160" cy="261" rx="94" ry="12" fill="#d5bb78" opacity=".25"/><g class="offering-sprout"><path d="M160 228Q156 145 170 75" stroke="#729853" stroke-width="8" fill="none"/><path d="M161 178C88 174 83 128 87 109C138 103 168 130 161 178" fill="#91af69"/><path d="M163 144C222 141 243 97 233 77C184 77 163 101 163 144" fill="#4f7f50"/><path d="M165 106C124 96 122 63 135 47C169 56 180 78 165 106" fill="#b2c982"/></g><path d="M112 217H208L192 267H128Z" fill="#af704d" stroke="#e9c291" stroke-width="3"/><ellipse cx="160" cy="216" rx="48" ry="10" fill="#644d32"/></svg>`;
 const brick = `<svg viewBox="0 0 320 220" aria-hidden="true"><path d="M26 88 70 50h222l-42 38z" fill="#e2bc86"/><path d="M250 88l42-38v102l-42 38z" fill="#9a643a"/><rect x="26" y="88" width="224" height="102" rx="5" fill="#c89962"/><rect x="37" y="100" width="202" height="78" rx="4" fill="#edd3a9"/><text x="138" y="146" text-anchor="middle" font-size="18" fill="#352115" data-brick-name></text></svg>`;
 const copy = {
  brick: [brick,ui('मंदिर निर्माण में आपका एक अंश','Your brick helps build the temple'),ui('आपका समर्पण अब मंदिर में अपनी जगह पाएगा','Watch your dedication take its place in Shri Ram’s temple'),ui('ईंट को लगते देखें','Watch my brick take its place')],
  diya: [lamp,ui('एक दीया राम के नाम','A little light in Ram’s name'),ui('आपकी लौ अब इस साझा आँगन को रोशन करती है','Your flame now shines in this shared courtyard'),ui('मेरा दीया देखें','See my diya')],
  plant: [plant,ui('राम के आँगन में एक नई हरियाली','A new leaf in Ram’s courtyard'),ui('आपके स्नेह की एक स्मृति अब यहाँ बढ़ती है','A remembrance of your love now grows here'),ui('मेरा पौधा देखें','See my plant')]
 };
 const [artwork,title,message,action] = copy[order.kind];
 const root=document.createElement('div');root.className='offering-ceremony';root.dataset.i18nIgnore='';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','offeringCeremonyTitle');
 root.innerHTML=`<div class="offering-halo"></div><div class="offering-art">${artwork}</div><div class="offering-words"><p>${ui('समर्पण स्वीकार हुआ','Your dedication is saved')}</p><h2 id="offeringCeremonyTitle">${title}</h2><p>${message}</p><button type="button">${action}</button></div>`;
 const nameLabel = root.querySelector('[data-brick-name]');
 if (nameLabel) {
  nameLabel.textContent = order.anonymous ? ui('गुप्त योगदान','Anonymous') : order.name || 'Shri Ram';
  const length = Array.from(nameLabel.textContent).length;
  nameLabel.setAttribute('font-size', String(Math.min(22, 320 / Math.max(1, length))));
 }
 document.body.append(root);const before=document.activeElement,button=root.querySelector('button');button.focus();
 await new Promise(resolve=>{let timer,closed=false;const done=async()=>{if(closed)return;closed=true;clearTimeout(timer);root.removeEventListener('keydown',keys);const art=root.querySelector('.offering-art'),rect=art.getBoundingClientRect(),point=order.kind==='brick'?null:world.offeringScreenPoint?.(order);const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduce&&point){root.classList.add('is-landing');await art.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${point.x-(rect.x+rect.width/2)}px,${point.y-(rect.y+rect.height/2)}px) scale(.09)`,opacity:.1}],{duration:1100,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).finished.catch(()=>{});}root.remove();if(before?.isConnected)before.focus({preventScroll:true});resolve();};
 const keys=e=>{if(e.key==='Escape'){e.preventDefault();done();}if(e.key==='Tab'){e.preventDefault();button.focus();}};root.addEventListener('keydown',keys);button.onclick=done;timer=setTimeout(done,4400);});
}
