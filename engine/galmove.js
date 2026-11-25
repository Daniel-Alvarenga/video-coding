/* ---------- GMOV: o Sistema Solar se movendo pela galáxia (v3.17, 2026-11-07) — exemplo projetos/sistema-solar-espiral/ ----------
   Mesma câmera do W3D/COS (x = leste, y = cima, z = sul).
   GMOV.well(ctx,c,{center,R,depth,soft,n,m,col,a,t,rings,ringCol,ringSpeed,sink})  grade de espaço-tempo que afunda (poço de potencial
       de Plummer: y = −depth·sink/√(1+(r/soft)²)), linhas somem na borda; rings = nº de anéis de gravidade que saem do centro pela
       superfície (pulso contínuo, ringSpeed voltas/s). Devolve fy(r) = altura da superfície no raio r (para pôr objetos em cima).
   GMOV.galaxy3D(ctx,c,{center,R,rot,a,up,bulge})  textura da Via Láctea do COS presa a um disco 3D de verdade (perspectiva certa em
       qualquer ângulo, inclusive de lado, quando entra o bojo luminoso e o disco fino). up = normal do disco (padrão [0,1,0]).
       Devolve P(rf,ang) = ponto 3D no disco (rf em frações do raio, ang em rad no sentido da textura girada).
   GMOV.chevrons(ctx,c,{center,R,n,rot,size,a,col,up,dir})  anel de setas no plano do disco apontando no sentido da rotação (dir = ±1),
       girando com rot; cada seta some de lado para nunca virar um risco.
   GMOV.sunPath(th,{v,dir,pole,amp,P,ph})  posição do Sol: avanço v·th na direção dir + oscilação amp·sin(2π·th/P + ph) ao longo de pole
       (o Sol sobe e desce pelo disco da galáxia). Use como cfg.s0 do COS.helix: s0:th=>GMOV.sunPath(th,{...})
   GMOV.updown(ctx,x,y,{dir,size,a,col,t})  seta dupla ^^ (dir = −1 para cima, 1 para baixo) com brilho e pulso
   GMOV.lock(ctx,x,y,s,{a,col,open,t})  cadeado vetorial (open 0..1 abre a alça)
   GMOV.speedRibbons(ctx,c,fn,t0,t1,{n,col,lw,a,w})  fitas largas e translúcidas atrás de um corpo em movimento (rastro de fn(t) com largura) */
