/* ---------- SAT: Saturno de perto (mesma câmera do W3D) ----------
   Saturno fica no próprio referencial: centro p, eixo y (o plano dos anéis é y = 0 no referencial do planeta). Unidade: R = raio equatorial (60.268 km).
   SAT.draw(ctx,c,{p,R,axis,sun,t,P,spin,a,ringA,q})  Saturno + anéis por traçado de raios em cada pixel: planeta achatado (polo 0,902 R) com faixas,
       hexágono no polo norte, escurecimento do limbo; anéis D, C, B, divisão de Cassini, A com as falhas de Encke e Keeler, anel F (perfil radial real);
       sombra dos anéis no planeta e do planeta nos anéis; lado iluminado/escuro dos anéis (luz que atravessa); espessura aparente na visada rasante;
       aglomerados que giram em rotação kepleriana (dentro mais rápido: Ω ∝ r^-1,5). sun = direção para o Sol (mundo). t = tempo dos anéis,
       P = período do loop (o padrão em t = P é igual ao de t = 0). q = orçamento de pixels do traçado (padrão 560 mil). Devolve {q,R} (centro e raio em px).
   SAT.ringV(r)  velocidade orbital em km/h no raio r (em R)      SAT.RINGS  limites reais dos anéis (em R)      SAT.MOONS  luas principais {k,nome,a,r} (em R)
   SAT.hidden(c,P,o)  true quando o ponto P (mundo) está atrás do planeta visto da câmera
   SAT.ice(ctx,c,{center,L,h,N,seed,t,sun,a,fog,smin,smax,drift,e1,e2})  (e1 = direção da deriva, e2 = radial; y = espessura)  blocos de gelo dos anéis em 3D (sprites iluminados pelo lado do Sol, tamanhos em lei de potência, girando)
   SAT.rain(ctx,c,{p,R,t,a,n})  "chuva dos anéis": gelo caindo dos anéis no planeta pelas linhas do campo magnético (latitudes médias)
   SAT.geyser(ctx,c,{p,r,pole,t,sun,a,n})  jatos de Encélado saindo do polo sul (brilham mais com o Sol atrás)
   SAT.haze(ctx,q,Rpx,{a,col,w})  halo de atmosfera em volta de um disco (Titã)
   SAT.edge(ctx,c,{p,R,a})  fio dos anéis quando vistos de lado (desenhado por cima do traçado)
   Texturas novas no PL (PL.sphere/PL.planet com estas chaves): 'tita' (mapa Cassini PIA22770 sob névoa laranja), 'encelado' (mapa Cassini PIA12564), 'gelo' (lua gelada com crateras),
   'japeto' (metade escura). */
