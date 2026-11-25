/* ---------- W3D: mundo 3D com câmera de verdade, luz, sombra e piso (sempre injetado) ----------
   Coordenadas: x ao longo da cena, y para cima, z em profundidade. Unidades livres (ex.: metros).
   W3D.cam({target:[x,y,z],dist,yaw,pitch,fov,cx,cy})  câmera que olha para o alvo; devolve {P(p)->[X,Y,prof], eye, f, dist}
     yaw gira em volta do eixo y (0 = olhando de +z para -z), pitch inclina para baixo (rad). fov em rad (vertical).
   W3D.boxFaces(c,{p0,size:[sx,sy,sz],rot,pivot,color,edge,light,a,tag})  faces de uma caixa (base em p0, rot em torno de z no pivô)
   W3D.draw(ctx,faces)  pinta faces de várias caixas ordenadas por profundidade (pintor)
   W3D.shadow(ctx,c,verts,{light,a})  sombra projetada no piso (y=0)
   W3D.floor(ctx,c,{color,grid:true,range})  piso escuro com grade cujo passo acompanha a escala (1, 10, 100...)
   W3D.billboard(ctx,c,[x,0,z],altura,desenho,{a})  silhueta 2D de pé no piso, escalada pela perspectiva; desenho(ctx,x,yBase,alturaPx)
   W3D.sil.person / house / cristo / empire / tower  silhuetas prontas para escala (contorno + preenchimento suave)
   W3D.rtile(c,{x,t,h,w,r,rot,pivot,color,deco})  peça com cantos arredondados, especular; W3D.draw2(ctx,faces,c,{fog}) pinta com névoa e chanfro
   W3D.mirror(c)  câmera espelhada no piso (reflexo)   W3D.logRuler(ctx,x,y0,y1,valor,{min,max})  régua logarítmica com marcador
   W3D.chain({n,h0,ratio,gap,thick,width,times,lastDur})  fila de dominós que crescem; .tilt(i,t) ângulo de cada peça no tempo; .boxes(t) */
