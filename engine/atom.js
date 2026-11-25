/* ---------- ATOM: átomos e o microscópico em 3D (mesma câmera do W3D) ----------
   ATOM.cloud(ctx,c,{pos,r,n,t,a,color,seed,spin,kind})  nuvem de elétrons (densidade do orbital 1s, ou '2p' em halteres), pontos com brilho
   ATOM.nucleus(ctx,c,{pos,r,np,nn,t,a,glow})  núcleo: prótons (vermelhos) e nêutrons (cinza) empacotados, esferas sombreadas por profundidade
   ATOM.ball(ctx,c,[x,y,z],r,cor,{a,glow})  esfera sombreada projetada (átomos de moléculas, grãos)
   ATOM.water(ctx,c,{pos,s,rot,a})  molécula de água (O vermelho, 2 H brancos, 104,5°)
   ATOM.rbc(ctx,x,y,r,{a,tilt})  glóbulo vermelho (disco bicôncavo) em 2D
   ATOM.micro(ctx,x0,y,pxPorMetro,{max,step,lab})  régua de microscópio (µm)   ATOM.cota(ctx,xa,xb,ytopo,y,rótulo,{color,below})  cota com setas
   ATOM.ruler(ctx,x,y0,y1,v,{min,max,a})  régua logarítmica com prefixos do SI (fm … km), marcador no valor v (em metros) */
