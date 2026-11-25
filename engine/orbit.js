/* ---------- ORB: órbitas keplerianas dos 8 planetas + gráfico de altura do som (v3.22, 2026-11-08) — exemplo projetos/orbitas-som/ ----------
   Mesma tabela e mesmas fórmulas de tools/orbsom.py (o som), para a imagem bater com o áudio quadro a quadro.
   Elementos J2000 (JPL, Approximate Positions of the Planets): a (UA), e, ϖ (long. do periélio), L0 (long. média).
   Tempo comprimido: o planeta i dá N[i] voltas em ORB.CICLO s (Mercúrio 36 … Netuno 3; v2: ×3), por isso tudo fecha em loop.
   Distâncias comprimidas em log (ORB.Rv), sem mudar a excentricidade: cada elipse é a real, só escalada.
   meta.json: "orbit": true
   ORB.st(i,T)            {pos:[x,0,z] na tela 3D, r (UA), nu, om, ds (semitons em relação à nota-base)}
   ORB.ellipse(ctx,c,i,{col,a,lw,glow,n})   a elipse da órbita (visual) no plano y=0
   ORB.graph(ctx,{x,y,w,h},T,{win,rng,al:[8],sel,lw})   altura do som × tempo (janela que corre; marcador no instante atual)
   ORB.P[i] = {k,n,a,e,w,L0,N,per,col,r}   k = chave do PL (mapas reais), n = NOME, per = período real em texto, r = raio visual */
