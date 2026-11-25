/* ---------- MESH: malhas 3D genéricas (pintor com luz) e modelos prontos: carro e Estação Espacial ----------
   MESH.make(fn)  cria uma malha: fn(b) recebe o construtor b com b.tri(a,b,c,mat) b.quad(a,b,c,d,mat) b.box(centro,[dx,dy,dz],mat)
       b.cyl(p0,p1,r,n,mat,cap) b.line(a,b,largura,cor) e b.mat(nome,{c:[r,g,b],sp,dbl,emit}); devolve {T,L,M}
   MESH.draw(ctx,c,m,{pos,rot:[yaw,pitch,roll],s,sun,a,amb})  desenha na câmera W3D c: triângulos de trás para a frente, luz direcional,
       brilho especular, contorno de luz e cores que brilham sozinhas (emit, ex.: faróis); linhas entram na mesma ordem de profundidade
   MESH.car()  carro (hatch) com 4,1 m: carroceria em ouro, vidros escuros, rodas, faróis e lanternas acesos; frente = +Z, teto = +Y
   MESH.iss()  Estação Espacial (~109 × 73 m): treliça, 8 asas solares grandes (pares), radiadores e módulos; treliça no eixo X
   Exemplo: projetos/dirigir-espaco/ */
const MESH=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  const basis=d=>{const w=nrm(d),u=nrm(crs(Math.abs(w[1])<.9?[0,1,0]:[1,0,0],w)),v=crs(w,u);return [u,v,w]};
  function make(fn){const T=[],L=[],M={};const b={mat:(k,o)=>{M[k]=o},tri:(a,c,d,m)=>T.push([a,c,d,m]),quad:(a,c,d,e,m)=>{T.push([a,c,d,m]);T.push([a,d,e,m])},line:(a,c,w,col)=>L.push([a,c,w,col]),
    box:(c,sz,m)=>{const [x,y,z]=c,[a,bb,d]=sz.map(s=>s/2),P=(i,j,k)=>[x+i*a,y+j*bb,z+k*d];b.quad(P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1),m);b.quad(P(1,-1,-1),P(-1,-1,-1),P(-1,1,-1),P(1,1,-1),m);
      b.quad(P(1,-1,1),P(1,-1,-1),P(1,1,-1),P(1,1,1),m);b.quad(P(-1,-1,-1),P(-1,-1,1),P(-1,1,1),P(-1,1,-1),m);b.quad(P(-1,1,1),P(1,1,1),P(1,1,-1),P(-1,1,-1),m);b.quad(P(-1,-1,-1),P(1,-1,-1),P(1,-1,1),P(-1,-1,1),m)},
    cyl:(p0,p1,r,n,m,cap=true)=>{const [u,v]=basis(sub(p1,p0)),R=k=>add(mul(u,Math.cos(k/n*2*Math.PI)*r),mul(v,Math.sin(k/n*2*Math.PI)*r));
      for(let k=0;k<n;k++){const a=R(k),c=R(k+1);b.quad(add(p0,a),add(p0,c),add(p1,c),add(p1,a),m);if(cap){b.tri(p1,add(p1,a),add(p1,c),m);b.tri(p0,add(p0,c),add(p0,a),m)}}}};
    fn(b);return {T,L,M}}
  function rotM(r){const [y,p,ro]=r||[0,0,0],cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p),cr=Math.cos(ro),sr=Math.sin(ro);
    return v=>{let [x,yy,z]=v;[x,yy]=[x*cr-yy*sr,x*sr+yy*cr];[yy,z]=[yy*cp-z*sp,yy*sp+z*cp];[x,z]=[x*cy+z*sy,-x*sy+z*cy];return [x,yy,z]}}
  function draw(ctx,c,m,o={}){const a=o.a??1;if(a<=0)return;const R=rotM(o.rot),s=o.s??1,P0=o.pos||[0,0,0],Ls=nrm(o.sun||[-.5,.6,.6]),amb=o.amb??.08,W2=v=>add(P0,mul(R(v),s)),items=[];
    for(const [A,B,Cc,k] of m.T){const a3=W2(A),b3=W2(B),c3=W2(Cc),n=nrm(crs(sub(b3,a3),sub(c3,a3))),cen=mul(add(add(a3,b3),c3),1/3),toE=nrm(sub(c.eye,cen)),mt=m.M[k]||{c:[200,200,200]};
      let nn=n,fd=dot(n,toE);if(fd<0){if(!mt.dbl)continue;nn=mul(n,-1);fd=-fd}
      const qa=c.P(a3),qb=c.P(b3),qc=c.P(c3);if(!isFinite(qa[0])||!isFinite(qb[0])||!isFinite(qc[0]))continue;
      const ld=Math.max(0,dot(nn,Ls)),hv=nrm(add(Ls,toE)),sp=Math.pow(Math.max(0,dot(nn,hv)),mt.pw||24)*(mt.sp||0),rim=Math.pow(1-fd,3)*.3,kk=amb+(1-amb)*ld,em=mt.emit||0;
      items.push({t:1,z:(qa[2]+qb[2]+qc[2])/3,q:[qa,qb,qc],col:mt.c.map(v=>Math.min(255,v*(kk+em)+255*sp+50*rim)|0)})}
    for(const [A,B,w,col] of m.L){const N=6;for(let k=0;k<N;k++){const a3=W2(add(A,mul(sub(B,A),k/N))),b3=W2(add(A,mul(sub(B,A),(k+1)/N))),qa=c.P(a3),qb=c.P(b3);if(!isFinite(qa[0])||!isFinite(qb[0]))continue;
      items.push({t:0,z:(qa[2]+qb[2])/2,q:[qa,qb],col,w:Math.max(.8,c.f*w*s/((qa[2]+qb[2])/2))})}}
    items.sort((p,q)=>q.z-p.z);ctx.save();ctx.globalAlpha*=a;ctx.lineJoin='round';ctx.lineCap='round';
    for(const it of items){if(it.t){const [x,y,z]=it.col;ctx.fillStyle=ctx.strokeStyle=`rgb(${x},${y},${z})`;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(it.q[0][0],it.q[0][1]);ctx.lineTo(it.q[1][0],it.q[1][1]);ctx.lineTo(it.q[2][0],it.q[2][1]);ctx.closePath();ctx.fill();ctx.stroke()}
      else{ctx.strokeStyle=it.col;ctx.lineWidth=it.w;ctx.beginPath();ctx.moveTo(it.q[0][0],it.q[0][1]);ctx.lineTo(it.q[1][0],it.q[1][1]);ctx.stroke()}}ctx.restore()}

  /* ---------- carro: hatch de 4,1 m (perfil lateral extrudado em X, com teto inclinado) ---------- */
  let CAR=null;function car(){if(CAR)return CAR;return CAR=make(b=>{b.mat('body',{c:[232,176,58],sp:.9,pw:40,dbl:1});b.mat('glass',{c:[24,34,48],sp:1.2,pw:60,dbl:1});b.mat('dark',{c:[28,28,30],sp:.2});
    b.mat('tire',{c:[22,22,24],sp:.1});b.mat('rim',{c:[190,190,196],sp:.8});b.mat('head',{c:[255,250,225],emit:1.2});b.mat('tail',{c:[230,40,30],emit:1.0});
    /* perfil (z, y) da carroceria de trás para a frente, metade superior da cabine separada para os vidros */
    const hw=.88,prof=[[-2.05,.35],[-2.05,.95],[-1.75,1.05],[2.0,.85],[2.05,.42],[2.0,.32],[-2.0,.3]],X=[-hw,hw];
    const side=(x,m)=>{for(let k=1;k<prof.length-1;k++)b.tri([x,prof[0][1],prof[0][0]],[x,prof[k][1],prof[k][0]],[x,prof[k+1][1],prof[k+1][0]],m)};
    side(hw,'body');{const T0=[];side(-hw,'body')}
    for(let k=0;k<prof.length;k++){const p=prof[k],q=prof[(k+1)%prof.length];b.quad([-hw,p[1],p[0]],[-hw,q[1],q[0]],[hw,q[1],q[0]],[hw,p[1],p[0]],'body')}
    /* cabine com vidros */const cab=[[-1.65,1.0],[-1.25,1.48],[.45,1.48],[1.25,.98]],cw=.78;
    for(let k=0;k<cab.length-1;k++){const p=cab[k],q=cab[k+1];b.quad([-cw,p[1],p[0]],[-cw,q[1],q[0]],[cw,q[1],q[0]],[cw,p[1],p[0]],k===1?'body':'glass')}
    for(const x of [cw,-cw]){b.tri([x,cab[0][1],cab[0][0]],[x,cab[1][1],cab[1][0]],[x,cab[2][1],cab[2][0]],'glass');b.tri([x,cab[0][1],cab[0][0]],[x,cab[2][1],cab[2][0]],[x,cab[3][1],cab[3][0]],'glass')}
    /* rodas */for(const z of [-1.35,1.35])for(const x of [-hw-.02,hw+.02]){const s=Math.sign(x);b.cyl([x,.34,z],[x+s*.22,.34,z],.34,16,'tire');b.cyl([x+s*.22,.34,z],[x+s*.23,.34,z],.2,12,'rim')}
    /* faróis e lanternas */for(const x of [-.6,.6]){b.box([x,.7,2.05],[.42,.14,.04],'head');b.box([x,.78,-2.06],[.38,.12,.04],'tail')}
    b.box([0,.5,2.06],[1.0,.16,.04],'dark')})}
  /* ---------- Estação Espacial ---------- */
  let ISS=null;function iss(){if(ISS)return ISS;return ISS=make(b=>{b.mat('truss',{c:[150,150,150],sp:.3});b.mat('sol',{c:[160,110,40],sp:1.1,pw:30,dbl:1});b.mat('rad',{c:[230,230,226],sp:.2,dbl:1});b.mat('mod',{c:[214,214,206],sp:.35});
    b.box([0,0,0],[100,1.6,1.6],'truss');
    for(const x of [-42,-33,33,42])for(const sy of [-1,1]){const y0=sy*1.5,y1=sy*36;b.quad([x-5.8,y0,0],[x+5.8,y0,0],[x+5.8,y1,0],[x-5.8,y1,0],'sol');b.line([x,y0,.1],[x,y1,.1],.25,'#8a8a86')}
    for(const x of [-18,18])b.quad([x-6,0,-1],[x+6,0,-1],[x+6,0,-14],[x-6,0,-14],'rad');
    b.cyl([0,0,2],[0,0,40],2.1,14,'mod');b.cyl([0,0,8],[-14,0,8],2.1,14,'mod');b.cyl([0,0,14],[12,0,14],2.1,14,'mod');b.cyl([0,0,-2],[0,0,-30],2.0,14,'mod');
    for(const sy of [-1,1])b.quad([-6,sy*2,-24],[6,sy*2,-24],[6,sy*16,-24],[-6,sy*16,-24],'sol')})}
  return {make,draw,car,iss}})();
