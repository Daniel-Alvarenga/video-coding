/* ---------- vida-estrelas: "Qual estrela vive mais: a gigante ou a pequenininha?" — Short vertical, um plano contínuo ----------
   Kit: engine/star.js (STAR). Linha do tempo nominal de 47 s (AN, igual ao lines.py); com a voz, o tempo é deformado para casar cada
   âncora com a fala. Gigante azul e anã vermelha (gancho) → Sol (idade e o que falta) → incha: gigante vermelha → casca de gás e anã
   branca do tamanho da Terra → régua de massa sobe até 20 sóis: estrela azul com vento → vida de 10 milhões de anos → colapso,
   supernova → estrela de nêutrons OU buraco negro → régua desce até 0,1: anã vermelha com proeminências → barra de vida passa a idade
   do universo → recua: Próxima Centauri no céu → resumo com as duas estrelas do começo = quadro 0 (loop exato). */
const PLAN=__PLAN__;const DUR=PLAN.dur;
const ST=DUR.map((d,i)=>DUR.slice(0,i).reduce((a,b)=>a+b,0)),TTOT=DUR[0];
const CX=W/2,sm=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*u*(u*(u*6-15)+10)},bump=(a,b,c,d,x)=>sm(a,b,x)*(1-sm(c,d,x));
const lerpL=(a,b,u)=>Math.exp(lerp(Math.log(a),Math.log(b),u));

/* ---------- tempo nominal (47 s) ---------- */
const TN=47,AN=[.1,3.6,9.6,15.6,18.4,23.4,30.4,36.6,41.4,44.4];
const RS=(PLAN.sched.pt||[]).map(s=>ST[s[0]]+s[1]);
const MAP=RS.length===AN.length?[[0,0],...RS.map((r,i)=>[r,AN[i]]),[TTOT,TN]]:[[0,0],[TTOT,TN]];
function nom(T){if(T<=0)return T*TN/TTOT;if(T>=TTOT)return TN+(T-TTOT);for(let i=0;i<MAP.length-1;i++)if(T<=MAP[i+1][0]){const [a0,b0]=MAP[i],[a1,b1]=MAP[i+1];return b0+(b1-b0)*(T-a0)/Math.max(1e-6,a1-a0)}return TN}
const LT=(PLAN.caps.pt[0]||[]).map(x=>x[1]);
/* instante nominal de uma palavra da fala i */
function wn(i,w,frac=0){const tx=LT[i];if(!tx||RS.length!==AN.length)return null;const k=tx.indexOf(w),f=k<0?0:(k+frac*w.length)/tx.length,s=PLAN.sched.pt[i];return nom(ST[s[0]]+s[1]+(s[2]-s[1])*f)}
const at=(i,w,dflt)=>{const v=wn(i,w);return v==null?dflt:v};

