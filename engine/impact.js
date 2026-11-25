/* ---------- IMP: impacto de asteroide com relevo real (exemplo: projetos/asteroide-everest/) ----------
   Mesma câmera do W3D/COS (COS.lookCam). Unidades livres (o exemplo usa km).
   IMP.rock({seed,sub,stretch,craters})  asteroide procedural: icosfera subdividida (sub 4 = 5.120 triângulos), relevo fbm, crateras com borda
       e albedo variado; raio médio 1 (escale com s). Guardado em cache por semente.
   IMP.drawRock(ctx,c,rk,{pos,rot:[yaw,pitch,roll],s,sun,amb,heat,vel,a})  pinta o asteroide: luz direcional, ambiente frio, borda clara;
       heat 0..1 acende em brasa a face voltada para vel (direção do movimento), como na entrada na atmosfera
   IMP.dem(nome)  relevo real carregado pelo build (meta.json "dem":["everest"] → kit/geo/everest.json): {nx,ny,cel_m,h,pico,fonte}
   IMP.terrain(dem,{step})  malha do relevo em km (pico em x=z=0, y = altitude em km; norte = −z)
   IMP.drawTerrain(ctx,c,tr,{pos,sun,haze:[r,g,b],hazeK,edge:[r,g,b],a,snow,warm,cloud:{y,col,k}})  pinta o relevo (cloud = mar de nuvens até a altitude y)
       (neve acima de ~5,3 km nas partes pouco
       inclinadas, gelo nos vales, rocha escura nas paredes), névoa pela distância e bordas que somem na cor edge (horizonte)
   IMP.profile(dem)  perfil da crista leste–oeste: [[x_km, altitude_km], ...] (máximo de cada coluna) para silhueta "fantasma"
   IMP.ghost(ctx,c,prof,{pos,u,col,a,fill})  desenha o perfil em pé no plano vertical que passa por pos (u = direção do eixo x do perfil)
   IMP.fireball(ctx,x,y,R,ang,heat,t,{a,len})  plasma da entrada em px: cauda de fogo para trás de ang (direção do movimento na tela),
       faíscas determinísticas e o clarão do choque na frente; chame IMP.bow depois de pintar a pedra para o brilho ficar por cima
   IMP.bow(ctx,x,y,R,ang,heat,t,{a})  clarão branco-amarelo na frente da pedra (onda de choque)
   IMP.circle3(ctx,c,center,u,v,r,{col,lw,a,glow,n,front})  círculo 3D no plano (u,v); front=[centro do globo] esconde o lado de trás
   IMP.dome(ctx,x,y,R,t,{a,squash})  bola de fogo do impacto (cúpula turbulenta branca → laranja → vermelha, base reta no chão)
   IMP.curtain(ctx,x,y,R,t,{a,ang})  cortina de detritos em cone saindo da cratera
   IMP.ejecta(ctx,c,E,Rg,n,t,{N,seed,a,T})  detritos balísticos sobre o globo (centro E, raio Rg) a partir da normal n do ponto de impacto:
       arcos de grande círculo com altura, cabeça incandescente e rastro; t = segundos desde o impacto (na escala do vídeo), T = duração média
   IMP.shockGlobe(ctx,c,E,Rg,n,ang,{col,a,lw})  anel da onda de choque com raio angular ang (rad) em volta do ponto de impacto
   IMP.planeIcon(ctx,x,y,s,{col,a,dir})  ícone de avião (2D) para marcar a altitude de cruzeiro
   IMP.shake(T,t0,{amp,dur,f})  tremor de câmera [dx,dy] depois de t0 (determinístico) */
