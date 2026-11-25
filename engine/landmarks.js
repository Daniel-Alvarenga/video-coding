/* ---------- LM: modelos 3D de referência de escala (malhas de verdade, mesma câmera/luz do W3D) ----------
   Unidades em metros, y para cima, frente do modelo voltada para +z. Tamanhos reais:
     LM.person (1,75 m) · LM.house (sobrado, 7,5 m) · LM.cristo (Cristo Redentor, 38 m com pedestal, braços de 28 m)
     LM.burj (Burj Khalifa, 828 m, planta em Y com recuos em espiral) · LM.empire (Empire State, 443 m com antena)
   LM.draw(ctx,c,model,{pos:[x,0,z],yaw,s,a,color,wire,fogStart,mirror})  desenha o modelo (c = câmera W3D, ou W3D.mirror(c) para o reflexo)
   LM.shadow(ctx,c,model,{pos,yaw,s,a})  sombra projetada no piso      LM.world(ctx,c,model,o)  reflexo + sombra + modelo de uma vez
   LM.box(w,h,d,cor) · LM.hair(diâmetro) · LM.rock(r) (grão de areia) · LM.pea(r) · LM.rulerBar(len)+LM.rulerTicks(ctx,c,{pos,len}) (régua em mm) · LM.carpet(ctx,{mpp,cx,cy,rect}) multidão vista de cima; wireCol/wireGlow: contorno colorido
   LM.height(model)  altura total em metros. Opções: fogK (névoa fixa 0–1, p/ fundo distante), wire (contorno ciano), blur (só em LM.world), color (cor única)
   Partes: prisma vertical {poly:[[x,z]...], y0, y1, k (escala do topo), col, emit, lit}, esfera {sph:[x,y,z], r, col} ou polígonos soltos {faces:[[[x,y,z]...]...], col}.
   model.stack=true: desenha as partes como bolo de noiva (camadas em ordem pela altura do olho) — certo para torres com recuos. */