const ATOM=(()=>{
  const C2={};
  function pts(seed,n,kind){const k=seed+':'+n+':'+kind;if(C2[k])return C2[k];const R=FX.rng(seed),P=[];
    for(let i=0;i<n;i++){/* 1s: |ψ|²r² ∝ r² e^{-2r} → raio ~ Gama(3, 1/2) */let r=-(Math.log(R()+1e-9)+Math.log(R()+1e-9)+Math.log(R()+1e-9))/2,u=R()*2-1,ph=R()*TAU,s=Math.sqrt(1-u*u);
      let d=[s*Math.cos(ph),u,s*Math.sin(ph)];if(kind==='2p'){/* lóbulos ao longo de y: aceita por cos² */if(R()>u*u){i--;continue}r*=1.6}
      P.push([d[0]*r,d[1]*r,d[2]*r,R()])}return C2[k]=P}
  function cloud(ctx,c,o={}){const P=pts(o.seed??7,o.n??2600,o.kind||'1s'),[px,py,pz]=o.pos||[0,0,0],r=(o.r??1)/2.2,a=o.a??1,t=o.t||0,sp=o.spin??.15,cs=Math.cos(t*sp),sn=Math.sin(t*sp),col=o.color||C.cyan;if(a<=0)return;
    ctx.save();ctx.globalCompositeOperation='lighter';{const q=c.P([px,py,pz]),e=c.P([px+r*2.4,py,pz]);if(isFinite(q[0])&&isFinite(e[0])){const rr=Math.hypot(e[0]-q[0],e[1]-q[1]),g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],rr);g.addColorStop(0,FX.rgba(col,.22*a));g.addColorStop(.5,FX.rgba(col,.08*a));g.addColorStop(1,FX.rgba(col,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],rr,0,TAU);ctx.fill()}}ctx.fillStyle=col;
    for(const [x,y,z,w] of P){const j=FX.noise(w*40,t*.6)*.06,X=(x*cs-z*sn)*r*(1+j),Z=(x*sn+z*cs)*r*(1+j),q=c.P([px+X,py+y*r,pz+Z]);if(!isFinite(q[0])||q[0]<-20||q[0]>W+20||q[1]<-20||q[1]>H+20)continue;
      const tw=.55+.45*Math.sin(t*2.2+w*40);ctx.globalAlpha=a*.55*tw;const s=Math.max(1.6,Math.min(5,c.f*r*.03/q[2]));ctx.fillRect(q[0]-s/2,q[1]-s/2,s,s)}
    ctx.restore()}
  function ball(ctx,c,p,r,col,o={}){const q=c.P(p),e=c.P([p[0]+r,p[1],p[2]]);if(!isFinite(q[0])||!isFinite(e[0]))return;const R=Math.hypot(e[0]-q[0],e[1]-q[1]);if(R<.4)return;
    ctx.save();ctx.globalAlpha*=o.a??1;if(o.glow){ctx.shadowColor=col;ctx.shadowBlur=o.glow}const g=ctx.createRadialGradient(q[0]-R*.35,q[1]-R*.4,R*.08,q[0],q[1],R);
    g.addColorStop(0,'#ffffff');g.addColorStop(.28,col);g.addColorStop(1,shade(col,.35));ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],R,0,TAU);ctx.fill();ctx.restore();return q[2]}
  const shade=(c,k)=>{const n=parseInt(c.slice(1,7),16);return `rgb(${Math.round((n>>16&255)*k)},${Math.round((n>>8&255)*k)},${Math.round((n&255)*k)})`};
  function nucleus(ctx,c,o={}){const np=o.np??6,nn=o.nn??6,n=np+nn,[px,py,pz]=o.pos||[0,0,0],R=o.r??1,t=o.t||0,a=o.a??1,k='n'+n,rb=R/Math.cbrt(n)*.95;if(a<=0)return;
    if(!C2[k]){const Rg=FX.rng(n*13+1),L=[];for(let i=0;i<n;i++){const y=1-2*(i+.5)/n,s=Math.sqrt(1-y*y),th=i*2.39996,rr=Math.cbrt((i+.6)/n);L.push([s*Math.cos(th)*rr,y*rr,s*Math.sin(th)*rr,Rg()])}C2[k]=L}
    const cs=Math.cos(t*.4),sn=Math.sin(t*.4),L=C2[k].map(([x,y,z,w],i)=>{const X=x*cs-z*sn,Z=x*sn+z*cs,P=[px+X*(R-rb),py+y*(R-rb),pz+Z*(R-rb)];return {P,d:Math.hypot(P[0]-c.eye[0],P[1]-c.eye[1],P[2]-c.eye[2]),col:i%2?'#9aa3b5':'#e8604c'}}).sort((a,b)=>b.d-a.d);
    ctx.save();ctx.globalAlpha*=a;if(o.glow){const q=c.P([px,py,pz]),e=c.P([px+R,py,pz]);if(isFinite(q[0])){const rr=Math.max(4,Math.hypot(e[0]-q[0],e[1]-q[1])*2.6),g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],rr);g.addColorStop(0,FX.rgba(C.gold,.55));g.addColorStop(1,FX.rgba(C.gold,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],rr,0,TAU);ctx.fill()}}
    L.forEach(b=>ball(ctx,c,b.P,rb,b.col));ctx.restore()}
  function water(ctx,c,o={}){const [px,py,pz]=o.pos||[0,0,0],s=o.s??1,r=o.rot||0,ang=104.5*Math.PI/360,L=[[0,0,0,'#e8604c',.66],[Math.sin(ang)*.96,-Math.cos(ang)*.96,0,'#eef1f6',.45],[-Math.sin(ang)*.96,-Math.cos(ang)*.96,0,'#eef1f6',.45]];
    L.map(([x,y,z,col,rr])=>{const X=x*Math.cos(r)-z*Math.sin(r),Z=x*Math.sin(r)+z*Math.cos(r),P=[px+X*s,py+y*s,pz+Z*s];return {P,col,rr,d:Math.hypot(P[0]-c.eye[0],P[1]-c.eye[1],P[2]-c.eye[2])}}).sort((a,b)=>b.d-a.d).forEach(b=>ball(ctx,c,b.P,b.rr*s,b.col,{a:o.a}))}
  function rbc(ctx,x,y,r,o={}){const k=o.tilt??.55;ctx.save();ctx.globalAlpha*=o.a??1;ctx.translate(x,y);ctx.scale(1,k);let g=ctx.createRadialGradient(0,0,r*.1,0,0,r);g.addColorStop(0,'#7e1f22');g.addColorStop(.45,'#a3282b');g.addColorStop(.8,'#d2463f');g.addColorStop(1,'#8c2326');
    ctx.fillStyle=g;ctx.shadowColor='#d2463f';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.shadowBlur=0;g=ctx.createRadialGradient(-r*.15,-r*.2,0,0,0,r*.55);g.addColorStop(0,'rgba(60,10,14,.65)');g.addColorStop(1,'rgba(60,10,14,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*.55,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(255,170,160,.35)';ctx.lineWidth=2/k*.5;ctx.beginPath();ctx.arc(0,0,r*.92,Math.PI*1.1,Math.PI*1.8);ctx.stroke();ctx.restore()}
  /* régua log com prefixos do SI */
  const SI=[[1e-15,'1 fm'],[1e-12,'1 pm'],[1e-9,'1 nm'],[1e-6,'1 µm'],[1e-3,'1 mm'],[1,'1 m'],[1e3,'1 km'],[1e7,'10.000 km']];
  function ruler(ctx,x,y0,y1,v,o={}){const lo=Math.log10(o.min??1e-15),hi=Math.log10(o.max??10),Y=val=>lerp(y1,y0,(Math.log10(val)-lo)/(hi-lo)),a=o.a??1;if(a<=0)return;
    ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle='rgba(236,230,214,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y1);ctx.stroke();
    SI.filter(([val])=>Math.log10(val)>=lo-1e-9&&Math.log10(val)<=hi+1e-9).forEach(([val,s])=>{const y=Y(val);ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x+10,y);ctx.stroke();txt(ctx,s,x-18,y+7,{font:F.mono,size:20,color:C.dim,align:'right'})});
    for(let e=Math.ceil(lo);e<=hi;e++){const y=Y(Math.pow(10,e));ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.stroke()}
    const y=Y(clamp(v,Math.pow(10,lo),Math.pow(10,hi)));ctx.fillStyle=C.gold;ctx.shadowColor=C.gold;ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(x+12,y);ctx.lineTo(x+30,y-10);ctx.lineTo(x+30,y+10);ctx.closePath();ctx.fill();ctx.restore()}
  /* tamanho legível em metros: 6,7 µm · 1,2 cm · 1,75 m */
  function fmt(m){const u=[[1e3,'km'],[1,'m'],[1e-2,'cm'],[1e-3,'mm'],[1e-6,'µm'],[1e-9,'nm'],[1e-12,'pm'],[1e-15,'fm']];for(const [k,s] of u)if(m>=k*.9999){const v=m/k;return (v>=100?Math.round(v).toString():v>=10?v.toFixed(0):v.toFixed(1).replace(/\.0$/,'')).replace('.',',')+' '+s}return m.toExponential(1)+' m'}
  /* régua de microscópio (lâmina de vidro) em tela: x0 = zero, ppm = pixels por metro, max e passo em µm */
  function micro(ctx,x0,y,ppm,o={}){const a=o.a??1,mx=o.max??10,st=o.step??1,lb=o.lab??5,u=ppm*1e-6,w=mx*u;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;
    const g=ctx.createLinearGradient(0,y-14,0,y+66);g.addColorStop(0,'rgba(170,210,230,.10)');g.addColorStop(1,'rgba(170,210,230,.22)');ctx.fillStyle=g;ctx.fillRect(x0-40,y-14,w+100,80);ctx.strokeStyle='rgba(200,230,245,.4)';ctx.lineWidth=1.5;ctx.strokeRect(x0-40,y-14,w+100,80);
    ctx.strokeStyle='#f2f6f8';ctx.shadowColor='#ffffff';ctx.shadowBlur=6;for(let i=0;i<=mx/st+1e-9;i++){const x=x0+i*st*u,big=Math.abs((i*st)%lb)<1e-9;ctx.lineWidth=big?2.4:1.4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+(big?26:14));ctx.stroke();
      if(big)txt(ctx,String(Math.round(i*st)),x,y+52,{font:F.mono,size:22,color:'#f2f6f8'})}ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x0+w,y);ctx.stroke();txt(ctx,'µm',x0+w+34,y+22,{font:F.mono,size:20,color:'#f2f6f8',align:'left'});ctx.restore()}
  /* cota: linhas de chamada descendo de ytop até y, seta dupla e rótulo */
  function cota(ctx,xa,xb,ytop,y,label,o={}){const a=o.a??1,col=o.color||C.gold;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=2;ctx.shadowColor=col;ctx.shadowBlur=8;ctx.setLineDash([6,5]);
    ctx.beginPath();ctx.moveTo(xa,ytop);ctx.lineTo(xa,y+8);ctx.moveTo(xb,ytop);ctx.lineTo(xb,y+8);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(xa,y);ctx.lineTo(xb,y);ctx.stroke();
    [[xa,1],[xb,-1]].forEach(([x,d])=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12*d,y-6);ctx.lineTo(x+12*d,y+6);ctx.closePath();ctx.fill()});ctx.restore();
    if(label)txt(ctx,label,(xa+xb)/2,y+(o.below?34:-14),{font:F.mono,size:o.size||26,color:col,a})}
  return {cloud,nucleus,ball,water,rbc,ruler,fmt,micro,cota}})();
