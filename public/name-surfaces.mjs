import * as T from 'three';

// Local, surface-aligned lettering. One texture is shared by every face of a piece.
export function nameSurfaces(unit){
 const surfaces=[],[w,h,d]=unit.size,eps=.004;
 function plane(width,height,position,normal){const g=new T.PlaneGeometry(width,height);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...normal)));g.translate(...position);surfaces.push(g);}
 if(unit.kind==='wedge'){
  const v=unit.vertices.map(p=>new T.Vector3(...p)),centre=v.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(1/8);
  for(const face of [[0,1,5,4],[3,2,6,7],[4,5,7,6]]){
   let corners=face.map(i=>v[i]);const c=corners.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(.25);
   let n=corners[1].clone().sub(corners[0]).cross(corners[3].clone().sub(corners[0])).normalize();
   if(n.dot(c.clone().sub(centre))<0){corners=[corners[1],corners[0],corners[3],corners[2]];n.negate();}
   const [a,b,e,f]=corners;const point=(u,t)=>a.clone().lerp(b,u).lerp(f.clone().lerp(e,u),t).addScaledVector(n,eps);
   const points=[point(.12,.18),point(.88,.18),point(.88,.82),point(.12,.82)];
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();surfaces.push(g);
  }
 }else if(unit.kind==='pillar'){
  for(let side=0;side<4;side++)surfaces.push(new T.CylinderGeometry(w*.41+eps,w*.41+eps,h*.44,20,1,true,side*Math.PI/2-.7,1.4));
  plane(w*.68,w*.22,[0,h/2+eps,0],[0,1,0]);
 }else{
  for(const sign of [-1,1]){
   plane(w*.88,Math.min(h*.78,w*.28),[0,0,sign*(d/2+eps)],[0,0,sign]);
   plane(d*.88,Math.min(h*.78,d*.28),[sign*(w/2+eps),0,0],[sign,0,0]);
   plane(w*.84,Math.min(d*.76,w*.28),[0,sign*(h/2+eps),0],[0,sign,0]);
  }
 }
 return surfaces;
}
