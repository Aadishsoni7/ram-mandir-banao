import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
// Original procedural surroundings; furnishings never enter contribution inventory.
export function createSacredCourtyard(scene){
 const landscape=new T.Group(),shrine=new T.Group(),vision=new T.Group();scene.add(landscape,shrine,vision);
 const stone=new T.MeshStandardMaterial({color:'#cdbd9f',roughness:.94}),ivory=new T.MeshStandardMaterial({color:'#eadfc9',roughness:.87}),gold=new T.MeshStandardMaterial({color:'#ac8341',metalness:.62,roughness:.42}),darkGold=new T.MeshStandardMaterial({color:'#735331',metalness:.5,roughness:.62}),terracotta=new T.MeshStandardMaterial({color:'#a95b3c',roughness:1}),bark=new T.MeshStandardMaterial({color:'#735742',roughness:1}),orange=new T.MeshStandardMaterial({color:'#d89925',roughness:.95}),rose=new T.MeshStandardMaterial({color:'#a52f46',roughness:.94}),white=new T.MeshStandardMaterial({color:'#fff0d5',roughness:.9}),green=new T.MeshStandardMaterial({color:'#3e6149',roughness:1}),water=new T.MeshStandardMaterial({color:'#638b82',metalness:.24,roughness:.26,transparent:true,opacity:.87});
 const groups=new Map(),matrix=new T.Object3D();
 function add(parent,geo,mat,p=[0,0,0],scale=[1,1,1],rot=[0,0,0]){matrix.position.set(...p);matrix.scale.set(...scale);matrix.rotation.set(...rot);matrix.updateMatrix();const key=parent.uuid+mat.uuid;let group=groups.get(key);if(!group){group={parent,mat,geos:[]};groups.set(key,group);}group.geos.push(geo.clone().applyMatrix4(matrix.matrix));}
 const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,8,6),cyl=new T.CylinderGeometry(1,1,1,12),ring=new T.TorusGeometry(1,.055,6,48);
 // Brass deepams, kalash vessels and flower thalis flank the approved murti.
 for(const side of [-1,1]){
  const x=side*2.12,z=-5.75;
  add(shrine,cyl,gold,[x,.98,z],[.27,.12,.27]);add(shrine,cyl,darkGold,[x,1.49,z],[.055,.95,.055]);
  for(const y of [1.21,1.74,1.99]){add(shrine,sphere,gold,[x,y,z],[.14,.065,.14]);add(shrine,cyl,gold,[x,y+.05,z],[.25,.035,.25]);}
  add(shrine,sphere,new T.MeshBasicMaterial({color:'#ffd78b'}),[x,2.17,z],[.035,.11,.035]);
  const bx=side*.92;add(shrine,cyl,gold,[bx,1.76,-4.99],[.31,.027,.31]);
  for(let j=0;j<28;j++){const a=j*2.4,rr=.21*Math.sqrt((j+1)/28);add(shrine,sphere,j%4?orange:rose,[bx+Math.cos(a)*rr,1.80,-4.99+Math.sin(a)*rr],[.035,.025,.035]);}
  add(shrine,sphere,gold,[side*1.46,1.82,-6.10],[.15,.19,.15]);add(shrine,cyl,gold,[side*1.46,2.02,-6.10],[.09,.05,.09]);
  for(let j=0;j<5;j++)add(shrine,sphere,green,[side*1.46+Math.sin(j*1.3)*.095,2.08,-6.10+Math.cos(j*1.3)*.095],[.035,.09,.025],[0,j,.6]);
 }
 // A restrained embossed halo, kept behind the existing relief.
 add(shrine,ring,gold,[0,3.72,-6.84],[.77,.77,.45]);add(shrine,ring,darkGold,[0,3.72,-6.85],[.88,.88,.45]);
 for(let j=0;j<32;j++){const a=j*Math.PI/16;add(shrine,sphere,gold,[Math.cos(a)*.85,3.72+Math.sin(a)*.85,-6.83],[.035,.035,.017]);}
 for(let j=0;j<48;j++){const x=-1.65+j*3.3/47,y=4.85-.48*Math.sin((j/47)*Math.PI);add(shrine,sphere,j%7===0?white:orange,[x,y,-6.73],[.06,.065,.05]);}
 // Lotus basins frame the entrance approach, leaving the processional path open.
 const ponds=[];for(const side of [-1,1]){
  const root=new T.Group();root.name='Lotus basin';root.userData.landmark='lotus';root.userData.landmarkId=side;landscape.add(root);root.position.set(side*10,-.02,20);ponds.push(root);
  add(root,cyl,stone,[0,.05,0],[2.3,.17,2.3]);add(root,cyl,water,[0,.15,0],[2.13,.012,2.13]);add(root,ring,ivory,[0,.18,0],[2.25,2.25,1],[Math.PI/2,0,0]);
  for(let j=0;j<9;j++){const a=j*2.399,r=.5+j*.15,x=Math.cos(a)*r,z=Math.sin(a)*r;add(root,cyl,green,[x,.17,z],[.27,.012,.25]);for(let k=0;k<7;k++){const b=k*Math.PI*2/7;add(root,sphere,j%3?white:rose,[x+Math.cos(b)*.07,.21,z+Math.sin(b)*.07],[.065,.025,.032],[0,-b,0]);}add(root,sphere,gold,[x,.23,z],[.025,.02,.025]);}
 }
 // Low lamps and stone seats, placed outside circulation lanes.
 for(const side of [-1,1])for(const z of [-15,10,25]){
  add(landscape,box,stone,[side*23,.42,z],[2.6,.17,.65]);for(const x of [-.9,.9])add(landscape,box,stone,[side*23+x,.16,z],[.18,.5,.54]);
 }
 // One rangoli, painted on the entry paving, with no floating surfaces.
 for(let j=0;j<12;j++){const a=j*Math.PI/6;add(landscape,new T.CircleGeometry(.43,20),j%2?orange:white,[Math.cos(a)*1.15,-.022,15+Math.sin(a)*1.15],[1,1,1],[-Math.PI/2,0,0]);}add(landscape,new T.CircleGeometry(.48,28),rose,[0,-.018,15],[1,1,1],[-Math.PI/2,0,0]);
 // Instanced leaf canopy, with shared geometry and texture rather than hundreds of separate meshes.
 const leafCanvas=document.createElement('canvas');leafCanvas.width=64;leafCanvas.height=128;const c=leafCanvas.getContext('2d');c.beginPath();c.moveTo(32,4);c.bezierCurveTo(67,35,62,82,32,124);c.bezierCurveTo(2,82,-3,35,32,4);const grad=c.createLinearGradient(0,0,64,128);grad.addColorStop(0,'#83996a');grad.addColorStop(1,'#314d34');c.fillStyle=grad;c.fill();c.strokeStyle='#b0b58888';c.lineWidth=1;c.beginPath();c.moveTo(32,7);c.lineTo(32,120);for(let i=0;i<7;i++){const y=25+i*12;c.moveTo(32,y+12);c.lineTo(14,y);c.moveTo(32,y+12);c.lineTo(50,y);}c.stroke();const texture=new T.CanvasTexture(leafCanvas);texture.colorSpace=T.SRGBColorSpace;
 const leafMaterial=new T.MeshStandardMaterial({map:texture,alphaTest:.45,side:T.DoubleSide,roughness:1});
 const treePositions=[[-26,-16],[26,-16],[-26,12],[26,12],[-20,-26],[20,-26],[-10,-29],[10,-29]],foliage=new T.InstancedMesh(new T.PlaneGeometry(.55,1.1),leafMaterial,treePositions.length*220);let seed=911,n=0;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const [x,z] of treePositions){const h=5+rand()*1.5;add(landscape,cyl,bark,[x,h*.43-.1,z],[.15,h*.86,.15]);for(let b=0;b<5;b++){const a=b*2.4;const end=new T.Vector3(x+Math.cos(a)*1.1,h*.7+b*.14,z+Math.sin(a)*1.1),start=new T.Vector3(x,h*.52,z),delta=end.clone().sub(start),g=new T.CylinderGeometry(.035,.07,delta.length(),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));add(landscape,g,bark,start.clone().add(end).multiplyScalar(.5).toArray());}
  for(let j=0;j<220;j++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*1.9;matrix.position.set(x+Math.cos(a)*r,h*.68+rand()*2.2-.12*r*r,z+Math.sin(a)*r);matrix.rotation.set(rand()*2-1,a,rand()*2-1);matrix.scale.setScalar(.65+rand()*.8);matrix.updateMatrix();foliage.setMatrixAt(n++,matrix.matrix);}
 }
 foliage.receiveShadow=true;landscape.add(foliage);
 // Completed architectural vision ornamentation, explicitly not actual construction.
 for(const y of [1.04,5.59,6.13]){add(vision,box,ivory,[0,y,10.04],[12.25,.14,.22]);add(vision,box,ivory,[0,y,-10.04],[12.25,.14,.22]);for(const side of [-1,1])add(vision,box,ivory,[side*6.05,y,0],[.22,.14,20.2]);}
 for(const side of [-1,1])for(const z of [-5,0,5]){for(let j=0;j<6;j++){const y=2.35+j*.24;add(vision,box,stone,[side*5.56,y,z],[.07,.035,1.22]);}for(const d of [-.48,0,.48])add(vision,box,stone,[side*5.57,3,z+d],[.075,1.9,.03]);}
 // Flush doorway trim and a small brass sun medallion.
 for(const side of [-1,1]){add(vision,box,ivory,[side*2.1,2.95,9.08],[.19,3.6,.18]);for(const y of [1.4,2.8,4.5])add(vision,box,stone,[side*2.1,y,9.12],[.27,.12,.22]);}
 add(vision,box,ivory,[0,4.78,9.09],[4.45,.25,.22]);add(vision,ring,gold,[0,5.09,9.16],[.17,.17,.7]);
 for(const group of groups.values()){const geo=mergeGeometries(group.geos,false);group.geos.forEach(g=>g.dispose());const mesh=new T.Mesh(geo,group.mat);mesh.castShadow=group.parent===vision;mesh.receiveShadow=true;group.parent.add(mesh);}
 let last=-1;return {landscape,shrine,vision,targets:ponds,tick(t,night,complete){vision.visible=complete;if(last!==night){water.color.set(night?'#405c62':'#638b82');last=night;}}};
}