const GMOV=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  const ok=q=>q&&isFinite(q[0])&&isFinite(q[1]);
  /* base ortonormal de um plano com normal up */
  const basis=up=>{const n=nrm(up||[0,1,0]),e1=nrm(crs(n,Math.abs(n[2])<.9?[0,0,1]:[1,0,0])),e2=crs(e1,n);return {n,e1,e2}};

  /* ---------- grade que afunda ---------- */
  function well(ctx,c,o={}){const a=o.a??1,Ct=o.center||[0,0,0],R=o.R||10,D=(o.depth??R*.35)*(o.sink??1),s=o.soft||R*.16,n=o.n||26,m=o.m||64,col=o.col||'#5aa8ff';
    const fy=r=>-D/Math.sqrt(1+(r/s)*(r/s))+D/Math.sqrt(1+(R/s)*(R/s));
    if(a<=0)return fy;const pt=(x,z)=>{const r=Math.hypot(x,z);return add(Ct,[x,fy(r),z])};
    ctx.save();ctx.lineCap='round';ctx.strokeStyle=col;
    const A0=ctx.globalAlpha,LA=o.lineA??.55;
    const line=(f,ga)=>{let prev=null,pr=0;for(let k=0;k<=m;k++){const u=-1+2*k/m,[x,z]=f(u),q=c.P(pt(x,z)),r=Math.hypot(x,z)/R;
        if(prev&&ok(q)&&ok(prev)){const fade=Math.pow(clamp(1-Math.max(r,pr)),1.3);if(fade>0){ctx.globalAlpha=A0*a*fade*LA*ga;ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}}prev=q;pr=r}};
    for(const [lw,ga] of [[(o.lw||1.4)*3.2,.18],[o.lw||1.4,1]]){ctx.lineWidth=lw;for(let i=0;i<=n;i++){const v=-1+2*i/n;line(u=>[u*R,v*R],ga);line(u=>[v*R,u*R],ga)}}
    /* anéis de gravidade saindo do centro pela superfície */
    const K=o.rings??0;if(K>0){const t=o.t||0,sp=o.ringSpeed??.35,rc=o.ringCol||C.cyan;ctx.strokeStyle=rc;ctx.shadowColor=rc;ctx.shadowBlur=14;
      for(let k=0;k<K;k++){const u=((t*sp+k/K)%1+1)%1,rr=lerp(s*.6,R*.95,u),al=a*Math.sin(Math.PI*u)*(o.ringA??.8);if(al<=.01)continue;ctx.globalAlpha=A0*al;ctx.lineWidth=2.4*(1-u*.5);ctx.beginPath();let st=false;
        for(let j=0;j<=96;j++){const an=j/96*TAU,q=c.P(pt(rr*Math.cos(an),rr*Math.sin(an)));if(!ok(q)){st=false;continue}if(!st){ctx.moveTo(q[0],q[1]);st=true}else ctx.lineTo(q[0],q[1])}ctx.stroke()}}
    ctx.restore();return fy}

  /* ---------- galáxia num disco 3D ---------- */
  const BULGE=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
    gr.addColorStop(0,'rgba(255,246,226,1)');gr.addColorStop(.25,'rgba(255,222,180,.6)');gr.addColorStop(.6,'rgba(200,190,230,.16)');gr.addColorStop(1,'rgba(120,140,200,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return cv})();
  function galaxy3D(ctx,c,o={}){const a=o.a??1,Ct=o.center||[0,0,0],R=o.R||10,rot=o.rot||0,{n,e1,e2}=basis(o.up),T=COS.galaxyTex(),k=1/.47;
    const ax=mul(add(mul(e1,Math.cos(rot)),mul(e2,Math.sin(rot))),R*k),ay=mul(add(mul(e1,-Math.sin(rot)),mul(e2,Math.cos(rot))),R*k);
    const P=(rf,ang)=>add(Ct,add(mul(ax,rf*Math.cos(ang)/k),mul(ay,rf*Math.sin(ang)/k)));if(a<=0)return P;
    const P0=sub(sub(Ct,ax),ay),PU=add(sub(Ct,ay),ax),PV=add(sub(Ct,ax),ay);
    const view=Math.abs(dot(nrm(sub(c.eye,Ct)),n));
    ctx.save();ctx.globalCompositeOperation='lighter';GMAP.quad(ctx,c,T,P0,PU,PV,{n:o.grid||24,a:a*(o.texA??1)});
    /* bojo e disco fino quando visto de lado */
    const q=c.P(Ct);if(ok(q)&&q[2]>0){const Rp=c.f*R/q[2],ed=1-view,bs=Rp*(.32+.12*ed)*(o.bulge??1);ctx.globalAlpha=a*(.45+.5*ed);ctx.drawImage(BULGE,q[0]-bs,q[1]-bs*(.62+.38*view),2*bs,2*bs*(.62+.38*view));
      if(ed>.6){const A=c.P(add(Ct,mul(e1,R))),B=c.P(sub(Ct,mul(e1,R))),A2=c.P(add(Ct,mul(e2,R))),B2=c.P(sub(Ct,mul(e2,R)));const [p1,p2]=Math.hypot(A[0]-B[0],A[1]-B[1])>Math.hypot(A2[0]-B2[0],A2[1]-B2[1])?[A,B]:[A2,B2];
        if(ok(p1)&&ok(p2)){ctx.globalAlpha=a*(ed-.6)/.4*.5;const g=ctx.createLinearGradient(p1[0],p1[1],p2[0],p2[1]);g.addColorStop(0,'rgba(140,170,230,0)');g.addColorStop(.5,'rgba(230,226,240,.9)');g.addColorStop(1,'rgba(140,170,230,0)');
          ctx.strokeStyle=g;ctx.lineWidth=Math.max(2,Rp*.035);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);ctx.stroke()}}}
    ctx.restore();return P}

  /* ---------- anel de setas ---------- */
  function chevrons(ctx,c,o={}){const a=o.a??1;if(a<=0)return;const Ct=o.center||[0,0,0],R=o.R||10,N=o.n||22,rot=o.rot||0,sz=o.size||R*.09,col=o.col||'#cfe6ff',dir=o.dir??1,{e1,e2,n}=basis(o.up);
    ctx.save();ctx.strokeStyle=col;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=col;ctx.shadowBlur=12;
    for(let i=0;i<N;i++){const an=rot+i/N*TAU,ra=add(mul(e1,Math.cos(an)),mul(e2,Math.sin(an))),ta=mul(add(mul(e1,-Math.sin(an)),mul(e2,Math.cos(an))),dir),p=add(Ct,mul(ra,R));
      const tip=c.P(add(p,mul(ta,sz*.5))),l=c.P(add(add(p,mul(ta,-sz*.5)),mul(ra,sz*.55))),r=c.P(add(add(p,mul(ta,-sz*.5)),mul(ra,-sz*.55)));if(!ok(tip)||!ok(l)||!ok(r))continue;
      const w=Math.abs((l[0]-tip[0])*(r[1]-tip[1])-(l[1]-tip[1])*(r[0]-tip[0])),side=clamp(w/(Math.pow(c.f*sz/Math.max(.001,tip[2]),2)*.5+1e-6));
      ctx.globalAlpha=a*clamp(side*1.6);ctx.lineWidth=Math.max(2,c.f*sz*.16/Math.max(.001,tip[2]));ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.lineTo(tip[0],tip[1]);ctx.lineTo(r[0],r[1]);ctx.stroke()}
    ctx.restore()}

  /* ---------- Sol que sobe e desce ---------- */
  function sunPath(th,o={}){const v=o.v??1,d=nrm(o.dir||[1,0,0]),p=nrm(o.pole||[0,1,0]),A=o.amp??0,P=o.P||10;return add(mul(d,v*th),mul(p,A*Math.sin(TAU*th/P+(o.ph||0))))}

  /* ---------- setas ^^ ---------- */
  function updown(ctx,x,y,o={}){const a=o.a??1;if(a<=0)return;const s=o.size||60,d=o.dir??-1,col=o.col||C.gold,t=o.t||0,pu=.5+.5*Math.sin(t*6);ctx.save();ctx.translate(x,y+d*s*.12*pu);ctx.strokeStyle=col;ctx.shadowColor=col;
    ctx.lineCap='round';ctx.lineJoin='round';for(const [k,al] of [[0,1],[1,.55]]){const yy=-d*k*s*.55;ctx.globalAlpha=a*al;ctx.shadowBlur=22;ctx.lineWidth=s*.2;ctx.beginPath();ctx.moveTo(-s*.55,yy-d*s*.3);ctx.lineTo(0,yy+d*s*.3);ctx.lineTo(s*.55,yy-d*s*.3);ctx.stroke()}ctx.restore()}

  /* ---------- cadeado ---------- */
  function lock(ctx,x,y,s,o={}){const a=o.a??1;if(a<=0)return;const col=o.col||C.gold,op=clamp(o.open||0);ctx.save();ctx.translate(x,y);ctx.globalAlpha*=a;ctx.shadowColor=col;ctx.shadowBlur=24;
    ctx.strokeStyle=col;ctx.lineWidth=s*.14;ctx.lineCap='round';ctx.save();ctx.translate(s*.28*op,-s*.18*op);ctx.beginPath();ctx.moveTo(-s*.28,-s*.05);ctx.lineTo(-s*.28,-s*.32);ctx.arc(0,-s*.32,s*.28,Math.PI,0);ctx.lineTo(s*.28,-s*.05+(op>0?-s*.12:0));ctx.stroke();ctx.restore();
    const g=ctx.createLinearGradient(0,-s*.1,0,s*.5);g.addColorStop(0,col);g.addColorStop(1,FX.rgba?FX.rgba(col,.8):col);ctx.fillStyle=g;const w=s*.82,h=s*.6,r=s*.1;ctx.beginPath();ctx.moveTo(-w/2+r,-s*.08);ctx.lineTo(w/2-r,-s*.08);ctx.quadraticCurveTo(w/2,-s*.08,w/2,-s*.08+r);
    ctx.lineTo(w/2,-s*.08+h-r);ctx.quadraticCurveTo(w/2,-s*.08+h,w/2-r,-s*.08+h);ctx.lineTo(-w/2+r,-s*.08+h);ctx.quadraticCurveTo(-w/2,-s*.08+h,-w/2,-s*.08+h-r);ctx.lineTo(-w/2,-s*.08+r);ctx.quadraticCurveTo(-w/2,-s*.08,-w/2+r,-s*.08);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='rgba(8,10,18,.85)';ctx.beginPath();ctx.arc(0,s*.17,s*.075,0,TAU);ctx.fill();ctx.fillRect(-s*.03,s*.17,s*.06,s*.15);ctx.restore()}

  /* ---------- fitas largas de velocidade ---------- */
  function speedRibbons(ctx,c,fn,t0,t1,o={}){const a=o.a??1;if(a<=0||t1<=t0)return;const n=o.n||40,col=o.col||'#62d0ea',w=o.w||12,Q=[];for(let k=0;k<=n;k++)Q.push(c.P(fn(lerp(t0,t1,k/n))));
    ctx.save();ctx.lineCap='round';ctx.strokeStyle=col;for(let k=1;k<=n;k++){const A=Q[k-1],B=Q[k];if(!ok(A)||!ok(B))continue;const u=k/n;ctx.globalAlpha=a*Math.pow(u,1.6)*.5;ctx.lineWidth=w*(.3+.7*u);ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}ctx.restore()}

  return {well,galaxy3D,chevrons,sunPath,updown,lock,speedRibbons,basis}})();
