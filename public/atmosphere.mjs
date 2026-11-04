import * as T from 'three';
import {ui} from './language.mjs?v=31';
const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
export function indianTime(epoch){const p=Object.fromEntries(formatter.formatToParts(new Date(epoch)).map(p=>[p.type,p.value]));return Number(p.hour)%24+Number(p.minute)/60+Number(p.second)/3600;}
export function modeAt(epoch){const seconds=((Math.floor((epoch+19800000)/1000)%86400)+86400)%86400;return seconds>=21600&&seconds<64800?'day':'night';}
export const VISUAL_MODES={day:{sky:'#c5d6d0',ground:'#9aa67c',light:2.8,ambient:2.25,night:0,sunY:.8},night:{sky:'#192b3d',ground:'#6c785d',light:1.1,ambient:1.7,night:1,sunY:-.4}};
export function atmosphereAt(epoch,preview='live'){const mode=preview==='day'||preview==='night'?preview:modeAt(epoch),v=VISUAL_MODES[mode];return {...v,mode,hour:indianTime(epoch),sky:new T.Color(v.sky),ground:new T.Color(v.ground)};}
export function createAtmosphere(scene,renderer){
 const hemi=new T.HemisphereLight('#edf5fa','#7c8e70',2);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff5e8',2.6);sun.position.set(-24,40,-22);sun.castShadow=true;sun.shadow.mapSize.set(innerWidth<760?1024:2048,innerWidth<760?1024:2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:.1,far:160});sun.shadow.bias=-.00015;sun.shadow.normalBias=.035;scene.add(sun);
 const solar=new T.Mesh(new T.SphereGeometry(1,20,14),new T.MeshBasicMaterial({color:'#fff7df',fog:false}));solar.position.set(-46,67,-90);scene.add(solar);
 const moon=new T.Mesh(new T.SphereGeometry(1.1,24,16),new T.MeshBasicMaterial({color:'#e3eafa',fog:false}));moon.position.set(35,36,-82);scene.add(moon);
 const positions=[];let seed=587;for(let i=0;i<90;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const a=seed/4294967296*Math.PI*2;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=.28+seed/4294967296*.68,r=Math.sqrt(1-y*y);positions.push(Math.cos(a)*r*100,y*100,Math.sin(a)*r*100);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));const stars=new T.Points(geo,new T.PointsMaterial({color:'#d6e3f3',size:.13,transparent:true,opacity:.65,depthWrite:false,fog:false}));scene.add(stars);
 const lamps=[];
 let preview='live',last=-Infinity,night=0,mode=null,force=true;
 scene.background=new T.Color('#8DCFF1');scene.fog=new T.Fog('#8DCFF1',90,185);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)force=true;});document.addEventListener('temple-language-changed',()=>force=true);
 return {get night(){return night;},get mode(){return mode;},get preview(){return preview;},setPreview(value){preview=['day','night'].includes(value)?value:'live';force=true;},tick(t,now){if(!force&&t-last<250&&(preview==='live'?modeAt(now):preview)===mode)return;force=false;last=t;const current=atmosphereAt(now,preview);mode=current.mode;night=current.night;scene.background.lerp(current.sky,.3);scene.fog.color.lerp(current.sky,.3);hemi.intensity+=(current.ambient-hemi.intensity)*.3;hemi.color.set(night?'#c7dcff':'#EDF5FA');hemi.groundColor.copy(current.ground);sun.intensity+=(current.light-sun.intensity)*.3;sun.color.set(night?'#e1d8c8':'#fff0d5');sun.position.set(night?25:-24,night?32:40,-22);solar.visible=!night;moon.visible=!!night;stars.visible=!!night;lamps.forEach(l=>l.intensity=night*6.5);renderer.toneMappingExposure=1.08;document.body.dataset.night=String(!!night);document.body.dataset.visualMode=mode;document.body.dataset.timeSource=preview==='live'?'live':'preview';const time=formatter.format(new Date(now)).slice(0,5);document.getElementById('liveTime').textContent=preview==='live'?`${time} IST · ${ui(night?'रात':'दिन',night?'Night':'Day')} · ${ui('लाइव','Live')}`:ui(night?'रात का पूर्वावलोकन':'दिन का पूर्वावलोकन',night?'Night preview':'Day preview');const live=document.getElementById('returnLive');if(live)live.hidden=preview==='live';}}
}
