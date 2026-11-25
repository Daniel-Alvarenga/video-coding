/* ---------- VOY: sonda Voyager em 3D (malha procedural em escala real, metros) e sinal de rádio ----------
   Medidas da NASA/JPL: antena de alto ganho de 3,66 m, corpo de 10 lados (~1,8 m), 3 RTGs num braço de ~3 m, braço de ciência
   com a plataforma de varredura (câmeras e o telescópio IRIS), magnetômetro de 13 m, 2 antenas de rádio de 10 m e o Disco de Ouro.
   Eixo +Y do modelo = eixo da antena (aponta para a Terra).
   VOY.draw(ctx,c,{pos,rot:[yaw,pitch,roll],s,sun,a,glint})  desenha na câmera W3D c (pintor: triângulos de trás para a frente,
       luz do Sol na direção 'sun' (vetor), brilho especular, contorno de luz); pos em unidades do mundo, s = unidades por metro.
   VOY.wave(ctx,c,{from,r,col,a,lw,n,axes})  frente de onda de rádio: casca esférica de raio r em volta de 'from' (anéis em perspectiva);
       axes = eixos dos anéis (padrão: 3 ortogonais; [c.fw] = um só anel de frente para a câmera, o contorno da esfera)
   VOY.record(ctx,x,y,R,t,{a})  o Disco de Ouro visto de frente em 2D (sulcos, capa com os diagramas gravados)
   Exemplo: projetos/voyager-dia-luz/ */
