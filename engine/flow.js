/* ---------- FLOW: correntes de partículas sobre mapas e globos (sempre injetado) ----------
   FLOW.route([[lat,lon],...])  rota suave (Catmull-Rom) -> função u(0..1) -> [lat,lon]
   FLOW.stream(ctx,P,route,t,{n,seed,speed,width,color,a,size,head,tail,fall,grow})
       P(lat,lon) -> [x,y,visível?] (EARTH.flat devolve P; EARTH.proj(view) também serve)
       head: até onde a frente já chegou (0..1); width: largura da corrente em graus; fall: [u0,u1,fração] trecho onde partículas caem
   FLOW.deposit(ctx,P,{lat,lon,rlat,rlon,n,seed,t0,dur,t,color,size,a})  pontos que vão se acumulando numa região (elipse em graus)
   FLOW.split(ctx,x,y,w,h,{total,parts:[{v,label,color}],p,unit,a,fmt})  barra de massa que se divide em partes (tipo Sankey)
   FLOW.sat(ctx,x,y,s,t,{a,beam:comprimento})  satélite com painéis e feixe de laser apontando para baixo */
const FLOW=(()=>{
  function route(pts){const n=pts.length,seg=n-1;return u=>{u=clamp(u);const f=u*seg,i=Math.min(seg-1,Math.floor(f)),s=f-i,p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(n-1,i+2)];
    const cr=(a,b,c,d)=>.5*(2*b+(-a+c)*s+(2*a-5*b+4*c-d)*s*s+(-a+3*b-3*c+d)*s*s*s);return [cr(p0[0],p1[0],p2[0],p3[0]),cr(p0[1],p1[1],p2[1],p3[1])]}}
  function stream(ctx,P,R,t,o={}){const n=o.n||600,Rn=FX.rng(o.seed||3),sp=o.speed??.06,wd=o.width??3,head=o.head??1,col=o.color||'#e8c88a',sz=o.size||2.2,a=o.a??1;if(a<=0)return;
    ctx.save();ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=o.glow??4;
    for(let i=0;i<n;i++){const ph=Rn(),off=(Rn()-.5)*2,jit=Rn(),falls=o.fall&&Rn()<o.fall[2],fu=o.fall?lerp(o.fall[0],o.fall[1],Rn()):1;
      let u=(ph+t*sp*(.8+.4*jit))%1;if(u>head)continue;if(falls&&u>fu)continue;
      const w=wd*(o.grow?lerp(.4,1.3,u):1),q=R(u),q2=R(Math.min(1,u+.01)),dl=q2[0]-q[0],dn=q2[1]-q[1],L=Math.hypot(dl,dn)||1;
      const la=q[0]+(-dn/L)*off*w+FX.noise(i*.3,t*.4)*w*.25,lo=q[1]+(dl/L)*off*w;const s=P(la,lo);if(s.length>2&&s[2]===false)continue;
      const edge=1-Math.abs(off)**2,fade=Math.min(1,u*12)*Math.min(1,(head-u)*20+.2)*(falls?Math.min(1,(fu-u)*25):1);ctx.globalAlpha=a*edge*fade*(.35+.5*jit);
      ctx.beginPath();ctx.arc(s[0],s[1],sz*(.6+.8*jit),0,TAU);ctx.fill()}ctx.restore()}
  function deposit(ctx,P,o){const n=o.n||300,R=FX.rng(o.seed||9),k=Math.floor(n*clamp((o.t-o.t0)/(o.dur||4)));ctx.save();ctx.fillStyle=o.color||'#e8c88a';ctx.globalAlpha*=o.a??1;
    for(let i=0;i<k;i++){const r=Math.sqrt(R()),th=R()*TAU,s=P(o.lat+Math.sin(th)*r*o.rlat,o.lon+Math.cos(th)*r*o.rlon);if(s.length>2&&s[2]===false)continue;ctx.beginPath();ctx.arc(s[0],s[1],(o.size||2)*(.6+R()*.8),0,TAU);ctx.fill()}ctx.restore();return k}
  function split(ctx,x,y,w,h,o){const tot=o.total,p=o.p??1,a=o.a??1;if(a<=0)return;const fmt=o.fmt||(v=>Math.round(v).toLocaleString(LANG==='pt'?'pt-BR':'en-US'));
    ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=FX.rgba(o.color||'#e8c88a',.55);ctx.fillRect(x,y,w*.28,h);ctx.restore();
    txt(ctx,fmt(tot)+(o.unit||''),x+w*.14,y-14,{font:F.mono,size:26,color:o.color||'#e8c88a',a});
    let yy=y;const gap=10,H=h+gap*(o.parts.length-1);let ys=y-gap*(o.parts.length-1)/2;
    o.parts.forEach((pt,i)=>{const ph=h*pt.v/tot,u=ease(clamp(p*o.parts.length-i));if(u<=0){yy+=ph;return}const x0=x+w*.28,x1=x+w*.62,ty=ys;
      ctx.save();ctx.globalAlpha*=a*.55*u;ctx.fillStyle=pt.color;ctx.beginPath();ctx.moveTo(x0,yy);ctx.bezierCurveTo(lerp(x0,x1,.5),yy,lerp(x0,x1,.5),ty,x1,ty);ctx.lineTo(x1+(w-w*.62)*.25*u,ty);ctx.lineTo(x1+(w-w*.62)*.25*u,ty+ph);ctx.lineTo(x1,ty+ph);
      ctx.bezierCurveTo(lerp(x0,x1,.5),ty+ph,lerp(x0,x1,.5),yy+ph,x0,yy+ph);ctx.closePath();ctx.fill();ctx.restore();
      txt(ctx,fmt(pt.v)+'  '+pt.label,x1+(w-w*.62)*.25+16,ty+Math.max(ph/2,10)+9,{font:F.mono,size:24,color:pt.color,a:a*u,align:'left'});yy+=ph;ys+=ph+gap})}
  function sat(ctx,x,y,s,t,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;
    if(o.beam){const g=ctx.createLinearGradient(x,y,x,y+o.beam);g.addColorStop(0,'rgba(98,208,234,.8)');g.addColorStop(1,'rgba(98,208,234,0)');ctx.strokeStyle=g;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y+s*.4);ctx.lineTo(x,y+o.beam);ctx.stroke()}
    ctx.fillStyle='#cfd6e0';ctx.strokeStyle=C.chalk;ctx.lineWidth=2;ctx.fillRect(x-s*.35,y-s*.3,s*.7,s*.6);ctx.fillStyle='#2b4d8f';ctx.fillRect(x-s*1.5,y-s*.18,s*1,s*.36);ctx.fillRect(x+s*.5,y-s*.18,s*1,s*.36);
    ctx.strokeRect(x-s*1.5,y-s*.18,s*1,s*.36);ctx.strokeRect(x+s*.5,y-s*.18,s*1,s*.36);ctx.restore()}
  return {route,stream,deposit,split,sat};
})();
