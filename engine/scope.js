/* ---------- SCOPE: telescópio 3D, visão pela ocular, fases da Lua com terminador correto e céu estrelado com cintilação ----------
   Exemplo: projetos/fases-lua/ ("Por que a Lua tem 4 FASES?"). Unidades do telescópio em metros, mesma câmera do W3D/COS
   (para casar com o RIO3D use COS.lookCam(eye,alvo,{fov:graus*π/180}): mesma projeção vertical).
   SCOPE.draw(ctx,c,{pos,dir,sun,amb,a,s})  refrator de 102 mm num tripé: pos = ponto no chão, dir = para onde o tubo aponta
       (vetor no mundo; o tubo gira em azimute e altura, o tripé fica no chão); tubo branco com anéis dourados, para-sol, lente,
       buscadora, focalizador e ocular; sombra de contato na areia. Devolve {eye:[posição da lente da ocular], back:[eixo saindo da ocular]}.
   SCOPE.eyepiece(pos,dir,s)  a mesma ocular sem desenhar (para a câmera mergulhar nela)
   SCOPE.moon(ctx,x,y,R,{sun,earth,pa,rim,glow,a,bump})  disco da Lua (mapa NASA LROC) com fase física: sun = direção do Sol na
       vista ([x direita, y cima, z para quem olha]); fotometria Lommel–Seeliger (cheia "chapada" como a real), terminador nítido com
       relevo das crateras (bump), luz cinzenta da Terra no lado escuro (earth 0..1), pa = giro do disco (rad), rim = contorno dourado
       só na borda acesa, glow = halo proporcional à parte acesa. Devolve a fração acesa vista.
   SCOPE.sunView(elong,{south})  direção do Sol na vista de quem olha a Lua da Terra para a elongação (0 nova, π cheia);
       south = true: hemisfério sul (crescente acesa à esquerda, como no Brasil)
   SCOPE.phase(idade)  {e (elongação), f (fração acesa), q (nome do calendário: NOVA, CRESCENTE, CHEIA, MINGUANTE, cada um 1/4
       do ciclo a partir do seu dia), n8 (nome fino)}; SCOPE.SYN = 29,530589 dias, SCOPE.Q = [0, 7,38, 14,77, 22,15]
   SCOPE.ocular(ctx,{x,y,r,a,blur})  máscara da ocular: tudo fora do círculo do campo fica preto, borda difusa, franja de cor e
       reflexo interno leve; desenhe a vista primeiro e chame depois
   SCOPE.stars(ctx,c,{t,a,horizon,seed,n,avoid:[x,y,r]})  estrelas que cintilam (brilho e cor tremem mais perto do horizonte;
       horizon:true esconde abaixo de 0° e apaga perto dele); camada por cima do COS.sky
   SCOPE.halfRim(ctx,q,R,ang,{a,w})  arco dourado na metade acesa de uma Lua vista de fora (ang = ângulo do Sol na tela)
   SCOPE.cone(ctx,c,E,R,toSun,len,{a,tip})  cone de sombra (umbra) de um planeta de raio R em E, apontando para longe do Sol */
