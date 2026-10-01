// Où la voix se trouve RÉELLEMENT dans les clips découpés — par l'ÉNERGIE,
// donc indépendamment des deux détecteurs qu'on compare (sinon on jugerait
// l'un avec l'autre). Ma vérité terrain supposait que le clip parle du début
// à la fin : ça se vérifie, ça ne se suppose pas.
import { readFileSync } from 'node:fs';
function lire(p){const b=readFileSync(p);let q=12,t=16000,d=null;while(q+8<=b.length){const id=b.toString('ascii',q,q+4),s=b.readUInt32LE(q+4);if(id==='fmt ')t=b.readUInt32LE(q+12);else if(id==='data'){d=b.subarray(q+8,q+8+s);break}q+=8+s+(s%2)}
const n=Math.floor(d.length/2),x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=d.readInt16LE(i*2)/32768;return{x,t}}
for (const f of ['p-court.wav','p-long.wav','p-faible.wav']) {
  const {x,t}=lire(f); const F=Math.round(t*0.02); const rms=[];
  for(let i=0;i+F<=x.length;i+=F){let s=0;for(let k=0;k<F;k++)s+=x[i+k]*x[i+k];rms.push(Math.sqrt(s/F))}
  const pic=Math.max(...rms); const seuil=pic*0.05;      // -26 dB sous le pic
  let a=rms.findIndex(v=>v>=seuil), b=rms.length-1-[...rms].reverse().findIndex(v=>v>=seuil);
  console.log(`${f.padEnd(14)} durée ${(x.length/t).toFixed(2)}s · voix réelle ${(a*0.02).toFixed(2)}s → ${((b+1)*0.02).toFixed(2)}s · pic RMS ${pic.toFixed(4)}`);
}