/* ---------- textos ---------- */
const big=(ctx,s,x,y,o={})=>{ctx.save();ctx.shadowColor=o.glow||o.col||C.gold;ctx.shadowBlur=o.blur??22;txt(ctx,s,x,y,{font:F.sans,weight:600,size:o.size||110,ls:o.ls||0,color:o.col||C.gold,a:o.a??1,align:o.align||'center'});ctx.restore()};
const mono=(ctx,s,x,y,o={})=>txt(ctx,s,x,y,{font:F.mono,size:o.size||34,ls:o.ls??5,color:o.col||'rgba(236,230,214,.75)',a:o.a??1,align:o.align||'center'});
const shade=(ctx,a,h=640)=>{if(a<=0)return;const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,`rgba(2,3,8,${.75*a})`);g.addColorStop(1,'rgba(2,3,8,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,h)};
const BLUE='#9cc4ff',RED='#ff7a5a',WHITE='#eef4ff';
const kCol=T=>STAR.rgba(STAR.dc(T),1);

/* ---------- linha do tempo (nominal) ---------- */
let K=null;
function keys(){return {
  sunIn:3.2,
  age:at(1,'quatro',4.6),rest:at(1,'cinco',7.6),
  swell:at(2,'incha',9.9),giant:at(2,'gigante',10.9),wd:at(2,'anã',12.6),earth:at(2,'Terra',14.0),
  big:at(3,'vinte',15.9),fuel:at(4,'vinte',18.6),fast:at(4,'dezenas',20.6),
  life:at(5,'dez',23.6),sn:at(5,'supernova',25.6),ns:at(5,'nêutrons',27.3),bh:at(5,'buraco',28.6),
  dwarf:at(6,'anã',31.0),tri:at(6,'trilhões',34.4),univ:at(7,'universo',36.9),never:at(7,'nenhuma',38.8),
  prox:at(8,'Próxima',42.2),end:at(9,'maior',44.8)}}

/* ---------- o filme ---------- */
const PULSE={n:-1};
function film(ctx,T,noText){const t=nom(T);if(!K)K=keys();const k=K;
  ctx.fillStyle='#03040a';ctx.fillRect(0,0,W,H);
  /* câmera do céu: deriva lenta sempre, e recuos/avanços nas trocas */
  const zSky=1+.12*bump(3,4.5,14.6,15.6,t)+.25*bump(29.6,31,40.6,42.2,t)-.15*bump(42,43.4,45.4,46.8,t),
    ox=320*Math.sin(Math.PI*t/TN)+120*bump(3,4.4,45.5,46.9,t),oy=-140*Math.sin(Math.PI*t/TN)+300*bump(40.8,43.2,44.6,46.9,t);
  /* o céu muda de enquadramento no loop: o desvio acumulado volta a zero no fim */
  STAR.sky(ctx,T,{seed:11,a:1,ox,oy,zoom:zSky,rot:.08*Math.sin(t*TAU/TN),neb:.9});

  /* ---------- 1) gancho: gigante azul e anã vermelha ---------- */
  const hA=1-sm(3.0,4.0,t),hB=sm(44.5,44.9,t),hk=Math.max(hA,hB);
  if(hk>0){const drift=Math.sin(t*TAU/TN)*12;
    const gx=t<10?lerp(330,-260,sm(3.0,4.2,t)):lerp(-260,330,sm(44.6,45.8,t)),dx=t<10?lerp(800,1300,sm(3.0,4.2,t)):lerp(1300,800,sm(44.6,45.8,t));
    STAR.draw(ctx,gx,720+drift,230,T,{T:28000,cells:34,contrast:.12,wind:.9,glow:1.1,spikes:.25,seed:2,loop:TTOT,a:hk>0?1:0});
    if(t<10)STAR.draw(ctx,dx,1080-drift,48,T,{T:3050,cells:16,contrast:.3,flare:1,spots:[[-.4,2.4,.07],[.5,3.6,.06]],glow:1,seed:5,loop:TTOT});
    if(!noText){const la=t<10?1-sm(2.6,3.1,t):sm(46.2,46.9,t);
      big(ctx,'GIGANTE',gx,720+drift+310,{size:60,col:BLUE,a:la,blur:16});big(ctx,'ou',CX+40,1060,{size:56,col:C.chalk,a:la*.85,blur:6});
      big(ctx,'PEQUENA',dx,1080-drift+130,{size:60,col:RED,a:la,blur:16})}}

  /* ---------- 2) o Sol ---------- */
  const sunR=t<10?320*easeOut(clamp((t-3.2)/1.1))*Math.pow(1.04,clamp((t-4.3)/5)):0;
  const sw=sm(k.swell,k.giant+.6,t),pnU=clamp((t-k.wd+.3)/2.4),gone=sm(k.wd-.2,k.wd+.7,t);
  const sunA=sm(3.2,3.6,t)*(1-sm(k.big-.6,k.big,t));
  if(sunA>0&&t<16){const zoomOut=sm(k.giant+.4,k.wd,t),R0=lerp(320*Math.pow(1.04,clamp((t-4.3)/5)),470,sw)*lerp(1,.55,zoomOut);
    const Ts=lerp(5772,3100,sw),wob=sw,hz=sw*.8;
    /* Sol (casca de laranja) → gigante (células enormes que fervem): duas texturas que se cruzam enquanto ela incha */
    const yS=lerp(820,880,sw*(1-gone)),RS_=t<9.9?Math.max(1,sunR):R0,xf=sm(.32,.52,sw),base={T:Ts,wobble:wob,haze:hz,glow:1,seed:9,loop:TTOT};
    if(t<k.wd+.8&&xf<1)STAR.draw(ctx,CX,yS,RS_,T,{...base,cells:lerp(40,26,clamp(sw/.5)),contrast:.3,exposure:lerp(1.12,1.3,sw),limb:lerp(.72,.8,sw),spots:[[.25,.6,.06],[-.18,2.4,.045]],a:sunA*(1-gone)*(1-xf)});
    if(t<k.wd+.8&&xf>0)STAR.draw(ctx,CX,yS,RS_,T,{...base,cells:lerp(3.6,2.6,sw),contrast:.62,exposure:1.5,limb:.82,giant:1,a:sunA*(1-gone)*xf});
    /* casca de gás que sai da gigante e anã branca no centro */
    if(t>k.wd-.4){const pnR=R0*(1.05+.9*easeOut(pnU)),wdA=sm(k.wd,k.wd+.6,t)*sunA;
      const zin=sm(k.earth-1.2,k.earth,t);
      STAR.shell(ctx,CX,820,pnR*lerp(1,1.8,zin),pnU,{kind:'pn',seed:3,a:sunA*sm(k.wd-.4,k.wd+.6,t)*(1-.75*zin),t});
      const wdR=lerp(10,105,zin),wdX=lerp(CX,CX-150,zin);
      STAR.draw(ctx,wdX,820,wdR,T,{T:22000,cells:30,contrast:.06,glow:.8,spikes:.4*(1-zin),seed:21,a:wdA});
      if(zin>0){SC.sphere(ctx,'terra',CX+150,820,lerp(1,92,zin),{a:zin,yaw:t*.25,sun:[-3e4,2e3,1.2e4],amb:.06});
        if(!noText){mono(ctx,'ANÃ BRANCA',wdX,820+wdR+70,{col:WHITE,a:zin,size:30});mono(ctx,'TERRA',CX+150,820+lerp(1,92,zin)+70,{col:C.cyan,a:zin,size:30})}}}}

  /* ---------- 3) régua de massa e estrela que cresce ---------- */
  const mAt=t<16?1:t<k.big+2.2?lerpL(1,20,sm(k.big,k.big+2.2,t)):t<30.4?20:t<41?lerpL(20,.1,sm(30.4,32.4,t)):.1;
  const slA=bump(3.6,4.4,k.sn-.4,k.sn,t)+bump(29.8,30.4,40.8,41.6,t);
  if(t>=k.big-1.2&&t<k.sn+.3){/* a estrela do slider: cresce e esquenta com a massa */
    const s=STAR.ms(mAt),bA=sm(k.big-1.2,k.big-.2,t),col=lerp(0,1,sm(1,20,mAt));
    const coll=sm(k.sn-.5,k.sn,t),Rb=(110+220*Math.pow(clamp(Math.log(mAt)/Math.log(20)),.9))*(1+.02*Math.sin(t*9))*(1-.93*coll);
    STAR.draw(ctx,CX,lerp(820,870,sm(k.big,k.big+2,t)),Rb,T,{T:s.T,cells:lerp(40,34,col),contrast:lerp(.2,.12,col),wind:col*.9,glow:1+col*.4,spikes:.15*col,seed:13,loop:TTOT,a:bA,spots:col<.3?[[.2,.8,.05]]:[]});
    if(!noText){big(ctx,mAt<1.05?'1 SOL':(mAt<19.5?Math.round(mAt):20)+' SÓIS',CX,250,{size:120,col:kCol(s.T),glow:kCol(s.T),a:sm(k.big-.4,k.big+.1,t)*(1-sm(k.fuel-.3,k.fuel,t))});
      /* combustível × ritmo */
      const fa=bump(k.fuel-.2,k.fuel+.3,k.life-.4,k.life,t);if(fa>0){mono(ctx,'COMBUSTÍVEL',CX,170,{a:fa,col:C.cyan});big(ctx,'20×',CX,265,{size:100,col:C.cyan,a:fa});
        const ga=fa*sm(k.fast-.2,k.fast+.3,t);mono(ctx,'QUEIMA',CX,340,{a:ga,col:C.gold});big(ctx,'40.000×',CX,430,{size:100,a:ga});mono(ctx,'MAIS RÁPIDO',CX,478,{a:ga,col:C.gold,size:30})}}
    if(mAt>1.02&&mAt<19.98)FX.tone('massa',T,clamp(Math.log(mAt)/Math.log(20)))}
  if(t>=29.8&&t<32.6&&mAt<19.9&&mAt>.101)FX.tone('massa',T,clamp((Math.log(mAt)-Math.log(.1))/Math.log(200)));
  STAR.slider(ctx,985,1130,600,mAt,{a:slA});

  /* ---------- 4) supernova e o que sobra ---------- */
  const snS=t-k.sn;if(snS>-.1&&t<31){const sA=1-sm(29.6,30.6,t);
    const r=STAR.supernova(ctx,CX,870,45,snS,{seed:4,scale:13,a:sA});
    const nsA=sm(k.ns-.6,k.ns,t)*sA,bhA=sm(k.bh-.6,k.bh,t)*sA,split=sm(k.bh-.8,k.bh+.2,t);
    const nsY=lerp(870,660,split),bhY=1080;
    if(nsA>0){const p=STAR.pulsar(ctx,CX,nsY,13,T,{a:nsA,period:.9,tilt:.55,beam:900});const n=Math.floor((T+.225)/.9);if(p>.5&&n!==PULSE.n){PULSE.n=n;logEv('pul'+n,'click',0)}}
    if(bhA>0)STAR.hole(ctx,CX,bhY,lerp(10,34,bhA),T,{a:bhA,tilt:.24,disk:6.5});
    if(!noText){mono(ctx,'ESTRELA DE NÊUTRONS',CX,nsY+lerp(120,110,split),{a:nsA,col:'#bfe0ff',size:32});big(ctx,'OU',CX,(nsY+bhY)/2+30,{size:60,col:C.chalk,a:bhA*.9,blur:8});
      mono(ctx,'BURACO NEGRO',CX,bhY+190,{a:bhA,col:C.gold,size:32})}}

  /* ---------- 5) anã vermelha ---------- */
  const dA=sm(30.6,31.6,t);
  if(dA>0){const toP=sm(40.8,43.0,t),back=sm(44.4,45.8,t);
    const R0=lerp(70,250,sm(30.6,33.4,t)),Rd=lerpL(R0,9,toP),dx=lerp(CX,690,toP),dy=lerp(820,760,toP);
    const fx=lerp(dx,800,back),fy=lerp(dy,1080,back),fR=lerp(Rd,48,back);
    STAR.draw(ctx,fx,fy,fR,T,{T:3050,cells:16,contrast:.3,flare:1-toP*.7,spots:[[-.4,2.4,.07],[.5,3.6,.06]],glow:1,seed:5,loop:TTOT,spikes:toP*.6*(1-back),a:dA});
    if(!noText){const la=bump(31.0,31.6,k.tri-.7,k.tri-.3,t);mono(ctx,'0,1 SOL',CX,190,{a:la,col:RED});big(ctx,'ANÃ VERMELHA',CX,300,{size:96,col:RED,a:la});
      const pa=bump(k.prox-.3,k.prox+.3,44.1,44.6,t);if(pa>0){ctx.save();ctx.globalAlpha*=pa;ctx.strokeStyle=RED;ctx.lineWidth=3;ctx.beginPath();ctx.arc(dx,dy,48,0,TAU);ctx.stroke();ctx.restore();
        big(ctx,'PRÓXIMA',CX,250,{size:96,col:RED,a:pa});big(ctx,'CENTAURI',CX,360,{size:96,col:RED,a:pa});mono(ctx,'A MAIS PERTO DE NÓS · 4,2 ANOS-LUZ',CX,440,{a:pa,size:28,ls:3});
        /* Alfa Centauri A e B ao lado (o par brilhante do mesmo sistema) */
        STAR.draw(ctx,dx-430,dy+300,6,T,{T:5800,glow:1.3,spikes:.8,a:pa});STAR.draw(ctx,dx-405,dy+312,4,T,{T:5200,glow:1.1,spikes:.5,a:pa});
        mono(ctx,'ALFA CENTAURI A e B',dx-415,dy+380,{a:pa,size:24,ls:2})}}}

  /* ---------- 6) barra de vida ---------- */
  const lbA=bump(4.4,5.0,k.giant-.3,k.giant+.2,t)+bump(k.fuel-.4,k.fuel,k.sn-.4,k.sn,t)+bump(31.6,32.2,40.6,41.2,t);
  if(lbA>0){const bars=[];const sunF=t<k.age?0:t<k.rest?.97*sm(k.age,k.age+1.2,t):lerp(.97,1,sm(k.rest,k.rest+1.4,t));
    if(t<16)bars.push({years:1e10,fill:sunF,col:[255,214,120],label:t>k.rest?'SOL · 10 bilhões':'SOL · 4,6 bilhões',la:sm(k.age,k.age+.5,t)});
    else if(t<30){bars.push({years:1e10,fill:1,col:[255,214,120],label:'SOL',la:.8});bars.push({years:9e6,fill:sm(k.life,k.life+1.2,t),col:[156,196,255],label:'20 SÓIS · 10 milhões',la:sm(k.life+.6,k.life+1.1,t)})}
    else{bars.push({years:9e6,fill:1,col:[156,196,255],label:'20 SÓIS',la:.8});bars.push({years:1e10,fill:1,col:[255,214,120],label:'SOL',la:.8});
      bars.push({years:6e12,fill:sm(32.4,k.tri+.4,t),col:[255,122,90],label:'ANÃ · 6 trilhões',la:sm(k.tri-.2,k.tri+.4,t)})}
    const sun2=t<16&&t>k.age?[{years:4.6e9,label:'HOJE',col:'#ece6d6',a:sm(k.age+.6,k.age+1.1,t)}]:[];
    const uni=t>30?[{years:1.38e10,label:'IDADE DO UNIVERSO',col:'#62d0ea',a:sm(k.univ-.2,k.univ+.4,t),align:'center'}]:[];
    STAR.lifebar(ctx,[110,1240,800,t>30?132:t>16?92:46],{a:lbA,lo:1e6,hi:1e13,bars,marks:[...sun2,...uni]});
    if(!noText&&t>30){const na=bump(k.never-.2,k.never+.3,40.6,41.2,t);if(na>0)COS.stamp(ctx,'NENHUMA MORREU AINDA',CX,1450,t-k.never,{size:56,col:C.gold,a:na,rot:-.03})}}

  if(noText)return;
  /* ---------- textos de cada parte ---------- */
  shade(ctx,.5*bump(3.4,4,44.6,45.2,t));
  const qA=Math.max(1-sm(2.8,3.3,t),sm(46.4,46.95,t))*(t<3.3||t>46?1:0);
  big(ctx,'QUAL VIVE',CX,230,{size:104,col:C.chalk,blur:8,a:qA});big(ctx,'MAIS?',CX,360,{size:132,a:qA});
  const sA=bump(3.8,4.4,k.swell-.3,k.swell+.2,t);big(ctx,'SOL',CX,250,{size:120,a:sA});
  const ag=bump(k.age-.2,k.age+.3,k.rest-.3,k.rest,t);mono(ctx,'IDADE',CX,330,{a:ag});big(ctx,'4,6 bilhões',CX,420,{size:84,col:C.chalk,a:ag,blur:6});
  const rs=bump(k.rest-.2,k.rest+.3,k.swell-.3,k.swell+.2,t);mono(ctx,'AINDA FALTAM',CX,330,{a:rs});big(ctx,'+5 bilhões',CX,420,{size:84,a:rs});
  const gA=bump(k.giant-.3,k.giant+.3,k.wd-.4,k.wd,t);big(ctx,'GIGANTE VERMELHA',CX,230,{size:88,col:RED,a:gA});
  const wA=bump(k.wd-.2,k.wd+.4,k.big-1,k.big-.5,t);big(ctx,'ANÃ BRANCA',CX,250,{size:104,col:WHITE,a:wA,glow:'#9cc4ff'});
  const eA=wA*sm(k.earth-.3,k.earth+.3,t);mono(ctx,'DO TAMANHO DA TERRA',CX,340,{a:eA,col:C.cyan});
  const lA=bump(k.life-.2,k.life+.3,k.sn-.5,k.sn,t);mono(ctx,'VIVE',CX,230,{a:lA,col:BLUE});big(ctx,'10 milhões',CX,340,{size:100,col:BLUE,a:lA});mono(ctx,'DE ANOS',CX,410,{a:lA,col:BLUE});
  const nA=bump(k.sn+.45,k.sn+.9,k.ns-.6,k.ns-.2,t);big(ctx,'SUPERNOVA',CX,300,{size:116,col:WHITE,a:nA,glow:'#ffd27a'});
  const tA=bump(k.tri-.3,k.tri+.3,k.univ-.4,k.univ,t);mono(ctx,'DURA',CX,190,{a:tA,col:RED});big(ctx,'TRILHÕES',CX,300,{size:116,col:RED,a:tA});mono(ctx,'DE ANOS',CX,375,{a:tA,col:RED});
  const uA=bump(k.univ-.2,k.univ+.4,k.prox-.8,k.prox-.3,t);mono(ctx,'O UNIVERSO TEM',CX,190,{a:uA,col:C.cyan});big(ctx,'13,8 bilhões',CX,300,{size:100,col:C.cyan,a:uA});mono(ctx,'DE ANOS',CX,375,{a:uA,col:C.cyan});
  /* resumo: barras pequenas sob as duas estrelas do começo */
  const fA=bump(k.end-.2,k.end+.4,46.2,46.7,t);big(ctx,'QUANTO MAIOR,',CX,230,{size:92,col:C.chalk,blur:8,a:fA});big(ctx,'MAIS CEDO MORRE',CX,345,{size:96,a:fA});
  mono(ctx,'10 MILHÕES DE ANOS',330,1010,{a:fA*sm(45.5,46,t),col:BLUE,size:28,ls:2});mono(ctx,'TRILHÕES DE ANOS',800,1210,{a:fA*sm(45.5,46,t),col:RED,size:28,ls:2});

  /* ---------- sons ---------- */
  [[3.2,'whoosh',1.6],[k.swell,'swell',2.2],[k.wd-.2,'whoosh',1.8],[k.earth-1.2,'swoosh',0],[k.big-.6,'riser',2.4],[k.fuel,'pop',2],[k.fast,'pop',4],[k.life+1.1,'chime',1],
   [k.sn-.95,'collapse',.95],[k.sn,'supernova',0],[k.bh-.4,'impact',0],[29.9,'whoosh',2],[k.tri+.3,'chime',2],[k.never,'stamp',0],[k.univ,'pop',3],[40.8,'whoosh',2.2],[k.end-.2,'whoosh',1.8],[45.3,'swoosh',0],
   [k.age+1.1,'pop',1],[k.rest+1.3,'pop',3],[k.prox,'sparkle',0]].forEach(([t0,kk,v],i)=>{if(t>=t0)logEv('e'+i,kk,v)});
  if(dA>.5&&t<40.8)for(let j=0;j<4;j++){const tf=31.4+j*2.6+.9;if(t>=tf)logEv('fl'+j,'flare',0)}}

/* ---------- capa (thumb.py com T negativo) ---------- */
function thumbFrame(ctx){film(ctx,.6,true);shade(ctx,1,700);big(ctx,'QUAL VIVE',CX,250,{size:110,col:C.chalk,blur:8});big(ctx,'MAIS?',CX,400,{size:150})}

const scenes=[{name:'Estrelas',nameEn:'Stars',dur:DUR[0],tr:null,caps:PLAN.caps.pt[0],en:PLAN.caps.en[0],draw(ctx,t){if(ST[0]+t<0){thumbFrame(ctx);return}film(ctx,ST[0]+t)}}];
