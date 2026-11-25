/* ---------- COS: cosmos em 3D para Terra, Lua, Sol e galáxia (mesma câmera do W3D; esferas do PL) ----------
   COS.sky(ctx,c,{a,band,par,pole})  céu: estrelas em direções fixas (giram certo com a câmera), faixa da Via Láctea com poeira e núcleo,
       e uma camada de estrelas próximas que anda com par=[px,py] (paralaxe quando o "observador" se desloca)
   COS.sun(ctx,c,pos,r,t,{a,loop,minPx,spots,glow,red})  Sol profissional (red 0..1 = supergigante vermelha): granulação em células, escurecimento do limbo, manchas, fáculas,
       coroa com filamentos suaves e bloom que continua visível quando o Sol vira um ponto. loop=P faz a granulação repetir a cada P s
   COS.trail(ctx,c,fn,t0,t1,{n,color,lw,a,glow,pow})  rastro 3D que some: amostra fn(t) de t0 a t1 (cauda transparente, ponta forte)
   COS.tag(ctx,T,seq,{x,y,a,anchor})  rótulo fixo NOME · velocidade (Hanken 600 + IBM Plex Mono) com troca suave; seq=[{t,name,val,sub}]
   COS.camPath(T,keys)  câmera com keyframes suaves: {t,target,dist,yaw,pitch,fov,cx,cy} (qualquer campo pode ser função de T;
       distância interpolada em log = recuo/dolly logarítmico; ease suave entre chaves). Devolve W3D.cam
   COS.ring(ctx,q,{r,a,col,t})  anel dourado que marca um corpo pequeno demais para ver (com pulso)
   COS.SCALE  números reais: Sol = 109 Terras, distância Terra–Sol = 11.740 diâmetros terrestres, Lua 0,273 Terra a 60,3 raios
   COS.scaleMix(u1,u2,toy)  tamanhos e distâncias de "fora de escala" (toy) para "em escala": u1 = tamanhos, u2 = distâncias
   COS.helixPos(i,th,cfg) / COS.helix(ctx,c,cfg,th,{len,a})  hélices: o Sol anda (cfg.dir, a ~60° do plano das órbitas: o plano
       orbital fica inclinado ~60° em relação ao plano da galáxia) e cada planeta desenha uma hélice inclinada; sem o "vórtice" falso
   COS.galaxy(ctx,cx,cy,R,rot,{a,tilt})  Via Láctea vista de cima (barra, 2 braços principais e 2 menores, poeira); devolve proj(rf,ang)
       COS.SUN_RF = 0,52 (o Sol fica a ~26 mil anos-luz do centro, cerca de metade do raio do disco)
   COS.stamp(ctx,texto,x,y,t,{rot,size,col})  carimbo que bate (escala, tremida, textura)
   COS.dof(ctx,px,fn)  desenha fn numa camada desfocada (profundidade de campo leve)
   COS.pin(ctx,c,s,{col,r,a,stem})  marcador dourado preso à superfície (s = PL.surf(...)); some quando fica do lado de trás
   COS.arrow(ctx,x0,y0,x1,y1,{col,lw,head,a,glow})  seta 2D com brilho
   COS.libration(fase)  balanço real da Lua visto da Terra: {lon: ±7,9°, lat: ±6,7°} (períodos ligeiramente diferentes → figura que não se fecha)
   COS.laser(ctx,qa,qb,t,{period,col,a})  pulso de laser indo de qa a qb e voltando (Lunar Laser Ranging), feixe fraco e clarão nas pontas
   COS.lookCam(eye,target,{fov,cy,cx})  câmera W3D posicionada num ponto olhando para outro
   --- estações do ano (exemplo: projetos/terra-lua-sol/terra/) ---
   COS.kepler({a,e,eReal,peri,varpi})  órbita elíptica da Terra por DATA (dia do ano): tempo real (Kepler com eReal = 0,0167),
       forma com e visual (exagerada). .pos(dia) [x,0,z] com o Sol na origem · .lon(dia) longitude (graus) · .km(dia) distância real em km
       · .draw(ctx,c,{a,col,lw,ticks:[{d,label,col}],tickOut}) desenha a elipse e marcas de data. COS.AXIS(eps) = eixo fixo da Terra nesse
       referencial (norte inclinado para o Sol em 21/06). COS.MES[i], COS.dateStr(dia) -> '3 JAN'
   COS.spline(keys)  curva suave e monótona por chaves [[t,v],...] ou [[t,v,inclinação],...] (Hermite; não volta para trás): datas, giro
   COS.beam(ctx,c,{p,r,n,L,w,len,col,a,fill})  faixa de luz paralela (direção L, para o Sol) de raio w batendo no globo (centro p, raio r)
       no ponto de normal n; pinta o feixe e a área iluminada; devolve {k: área/área do feixe (= 1/cos), q: centro na tela}
   COS.sunDir(lat,decl,H)  direção do Sol no céu local em graus (H = ângulo horário, 0 = meio-dia) -> [leste, cima, -norte] (eixos do W3D)
   COS.gnomon(ctx,c,{base,h,sun,R,a,col,shadowCol})  poste de altura h num chão local (disco de raio R, y para cima, norte = -z),
       sombra projetada pela direção sun, raio de Sol que passa pelo topo; devolve {len: comprimento da sombra, tip, top}
   --- calendário (exemplo: projetos/terra-lua-sol/bissexto/) ---  órbitas circulares no plano y=0, ângulo an no sentido de PL.pos
   COS.orbitArc(ctx,c,r,a0,a1,{col,lw,band,fillA,a})  trecho da órbita em destaque (band = faixa translúcida de meia largura band)
   COS.finish(ctx,c,r,an,{w,n,label,labelOut,a})  linha de chegada quadriculada atravessando a órbita no ângulo an
   COS.flag(ctx,c,P,{h,label,col,t,a})  bandeirinha num ponto 3D (ex.: onde o calendário vira o ano)
   COS.calPage(ctx,x,y,s,{day,mon,sub,col,flip,rot,a})  folha de calendário (argolas, mês na faixa, dia grande); flip 0..1 arranca a folha
   COS.dayDial(ctx,x,y,r,{slices:[{a0,a1,col,alpha,k,edge}],hand,hours,a})  mostrador de 24 h com fatias em horas (0 em cima, sentido horário)
   COS.chip(ctx,x,y,s,{text,state:'ok'|'x',strike,sub,a})  ficha de ano: ouro com destaque (ok) ou riscada com traço animado (strike 0..1) */
