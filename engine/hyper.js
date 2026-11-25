/* ---------- HY: hipercubo e geometria em 4D (tesserato, rotações em 4D, projeção 4D→3D→2D, planificações que dobram) ----------
   Pontos em 4D são [x,y,z,w]. Um objeto é G = {V:[pontos], E:[[i,j,tag]], F:[[i,j,k,l,tag]]} (tag = célula/grupo, para alfa por parte).
   HY.cube(n)            n-cubo de lado 2 centrado na origem (n = 0..4): vértices (±1,…), arestas, faces quadradas; eixos que sobram ficam 0
   HY.build(n,e)         o (n−1)-cubo "arrastado" no eixo n−1 pela fração e (0..1): com e = 0 é o cubo anterior, com e = 1 é o n-cubo
                         (as duas cópias saem do meio para ±e, então o desenho fica centrado e emenda sem salto entre as etapas)
   HY.counts(n)          {V,E,F,C}: vértices, arestas, faces quadradas e cubos (células) do n-cubo (4D: 16, 32, 24, 8)
   HY.net(n,f)           planificação em cruz do n-cubo (n = 3: 6 quadrados, cruz latina; n = 4: 8 cubos, cruz de Dalí) com dobra por célula:
                         f = [base, +x, −x, +z, −z, +y, −y, topo] (n = 3 usa [base, +x, −x, +y, −y, topo]); 0 = aberta no espaço, 1 = dobrada.
                         Dobrada (tudo 1) ela coincide com HY.cube(n). Devolve G com tag = índice da célula (HY.NETN[n] nomes)
   HY.rot(p,R)           rotação 4D por planos: R = {xy,xz,xw,yz,yw,zw} em radianos (xw, yw, zw são as rotações "na 4ª direção")
   HY.cam({cx,cy,s,yaw,pitch,roll,dist,f})   câmera 3D (perspectiva): cam.P([x,y,z]) -> [X,Y,Z,k] (Z maior = mais perto)
   HY.proj(p,o)          4D → 3D por perspectiva na direção w: x' = x·d/(d−w) (o.d = distância do "olho 4D", padrão 3; o.p4 0..1 liga/desliga)
   HY.to2(cam,p,o)       ponto 4D direto na tela (para rótulos e HUD presos ao objeto)
   HY.draw(ctx,cam,G,o)  desenha com brilho: cor e espessura pela profundidade em w (dourado = perto na 4ª direção, ciano = longe),
                         faces translúcidas opcionais (o.faceA), vértices (o.dots), o.rot (rotação 4D), o.d, o.p4, o.lw, o.a,
                         o.alphaOf(tag), o.colAxis (eixo que dá a cor, padrão 3 = w; use 2 para objetos só 3D), o.cols [longe, meio, perto]
   HY.keys(K,T)          keyframes [[t, v1, v2, …], …] com interpolação suave (para câmera e ângulos); devolve [v1, v2, …] */