const LM=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
    nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)},hex=c=>{const n=parseInt(c.slice(1,7),16);return [n>>16&255,n>>8&255,n&255]};
  const rect=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
  const ngon=(n,r,cx=0,cz=0,ph=0)=>Array.from({length:n},(_,i)=>[cx+r*Math.cos(ph+i/n*TAU),cz+r*Math.sin(ph+i/n*TAU)]);
  /* ---------- geometria local: cada parte vira lista de polígonos com normal para fora ---------- */
  function partPolys(p){const out=[];
    if(p.sph){const [cx,cy,cz]=p.sph,r=p.r,nl=p.seg??10,nt=Math.round(nl*.6);for(let i=0;i<nl;i++)for(let j=0;j<nt;j++){const pt=(a,b)=>{const th=a/nl*TAU,ph=-Math.PI/2+b/nt*Math.PI;return [cx+r*Math.cos(ph)*Math.cos(th),cy+r*Math.sin(ph)*(p.sy??1),cz+r*Math.cos(ph)*Math.sin(th)]};
        const V=[pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1)],cen=V.reduce((s,v)=>[s[0]+v[0]/4,s[1]+v[1]/4,s[2]+v[2]/4],[0,0,0]);out.push({V,n:nrm(sub(cen,[cx,cy,cz])),col:p.col})}return out}
    if(p.faces){const C0=p.center;p.faces.forEach(V=>{let n=nrm(crs(sub(V[1],V[0]),sub(V[2],V[0])));const cen=V.reduce((s,v)=>[s[0]+v[0]/V.length,s[1]+v[1]/V.length,s[2]+v[2]/V.length],[0,0,0]);
        if(C0&&dot(n,sub(cen,C0))<0)n=n.map(v=>-v);out.push({V,n,col:p.col,emit:p.emit,two:p.two,under:p.under})});return out}
    const P=p.poly,m=P.length,k=p.k??1,cx=P.reduce((s,q)=>s+q[0],0)/m,cz=P.reduce((s,q)=>s+q[1],0)/m,top=P.map(([x,z])=>[cx+(x-cx)*k,cz+(z-cz)*k]);
    let area=0;for(let i=0;i<m;i++){const a=P[i],b=P[(i+1)%m];area+=a[0]*b[1]-b[0]*a[1]}const sg=area>0?1:-1;
    for(let i=0;i<m;i++){const j=(i+1)%m,a=P[i],b=P[j],ta=top[i],tb=top[j],V=[[a[0],p.y0,a[1]],[b[0],p.y0,b[1]],[tb[0],p.y1,tb[1]],[ta[0],p.y1,ta[1]]];
      /* normal para fora a partir do sentido do contorno (vale para plantas côncavas, como o Y do Burj) */
      const dx=b[0]-a[0],dz=b[1]-a[1],ln=Math.hypot(dx,dz)||1;let n=[sg*dz/ln,0,-sg*dx/ln];
      if(k!==1){const e1=sub(V[1],V[0]),e2=sub(V[3],V[0]);let nn=nrm(crs(e1,e2));if(dot(nn,n)<0)nn=nn.map(v=>-v);n=nn}
      out.push({V,n,col:p.col,wall:true,bandH:p.bands,emit:p.emit,lit:p.lit,grain:p.grain,seed:i*7+(p.y0|0)})}
    if(p.cap!==false&&k>0.001)out.push({V:top.map(([x,z])=>[x,p.y1,z]),n:[0,1,0],col:p.capCol||p.col,cap:true,grain:p.grain,seed:91});
    if(p.bot)out.push({V:P.map(([x,z])=>[x,p.y0,z]).reverse(),n:[0,-1,0],col:p.col});
    return out}
  function prep(model){if(model._polys)return model;model.parts.forEach(p=>{p._polys=partPolys(p);let lo=1e9,hi=-1e9;p._polys.forEach(q=>q.V.forEach(v=>{lo=Math.min(lo,v[1]);hi=Math.max(hi,v[1])}));p._lo=lo;p._hi=hi});
    model._polys=true;model._h=Math.max(...model.parts.map(p=>p._hi));return model}
  const height=m=>prep(m)._h;
  /* local -> mundo */
  const xf=(o)=>{const [px,py,pz]=o.pos||[0,0,0],s=o.s??1,cy=Math.cos(o.yaw||0),sy=Math.sin(o.yaw||0);return {p:v=>[px+(v[0]*cy+v[2]*sy)*s,py+v[1]*s,pz+(-v[0]*sy+v[2]*cy)*s],n:v=>[v[0]*cy+v[2]*sy,v[1],-v[0]*sy+v[2]*cy],s}};
  const L0=()=>W3D.L0;
  function faceList(c,part,T,o){const out=[],L=L0();
    for(const f of part._polys){const V=f.V.map(T.p),n=T.n(f.n),two=f.two,cen=V.reduce((s,v)=>[s[0]+v[0]/V.length,s[1]+v[1]/V.length,s[2]+v[2]/V.length],[0,0,0]),toE=sub(c.eye,cen);
      let n2=n;if(dot(n,toE)<=0){if(!f.two)continue;n2=n.map(v=>-v)}let q=V.map(c.P);if(q.some(p=>!isFinite(p[0]))){if(c.mirror)continue;q=W3D.clipPoly(c,V);if(q.length<3||q.some(p=>!isFinite(p[0])))continue}
      const hv=nrm(L.map((v,i)=>v+nrm(toE)[i])),dif=Math.max(0,dot(n2,L)),spec=Math.pow(Math.max(0,dot(n2,hv)),o.shin??24)*(o.spec??.25);
      out.push({q,V,depth:f.under?1e15+f.under:dot(sub(cen,c.eye),c.fw),fd:dot(sub(cen,c.eye),c.fw),shade:f.emit?1:.34+.66*dif,spec:f.emit?0:spec,col:o.color&&!f.emit&&!f.keep?o.color:(f.col||'#b9c4d2'),emit:f.emit,wall:f.wall,cap:f.cap,bandH:f.bandH,lit:f.lit,seed:f.seed,grain:f.grain,n})}
    return out}
  function paint(ctx,F,c,o){const fogC=hex(o.fog||'#0b1020'),fd=o.fogStart??6,fr=o.fogRange??30,wire=o.wire??.22;
    for(const f of F){const [r,g,b]=hex(f.col),k=f.shade,fogk=o.fogK!=null?o.fogK:clamp(((f.fd??f.depth)/c.dist-fd)/fr),mix=(v,i)=>Math.round(lerp(Math.min(255,v*k+255*f.spec),fogC[i],fogk));
      ctx.save();ctx.fillStyle=`rgb(${mix(r,0)},${mix(g,1)},${mix(b,2)})`;ctx.beginPath();f.q.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();
      ctx.lineJoin='round';ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1;ctx.stroke();
      if(f.emit){ctx.shadowColor=f.col;ctx.shadowBlur=12;ctx.fill()}
      /* faixas de andares (vidro) e janelas acesas nas paredes altas */
      if(f.wall&&f.bandH&&f.V[2][1]-f.V[0][1]>0){const y0=f.V[0][1],y1=f.V[3][1],n=Math.floor((y1-y0)/f.bandH),pxH=Math.abs(f.q[3][1]-f.q[0][1]);
        if(n>0&&pxH/n>2.2){ctx.strokeStyle=`rgba(10,16,30,${.35*(1-fogk)})`;ctx.lineWidth=1;ctx.beginPath();for(let i=1;i<=n;i++){const u=i/((y1-y0)/f.bandH),A=lerp2(f.q[0],f.q[3],u),B=lerp2(f.q[1],f.q[2],u);ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1])}ctx.stroke()}
        if(f.lit&&n>0){const R=FX.rng(f.seed+11);ctx.fillStyle=`rgba(255,214,140,${.75*(1-fogk)})`;ctx.shadowColor='#ffd68c';ctx.shadowBlur=6;
          for(let i=0;i<n;i++){if(R()>f.lit)continue;const u0=i/((y1-y0)/f.bandH),u1=(i+.45)/((y1-y0)/f.bandH),s0=R()*.8,s1=s0+.05+R()*.15;const P1=bil(f.q,s0,u0),P2=bil(f.q,s1,u0),P3=bil(f.q,s1,u1),P4=bil(f.q,s0,u1);
            ctx.beginPath();ctx.moveTo(P1[0],P1[1]);ctx.lineTo(P2[0],P2[1]);ctx.lineTo(P3[0],P3[1]);ctx.lineTo(P4[0],P4[1]);ctx.fill()}}}
      /* textura granulada (cristais de açúcar): pontos claros e escuros espalhados na face */
      if(f.grain&&f.q.length===4){const R=FX.rng(f.seed||5),A=Math.abs((f.q[1][0]-f.q[0][0])*(f.q[3][1]-f.q[0][1])-(f.q[3][0]-f.q[0][0])*(f.q[1][1]-f.q[0][1])),nG=Math.min(900,Math.round(A/90*f.grain));
        for(let i=0;i<nG;i++){const P2=bil(f.q,R(),R()),l=R();ctx.fillStyle=l>.5?`rgba(255,255,255,${.5*(1-fogk)})`:`rgba(90,95,110,${.35*(1-fogk)})`;const z=1+R()*2.2;ctx.fillRect(P2[0],P2[1],z,z)}}
      if(wire>0&&!f.emit){ctx.shadowBlur=o.wireGlow||0;ctx.shadowColor=o.wireCol||C.cyan;ctx.strokeStyle=FX.rgba(o.wireCol||C.cyan,wire*(1-fogk));ctx.lineWidth=1.2;ctx.stroke()}
      ctx.restore()}}
  const lerp2=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];
  const bil=(q,s,u)=>{const A=lerp2(q[0],q[1],s),B=lerp2(q[3],q[2],s);return lerp2(A,B,u)};
  function draw(ctx,c,model,o={}){prep(model);const T=xf(o);ctx.save();ctx.globalAlpha*=o.a??1;
    if(model.stack){/* camadas: acima do olho de cima para baixo, abaixo do olho de baixo para cima, a do olho por último */
      const ey=(c.mirror?-c.eye[1]:c.eye[1]),py=(o.pos||[0,0,0])[1],s=T.s,parts=model.parts.map(p=>({p,lo:py+p._lo*s,hi:py+p._hi*s}));
      const below=parts.filter(q=>q.hi<=ey).sort((a,b)=>a.lo-b.lo),above=parts.filter(q=>q.lo>=ey).sort((a,b)=>b.lo-a.lo),mid=parts.filter(q=>q.lo<ey&&q.hi>ey);
      for(const q of [...above,...below,...mid]){const F=faceList(c,q.p,T,o);F.sort((a,b)=>((a.cap?1:0)-(b.cap?1:0))||(b.depth-a.depth));paint(ctx,F,c,o)}}
    else{const F=[];model.parts.forEach(p=>F.push(...faceList(c,p,T,o)));F.sort((a,b)=>b.depth-a.depth);paint(ctx,F,c,o)}
    ctx.restore()}
  function shadow(ctx,c,model,o={}){prep(model);const T=xf(o);model.parts.forEach(p=>{const V=[];p._polys.forEach(f=>f.V.forEach(v=>V.push(T.p(v))));W3D.shadow(ctx,c,V,{a:o.a??.45,noBlur:true})})}
  /* reflexo no piso + sombra + modelo */
  function world(ctx,c,model,o={}){const m=W3D.mirror(c);W3D.layer(ctx,2,g=>draw(g,m,model,{...o,wire:0}),{a:.18*(o.a??1),slot:3});shadow(ctx,c,model,{...o,a:.4*(o.a??1)});
    if(o.blur>0)W3D.layer(ctx,o.blur,g=>draw(g,c,model,o),{slot:4});else draw(ctx,c,model,o)}

  /* ---------- modelos ---------- */
  const SKIN='#c8b6a2',CLOTH='#7f93ad',STONE='#c9ccc6',CONC='#a9b3bf',GLASS='#9fb4cc',ROOF='#8a5d4c',WALL='#d9d2c3',WIN='#ffcf7a';
  /* pessoa de 1,75 m: membros e tronco arredondados (prismas de 8 lados), olhando para +z */
  const oct=(r,cx,cz,sx=1,sz=1)=>ngon(8,r,0,0,Math.PI/8).map(([x,z])=>[cx+x*sx,cz+z*sz]);
  const person={parts:[
    {poly:oct(.075,-.1,.03,1,1.6),y0:0,y1:.07,col:'#2a2f3a'},{poly:oct(.075,.1,.03,1,1.6),y0:0,y1:.07,col:'#2a2f3a'},
    {poly:oct(.06,-.1,0),y0:.07,y1:.5,k:1.25,col:'#34425c'},{poly:oct(.075,-.1,0),y0:.5,y1:.9,k:1.15,col:'#34425c'},
    {poly:oct(.06,.1,0),y0:.07,y1:.5,k:1.25,col:'#34425c'},{poly:oct(.075,.1,0),y0:.5,y1:.9,k:1.15,col:'#34425c'},
    {poly:oct(.19,0,0,1,.62),y0:.88,y1:1.05,k:1.02,col:CLOTH},{poly:oct(.195,0,0,1,.62),y0:1.05,y1:1.4,k:1.1,col:CLOTH},{poly:oct(.215,0,0,1,.6),y0:1.4,y1:1.47,k:.55,col:CLOTH},
    {poly:oct(.045,-.25,0),y0:.86,y1:1.42,k:1.25,col:CLOTH},{poly:oct(.045,.25,0),y0:.86,y1:1.42,k:1.25,col:CLOTH},
    {sph:[-.25,.82,0],r:.045,col:SKIN,seg:6},{sph:[.25,.82,0],r:.045,col:SKIN,seg:6},
    {poly:oct(.05,0,0),y0:1.45,y1:1.54,col:SKIN},{sph:[0,1.635,.01],r:.1,sy:1.18,col:SKIN,seg:10}]};
  /* sobrado de 2 andares: corpo, telhado de duas águas, porta e janelas acesas */
  const house=(()=>{const w=9,d=8,h=5.6,top=7.5,F=[],z=d/2+.03,win=(x0,y0,ww,hh)=>F.push([[x0,y0,z],[x0+ww,y0,z],[x0+ww,y0+hh,z],[x0,y0+hh,z]]);
    win(-3.4,3.4,1.5,1.3);win(-.75,3.4,1.5,1.3);win(1.9,3.4,1.5,1.3);win(-3.4,.9,1.5,1.3);win(1.9,.9,1.5,1.3);
    const roof=[[[-w/2-.4,h,d/2+.4],[w/2+.4,h,d/2+.4],[w/2+.4,top,0],[-w/2-.4,top,0]],[[w/2+.4,h,-d/2-.4],[-w/2-.4,h,-d/2-.4],[-w/2-.4,top,0],[w/2+.4,top,0]],
      [[-w/2,h,d/2],[-w/2,top,0],[-w/2,h,-d/2]],[[w/2,h,-d/2],[w/2,top,0],[w/2,h,d/2]]];
    return {parts:[{poly:rect(-w/2,-d/2,w/2,d/2),y0:0,y1:h,col:WALL,cap:false},{faces:roof.slice(0,2),col:ROOF,center:[0,h,0]},{faces:roof.slice(2),col:WALL,center:[0,h,0]},
      {faces:F,col:WIN,emit:true},{faces:[[[-.55,0,z],[.55,0,z],[.55,2.2,z],[-.55,2.2,z]]],col:'#5a4032'},{poly:rect(2.2,-2.6,3.1,-1.7),y0:h,y1:top+.6,col:'#8d7f72'}]}})();
  /* Cristo Redentor: pedestal de 8 m, estátua de 30 m, braços de 28 m */
  const cristo=(()=>{const B=8,ya=B+23.2,yb=ya+1.5,dr=(x0,x1,ylo,z)=>[[x0,ya,z],[x1,ya,z],[x0+(x1-x0)*.12,ylo,z]];return {parts:[
    {poly:rect(-4.6,-4.6,4.6,4.6),y0:0,y1:1,col:STONE},{poly:rect(-3.7,-3.7,3.7,3.7),y0:1,y1:B-.6,k:.94,col:STONE},{poly:rect(-3.9,-3.9,3.9,3.9),y0:B-.6,y1:B,col:STONE},
    {poly:ngon(12,3.1,0,0,.1).map(([x,z])=>[x,z*.8]),y0:B,y1:B+1.2,k:.92,col:STONE},
    {poly:ngon(12,2.85,0,0,.1).map(([x,z])=>[x,z*.78]),y0:B+1.2,y1:B+12,k:.86,col:STONE},
    {poly:ngon(12,2.45,0,0,.1).map(([x,z])=>[x,z*.78]),y0:B+12,y1:B+20.5,k:1.12,col:STONE},
    {poly:ngon(12,2.75,0,0,.1).map(([x,z])=>[x,z*.72]),y0:B+20.5,y1:yb,k:.92,col:STONE},
    /* braços abertos (28 m de ponta a ponta), mangas caídas e mãos */
    {poly:rect(-12.6,-.75,12.6,.75),y0:ya,y1:yb,col:STONE},
    {faces:[dr(-12,-2.2,ya-4.2,.7),dr(12,2.2,ya-4.2,.7),dr(-12,-2.2,ya-4.2,-.7).reverse(),dr(12,2.2,ya-4.2,-.7).reverse(),
      [[-12,ya,.7],[-12,ya,-.7],[-10.8,ya-4.2,-.7],[-10.8,ya-4.2,.7]],[[12,ya,-.7],[12,ya,.7],[10.8,ya-4.2,.7],[10.8,ya-4.2,-.7]],
      [[-10.8,ya-4.2,.7],[-10.8,ya-4.2,-.7],[-2.2,ya,-.7],[-2.2,ya,.7]],[[10.8,ya-4.2,-.7],[10.8,ya-4.2,.7],[2.2,ya,.7],[2.2,ya,-.7]]],col:STONE,center:[0,ya-1.4,0]},
    {poly:rect(-14,-.45,-12.6,.45),y0:ya+.1,y1:yb-.1,col:STONE},{poly:rect(12.6,-.45,14,.45),y0:ya+.1,y1:yb-.1,col:STONE},
    {poly:ngon(8,.7),y0:yb,y1:yb+.9,col:STONE},{sph:[0,yb+2.45,.15],r:1.45,sy:1.25,col:STONE,seg:12}]}})();
  /* Burj Khalifa: planta em Y (três asas a 120°), recuos em espiral, núcleo e agulha até 828 m */
  const burj=(()=>{const hw=16,parts=[],dir=k=>{const a=Math.PI/2+k*TAU/3;return [Math.cos(a),Math.sin(a)]},Lmax=64,Lmin=13,NS=9,step=64;
    const Y=Ls=>{const P=[];for(let k=0;k<3;k++){const [dx,dz]=dir(k),nx=-dz,nz=dx,L=Ls[k],ri=hw/Math.sin(Math.PI/3),a0=Math.PI/2+k*TAU/3-Math.PI/3,a1=a0+TAU/3;
      P.push([ri*Math.cos(a0),ri*Math.sin(a0)]);P.push([dx*L-nx*hw,dz*L-nz*hw]);P.push([dx*L+nx*hw,dz*L+nz*hw])}return P};
    const cuts=[];for(let k=0;k<3;k++)for(let m=1;m<=NS;m++)cuts.push(m*step+k*step/3-20);cuts.sort((a,b)=>a-b);
    const len=(k,yy)=>{let n=0;for(let m=1;m<=NS;m++)if(m*step+k*step/3-20<=yy)n++;return lerp(Lmax,Lmin,n/NS)};
    const ys=[0,...cuts];ys.forEach((y0,i)=>{const y1=i<ys.length-1?ys[i+1]:y0+30;parts.push({poly:Y([0,1,2].map(k=>len(k,y0+.1))),y0,y1,col:GLASS,bands:8,lit:.12})});
    let yy=ys[ys.length-1]+30;[[13,40],[11.5,40],[10,36],[8.5,34]].forEach(([r,h])=>{parts.push({poly:ngon(6,r,0,0,Math.PI/6),y0:yy,y1:yy+h,k:.93,col:GLASS,bands:8,lit:.1});yy+=h});
    parts.push({poly:ngon(6,7,0,0,Math.PI/6),y0:yy,y1:828,k:.06,col:'#c3cfdc',cap:false});return {parts,stack:true}})();
  /* Empire State: base larga, recuos e antena (443 m) */
  const empire={parts:[[61,0,25],[51,25,85],[44,85,320],[34,320,340],[26,340,365],[16,365,381],[8,381,400]].map(([w,y0,y1],i)=>({poly:rect(-w/2,-w*.62/2,w/2,w*.62/2),y0,y1,col:'#b7b0a2',bands:4,lit:.06})).concat([{poly:ngon(6,2.5),y0:400,y1:443,k:.1,col:'#c9c2b4',cap:false}]),stack:true};
  /* pessoa simplificada (multidões): pernas, tronco e cabeça; cor da roupa por semente */
  const PAL=['#5e7fa8','#a8635e','#6a9a72','#b49a5a','#8a6aa8','#4f5d75','#c07a4f','#3f7f86'];
  const personLow=k=>({parts:[{poly:rect(-.17,-.09,.17,.09),y0:0,y1:.86,k:1.1,col:'#2d3446'},{poly:rect(-.21,-.12,.21,.12),y0:.86,y1:1.45,k:1.08,col:PAL[k%PAL.length]},{poly:ngon(6,.1),y0:1.47,y1:1.73,k:.8,col:SKIN}]});
  const LOW=Array.from({length:8},(_,k)=>personLow(k));
  /* cubo de açúcar (1,6 cm), granulado */
  const sugar=(s=.016)=>({parts:[{poly:rect(-s/2,-s/2,s/2,s/2),y0:0,y1:s,col:'#f1eee6',grain:1}]});
  /* estádio oval (tipo Maracanã: 317 × 279 m por fora, arquibancada que sobe para fora, cobertura em anel e campo de 110 × 75 m) */
  const stadium=(()=>{const M=48,ax=158,az=139,ix=78,iz=60,F=[],R=[],G=[],e=(a,rx,rz)=>[Math.cos(a)*rx,Math.sin(a)*rz];
    for(let i=0;i<M;i++){const a0=i/M*TAU,a1=(i+1)/M*TAU,[x0,z0]=e(a0,ix,iz),[x1,z1]=e(a1,ix,iz),[X0,Z0]=e(a0,ax,az),[X1,Z1]=e(a1,ax,az);
      F.push([[x0,3,z0],[x1,3,z1],[X1,30,Z1],[X0,30,Z0]]);F.push([[X0,30,Z0],[X1,30,Z1],[X1,0,Z1],[X0,0,Z0]]);F.push([[x1,3,z1],[x0,3,z0],[x0,0,z0],[x1,0,z1]]);
      const [r0x,r0z]=e(a0,ax-4,az-4),[r1x,r1z]=e(a1,ax-4,az-4),[s0x,s0z]=e(a0,ax-42,az-38),[s1x,s1z]=e(a1,ax-42,az-38);R.push([[s0x,34,s0z],[s1x,34,s1z],[r1x,36,r1z],[r0x,36,r0z]])}
    const pitch={faces:[[[-55,.05,37.5],[55,.05,37.5],[55,.05,-37.5],[-55,.05,-37.5]]],col:'#2e6b3c',two:1,under:2},lines=[];const ln=(x0,z0,x1,z1,w=.6)=>{const dx=x1-x0,dz=z1-z0,l=Math.hypot(dx,dz),nx=-dz/l*w/2,nz=dx/l*w/2;lines.push([[x0+nx,.1,z0+nz],[x1+nx,.1,z1+nz],[x1-nx,.1,z1-nz],[x0-nx,.1,z0-nz]])};
    ln(-55,37.5,55,37.5);ln(55,37.5,55,-37.5);ln(55,-37.5,-55,-37.5);ln(-55,-37.5,-55,37.5);ln(0,37.5,0,-37.5);for(let i=0;i<24;i++){const a0=i/24*TAU,a1=(i+1)/24*TAU;ln(Math.cos(a0)*9.15,Math.sin(a0)*9.15,Math.cos(a1)*9.15,Math.sin(a1)*9.15)}
    ln(-55,20,-38.5,20);ln(-38.5,20,-38.5,-20);ln(-38.5,-20,-55,-20);ln(55,20,38.5,20);ln(38.5,20,38.5,-20);ln(38.5,-20,55,-20);
    const ground={faces:[Array.from({length:32},(_,i)=>[Math.cos(i/32*TAU)*(ix+1),.02,Math.sin(i/32*TAU)*(iz+1)])],col:'#245a31',two:1,under:3};
    return {parts:[ground,pitch,{faces:lines,col:'#e8efe6',emit:true,two:1,under:1},{faces:F,col:'#8e99a8'},{faces:R,col:'#d9dee6',two:1}],flat:true}})();
  /* caixa genérica (w × h × d, base no chão, centrada em x e z) */
  const box=(w,h,d,col,o={})=>({parts:[{poly:rect(-w/2,-d/2,w/2,d/2),y0:o.y0||0,y1:(o.y0||0)+h,col,grain:o.grain}]});
  /* fio de cabelo deitado ao longo de z (diâmetro em metros) */
  const hair=(dia=7e-5,len=.002)=>({parts:[{faces:Array.from({length:12},(_,i)=>{const a0=i/12*TAU,a1=(i+1)/12*TAU,r=dia/2,P=(a,z)=>[Math.cos(a)*r,r+Math.sin(a)*r,z];return [P(a0,-len/2),P(a1,-len/2),P(a1,len/2),P(a0,len/2)]}),col:'#4a3426',center:[0,dia/2,0]}]});
  /* grão de areia: esfera irregular */
  const rock=(r=3e-4,seed=3)=>{const R=FX.rng(seed),nl=10,nt=7,off=[];for(let i=0;i<=nl;i++)for(let j=0;j<=nt;j++)off.push(1+(R()-.5)*.38);const g=(i,j)=>off[(i%nl)*(nt+1)+j],F=[];
    const pt=(i,j)=>{const th=i/nl*TAU,ph=-Math.PI/2+j/nt*Math.PI,k=r*(j===0||j===nt?1:g(i,j));return [Math.cos(ph)*Math.cos(th)*k*1.15,r+Math.sin(ph)*k*.85,Math.cos(ph)*Math.sin(th)*k]};
    for(let i=0;i<nl;i++)for(let j=0;j<nt;j++)F.push([pt(i,j),pt(i,j+1),pt(i+1,j+1),pt(i+1,j)]);return {parts:[{faces:F,col:'#c9a877',center:[0,r,0]}]}};
  /* ervilha */
  const pea=(r=.0035)=>({parts:[{sph:[0,r,0],r,col:'#6fae4f',seg:16}]});
  /* régua (barra) com marcas em mm: modelo + desenho das marcas */
  const rulerBar=(len=.06,w=.012,th=.0008)=>({parts:[{poly:rect(-len/2,-w/2,len/2,w/2),y0:0,y1:th,col:'#d9cfb4'}]});
  function rulerTicks(ctx,c,o={}){const len=o.len??.06,w=o.w??.012,th=o.th??.0008,[px,py,pz]=o.pos||[0,0,0],x0=px-len/2;ctx.save();ctx.globalAlpha*=o.a??1;ctx.strokeStyle='rgba(30,30,40,.85)';
    for(let i=0;i<=Math.round(len*1000);i++){const x=x0+i/1000,k=i%10===0?.45:i%5===0?.32:.2,A=c.P([x,py+th+1e-5,pz+w/2]),B=c.P([x,py+th+1e-5,pz+w/2-w*k]);if(!isFinite(A[0])||!isFinite(B[0]))continue;ctx.lineWidth=i%10===0?1.8:1;ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke();
      if(i%10===0&&o.numbers!==false){const Q=c.P([x,py+th+1e-5,pz+w/2-w*.66]);if(isFinite(Q[0]))txt(ctx,String(i/10+(o.from||0)),Q[0],Q[1]+6,{font:F.mono,size:o.size||18,color:'#1e1e28'})}}ctx.restore()}
  /* multidão vista de cima como textura (cabeças coloridas a cada 0,7 m) — para escalas em que pessoas viram pontos */
  let CP=null;function carpet(ctx,o){const mpp=o.mpp,a=o.a??1;if(a<=0)return;if(!CP){const c=document.createElement('canvas'),n=16,sz=8;c.width=c.height=n*sz;const g=c.getContext('2d'),R=FX.rng(21);g.fillStyle='#1a2030';g.fillRect(0,0,c.width,c.height);
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=i*sz+sz/2+(R()-.5)*3,y=j*sz+sz/2+(R()-.5)*3;g.fillStyle=PAL[Math.floor(R()*PAL.length)];g.beginPath();g.arc(x,y,2.6,0,TAU);g.fill();g.fillStyle=SKIN;g.beginPath();g.arc(x+.3,y-.3,1.3,0,TAU);g.fill()}CP=c}
    const tilePx=11.2/mpp,k=tilePx/CP.width,[x0,y0,x1,y1]=o.rect||[0,0,W,H];ctx.save();ctx.globalAlpha*=a;ctx.beginPath();ctx.rect(x0,y0,x1-x0,y1-y0);ctx.clip();
    {const kk=Math.max(tilePx,9)/CP.width,pat=ctx.createPattern(CP,'repeat');pat.setTransform(new DOMMatrix([kk,0,0,kk,o.cx??W/2,o.cy??H/2]));ctx.fillStyle=pat;ctx.fillRect(x0,y0,x1-x0,y1-y0)}ctx.restore()}
  return {draw,shadow,world,height,person,house,cristo,burj,empire,prep,personLow:k=>LOW[k%LOW.length],sugar,stadium,box,hair,rock,pea,rulerBar,rulerTicks,carpet}})();
