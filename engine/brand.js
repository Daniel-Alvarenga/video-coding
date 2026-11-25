/* ---------- BRAND: marca do projeto e saída dos vídeos ----------
   BRAND.spiral(ctx,cx,cy,R,{prog,a})  espiral logarítmica dourada (prog 0..1 desenha aos poucos; o ponto aparece no fim)
   BRAND.word(ctx,x,y,size,align)  nome da marca; as primeiras `accent` letras em dourado
   Nome e destaque vêm de meta.json "brand": {"name": "video-coding", "accent": 5} (padrão: "video-coding", 5 letras douradas).
   "spiral": true desenha a espiral dourada antes do nome (padrão: só o nome).
   BRAND.outro(ctx,t,dur,{mode,prev})  saída: o último plano continua em câmera lenta, escurece aos poucos, a marca se desenha e tudo
       some num fade suave (mode 'card'); em 'loop' não escurece até o preto, para o Shorts emendar com o começo.
   No 'loop' o leve zoom também volta a 1 no fim (emenda perfeita com o quadro 0 se slow = 1); y = altura da marca no loop.
   Ativado por meta.json "outro": {"dur": 3.2, "mode": "card"|"loop", "slow": .35}. plan.py acrescenta a duração e o template cria a cena. */
const BRAND=(()=>{
function spiral(ctx,cx,cy,R,o={}){const b=o.b??.2,turns=o.turns??2.15,th1=turns*Math.PI*2,a=R/Math.exp(b*th1),rot=o.rot??-1.74,lw=R*(o.lw??.06),gold='#f4b740';
  let pts=[];for(let i=0;i<=900;i++){const th=th1*i/900,r=a*Math.exp(b*th);pts.push([Math.cos(th+rot)*r,Math.sin(th+rot)*r])}
  /* centraliza pela caixa que envolve a forma (incluindo o ponto final) */
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),mx=(Math.min(...xs)+Math.max(...xs))/2,my=(Math.min(...ys)+Math.max(...ys))/2;pts=pts.map(p=>[cx+p[0]-mx,cy+p[1]-my]);
  const PR=o.prog??1;pts=pts.slice(0,Math.max(2,Math.round(pts.length*PR)));ctx.save();ctx.globalAlpha*=o.a??1;ctx.lineCap='round';ctx.lineJoin='round';
  /* brilho: uma passada só, larga e suave */
  ctx.strokeStyle='rgba(244,183,64,.28)';ctx.lineWidth=lw*2.2;ctx.filter=`blur(${Math.round(lw*.9)}px)`;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.filter='none';
  /* traço: afina para dentro, opaco */
  for(let i=1;i<pts.length;i++){const u=i/pts.length;ctx.strokeStyle=gold;ctx.lineWidth=lw*(.3+.7*u);ctx.beginPath();ctx.moveTo(...pts[i-1]);ctx.lineTo(...pts[i]);ctx.stroke()}
  const e=pts[pts.length-1];ctx.globalAlpha*=clamp((PR-.9)*10);ctx.fillStyle='#ece6d6';ctx.shadowColor='#ece6d6';ctx.shadowBlur=lw*2;ctx.beginPath();ctx.arc(e[0],e[1],lw*1.3,0,Math.PI*2);ctx.fill();ctx.restore();return e}
const _BR=(typeof __BRAND__!=='undefined'&&__BRAND__)||{},BNAME=_BR.name||'video-coding',BACC=_BR.accent??5,BSPI=!!_BR.spiral;
function word(ctx,x,y,size,align='left'){ctx.save();ctx.textBaseline='alphabetic';ctx.font=`italic 400 ${size}px "Newsreader"`;const a=BNAME.slice(0,BACC),b=BNAME.slice(BACC),w1=ctx.measureText(a).width,w2=ctx.measureText(b).width,w=w1+w2;
  let x0=align==='center'?x-w/2:x;ctx.fillStyle='#f4b740';ctx.shadowColor='#f4b740';ctx.shadowBlur=size*.08;ctx.fillText(a,x0,y);ctx.fillStyle='#ece6d6';ctx.shadowColor='#ece6d6';ctx.shadowBlur=size*.05;ctx.fillText(b,x0+w1,y);ctx.restore();return w}
  function outro(ctx,t,dur,o={}){const prev=o.prev,mode=o.mode||'card',slow=o.slow??.35,u=clamp(t/dur);
    if(prev){ctx.save();const z=1+.035*(mode==='loop'?Math.sin(Math.PI*u):ease(u));ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-W/2,-H/2);prev.draw(ctx,prev.dur+t*slow);ctx.restore()}
    const dk=mode==='loop'?.35*Math.sin(Math.PI*u):lerp(0,.82,ease(clamp(t/(dur*.55))));ctx.save();ctx.fillStyle=`rgba(5,7,12,${dk})`;ctx.fillRect(0,0,W,H);ctx.restore();
    const la=mode==='loop'?Math.sin(Math.PI*clamp((t-.2)/(dur-.4))):ramp(t,dur*.18,dur*.5)*(1-ramp(t,dur-.55,dur-.05)),cy=mode==='loop'?(o.y??H-250):H*.46,R=mode==='loop'?44:110;
    if(la>0){ctx.save();ctx.globalAlpha*=la;ctx.font=`italic 400 ${mode==='loop'?64:150}px "Newsreader"`;const sw=BSPI?1.75*R+R*.45:0,tw=ctx.measureText(BNAME).width,tot=sw+tw,x0=W/2-tot/2;
      if(BSPI)spiral(ctx,x0+.875*R,cy-R*.14,R,{prog:ease(clamp((t-dur*.15)/(dur*.45)))});word(ctx,x0+sw,cy+R*.2,mode==='loop'?64:150);ctx.restore()}
    if(mode!=='loop'){const f=ramp(t,dur-.5,dur);if(f>0){ctx.save();ctx.globalAlpha=f;bg(ctx);ctx.restore()}}
    if(t>.05)logEv('outro','res',0)}
  return {spiral,word,outro}})();