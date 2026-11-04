export const GROUPS=[
 {id:'brick',hi:'पत्थर की ईंट',en:'Stone block',sections:['plinth','walls','interior','entrance'],requires:[]},
 {id:'pillar',hi:'स्तंभ का खंड',en:'Pillar segment',sections:['pillars'],requires:[]},
 {id:'roof',hi:'छत की पटिया',en:'Roof slab',sections:['roof'],requires:[]},
 {id:'shikhara',hi:'शिखर का पत्थर',en:'Shikhara piece',sections:['shikhara'],requires:[]},
 {id:'kalash',hi:'स्वर्ण कलश',en:'Golden kalash',sections:['shikhara'],requires:[]}
];
export const groupFor=id=>GROUPS.find(g=>g.id===id)||GROUPS[0];
export const unitsFor=(manifest,id)=>manifest.units.filter(u=>id==='kalash'?u.id==='RA5-KALASH-MAIN-1':groupFor(id).sections.includes(u.section)&&u.id!=='RA5-KALASH-MAIN-1');
export function readiness(manifest,id,confirmed){const ids=confirmed instanceof Set?confirmed:new Set(confirmed.map(o=>o.unitId));return {ready:true,remaining:unitsFor(manifest,id).filter(u=>!ids.has(u.id)).length};}
