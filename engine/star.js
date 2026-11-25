/* ---------- STAR: estrelas realistas em espaço de tela (vida e morte das estrelas) ----------
   Tudo em px (x, y, raio na tela). Exemplo: exemplos/vida-estrelas/.
   STAR.bb(T)  cor de corpo negro [r,g,b] 0..255 para a temperatura T em kelvin (tabela pré-calculada; 1.000 a 50.000 K)
   STAR.ms(m)  estrela da sequência principal com m massas solares: {T, R (raios solares), life (anos), L (luminosidades)}
       vida por tabela de modelos (0,1 sol ≈ 6 trilhões de anos, Laughlin 1997; Sol 10 bilhões; 20 sóis ≈ 9 milhões)
   STAR.fmtY(anos)  '4,6 bilhões', '10 milhões', '6 trilhões'
   STAR.draw(ctx,x,y,R,t,o)  estrela por pixel: granulação (células de convecção com faixas escuras), escurecimento do limbo
       que avermelha a borda, temperatura local por célula, manchas, bloom na cor da estrela, coroa/vento, espículas de difração.
       o: {T, cells (frequência das células; gigante ≈ 2,5, Sol ≈ 9, anã ≈ 6), contrast, spots:[[lat,lon,raio]], wobble (borda
       irregular da gigante 0..1), haze (atmosfera estendida 0..1), flare (atividade: proeminências e clarões 0..1), wind (vento
       radial das quentes 0..1), spikes (espículas 0..1), glow, a, loop (s, granulação repete), spin, seed, maxS (buffer)}
   STAR.flare(ctx,x,y,R,t,o)  proeminências em arco na borda (chamado por draw com o.flare)
   STAR.sky(ctx,t,{seed,a,ox,oy,zoom,rot,neb,n})  céu 2D: 3 camadas de estrelas com cores reais (maioria laranja fraca, poucas
       azuis brilhantes), cintilação leve, nebulosas tênues; ox/oy deslocam com paralaxe por camada, zoom aproxima
   STAR.shell(ctx,x,y,R,u,o)  casca de gás em filamentos (nebulosa planetária ou remanescente de supernova): {kind:'pn'|'snr',
       seed, a, t} u = 0..1 idade (0 recém-ejetada). 'pn' = anel azul-verde por dentro e vermelho por fora; 'snr' = filamentos
   STAR.supernova(ctx,x,y,R,s,o)  explosão: s = segundos desde o colapso. Clarão que cobre a tela, raios, frente de choque com
       dedos de Rayleigh-Taylor e nuvem que esfria (azul-branco → laranja → vermelho Hα). o: {seed, a, scale (raio final/R)}
   STAR.pulsar(ctx,x,y,R,t,o)  estrela de nêutrons: esfera azul-branca, linhas de campo e dois feixes girando {period, a, tilt}
       devolve o brilho do pulso (0..1) para som
   STAR.hole(ctx,x,y,rs,t,o)  buraco negro com disco de acreção: metade de trás, lente (BH.lens) que curva o disco por cima,
       metade da frente e anel de fótons {a, tilt, disk}
   STAR.slider(ctx,x,y0,y1,m,o)  régua vertical de massa em log (0,08 a 40 sóis) com cursor na cor da estrela {a, lo, hi, marks}
   STAR.lifebar(ctx,box,o)  linha do tempo em log (anos) {a, lo, hi, bars:[{years,fill,col,label}], marks:[{years,label,col}]}
       devolve x(anos) para presos na régua */
