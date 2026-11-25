/* ---------- PHYS: trajetórias e esporte (sempre injetado) ----------
   PHYS.rk4(key,f,y0,T,dt)  integra dy/dt=f(t,y) (vetor) até T, devolve amostras [{t,y}] (cacheado por key)
   PHYS.spin(key,{v0,ang,L,Om,T,dt,g})  bola com arrasto e efeito Magnus vista de cima, em metros:
       dv/dt = -v²/L (freio do ar),  curvatura = Om/v (giro constante), devolve [{t,x,y,v,s,th}]
   PHYS.at(traj,t)  ponto interpolado      PHYS.until(traj,cond)  índice do primeiro ponto que satisfaz cond
   PHYS.view({ox,oy,scale,rot})  câmera de campo: P(x,y) metros → pixels
   PHYS.pitch(ctx,V,{a,half})  campo de futebol (medidas oficiais, metros)   PHYS.goal(ctx,V,x,y,{a,dir})  gol visto de cima
   PHYS.ball(ctx,x,y,r,rot,{a,glow})  bola com gomos girando     PHYS.vec(ctx,x,y,dx,dy,{color,lw,label,a})  vetor (seta)
   PHYS.player(ctx,x,y,r,{color,a})  jogador visto de cima      PHYS.path(ctx,V,traj,k,{color,lw,dash,a})  rastro em campo */