const ORB=(()=>{
  const CICLO=36,D2R=Math.PI/180;
  const P=[['mercurio','MERCÚRIO',0.38710,0.20563, 77.456,252.251,36,'88 DIAS',  '#c9c2b8',.13],
           ['venus',   'VÊNUS',   0.72333,0.00677,131.533,181.980,24,'225 DIAS', '#f1d39a',.21],
           ['terra',   'TERRA',   1.00000,0.01671,102.937,100.464,18,'365 DIAS', '#5fa8ff',.22],
           ['marte',   'MARTE',   1.52368,0.09340,336.041,355.453,15,'687 DIAS', '#ff7a4d',.16],
           ['jupiter', 'JÚPITER', 5.20260,0.04849, 14.753, 34.404,12,'11,9 ANOS','#e8b77a',.46],
           ['saturno', 'SATURNO', 9.55491,0.05551, 92.432, 49.944, 9,'29,4 ANOS','#e9d08f',.36],
           ['urano',   'URANO',  19.21845,0.04630,170.964,313.232, 6,'84 ANOS',  '#8fe3e0',.29],
           ['netuno',  'NETUNO', 30.11039,0.00899, 44.971,304.880, 3,'165 ANOS', '#4f7dff',.28]]
    .map(([k,n,a,e,w,L0,N,per,col,r])=>({k,n,a,e,w,L0,N,per,col,r}));
  const K=2.0,Rv=a=>K*Math.log(a/.25);   /* Mercúrio 0,88 · Terra 2,8 · Júpiter 6,0 · Netuno 9,6 (unidades da cena) */
  const KN=[4,6,8,6,6,8,12,12];P.forEach((p,i)=>{p.s=Rv(p.a)/p.a;p.kn=KN[i]});
  function kep(M,e){let E=M;for(let k=0;k<12;k++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return E}
  function st(i,T){const p=P[i],n=2*Math.PI*p.N/CICLO,M0=(p.L0-p.w)*D2R;let M=(M0+n*T)%(2*Math.PI);if(M<0)M+=2*Math.PI;
    const E=kep(M,p.e),nu=2*Math.atan2(Math.sqrt(1+p.e)*Math.sin(E/2),Math.sqrt(1-p.e)*Math.cos(E/2)),r=p.a*(1-p.e*Math.cos(E)),
      om=n*Math.pow(1+p.e*Math.cos(nu),2)/Math.pow(1-p.e*p.e,1.5),ds=12*Math.log2(om/(n/Math.sqrt(1-p.e*p.e))),lon=nu+p.w*D2R,rv=r*p.s;
    return {pos:[rv*Math.cos(lon),0,-rv*Math.sin(lon)],r,nu,om,ds,lon}}
  function ellipse(ctx,c,i,o={}){const p=P[i],a=p.a*p.s,b=a*Math.sqrt(1-p.e*p.e),w=p.w*D2R,n=o.n||160;ctx.save();ctx.globalAlpha*=o.a??.4;ctx.strokeStyle=o.col||p.col;ctx.lineWidth=o.lw??2;
    if(o.glow){ctx.shadowColor=o.col||p.col;ctx.shadowBlur=o.glow}ctx.beginPath();let pen=false;
    for(let k=0;k<=n;k++){const E=k/n*2*Math.PI,x0=a*(Math.cos(E)-p.e),y0=b*Math.sin(E),x=x0*Math.cos(w)-y0*Math.sin(w),y=x0*Math.sin(w)+y0*Math.cos(w),q=c.P([x,0,-y]);
      if(!isFinite(q[0])){pen=false;continue}pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}ctx.stroke();ctx.restore()}
  /* gráfico: eixo vertical FIXO (rng semitons para cima e para baixo), janela de win s que corre; al[i] = opacidade de cada curva, sel = curva em destaque */
  function graph(ctx,b,T,o={}){const win=o.win??6,rng=o.rng??8,A=o.a??1;if(A<=0)return;const x1=b.x+b.w-70,x0=b.x+20,y0=b.y+b.h/2,ky=(b.h/2-14)/rng,kx=(x1-x0)/win;
    ctx.save();ctx.globalAlpha*=A;
    const g=ctx.createLinearGradient(0,b.y,0,b.y+b.h);g.addColorStop(0,'rgba(6,9,16,.78)');g.addColorStop(1,'rgba(6,9,16,.88)');ctx.fillStyle=g;ctx.strokeStyle='rgba(140,160,200,.22)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,18);ctx.fill();ctx.stroke();
    /* grade: 0 e ±2, ±4, ±6 semitons; tempo a cada 1 s correndo junto */
    ctx.save();ctx.beginPath();ctx.rect(b.x+4,b.y+4,b.w-8,b.h-8);ctx.clip();
    for(let s=-6;s<=6;s+=2){ctx.strokeStyle=s===0?'rgba(170,190,230,.35)':'rgba(140,160,200,.10)';ctx.lineWidth=s===0?1.6:1;ctx.beginPath();ctx.moveTo(x0,y0-s*ky);ctx.lineTo(b.x+b.w-12,y0-s*ky);ctx.stroke()}
    for(let k=Math.ceil(T-win);k<=T;k++){const x=x1-(T-k)*kx;ctx.strokeStyle='rgba(140,160,200,.08)';ctx.beginPath();ctx.moveTo(x,b.y+8);ctx.lineTo(x,b.y+b.h-8);ctx.stroke()}
    const ord=P.map((_,i)=>i).filter(i=>(o.al?.[i]??0)>.01).sort((a,c)=>(a===o.sel)-(c===o.sel));
    for(const i of ord){const al=o.al[i],hot=i===o.sel,n=Math.round(win*60);ctx.strokeStyle=P[i].col;ctx.lineWidth=hot?(o.lw??5):2.4;ctx.globalAlpha=A*al;if(hot){ctx.shadowColor=P[i].col;ctx.shadowBlur=14}else ctx.shadowBlur=0;
      ctx.beginPath();for(let k=0;k<=n;k++){const t=T-win+k/n*win,y=y0-clamp(st(i,t).ds,-rng,rng)*ky,x=x1-(T-t)*kx;k?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
      /* ponto no instante atual */const yy=y0-clamp(st(i,T).ds,-rng,rng)*ky;ctx.fillStyle=P[i].col;ctx.beginPath();ctx.arc(x1,yy,hot?9:5,0,TAU);ctx.fill()}
    ctx.restore();ctx.globalAlpha=A;
    /* marcador do agora + rótulos fixos do eixo */ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(x1,b.y+10);ctx.lineTo(x1,b.y+b.h-10);ctx.stroke();ctx.setLineDash([]);
    [[6,'+6'],[0,'0'],[-6,'−6']].forEach(([s,l])=>txt(ctx,l,b.x+b.w-18,y0-s*ky+9,{font:F.mono,size:24,color:'rgba(170,185,215,.7)',align:'right'}));
    ctx.restore()}
  /* nota: ν cruzando múltiplos de 360°/k (contado do periélio); devolve segundos desde a última nota */
  function nuU(i,T){const p=P[i],n=2*Math.PI*p.N/CICLO,Mu=(p.L0-p.w)*D2R+n*T,k=Math.floor(Mu/(2*Math.PI));let nu=st(i,T).nu;nu=((nu%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
    const Mm=Mu-k*2*Math.PI;if(Mm<.5&&nu>5)nu-=2*Math.PI;if(Mm>5.7&&nu<1)nu+=2*Math.PI;return nu+k*2*Math.PI}
  function since(i,T){const k=P[i].kn,idx=t=>Math.floor(nuU(i,t)/(2*Math.PI/k)+1e-9),i0=idx(T);let lo=T-.6,hi=T;if(idx(lo)===i0)return .6;
    for(let j=0;j<18;j++){const m=(lo+hi)/2;if(idx(m)===i0)hi=m;else lo=m}return T-hi}
  /* céu: estrelas numa esfera grande, cores reais (azuladas a alaranjadas), cintilação leve */
  let SS=null;function stars(ctx,c,T,o={}){if(!SS){const R=FX.rng(77);SS=[];for(let k=0;k<9000;k++){const u=R()*2-1,th=R()*2*Math.PI,r=Math.sqrt(1-u*u),m=Math.pow(R(),2.6);
      const tc=R();SS.push({p:[r*Math.cos(th)*600,u*600,r*Math.sin(th)*600],m,col:tc<.15?[170,200,255]:tc<.8?[255,250,240]:[255,215,170],ph:R()*6.28})}
}
    ctx.save();ctx.globalCompositeOperation='lighter';const A=o.a??1;
    ctx.shadowBlur=0;
    for(const s of SS){const q=c.P([c.eye[0]+s.p[0],c.eye[1]+s.p[1],c.eye[2]+s.p[2]]);if(!isFinite(q[0])||q[0]<-5||q[0]>W+5||q[1]<-5||q[1]>H+5)continue;
      const tw=.8+.2*Math.sin(s.ph+T*TAU*(1+s.m)/CICLO*12),a=A*(.25+.75*s.m)*tw,r=.6+2.4*s.m;ctx.fillStyle=`rgba(${s.col[0]},${s.col[1]},${s.col[2]},${a})`;
      if(s.m>.55){ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8}else ctx.shadowBlur=0;ctx.beginPath();ctx.arc(q[0],q[1],r,0,TAU);ctx.fill()}
    ctx.restore()}
  /* cinturão de asteroides (2,1–3,3 UA), cada pedra com voltas inteiras no ciclo (fecha o loop) */
  let BL=null;function belt(ctx,c,T,o={}){if(!BL){const R=FX.rng(9);BL=[];for(let k=0;k<2200;k++){const a=2.1+1.2*Math.pow(R(),.8),N=Math.round(18*Math.pow(1/a,1.5)*1.9);BL.push({rv:Rv(a)*(1+(R()-.5)*.03),N:Math.max(9,N),th:R()*TAU,y:(R()-.5)*.12,s:.4+R()*1.4,g:150+R()*80})}}
    ctx.save();const A=o.a??1;for(const b of BL){const th=b.th+TAU*b.N*T/CICLO,q=c.P([b.rv*Math.cos(th),b.y,-b.rv*Math.sin(th)]);if(!isFinite(q[0]))continue;
      const r=Math.max(.6,c.f*.012*b.s/q[2]);ctx.fillStyle=`rgba(${b.g|0},${(b.g*.92)|0},${(b.g*.82)|0},${A*.75})`;ctx.fillRect(q[0]-r/2,q[1]-r/2,r,r)}ctx.restore()}
  /* reflexo de lente do Sol: riscos horizontais e fantasmas na linha Sol → centro da tela */
  function flare(ctx,q,R,o={}){if(!q||!isFinite(q[0]))return;const A=o.a??1;ctx.save();ctx.globalCompositeOperation='lighter';
    const L=Math.min(W*.42,R*9+90),g=ctx.createLinearGradient(q[0]-L,0,q[0]+L,0);g.addColorStop(0,'rgba(255,200,120,0)');g.addColorStop(.5,`rgba(255,230,190,${.35*A})`);g.addColorStop(1,'rgba(255,200,120,0)');
    ctx.fillStyle=g;ctx.fillRect(q[0]-L,q[1]-Math.max(1.5,R*.08),2*L,Math.max(3,R*.16));
    const dx=W/2-q[0],dy=H*.45-q[1];[[.5,.10,'120,170,255'],[.9,.06,'255,190,120'],[1.4,.16,'140,255,210'],[1.8,.05,'255,160,200']].forEach(([k,rr,col])=>{const x=q[0]+dx*k,y=q[1]+dy*k,r=Math.max(10,R*rr*6);
      const gg=ctx.createRadialGradient(x,y,0,x,y,r);gg.addColorStop(0,`rgba(${col},${.10*A})`);gg.addColorStop(.7,`rgba(${col},${.05*A})`);gg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()});ctx.restore()}
  /* Via Láctea em tela: textura 2400² gerada uma vez (estrelas densas + nuvens + poeira escura), girada com a câmera */
  let MWT=null;function milky(ctx,ang,o={}){if(!MWT){const S=2400,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d'),R=FX.rng(31);
      const by=x=>S/2+Math.sin(x/S*TAU*.7+.8)*S*.06;
      for(let k=0;k<700;k++){const x=R()*S,y=by(x)+(R()+R()+R()-1.5)*S*.07,r=40+R()*160,dk=.5+.5*FX.noise(x/300,y/300,3),col=R()<.55?'150,165,230':'235,200,170';
        const gg=g.createRadialGradient(x,y,0,x,y,r);gg.addColorStop(0,`rgba(${col},${.07*dk})`);gg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gg;g.fillRect(x-r,y-r,2*r,2*r)}
      for(let k=0;k<60000;k++){const x=R()*S,y=by(x)+(R()+R()+R()+R()-2)*S*.06,m=Math.pow(R(),3);g.fillStyle=R()<.3?`rgba(205,215,255,${.25+.6*m})`:`rgba(255,240,225,${.25+.6*m})`;const r=.6+1.4*m;g.fillRect(x,y,r,r)}
      g.globalCompositeOperation='destination-out';for(let k=0;k<260;k++){const x=R()*S,y=by(x)+(R()-.5)*S*.05,r=20+R()*70,gg=g.createRadialGradient(x,y,0,x,y,r);gg.addColorStop(0,`rgba(0,0,0,${.35*R()})`);gg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gg;g.fillRect(x-r,y-r,2*r,2*r)}
      MWT=cv}
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=o.a??1;ctx.translate(W/2,H*.4);ctx.rotate(ang);ctx.scale(1.5,1.5);ctx.drawImage(MWT,-1200,-1200);ctx.restore()}
  return {P,st,ellipse,graph,Rv,CICLO,since,stars,belt,flare,milky}})();