const IMP=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  const mix=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];
  const basis=d=>{const w=nrm(d),u=nrm(crs(Math.abs(w[1])<.9?[0,1,0]:[1,0,0],w)),v=crs(w,u);return [u,v,w]};
  function rotM(r){const [y,p,ro]=r||[0,0,0],cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p),cr=Math.cos(ro),sr=Math.sin(ro);
    return v=>{let [x,yy,z]=v;[x,yy]=[x*cr-yy*sr,x*sr+yy*cr];[yy,z]=[yy*cp-z*sp,yy*sp+z*cp];[x,z]=[x*cy+z*sy,-x*sy+z*cy];return [x,yy,z]}}

  /* ---------- asteroide ---------- */
  const RK={};
  function rock(o={}){const seed=o.seed??7,sb=o.sub??4,key=seed+':'+sb;if(RK[key])return RK[key];const R=FX.rng(seed);
    const t=(1+Math.sqrt(5))/2;let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(nrm);
    let F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    for(let s=0;s<sb;s++){const mid={},F2=[],m=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(mid[k]!=null)return mid[k];V.push(nrm(mul(add(V[a],V[b]),.5)));return mid[k]=V.length-1};
      for(const [a,b,c] of F){const ab=m(a,b),bc=m(b,c),ca=m(c,a);F2.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}F=F2}
    const CR=[...Array(o.craters??26)].map(()=>{const p=nrm([R()*2-1,R()*2-1,R()*2-1]),r=.12+Math.pow(R(),2.2)*.42;return {p,r,d:r*(.28+R()*.18)}});
    const st=o.stretch||[1.18,.86,1];const crat=new Float32Array(V.length);
    const P=V.map((v,i)=>{let h=1+.16*FX.fbm(v[0]*1.3+seed,v[1]*1.3,v[2]*1.3,4)+.05*FX.fbm(v[0]*4.5,v[1]*4.5+seed,v[2]*4.5,3);let cr=0;
      for(const c of CR){const an=Math.acos(clamp(dot(v,c.p),-1,1))/c.r;if(an<1){h-=c.d*(1-an*an);cr=Math.max(cr,1-an)}else if(an<1.35)h+=c.d*.35*(1-(an-1)/.35)}
      crat[i]=cr;return [v[0]*h*st[0],v[1]*h*st[1],v[2]*h*st[2]]});
    const AL=F.map(([a,b,c])=>{const m=mul(add(add(V[a],V[b]),V[c]),1/3),n=FX.fbm(m[0]*6+3,m[1]*6,m[2]*6,3),cr=(crat[a]+crat[b]+crat[c])/3;
      const base=mix([104,96,88],[150,140,126],clamp(.5+n*1.6));return mix(base,[66,60,56],cr*.55)});
    return RK[key]={P,F,AL}}
  function drawRock(ctx,c,rk,o={}){const a=o.a??1;if(a<=0)return;const Rm=rotM(o.rot),s=o.s??1,P0=o.pos||[0,0,0],Ls=nrm(o.sun||[-.5,.6,.6]),amb=o.amb??.07,heat=o.heat||0,
      vd=nrm(o.vel||[0,-1,0]);const Wp=rk.P.map(v=>add(P0,mul(Rm(v),s))),Q=Wp.map(c.P),items=[];
    for(let i=0;i<rk.F.length;i++){const [ia,ib,ic]=rk.F[i],qa=Q[ia],qb=Q[ib],qc=Q[ic];if(!isFinite(qa[0])||!isFinite(qb[0])||!isFinite(qc[0]))continue;
      const A=Wp[ia],n=nrm(crs(sub(Wp[ib],A),sub(Wp[ic],A))),cen=mul(add(add(A,Wp[ib]),Wp[ic]),1/3),toE=nrm(sub(c.eye,cen)),fd=dot(n,toE);if(fd<=0)continue;
      const ld=Math.max(0,dot(n,Ls)),k=amb+(1-amb)*Math.pow(ld,.9),rim=Math.pow(1-fd,3)*.35*Math.max(0,ld+.2),al=rk.AL[i];
      let col=[al[0]*k+255*rim*.6+8*amb,al[1]*k+250*rim*.6+10*amb,al[2]*k+240*rim*.6+16*amb];
      if(heat>0){const hf=Math.pow(Math.max(0,dot(n,vd)),1.6)*heat,glow=mix([255,90,20],[255,236,180],clamp(hf*1.3-.3));col=mix(col,glow,clamp(hf*1.15));col=add(col,mul([255,120,40],heat*.12))}
      items.push([(qa[2]+qb[2]+qc[2])/3,qa,qb,qc,col])}
    items.sort((p,q)=>q[0]-p[0]);ctx.save();ctx.globalAlpha*=a;ctx.lineJoin='round';ctx.lineWidth=.7;
    for(const [,qa,qb,qc,col] of items){ctx.fillStyle=ctx.strokeStyle=`rgb(${Math.min(255,col[0])|0},${Math.min(255,col[1])|0},${Math.min(255,col[2])|0})`;
      ctx.beginPath();ctx.moveTo(qa[0],qa[1]);ctx.lineTo(qb[0],qb[1]);ctx.lineTo(qc[0],qc[1]);ctx.closePath();ctx.fill();ctx.stroke()}ctx.restore()}

  /* ---------- relevo real ---------- */
  const dem=k=>typeof __DEM__!=='undefined'?__DEM__[k]:null;
  const TR={};
  function terrain(D,o={}){const st=o.step||1,key=D.nx+':'+st;if(TR[key])return TR[key];const cel=D.cel_m/1000,nx=Math.floor((D.nx-1)/st)+1,ny=Math.floor((D.ny-1)/st)+1,P=[];
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const I=i*st,J=j*st;P.push([(I-D.pico[0])*cel,D.h[J*D.nx+I]/1000,(J-D.pico[1])*cel])}
    const F=[];for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;F.push([a,c,b],[b,c,d])}
    const ext=Math.max(...P.map(p=>Math.hypot(p[0],p[2])));return TR[key]={P,F,nx,ny,ext,x0:P[0][0],x1:P[nx-1][0],z0:P[0][2],z1:P[P.length-1][2]}}
  function drawTerrain(ctx,c,tr,o={}){const a=o.a??1;if(a<=0)return;const P0=o.pos||[0,0,0],Ls=nrm(o.sun||[-.6,.5,.4]),hz=o.haze||[150,170,200],hk=o.hazeK??60,eg=o.edge||hz,sn=o.snow??5.3;
    const Wp=tr.P.map(p=>add(p,P0)),Q=Wp.map(c.P),items=[],ex=Math.min(tr.x1-tr.x0,tr.z1-tr.z0)/2,cx=(tr.x0+tr.x1)/2,cz=(tr.z0+tr.z1)/2;
    for(const [ia,ib,ic] of tr.F){const qa=Q[ia],qb=Q[ib],qc=Q[ic];if(!isFinite(qa[0])||!isFinite(qb[0])||!isFinite(qc[0]))continue;
      const A=Wp[ia],n=nrm(crs(sub(Wp[ib],A),sub(Wp[ic],A))),cen=mul(add(add(A,Wp[ib]),Wp[ic]),1/3);if(dot(n,sub(c.eye,cen))<=0)continue;
      const L=tr.P[ia],h=(tr.P[ia][1]+tr.P[ib][1]+tr.P[ic][1])/3,up=n[1];
      /* cor por altitude e declive */
      let col=mix([96,84,74],[70,64,60],clamp((h-5)/2.5));
      const snow=clamp((h-sn)/.6)*clamp((up-.55)/.2),ice=clamp((h-4.9)/.4)*clamp((up-.82)/.08)*(1-snow);
      col=mix(col,[236,240,248],snow);col=mix(col,[196,210,226],ice*.85);
      const ld=Math.max(0,dot(n,Ls)),sky=.18+.12*up,k=sky+(1-sky)*ld;col=[col[0]*k*1.05,col[1]*k*1.02,col[2]*(k+.06)];
      if(o.cloud){const cl=o.cloud,nz=FX.fbm(cen[0]*.35,cen[2]*.35,1.7,3),k=clamp((cl.y+nz*.5-h)/.35);if(k>0)col=mix(col,cl.col||[236,214,206],k*(cl.k??1))}
      if(o.warm){const w=o.warm*ld;col=add(col,[w*40,w*18,-w*10])}
      const d=Math.hypot(...sub(cen,c.eye)),f=1-Math.exp(-d/hk);col=mix(col,hz,clamp(f*.9));
      const e=Math.max(Math.abs(L[0]-cx),Math.abs(L[2]-cz))/ex;col=mix(col,eg,clamp((e-.72)/.28));
      items.push([(qa[2]+qb[2]+qc[2])/3,qa,qb,qc,col])}
    items.sort((p,q)=>q[0]-p[0]);ctx.save();ctx.globalAlpha*=a;ctx.lineJoin='round';ctx.lineWidth=.8;
    for(const [,qa,qb,qc,col] of items){ctx.fillStyle=ctx.strokeStyle=`rgb(${clamp(col[0],0,255)|0},${clamp(col[1],0,255)|0},${clamp(col[2],0,255)|0})`;
      ctx.beginPath();ctx.moveTo(qa[0],qa[1]);ctx.lineTo(qb[0],qb[1]);ctx.lineTo(qc[0],qc[1]);ctx.closePath();ctx.fill();ctx.stroke()}ctx.restore()}
  function profile(D){const cel=D.cel_m/1000,out=[];for(let i=0;i<D.nx;i++){let m=0;for(let j=0;j<D.ny;j++)m=Math.max(m,D.h[j*D.nx+i]);out.push([(i-D.pico[0])*cel,m/1000])}return out}
  function ghost(ctx,c,prof,o={}){const a=o.a??1;if(a<=0)return;const P0=o.pos||[0,0,0],u=nrm(o.u||[1,0,0]),col=o.col||C.cyan,pts=[];
    for(const [x,y] of prof){const q=c.P(add(P0,add(mul(u,x),[0,y,0])));if(isFinite(q[0]))pts.push(q)}if(pts.length<2)return;
    const b0=c.P(add(P0,mul(u,prof[prof.length-1][0]))),b1=c.P(add(P0,mul(u,prof[0][0])));ctx.save();ctx.globalAlpha*=a;
    if(o.fill!==false&&isFinite(b0[0])&&isFinite(b1[0])){ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.lineTo(b0[0],b0[1]);ctx.lineTo(b1[0],b1[1]);ctx.closePath();
      const g=ctx.createLinearGradient(0,Math.min(...pts.map(q=>q[1])),0,b0[1]);g.addColorStop(0,FX.rgba(col,.5));g.addColorStop(1,FX.rgba(col,.12));ctx.fillStyle=g;ctx.fill()}
    ctx.strokeStyle=col;ctx.lineWidth=o.lw||4;ctx.shadowColor=col;ctx.shadowBlur=16;ctx.lineJoin='round';ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke();ctx.restore();return pts}

  /* ---------- fogo da entrada ---------- */
  function fireball(ctx,x,y,R,ang,heat,t,o={}){const a=(o.a??1)*clamp(heat*1.4);if(a<=0||R<.5)return;const dx=Math.cos(ang),dy=Math.sin(ang),px=-dy,py=dx,L=R*(o.len??(3+11*heat));
    ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';
    /* cauda: discos que esfriam (branco → laranja → vermelho) e ondulam */
    const N=46;for(let k=N;k>=0;k--){const u=k/N,d=u*L,wob=FX.noise(u*5-t*3,t*.7)*R*.35*u,cx=x-dx*d+px*wob,cy=y-dy*d+py*wob,r=R*(1.05+.9*u)*(1-.55*u*u),
      col=u<.12?[255,246,214]:u<.4?mix([255,214,120],[255,130,40],(u-.12)/.28):mix([255,130,40],[150,30,10],(u-.4)/.6),al=.32*(1-u)*(.7+.3*FX.noise(u*9,t*6));
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,`rgba(${col.join(',')},${al})`);g.addColorStop(1,`rgba(${col.join(',')},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fill()}
    /* faíscas: pedaços que se soltam e ficam para trás */
    const Rn=FX.rng(91);for(let i=0;i<70;i++){const sp=.6+Rn()*1.2,ph=(Rn()+t*sp*.9)%1,side=(Rn()*2-1),d=ph*L*1.1,off=side*R*(.4+ph*1.6),sx=x-dx*d+px*off,sy=y-dy*d+py*off,al=(1-ph)*heat;
      ctx.strokeStyle=`rgba(255,${200-120*ph|0},${120-100*ph|0},${al})`;ctx.lineWidth=Math.max(1,R*.05*(1-ph));ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx-dx*R*.5,sy-dy*R*.5);ctx.stroke()}
    ctx.restore()}
  function bow(ctx,x,y,R,ang,heat,t,o={}){const a=(o.a??1)*heat;if(a<=0)return;const dx=Math.cos(ang),dy=Math.sin(ang),fx=x+dx*R*.55,fy=y+dy*R*.55;ctx.save();ctx.globalCompositeOperation='lighter';
    for(const [k,al,col] of [[1.9,.55,'255,240,205'],[3.4,.25,'255,180,90'],[7,.12,'255,120,50']]){const r=R*k*(.95+.05*Math.sin(t*37)),g=ctx.createRadialGradient(fx,fy,0,fx,fy,r);g.addColorStop(0,`rgba(${col},${al*a})`);g.addColorStop(1,`rgba(${col},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(fx,fy,r,0,TAU);ctx.fill()}
    /* arco do choque: crescente brilhante abraçando a frente */
    const gg=ctx.createRadialGradient(fx,fy,R*.9,fx,fy,R*1.5);gg.addColorStop(0,`rgba(255,246,225,${.5*a})`);gg.addColorStop(1,'rgba(255,200,120,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(fx,fy,R*1.5,ang-1.3,ang+1.3);ctx.arc(fx,fy,R*.9,ang+1.3,ang-1.3,true);ctx.closePath();ctx.fill();ctx.restore()}

  /* ---------- círculos, cúpula, cortina ---------- */
  function circle3(ctx,c,cen,u,v,r,o={}){const a=o.a??1;if(a<=0)return;const n=o.n||120,E=o.front;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=o.col||C.gold;ctx.lineWidth=o.lw||3;ctx.shadowColor=o.col||C.gold;ctx.shadowBlur=o.glow??14;ctx.beginPath();let pen=false;
    for(let k=0;k<=n;k++){const an=k/n*TAU,p=add(cen,add(mul(u,r*Math.cos(an)),mul(v,r*Math.sin(an))));if(E&&dot(sub(p,E),sub(c.eye,p))<0){pen=false;continue}const q=c.P(p);if(!isFinite(q[0])){pen=false;continue}pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}
    ctx.stroke();ctx.restore()}
  function dome(ctx,x,y,R,t,o={}){const a=o.a??1;if(a<=0||R<1)return;const sq=o.squash??.85;ctx.save();ctx.globalAlpha*=a;
    ctx.beginPath();ctx.rect(-1e4,-1e4,2e4,y+1e4);ctx.clip();
    /* halo */ctx.globalCompositeOperation='lighter';for(const [k,al,col] of [[3.2,.18,'255,150,60'],[1.8,.35,'255,200,120']]){const g=ctx.createRadialGradient(x,y,0,x,y,R*k);g.addColorStop(0,`rgba(${col},${al})`);g.addColorStop(1,`rgba(${col},0)`);ctx.fillStyle=g;ctx.fillRect(x-R*k,y-R*k,2*R*k,2*R*k)}
    /* cúpula turbulenta: camadas do quente (dentro) ao frio (fora) */
    for(const [k,col,al] of [[1,[200,60,20],.85],[.82,[255,130,40],.9],[.6,[255,210,130],.95],[.38,[255,250,230],1]]){ctx.beginPath();for(let i=0;i<=72;i++){const an=Math.PI+i/72*Math.PI,
        nz=1+.18*FX.noise(Math.cos(an)*2.5+t*.8,Math.sin(an)*2.5,k*3+t*.4)+.08*FX.noise(an*7,t*2),rr=R*k*nz,px=x+Math.cos(an)*rr,py=y+Math.sin(an)*rr*sq;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}
      ctx.closePath();const g=ctx.createRadialGradient(x,y,0,x,y,R*k);g.addColorStop(0,`rgba(${col.join(',')},${al})`);g.addColorStop(1,`rgba(${col.join(',')},${al*.5})`);ctx.fillStyle=g;ctx.fill()}
    ctx.restore()}
  function curtain(ctx,x,y,R,t,o={}){const a=o.a??1;if(a<=0)return;const ang=o.ang??.75,Rn=FX.rng(17);ctx.save();ctx.globalAlpha*=a;ctx.lineCap='round';
    for(let i=0;i<160;i++){const s=Rn()<.5?-1:1,th=ang+(Rn()-.5)*.5,l=R*(.6+Rn()*1.2),w=1+Rn()*3,ph=clamp(t*(.8+Rn()*.6)),x1=x+s*Math.sin(th)*l*ph,y1=y-Math.cos(th)*l*ph,hot=1-ph;
      ctx.strokeStyle=`rgba(${lerp(90,255,hot)|0},${lerp(70,160,hot)|0},${lerp(60,70,hot)|0},${.55*(1-ph*.4)})`;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x+s*Math.sin(th)*l*ph*.3,y-Math.cos(th)*l*ph*.3);ctx.lineTo(x1,y1);ctx.stroke()}
    ctx.restore()}

  /* ---------- globo: detritos e anel de choque ---------- */
  function ejecta(ctx,c,E,Rg,n,t,o={}){const a=o.a??1;if(a<=0||t<=0)return;const N=o.N||150,Rn=FX.rng(o.seed||5),[u,v]=basis(n),Tm=o.T||6;ctx.save();ctx.globalAlpha*=a;ctx.lineCap='round';
    const eye=c.eye;for(let i=0;i<N;i++){const az=Rn()*TAU,rng=Math.pow(Rn(),1.6)*(o.reach||1.6)+.04,hm=Rg*(.02+Rn()*.12)*(.4+rng*.5),dur=Tm*(.5+rng*.35)*(.8+Rn()*.4),t0=Rn()*.6;
      const w=add(mul(u,Math.cos(az)),mul(v,Math.sin(az))),pt=s=>{const th=rng*s,h=hm*4*s*(1-s),r=Rg+h;return add(E,mul(add(mul(n,Math.cos(th)),mul(w,Math.sin(th))),r))};
      const s=clamp((t-t0)/dur);if(s<=0)continue;const vis=p=>dot(sub(p,E),sub(eye,p))>-Rg*.02||Math.hypot(...sub(p,E))>Rg*1.004;
      if(s<1){const hot=1-s*.7,pts=[];for(let k=0;k<=10;k++){const ss=Math.max(0,s-.16*k/10),p=pt(ss);if(!vis(p))break;const q=c.P(p);if(!isFinite(q[0]))break;pts.push(q)}
        if(pts.length>1){for(let k=1;k<pts.length;k++){ctx.strokeStyle=`rgba(255,${(150+90*hot)|0},${(60+80*hot)|0},${(1-k/pts.length)*.9})`;ctx.lineWidth=2.6*(1-k/pts.length)+.6;ctx.beginPath();ctx.moveTo(pts[k-1][0],pts[k-1][1]);ctx.lineTo(pts[k][0],pts[k][1]);ctx.stroke()}
          ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(pts[0][0],pts[0][1],0,pts[0][0],pts[0][1],9);g.addColorStop(0,'rgba(255,240,200,.95)');g.addColorStop(1,'rgba(255,140,50,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(pts[0][0],pts[0][1],9,0,TAU);ctx.fill();ctx.restore()}}
      else{/* já caiu: brasa que se apaga onde bateu */const p=pt(1),fade=clamp(1-(t-t0-dur)/2.5);if(fade>0&&vis(p)){const q=c.P(p);if(isFinite(q[0])){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,120,40,${.5*fade})`;ctx.beginPath();ctx.arc(q[0],q[1],3,0,TAU);ctx.fill();ctx.restore()}}}}
    ctx.restore()}
  function shockGlobe(ctx,c,E,Rg,n,ang,o={}){const [u,v]=basis(n),cen=add(E,mul(n,Rg*Math.cos(ang))),r=Rg*Math.sin(ang);circle3(ctx,c,cen,u,v,r*1.002,{col:o.col||'#ffd9a0',lw:o.lw||3,a:o.a??1,glow:o.glow??18,front:E,n:180})}

  function planeIcon(ctx,x,y,s,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);ctx.scale(s*(o.dir??1),s);ctx.fillStyle=o.col||C.chalk;ctx.beginPath();
    ctx.moveTo(-1,-.06);ctx.lineTo(.85,-.08);ctx.quadraticCurveTo(1.05,0,.85,.08);ctx.lineTo(-1,.06);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(.15,0);ctx.lineTo(-.25,-.7);ctx.lineTo(-.4,-.7);ctx.lineTo(-.15,0);ctx.closePath();ctx.fill();ctx.globalAlpha*=.7;ctx.beginPath();ctx.moveTo(.1,0);ctx.lineTo(-.3,.35);ctx.lineTo(-.42,.35);ctx.lineTo(-.18,0);ctx.closePath();ctx.fill();ctx.globalAlpha/=.7;
    ctx.beginPath();ctx.moveTo(-.8,0);ctx.lineTo(-1,-.42);ctx.lineTo(-1.08,-.42);ctx.lineTo(-.98,0);ctx.closePath();ctx.fill();ctx.restore()}
  function shake(T,t0,o={}){if(T<t0)return [0,0];const d=T-t0,k=(o.amp??30)*Math.exp(-d/(o.dur??.5)),f=o.f??23;return [k*FX.noise(d*f,1.3),k*FX.noise(4.1,d*f)]}
  return {rock,drawRock,dem,terrain,drawTerrain,profile,ghost,fireball,bow,circle3,dome,curtain,ejecta,shockGlobe,planeIcon,shake,basis}})();
