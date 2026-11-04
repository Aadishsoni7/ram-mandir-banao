import * as T from 'three';
// Permanent landscape and devotional furnishings are never construction inventory.
export function createCourtyard(scene){
 const root=new T.Group();root.name='Permanent courtyard landscape';scene.add(root);
 const stone=new T.MeshStandardMaterial({color:'#d4c8b4',roughness:.97}),rose=new T.MeshStandardMaterial({color:'#a48370',roughness:1}),earth=new T.MeshStandardMaterial({color:'#779962',roughness:1});
 const add=(geo,mat,p)=>{const m=new T.Mesh(geo,mat);m.position.set(...p);m.receiveShadow=true;root.add(m);return m;};
 function rounded(width,length,r){const s=new T.Shape(),x=-width/2,y=-length/2;s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);s.lineTo(x+width,y+length-r);s.quadraticCurveTo(x+width,y+length,x+width-r,y+length);s.lineTo(x+r,y+length);s.quadraticCurveTo(x,y+length,x,y+length-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
 const terrace=new T.ExtrudeGeometry(rounded(66,57,8),{depth:.5,bevelEnabled:true,bevelSize:.18,bevelThickness:.12,bevelSegments:3,steps:1,curveSegments:14});terrace.rotateX(-Math.PI/2);add(terrace,earth,[0,-.72,2]);
 const tiles=[];for(let z=-15;z<=28;z+=1.6)for(let x=-14.4;x<=14.4;x+=1.6){if(Math.abs(x)<6.7&&z>-11&&z<14.1)continue;tiles.push([x,z]);}
 const paving=new T.InstancedMesh(new T.BoxGeometry(1.575,.045,1.575),stone,tiles.length),pose=new T.Object3D(),color=new T.Color();for(let i=0;i<tiles.length;i++){pose.position.set(tiles[i][0],-.06,tiles[i][1]);pose.updateMatrix();paving.setMatrixAt(i,pose.matrix);color.set(i%7===0?'#c2b19a':i%3===0?'#ddd3c2':'#d3c6b2');paving.setColorAt(i,color);}paving.receiveShadow=true;root.add(paving);
 for(const side of [-1,1]){add(new T.BoxGeometry(.22,.06,44.8),rose,[side*15.35,-.035,6.5]);for(const z of [-15.8,28.8])add(new T.BoxGeometry(30.8,.06,.22),rose,[0,-.035,z]);}
 const lampMaterial=new T.MeshStandardMaterial({color:'#8b7046',metalness:.55,roughness:.6}),glow=new T.MeshBasicMaterial({color:'#f5dca6'}),lights=[];
 for(const x of [-7.7,7.7])for(const z of [15.5,24]){add(new T.CylinderGeometry(.16,.22,.52,12),lampMaterial,[x,.20,z]);const cap=add(new T.CylinderGeometry(.19,.19,.11,12),glow,[x,.48,z]);const light={intensity:0};lights.push({light,cap});}
 return {tick(night){for(const l of lights){l.light.intensity=night*2.7;l.cap.visible=night>.15;}}};
}
export function createSanctumScreen(scene){
 const root=new T.Group();root.name='Complete devotional screen · excluded from building count';scene.add(root);
 const frame=new T.MeshStandardMaterial({color:'#b59b70',metalness:.16,roughness:.8}),fabric=new T.MeshStandardMaterial({color:'#552c32',roughness:1,side:T.DoubleSide}),ivory=new T.MeshStandardMaterial({color:'#cdbfa8',roughness:.94});
 const add=(g,m,p)=>{const mesh=new T.Mesh(g,m);mesh.position.set(...p);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;};
 // A rectangular freestanding fabric screen, never an arch above the murti.
 const cloth=new T.PlaneGeometry(3.3,4.45,44,12);for(let i=0;i<cloth.attributes.position.count;i++){const x=cloth.attributes.position.getX(i);cloth.attributes.position.setZ(i,Math.sin(x*17)*.024);}cloth.computeVertexNormals();add(cloth,fabric,[0,2.64,-6.89]);
 for(const x of [-1.78,1.78]){add(new T.BoxGeometry(.12,4.7,.14),frame,[x,2.59,-6.9]);add(new T.BoxGeometry(.28,.15,.3),ivory,[x,.26,-6.9]);}
 for(const y of [.24,4.94])add(new T.BoxGeometry(3.7,.10,.14),frame,[0,y,-6.9]);
 for(const x of [-1.58,1.58])for(let j=0;j<14;j++){const carving=add(new T.OctahedronGeometry(.048),frame,[x,.55+j*.29,-6.835]);carving.scale.set(.65,1.4,.35);}
 add(new T.BoxGeometry(3.16,1.25,1.5),ivory,[0,.625,-6.5]);
 return root;
}