const VOY=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  /* materiais: cor base, especular, brilho próprio */
  const MAT={dish:{c:[232,232,224],sp:.35,dbl:1},dishB:{c:[150,150,146],sp:.1,dbl:1},bus:{c:[150,116,52],sp:.55},busT:{c:[38,38,40],sp:.3},
    rtg:{c:[72,72,76],sp:.25},fin:{c:[58,58,62],sp:.2,dbl:1},plat:{c:[205,205,200],sp:.3},cam:{c:[30,30,34],sp:.6},gold:{c:[222,176,72],sp:.9},white:{c:[220,220,214],sp:.2}};
  const T=[],L=[];   /* triângulos [a,b,c,mat]  e  linhas [a,b,largura,cor] */
  const tri=(a,b,c,m)=>T.push([a,b,c,m]),quad=(a,b,c,d,m)=>{tri(a,b,c,m);tri(a,c,d,m)};
  const basis=d=>{const w=nrm(d),u=nrm(crs(Math.abs(w[1])<.9?[0,1,0]:[1,0,0],w)),v=crs(w,u);return [u,v,w]};
  function cyl(p0,p1,r,n,m,cap=true){const [u,v]=basis(sub(p1,p0)),R=k=>add(mul(u,Math.cos(k/n*2*Math.PI)*r),mul(v,Math.sin(k/n*2*Math.PI)*r));
    for(let k=0;k<n;k++){const a=R(k),b=R(k+1);quad(add(p0,a),add(p0,b),add(p1,b),add(p1,a),m);if(cap){tri(p1,add(p1,a),add(p1,b),m);tri(p0,add(p0,b),add(p0,a),m)}}}
  function box(c,sz,m){const [x,y,z]=c,[a,b,d]=sz.map(s=>s/2),P=(i,j,k)=>[x+i*a,y+j*b,z+k*d];
    quad(P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1),m);quad(P(1,-1,-1),P(-1,-1,-1),P(-1,1,-1),P(1,1,-1),m);quad(P(1,-1,1),P(1,-1,-1),P(1,1,-1),P(1,1,1),m);
    quad(P(-1,-1,-1),P(-1,-1,1),P(-1,1,1),P(-1,1,-1),m);quad(P(-1,1,1),P(1,1,1),P(1,1,-1),P(-1,1,-1),m);quad(P(-1,-1,-1),P(1,-1,-1),P(1,-1,1),P(-1,-1,1),m)}
  /* corpo: prisma de 10 lados (painéis dourados com faixas pretas alternadas) */
  const BR=.95,BY0=-.25,BY1=.22;for(let k=0;k<10;k++){const a0=k/10*2*Math.PI,a1=(k+1)/10*2*Math.PI,p=(a,y)=>[BR*Math.cos(a),y,BR*Math.sin(a)],m=k%2?'bus':'busT';
    quad(p(a0,BY0),p(a1,BY0),p(a1,BY1),p(a0,BY1),m);tri([0,BY1,0],p(a1,BY1),p(a0,BY1),'busT');tri([0,BY0,0],p(a0,BY0),p(a1,BY0),'busT')}
  /* antena parabólica de 3,66 m (vértice logo acima do corpo) e o subrefletor no tripé */
  const DR=1.83,DY0=.3,DF=1.86,dz=r=>DY0+r*r/(4*DF),NR=7,NA=36;
  for(let i=0;i<NR;i++){const r0=DR*i/NR,r1=DR*(i+1)/NR;for(let k=0;k<NA;k++){const a0=k/NA*2*Math.PI,a1=(k+1)/NA*2*Math.PI,p=(r,a)=>[r*Math.cos(a),dz(r),r*Math.sin(a)];
    if(i===0)tri(p(0,0),p(r1,a1),p(r1,a0),'dish');else quad(p(r0,a0),p(r0,a1),p(r1,a1),p(r1,a0),'dish')}}
  const FY=DY0+1.05;cyl([0,FY-.06,0],[0,FY+.04,0],.21,18,'white');for(let k=0;k<3;k++){const a=k/3*2*Math.PI+.5;L.push([[1.45*Math.cos(a),dz(1.45),1.45*Math.sin(a)],[0,FY-.04,0],.025,'#d8d8d0'])}
  for(let k=0;k<12;k++){const a=k/12*2*Math.PI;L.push([[.35*Math.cos(a),dz(.35)-.03,.35*Math.sin(a)],[DR*Math.cos(a),dz(DR)-.03,DR*Math.sin(a)],.02,'#8c8c86'])}  /* nervuras atrás */
  /* braço dos RTGs (para -X, um pouco para baixo) com 3 geradores com aletas */
  const rd=nrm([-1,-.12,.05]),r0=[-BR,-.05,0];for(let k=0;k<3;k++){const o=k===0?[.12,.12,0]:k===1?[0,-.12,.1]:[0,-.12,-.1];L.push([add(r0,o),add(r0,mul(rd,2.9)),.035,'#7a7a74'])}
  [1.35,1.95,2.55].forEach(d=>{const c0=add(r0,mul(rd,d-.24)),c1=add(r0,mul(rd,d+.24));cyl(c0,c1,.2,14,'rtg');const [u,v]=basis(rd);for(let k=0;k<6;k++){const a=k/6*2*Math.PI,f=add(mul(u,Math.cos(a)),mul(v,Math.sin(a)));
    quad(add(c0,mul(f,.2)),add(c1,mul(f,.2)),add(c1,mul(f,.36)),add(c0,mul(f,.36)),'fin')}});
  /* braço de ciência (para +X) e a plataforma de varredura com câmeras e o telescópio IRIS */
  const sd=nrm([1,-.08,-.06]),s0=[BR,-.05,0];for(let k=0;k<3;k++){const o=k===0?[0,.12,0]:k===1?[0,-.1,.1]:[0,-.1,-.1];L.push([add(s0,o),add(s0,mul(sd,2.5)),.035,'#7a7a74'])}
  const SP=add(s0,mul(sd,2.65));box(SP,[.5,.42,.46],'plat');cyl(add(SP,[-.05,.05,.23]),add(SP,[-.05,.05,.75]),.24,18,'white');cyl(add(SP,[-.05,.05,.74]),add(SP,[-.05,.05,.76]),.2,18,'cam',false);
  cyl(add(SP,[.18,-.1,.2]),add(SP,[.18,-.1,.55]),.07,10,'cam');cyl(add(SP,[.18,.14,.2]),add(SP,[.18,.14,.42]),.06,10,'cam');box(add(SP,[-.32,-.05,0]),[.22,.25,.3],'busT');
  /* magnetômetro de 13 m (treliça fina) e as duas antenas de rádio de 10 m em V */
  const md=nrm([-.25,-.3,-1]),m0=[0,BY0,-.7],m1=add(m0,mul(md,13));L.push([m0,m1,.05,'#9a9a92']);box(add(m0,mul(md,7)),[.12,.12,.12],'white');box(m1,[.15,.15,.15],'white');
  L.push([[.5,BY0,.75],add([.5,BY0,.75],mul(nrm([.55,-.35,.75]),10)),.018,'#c8c8c0']);L.push([[.3,BY0,.85],add([.3,BY0,.85],mul(nrm([-.15,-.35,1]),10)),.018,'#c8c8c0']);
  /* Disco de Ouro, preso num painel do corpo */
  {const a=.35*Math.PI,cn=[BR*.99*Math.cos(a),-.02,BR*.99*Math.sin(a)],nn=[Math.cos(a),0,Math.sin(a)],[u,v]=basis(nn),R=.155;for(let k=0;k<24;k++){const b0=k/24*2*Math.PI,b1=(k+1)/24*2*Math.PI;
    tri(add(cn,mul(nn,.012)),add(add(cn,mul(nn,.012)),add(mul(u,Math.cos(b0)*R),mul(v,Math.sin(b0)*R))),add(add(cn,mul(nn,.012)),add(mul(u,Math.cos(b1)*R),mul(v,Math.sin(b1)*R))),'gold')}}

  /* ---------- desenho ---------- */
  function rotM(r){const [y,p,ro]=r||[0,0,0],cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p),cr=Math.cos(ro),sr=Math.sin(ro);
    return v=>{let [x,yy,z]=v;[x,yy]=[x*cr-yy*sr,x*sr+yy*cr];[yy,z]=[yy*cp-z*sp,yy*sp+z*cp];[x,z]=[x*cy+z*sy,-x*sy+z*cy];return [x,yy,z]}}
  function draw(ctx,c,o={}){const a=o.a??1;if(a<=0)return;const R=rotM(o.rot),s=o.s??1,P0=o.pos||[0,0,0],Lsun=nrm(o.sun||[-.6,.3,.75]),W2=v=>add(P0,mul(R(v),s));
    const items=[];for(const [A,B,Cc,m] of T){const a3=W2(A),b3=W2(B),c3=W2(Cc),n=nrm(crs(sub(b3,a3),sub(c3,a3))),cen=mul(add(add(a3,b3),c3),1/3),toE=nrm(sub(c.eye,cen));
      const mt=MAT[m];let nn=n,fd=dot(n,toE);if(fd<0){if(!mt.dbl)continue;nn=mul(n,-1);fd=-fd}
      const qa=c.P(a3),qb=c.P(b3),qc=c.P(c3);if(!isFinite(qa[0])||!isFinite(qb[0])||!isFinite(qc[0]))continue;
      const ld=Math.max(0,dot(nn,Lsun)),hv=nrm(add(Lsun,toE)),spc=Math.pow(Math.max(0,dot(nn,hv)),28)*mt.sp,rim=Math.pow(1-fd,3)*.35;
      const back=m==='dish'&&dot(n,toE)<0,base=back?MAT.dishB.c:mt.c,k=.07+.93*ld;
      items.push({t:1,z:(qa[2]+qb[2]+qc[2])/3,q:[qa,qb,qc],col:base.map(v=>Math.min(255,v*k+255*spc+ (o.glint??0)*40*spc+60*rim)|0)})}
    /* hastes e antenas entram na mesma ordem de profundidade (picadas em pedaços para não atravessar o corpo) */
    for(const [A,B,w,col] of L){const N=6;for(let k=0;k<N;k++){const a3=W2(add(A,mul(sub(B,A),k/N))),b3=W2(add(A,mul(sub(B,A),(k+1)/N))),qa=c.P(a3),qb=c.P(b3);if(!isFinite(qa[0])||!isFinite(qb[0]))continue;
      items.push({t:0,z:(qa[2]+qb[2])/2-.02*s,q:[qa,qb],col,w:Math.max(.8,c.f*w*s/((qa[2]+qb[2])/2))})}}
    items.sort((p,q)=>q.z-p.z);ctx.save();ctx.globalAlpha*=a;ctx.lineJoin='round';ctx.lineCap='round';
    for(const it of items){if(it.t){const [x,y,z]=it.col;ctx.fillStyle=ctx.strokeStyle=`rgb(${x},${y},${z})`;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(it.q[0][0],it.q[0][1]);ctx.lineTo(it.q[1][0],it.q[1][1]);ctx.lineTo(it.q[2][0],it.q[2][1]);ctx.closePath();ctx.fill();ctx.stroke()}
      else{ctx.strokeStyle=it.col;ctx.lineWidth=it.w;ctx.beginPath();ctx.moveTo(it.q[0][0],it.q[0][1]);ctx.lineTo(it.q[1][0],it.q[1][1]);ctx.stroke()}}
    ctx.restore()}
  /* frente de onda: anéis de uma casca esférica (3 círculos ortogonais + halo), para o sinal de rádio indo e voltando */
  function wave(ctx,c,o={}){const a=o.a??1,r=o.r;if(a<=0||!(r>0))return;const C0=o.from||[0,0,0],col=o.col||'98,208,234',n=o.n||96;ctx.save();ctx.globalCompositeOperation='lighter';
    for(const ax of (o.axes||[[0,1,0],[1,0,0],[0,0,1]])){const [u,v]=basis(ax);for(const [lw,al] of [[o.lw?o.lw*4:10,.08],[o.lw||2.5,.6]]){ctx.strokeStyle=`rgba(${col},${al*a})`;ctx.lineWidth=lw;ctx.beginPath();let pen=false;
      for(let k=0;k<=n;k++){const t=k/n*2*Math.PI,p=add(C0,add(mul(u,Math.cos(t)*r),mul(v,Math.sin(t)*r))),q=c.P(p);if(!isFinite(q[0])){pen=false;continue}pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}ctx.stroke()}}ctx.restore()}
  /* Disco de Ouro em 2D: capa dourada com os diagramas gravados (pulsar, átomo de hidrogênio, instruções) */
  function record(ctx,x,y,R,t,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;const g=ctx.createRadialGradient(x-R*.3,y-R*.35,R*.1,x,y,R);g.addColorStop(0,'#fff0b8');g.addColorStop(.45,'#e0b24a');g.addColorStop(1,'#8a6420');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R,0,2*Math.PI);ctx.fill();ctx.strokeStyle='rgba(90,60,10,.35)';ctx.lineWidth=1;for(let k=1;k<26;k++){ctx.beginPath();ctx.arc(x,y,R*(.32+.66*k/26),0,2*Math.PI);ctx.stroke()}
    const sh=(t*.6)%(2*Math.PI);ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(x,y);ctx.rotate(sh);const lg=ctx.createLinearGradient(-R,0,R,0);lg.addColorStop(.35,'rgba(255,240,200,0)');lg.addColorStop(.5,'rgba(255,240,200,.45)');lg.addColorStop(.65,'rgba(255,240,200,0)');ctx.fillStyle=lg;ctx.beginPath();ctx.arc(0,0,R,0,2*Math.PI);ctx.fill();ctx.restore();
    ctx.strokeStyle='rgba(80,52,8,.85)';ctx.lineWidth=Math.max(1.5,R*.012);const L2=(x0,y0,x1,y1)=>{ctx.beginPath();ctx.moveTo(x+x0*R,y+y0*R);ctx.lineTo(x+x1*R,y+y1*R);ctx.stroke()};
    /* mapa dos pulsares (raios saindo de um ponto) */for(let k=0;k<14;k++){const an=k*.45+.2,l=.18+.12*((k*7)%5)/5;L2(-.42,.42,-.42+Math.cos(an)*l,.42+Math.sin(an)*l)}
    /* átomo de hidrogênio (dois círculos ligados) */ctx.beginPath();ctx.arc(x+.4*R,y+.42*R,.05*R,0,2*Math.PI);ctx.stroke();ctx.beginPath();ctx.arc(x+.55*R,y+.42*R,.05*R,0,2*Math.PI);ctx.stroke();L2(.45,.42,.5,.42);
    /* agulha e disco visto de lado (instruções) */ctx.beginPath();ctx.arc(x-.4*R,y-.38*R,.16*R,0,2*Math.PI);ctx.stroke();L2(-.6,-.2,-.2,-.2);L2(.2,-.42,.62,-.42);L2(.2,-.34,.62,-.34);
    ctx.fillStyle='#5a3c08';ctx.beginPath();ctx.arc(x,y,R*.06,0,2*Math.PI);ctx.fill();ctx.restore()}
  return {draw,wave,record,T,L}})();
