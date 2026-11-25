/* ---------- temas: trocam fundo, paleta e brilho sem mexer nas cenas ----------
   useTheme({name, C, F, glow, map, drawBg(b,W,H), css}). `map` troca cores literais (hex ou "r,g,b") escritas nas cenas. */
const THEME={name:'noite',glow:1,map:{}};
function rngTheme(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296)}
function useTheme(t){
  Object.assign(THEME,t);Object.assign(C,t.C||{});if(t.F)Object.assign(F,t.F);
  if(t.drawBg){const b=bgc.getContext('2d');b.save();b.clearRect(0,0,W,H);t.drawBg(b,W,H);b.restore()}
  if(t.css){const s=document.createElement('style');s.textContent=t.css;document.head.appendChild(s)}
  const M=Object.entries(THEME.map||{});if(!M.length&&THEME.glow===1)return;
  const conv=v=>{if(typeof v!=='string')return v;let s=v;for(const [a,b] of M)if(s.toLowerCase().includes(a))s=s.toLowerCase().split(a).join(b);return s};
  const P=CanvasRenderingContext2D.prototype;
  for(const k of ['fillStyle','strokeStyle','shadowColor']){const d=Object.getOwnPropertyDescriptor(P,k);Object.defineProperty(P,k,{configurable:true,get(){return d.get.call(this)},set(v){d.set.call(this,conv(v))}})}
  const sb=Object.getOwnPropertyDescriptor(P,'shadowBlur');Object.defineProperty(P,'shadowBlur',{configurable:true,get(){return sb.get.call(this)},set(v){sb.set.call(this,v*THEME.glow)}});
  const ac=CanvasGradient.prototype.addColorStop;CanvasGradient.prototype.addColorStop=function(o,c){return ac.call(this,o,conv(c))};
}