const HY=(()=>{
  const PL={xy:[0,1],xz:[0,2],xw:[0,3],yz:[1,2],yw:[1,3],zw:[2,3]};
  const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const smt=u=>{u=Math.min(1,Math.max(0,u));return u*u*u*(u*(u*6-15)+10)};
  function cube(n){const V=[],E=[],F=[];for(let i=0;i<(1<<n);i++){const p=[0,0,0,0];for(let k=0;k<n;k++)p[k]=(i>>k)&1?1:-1;V.push(p)}
    for(let i=0;i<V.length;i++)for(let k=0;k<n;k++){const j=i^(1<<k);if(j>i)E.push([i,j,k])}
    for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)for(let i=0;i<V.length;i++){if((i>>a)&1||(i>>b)&1)continue;F.push([i,i|1<<a,i|1<<a|1<<b,i|1<<b,a*4+b])}
    return {V,E,F,n}}
  function build(n,e){const C=cube(n);if(n===0)return C;const m=n-1;C.V=C.V.map((p,i)=>{const q=p.slice();q[m]=((i>>m)&1?1:-1)*e;return q});return C}
  const bin=(n,k)=>{let r=1;for(let i=0;i<k;i++)r=r*(n-i)/(i+1);return r};
  function counts(n){return {V:1<<n,E:n?n*(1<<(n-1)):0,F:n>=2?bin(n,2)*(1<<(n-2)):0,C:n>=3?bin(n,3)*(1<<(n-3)):0}}
  /* planificação: célula base no hiperplano (eixo m = n−1) = −1; braços nos eixos 0..m−1 (os dois sentidos) giram no plano (eixo, m)
     em torno da face de contato; o topo (oposto da base) fica preso na ponta do braço −y e gira no plano (y, m) */
  const NETN={3:['base','+x','−x','+y','−y','topo'],4:['base','+x','−x','+z','−z','+y','−y','topo']};
  function net(n,f){const m=n-1,arms=n===4?[[0,1],[0,-1],[2,1],[2,-1],[1,1],[1,-1]]:[[0,1],[0,-1],[1,1],[1,-1]],G={V:[],E:[],F:[]},Q=Math.PI/2;
    const loc=cube(n-1);
    const add=(tag,map)=>{const o=G.V.length;loc.V.forEach(p=>G.V.push(map(p)));loc.E.forEach(([i,j])=>G.E.push([o+i,o+j,tag]));loc.F.forEach(([i,j,k,l])=>G.F.push([o+i,o+j,o+k,o+l,tag]))};
    /* base: as coordenadas locais são os eixos 0..m−1 */
    add(0,p=>{const q=[0,0,0,0];for(let b=0;b<m;b++)q[b]=p[b];q[m]=-1;return q});
    arms.forEach(([a,sg],k)=>{const th=(f[k+1]??1)*Q,others=[...Array(m).keys()].filter(b=>b!==a);
      add(k+1,p=>{const q=[0,0,0,0];others.forEach((b,i)=>q[b]=p[i]);const s=p[m-1]+1;q[a]=sg*(1+s*Math.cos(th));q[m]=-1+s*Math.sin(th);return q})});
    /* topo: preso na ponta do braço −y (eixo 1, sentido −1) */
    {const k1=arms.findIndex(([a,sg])=>a===1&&sg<0)+1,t1=(f[k1]??1)*Q,t2=(f[arms.length+1]??1)*Q,others=[...Array(m).keys()].filter(b=>b!==1);
      const H=[-(1+2*Math.cos(t1)),-1+2*Math.sin(t1)],d1=[-Math.cos(t1),Math.sin(t1)],n1=[Math.sin(t1),Math.cos(t1)],dr=[Math.cos(t2)*d1[0]+Math.sin(t2)*n1[0],Math.cos(t2)*d1[1]+Math.sin(t2)*n1[1]];
      add(arms.length+1,p=>{const q=[0,0,0,0];others.forEach((b,i)=>q[b]=p[i]);const r=p[m-1]+1;q[1]=H[0]+r*dr[0];q[m]=H[1]+r*dr[1];return q})}
    return G}
  function rot(p,R){if(!R)return p;const q=p.slice();for(const k in R){const a=R[k];if(!a||!PL[k])continue;const [i,j]=PL[k],c=Math.cos(a),s=Math.sin(a),u=q[i],v=q[j];q[i]=u*c-v*s;q[j]=u*s+v*c}return q}
  function proj(p,o={}){const d=o.d??3,k=1+((o.p4??1)*(d/(d-p[3]))-(o.p4??1));return [p[0]*k,p[1]*k,p[2]*k,k]}
  function cam(o){const cy=Math.cos(o.yaw||0),sy=Math.sin(o.yaw||0),cp=Math.cos(o.pitch||0),sp=Math.sin(o.pitch||0),cr=Math.cos(o.roll||0),sr=Math.sin(o.roll||0),D=o.dist||7,f=o.f||[0,0,0],s=o.s||200,cx=o.cx??W/2,cyy=o.cy??H/2;
    return {o,P(p){const x=p[0]-f[0],y=p[1]-f[1],z=p[2]-f[2];const X=x*cy+z*sy;let Z=-x*sy+z*cy;const Y=y*cp-Z*sp;Z=y*sp+Z*cp;const X2=X*cr-Y*sr,Y2=X*sr+Y*cr;
      const k=D/Math.max(.15,D-Z);return [cx+X2*s*k,cyy-Y2*s*k,Z,k]}}}
  function to2(c,p,o={}){return c.P(proj(rot(p,o.rot),o))}
  function draw(ctx,c,G,o={}){const a=o.a??1;if(a<=0)return;const ax=o.colAxis??3,cols=(o.cols||['#62d0ea','#9ff5d8','#f4b740']).map(hx),lw=o.lw??5,aOf=o.alphaOf||(()=>1);
    const R=G.V.map(p=>rot(p,o.rot)),Pt=R.map(p=>{const q=proj(p,o),s=c.P(q);return {x:s[0],y:s[1],z:s[2],k:s[3],w:p[ax]}});
    const wr=o.wRange||[-1,1],tw=w=>Math.min(1,Math.max(0,(w-wr[0])/(wr[1]-wr[0]))),col=t=>{const u=t*(cols.length-1),i=Math.min(cols.length-2,Math.floor(u)),f=u-i;return cols[i].map((v,k)=>Math.round(v+(cols[i+1][k]-v)*f)).join(',')};
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    if(o.faceA){const FF=G.F.map(F=>{const q=F.slice(0,4).map(i=>Pt[i]);return {q,z:q.reduce((s,p)=>s+p.z,0)/4,w:q.reduce((s,p)=>s+p.w,0)/4,al:aOf(F[4])}}).filter(F=>F.al>.003).sort((A,B)=>A.z-B.z);
      for(const F of FF){ctx.fillStyle=`rgba(${col(tw(F.w))},${o.faceA*a*F.al})`;ctx.beginPath();F.q.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill()}}
    const EE=G.E.map(e=>{const A=Pt[e[0]],B=Pt[e[1]];return {A,B,z:(A.z+B.z)/2,t:tw((A.w+B.w)/2),k:(A.k+B.k)/2,al:aOf(e[2])*a}}).filter(e=>e.al>.003).sort((A,B)=>A.z-B.z);
    for(const pass of [0,1,2]){if(pass===0)ctx.globalCompositeOperation='lighter';
      for(const e of EE){const th=lw*e.k*(.7+.6*e.t),c0=col(e.t);
        if(pass===0){ctx.strokeStyle=`rgba(${c0},${(.1+.14*e.t)*e.al*(o.glow??1)})`;ctx.lineWidth=th*4}
        else if(pass===1){ctx.strokeStyle=`rgba(${c0},${(.55+.45*e.t)*e.al})`;ctx.lineWidth=th}
        else{ctx.strokeStyle=`rgba(255,250,235,${(.25+.45*e.t)*e.al})`;ctx.lineWidth=Math.max(1,th*.3)}
        ctx.beginPath();ctx.moveTo(e.A.x,e.A.y);ctx.lineTo(e.B.x,e.B.y);ctx.stroke()}
      if(pass===0)ctx.globalCompositeOperation='source-over'}
    if(o.dots){ctx.globalCompositeOperation='lighter';Pt.forEach(p=>{const t=tw(p.w),r=o.dots*p.k*(.8+.5*t),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2.6);
      g.addColorStop(0,`rgba(255,250,235,${.95*a})`);g.addColorStop(.35,`rgba(${col(t)},${.6*a})`);g.addColorStop(1,`rgba(${col(t)},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r*2.6,0,TAU);ctx.fill()})}
    ctx.restore();return Pt}
  function keys(K,T){if(T<=K[0][0])return K[0].slice(1);for(let i=0;i<K.length-1;i++){const A=K[i],B=K[i+1];if(T<=B[0]){const u=smt((T-A[0])/(B[0]-A[0]));return A.slice(1).map((v,k)=>v+(B[k+1]-v)*u)}}return K[K.length-1].slice(1)}
  return {cube,build,counts,net,NETN,rot,proj,cam,to2,draw,keys}})();