const STAR=(()=>{
  const sst=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u)};
  /* ---------- cor de corpo negro (aproximação de Tanner Helland, suavizada) ---------- */
  function bbRaw(T){const t=T/100;let r,g,b;
    if(t<=66){r=255;g=99.4708025861*Math.log(t)-161.1195681661;b=t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307}
    else{r=329.698727446*Math.pow(t-60,-.1332047592);g=288.1221695283*Math.pow(t-60,-.0755148492);b=255}
    return [clamp(r,0,255),clamp(g,0,255),clamp(b,0,255)]}
  const LUT=[];for(let i=0;i<=400;i++){LUT.push(bbRaw(1000*Math.pow(50,i/400)))}
  function bb(T){const f=clamp(Math.log(T/1000)/Math.log(50))*400,i=Math.min(399,Math.floor(f)),k=f-i,a=LUT[i],b=LUT[i+1];return [lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)]}
  const rgba=(c,a)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
  /* ---------- sequência principal ---------- */
  const LIFE=[[.08,1.2e13],[.1,6e12],[.2,1e12],[.5,6e10],[1,1e10],[2,1.2e9],[5,1e8],[10,2.5e7],[20,9e6],[40,5e6]];
  function ms(m){const lm=Math.log10(m);let life=LIFE[0][1];
    for(let i=0;i<LIFE.length-1;i++){const [a,la]=LIFE[i],[b,lb]=LIFE[i+1];if(m<=b||i===LIFE.length-2){const k=clamp((lm-Math.log10(a))/(Math.log10(b)-Math.log10(a)),-1,2);life=Math.pow(10,lerp(Math.log10(la),Math.log10(lb),k));break}}
    const T=5772*Math.pow(m,m<1?.28:.6),R=Math.pow(m,m<1?.8:.57),L=m<.43?.23*Math.pow(m,2.3):m<2?Math.pow(m,4):1.4*Math.pow(m,3.5);return {T,R,life,L}}
  function fmtY(y){const f=(v,u)=>{const s=v>=100?Math.round(v).toString():v>=10?(Math.round(v*10)/10).toString():(Math.round(v*10)/10).toString();return s.replace('.',',')+' '+u};
    if(y>=1e12)return f(y/1e12,y/1e12<2?'trilhão':'trilhões');if(y>=1e9)return f(y/1e9,y/1e9<2?'bilhão':'bilhões');if(y>=1e6)return f(y/1e6,y/1e6<2?'milhão':'milhões');
    if(y>=1e3)return f(y/1e3,'mil');return Math.round(y)+''}
  /* ---------- fotosfera ---------- */
  /* cor "de foto": temperatura de exibição mais baixa nas frias (o Sol sai amarelo, não branco) e saturação reforçada */
  const PAL=[[2400,[255,80,26]],[3000,[255,108,40]],[3600,[255,138,54]],[4200,[255,170,72]],[5000,[255,188,86]],[5800,[255,212,118]],[7000,[255,236,200]],[10000,[218,228,255]],[20000,[172,196,255]],[40000,[150,178,255]]];
  function dcol(T){if(T<=PAL[0][0])return PAL[0][1].slice();for(let i=0;i<PAL.length-1;i++){const [a,ca]=PAL[i],[b,cb]=PAL[i+1];if(T<=b){const k=Math.log(T/a)/Math.log(b/a);return [lerp(ca[0],cb[0],k),lerp(ca[1],cb[1],k),lerp(ca[2],cb[2],k)]}}return PAL[PAL.length-1][1].slice()}
  const DL=[];for(let i=0;i<=400;i++)DL.push(dcol(1000*Math.pow(50,i/400)));
  function dc(T){const f=clamp(Math.log(T/1000)/Math.log(50))*400,i=Math.min(399,Math.floor(f)),k=f-i,a=DL[i],b=DL[i+1];return [lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)]}
  /* Worley 3D: células de convecção (grânulos) com faixas escuras entre elas; pontos que oscilam no tempo (loop exato) */
  const hsh=(i,j,k,s)=>{let h=Math.imul(i,374761393)^Math.imul(j,668265263)^Math.imul(k,2147483647)^Math.imul(s,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296};
  function worley(x,y,z,tw,s){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);let f1=9,f2=9,id=0;
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){const a=xi+i,b=yi+j,c=zi+k,h1=hsh(a,b,c,s),h2=hsh(a,b,c,s+1),h3=hsh(a,b,c,s+2);
      const px=a+.5+.42*Math.sin(h1*TAU+tw*(1+((h2*3)|0))),py=b+.5+.42*Math.sin(h2*TAU+tw*(1+((h3*3)|0))),pz=c+.5+.42*Math.sin(h3*TAU+tw),dx=px-x,dy=py-y,dz=pz-z,d=dx*dx+dy*dy+dz*dz;
      if(d<f1){f2=f1;f1=d;id=h1}else if(d<f2)f2=d}
    return [Math.sqrt(f1),Math.sqrt(f2),id]}
  const SB=document.createElement('canvas');
  function draw(ctx,x,y,R,t,o={}){const a=o.a??1;if(a<=0||!isFinite(x)||R<=0)return;
    const T=o.T||5772,col=dc(T),gk=o.glow??1,wob=o.wobble||0,hz=o.haze||0;
    if(x+R*8<-200||x-R*8>W+200||y+R*8<-200||y-R*8>H+200)return;
    ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';
    /* bloom: halo largo, médio e junto do disco; mínimo em px para estrela pequena continuar brilhando */
    const hot=clamp((T-4000)/20000),Rb=Math.max(R,3);
    for(const [k,al,mn] of [[16,.045+.04*hot,170],[6.5,.09+.05*hot,80],[2.6,.2,30],[1.35,.4,10]]){const rr=Math.max(Rb*k*(1+hz*.6),mn*gk*(R<24?1:.35));
      const g=ctx.createRadialGradient(x,y,Math.min(R*.9,rr*.2),x,y,rr);g.addColorStop(0,rgba(col,al*gk));g.addColorStop(.35,rgba(col,al*.4*gk));g.addColorStop(1,rgba(col,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rr,0,TAU);ctx.fill()}
    if(o.wind)wind(ctx,x,y,R,t,o,col);
    ctx.restore();
    if(R<1.5){ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';ctx.fillStyle=rgba([Math.min(255,col[0]+70),Math.min(255,col[1]+70),Math.min(255,col[2]+70)],1);ctx.beginPath();ctx.arc(x,y,1.6,0,TAU);ctx.fill();ctx.restore();
      if(o.spikes)spikes(ctx,x,y,R,o.spikes*a,col);return}
    /* disco por pixel, com borda irregular (gigantes) */
    const Rm=R*(1+wob*.12),S=Math.max(24,Math.min(o.maxS||560,Math.round(2*Rm)));
    if(SB.width<S||SB.height<S){SB.width=SB.height=Math.max(S,SB.width,SB.height)}
    const g=SB.getContext('2d');g.clearRect(0,0,S,S);const img=g.createImageData(S,S),d=img.data;
    const P=o.loop||0,tt=P?((t%P)+P)%P:t,spin=o.spin??(P?TAU*tt/P*.25:t*.03),cs=Math.cos(spin),sn=Math.sin(spin),seed=(o.seed||0)|0;
    const F1=o.cells??9,ct=o.contrast??(F1<4?.5:.3),sp=o.spots||[],tw=P?TAU*Math.max(1,Math.round(P/7))*tt/P:t*.9,warp=o.warp??(F1<4?.55:.12);
    /* raio da borda por ângulo (forma que respira devagar, em loop) */
    const edge=an=>1-wob*(.06+.06*FX.noise(Math.cos(an)*1.6+seed,Math.sin(an)*1.6,Math.sin(tw*.15)+seed)+.03*FX.noise(Math.cos(an)*4,Math.sin(an)*4,Math.cos(tw*.15)));
    const lA=o.limb??(.6-.25*hot),lB=.2,Tcool=o.limbT??.24,gi=o.giant||0;
    for(let j=0;j<S;j++){const v=-((j+.5)/S*2-1)*Rm/R;for(let i=0;i<S;i++){const u=((i+.5)/S*2-1)*Rm/R,r2=u*u+v*v;if(r2>1.3)continue;
      const rr=Math.sqrt(r2),e=wob?edge(Math.atan2(v,u)):1;if(rr>e)continue;
      const rn=rr/e,mu=Math.sqrt(Math.max(0,1-rn*rn)),X=u/e*cs+mu*sn,Z=-u/e*sn+mu*cs,Y=v/e;
      /* grânulos: centro claro e quente, faixas escuras e frias entre células; nas gigantes, poucas células enormes e deformadas */
      let lane,core=1,cb=1,fine=0;
      if(F1>20){/* grânulos pequenos demais para ver: textura de "casca de laranja" sem linhas */
        const n=FX.noise(X*F1+seed,Y*F1,Z*F1+Math.sin(tw*.4)*.6)*.7+FX.noise(X*F1*2.1,Y*F1*2.1+seed,Z*F1*2.1+Math.cos(tw*.4)*.6)*.45+FX.noise(X*5,Y*5,Z*5+seed)*.35;lane=.55+.6*n}
      else{const wx=warp?FX.noise(X*2+seed,Y*2,Z*2+Math.sin(tw*.3))*warp:0,wy=warp?FX.noise(X*2,Y*2+seed,Z*2+Math.cos(tw*.3))*warp:0;
        const wr=worley(X*F1+wx*F1*.4,Y*F1+wy*F1*.4,Z*F1,tw,seed),f1=wr[0],f2=wr[1],id=wr[2];
        if(gi>.01){/* gigante: poucas células enormes, de borda macia (centro quente e claro, descida larga e escura), células médias
             dentro delas e manchas finas; nada de linhas: parece plasma fervendo, como nas simulações de Betelgeuse */
          const wb=worley(X*F1*2.7+wy*2,Y*F1*2.7+wx*2,Z*F1*2.7,tw*1.3,seed+7),big=Math.pow(1-sst(.05,1.05,f1),1.4)*Math.pow(sst(0,.7,f2-f1),.6),
            med=Math.pow(1-sst(.05,.95,wb[0]),1.2)*sst(0,.5,wb[1]-wb[0]),mot=FX.noise(X*F1*7,Y*F1*7,Z*F1*7+Math.sin(tw*.6))*.5+.5;
          const g=.62*big*(.75+.5*id)+.28*med+.1*mot,lg=sst(0,.18,f2-f1);
          lane=lerp(lg,.15+1.25*g,gi);core=lerp(1-.35*sst(.1,.7,f1),1,gi);cb=lerp(.78+.44*id,1,gi)}
        else{lane=sst(0,F1<4?.5:.16,f2-f1);core=1-.35*sst(.1,.7,f1);cb=.78+.44*id}
        fine=F1<5?FX.noise(X*F1*3.2,Y*F1*3.2,Z*F1*3.2+Math.sin(tw*.5))*.18:0}
      let I=Math.max(.42,1-lA*(1-mu)-lB*(1-mu)*(1-mu));I*=(1-ct)+ct*lane*core*cb+fine*ct;
      let Tl=T*(1-Tcool*(1-Math.pow(mu,.6)))*(.93+.09*lane*cb);
      for(const [sl,slo,ss] of sp){const la=Math.asin(clamp(Y,-1,1)),lo=Math.atan2(Z,X),dl=la-sl,dlo=((lo-slo+Math.PI*3)%TAU)-Math.PI,dd=Math.hypot(dl,dlo*Math.cos(sl))/ss;
        if(dd<1.8){const kk=dd<.8?.22+.2*(dd/.8):.55+.45*sst(.8,1.8,dd);I*=kk;Tl*=.8+.2*kk}}
      const c=dc(Tl),k=(j*S+i)*4,ex=o.exposure??1.08;
      d[k]=Math.min(255,c[0]*I*ex);d[k+1]=Math.min(255,c[1]*I*ex);d[k+2]=Math.min(255,c[2]*I*ex);d[k+3]=255*(gi>.01?Math.min(1,(e-rr)*R*.9)*lerp(1,sst(0,.09,e-rr),gi):Math.min(1,(e-rr)*R*.9))}}
    g.putImageData(img,0,0);ctx.save();ctx.globalAlpha*=a;ctx.drawImage(SB,0,0,S,S,x-Rm,y-Rm,2*Rm,2*Rm);
    /* limbo vivo e atmosfera estendida por cima */
    ctx.globalCompositeOperation='lighter';const g2=ctx.createRadialGradient(x,y,R*.86,x,y,R*(1.08+hz*.5));g2.addColorStop(0,rgba(col,0));g2.addColorStop(.45,rgba(col,(.2+hz*.2)*(1-.65*(o.giant||0))));g2.addColorStop(1,rgba(col,0));
    ctx.fillStyle=g2;ctx.beginPath();ctx.arc(x,y,R*(1.1+hz*.5),0,TAU);ctx.fill();
    /* brilho que estoura um pouco no centro (luz, não tinta) */
    const g3=ctx.createRadialGradient(x,y,0,x,y,R);g3.addColorStop(0,rgba([255,255,255],.16*(o.core??1)));g3.addColorStop(.6,rgba(col,.08*(o.core??1)));g3.addColorStop(1,rgba(col,0));ctx.fillStyle=g3;ctx.beginPath();ctx.arc(x,y,R,0,TAU);ctx.fill();ctx.restore();
    if(o.flare)flare(ctx,x,y,R,t,{...o,col});
    if(o.spikes)spikes(ctx,x,y,R,o.spikes*a,col)}
  /* espículas de difração (como numa foto de telescópio) */
  function spikes(ctx,x,y,R,a,col){ctx.save();ctx.globalCompositeOperation='lighter';const L=Math.max(60,R*7);
    for(const [an,k] of [[0,1],[Math.PI/2,1],[Math.PI/4,.35],[-Math.PI/4,.35]]){for(const s of [1,-1]){const dx=Math.cos(an)*s,dy=Math.sin(an)*s,g=ctx.createLinearGradient(x,y,x+dx*L*k,y+dy*L*k);
      g.addColorStop(0,rgba([255,255,255],.75*a*k));g.addColorStop(.25,rgba(col,.35*a*k));g.addColorStop(1,rgba(col,0));ctx.strokeStyle=g;ctx.lineWidth=Math.max(1.5,Math.min(5,R*.08));ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx*L*k,y+dy*L*k);ctx.stroke()}}
    ctx.restore()}
  /* vento das estrelas quentes: filetes radiais que saem e somem */
  function wind(ctx,x,y,R,t,o,col){const n=90,rg=FX.rng(31+(o.seed||0));ctx.lineCap='round';
    for(let i=0;i<n;i++){const an=rg()*TAU,sp=.35+rg()*.5,ph=rg(),L=.25+rg()*.5,q=((t*sp*.4+ph)%1),r0=R*(1.02+q*2.6),r1=r0+R*L*(1+q),al=o.wind*.16*Math.sin(Math.PI*q);
      const g=ctx.createLinearGradient(x+Math.cos(an)*r0,y+Math.sin(an)*r0,x+Math.cos(an)*r1,y+Math.sin(an)*r1);g.addColorStop(0,rgba(col,al));g.addColorStop(1,rgba(col,0));
      ctx.strokeStyle=g;ctx.lineWidth=Math.max(1.5,R*.035);ctx.beginPath();ctx.moveTo(x+Math.cos(an)*r0,y+Math.sin(an)*r0);ctx.lineTo(x+Math.cos(an)*r1,y+Math.sin(an)*r1);ctx.stroke()}}
  /* proeminências: arcos de plasma presos à borda, que sobem e descem; um clarão de vez em quando */
  function flare(ctx,x,y,R,t,o){const col=bb(Math.max(3000,(o.T||3000)*1.15)),rg=FX.rng(77+(o.seed||0)),n=5,f=o.flare;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(let i=0;i<n;i++){const an=rg()*TAU,wd=.12+rg()*.22,P=3+rg()*4,ph=rg()*P,q=((t+ph)%P)/P,h=Math.sin(Math.PI*q)*(.1+rg()*.22);if(h<.02)continue;
      const a0=an-wd,a1=an+wd,p0=[x+Math.cos(a0)*R*.98,y+Math.sin(a0)*R*.98],p1=[x+Math.cos(a1)*R*.98,y+Math.sin(a1)*R*.98],pc=[x+Math.cos(an)*R*(1+h*2.2),y+Math.sin(an)*R*(1+h*2.2)];
      for(const [lw,al,cc] of [[R*.16,.10,[255,80,30]],[R*.08,.22,[255,120,55]],[R*.035,.3,[255,170,100]]]){ctx.strokeStyle=rgba(cc,al*f*Math.sin(Math.PI*q));ctx.lineWidth=Math.max(1,lw);ctx.beginPath();ctx.moveTo(...p0);ctx.quadraticCurveTo(...pc,...p1);ctx.stroke()}}
    /* clarão (flare) na superfície */
    const fp=5.3,fq=((t+1.1)%fp)/fp;if(fq<.18){const k=Math.sin(Math.PI*fq/.18)*f,an=Math.floor((t+1.1)/fp)*2.4+.6,fx=x+Math.cos(an)*R*.55,fy=y+Math.sin(an)*R*.55,g=ctx.createRadialGradient(fx,fy,0,fx,fy,R*.6);
      g.addColorStop(0,`rgba(255,250,240,${.9*k})`);g.addColorStop(.3,`rgba(255,220,190,${.35*k})`);g.addColorStop(1,'rgba(255,200,160,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(fx,fy,R*.6,0,TAU);ctx.fill()}
    ctx.restore()}
  /* ---------- céu ---------- */
  const SKY={};
  function skyInit(seed,n){const rg=FX.rng(seed),L=[];
    for(let l=0;l<3;l++){const arr=[],m=[n*.62,n*.28,n*.1][l]|0;for(let i=0;i<m;i++){const u=rg(),T=u<.72?2800+rg()*1800:u<.9?4500+rg()*2000:u<.97?6500+rg()*4000:10000+rg()*20000;
      const mag=Math.pow(rg(),[9,6,3.2][l]);arr.push({x:rg(),y:rg(),c:bb(T),b:mag*(T>9000?1.4:1),r:[.6,.9,1.3][l]*(.6+mag*1.6),tw:rg()*TAU,tf:.6+rg()*1.8})}L.push(arr)}
    /* nebulosas tênues: fbm colorido num canvas pequeno, ampliado com desfoque */
    const S=200,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d'),im=g.createImageData(S,S),d=im.data;
    for(let j=0;j<S;j++)for(let i=0;i<S;i++){const X=i/S*3,Y=j/S*3,n1=FX.fbm(X+seed,Y,1.7,5),n2=FX.fbm(X*1.6,Y*1.6+seed,4.2,4),k=(j*S+i)*4,
      v1=sst(.05,.55,n1),v2=sst(.1,.6,n2),dark=sst(.15,.5,FX.fbm(X*2.2+9,Y*2.2,7,4));
      d[k]=(70*v1+20*v2)*(1-dark*.7);d[k+1]=(22*v1+45*v2)*(1-dark*.7);d[k+2]=(48*v1+80*v2)*(1-dark*.7);d[k+3]=255}
    g.putImageData(im,0,0);return {L,neb:cv}}
  function sky(ctx,t,o={}){const seed=o.seed||7,n=o.n||1500,key=seed+':'+n;if(!SKY[key])SKY[key]=skyInit(seed,n);const S=SKY[key],a=o.a??1;if(a<=0)return;
    const z=o.zoom||1,ox=o.ox||0,oy=o.oy||0,rot=o.rot||0,cx=W/2,cy=H/2,Sz=Math.max(W,H)*1.5;
    ctx.save();ctx.globalAlpha*=a;
    if(o.neb!==0){ctx.save();ctx.globalAlpha*=(o.neb??1)*.75;ctx.globalCompositeOperation='lighter';ctx.translate(cx,cy);ctx.rotate(rot);ctx.scale(Math.pow(z,.3),Math.pow(z,.3));ctx.filter='blur(6px)';
      const px=((ox*.15)%Sz+Sz)%Sz,py=((oy*.15)%Sz+Sz)%Sz;for(const dx of [-1,0])for(const dy of [-1,0])ctx.drawImage(S.neb,-Sz/2+px+dx*Sz,-Sz/2+py+dy*Sz,Sz,Sz);ctx.filter='none';ctx.restore()}
    ctx.globalCompositeOperation='lighter';
    S.L.forEach((arr,l)=>{const pk=[.25,.5,1][l],zz=Math.pow(z,[.4,.6,.85][l]);
      for(const s of arr){let X=(s.x*Sz+ox*pk)%Sz,Y=(s.y*Sz+oy*pk)%Sz;if(X<0)X+=Sz;if(Y<0)Y+=Sz;X-=Sz/2;Y-=Sz/2;
        const cr=Math.cos(rot),sr=Math.sin(rot),px=cx+(X*cr-Y*sr)*zz,py=cy+(X*sr+Y*cr)*zz;if(px<-20||px>W+20||py<-20||py>H+20)continue;
        const tw=.82+.18*Math.sin(t*s.tf*2.2+s.tw),b=s.b*tw,r=s.r*Math.sqrt(zz);if(b<.03)continue;
        if(b>.45){const gl=ctx.createRadialGradient(px,py,0,px,py,r*7);gl.addColorStop(0,rgba(s.c,.35*b));gl.addColorStop(1,rgba(s.c,0));ctx.fillStyle=gl;ctx.beginPath();ctx.arc(px,py,r*7,0,TAU);ctx.fill()}
        ctx.fillStyle=rgba([Math.min(255,s.c[0]+40),Math.min(255,s.c[1]+40),Math.min(255,s.c[2]+40)],Math.min(1,b*1.2));ctx.beginPath();ctx.arc(px,py,Math.max(.6,r),0,TAU);ctx.fill();
        if(b>.8&&l===2)spikes(ctx,px,py,r*1.2,(b-.8)*1.2,s.c)}});
    ctx.restore()}
  /* ---------- cascas de gás (nebulosa planetária / remanescente), por pixel em baixa resolução ---------- */
  const NB=document.createElement('canvas');
  function shell(ctx,x,y,R,u,o={}){const a=o.a??1;if(a<=0||R<2)return;const kind=o.kind||'pn',seed=o.seed||3,tm=o.t||0,N=o.res||230,E=1.45;
    NB.width=NB.height=N;const g=NB.getContext('2d'),img=g.createImageData(N,N),d=img.data,hot=kind==='snr'?clamp(1-u*2.2):0,w=kind==='pn'?.13:.09;
    for(let j=0;j<N;j++){const vy=((j+.5)/N*2-1)*E;for(let i=0;i<N;i++){const vx=((i+.5)/N*2-1)*E,r=Math.hypot(vx,vy);if(r>E)continue;const an=Math.atan2(vy,vx),cx=Math.cos(an),cy=Math.sin(an);
      /* raio da casca irregular; densidade de coluna de uma casca fina (a borda fica mais clara) */
      const r0=(kind==='pn'?1:.95)+.13*FX.fbm(cx*1.8+seed,cy*1.8,seed*.3+tm*.02,4)+(kind==='pn'?.08*cy*cy:0);
      let col=r<r0?w/Math.sqrt(Math.max(r0*r0-r*r,w*w*.9)):Math.exp(-(((r-r0)/(w*.8))**2));col=Math.min(col,2.2);
      const fil=Math.pow(1-Math.abs(FX.noise(vx*5.5+seed,vy*5.5,seed+tm*.05+u*2)),4),fil2=Math.pow(1-Math.abs(FX.noise(vx*13,vy*13,seed*2+u*3)),6);
      const knot=.55+.9*fil+.6*fil2,inner=r<r0?sst(r0,r0*.55,r)*.35*(.6+.4*FX.fbm(vx*3,vy*3,seed+9,3)):0;
      const D=col*knot*.55,k=(j*N+i)*4;let R_,G_,B_;
      if(kind==='pn'){const red=sst(r0-.08,r0+.06,r);R_=D*(70+185*red)+inner*40;G_=D*(205-140*red)+inner*170;B_=D*(200-120*red)+inner*175}
      else{const red=sst(.2,.8,FX.noise(vx*2.5+seed,vy*2.5,4.4)*.5+.5+(1-hot)*.3);R_=D*lerp(lerp(140,255,red),255,hot)+inner*60;G_=D*lerp(lerp(205,95,red),235,hot)+inner*120;B_=D*lerp(lerp(255,85,red),255,hot)+inner*200}
      d[k]=Math.min(255,R_);d[k+1]=Math.min(255,G_);d[k+2]=Math.min(255,B_);d[k+3]=255}}
    g.putImageData(img,0,0);ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';ctx.imageSmoothingQuality='high';ctx.filter='blur('+Math.max(.5,R/N*1.1).toFixed(1)+'px)';
    ctx.drawImage(NB,x-R*E,y-R*E,2*R*E,2*R*E);ctx.filter='none';ctx.restore()}
  /* ---------- supernova ---------- */
  function supernova(ctx,x,y,R,s,o={}){const a=o.a??1;if(a<=0||s<0)return {flash:0};const sc=o.scale||9;
    const fl=s<.08?s/.08:Math.exp(-(s-.08)*2.6),rs=R*(1+sc*(1-Math.exp(-s*.8)));
    ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';
    /* nuvem quente que esfria */
    const cool=clamp(s/3.5),cA=Math.max(0,1-s*.12),c1=bb(lerp(30000,4500,cool)),c2=bb(lerp(15000,2600,cool));
    const g=ctx.createRadialGradient(x,y,0,x,y,rs*1.1);g.addColorStop(0,rgba(c1,.55*cA));g.addColorStop(.55,rgba(c2,.35*cA));g.addColorStop(.85,`rgba(255,80,70,${.22*cA})`);g.addColorStop(1,'rgba(255,60,60,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rs*1.1,0,TAU);ctx.fill();
    /* raios do clarão */
    if(fl>.02){const rg=FX.rng(5+(o.seed||0));ctx.lineCap='round';for(let i=0;i<60;i++){const an=rg()*TAU,L=(.6+rg()*1.4)*Math.max(W,H)*.6*fl,gg=ctx.createLinearGradient(x,y,x+Math.cos(an)*L,y+Math.sin(an)*L);
      gg.addColorStop(0,`rgba(255,255,255,${.35*fl})`);gg.addColorStop(1,'rgba(200,220,255,0)');ctx.strokeStyle=gg;ctx.lineWidth=2+rg()*6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(an)*L,y+Math.sin(an)*L);ctx.stroke()}
      const g2=ctx.createRadialGradient(x,y,0,x,y,Math.max(W,H)*fl*1.1);g2.addColorStop(0,`rgba(255,255,255,${fl})`);g2.addColorStop(.3,`rgba(220,235,255,${.6*fl})`);g2.addColorStop(1,'rgba(200,220,255,0)');ctx.fillStyle=g2;ctx.fillRect(0,0,W,H)}
    ctx.restore();
    /* frente de choque em filamentos */
    shell(ctx,x,y,rs,clamp(s/6),{kind:'snr',seed:o.seed||4,a:a*clamp(s/.35)*Math.max(.25,1-s*.05),t:s});
    return {flash:fl,rs}}
  /* ---------- estrela de nêutrons (pulsar) ---------- */
  function pulsar(ctx,x,y,R,t,o={}){const a=o.a??1;if(a<=0)return 0;const P=o.period||1.1,ph=t/P*TAU,tilt=o.tilt??.5,ax=-Math.PI/2+.35;
    /* direção do feixe: gira num cone em volta do eixo de rotação */
    const bx=Math.cos(ax)+tilt*Math.cos(ph)*Math.cos(ax+Math.PI/2),by=Math.sin(ax)+tilt*Math.cos(ph)*Math.sin(ax+Math.PI/2),bz=tilt*Math.sin(ph),bl=Math.hypot(bx,by,bz);
    const dir=Math.atan2(by,bx),pulse=Math.pow(Math.max(0,bz/bl),8),L=o.beam||Math.max(W,H)*.7;
    ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';
    /* linhas de campo (dipolo) */
    ctx.strokeStyle='rgba(98,208,234,.18)';ctx.lineWidth=2;for(const k of [2.5,4,6,9]){for(const s of [1,-1]){ctx.beginPath();for(let i=0;i<=40;i++){const th=.15+i/40*(Math.PI-.3),r=R*k*Math.sin(th)**2,an=ax+Math.PI/2*s;
      const px=x+Math.cos(ax)*Math.cos(th)*r+Math.cos(an)*Math.sin(th)*r*0,py=y;const qx=x+r*(Math.cos(th)*Math.cos(ax)+s*Math.sin(th)*Math.cos(ax+Math.PI/2)),qy=y+r*(Math.cos(th)*Math.sin(ax)+s*Math.sin(th)*Math.sin(ax+Math.PI/2));i?ctx.lineTo(qx,qy):ctx.moveTo(qx,qy)}ctx.stroke()}}
    /* feixes */
    for(const s of [1,-1]){const d0=dir+(s<0?Math.PI:0),len=L*(.55+.45*Math.sqrt(1-Math.min(1,Math.abs(bz/bl)))),wdt=.09;
      for(const [k,al] of [[1.8,.10],[1,.28],[.4,.6]]){const g=ctx.createLinearGradient(x,y,x+Math.cos(d0)*len,y+Math.sin(d0)*len);g.addColorStop(0,`rgba(190,230,255,${al})`);g.addColorStop(1,'rgba(120,190,255,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(d0-wdt*k)*len,y+Math.sin(d0-wdt*k)*len);ctx.lineTo(x+Math.cos(d0+wdt*k)*len,y+Math.sin(d0+wdt*k)*len);ctx.closePath();ctx.fill()}}
    /* esfera e clarão do pulso */
    const pr=R*(4+pulse*14),g=ctx.createRadialGradient(x,y,0,x,y,pr);g.addColorStop(0,`rgba(235,245,255,${.9})`);g.addColorStop(.25,`rgba(160,210,255,${.35+.4*pulse})`);g.addColorStop(1,'rgba(120,180,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,pr,0,TAU);ctx.fill();
    ctx.restore();ctx.save();ctx.globalAlpha*=a;const g2=ctx.createRadialGradient(x-R*.3,y-R*.3,0,x,y,R);g2.addColorStop(0,'#ffffff');g2.addColorStop(.6,'#cfe6ff');g2.addColorStop(1,'#7fb2ff');ctx.fillStyle=g2;ctx.beginPath();ctx.arc(x,y,R,0,TAU);ctx.fill();ctx.restore();
    spikes(ctx,x,y,R*1.5,a*(.4+.6*pulse),[180,215,255]);return pulse}
  /* ---------- buraco negro com disco ---------- */
  function hole(ctx,x,y,rs,t,o={}){const a=o.a??1;if(a<=0||rs<.5)return;const tilt=o.tilt??.22,R0=rs*2.6,R1=rs*(o.disk||7.5),rot=t*.6;
    const ring=(half)=>{ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';ctx.translate(x,y);ctx.scale(1,tilt);
      ctx.beginPath();ctx.rect(-R1*1.2,half<0?-R1*1.2:0,R1*2.4,R1*1.2);ctx.clip();
      for(let k=0;k<70;k++){const rr=lerp(R0,R1,Math.pow(k/70,1.3)),hot=1-k/70,col=bb(lerp(2500,9000,hot*hot));
        for(let s=0;s<36;s++){const an=s/36*TAU+rot*(R0/rr)*2+k*.37,an2=an+TAU/36*1.05,dop=1+.75*Math.cos(an+.3),tur=.55+.45*FX.noise(Math.cos(an)*3+k*.2,Math.sin(an)*3,t*.4+k*.05);
          ctx.strokeStyle=rgba(col,Math.min(1,.16*dop*tur*(1-Math.pow(k/70,2))));ctx.lineWidth=(R1-R0)/70*1.8;ctx.beginPath();ctx.arc(0,0,rr,an,an2);ctx.stroke()}}
      ctx.restore()};
    ring(-1);if(typeof BH!=='undefined')BH.lens(ctx,x,y,rs,{a,rE:rs*3.4});ring(1);
    ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(255,226,180,.85)';ctx.lineWidth=Math.max(1.2,rs*.06);ctx.shadowColor='#ffcf80';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(x,y,rs*2.62,0,TAU);ctx.stroke();ctx.restore()}
  /* ---------- HUD: régua de massa e linha do tempo ---------- */
  function slider(ctx,x,y0,y1,m,o={}){const a=o.a??1;if(a<=0)return;const lo=o.lo||.08,hi=o.hi||40,Y=v=>lerp(y0,y1,Math.log(v/lo)/Math.log(hi/lo)),col=bb(ms(m).T);
    ctx.save();ctx.globalAlpha*=a;
    const g=ctx.createLinearGradient(0,y0,0,y1);for(const v of [.08,.3,1,3,10,40])g.addColorStop(clamp((Y(v)-y0)/(y1-y0)),rgba(bb(ms(v).T),.85));ctx.strokeStyle=g;ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y1);ctx.stroke();
    for(const [v,lab] of (o.marks||[[.1,'0,1'],[1,'1'],[10,'10'],[20,'20']])){const yy=Y(v);ctx.fillStyle='rgba(236,230,214,.6)';ctx.fillRect(x-14,yy-1.5,28,3);txt(ctx,lab,x+26,yy+10,{font:F.mono,size:28,color:'rgba(236,230,214,.7)',align:'left'})}
    txt(ctx,'MASSA',x,y1-34,{font:F.mono,size:24,ls:4,color:'rgba(236,230,214,.65)'});txt(ctx,'(sóis)',x,y1-8,{font:F.mono,size:20,color:'rgba(236,230,214,.45)'});
    const yy=Y(m);ctx.shadowColor=rgba(col,1);ctx.shadowBlur=24;ctx.fillStyle=rgba(col,1);ctx.beginPath();ctx.arc(x,yy,17,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,yy,17,0,TAU);ctx.stroke();
    ctx.restore()}
  function lifebar(ctx,box,o={}){const [bx,by,bw,bh]=box,a=o.a??1,lo=o.lo||1e6,hi=o.hi||1e13,X=v=>bx+bw*clamp(Math.log(v/lo)/Math.log(hi/lo),-.2,1.2);if(a<=0)return X;
    ctx.save();ctx.globalAlpha*=a;
    ctx.strokeStyle='rgba(236,230,214,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx,by+bh+10);ctx.lineTo(bx+bw,by+bh+10);ctx.stroke();
    for(const [v,lab] of [[1e6,'1 mi'],[1e9,'1 bi'],[1e12,'1 tri']]){const xx=X(v);ctx.fillStyle='rgba(236,230,214,.5)';ctx.fillRect(xx-1.5,by+bh+2,3,16);txt(ctx,lab,xx,by+bh+50,{font:F.mono,size:26,color:'rgba(236,230,214,.6)'})}
    for(let e=7;e<13;e++)if(e!==9&&e!==12){const xx=X(Math.pow(10,e));ctx.fillStyle='rgba(236,230,214,.25)';ctx.fillRect(xx-1,by+bh+5,2,9)}
    (o.bars||[]).forEach((b,i)=>{const n=(o.bars.length),h=bh/n-6,yy=by+i*(bh/n),x1=X(lo*Math.pow(b.years/lo,clamp(b.fill??1)));const col=b.col||[244,183,64];
      const g=ctx.createLinearGradient(bx,0,x1,0);g.addColorStop(0,rgba(col,.25));g.addColorStop(1,rgba(col,.95));ctx.fillStyle=g;ctx.shadowColor=rgba(col,.9);ctx.shadowBlur=14;
      ctx.beginPath();ctx.roundRect?ctx.roundRect(bx,yy,Math.max(2,x1-bx),h,h/2):ctx.rect(bx,yy,Math.max(2,x1-bx),h);ctx.fill();ctx.shadowBlur=0;
      if(b.label){const ins=x1>bx+bw-230;txt(ctx,b.label,ins?x1-16:x1+14,yy+h*.5+9,{font:F.mono,size:26,weight:ins?600:400,color:ins?'#1a0c06':rgba(col,1),align:ins?'right':'left',a:b.la??1})}});
    for(const mk of (o.marks||[])){const xx=X(mk.years),c=mk.col||'#ece6d6';ctx.globalAlpha=a*(mk.a??1);ctx.strokeStyle=c;ctx.lineWidth=3;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(xx,by-30);ctx.lineTo(xx,by+bh+12);ctx.stroke();ctx.setLineDash([]);
      if(mk.label)txt(ctx,mk.label,xx,by-44,{font:F.mono,size:26,ls:2,color:c,align:mk.align||'center'})}
    ctx.restore();return X}
  return {bb,dc,ms,fmtY,draw,spikes,flare,sky,shell,supernova,pulsar,hole,slider,lifebar,rgba}
})();
