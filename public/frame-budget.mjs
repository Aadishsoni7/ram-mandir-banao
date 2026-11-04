// Advance the frame schedule without dropping an extra frame on sub-millisecond jitter.
export function nextFrameStamp(now,last,fps){const interval=1000/fps,elapsed=now-last;if(elapsed<interval-.75)return null;return elapsed>interval*3?now:Math.min(now,last+interval);}