const PHYS=(()=>{
  const RC={};
  function rk4(key,f,y0,T,dt=.002){if(key&&RC[key])return RC[key];let y=y0.slice(),t=0;const out=[{t,y:y.slice()}],n=y.length,add=(a,b,h)=>a.map((v,i)=>v+b[i]*h);
    while(t<T-1e-12){const k1=f(t,y),k2=f(t+dt/2,add(y,k1,dt/2)),k3=f(t+dt/2,add(y,k2,dt/2)),k4=f(t+dt,add(y,k3,dt));for(let i=0;i<n;i++)y[i]+=dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]);t+=dt;out.push({t,y:y.slice()});if(o_stop(y))break}
    return key?RC[key]=out:out}
  const o_stop=y=>y.some(v=>!isFinite(v));
  function spin(key,o){if(RC['s:'+key])return RC['s:'+key];const L=o.L??40,Om=o.Om??1;
    /* estado: x, y, direção th, velocidade v, comprimento s */
    const f=(t,[x,y,th,v,s])=>[v*Math.cos(th),v*Math.sin(th),Om,-v*v/L,v];
    const raw=rk4(null,f,[0,0,o.ang||0,o.v0||30,0],o.T||3,o.dt||.002);
    const every=Math.max(1,Math.round((o.sample||.01)/(o.dt||.002)));const out=raw.filter((p,i)=>i%every===0).map(p=>({t:p.t,x:p.y[0],y:p.y[1],th:p.y[2],v:p.y[3],s:p.y[4]}));
    return RC['s:'+key]=out}
  function at(tr,t){if(t<=tr[0].t)return tr[0];const n=tr.length;if(t>=tr[n-1].t)return tr[n-1];let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(tr[m].t<=t)lo=m;else hi=m}
    const a=tr[lo],b=tr[hi],u=(t-a.t)/(b.t-a.t),o={};for(const k in a)o[k]=lerp(a[k],b[k],u);return o}
  const until=(tr,c)=>{for(let i=0;i<tr.length;i++)if(c(tr[i]))return i;return -1};
  function view(o){const s=o.scale||20,ox=o.ox??W/2,oy=o.oy??H/2,r=o.rot||0,c=Math.cos(r),sn=Math.sin(r);return {s,P:(x,y)=>[ox+(x*c-y*sn)*s,oy-(x*sn+y*c)*s]}}
  function seg(ctx,V,pts,close){ctx.beginPath();pts.forEach((p,i)=>{const q=V.P(p[0],p[1]);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])});if(close)ctx.closePath();ctx.stroke()}
  function arc(ctx,V,cx,cy,r,a0,a1){const pts=[];for(let i=0;i<=48;i++){const a=lerp(a0,a1,i/48);pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}seg(ctx,V,pts)}
  /* campo: x de 0 a 105 (comprimento), y de -34 a 34; gol em x=105 */
  function pitch(ctx,V,o={}){ctx.save();ctx.globalAlpha*=o.a??1;
    const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'#123a26');g.addColorStop(1,'#16452d');ctx.fillStyle=g;const A=V.P(o.half?52.5:0,-34),B=V.P(105,34);
    ctx.beginPath();[[o.half?52.5:0,-34],[105,-34],[105,34],[o.half?52.5:0,34]].forEach((p,i)=>{const q=V.P(...p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.closePath();ctx.fill();
    /* faixas de grama */ctx.save();ctx.clip();for(let k=0;k<12;k++){if(k%2)continue;const x0=k*105/12;ctx.fillStyle='rgba(255,255,255,.035)';ctx.beginPath();[[x0,-34],[x0+105/12,-34],[x0+105/12,34],[x0,34]].forEach((p,i)=>{const q=V.P(...p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.fill()}ctx.restore();
    ctx.strokeStyle='rgba(236,230,214,.75)';ctx.lineWidth=Math.max(1.5,V.s*.12);
    seg(ctx,V,[[o.half?52.5:0,-34],[105,-34],[105,34],[o.half?52.5:0,34]],!o.half);seg(ctx,V,[[52.5,-34],[52.5,34]]);arc(ctx,V,52.5,0,9.15,-Math.PI/2,Math.PI/2);
    seg(ctx,V,[[105,-20.16],[88.5,-20.16],[88.5,20.16],[105,20.16]]);seg(ctx,V,[[105,-9.16],[99.5,-9.16],[99.5,9.16],[105,9.16]]);
    const ps=V.P(94,0);ctx.fillStyle='rgba(236,230,214,.75)';ctx.beginPath();ctx.arc(ps[0],ps[1],Math.max(2,V.s*.2),0,TAU);ctx.fill();
    const ang=Math.acos(5.5/9.15);arc(ctx,V,94,0,9.15,Math.PI-ang,Math.PI+ang);ctx.restore()}
  function goal(ctx,V,x=105,y=0,o={}){ctx.save();ctx.globalAlpha*=o.a??1;ctx.strokeStyle=C.chalk;ctx.lineWidth=Math.max(3,V.s*.25);ctx.shadowColor=C.chalk;ctx.shadowBlur=8;seg(ctx,V,[[x,y-3.66],[x+2,y-3.66],[x+2,y+3.66],[x,y+3.66]]);
    ctx.globalAlpha*=.25;ctx.lineWidth=1;for(let i=1;i<8;i++)seg(ctx,V,[[x,y-3.66+i*7.32/8],[x+2,y-3.66+i*7.32/8]]);ctx.restore()}
  function ball(ctx,x,y,r,rot=0,o={}){if((o.a??1)<=0)return;ctx.save();ctx.globalAlpha*=o.a??1;ctx.translate(x,y);ctx.shadowColor=o.glowColor||C.chalk;ctx.shadowBlur=o.glow??12;ctx.fillStyle='#f4f1e8';ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.clip();ctx.fillStyle='#1b1d24';const pent=(cx,cy,s,ph)=>{ctx.beginPath();for(let i=0;i<5;i++){const a=ph+i*TAU/5;i?ctx.lineTo(cx+Math.cos(a)*s,cy+Math.sin(a)*s):ctx.moveTo(cx+Math.cos(a)*s,cy+Math.sin(a)*s)}ctx.closePath();ctx.fill()};
    pent(0,0,r*.32,rot);for(let i=0;i<5;i++){const a=rot+i*TAU/5+Math.PI/5;pent(Math.cos(a)*r*.9,Math.sin(a)*r*.9,r*.3,a)}
    ctx.strokeStyle='rgba(27,29,36,.5)';ctx.lineWidth=Math.max(1,r*.05);for(let i=0;i<5;i++){const a=rot+i*TAU/5;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.32,Math.sin(a)*r*.32);ctx.lineTo(Math.cos(a)*r*.62,Math.sin(a)*r*.62);ctx.stroke()}ctx.restore()}
  function vec(ctx,x,y,dx,dy,o={}){const a=o.a??1;if(a<=0)return;const L=Math.hypot(dx,dy);if(L<2)return;const ux=dx/L,uy=dy/L,h=Math.min(22,L*.4),col=o.color||C.gold;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=o.lw||5;ctx.lineCap='round';ctx.shadowColor=col;ctx.shadowBlur=10;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx-ux*h*.8,y+dy-uy*h*.8);ctx.stroke();ctx.beginPath();ctx.moveTo(x+dx,y+dy);ctx.lineTo(x+dx-ux*h-uy*h*.55,y+dy-uy*h+ux*h*.55);ctx.lineTo(x+dx-ux*h+uy*h*.55,y+dy-uy*h-ux*h*.55);ctx.closePath();ctx.fill();ctx.restore();
    if(o.label){const al=ux<-.5?'right':ux>.5?'left':'center';txt(ctx,o.label,x+dx+ux*18+(o.lx||0),y+dy+uy*34+9+(o.ly||0),{font:F.mono,size:o.size||26,color:col,a,align:al})}}
  function player(ctx,x,y,r,o={}){ctx.save();ctx.globalAlpha*=o.a??1;ctx.fillStyle=o.color||'#2f6fdb';ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,r,r*.62,o.rot||0,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle='#2b1d14';ctx.beginPath();ctx.arc(x,y,r*.42,0,TAU);ctx.fill();ctx.restore()}
  function path(ctx,V,tr,k,o={}){const n=Math.max(0,Math.min(tr.length-1,Math.floor(k)));if(n<1)return;const Q=[];for(let i=0;i<=n;i++)Q.push(V.P(tr[i].x+(o.x0||0),tr[i].y+(o.y0||0)));poly(ctx,Q,Q.length,{color:o.color||C.gold,lw:o.lw||4,glow:o.glow??10,a:o.a??1,dash:o.dash})}
  return {rk4,spin,at,until,view,pitch,goal,ball,vec,player,path};
})();