const SCOPE=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  const SYN=29.530589,Q=[0,SYN/4,SYN/2,SYN*3/4];
  /* ---------- telescópio ---------- */
  const HEAD=1.12;  /* altura do eixo de altura acima do chão */
  function frameOf(dir){const d=nrm(dir),r=nrm(crs(d,[0,1,0])),u=crs(r,d);return {d,r,u}}
  function build(pos,dir,s){const F=frameOf(dir),H0=add(pos,[0,HEAD*s,0]);
    const O=(x,y,z)=>add(H0,add(add(mul(F.r,x*s),mul(F.u,y*s)),mul(F.d,z*s)));  /* coordenadas do tubo: z ao longo do tubo */
    const yaw=Math.atan2(F.d[0],F.d[2]),Rx=[Math.cos(yaw),0,-Math.sin(yaw)],Rz=[Math.sin(yaw),0,Math.cos(yaw)];
    const G=(x,y,z)=>add(pos,add(add(mul(Rx,x*s),[0,y*s,0]),mul(Rz,z*s)));  /* coordenadas da montagem (gira só em azimute) */
    return MESH.make(b=>{const CY=(p0,p1,r,n,m)=>b.cyl(p0,p1,r*s,n,m);b.mat('tubo',{c:[232,232,226],sp:.9,pw:50});b.mat('ouro',{c:[244,183,64],sp:1.2,pw:40});b.mat('preto',{c:[26,27,32],sp:.35,pw:30});
      b.mat('vidro',{c:[30,52,70],sp:1.6,pw:90,emit:.15});b.mat('aluminio',{c:[170,172,178],sp:.8,pw:30});b.mat('borracha',{c:[16,16,18],sp:.1});b.mat('cinza',{c:[70,72,80],sp:.4});
      const cyl=(z0,z1,r,m,n=24,y=0,x=0)=>CY(O(x,y,z0),O(x,y,z1),r,n,m);
      cyl(-.42,.5,.058,'tubo',28);cyl(.5,.74,.066,'preto',28);for(const z of [-.42,.12,.46])cyl(z-.012,z+.012,.061,'ouro',28);
      CY(O(0,0,.735),O(0,0,.741),.06,28,'vidro');           /* objetiva lá no fundo do para-sol */
      cyl(-.5,-.42,.045,'preto',20);cyl(-.6,-.5,.03,'aluminio',16);cyl(-.64,-.6,.022,'ouro',16);cyl(-.7,-.64,.021,'borracha',16);
      CY(O(0,0,-.701),O(0,0,-.703),.016,16,'vidro');        /* lente da ocular */
      b.box(O(.04,-.035,-.47),[.03*s,.02*s,.03*s],'cinza');      /* botão de foco */
      cyl(-.2,.16,.016,'preto',12,.105);cyl(.16,.22,.022,'preto',12,.105);CY(O(0,.075,-.1),O(0,.105,-.1),.006,6,'aluminio');CY(O(0,.075,.08),O(0,.105,.08),.006,6,'aluminio');
      for(const z of [-.18,.22]){b.box(O(0,-.07,z),[.03*s,.03*s,.05*s],'preto')}b.box(O(0,-.09,.02),[.05*s,.018*s,.5*s],'aluminio');  /* anéis e trilho */
      /* cabeça da montagem e tripé */
      b.box(G(0,HEAD-.13,0),[.13*s,.14*s,.13*s],'preto');CY(G(0,HEAD-.06,0),G(0,HEAD-.2,0),.05,16,'cinza');CY(G(-.075,HEAD,0),G(.075,HEAD,0),.03,14,'ouro');
      for(let k=0;k<3;k++){const a=k/3*TAU+.4,top=G(Math.cos(a)*.06,HEAD-.22,Math.sin(a)*.06),mid=G(Math.cos(a)*.3,.5,Math.sin(a)*.3),foot=G(Math.cos(a)*.52,0,Math.sin(a)*.52);
        CY(top,mid,.02,8,'aluminio');CY(mid,foot,.015,8,'cinza');CY(foot,add(foot,[0,.04*s,0]),.024,8,'borracha')}
      CY(G(0,.62,0),G(0,.6,0),.16,6,'preto');                  /* bandeja de acessórios */
      for(let k=0;k<3;k++){const a=k/3*TAU+.4;b.line(G(0,.61,0),G(Math.cos(a)*.27,.55,Math.sin(a)*.27),.008,'#3a3c44')}})}
  function eyepiece(pos,dir,s=1){const F=frameOf(dir),H0=add(pos,[0,HEAD*s,0]);return {eye:add(H0,mul(F.d,-.703*s)),back:mul(F.d,-1),up:F.u,right:F.r,head:H0}}
  function draw(ctx,c,o={}){const s=o.s??1,pos=o.pos||[0,0,0],dir=o.dir||[0,.3,1],a=o.a??1;if(a<=0)return eyepiece(pos,dir,s);
    /* sombra de contato na areia */
    const q=c.P(pos),q2=c.P(add(pos,[.6*s,0,0]));if(isFinite(q[0])&&isFinite(q2[0])&&q[2]>0){const rr=Math.hypot(q2[0]-q[0],q2[1]-q[1]);ctx.save();ctx.globalAlpha=a*.55;ctx.translate(q[0],q[1]);ctx.scale(1,.32);
      const g=ctx.createRadialGradient(0,0,0,0,0,rr*1.1);g.addColorStop(0,'rgba(0,0,0,.7)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rr*1.1,0,TAU);ctx.fill();ctx.restore()}
    MESH.draw(ctx,c,build(pos,dir,s),{sun:o.sun||[-.4,.5,.6],amb:o.amb??.22,a});return eyepiece(pos,dir,s)}
  /* ---------- Lua com fase ---------- */
  let TXL=null;const cv=document.createElement('canvas'),g2=cv.getContext('2d');
  function tex(){if(TXL)return TXL;const im=FX.IMG&&FX.IMG['geo:lua.jpg'];if(!im)return null;const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);
    const d=g.getImageData(0,0,c.width,c.height).data,w=c.width,h=c.height,L=new Float32Array(w*h),Cc=new Float32Array(w*h*3);
    for(let i=0;i<w*h;i++){const r=Math.pow(d[i*4]/255,2.2),gg=Math.pow(d[i*4+1]/255,2.2),bb=Math.pow(d[i*4+2]/255,2.2);Cc[i*3]=r;Cc[i*3+1]=gg;Cc[i*3+2]=bb;L[i]=.3*r+.59*gg+.11*bb}
    return TXL={w,h,L,C:Cc}}
  function sunView(e,o={}){const sx=(o.south?-1:1)*Math.sin(e);return nrm([sx,o.tilt||0,-Math.cos(e)])}
  function phase(age){const A=((age%SYN)+SYN)%SYN,e=A/SYN*TAU,f=(1-Math.cos(e))/2;const qi=Math.floor(A/(SYN/4))%4;
    const n8=A<1||A>SYN-1?'NOVA':A<Q[1]-1?'CRESCENTE':A<Q[1]+1?'QUARTO CRESCENTE':A<Q[2]-1?'CRESCENTE GIBOSA':A<Q[2]+1?'CHEIA':A<Q[3]-1?'MINGUANTE GIBOSA':A<Q[3]+1?'QUARTO MINGUANTE':'MINGUANTE';
    return {A,e,f,q:['NOVA','CRESCENTE','CHEIA','MINGUANTE'][qi],qi,n8}}
  function moon(ctx,x,y,R,o={}){const a=o.a??1;if(a<=0||R<1)return 0;const T=tex(),L=nrm(o.sun||[0,0,1]),es=(o.earth??.6)*.055,pa=o.pa||0,cp=Math.cos(pa),sp=Math.sin(pa),bk=o.bump??1;
    const Rr=Math.max(2,Math.min(o.maxR||760,Math.round(R))),S=2*Rr+2;if(cv.width<S||cv.height<S){cv.width=cv.height=Math.max(S,cv.width)}g2.clearRect(0,0,cv.width,cv.height);
    const img=g2.createImageData(S,S),out=img.data,tw=T?T.w:0,th=T?T.h:0,du=1/(tw||1024),lx=L[0]*cp+L[1]*sp,ly=-L[0]*sp+L[1]*cp,lz=L[2];  /* Sol no referencial do disco girado */
    const lh=Math.hypot(lx,ly)||1,dx=lx/lh,dy=ly/lh;let lit=0,tot=0;
    for(let py=0;py<S;py++){const yy=-(py-Rr-.5)/Rr;for(let px=0;px<S;px++){const xx=(px-Rr-.5)/Rr,r2=xx*xx+yy*yy;if(r2>1)continue;const z=Math.sqrt(1-r2);
      const lat=Math.asin(yy),lon=Math.atan2(xx,z);let u=.5+lon/TAU,v=.5-lat/Math.PI,cr=.13,cg=.13,cb=.13,lm=.13,gx=0;
      if(T){const fx=u*tw-.5,fy=Math.max(0,Math.min(th-1.001,v*th-.5)),x0=Math.floor(fx),y0=fy|0,ax=fx-x0,ay=fy-y0,X0=((x0%tw)+tw)%tw,X1=(X0+1)%tw,r0=y0*tw,r1=Math.min(th-1,y0+1)*tw,
          w00=(1-ax)*(1-ay),w01=ax*(1-ay),w10=(1-ax)*ay,w11=ax*ay,i00=r0+X0,i01=r0+X1,i10=r1+X0,i11=r1+X1,C=T.C;
        cr=C[i00*3]*w00+C[i01*3]*w01+C[i10*3]*w10+C[i11*3]*w11;cg=C[i00*3+1]*w00+C[i01*3+1]*w01+C[i10*3+1]*w10+C[i11*3+1]*w11;cb=C[i00*3+2]*w00+C[i01*3+2]*w01+C[i10*3+2]*w10+C[i11*3+2]*w11;
        /* relevo: derivada do brilho do mapa na direção do Sol (as crateras ganham sombra junto do terminador) */
        const sx=Math.max(1,Math.round(2*tw/(TAU*Rr))),Xa=((X0+sx*Math.sign(dx||1))%tw+tw)%tw,Xb=((X0-sx*Math.sign(dx||1))%tw+tw)%tw,ya=Math.max(0,Math.min(th-1,y0-sx*Math.sign(dy||1))),yb=Math.max(0,Math.min(th-1,y0+sx*Math.sign(dy||1)));
        gx=(T.L[r0+Xa]-T.L[r0+Xb])*Math.abs(dx)+(T.L[ya*tw+X0]-T.L[yb*tw+X0])*Math.abs(dy)}
      const n0=xx*lx+yy*ly+z*lz,ld=n0+gx*bk*.5*Math.exp(-n0*n0/.03);  /* relevo só perto do terminador */
      const day=clamp((ld+.012)/.03),ls=Math.max(0,ld)/(Math.max(0,ld)+z+.02)*2.0,k=day*ls,e2=es*(1-day)*(.7+.3*z);
      const R2=cr*(k*1.55)+cr*e2*.9,G2=cg*(k*1.55)+cg*e2,B2=cb*(k*1.55)+cb*e2*1.25,i=(py*S+px)*4;
      out[i]=255*Math.pow(Math.min(1,R2),1/2.2);out[i+1]=255*Math.pow(Math.min(1,G2),1/2.2);out[i+2]=255*Math.pow(Math.min(1,B2),1/2.2);out[i+3]=255*Math.min(1,(1-Math.sqrt(r2))*Rr*1.5);
      tot+=z;lit+=z*day}}
    g2.putImageData(img,0,0);const fr=tot?lit/tot:0;ctx.save();ctx.globalAlpha*=a;
    if((o.glow??1)>0&&fr>.01){ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(x,y,R*.9,x,y,R*1.9);gr.addColorStop(0,`rgba(200,214,240,${.16*(o.glow??1)*Math.sqrt(fr)})`);gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,R*1.9,0,TAU);ctx.fill();ctx.globalCompositeOperation='source-over'}
    ctx.translate(x,y);ctx.rotate(-pa);ctx.drawImage(cv,0,0,S,S,-R*S/(2*Rr),-R*S/(2*Rr),R*S/Rr,R*S/Rr);
    if(o.rim>0){const an=Math.atan2(-ly,lx);ctx.globalAlpha*=o.rim;ctx.strokeStyle=C.gold;ctx.lineWidth=o.rimW||5;ctx.shadowColor=C.gold;ctx.shadowBlur=16;ctx.beginPath();ctx.arc(0,0,R+4,an-Math.PI/2,an+Math.PI/2);ctx.stroke()}
    ctx.restore();return fr}
  /* ---------- ocular ---------- */
  function ocular(ctx,o={}){const x=o.x??W/2,y=o.y??H/2,r=o.r??W*.46,a=o.a??1,bl=o.blur??r*.06;if(a<=0)return;ctx.save();ctx.globalAlpha=a;
    const g=ctx.createRadialGradient(x,y,Math.max(0,r-bl),x,y,r+bl*.6);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.55,'rgba(0,0,0,.75)');g.addColorStop(1,'rgba(0,0,0,1)');
    ctx.fillStyle=g;ctx.beginPath();ctx.rect(-10,-10,W+20,H+20);ctx.arc(x,y,r+bl*.6,0,TAU,true);ctx.fill('evenodd');ctx.fillStyle='#000';ctx.beginPath();ctx.rect(-10,-10,W+20,H+20);ctx.arc(x,y,r+bl*.6-1,0,TAU,true);ctx.fill('evenodd');
    ctx.beginPath();ctx.arc(x,y,r-bl*.5,0,TAU);ctx.fillStyle=g;ctx.fill();
    ctx.globalCompositeOperation='lighter';ctx.lineWidth=Math.max(1.5,r*.006);for(const [dr,col] of [[-bl*.2,'rgba(90,170,255,.13)'],[bl*.05,'rgba(255,170,80,.10)']]){ctx.strokeStyle=col;ctx.beginPath();ctx.arc(x,y,r+dr,0,TAU);ctx.stroke()}
    const rg=ctx.createRadialGradient(x-r*.35,y-r*.42,0,x-r*.35,y-r*.42,r*.5);rg.addColorStop(0,'rgba(150,190,255,.045)');rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore()}
  /* ---------- estrelas que cintilam ---------- */
  const SET={};function starSet(seed,n){const k=seed+':'+n;if(SET[k])return SET[k];const R=FX.rng(seed),S=[];
    for(let i=0;i<n;i++){const z=R()*2-1,a=R()*TAU,s=Math.sqrt(1-z*z),m=Math.pow(R(),5),c=R();S.push({d:[s*Math.cos(a),z,s*Math.sin(a)],m,ph:R()*TAU,f:3+R()*7,col:c<.15?[255,206,170]:c<.35?[184,206,255]:[244,246,255]})}return SET[k]=S}
  function stars(ctx,c,o={}){const a=o.a??1;if(a<=0)return;const S=starSet(o.seed??77,o.n??900),t=o.t||0,av=o.avoid;ctx.save();ctx.globalCompositeOperation='lighter';
    for(const s of S){const el=s.d[1];if(o.horizon&&el<.004)continue;const q=COS.dirP(c,s.d);if(!q||q[0]<-6||q[0]>W+6||q[1]<-6||q[1]>H+6)continue;
      const ext=o.horizon?clamp(el/.12):1,twk=o.horizon?.35+.65*(1-clamp(el/.6)):.25,fl=1-twk*(.5+.5*Math.sin(t*s.f+s.ph))*(.6+.4*Math.sin(t*s.f*1.7+s.ph*2));
      let al=a*(.25+.75*s.m)*ext*fl;if(av){const dd=Math.hypot(q[0]-av[0],q[1]-av[1]);al*=clamp((dd-av[2])/(av[2]*1.5))}if(al<.02)continue;
      const r=.6+s.m*2.2;ctx.globalAlpha=al;ctx.fillStyle=`rgb(${s.col[0]},${s.col[1]},${s.col[2]})`;ctx.beginPath();ctx.arc(q[0],q[1],r,0,TAU);ctx.fill();
      if(s.m>.45){ctx.globalAlpha=al*.35;ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.8;const L2=r*4*(.6+.4*fl);ctx.beginPath();ctx.moveTo(q[0]-L2,q[1]);ctx.lineTo(q[0]+L2,q[1]);ctx.moveTo(q[0],q[1]-L2);ctx.lineTo(q[0],q[1]+L2);ctx.stroke()}}
    ctx.restore()}
  /* ---------- peças da vista de fora ---------- */
  function halfRim(ctx,q,R,ang,o={}){const a=o.a??1;if(a<=0||!q||!isFinite(q[0]))return;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=C.gold;ctx.lineWidth=o.w||4;ctx.shadowColor=C.gold;ctx.shadowBlur=14;ctx.lineCap='round';
    ctx.beginPath();ctx.arc(q[0],q[1],R+3,ang-Math.PI/2,ang+Math.PI/2);ctx.stroke();ctx.restore()}
  function cone(ctx,c,E,R,toSun,len,o={}){const a=o.a??1;if(a<=0)return;const d=mul(nrm(toSun),-1),tip=add(E,mul(d,len)),u=nrm(crs(d,Math.abs(d[1])<.9?[0,1,0]:[1,0,0])),v=crs(d,u),N=48;
    const qt=c.P(tip),rim=[];for(let k=0;k<N;k++){const an=k/N*TAU;rim.push(c.P(add(E,add(mul(u,Math.cos(an)*R),mul(v,Math.sin(an)*R)))))}if(!isFinite(qt[0])||rim.some(q=>!isFinite(q[0])))return;
    /* contorno visível do cone = envoltória do círculo da base com a ponta */
    const pts=[qt,...rim],cx=pts.reduce((s,p)=>s+p[0],0)/pts.length,cy=pts.reduce((s,p)=>s+p[1],0)/pts.length;pts.sort((p,q)=>Math.atan2(p[1]-cy,p[0]-cx)-Math.atan2(q[1]-cy,q[0]-cx));
    const hull=[];for(const p of [...pts].sort((p,q)=>p[0]-q[0]||p[1]-q[1])){while(hull.length>1){const [o1,o2]=[hull[hull.length-2],hull[hull.length-1]];if((o2[0]-o1[0])*(p[1]-o1[1])-(o2[1]-o1[1])*(p[0]-o1[0])<=0)hull.pop();else break}hull.push(p)}
    const up=[];for(const p of [...pts].sort((p,q)=>q[0]-p[0]||q[1]-p[1])){while(up.length>1){const [o1,o2]=[up[up.length-2],up[up.length-1]];if((o2[0]-o1[0])*(p[1]-o1[1])-(o2[1]-o1[1])*(p[0]-o1[0])<=0)up.pop();else break}up.push(p)}
    const H2=hull.slice(0,-1).concat(up.slice(0,-1));const qe=c.P(E);
    ctx.save();ctx.globalAlpha*=a;const g=ctx.createLinearGradient(qe[0],qe[1],qt[0],qt[1]);g.addColorStop(0,'rgba(8,14,30,.78)');g.addColorStop(1,'rgba(8,14,30,0)');ctx.fillStyle=g;
    ctx.beginPath();H2.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();
    const g2b=ctx.createLinearGradient(qe[0],qe[1],qt[0],qt[1]);g2b.addColorStop(0,'rgba(98,208,234,.85)');g2b.addColorStop(1,'rgba(98,208,234,0)');ctx.strokeStyle=g2b;ctx.lineWidth=3;ctx.setLineDash([14,10]);ctx.stroke();ctx.restore()}
  return {draw,eyepiece,moon,sunView,phase,ocular,stars,halfRim,cone,SYN,Q,HEAD}})();
