// Includes clearance for the entire cow body around the plinth and entrance
export const TEMPLE_EXCLUSION={minX:-12,maxX:12,minZ:-18,maxZ:18};
export const COW_ROUTE=[[-28,-22],[28,-22],[28,23],[-28,23]];
export function crossesTemple(from,to){
 let lo=0,hi=1;for(const [axis,min,max] of [[0,TEMPLE_EXCLUSION.minX,TEMPLE_EXCLUSION.maxX],[2,TEMPLE_EXCLUSION.minZ,TEMPLE_EXCLUSION.maxZ]]){const delta=to[axis]-from[axis];if(Math.abs(delta)<1e-10){if(from[axis]<min||from[axis]>max)return false;}else{let a=(min-from[axis])/delta,b=(max-from[axis])/delta;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return false;}}return true;
}
export function safeCowStep(from,to){return crossesTemple(from,to)?[...from]:[...to];}