const W3D=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
    nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  function cam(o){const T=o.target||[0,0,0],d=o.dist||10,yaw=o.yaw??0,pitch=o.pitch??.25,cx=o.cx??W/2,cy=o.cy??H/2,f=(H/2)/Math.tan((o.fov??.9)/2);
    const eye=[T[0]+d*Math.sin(yaw)*Math.cos(pitch),T[1]+d*Math.sin(pitch),T[2]+d*Math.cos(yaw)*Math.cos(pitch)];
    const fw=nrm(sub(T,eye)),rt=nrm(crs(fw,[0,1,0])),up=crs(rt,fw),near=d*.02;
    const P=p=>{const v=sub(p,eye),z=dot(v,fw);if(z<near)return [NaN,NaN,z];return [cx+f*dot(v,rt)/z,cy-f*dot(v,up)/z,z]};
    return {P,eye,f,dist:d,fw,rt,up,T,near}}
  const L0=nrm([-.45,.8,.55]);
  /* caixa com base apoiada em p0 (canto de trás-baixo-esquerdo), girada de 'rot' em torno do eixo z que passa pelo pivô [x,y] */
  function boxVerts(o){const [x0,y0,z0]=o.p0,[sx,sy,sz]=o.size,r=o.rot||0,pv=o.pivot||[x0+sx,y0],c=Math.cos(-r),s=Math.sin(-r),V=[];
    for(const dx of [0,sx])for(const dy of [0,sy])for(const dz of [0,sz]){let x=x0+dx-pv[0],y=y0+dy-pv[1];V.push([pv[0]+x*c-y*s,pv[1]+x*s+y*c,z0+dz])}return V}
  const FACES=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
  function boxFaces(c,o){const V=boxVerts(o),Q=V.map(c.P),out=[],light=o.light||L0,base=o.color||'#ece6d6';
    FACES.forEach((f,k)=>{const a=V[f[0]],b=V[f[1]],d=V[f[3]],n=nrm(crs(sub(b,a),sub(d,a))),cen=f.reduce((s,i)=>[s[0]+V[i][0]/4,s[1]+V[i][1]/4,s[2]+V[i][2]/4],[0,0,0]);
      if(dot(n,sub(c.eye,cen))<=0)return;const q=f.map(i=>Q[i]);if(q.some(p=>!isFinite(p[0])))return;
      const lam=.38+.62*Math.max(0,dot(n,light));out.push({q,depth:dot(sub(cen,c.eye),c.fw),shade:lam,color:base,edge:o.edge,a:o.a??1,face:k,V:f.map(i=>V[i]),n,tag:o.tag,deco:o.deco})});
    return {faces:out,verts:V}}
  const hex=c=>{const n=parseInt(c.slice(1,7),16);return [n>>16&255,n>>8&255,n&255]};
  function draw(ctx,F,c){F.sort((a,b)=>b.depth-a.depth);for(const f of F){const [r,g,b]=hex(f.color),k=f.shade;ctx.save();ctx.globalAlpha*=f.a;
      ctx.fillStyle=`rgb(${Math.round(r*k)},${Math.round(g*k)},${Math.round(b*k)})`;ctx.beginPath();f.q.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();
      if(f.edge){ctx.strokeStyle=f.edge;ctx.lineWidth=1.5;ctx.shadowColor=f.edge;ctx.shadowBlur=10;ctx.stroke()}else{ctx.strokeStyle='rgba(10,13,22,.35)';ctx.lineWidth=1;ctx.stroke()}
      if(f.deco&&c)f.deco(ctx,f,c);ctx.restore()}}
  /* ---------- peça com cantos arredondados (retângulo arredondado extrudado) ----------
     o: {x,t,h,w,r(raio relativo à largura),rot,pivot,color,seg} -> {faces, verts, caps:[{frame}]}; caps têm moldura local para decorar (pips) */
  function rtile(c,o){const {x,t,h,w}=o,rr=Math.min(h,w)*(o.r??.12),sg=o.seg??5,rot=o.rot||0,pv=o.pivot||[x+t,0],cs=Math.cos(-rot),sn=Math.sin(-rot);
    const R=(p)=>{const X=p[0]-pv[0],Y=p[1]-pv[1];return [pv[0]+X*cs-Y*sn,pv[1]+X*sn+Y*cs,p[2]]};
    /* contorno no plano (y,z), sentido anti-horário visto de -x */
    const ring=[];const cn=[[rr,w/2-rr,0],[h-rr,w/2-rr,1],[h-rr,-w/2+rr,2],[rr,-w/2+rr,3]];
    cn.forEach(([cy,cz,k])=>{for(let i=0;i<=sg;i++){const a=(k*Math.PI/2)+Math.PI+i/sg*Math.PI/2;ring.push([cy+Math.cos(a)*rr,cz-Math.sin(a)*rr])}});
    const A=ring.map(([y,z])=>R([x,y,z])),B=ring.map(([y,z])=>R([x+t,y,z])),n=ring.length,out=[],light=o.light||L0,mk=(V,tag)=>{const q=V.map(c.P);if(q.some(p=>!isFinite(p[0])))return null;
      const e1=sub(V[1],V[0]),e2=sub(V[V.length>3?Math.floor(V.length/2):2],V[0]);let nn=nrm(crs(e1,e2));const cen=V.reduce((s,p)=>[s[0]+p[0]/V.length,s[1]+p[1]/V.length,s[2]+p[2]/V.length],[0,0,0]);
      return {q,V,n:nn,cen,tag}};
    const fx=(V,kind,extra={})=>{const f=mk(V,kind);if(!f)return;let nn=f.n;if(kind==='capA'&&dot(nn,[-1,0,0].map((v,i)=>i===0?-Math.cos(rot)*1:i===1?-Math.sin(-rot)*-1:0))<0)nn=nn;
      const toEye=sub(c.eye,f.cen);if(dot(nn,toEye)<0)nn=nn.map(v=>-v);
      /* face voltada para trás da peça? (normal geométrica para fora) */
      const out_n=kind==='side'?extra.out:kind==='capA'?R2([-1,0,0]):R2([1,0,0]);if(dot(out_n,toEye)<=0)return;
      const hv=nrm([light[0]+nrm(toEye)[0],light[1]+nrm(toEye)[1],light[2]+nrm(toEye)[2]]),dif=Math.max(0,dot(out_n,light)),spec=Math.pow(Math.max(0,dot(out_n,hv)),o.shin??28)*(o.spec??.35);
      out.push({q:f.q,depth:dot(sub(f.cen,c.eye),c.fw),shade:.36+.64*dif,spec,color:o.color||'#ece6d6',edge:o.edge,a:o.a??1,face:kind==='capA'?0:kind==='capB'?1:2,tag:o.tag,deco:kind!=='side'?o.deco:null,frame:kind!=='side'?{o:R([kind==='capA'?x:x+t,0,0]),u:R2([0,0,1]),v:R2([0,1,0]),h,w}:null,kind})};
    function R2(v){return [v[0]*cs-v[1]*sn,v[0]*sn+v[1]*cs,v[2]]}
    fx(A,'capA');fx(B.slice().reverse(),'capB');
    for(let i=0;i<n;i++){const j=(i+1)%n,my=(ring[i][0]+ring[j][0])/2,mz=(ring[i][1]+ring[j][1])/2,ty=ring[j][0]-ring[i][0],tz=ring[j][1]-ring[i][1],ln=Math.hypot(ty,tz)||1;
      /* normal para fora no plano (y,z): perpendicular ao segmento, apontando para longe do centro */
      let ny=tz/ln,nz=-ty/ln;if(ny*(my-h/2)+nz*mz<0){ny=-ny;nz=-nz}fx([A[i],A[j],B[j],B[i]],'side',{out:R2([0,ny,nz])})}
    return {faces:out,verts:A.concat(B)}}
  /* espelho no piso (y=0): mesma câmera, geometria refletida */
  function mirror(c){const P=p=>c.P([p[0],-p[1],p[2]]);return {...c,P,eye:[c.eye[0],-c.eye[1],c.eye[2]],mirror:true}}
  /* pintor com luz especular, névoa e realce de borda (chanfro) */
  function draw2(ctx,F,c,o={}){F.sort((a,b)=>b.depth-a.depth);const fogC=hex(o.fog||'#0b1020'),fd=o.fogStart??6,fr=o.fogRange??30;
    for(const f of F){const [r,g,b]=hex(f.color),k=f.shade,fogk=clamp((f.depth/c.dist-fd)/fr),mix=(v,i)=>Math.round(lerp(Math.min(255,v*k+255*f.spec),fogC[i],fogk));
      ctx.save();ctx.globalAlpha*=f.a;ctx.fillStyle=`rgb(${mix(r,0)},${mix(g,1)},${mix(b,2)})`;ctx.beginPath();f.q.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();
      if(f.kind!=='side'){ctx.lineWidth=Math.max(1,Math.hypot(f.q[0][0]-f.q[3][0],f.q[0][1]-f.q[3][1])*.25);ctx.strokeStyle=f.edge||`rgba(255,250,235,${.35*(1-fogk)})`;if(f.edge){ctx.shadowColor=f.edge;ctx.shadowBlur=14}ctx.stroke()}
      else{ctx.strokeStyle=`rgb(${mix(r,0)},${mix(g,1)},${mix(b,2)})`;ctx.lineWidth=1;ctx.stroke()}
      if(f.deco&&f.frame&&fogk<.9)f.deco(ctx,f,c,1-fogk);ctx.restore()}}
  /* camada desfocada: desenha numa tela auxiliar do tamanho do quadro e só então aplica o blur (evita camadas gigantes) */
  const LAY=[];function layer(ctx,px,fn,o={}){const k=o.slot??0;let c=LAY[k];if(!c){c=document.createElement('canvas');c.width=W;c.height=H;LAY[k]=c}
    const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.globalAlpha=1;g.filter='none';fn(g);ctx.save();ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha*=o.a??1;if(px>0)ctx.filter=`blur(${px}px)`;ctx.drawImage(c,0,0);ctx.restore()}
  /* régua logarítmica vertical (mm → km) com marcador */
  function logRuler(ctx,x,y0,y1,v,o={}){const lo=Math.log10(o.min??.001),hi=Math.log10(o.max??1000),Y=val=>lerp(y1,y0,(Math.log10(val)-lo)/(hi-lo)),a=o.a??1;if(a<=0)return;
    ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle='rgba(236,230,214,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y1);ctx.stroke();
    [[.001,'1 mm'],[.01,'1 cm'],[.1,'10 cm'],[1,'1 m'],[10,'10 m'],[100,'100 m'],[1000,'1 km']].forEach(([val,s])=>{const y=Y(val);ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x+10,y);ctx.stroke();txt(ctx,s,x-18,y+7,{font:F.mono,size:20,color:C.dim,align:'right'})});
    for(let e=lo;e<hi;e++)for(let m=2;m<10;m++){const y=Y(m*Math.pow(10,e));ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.stroke()}
    const y=Y(clamp(v,o.min??.001,o.max??1000));ctx.fillStyle=C.gold;ctx.shadowColor=C.gold;ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(x+12,y);ctx.lineTo(x+30,y-10);ctx.lineTo(x+30,y+10);ctx.closePath();ctx.fill();ctx.restore()}
  /* casco convexo 2D (para a sombra) */
  function hull(P){P=P.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
    for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}for(const p of P.reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
    return lo.slice(0,-1).concat(up.slice(0,-1))}
  function shadow(ctx,c,V,o={}){const L=o.light||L0,G=V.map(p=>c.P([p[0]-L[0]*p[1]/L[1],0,p[2]-L[2]*p[1]/L[1]])).filter(p=>isFinite(p[0]));if(G.length<3)return;const h=hull(G);
    ctx.save();ctx.globalAlpha*=o.a??.55;ctx.fillStyle='#02040a';if(!o.noBlur)ctx.filter='blur(3px)';ctx.beginPath();h.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.restore()}
  /* recorte no plano da câmera (pontos atrás dela não projetam) */
  const camZ=(c,p)=>dot(sub(p,c.eye),c.fw);
  function clipSeg(c,a,b){const n=c.near*1.01,za=camZ(c,a),zb=camZ(c,b);if(za<n&&zb<n)return null;const cut=(p,q,zp,zq)=>{const u=(n-zp)/(zq-zp);return [p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u,p[2]+(q[2]-p[2])*u]};
    if(za<n)a=cut(a,b,za,zb);else if(zb<n)b=cut(b,a,zb,za);return [c.P(a),c.P(b)]}
  function clipPoly(c,pts){const n=c.near*1.01;let out=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],za=camZ(c,a),zb=camZ(c,b);
      if(za>=n)out.push(a);if((za>=n)!==(zb>=n)){const u=(n-za)/(zb-za);out.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u])}}return out.map(c.P)}
  /* piso: placa um pouco mais clara (onde as sombras aparecem) + grade em potências de 10 que acompanha a escala da câmera */
  function floor(ctx,c,o={}){const s=Math.pow(10,Math.floor(Math.log10(c.dist/2))),R=c.dist*(o.range??6),T=c.T;ctx.save();ctx.globalAlpha*=o.a??1;
    const Q=clipPoly(c,[[T[0]-R*3,0,T[2]-R*3],[T[0]+R*3,0,T[2]-R*3],[T[0]+R*3,0,T[2]+R*3],[T[0]-R*3,0,T[2]+R*3]]);
    if(Q.length>2){const hz=c.P([c.eye[0]+c.fw[0]*1e6,0,c.eye[2]+c.fw[2]*1e6]),g=ctx.createLinearGradient(0,isFinite(hz[1])?hz[1]:0,0,H);g.addColorStop(0,'rgba(20,30,52,0)');g.addColorStop(.3,'rgba(20,30,52,.55)');g.addColorStop(1,'rgba(26,38,64,.85)');
      ctx.fillStyle=g;ctx.beginPath();Q.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill()}
    for(const [st,al] of [[s,.14],[s*10,.26]]){const x0=Math.floor((T[0]-R)/st)*st,z0=Math.floor((T[2]-R)/st)*st;ctx.lineWidth=1.2;
      for(let x=x0;x<=T[0]+R;x+=st)seg(ctx,clipSeg(c,[x,0,T[2]-R],[x,0,T[2]+R]),al);for(let z=z0;z<=T[2]+R;z+=st)seg(ctx,clipSeg(c,[T[0]-R,0,z],[T[0]+R,0,z]),al)}
    ctx.restore()}
  function seg(ctx,S,al){if(!S)return;const [A,B]=S;ctx.strokeStyle=`rgba(98,208,234,${al})`;ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}
  function billboard(ctx,c,p,h,fn,o={}){const A=c.P(p),B=c.P([p[0],h,p[2]]);if(!isFinite(A[0])||!isFinite(B[0]))return;const hp=A[1]-B[1];if(hp<2)return;ctx.save();ctx.globalAlpha*=o.a??1;fn(ctx,A[0],A[1],hp);ctx.restore()}
  /* silhuetas (x central, y da base, altura em px) */
  const ink=(ctx,col)=>{ctx.fillStyle=FX.rgba(col||C.cyan,.16);ctx.strokeStyle=col||C.cyan;ctx.lineWidth=2.5;ctx.shadowColor=col||C.cyan;ctx.shadowBlur=10;ctx.lineJoin='round'};
  const sil={
    person(ctx,x,y,h,col){ink(ctx,col);const s=h;ctx.beginPath();ctx.arc(x,y-s*.9,s*.08,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-s*.13,y-s*.78);ctx.lineTo(x+s*.13,y-s*.78);ctx.lineTo(x+s*.17,y-s*.42);ctx.lineTo(x+s*.08,y-s*.42);ctx.lineTo(x+s*.08,y);ctx.lineTo(x-s*.08,y);ctx.lineTo(x-s*.08,y-s*.42);ctx.lineTo(x-s*.17,y-s*.42);ctx.closePath();ctx.fill();ctx.stroke()},
    house(ctx,x,y,h,col){ink(ctx,col);const w=h*.95;ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x-w/2,y-h*.62);ctx.lineTo(x,y-h);ctx.lineTo(x+w/2,y-h*.62);ctx.lineTo(x+w/2,y);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeRect(x-w*.32,y-h*.5,w*.2,h*.15);ctx.strokeRect(x+w*.12,y-h*.5,w*.2,h*.15);ctx.strokeRect(x-w*.32,y-h*.25,w*.2,h*.15);ctx.strokeRect(x+w*.1,y-h*.28,w*.18,h*.28)},
    cristo(ctx,x,y,h,col){ink(ctx,col);const p=h*.21,b=h-p;ctx.beginPath();ctx.moveTo(x-h*.07,y);ctx.lineTo(x-h*.05,y-p);ctx.lineTo(x+h*.05,y-p);ctx.lineTo(x+h*.07,y);ctx.closePath();ctx.fill();ctx.stroke();
      const t=y-p;ctx.beginPath();ctx.moveTo(x-h*.05,t);ctx.lineTo(x-h*.035,t-b*.68);ctx.lineTo(x-h*.37,t-b*.72);ctx.lineTo(x-h*.37,t-b*.79);ctx.lineTo(x-h*.04,t-b*.83);ctx.lineTo(x-h*.025,t-b*.9);ctx.lineTo(x+h*.025,t-b*.9);ctx.lineTo(x+h*.04,t-b*.83);ctx.lineTo(x+h*.37,t-b*.79);ctx.lineTo(x+h*.37,t-b*.72);ctx.lineTo(x+h*.035,t-b*.68);ctx.lineTo(x+h*.05,t);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(x,t-b*.95,h*.035,0,TAU);ctx.fill();ctx.stroke()},
    empire(ctx,x,y,h,col){ink(ctx,col);const w=h*.2,lv=[[1,0],[.8,.55],[.62,.66],[.46,.74],[.3,.8],[.16,.86],[.06,.9]];ctx.beginPath();ctx.moveTo(x-w/2,y);
      lv.forEach(([k,f],i)=>{ctx.lineTo(x-w/2*k,y-h*f);if(i<lv.length-1)ctx.lineTo(x-w/2*lv[i+1][0],y-h*f)});ctx.lineTo(x,y-h);for(let i=lv.length-1;i>=0;i--){const [k,f]=lv[i];if(i<lv.length-1)ctx.lineTo(x+w/2*lv[i+1][0],y-h*f);ctx.lineTo(x+w/2*k,y-h*f)}ctx.lineTo(x+w/2,y);ctx.closePath();ctx.fill();ctx.stroke()},
    tower(ctx,x,y,h,col){ink(ctx,col);const w=h*.12,st=[[1,0],[.86,.18],[.72,.34],[.58,.48],[.44,.6],[.3,.7],[.18,.78],[.06,.86]];ctx.beginPath();ctx.moveTo(x-w/2,y);
      st.forEach(([k,f])=>{ctx.lineTo(x-w/2*k,y-h*f);ctx.lineTo(x-w/2*k*.86,y-h*f)});ctx.lineTo(x,y-h);for(let i=st.length-1;i>=0;i--){const [k,f]=st[i];ctx.lineTo(x+w/2*k*.86,y-h*f);ctx.lineTo(x+w/2*k,y-h*f)}ctx.lineTo(x+w/2,y);ctx.closePath();ctx.fill();ctx.stroke()}};
  /* fila de dominós crescentes: peça i tem altura h0*ratio^i; times[i] = instante em que a peça i começa a cair */
  function chain(o){const n=o.n,h0=o.h0,r=o.ratio??1.5,gk=o.gap??.6,tk=o.thick??.16,wk=o.width??.5,P=[];let x=0;
    for(let i=0;i<n;i++){const h=h0*Math.pow(r,i),t=h*tk,g=h*gk;P.push({i,h,t,w:h*wk,x,gap:g,thc:Math.asin(Math.min(.99,g/h))});x+=t+g}
    const T=o.times;
    function tilt(i,t){const p=P[i],t0=T[i],t1=i<n-1?T[i+1]:t0+(T[i]-T[i-1])*1.3;if(t<=t0)return 0;
      if(i===n-1){const u=clamp((t-t0)/(o.lastDur||(t1-t0)*1.6));return u*u*Math.PI/2}
      if(t<=t1){const u=(t-t0)/(t1-t0);return p.thc*u*u}
      /* depois do contato, deita junto com a próxima até descansar sobre ela */
      const nx=tilt(i+1,t),lim=Math.min(1.35,p.thc+nx*.95);return Math.max(p.thc,lim)}
    function boxes(t,c,o2={}){return P.map(p=>({p0:[p.x,0,-p.w/2],size:[p.t,p.h,p.w],rot:tilt(p.i,t),pivot:[p.x+p.t,0],...(o2.style?o2.style(p):{})}))}
    return {P,tilt,boxes,length:x}}
  return {layer,cam,boxVerts,boxFaces,draw,draw2,rtile,mirror,logRuler,shadow,floor,billboard,sil,chain,clipSeg,clipPoly,L0};
})();