const COS=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  const lerpL=(a,b,u)=>Math.exp(lerp(Math.log(a),Math.log(b),u)),sstep=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u)};
  const sprite=(s,stops)=>{const cv=document.createElement('canvas');cv.width=cv.height=s;const g=cv.getContext('2d'),gr=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);stops.forEach(([o,c])=>gr.addColorStop(o,c));g.fillStyle=gr;g.fillRect(0,0,s,s);return cv};
  const GLOW=sprite(64,[[0,'rgba(255,255,255,1)'],[.25,'rgba(255,255,255,.45)'],[1,'rgba(255,255,255,0)']]);
  /* direção -> tela (estrelas no infinito: só a rotação da câmera importa) */
  const dirP=(c,d)=>{const z=dot(d,c.fw);if(z<=.02)return null;const q=c.P(add(c.eye,mul(d,c.dist*50)));return isFinite(q[0])?q:null};

  /* ---------- céu ---------- */
  let SK=null;
  function skyData(pole){const R=FX.rng(4242),gp=nrm(pole),e1=nrm(crs(gp,Math.abs(gp[1])<.9?[0,1,0]:[1,0,0])),e2=crs(gp,e1),S=[],B=[],Dk=[];
    const onBand=(lo,la)=>nrm(add(add(mul(e1,Math.cos(lo)*Math.cos(la)),mul(e2,Math.sin(lo)*Math.cos(la))),mul(gp,Math.sin(la))));
    const gauss=()=>(R()+R()+R()+R()-2)*.87;
    for(let i=0;i<3200;i++){let d;if(R()<.38){const lo=R()*TAU,core=Math.exp(-Math.pow(((lo+Math.PI)%TAU-Math.PI)/1.1,2));d=onBand(lo,gauss()*(.07+.08*core))}else{const z=R()*2-1,a=R()*TAU,s=Math.sqrt(1-z*z);d=[s*Math.cos(a),z,s*Math.sin(a)]}
      const m=Math.pow(R(),7),c=R();S.push({d,m,s:.55+m*2.6,col:c<.12?[255,214,178]:c<.3?[190,212,255]:[242,244,255],tw:R()*TAU})}
    for(let i=0;i<1500;i++){const lo=R()*TAU,cw=((lo+Math.PI)%TAU-Math.PI),core=Math.exp(-cw*cw/1.3),la=gauss()*(.06+.12*core),br=(.35+.65*clamp(.5+FX.noise(Math.cos(lo)*3,Math.sin(lo)*3,la*8)*1.3))*(.45+.9*core);
      B.push({d:onBand(lo,la),s:.05+.09*R()+.06*core,b:br,warm:core})}
    for(let i=0;i<520;i++){const lo=R()*TAU,cw=((lo+Math.PI)%TAU-Math.PI),core=Math.exp(-cw*cw/1.6),la=gauss()*.025+FX.noise(lo*2,3)*.05;Dk.push({d:onBand(lo,la),s:.025+.05*R()*(.6+core),b:.5+.5*R()})}
    const N=[];for(let i=0;i<260;i++)N.push({x:R(),y:R(),m:Math.pow(R(),5),k:.5+R()*.5});return {S,B,Dk,N}}
  const DUST=sprite(64,[[0,'rgba(3,4,8,.9)'],[.5,'rgba(3,4,8,.45)'],[1,'rgba(3,4,8,0)']]);
  function sky(ctx,c,o={}){if(!SK)SK=skyData(o.pole||[.35,.82,.45]);const a=o.a??1;if(a<=0)return;const ba=o.band??.85;ctx.save();
    /* faixa: nuvens de brilho somadas + poeira por cima */
    if(ba>0){ctx.globalCompositeOperation='lighter';for(const b of SK.B){const q=dirP(c,b.d);if(!q)continue;const s=b.s*c.f;if(q[0]<-s||q[0]>W+s||q[1]<-s||q[1]>H+s)continue;
        ctx.globalAlpha=a*ba*b.b*.022;ctx.drawImage(b.warm>.5?GLOWW:GLOWB,q[0]-s,q[1]-s,2*s,2*s)}
      ctx.globalCompositeOperation='source-over';for(const d of SK.Dk){const q=dirP(c,d.d);if(!q)continue;const s=d.s*c.f;if(q[0]<-s||q[0]>W+s||q[1]<-s||q[1]>H+s)continue;ctx.globalAlpha=a*ba*d.b*.085;ctx.drawImage(DUST,q[0]-s,q[1]-s,2*s,2*s)}}
    /* estrelas */
    ctx.globalCompositeOperation='lighter';for(const s of SK.S){const q=dirP(c,s.d);if(!q||q[0]<-8||q[0]>W+8||q[1]<-8||q[1]>H+8)continue;const al=a*(.28+.72*s.m);
      ctx.globalAlpha=al;ctx.fillStyle=`rgb(${s.col[0]},${s.col[1]},${s.col[2]})`;ctx.beginPath();ctx.arc(q[0],q[1],s.s,0,TAU);ctx.fill();
      if(s.m>.55){const g=s.s*6;ctx.globalAlpha=al*.22;ctx.drawImage(GLOW,q[0]-g,q[1]-g,2*g,2*g)}}
    /* camada próxima (paralaxe): anda com a rotação da câmera e com o deslocamento par */
    const fw=c.fw,yaw=Math.atan2(fw[0],-fw[2]),pit=Math.asin(clamp(fw[1],-1,1)),par=o.par||[0,0],Wr=W+120,Hr=H+120;
    for(const n of SK.N){let x=n.x*Wr-yaw*c.f*1.15*n.k+par[0]*n.k,y=n.y*Hr+pit*c.f*1.15*n.k+par[1]*n.k;x=((x%Wr)+Wr)%Wr-60;y=((y%Hr)+Hr)%Hr-60;
      ctx.globalAlpha=a*(.25+.6*n.m);ctx.fillStyle='#eef2ff';ctx.beginPath();ctx.arc(x,y,.7+1.6*n.m*n.k,0,TAU);ctx.fill()}
    ctx.restore()}
  const GLOWB=sprite(64,[[0,'rgba(170,186,230,1)'],[.4,'rgba(120,140,200,.45)'],[1,'rgba(80,100,160,0)']]),GLOWW=sprite(64,[[0,'rgba(255,226,190,1)'],[.4,'rgba(230,190,150,.5)'],[1,'rgba(160,120,90,0)']]);

  /* ---------- Sol ---------- */
  const SB=document.createElement('canvas'),CO=document.createElement('canvas');CO.width=CO.height=150;
  function corona(t,seed,P=0){const g=CO.getContext('2d'),S=150,c0=S/2;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,S,S);g.globalCompositeOperation='lighter';
    g.filter='blur(2px)';for(let i=0;i<80;i++){const an=i/80*TAU+FX.noise(i*.7,seed)*.2,l=.34+.42*Math.max(0,.3+FX.noise(Math.cos(an)*1.4+(P?Math.cos(t*TAU/P)*.5:0),Math.sin(an)*1.4+(P?Math.sin(t*TAU/P)*.5:0),P?seed:t*.08+seed)),w=.09+.09*Math.abs(FX.noise(i*1.3,7,seed));
      const x1=c0+Math.cos(an)*S*l*.5,y1=c0+Math.sin(an)*S*l*.5,gr=g.createLinearGradient(c0,c0,x1,y1);gr.addColorStop(0,'rgba(255,236,200,.0)');gr.addColorStop(.3,'rgba(255,232,190,.11)');gr.addColorStop(1,'rgba(255,220,170,0)');
      g.fillStyle=gr;g.beginPath();g.moveTo(c0+Math.cos(an-w)*S*.16,c0+Math.sin(an-w)*S*.16);g.lineTo(x1,y1);g.lineTo(c0+Math.cos(an+w)*S*.16,c0+Math.sin(an+w)*S*.16);g.closePath();g.fill()}g.filter='none';
    return CO}
  function sun(ctx,c,p,r,t,o={}){const q=c.P(p);if(!isFinite(q[0]))return null;const R=c.f*r/q[2],a=o.a??1;if(a<=0)return {q,R};const Rg=Math.max(R,o.minPx??2.5),gk=o.glow??1,rd=clamp(o.red||0);
    if(q[0]+Rg*12<0||q[0]-Rg*12>W||q[1]+Rg*12<0||q[1]-Rg*12>H)return {q,R};
    ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';
    /* bloom em camadas: halo largo, médio e o brilho junto do disco; mínimo em px para o Sol pequeno continuar brilhando */
    for(const [k,al,mn] of [[14,.07,160],[6,.13,70],[2.6,.28,26],[1.35,.45,8]]){const rr=Math.max(Rg*k,mn*gk*(R<20?1:0)),g=ctx.createRadialGradient(q[0],q[1],Math.min(R*.9,rr*.2),q[0],q[1],rr);
      g.addColorStop(0,`rgba(255,${214-130*rd|0},${140-115*rd|0},${al*gk})`);g.addColorStop(.35,`rgba(255,${184-130*rd|0},${90-75*rd|0},${al*.45*gk})`);g.addColorStop(1,`rgba(255,${150-110*rd|0},${60-50*rd|0},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],rr,0,TAU);ctx.fill()}
    if(R>6){const cs=R*3.2,cv=corona(t,o.seed||0,o.loop||0);ctx.globalAlpha=a*(R>200?.55:.8);ctx.drawImage(cv,q[0]-cs,q[1]-cs,2*cs,2*cs)}
    ctx.restore();
    if(R<1.2){ctx.save();ctx.globalAlpha*=a;ctx.fillStyle='#fff6e0';ctx.shadowColor='#ffd27a';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(q[0],q[1],Math.max(1.4,R),0,TAU);ctx.fill();ctx.restore();return {q,R}}
    /* fotosfera: buffer proporcional ao tamanho na tela */
    const S=Math.max(24,Math.min(620,Math.round(2*R)));if(SB.width<S||SB.height<S){SB.width=SB.height=Math.max(S,SB.width,SB.height)}const g=SB.getContext('2d');g.clearRect(0,0,S,S);const img=g.createImageData(S,S),d=img.data;
    const P=o.loop||0,tt=P?((t%P)+P)%P:t,w=P?tt/P:0,spin=(o.spin??t*.02),cs=Math.cos(spin),sn=Math.sin(spin),sp=o.spots||[[.25,.6,.06],[-.18,2.4,.045],[.3,4.1,.035]];
    const F1=R>300?30:R>120?18:R>40?10:6,N=(x,y,z,k)=>FX.noise(x*F1,y*F1,z*F1+k*.35);
    for(let y=0;y<S;y++){const v=-((y+.5)/S*2-1);for(let x=0;x<S;x++){const u=(x+.5)/S*2-1,r2=u*u+v*v;if(r2>1)continue;const mu=Math.sqrt(1-r2);
      /* ponto na esfera, girando devagar em volta do eixo vertical */
      const X=u*cs+mu*sn,Z=-u*sn+mu*cs,Y=v;let n1=N(X,Y,Z,tt);if(P)n1=n1*(1-w)+N(X,Y,Z,tt-P)*w;
      const lane=sstep(0,.2,Math.abs(n1)),fine=FX.noise(X*F1*2.6,Y*F1*2.6,Z*F1*2.6+tt*.5)*.5;
      let I=1-.58*(1-mu)-.22*(1-mu)*(1-mu);I*=(.8+.2*lane+.07*fine)*(.95+.05*FX.noise(X*3.5,Y*3.5,Z*3.5));
      /* manchas solares (umbra + penumbra) */
      const la=Math.asin(clamp(Y,-1,1)),lo=Math.atan2(Z,X);for(const [sl,slo,ss] of sp){const dl=la-sl,dlo=((lo-slo+Math.PI*3)%TAU)-Math.PI,dd=Math.hypot(dl,dlo*Math.cos(sl))/ss;if(dd<1.8)I*=dd<.8?.28+.2*(dd/.8):.55+.45*sstep(.8,1.8,dd)}
      if(mu<.35)I*=1+.12*clamp(FX.noise(X*6,Y*6,Z*6)*2)*(1-mu/.35);
      const k=Math.pow(1-mu,.9),cR=255,cG=lerp(238,150,k)*(1-.55*rd),cB=lerp(200,62,k)*(1-.8*rd),i=(y*S+x)*4;
      d[i]=Math.min(255,cR*I*1.08);d[i+1]=Math.min(255,cG*I*1.02);d[i+2]=Math.min(255,cB*I);d[i+3]=255*Math.min(1,(1-Math.sqrt(r2))*S*.5)}}
    g.putImageData(img,0,0);ctx.save();ctx.globalAlpha*=a;ctx.drawImage(SB,0,0,S,S,q[0]-R,q[1]-R,2*R,2*R);ctx.restore();
    /* brilho por cima do disco (limbo vivo, sem estourar o miolo) */
    ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';const g2=ctx.createRadialGradient(q[0],q[1],R*.92,q[0],q[1],R*1.18);g2.addColorStop(0,`rgba(255,${190-120*rd|0},${110-90*rd|0},.5)`);g2.addColorStop(1,'rgba(255,90,30,0)');
    ctx.fillStyle=g2;ctx.beginPath();ctx.arc(q[0],q[1],R*1.18,0,TAU);ctx.fill();ctx.restore();return {q,R}}

  /* ---------- rastro 3D que some ---------- */
  function trail(ctx,c,fn,t0,t1,o={}){const n=o.n||90,col=o.color||C.gold,a=o.a??1;if(a<=0||t1<=t0)return;const Q=[];for(let k=0;k<=n;k++){const q=c.P(fn(lerp(t0,t1,k/n)));Q.push(q)}
    ctx.save();ctx.lineCap='round';ctx.strokeStyle=col;const pw=o.pow??1.4,lw=o.lw||3;
    for(const [wk,ak] of (o.glow===false?[[1,1]]:[[3.2,.16],[1,1]]))for(let k=1;k<=n;k++){const A=Q[k-1],B=Q[k];if(!isFinite(A[0])||!isFinite(B[0]))continue;const u=k/n;
      ctx.globalAlpha=a*ak*Math.pow(u,pw);ctx.lineWidth=lw*wk*(.35+.65*u);ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}
    ctx.restore();return Q}

  /* ---------- rótulo fixo NOME · velocidade ---------- */
  function tagOne(ctx,it,x,y,a,o){if(!it||a<=0)return;const ns=o.nameSize||40,vs=o.valSize||58;ctx.save();
    const meas=(s,font,ls)=>{ctx.font=font;if('letterSpacing' in ctx)ctx.letterSpacing=ls+'px';const w=ctx.measureText(s).width;if('letterSpacing' in ctx)ctx.letterSpacing='0px';return w};
    const fN=`600 ${ns}px ${F.sans}`,fV=`500 ${vs}px ${F.mono}`,wn=meas(it.name,fN,7),wd=meas(' · ',fV,0),wv=it.val?meas(it.val,fV,0):0,tot=wn+(it.val?wd+wv:0),x0=x-tot/2;ctx.restore();
    /* sombra suave atrás do rótulo: legível mesmo com o Sol passando por trás */
    if(o.shade!==false){ctx.save();ctx.globalAlpha*=a*.55;ctx.translate(x,y);ctx.scale(1,.34);const g=ctx.createRadialGradient(0,-40,0,0,-40,tot*.62+60);g.addColorStop(0,'rgba(3,5,10,.9)');g.addColorStop(1,'rgba(3,5,10,0)');ctx.fillStyle=g;ctx.fillRect(-tot,-40-(tot*.62+60),2*tot,2*(tot*.62+60));ctx.restore()}
    txt(ctx,it.name,x0,y,{font:F.sans,weight:600,size:ns,ls:7,color:C.chalk,align:'left',a});
    if(it.val){txt(ctx,'·',x0+wn+wd/2,y,{font:F.mono,size:vs,color:C.dim,a});ctx.save();ctx.shadowColor=it.col||C.gold;ctx.shadowBlur=18;txt(ctx,it.val,x0+wn+wd,y,{font:F.mono,weight:500,size:vs,color:it.col||C.gold,align:'left',a});ctx.restore()}
    if(it.sub)txt(ctx,it.sub,x,y+(o.subGap||54),{font:F.mono,size:o.subSize||27,ls:3,color:C.dim,a:a*.95})}
  function tag(ctx,T,seq,o={}){const x=o.x??W/2,y=o.y??1180,A=o.a??1;if(A<=0||!seq.length)return;let i=-1;for(let k=0;k<seq.length;k++)if(T>=seq[k].t)i=k;if(i<0)return;
    const cur=seq[i],prev=seq[i-1],d=o.dur??.6,u=i===0&&cur.t<=-1e3?1:ease(clamp((T-cur.t)/d)),dy=o.dy??26;
    /* troca em sequência (sai, depois entra) para os textos nunca se sobreporem */
    const uo=clamp(u/.42),ui=clamp((u-.42)/.58);if(prev&&uo<1)tagOne(ctx,prev,x,y-dy*uo,A*(1-uo),o);if(cur.name)tagOne(ctx,cur,x,y+dy*(1-ui),A*(prev?ui:u),o);
    if(o.anchor&&cur.name){const [ax,ay]=o.anchor;ctx.save();ctx.globalAlpha*=A*u*.55;ctx.strokeStyle=C.gold;ctx.lineWidth=1.5;ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(x,y-(o.nameSize||40)-18);ctx.stroke();ctx.restore()}}

  /* ---------- câmera com keyframes ---------- */
  function camPath(T,keys){const ev=(k,f,d)=>{const v=k[f];return v==null?d:typeof v==='function'?v(T):v};let a=keys[0],b=a,u=0;
    if(T>=keys[keys.length-1].t)a=b=keys[keys.length-1];else if(T>keys[0].t)for(let i=0;i<keys.length-1;i++)if(T>=keys[i].t&&T<keys[i+1].t){a=keys[i];b=keys[i+1];u=(T-a.t)/(b.t-a.t);u=(b.ease||(x=>x*x*x*(x*(x*6-15)+10)))(u);break}
    const ta=ev(a,'target',[0,0,0]),tb=ev(b,'target',[0,0,0]);
    return W3D.cam({target:ta.map((v,i)=>lerp(v,tb[i],u)),dist:lerpL(ev(a,'dist',10),ev(b,'dist',10),u),yaw:lerp(ev(a,'yaw',0),ev(b,'yaw',0),u),pitch:lerp(ev(a,'pitch',.3),ev(b,'pitch',.3),u),
      fov:lerp(ev(a,'fov',.9),ev(b,'fov',.9),u),cx:lerp(ev(a,'cx',W/2),ev(b,'cx',W/2),u),cy:lerp(ev(a,'cy',H/2),ev(b,'cy',H/2),u)})}

  /* ---------- anel marcador ---------- */
  function ring(ctx,q,o={}){if(!q||!isFinite(q[0]))return;const a=o.a??1;if(a<=0)return;const r=o.r||24,col=o.col||C.gold,t=o.t||0;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=col;ctx.shadowColor=col;ctx.shadowBlur=16;ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(q[0],q[1],r,0,TAU);ctx.stroke();const ph=(t%1.8)/1.8;ctx.globalAlpha=a*(1-ph)*.6;ctx.lineWidth=2;ctx.beginPath();ctx.arc(q[0],q[1],r*(1+ph*.9),0,TAU);ctx.stroke();
    ctx.globalAlpha=a;ctx.fillStyle=col;ctx.beginPath();ctx.arc(q[0],q[1],2.6,0,TAU);ctx.fill();ctx.restore()}

  /* ---------- escala real ---------- */
  const SCALE={sunE:109.1,distD:11740,distE:23480,moonE:.273,moonDistE:60.3,kmh:{terraSol:107200,terraGiro:1674,luaTerra:3680,solGal:828000},galYears:230e6,galRF:.52};
  /* toy = {re, rs, de, rm, dm} (raio da Terra, raio do Sol, distância Terra–Sol, raio da Lua, distância Terra–Lua) fora de escala;
     em escala, a Terra mantém re e o resto segue os números reais. Interpolação em log (u1 tamanhos, u2 distâncias); o Sol nunca engole a Terra. */
  function scaleMix(u1,u2,toy){const re=toy.re,rs=lerpL(toy.rs,re*SCALE.sunE,u1),rm=lerpL(toy.rm,re*SCALE.moonE,u1),de0=Math.max(toy.de,rs+toy.de-toy.rs),de=lerpL(de0,Math.max(de0,re*SCALE.distE),u2),
      dm=lerpL(Math.max(toy.dm,re*1.6),re*SCALE.moonDistE,u2);return {re,rs,rm,de,dm}}

  /* ---------- hélices ---------- */
  /* cfg: {r:[raio da órbita], T:[período em s], ph:[fase], dir:[x,y,z] direção do Sol (padrão: 30° do eixo das órbitas = plano a 60° da galáxia), vs, s0: deslocamento(th)} */
  const HDIR=nrm([Math.sin(Math.PI/6),Math.cos(Math.PI/6),0]);
  const sunAt=(th,cfg)=>cfg.s0?cfg.s0(th):mul(cfg.dir||HDIR,(cfg.vs||1)*th);
  function helixPos(i,th,cfg){const S=sunAt(th,cfg),a=(cfg.ph?cfg.ph[i]:0)+TAU*th/cfg.T[i],r=cfg.r[i];return [S[0]+r*Math.cos(a),S[1],S[2]-r*Math.sin(a)]}
  function helix(ctx,c,cfg,th,o={}){const len=o.len||3,out=[];cfg.r.forEach((r,i)=>{if(o.only&&!o.only.includes(i))return;const n=Math.min(420,Math.max(40,Math.round(len/cfg.T[i]*48)));
      out.push(trail(ctx,c,tt=>helixPos(i,tt,cfg),th-len,th,{n,color:(o.col&&o.col(i))||C.cyan,lw:(o.lw&&o.lw(i))||2.4,a:(o.a??1)*((o.al&&o.al(i))??.8),pow:1.2}))});return out}

  /* ---------- galáxia vista de cima ---------- */
  let GX=null;const GS=1400;
  function galaxyTex(){if(GX)return GX;const cv=document.createElement('canvas');cv.width=cv.height=GS;const g=cv.getContext('2d'),c0=GS/2,Rd=GS*.47,img=g.createImageData(GS,GS),d=img.data,R=FX.rng(77);
    const b=Math.tan(13*Math.PI/180),r0=.16,ca=Math.cos(.5),sa=Math.sin(.5);
    for(let y=0;y<GS;y++)for(let x=0;x<GS;x++){const X=(x+.5-c0)/Rd,Y=(y+.5-c0)/Rd,r=Math.hypot(X,Y);if(r>1.25)continue;const th=Math.atan2(Y,X);
      /* braços que se arrastam para trás (rotação horária na tela) */
      const ph=th+Math.log(Math.max(r,.04)/r0)/b,wob=FX.fbm(X*2.2,Y*2.2,1,3)*.9+FX.noise(X*7,Y*7,2)*.22,env=sstep(.1,.24,r)*(1-sstep(.82,1.08,r));
      const m1=Math.max(0,Math.cos(2*ph+wob)),m2=Math.max(0,Math.cos(2*ph+Math.PI/2+wob*1.4)),arm=(Math.pow(m1,1.8)+.35*Math.pow(m2,2.6))*env;
      const clump=.6+.85*clamp(.5+FX.fbm(X*7,Y*7,3,5)*1.2),lane=Math.pow(Math.max(0,Math.cos(2*ph+wob-.6)),7)*env*(.6+.4*clamp(.5+FX.noise(X*14,Y*14,5)));
      const bx=X*ca+Y*sa,by=-X*sa+Y*ca,bar=Math.exp(-(bx*bx)/.032-(by*by)/.0035),bul=Math.exp(-(r*r)/.012),disk=Math.exp(-r/.34)*(1-sstep(.9,1.2,r));
      const B=(disk*.42+arm*.5*clump+bar*.7+bul*1.3)*(1-.7*lane),tm=1-Math.exp(-1.7*B),warm=clamp(bul*1.2+bar+disk*.25*(1-arm));
      const i=(y*GS+x)*4;d[i]=255*tm*lerp(.78,1,warm);d[i+1]=255*tm*lerp(.84,.88,warm);d[i+2]=255*tm*lerp(1,.68,warm);d[i+3]=255*clamp(tm*1.6)}
    g.putImageData(img,0,0);g.globalCompositeOperation='lighter';
    for(let i=0;i<7000;i++){const r=Rd*Math.pow(R(),.7),a=R()*TAU,X=c0+r*Math.cos(a),Y=c0+r*Math.sin(a),m=Math.pow(R(),5);g.globalAlpha=.18+.5*m;g.fillStyle=R()<.25?'#ffe6c8':'#e8eeff';g.beginPath();g.arc(X,Y,.5+m*1.3,0,TAU);g.fill()}
    /* aglomerados jovens nos braços: azul-brancos (nada de rosa) */
    for(let i=0;i<700;i++){const r=.25+R()*.75,th=-Math.log(r/r0)/b+(R()<.5?0:Math.PI)+(R()-.5)*.35,X=c0+r*Rd*Math.cos(th),Y=c0+r*Rd*Math.sin(th),s=2+R()*5;g.globalAlpha=.35*R();g.drawImage(GLOWB,X-s,Y-s,2*s,2*s)}
    g.globalCompositeOperation='source-over';return GX=cv}
  function galaxy(ctx,cx,cy,R,rot,o={}){const T=galaxyTex(),tilt=o.tilt??1,s=R/(GS*.47);if((o.a??1)>0){ctx.save();ctx.globalAlpha*=o.a??1;ctx.translate(cx,cy);ctx.scale(1,tilt);ctx.rotate(rot);ctx.drawImage(T,-GS/2*s,-GS/2*s,GS*s,GS*s);ctx.restore()}
    return (rf,ang)=>[cx+Math.cos(ang+rot)*rf*R,cy+Math.sin(ang+rot)*rf*R*tilt]}

  /* ---------- carimbo ---------- */
  function stamp(ctx,s,x,y,t,o={}){if(t<0)return;const k=clamp(t/.22),sc=lerp(1.9,1,easeOut(k)),sh=t>.22&&t<.5?Math.sin((t-.22)*70)*(1-(t-.22)/.28)*5:0,size=o.size||70,col=o.col||C.gold,a=(o.a??1)*k;if(a<=0)return;
    ctx.save();ctx.translate(x+sh,y);ctx.rotate(o.rot??-.09);ctx.scale(sc,sc);ctx.font=`600 ${size}px ${F.sans}`;if('letterSpacing' in ctx)ctx.letterSpacing='9px';const w=ctx.measureText(s).width+size*.9,h=size*1.75;if('letterSpacing' in ctx)ctx.letterSpacing='0px';
    ctx.globalAlpha=a*.35;ctx.fillStyle='rgba(8,10,18,1)';ctx.fillRect(-w/2,-h/2,w,h);ctx.globalAlpha=a;ctx.strokeStyle=col;ctx.shadowColor=col;ctx.shadowBlur=18;ctx.lineWidth=6;ctx.strokeRect(-w/2,-h/2,w,h);ctx.lineWidth=2;ctx.strokeRect(-w/2+12,-h/2+12,w-24,h-24);ctx.shadowBlur=0;
    txt(ctx,s,0,size*.36,{font:F.sans,weight:600,size,ls:9,color:col,a:1});
    const Rn=FX.rng(9);ctx.globalAlpha=a*.55;ctx.fillStyle='rgba(8,10,18,1)';for(let i=0;i<70;i++){const px=(Rn()-.5)*w,py=(Rn()-.5)*h,r=.8+Rn()*2.4;ctx.beginPath();ctx.arc(px,py,r,0,TAU);ctx.fill()}ctx.restore()}

  function pin(ctx,c,s,o={}){const a=o.a??1;if(a<=0)return null;const vis=dot(s.n,sub(c.eye,s.P));if(vis<=0)return null;const q=c.P(s.P),tip=c.P(add(s.P,mul(s.n,o.stem??0)));if(!isFinite(q[0]))return null;
    const col=o.col||C.gold,r=o.r||7,fa=a*clamp(vis/(c.dist*.25));ctx.save();ctx.globalAlpha*=fa;ctx.strokeStyle=col;ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=14;
    if(o.stem&&isFinite(tip[0])){ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(tip[0],tip[1]);ctx.stroke()}const h=o.stem&&isFinite(tip[0])?tip:q;
    ctx.beginPath();ctx.arc(h[0],h[1],r,0,TAU);ctx.fill();ctx.lineWidth=2;ctx.beginPath();ctx.arc(h[0],h[1],r*2.1,0,TAU);ctx.stroke();ctx.restore();return {q,h}}
  function arrow(ctx,x0,y0,x1,y1,o={}){const a=o.a??1;if(a<=0)return;const col=o.col||C.gold,lw=o.lw||4,hd=o.head||lw*4,an=Math.atan2(y1-y0,x1-x0);ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineCap='round';
    if(o.glow!==false){ctx.shadowColor=col;ctx.shadowBlur=12}ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1-Math.cos(an)*hd*.6,y1-Math.sin(an)*hd*.6);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x1-Math.cos(an-.42)*hd,y1-Math.sin(an-.42)*hd);ctx.lineTo(x1-Math.cos(an+.42)*hd,y1-Math.sin(an+.42)*hd);ctx.closePath();ctx.fill();ctx.restore()}
  const libration=ph=>({lon:7.9*Math.sin(ph),lat:6.7*Math.sin(ph*1.0125+1.3)});
  function laser(ctx,qa,qb,t,o={}){const a=o.a??1;if(a<=0||!qa||!qb)return;const P=o.period||1.6,u=((t%P)+P)%P/P,col=o.col||'#7ff0ff',k=u<.5?u*2:2-u*2,x=lerp(qa[0],qb[0],k),y=lerp(qa[1],qb[1],k);
    ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=col;ctx.globalAlpha*=.22;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(qa[0],qa[1]);ctx.lineTo(qb[0],qb[1]);ctx.stroke();ctx.globalAlpha/=.22;
    ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,0,x,y,26);g.addColorStop(0,'rgba(200,255,255,1)');g.addColorStop(.3,FX.rgba(col,.6));g.addColorStop(1,FX.rgba(col,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,26,0,TAU);ctx.fill();
    for(const [q,k0] of [[qb,.5],[qa,0]]){const f=Math.max(0,1-Math.abs(u-k0>.5?u-k0-1:u-k0)*14);if(f>0){const g2=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],40);g2.addColorStop(0,FX.rgba(col,.9*f));g2.addColorStop(1,FX.rgba(col,0));ctx.fillStyle=g2;ctx.beginPath();ctx.arc(q[0],q[1],40,0,TAU);ctx.fill()}}ctx.restore()}
  function lookCam(eye,tg,o={}){const d=sub(eye,tg),L=Math.hypot(...d);return W3D.cam({target:tg,dist:L,yaw:Math.atan2(d[0],d[2]),pitch:Math.asin(clamp(d[1]/L,-1,1)),fov:o.fov??.9,cx:o.cx??W/2,cy:o.cy??H/2})}
  function dof(ctx,px,fn){if(px<.3){fn(ctx);return}W3D.layer(ctx,px,fn,{slot:3})}
  /* ---------- estações: órbita por data, curva suave, feixe de luz, poste com sombra ---------- */
  const MES=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'],MD=[31,28,31,30,31,30,31,31,30,31,30,31];
  function dateStr(d){let x=((Math.round(d)-1)%365+365)%365,m=0;while(x>=MD[m]){x-=MD[m];m++}return (x+1)+' '+MES[m]}
  const AXIS=(eps=23.44)=>{const e=eps*Math.PI/180;return [0,Math.cos(e),-Math.sin(e)]};
  function kepler(o={}){const A=o.a??9,e=o.e??.25,eR=o.eReal??.0167,peri=o.peri??3,vp=(o.varpi??102.9)*Math.PI/180,Y=365.256;
    const nu=d=>{const M=TAU*(d-peri)/Y;let E=M;for(let i=0;i<6;i++)E-=(E-eR*Math.sin(E)-M)/(1-eR*Math.cos(E));return 2*Math.atan2(Math.sqrt(1+eR)*Math.sin(E/2),Math.sqrt(1-eR)*Math.cos(E/2))};
    const at=v=>{const r=A*(1-e*e)/(1+e*Math.cos(v)),l=vp+v;return [r*Math.cos(l),0,-r*Math.sin(l)]};
    const K={a:A,e,pos:d=>at(nu(d)),lon:d=>((vp+nu(d))*180/Math.PI%360+360)%360,km:d=>149.598e6*(1-eR*eR)/(1+eR*Math.cos(nu(d))),nu,at};
    K.draw=(ctx,c,s={})=>{const a=s.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a*(s.lineA??.45);ctx.strokeStyle=s.col||C.cyan;ctx.lineWidth=s.lw||2;if(s.glow){ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=s.glow}
      ctx.beginPath();let pen=false;for(let k=0;k<=240;k++){const q=c.P(at(k/240*TAU));if(!isFinite(q[0])){pen=false;continue}pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}ctx.stroke();ctx.restore();
      for(const t of s.ticks||[]){const P=K.pos(t.d),q=c.P(P),out=nrm(P),q2=c.P(add(P,mul(out,s.tickOut??.55))),ta=a*(t.a??1);if(!isFinite(q[0])||!isFinite(q2[0])||ta<=0)continue;const col=t.col||C.chalk;
        ctx.save();ctx.globalAlpha*=ta;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(q2[0],q2[1]);ctx.stroke();ctx.restore();
        const dx=q2[0]-q[0],dy=q2[1]-q[1],L=Math.hypot(dx,dy)||1,g=s.labGap??46;txt(ctx,t.label,q2[0]+dx/L*g,q2[1]+dy/L*g+9,{font:F.mono,size:s.size||26,ls:3,color:col,a:ta})}};
    return K}
  /* Hermite monótono (Fritsch–Carlson); inclinação opcional por chave */
  function spline(keys){const n=keys.length,t=keys.map(k=>k[0]),v=keys.map(k=>k[1]),dl=[];for(let i=0;i<n-1;i++)dl.push((v[i+1]-v[i])/(t[i+1]-t[i]));
    const m=keys.map((k,i)=>k[2]!=null?k[2]:i===0?dl[0]:i===n-1?dl[n-2]:dl[i-1]*dl[i]<=0?0:(dl[i-1]+dl[i])/2);
    for(let i=0;i<n-1;i++){if(dl[i]===0){m[i]=m[i+1]=0;continue}const a=m[i]/dl[i],b=m[i+1]/dl[i],h=a*a+b*b;if(h>9){const k=3/Math.sqrt(h);if(keys[i][2]==null)m[i]=k*a*dl[i];if(keys[i+1][2]==null)m[i+1]=k*b*dl[i]}}
    return x=>{if(x<=t[0])return v[0]+m[0]*(x-t[0]);if(x>=t[n-1])return v[n-1]+m[n-1]*(x-t[n-1]);let i=0;while(x>t[i+1])i++;const h=t[i+1]-t[i],u=(x-t[i])/h,u2=u*u,u3=u2*u;
      return (2*u3-3*u2+1)*v[i]+(u3-2*u2+u)*h*m[i]+(-2*u3+3*u2)*v[i+1]+(u3-u2)*h*m[i+1]}}
  const hull=P=>{P=P.filter(q=>isFinite(q[0])).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(P.length<3)return P;const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
    for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}for(const p of P.slice().reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}return lo.slice(0,-1).concat(up.slice(0,-1))};
  function beam(ctx,c,o){const a=o.a??1,p=o.p,r=o.r,n=nrm(o.n),L=nrm(o.L),w=o.w,len=o.len??r*3,col=o.col||C.gold,S=add(p,mul(n,r)),
      e1=nrm(crs(L,Math.abs(L[1])<.9?[0,1,0]:[1,0,0])),e2=crs(L,e1),N=48,F=[],Far=[];
    for(let k=0;k<N;k++){const an=k/N*TAU,off=add(mul(e1,Math.cos(an)*w),mul(e2,Math.sin(an)*w)),d0=sub(add(S,off),p),b=dot(d0,L),cq=dot(d0,d0)-r*r,disc=b*b-cq;
      const s=disc>=0?-b+Math.sqrt(disc):-b,X=add(add(S,off),mul(L,s));F.push(X);Far.push(add(X,mul(L,len)))}
    /* área iluminada (polígono no globo) / seção do feixe = 1/cos do ângulo de chegada */
    let ar=0;for(let k=0;k<N;k++){const A=sub(F[k],S),B=sub(F[(k+1)%N],S);ar+=Math.hypot(...crs(A,B))/2}const k=ar/(Math.PI*w*w);
    const qF=F.map(c.P),qS=c.P(S);if(a<=0)return {k,q:qS};
    ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';const Hh=hull(qF.concat(Far.map(c.P))),qf=c.P(add(S,mul(L,len)));
    if(Hh.length>2&&isFinite(qf[0])){const g=ctx.createLinearGradient(qf[0],qf[1],qS[0],qS[1]);g.addColorStop(0,FX.rgba(col,0));g.addColorStop(.55,FX.rgba(col,.10));g.addColorStop(1,FX.rgba(col,.22));
      ctx.fillStyle=g;ctx.beginPath();Hh.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill();
      /* raios finos dentro do feixe */
      ctx.lineWidth=1.2;for(let i=0;i<N;i+=8){const A=qF[i],B=c.P(Far[i]);if(!isFinite(A[0])||!isFinite(B[0]))continue;const g2=ctx.createLinearGradient(B[0],B[1],A[0],A[1]);g2.addColorStop(0,FX.rgba(col,0));g2.addColorStop(1,FX.rgba(col,.45));ctx.strokeStyle=g2;ctx.beginPath();ctx.moveTo(B[0],B[1]);ctx.lineTo(A[0],A[1]);ctx.stroke()}}
    if(qF.every(q=>isFinite(q[0]))){ctx.fillStyle=FX.rgba(col,(o.fill??.5)/Math.max(1,k*.8));ctx.shadowColor=col;ctx.shadowBlur=18;ctx.beginPath();qF.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill();
      ctx.globalCompositeOperation='source-over';ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.stroke()}
    ctx.restore();return {k,q:qS,F:qF}}
  function sunDir(lat,dec,H){const D2=Math.PI/180,f=lat*D2,d=dec*D2,h=H*D2,u=Math.sin(f)*Math.sin(d)+Math.cos(f)*Math.cos(d)*Math.cos(h),e=-Math.cos(d)*Math.sin(h),nn=Math.cos(f)*Math.sin(d)-Math.sin(f)*Math.cos(d)*Math.cos(h);return [e,u,-nn]}
  function gnomon(ctx,c,o){const a=o.a??1,B=o.base||[0,0,0],h=o.h??1,R=o.R??2,sd=nrm(o.sun),col=o.col||C.chalk,top=add(B,[0,h,0]),up=Math.max(.02,sd[1]),
      tip=[B[0]-sd[0]/up*h,B[1],B[2]-sd[2]/up*h],len=Math.hypot(tip[0]-B[0],tip[2]-B[2]);if(a<=0)return {len};
    ctx.save();ctx.globalAlpha*=a;
    /* chão: disco com anéis e marca do norte */
    const ring=(rr,fill)=>{ctx.beginPath();for(let k=0;k<=96;k++){const an=k/96*TAU,q=c.P([B[0]+rr*Math.cos(an),B[1],B[2]+rr*Math.sin(an)]);k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}fill?ctx.fill():ctx.stroke()};
    const qb=c.P(B),qR=c.P([B[0]+R,B[1],B[2]]),gr=ctx.createRadialGradient(qb[0],qb[1],0,qb[0],qb[1],Math.abs(qR[0]-qb[0])*1.1);gr.addColorStop(0,'rgba(58,70,96,.85)');gr.addColorStop(1,'rgba(20,26,40,.6)');ctx.fillStyle=gr;ring(R,true);
    ctx.strokeStyle='rgba(236,230,214,.18)';ctx.lineWidth=1.2;for(const f of [.33,.66,1])ring(R*f,false);
    const qN=c.P([B[0],B[1],B[2]-R*1.14]);txt(ctx,'N',qN[0],qN[1]+8,{font:F.mono,size:22,color:C.dim});
    /* sombra do pé até a ponta, com a largura do poste */
    const pw=h*.035,side=nrm(crs([0,1,0],len>1e-4?sub(tip,B):[1,0,0])),Q=[add(B,mul(side,pw)),add(tip,mul(side,pw*.6)),add(tip,mul(side,-pw*.6)),add(B,mul(side,-pw))].map(c.P);
    if(len>1e-3){ctx.fillStyle=o.shadowCol||'rgba(4,6,12,.9)';ctx.beginPath();Q.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill()}
    /* raio de Sol que passa pelo topo e marca a ponta da sombra */
    const qf=c.P(add(top,mul(sd,h*1.6))),qt=c.P(top),qp=c.P(tip);ctx.save();ctx.setLineDash([7,9]);ctx.strokeStyle=C.gold;ctx.globalAlpha*=.75;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(qf[0],qf[1]);ctx.lineTo(qp[0],qp[1]);ctx.stroke();ctx.restore();
    /* poste: corpo com luz do lado do Sol */
    const ps=Math.max(3,c.f*pw*2/qb[2]),gp=ctx.createLinearGradient(qb[0]-ps,0,qb[0]+ps,0),lit=sd[0]>0;gp.addColorStop(lit?1:0,'#f3ede0');gp.addColorStop(lit?0:1,'#6f6a62');
    ctx.strokeStyle=gp;ctx.lineWidth=ps;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(qb[0],qb[1]);ctx.lineTo(qt[0],qt[1]);ctx.stroke();
    ctx.fillStyle=col;ctx.shadowColor=C.gold;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(qt[0],qt[1],ps*.75,0,TAU);ctx.fill();ctx.restore();
    return {len,tip:qp,top:qt,base:qb,sunQ:qf}}
  /* ---------- calendário: linha de chegada, arco da órbita, bandeira, folha, mostrador de 24 h, ficha de ano ---------- */
  const oP=(r,an,y=0)=>[r*Math.cos(an),y,-r*Math.sin(an)];
  function orbitArc(ctx,c,r,a0,a1,o={}){const a=o.a??1;if(a<=0||a1===a0)return;const col=o.col||C.gold,n=Math.max(8,Math.ceil(Math.abs(a1-a0)/TAU*240)),w=o.band||0;ctx.save();ctx.globalAlpha*=a;
    if(w>0){ctx.fillStyle=FX.rgba(col,o.fillA??.28);ctx.beginPath();for(let k=0;k<=n;k++){const q=c.P(oP(r+w,lerp(a0,a1,k/n)));k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}
      for(let k=n;k>=0;k--){const q=c.P(oP(r-w,lerp(a0,a1,k/n)));ctx.lineTo(q[0],q[1])}ctx.closePath();ctx.fill()}
    ctx.strokeStyle=col;ctx.lineWidth=o.lw||4;ctx.lineCap='round';ctx.shadowColor=col;ctx.shadowBlur=o.glow??14;ctx.beginPath();for(let k=0;k<=n;k++){const q=c.P(oP(r,lerp(a0,a1,k/n)));k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}ctx.stroke();ctx.restore()}
  function finish(ctx,c,r,an,o={}){const a=o.a??1;if(a<=0)return null;const w=o.w??r*.12,n=o.n??8,h=o.h??0,q0=c.P(oP(r-w,an,h)),q1=c.P(oP(r+w,an,h));if(!isFinite(q0[0])||!isFinite(q1[0]))return null;
    const dx=q1[0]-q0[0],dy=q1[1]-q0[1],L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L,t=o.thick??Math.max(6,L*.06);ctx.save();ctx.globalAlpha*=a;
    /* faixa quadriculada de chegada */
    for(let i=0;i<n;i++)for(let j=0;j<2;j++){const u0=i/n,u1=(i+1)/n,v0=(j-1)*t,v1=j*t;ctx.fillStyle=(i+j)%2?'rgba(236,230,214,.92)':'rgba(10,12,20,.92)';ctx.beginPath();
      ctx.moveTo(q0[0]+dx*u0+nx*v0,q0[1]+dy*u0+ny*v0);ctx.lineTo(q0[0]+dx*u1+nx*v0,q0[1]+dy*u1+ny*v0);ctx.lineTo(q0[0]+dx*u1+nx*v1,q0[1]+dy*u1+ny*v1);ctx.lineTo(q0[0]+dx*u0+nx*v1,q0[1]+dy*u0+ny*v1);ctx.closePath();ctx.fill()}
    ctx.strokeStyle=o.col||C.gold;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=14;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(q0[0]-nx*t,q0[1]-ny*t);ctx.lineTo(q1[0]-nx*t,q1[1]-ny*t);ctx.lineTo(q1[0]+nx*t,q1[1]+ny*t);ctx.lineTo(q0[0]+nx*t,q0[1]+ny*t);ctx.closePath();ctx.stroke();ctx.restore();
    if(o.label){const out=o.labelOut??1,qa=out>0?q1:q0;txt(ctx,o.label,qa[0]+dx/L*out*(o.gap??30),qa[1]+dy/L*out*(o.gap??30)+9,{font:F.mono,size:o.size||26,ls:3,color:o.col||C.gold,a,align:o.align||'center'})}
    return {q0,q1}}
  function flag(ctx,c,P,o={}){const a=o.a??1;if(a<=0)return null;const h=o.h??.9,qb=c.P(P),qt=c.P([P[0],P[1]+h,P[2]]);if(!isFinite(qb[0])||!isFinite(qt[0]))return null;const col=o.col||C.gold,L=Math.hypot(qt[0]-qb[0],qt[1]-qb[1]),fw=o.fw??L*.6,fh=L*.32,wv=Math.sin((o.t||0)*6)*fh*.12;
    ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.shadowColor=col;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(qb[0],qb[1]);ctx.lineTo(qt[0],qt[1]);ctx.stroke();
    ctx.fillStyle=FX.rgba(col,.9);ctx.beginPath();ctx.moveTo(qt[0],qt[1]);ctx.quadraticCurveTo(qt[0]+fw*.5,qt[1]+wv,qt[0]+fw,qt[1]+fh*.15);ctx.lineTo(qt[0]+fw,qt[1]+fh*1.05);ctx.quadraticCurveTo(qt[0]+fw*.5,qt[1]+fh+wv,qt[0],qt[1]+fh);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.arc(qb[0],qb[1],4,0,TAU);ctx.fill();ctx.restore();if(o.label)txt(ctx,o.label,qt[0]+fw/2,qt[1]-14,{font:F.mono,size:o.size||22,ls:2,color:col,a});return {qb,qt}}
  /* folha de calendário: argolas, faixa do mês, número grande; flip 0..1 vira a folha para cima (arrancada) */
  function calPage(ctx,x,y,s,o={}){const a=o.a??1;if(a<=0)return;const col=o.col||C.gold,w=s,h=s*1.12,fl=clamp(o.flip||0);ctx.save();ctx.globalAlpha*=a*(1-fl);ctx.translate(x,y-h*.5*fl*1.6);ctx.rotate((o.rot||0)+fl*.5);ctx.scale(1,1-fl*.6);
    ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=s*.12;ctx.shadowOffsetY=s*.04;ctx.fillStyle='#ece6d6';ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,s*.06);ctx.fill();ctx.shadowColor='transparent';
    ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h*.27,[s*.06,s*.06,0,0]);ctx.fill();
    ctx.fillStyle='#1a1e2a';for(const k of [-.28,.28]){ctx.beginPath();ctx.arc(k*w,-h/2+h*.06,s*.035,0,TAU);ctx.fill()}
    txt(ctx,o.mon||'FEV',0,-h/2+h*.2,{font:F.sans,weight:600,size:s*.15,ls:s*.02,color:'#10131c'});
    txt(ctx,String(o.day??29),0,h*.3,{font:F.display,size:s*.56,color:o.dayCol||'#10131c'});
    if(o.sub)txt(ctx,o.sub,0,h/2-s*.07,{font:F.mono,size:s*.075,ls:2,color:'#5b5f6c'});ctx.restore()}
  /* mostrador de 24 h: fatias [{a0,a1,col,alpha}] em horas (0 em cima, sentido horário), marcas a cada hora */
  function dayDial(ctx,x,y,r,o={}){const a=o.a??1;if(a<=0)return;const H2=h=>-Math.PI/2+h/24*TAU;ctx.save();ctx.globalAlpha*=a;
    ctx.fillStyle='rgba(10,13,22,.85)';ctx.strokeStyle='rgba(236,230,214,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.stroke();
    for(const sl of o.slices||[]){if(sl.a1<=sl.a0)continue;ctx.fillStyle=FX.rgba(sl.col||C.gold,sl.alpha??.75);ctx.shadowColor=sl.col||C.gold;ctx.shadowBlur=sl.glow??12;ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r*(sl.k??.92),H2(sl.a0),H2(sl.a1));ctx.closePath();ctx.fill();
      if(sl.edge){ctx.strokeStyle=sl.edge;ctx.lineWidth=2;ctx.stroke()}}ctx.shadowBlur=0;
    for(let h=0;h<24;h++){const an=H2(h),k=h%6===0?.8:.88;ctx.strokeStyle=h%6===0?'rgba(236,230,214,.8)':'rgba(236,230,214,.35)';ctx.lineWidth=h%6===0?3:1.5;ctx.beginPath();ctx.moveTo(x+Math.cos(an)*r*k,y+Math.sin(an)*r*k);ctx.lineTo(x+Math.cos(an)*r*.97,y+Math.sin(an)*r*.97);ctx.stroke()}
    if(o.hours!==false)for(const h of [0,6,12,18]){const an=H2(h);txt(ctx,(h||24)+'h',x+Math.cos(an)*r*1.2,y+Math.sin(an)*r*1.2+9,{font:F.mono,size:r*.14,color:C.dim})}
    if(o.hand!=null){const an=H2(o.hand);ctx.strokeStyle=C.chalk;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(an)*r*.86,y+Math.sin(an)*r*.86);ctx.stroke()}
    ctx.fillStyle=C.chalk;ctx.beginPath();ctx.arc(x,y,5,0,TAU);ctx.fill();ctx.restore()}
  /* ficha de ano: estado 'ok' (ouro, com ✓) ou 'x' (risco animado por strike 0..1) */
  function chip(ctx,x,y,s,o={}){const a=o.a??1;if(a<=0)return;const ok=o.state==='ok',col=ok?C.gold:(o.col||C.chalk),w=o.w??s*3.1,h=s*1.5,st=clamp(o.strike||0);ctx.save();ctx.globalAlpha*=a;
    ctx.fillStyle=ok?FX.rgba(C.gold,.16):'rgba(14,18,30,.85)';ctx.strokeStyle=FX.rgba(col,ok?.95:.45);ctx.lineWidth=ok?3:2;if(ok){ctx.shadowColor=C.gold;ctx.shadowBlur=18}ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,h*.22);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    txt(ctx,s2(o.text),x,y+s*.36,{font:F.mono,weight:500,size:s,color:ok?C.gold:FX.rgba(C.chalk,st>0?lerp(1,.45,st):1)});
    if(st>0){ctx.strokeStyle=o.strikeCol||C.cyan;ctx.lineWidth=s*.12;ctx.lineCap='round';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(x-w*.42,y+h*.18);ctx.lineTo(x-w*.42+w*.84*st,y+h*.18-h*.36*st);ctx.stroke()}
    if(o.sub)txt(ctx,o.sub,x,y+h/2+s*.62,{font:F.mono,size:s*.42,ls:2,color:ok?C.gold:C.dim,a:o.subA??1});ctx.restore()}
  const s2=v=>String(v);
  return {galaxyTex,orbitArc,finish,flag,calPage,dayDial,chip,kepler,spline,beam,sunDir,gnomon,AXIS,MES,dateStr,pin,arrow,libration,laser,lookCam,sky,sun,trail,tag,camPath,ring,SCALE,scaleMix,helixPos,helix,HDIR,galaxy,SUN_RF:.52,stamp,dof,lerpL,dirP}})();