const SAT=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  const sst=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u)};
  const FL=.098,RKM=60268,GM=3.7931187e16;
  const RINGS={D:[1.11,1.236],C:[1.239,1.527],B:[1.527,1.951],cassini:[1.951,2.025],A:[2.025,2.267],encke:2.2135,keeler:2.2650,F:2.3256};
  const ringV=r=>Math.sqrt(GM/(r*RKM*1e3))*3.6;
  const MOONS=[{k:'gelo',nome:'MIMAS',a:3.08,r:.00329,seed:1},{k:'encelado',nome:'ENCÉLADO',a:3.948,r:.00418},{k:'gelo',nome:'TÉTIS',a:4.888,r:.00881,seed:2},
    {k:'gelo',nome:'DIONE',a:6.262,r:.00931,seed:3},{k:'gelo',nome:'REIA',a:8.746,r:.01268,seed:4},{k:'tita',nome:'TITÃ',a:20.27,r:.04273},{k:'japeto',nome:'JÁPETO',a:59.08,r:.0122}];

  /* ---------- perfil radial dos anéis ---------- */
  const R0=1.10,R1=2.36,NP=6144,OP=new Float32Array(NP),CR=new Float32Array(NP),CG=new Float32Array(NP),CB=new Float32Array(NP);let PROF=false;
  function profile(){if(PROF)return;PROF=true;const gap=(r,c,w)=>1-Math.exp(-Math.pow((r-c)/w,2)*2.5);
    for(let i=0;i<NP;i++){const r=R0+(R1-R0)*(i+.5)/NP,f1=FX.noise(r*230,1.7,.3),f2=FX.noise(r*960,3.1,.7),f3=FX.noise(r*48,5.3,.2);let op=0,col=[0,0,0];
      if(r<RINGS.D[1]){op=.018*(1+.5*f1);col=[140,128,118]}
      else if(r<RINGS.C[1]){op=(.075+.06*sst(1.4,1.52,r))*(1+.5*f1+.35*f2);op*=gap(r,1.29,.0018)*gap(r,1.452,.0035)*gap(r,1.47,.0012);if(f3>.18)op+=.12*sst(.18,.3,f3);col=[152,140,126]}  /* platôs do anel C */
      else if(r<RINGS.B[1]){const u=(r-RINGS.B[0])/(RINGS.B[1]-RINGS.B[0]);op=lerp(.5,.97,sst(0,.3,u))*(1-.12*sst(.5,.62,u)*(1-sst(.62,.75,u)))*(1+.16*f1+.12*f2);col=[lerp(214,232,u),lerp(196,212,u),lerp(162,172,u)]}
      else if(r<RINGS.cassini[1]){op=.055*(1+.6*f1)*gap(r,1.9555,.0028);if(Math.abs(r-1.99)<.004)op+=.06;col=[160,150,138]}
      else if(r<RINGS.A[1]){const u=(r-RINGS.A[0])/(RINGS.A[1]-RINGS.A[0]);op=lerp(.62,.42,u)*(1+.12*f1+.1*f2)*gap(r,RINGS.encke,.0028)*gap(r,RINGS.keeler,.0006);if(u>.9)op*=1-.6*sst(.9,1,u);col=[206,192,168]}
      if(Math.abs(r-RINGS.F)<.01){op+=.22*Math.exp(-Math.pow((r-RINGS.F)/.0024,2));col=[222,216,206]}
      OP[i]=clamp(op);CR[i]=col[0];CG[i]=col[1];CB[i]=col[2]}}
  /* aglomerados (ondas de densidade, rastros de autogravidade): periódicos no ângulo */
  const NRc=320,NAc=1024;let CL=null;
  function clumps(){if(CL)return CL;CL=new Float32Array(NRc*NAc);for(let i=0;i<NRc;i++){const r=R0+(R1-R0)*i/(NRc-1);for(let j=0;j<NAc;j++){const a=j/NAc*TAU,ca=Math.cos(a),sa=Math.sin(a);
      CL[i*NAc+j]=FX.noise(r*60,ca*7,sa*7)*.6+FX.noise(r*190,ca*22+3,sa*22)*.4}}return CL}
  const W0=.22,Om=r=>W0*Math.pow(r/1.5,-1.5);
  const clAt=(r,ph)=>{const fi=(r-R0)/(R1-R0)*(NRc-1),i=Math.max(0,Math.min(NRc-1,fi|0));let fj=ph/TAU*NAc;fj=((fj%NAc)+NAc)%NAc;const j=fj|0,j2=(j+1)%NAc,u=fj-j;return CL[i*NAc+j]*(1-u)+CL[i*NAc+j2]*u};

  /* ---------- textura do planeta ---------- */
  const TW=1024,TH=512;let TS=null;
  function tex(){if(TS)return TS;TS=new Uint8ClampedArray(TW*TH*3);const n=FX.noise,mix=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];
    for(let j=0;j<TH;j++){const lat=(.5-(j+.5)/TH)*Math.PI;for(let i=0;i<TW;i++){const lo=(i+.5)/TW*TAU,x=Math.cos(lat)*Math.cos(lo),y=Math.sin(lat),z=Math.cos(lat)*Math.sin(lo);
      const tb=FX.fbm(x*3,y*8,z*3,4)*.05+n(x*11,y*34,z*11)*.012,L=lat+tb,al=Math.abs(L);
      let v=.56+.16*Math.sin(L*13.5+.4)+.09*Math.sin(L*29+1.3)+.05*Math.sin(L*61+2.1)+.03*Math.sin(L*120);
      let c=mix([168,132,86],[240,224,184],clamp(v));
      if(al<.15)c=mix(c,[244,230,192],.55*(1-al/.15));                                  /* zona equatorial clara */
      const hi=sst(.85,1.25,al);c=mix(c,[c[0]*.62+40,c[1]*.68+42,c[2]*.78+48],hi*.85);      /* latitudes altas: cinza-azulado */
      c=mix(c,[c[0]*.9,c[1]*.88,c[2]*.82],clamp(n(x*5,y*14+7,z*5)*1.5)*.5);
      if(L>.95){const rho=Math.PI/2-L,th=lo,sec=((th%(Math.PI/3))+Math.PI/3)%(Math.PI/3)-Math.PI/6,rb=.215/Math.cos(sec),e=rho-rb;  /* hexágono a 78° N */
        if(Math.abs(e)<.03)c=mix(c,[110,120,134],.35*(1-Math.abs(e)/.03));if(e<0)c=mix(c,[140,148,158],.22);if(rho<.045)c=mix(c,[78,84,96],.85*(1-rho/.045))}
      if(L<-1.45)c=mix(c,[92,90,96],.7*sst(1.45,1.53,-L));
      const st=1+.05*n(x*40,y*170,z*40);const q=(j*TW+i)*3;TS[q]=c[0]*st;TS[q+1]=c[1]*st;TS[q+2]=c[2]*st}}return TS}

  /* ---------- traçado de raios ---------- */
  const BUF=document.createElement('canvas'),BG=BUF.getContext('2d');let IMGD=null;
  function basis(ax0){const ey=nrm(ax0||[0,1,0]),ex=nrm(crs(ey,Math.abs(ey[2])<.9?[0,0,1]:[1,0,0])),ez=crs(ex,ey);return {ex,ey,ez}}
  function draw(ctx,c,o={}){const a=o.a??1;if(a<=0)return null;profile();clumps();const T=tex();
    const p=o.p||[0,0,0],R=o.R??1,{ex,ey,ez}=basis(o.axis),toP=v=>[dot(v,ex),dot(v,ey),dot(v,ez)],O=toP(sub(c.eye,p)),L=nrm(toP(nrm(o.sun||[-.6,.35,.7])));
    const qc=c.P(p),Rpx=isFinite(qc[0])?c.f*R/qc[2]:1e9,ctr=c.P(add(c.eye,mul(c.fw,c.dist))),cx=ctr[0],cy=ctr[1],f=c.f,ringA=o.ringA??1;
    /* caixa na tela */
    let x0=W,y0=H,x1=0,y1=0,full=false;const ext=pt=>{const q=c.P(pt);if(!isFinite(q[0])){full=true;return}x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])};
    const Rout=(ringA>0?R1:1.02)*R;for(let k=0;k<64;k++){const an=k/64*TAU;ext(add(p,add(mul(ex,Rout*Math.cos(an)),mul(ez,Rout*Math.sin(an)))))}
    for(const s of [[1,0],[-1,0],[0,1],[0,-1]])ext(add(p,add(mul(c.rt,R*1.05*s[0]),mul(c.up,R*1.05*s[1]))));
    if(Math.hypot(...O)<Rout*1.05)full=true;if(full){x0=0;y0=0;x1=W;y1=H}
    x0=Math.max(0,Math.floor(x0-4));y0=Math.max(0,Math.floor(y0-4));x1=Math.min(W,Math.ceil(x1+4));y1=Math.min(H,Math.ceil(y1+4));const bw=x1-x0,bh=y1-y0;if(bw<2||bh<2)return {q:qc,R:Rpx};
    const s=Math.min(1,Math.sqrt((o.q||900000)/(bw*bh))),BW=Math.max(2,Math.ceil(bw*s)),BH=Math.max(2,Math.ceil(bh*s));
    if(BUF.width<BW||BUF.height<BH){BUF.width=Math.max(BW,BUF.width);BUF.height=Math.max(BH,BUF.height);IMGD=null}
    if(!IMGD||IMGD.width!==BUF.width||IMGD.height!==BUF.height)IMGD=BG.createImageData(BUF.width,BUF.height);const out=IMGD.data;out.fill(0);
    const Df=toP(c.fw),Dr=toP(c.rt),Du=toP(c.up),kY=1/(1-FL),R2=R*R,t=o.t||0,P=o.P||0,w=P?clamp(t/P):0,wn=P?1/Math.sqrt((1-w)*(1-w)+w*w):1,sp=o.spin||0;
    const Ly=L[1],litSide=Math.sign(Ly)===Math.sign(O[1]),mu0=Math.abs(Ly),Ilit=.92*(.45+.55*Math.sqrt(Math.min(1,mu0/.3)));
    const amb=o.amb??.02,pa=o.planetA??1;
    for(let j=0;j<BH;j++){const yy=y0+(j+.5)/s,b=-(yy-cy)/f;for(let i=0;i<BW;i++){const xx=x0+(i+.5)/s,aa=(xx-cx)/f;
      const dx=Df[0]+aa*Dr[0]+b*Du[0],dy=Df[1]+aa*Dr[1]+b*Du[1],dz=Df[2]+aa*Dr[2]+b*Du[2];
      /* esfera achatada */
      const oy2=O[1]*kY,dy2=dy*kY,A=dx*dx+dy2*dy2+dz*dz,Bq=2*(O[0]*dx+oy2*dy2+O[2]*dz),Cq=O[0]*O[0]+oy2*oy2+O[2]*O[2]-R2,disc=Bq*Bq-4*A*Cq;
      let ts=Infinity;if(disc>=0&&pa>0){const r1=(-Bq-Math.sqrt(disc))/(2*A);if(r1>0)ts=r1}
      let rr_=0,rg_=0,rb_=0,ra=0;
      /* anel */
      if(ringA>0&&dy!==0){const tr=-O[1]/dy;if(tr>0&&tr<ts){const hx=O[0]+tr*dx,hz=O[2]+tr*dz,rr=Math.sqrt(hx*hx+hz*hz)/R;
        if(rr>R0&&rr<R1){const id=((rr-R0)/(R1-R0)*NP)|0,op=OP[id];if(op>.002){const th=Math.atan2(hz,hx),om=Om(rr);let n=clAt(rr,th-om*t);if(P)n=(n*(1-w)+clAt(rr,th-om*(t-P))*w)*wn;
          const op2=clamp(op*(1+.32*n)),dl=Math.sqrt(dx*dx+dy*dy+dz*dz),mu=Math.max(.012,Math.abs(dy)/dl),oe=op2>=.999?1:1-Math.pow(1-op2,1/mu);
          let I=litSide?Ilit*(.78+.22*op2):.95*op2*(1-op2)*2.4*(.5+.5*Math.sqrt(Math.min(1,mu0/.3)));
          /* sombra do planeta no anel */
          const qy2=0,Lx=L[0],Ly2=L[1]*kY,Lz=L[2],sProj=-(hx*Lx+qy2*Ly2+hz*Lz)/(Lx*Lx+Ly2*Ly2+Lz*Lz);
          if(sProj>0){const cxp=hx+sProj*Lx,cyp=sProj*Ly2,czp=hz+sProj*Lz,dm=Math.sqrt(cxp*cxp+cyp*cyp+czp*czp);I*=.03+.97*sst(R*.985,R*1.02,dm)}
          I*=1+.16*n;rr_=CR[id]*I;rg_=CG[id]*I;rb_=CB[id]*I;ra=oe*ringA}}}}
      let fr=0,fg=0,fb=0,fa=0;
      if(ts<Infinity){const hx=O[0]+ts*dx,hy=O[1]+ts*dy,hz=O[2]+ts*dz;let nx=hx,ny=hy*kY*kY,nz=hz;const nl=Math.sqrt(nx*nx+ny*ny+nz*nz);nx/=nl;ny/=nl;nz/=nl;
        const la=Math.asin(clamp(ny,-1,1)),lo=Math.atan2(hz,hx)-sp;  /* spin > 0: mesmo sentido dos anéis (θ crescente) */let u=(lo/TAU)%1;if(u<0)u+=1;const ti=((Math.min(TH-1,(.5-la/Math.PI)*TH|0))*TW+(u*TW|0))*3;
        const ld=nx*L[0]+ny*L[1]+nz*L[2],day=clamp((ld+.05)/.16),dl=Math.sqrt(dx*dx+dy*dy+dz*dz),mv=Math.max(0,-(nx*dx+ny*dy+nz*dz)/dl),limb=.5+.5*Math.sqrt(mv);
        let lit=amb+day*(.12+.88*Math.max(0,ld))*limb;
        /* sombra dos anéis no planeta */
        if(ringA>0&&Ly!==0){const sr=-hy/Ly;if(sr>0){const px=hx+sr*L[0],pz=hz+sr*L[2],r2=Math.sqrt(px*px+pz*pz)/R;if(r2>R0&&r2<R1){const op=OP[((r2-R0)/(R1-R0)*NP)|0];lit*=1-.93*ringA*(op>=.999?1:1-Math.pow(1-op,1/Math.max(.05,mu0)))}}}
        const hz2=.07*Math.pow(1-mv,2)*day;fr=T[ti]*lit+255*hz2;fg=T[ti+1]*lit+228*hz2;fb=T[ti+2]*lit+180*hz2;fa=pa}
      const q=(j*BUF.width+i)*4;
      if(ra>0){const k=1-ra;out[q]=rr_*ra+fr*fa*k;out[q+1]=rg_*ra+fg*fa*k;out[q+2]=rb_*ra+fb*fa*k;const A2=ra+fa*k;if(A2>0){out[q]/=A2;out[q+1]/=A2;out[q+2]/=A2}out[q+3]=255*A2}
      else if(fa>0){out[q]=fr;out[q+1]=fg;out[q+2]=fb;out[q+3]=255*fa}}}
    BG.putImageData(IMGD,0,0);ctx.save();ctx.globalAlpha*=a;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(BUF,0,0,BW,BH,x0,y0,BW/s,BH/s);ctx.restore();
    if(o.edge!==false)edge(ctx,c,{p,R,axis:o.axis,a:a*ringA,sun:o.sun});
    return {q:qc,R:Rpx}}

  /* ponto atrás do planeta? */
  function hidden(c,Pw,o={}){const p=o.p||[0,0,0],R=o.R??1,{ex,ey,ez}=basis(o.axis),toP=v=>[dot(v,ex),dot(v,ey),dot(v,ez)],O=toP(sub(c.eye,p)),D=toP(sub(Pw,c.eye)),k=1/(1-FL);
    const oy=O[1]*k,dy=D[1]*k,A=D[0]*D[0]+dy*dy+D[2]*D[2],B=2*(O[0]*D[0]+oy*dy+O[2]*D[2]),C2=O[0]*O[0]+oy*oy+O[2]*O[2]-R*R,ds=B*B-4*A*C2;if(ds<0)return false;const t=(-B-Math.sqrt(ds))/(2*A);return t>0&&t<.999}
  /* fio dos anéis na visada de lado */
  function edge(ctx,c,o={}){const p=o.p||[0,0,0],R=o.R??1,{ex,ey,ez}=basis(o.axis),O=sub(c.eye,p),e=Math.abs(dot(O,ey))/Math.hypot(...O),k=(o.a??1)*(1-sst(.004,.03,e));if(k<=0)return;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(const [rr,al,lw] of [[2.24,.5,1.6],[2.1,.55,1.8],[1.85,.8,2.2],[1.65,.75,2.2],[1.4,.25,1.4]]){let prev=null;for(let s=0;s<=160;s++){const an=s/160*TAU,P2=add(p,add(mul(ex,R*rr*Math.cos(an)),mul(ez,R*rr*Math.sin(an)))),q=c.P(P2),vis=isFinite(q[0])&&!hidden(c,P2,o);
        if(prev&&vis){ctx.globalAlpha=k*al*.55;ctx.strokeStyle='rgb(236,222,188)';ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}prev=vis?q:null}}
    ctx.restore()}

  /* ---------- blocos de gelo ---------- */
  const SPR=[];function sprites(){if(SPR.length)return SPR;const S=128,Lt=nrm([.58,-.5,.64]);for(let k=0;k<12;k++){const cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d'),im=g.createImageData(S,S),d=im.data,sd=k*13.7,ax=1+.35*((k*7)%5)/4;
      for(let y=0;y<S;y++)for(let x=0;x<S;x++){const u0=(x+.5)/S*2-1,v=(y+.5)/S*2-1,u=u0*ax*.9,an=Math.atan2(v,u),rad=Math.hypot(u,v),rb=.8+.1*FX.noise(Math.cos(an)*1.1+sd,Math.sin(an)*1.1,sd*.3)+.04*FX.noise(Math.cos(an)*3+sd,Math.sin(an)*3,1);
        if(rad>rb)continue;const zr=rad/rb,z=Math.sqrt(Math.max(0,1-zr*zr)),bx=FX.noise(u*2.2+sd,v*2.2,2),by=FX.noise(u*2.2,v*2.2+sd,3),n=nrm([u/rb+bx*.45,v/rb+by*.45,z+.05]);
        const sh=Math.max(0,dot(n,Lt)),fine=.93+.07*FX.noise(u*14+sd,v*14,4),h=nrm([Lt[0],Lt[1],Lt[2]+1]),spec=Math.pow(Math.max(0,dot(n,h)),38)*.9,rim=Math.pow(1-z,3)*.25;
        const i=(y*S+x)*4,L1=sh*fine;d[i]=Math.min(255,30+232*L1+255*spec+70*rim);d[i+1]=Math.min(255,30+222*L1+255*spec+90*rim);d[i+2]=Math.min(255,40+208*L1+255*spec+120*rim);d[i+3]=255*Math.min(1,(rb-rad)*S*.6)}
      g.putImageData(im,0,0);SPR.push(cv)}return SPR}
  const ICE={};function iceSet(seed,N){const key=seed+':'+N;if(ICE[key])return ICE[key];const R=FX.rng(seed),A=[];for(let i=0;i<N;i++){const m=Math.pow(R(),3.2);A.push({u:[R()*2-1,R()*2-1,R()*2-1],m,k:(R()*12)|0,rot:R()*TAU,w:(R()-.5)*.6,dv:(R()-.5)})}return ICE[key]=A}
  function ice(ctx,c,o){const a=o.a??1;if(a<=0)return;const S=sprites(),PT=iceSet(o.seed||7,o.N||900),C0=o.center,Lb=o.L||40,h=o.h||8,t=o.t||0,smin=o.smin??.02,smax=o.smax??4,fog=o.fog||Lb*1.2,dr=o.drift||0;
    const Ls=nrm(o.sun||[-.6,.35,.7]),q0=c.P(C0),q1=c.P(add(C0,mul(Ls,Lb*.01))),sa=isFinite(q0[0])&&isFinite(q1[0])?Math.atan2(q1[1]-q0[1],q1[0]-q0[0]):-.5,front=Math.max(0,-dot(Ls,c.fw));
    const L2=[];for(const pt of PT){const x=pt.u[0]*Lb+dr*t*(1+.3*pt.dv),xx=((x+Lb)%(2*Lb)+2*Lb)%(2*Lb)-Lb,e1=o.e1||[1,0,0],e2=o.e2||[0,0,1],zz=pt.u[2]*Lb,yy=pt.u[1]*h,P=[C0[0]+e1[0]*xx+e2[0]*zz,C0[1]+yy+e1[1]*xx+e2[1]*zz,C0[2]+e1[2]*xx+e2[2]*zz],q=c.P(P);if(!isFinite(q[0]))continue;
      const sz=smin*Math.pow(smax/smin,pt.m),rp=c.f*sz/q[2];if(rp<.35||q[0]<-rp||q[0]>W+rp||q[1]<-rp||q[1]>H+rp)continue;L2.push({q,rp,pt,z:q[2]})}
    L2.sort((p1,p2)=>p2.z-p1.z);ctx.save();
    for(const it of L2){const fa=a*Math.min(1,1.6*Math.exp(-it.z/fog))*clamp((it.z-c.near*1.5)/(c.near*4+1e-9));if(fa<.01)continue;ctx.globalAlpha=fa;
      if(it.rp<1.6){ctx.fillStyle=`rgba(226,232,244,${.5+.3*front})`;ctx.fillRect(it.q[0]-it.rp,it.q[1]-it.rp,it.rp*2,it.rp*2);continue}
      ctx.save();ctx.translate(it.q[0],it.q[1]);ctx.rotate(sa+.55+it.pt.rot*.25+it.pt.w*t);const s2=it.rp*2.3;ctx.drawImage(S[it.pt.k],-s2/2,-s2/2,s2,s2);ctx.restore()}
    ctx.restore()}

  /* ---------- chuva dos anéis ---------- */
  let DROP=null;const drop=()=>{if(DROP)return DROP;const s=48,cv=document.createElement('canvas');cv.width=cv.height=s;const g=cv.getContext('2d'),gr=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    gr.addColorStop(0,'rgba(235,250,255,1)');gr.addColorStop(.18,'rgba(150,225,255,.75)');gr.addColorStop(.5,'rgba(90,180,240,.18)');gr.addColorStop(1,'rgba(60,140,220,0)');g.fillStyle=gr;g.fillRect(0,0,s,s);return DROP=cv};
  function rain(ctx,c,o={}){const a=o.a??1;if(a<=0)return;const p=o.p||[0,0,0],R=o.R??1,t=o.t||0,n=o.n||140,Rn=FX.rng(o.seed||31),D=drop(),ds=o.size||13;ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(let i=0;i<n;i++){const ph=i/n*TAU+Rn()*.05,Lsh=1.5+.5*Rn(),hs=Rn()<.5?1:-1,le=Math.acos(Math.sqrt(1/Lsh))*(1-FL*.5),sp=.16+.1*Rn(),off=Rn(),
        pt=u=>{const la=u*le*hs,r=Lsh*R*Math.cos(la)*Math.cos(la);return add(p,[r*Math.cos(la)*Math.cos(ph),r*Math.sin(la),r*Math.cos(la)*Math.sin(ph)])};
      let pv=null;ctx.strokeStyle='rgb(110,200,240)';ctx.lineWidth=1.3;for(let k=0;k<=28;k++){const P2=pt(k/28),q=c.P(P2),v=isFinite(q[0])&&!hidden(c,P2,o);if(pv&&v){ctx.globalAlpha=a*.07;ctx.beginPath();ctx.moveTo(pv[0],pv[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}pv=v?q:null}
      for(let d=0;d<5;d++){const u=((t*sp+off+d/5)%1),B2=pt(u),qb=c.P(B2);if(!isFinite(qb[0])||hidden(c,B2,o))continue;const s=ds*(.7+.5*Math.sin(Math.PI*u));
        ctx.globalAlpha=a*.85*Math.sin(Math.PI*Math.min(1,u*1.15));ctx.drawImage(D,qb[0]-s,qb[1]-s,2*s,2*s)}}
    ctx.restore()}

  /* ---------- jatos de Encélado ---------- */
  function geyser(ctx,c,o){const a=o.a??1;if(a<=0)return;const p=o.p,r=o.r,pole=nrm(o.pole||[0,-1,0]),t=o.t||0,n=o.n||900,Rn=FX.rng(o.seed||5),Ls=nrm(sub(o.sun||[0,0,0],p)),
      e1=nrm(crs(pole,Math.abs(pole[1])<.9?[0,1,0]:[1,0,0])),e2=crs(pole,e1),back=Math.max(0,dot(nrm(o.sun?sub(o.sun,p):[0,0,1]),c.fw)),I=.75+1.25*back*back;
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<n;i++){const st=(Rn()*4)|0,along=(Rn()*2-1)*.42,cross=(st-1.5)*.13+(Rn()-.5)*.03,sp=.25+.35*Rn(),u=(t*sp+Rn())%1,hgt=u*u*.0+u*(o.hmax||3.2),spread=.18+.5*Rn();
      const base=add(p,add(mul(pole,r*Math.sqrt(Math.max(0,1-along*along-cross*cross))),add(mul(e1,r*along),mul(e2,r*cross)))),dir=nrm(add(pole,add(mul(e1,(Rn()-.5)*spread),mul(e2,(Rn()-.5)*spread)))),
        P2=add(base,mul(dir,r*hgt)),q=c.P(P2);if(!isFinite(q[0]))continue;
      /* atrás da lua? */const v=sub(P2,c.eye),pc=sub(p,c.eye),tt=dot(pc,v)/dot(v,v);if(tt>0&&tt<1){const cl=sub(add(c.eye,mul(v,tt)),p);if(Math.hypot(...cl)<r*.99)continue}
      const rp=Math.max(.7,c.f*r*(.012+.02*u)/q[2]);ctx.globalAlpha=a*I*.4*(1-u)*(1-u)*Math.min(1,u*14);ctx.fillStyle='rgb(214,236,255)';ctx.beginPath();ctx.arc(q[0],q[1],rp,0,TAU);ctx.fill()}
    ctx.restore()}

  function haze(ctx,q,Rpx,o={}){if(!q||!isFinite(q[0]))return;const a=o.a??1;if(a<=0)return;const wk=o.w??.09;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=a;
    const g=ctx.createRadialGradient(q[0],q[1],Rpx*.97,q[0],q[1],Rpx*(1+wk));g.addColorStop(0,FX.rgba(o.col||'#e8a050',.55));g.addColorStop(.45,FX.rgba(o.col2||'#8ab0d8',.22));g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],Rpx*(1+wk),0,TAU);ctx.fill();ctx.restore()}

  /* ---------- texturas das luas ---------- */
  const n3=FX.noise,mix=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];
  const crater=(x,y,z,sd,k=1)=>{let s=0;for(const f of [3,7,15]){const v=n3(x*f+sd,y*f,z*f);s+=Math.max(0,.5-Math.abs(v)*3)*(k/f*3)}return s};
  /* Titã e Encélado: mapas globais da Cassini (geo/titan_web.jpg PIA22770, geo/encelado_web.jpg PIA12564; NASA, domínio público); sem o mapa, textura procedural */
  PL.addTex('tita',(x,y,z,lat,lo,g)=>{const v=.5+.07*Math.sin(lat*3)+.07*FX.fbm(x*2,y*2,z*2,3)+.03*n3(x*6,y*6,z*6);let c=mix([118,86,52],[176,136,86],clamp(v));
    if(g!=null)c=mix(mix([92,62,34],[196,150,92],g),[176,132,80],.38);  /* superfície vista através da névoa: contraste baixo, lagos e dunas escuros */
    if(lat>.95)c=mix(c,[120,84,46],.4*sst(.95,1.3,lat));return c},{w:1024,h:512,img:'geo:titan.jpg'});
  PL.addTex('encelado',(x,y,z,lat,lo,g)=>{let c;if(g!=null){const v=.42+.75*g;c=[236*v,240*v,246*v];if(lat<-1.0)c=mix(c,[c[0]*.82,c[1]*.92,c[2]*1.02],.6)}
    else{c=mix([206,212,220],[246,248,252],clamp(.6+.25*FX.fbm(x*4,y*4,z*4,3)));if(lat>-.6)c=mix(c,[178,182,188],clamp(crater(x,y,z,1.3)*.9));
    if(lat<-.9){const sx=x*.8+z*.6,ph=Math.abs(((sx*9)%1+1)%1-.5);const k=(1-sst(.03,.08,ph))*sst(-.9,-1.1,lat)*(Math.abs(sx)<.3?1:0);c=mix(c,[110,160,196],k*.8)}}return c},{w:1024,h:512,img:'geo:encelado.jpg'});
  PL.addTex('gelo',(x,y,z)=>{const v=.55+.2*FX.fbm(x*3,y*3,z*3,4);let c=mix([120,118,114],[214,210,204],clamp(v));c=mix(c,[88,86,84],clamp(crater(x,y,z,4.2,1.4)*.8));return c});
  PL.addTex('japeto',(x,y,z,lat,lo)=>{const d=sst(-.2,.2,Math.cos(lo)+.25*n3(x*3,y*3,z*3));let c=mix([214,208,196],[58,44,34],d);c=mix(c,[96,92,88],clamp(crater(x,y,z,7)*.6)*(1-d));return c});

  return {draw,hidden,edge,ice,rain,geyser,haze,ringV,RINGS,MOONS,FL,RKM,Om,profile}})();
