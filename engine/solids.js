/* ---------- SOL: sólidos de geometria em 3D (vidro, líquido, fatias, pirâmides do cubo, discos, hipercubo) ----------
   Mesma câmera do W3D; desenho pelo LM. Unidades livres (ex.: R = 1).
   SOL.vessel(ctx,c,{shape,r,h,pos,level,a,liq,rim})  recipiente de vidro com líquido até 'level' (0..1 da altura)
       shape: 'cyl' (cilindro), 'cone' (taça: ponta para baixo), 'coneUp' (ponta para cima), 'hemi' (meia esfera, boca para cima)
   SOL.cone(r,h,{up,col,seg}) · SOL.cyl(r,h,{col,seg,y0}) · SOL.frustum(r0,r1,h,{y0,col})  modelos para LM.draw
   SOL.disc(ctx,c,[x,y,z],r,{fill,stroke,a,hole})  fatia horizontal (disco ou anel, com hole = raio interno)
   SOL.square(ctx,c,[x,y,z],lado,{fill,stroke,a})  fatia quadrada      SOL.poly(ctx,c,pontos,{fill,stroke,a,dash})
   SOL.pyramids(a)  as 3 pirâmides que dividem o cubo de aresta a a partir de um canto (modelos LM)
   SOL.starPyr(r,h,n)  pirâmide de base estrelada      SOL.stack(n,R,H)  pilha de n discos imitando o cone
   SOL.pour(ctx,[x0,y0],[x1,y1],t,{a,w,col})  jato de líquido (2D)      SOL.tesseract(ctx,cx,cy,s,t,{a,col})  hipercubo girando em 4D */
const SOL=(()=>{
  const ng=(n,r,ph=0)=>Array.from({length:n},(_,i)=>[r*Math.cos(ph+i/n*TAU),r*Math.sin(ph+i/n*TAU)]);
  const GLASS='#b8dcf0',LIQ='#e9b949';
  const cyl=(r,h,o={})=>({parts:[{poly:ng(o.seg||56,r),y0:o.y0||0,y1:(o.y0||0)+h,col:o.col||LIQ,cap:o.cap!==false}]});
  const frustum=(r0,r1,h,o={})=>{const e=1e-4;return {parts:[{poly:ng(o.seg||56,Math.max(e,r0)),y0:o.y0||0,y1:(o.y0||0)+h,k:Math.max(e,r1)/Math.max(e,r0),col:o.col||LIQ,cap:o.cap!==false&&r1>e}]}};
  const cone=(r,h,o={})=>o.up?frustum(r,1e-4,h,o):frustum(1e-4,r,h,o);
  function ring3(ctx,c,cx,cy,cz,r,o){ctx.beginPath();let pen=false;for(let k=0;k<=72;k++){const a=k/72*TAU,q=c.P([cx+r*Math.cos(a),cy,cz+r*Math.sin(a)]);if(!isFinite(q[0])){pen=false;continue}pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}}
  function vessel(ctx,c,o){const r=o.r??1,h=o.h??2,[px,py,pz]=o.pos||[0,0,0],lv=clamp(o.level??0),a=o.a??1,sh=o.shape||'cyl';if(a<=0)return;
    /* líquido */if(lv>.002){let m;if(sh==='cyl')m=cyl(r*.985,h*lv);else if(sh==='cone')m=frustum(1e-4,r*lv*.985,h*lv);else if(sh==='coneUp')m=frustum(r*.985,r*(1-lv)*.985,h*lv);
      else{const rr=r*.985,yy=h*lv;m={parts:[]};const N=12;for(let i=0;i<N;i++){const y0=yy*i/N,y1=yy*(i+1)/N,rad=y=>Math.sqrt(Math.max(0,rr*rr-(rr-y)*(rr-y)));m.parts.push({poly:ng(48,Math.max(1e-4,rad(y0))),y0,y1,k:Math.max(1e-4,rad(y1))/Math.max(1e-4,rad(y0)),col:o.liq||LIQ,cap:i===N-1})}}
      if(m.parts)m.parts.forEach(p=>p.col=o.liq||LIQ);LM.draw(ctx,c,m,{pos:[px,py,pz],wire:0,a:a*.88,shin:30,spec:.35})}
    /* vidro */let g;if(sh==='cyl')g=cyl(r,h,{col:GLASS,cap:false});else if(sh==='cone')g=frustum(1e-4,r,h,{col:GLASS,cap:false});else if(sh==='coneUp')g=frustum(r,1e-4,h,{col:GLASS,cap:false});else g=null;
    if(g)LM.draw(ctx,c,g,{pos:[px,py,pz],wire:0,a:a*.13,spec:.6});
    ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=o.rim||'rgba(236,240,246,.85)';ctx.lineWidth=2.4;ctx.shadowColor='#cfe8ff';ctx.shadowBlur=8;
    if(sh==='cyl'){ring3(ctx,c,px,py+h,pz,r);ctx.stroke();ring3(ctx,c,px,py,pz,r);ctx.globalAlpha*=.6;ctx.stroke()}
    else if(sh==='cone'){ring3(ctx,c,px,py+h,pz,r);ctx.stroke()}else if(sh==='coneUp'){ring3(ctx,c,px,py,pz,r);ctx.stroke()}else{ring3(ctx,c,px,py+h,pz,r);ctx.stroke()}
    /* contorno lateral (silhueta) */const sil=(y0,r0,y1,r1)=>{const T=c.rt;[-1,1].forEach(s=>{const A=c.P([px+T[0]*r0*s,py+y0,pz+T[2]*r0*s]),B=c.P([px+T[0]*r1*s,py+y1,pz+T[2]*r1*s]);if(isFinite(A[0])&&isFinite(B[0])){ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}})};
    ctx.globalAlpha=a*.85;if(sh==='cyl')sil(0,r,h,r);else if(sh==='cone')sil(0,0,h,r);else if(sh==='coneUp')sil(0,r,h,0);
    else{ctx.beginPath();let pen=false;for(let k=0;k<=40;k++){const th=Math.PI+k/40*Math.PI,T=c.rt,q=c.P([px+T[0]*r*Math.cos(th),py+h+r*Math.sin(th),pz+T[2]*r*Math.cos(th)]);if(!isFinite(q[0]))continue;pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}ctx.stroke()}
    ctx.restore()}
  function poly(ctx,c,P,o={}){const Q=P.map(c.P);if(Q.some(q=>!isFinite(q[0])))return;ctx.save();ctx.globalAlpha*=o.a??1;ctx.beginPath();Q.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();
    if(o.fill){ctx.fillStyle=o.fill;ctx.fill()}if(o.stroke){ctx.strokeStyle=o.stroke;ctx.lineWidth=o.lw||2.5;if(o.dash)ctx.setLineDash(o.dash);ctx.shadowColor=o.stroke;ctx.shadowBlur=o.glow??8;ctx.stroke()}ctx.restore()}
  function disc(ctx,c,p,r,o={}){const pts=k=>Array.from({length:72},(_,i)=>{const a=i/72*TAU;return c.P([p[0]+k*Math.cos(a),p[1],p[2]+k*Math.sin(a)])});const A=pts(r);if(A.some(q=>!isFinite(q[0])))return;ctx.save();ctx.globalAlpha*=o.a??1;ctx.beginPath();A.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();
    if(o.hole){const B=pts(o.hole);B.reverse().forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath()}
    if(o.fill){ctx.fillStyle=o.fill;ctx.fill('evenodd')}if(o.stroke){ctx.strokeStyle=o.stroke;ctx.lineWidth=o.lw||2.5;if(o.dash)ctx.setLineDash(o.dash);ctx.shadowColor=o.stroke;ctx.shadowBlur=o.glow??8;ctx.stroke()}ctx.restore()}
  const square=(ctx,c,p,s,o)=>poly(ctx,c,[[p[0]-s/2,p[1],p[2]-s/2],[p[0]+s/2,p[1],p[2]-s/2],[p[0]+s/2,p[1],p[2]+s/2],[p[0]-s/2,p[1],p[2]+s/2]],o);
  /* 3 pirâmides do cubo [0,a]³ com vértice comum em (0,a,0) (canto de cima); bases nas faces x=a, y=0 e z=a */
  function pyramids(a,cols){const O=[0,a,0],B=[[[a,0,0],[a,a,0],[a,a,a],[a,0,a]],[[0,0,0],[a,0,0],[a,0,a],[0,0,a]],[[0,0,a],[a,0,a],[a,a,a],[0,a,a]]];
    return B.map((q,k)=>{const F=[q,[O,q[0],q[1]],[O,q[1],q[2]],[O,q[2],q[3]],[O,q[3],q[0]]],cen=[(q[0][0]+q[1][0]+q[2][0]+q[3][0]+O[0])/5,(q[0][1]+q[1][1]+q[2][1]+q[3][1]+O[1])/5,(q[0][2]+q[1][2]+q[2][2]+q[3][2]+O[2])/5];
      return {parts:[{faces:F,col:(cols||['#e9b949','#62d0ea','#e8664c'])[k],center:cen}],dir:[[1,0,0],[0,-1,0],[0,0,1]][k]}})}
  function starPyr(r,h,n=5){const P=[];for(let i=0;i<2*n;i++){const rr=i%2?r*.45:r,a=-Math.PI/2+i/(2*n)*TAU;P.push([rr*Math.cos(a),rr*Math.sin(a)])}const A=[0,h,0],F=[];
    for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];F.push([[p[0],0,p[1]],[q[0],0,q[1]],A])}return {parts:[{faces:F,col:'#e9b949',center:[0,h*.3,0]},{faces:[P.map(([x,z])=>[x,0,z])],col:'#b8902f',two:1}]}}
  function stack(n,R,H){const parts=[];for(let k=0;k<n;k++){const r=R*(n-k)/n;parts.push({poly:ng(48,r),y0:H*k/n,y1:H*(k+1)/n,col:k%2?'#e9b949':'#d9a83c'})}return {parts,stack:true}}
  function pour(ctx,A,B,t,o={}){const a=o.a??1;if(a<=0)return;const w=o.w??10,col=o.col||LIQ;ctx.save();ctx.globalAlpha*=a;const mx=(A[0]+B[0])/2+(o.bend??60),my=Math.min(A[1],B[1])-(o.lift??40);
    const g=ctx.createLinearGradient(A[0],A[1],B[0],B[1]);g.addColorStop(0,FX.rgba(col,.95));g.addColorStop(1,FX.rgba(col,.75));ctx.strokeStyle=g;ctx.lineCap='round';ctx.shadowColor=col;ctx.shadowBlur=14;
    ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.quadraticCurveTo(mx,my,B[0],B[1]);ctx.stroke();ctx.lineWidth=w*.35;ctx.strokeStyle='rgba(255,250,230,.6)';ctx.stroke();
    for(let i=0;i<10;i++){const u=(t*1.7+i/10)%1,x=(1-u)*(1-u)*A[0]+2*u*(1-u)*mx+u*u*B[0],y=(1-u)*(1-u)*A[1]+2*u*(1-u)*my+u*u*B[1];ctx.fillStyle='rgba(255,246,220,.7)';ctx.beginPath();ctx.arc(x+Math.sin(i*7+t*9)*w*.3,y,w*.18,0,TAU);ctx.fill()}ctx.restore()}
  function tesseract(ctx,cx,cy,s,t,o={}){const V=[];for(let i=0;i<16;i++)V.push([i&1?1:-1,i&2?1:-1,i&4?1:-1,i&8?1:-1]);const a1=t*.5,a2=t*.31,c1=Math.cos(a1),s1=Math.sin(a1),c2=Math.cos(a2),s2=Math.sin(a2);
    const P=V.map(([x,y,z,w])=>{let X=x*c1-w*s1,W2=x*s1+w*c1;let Y=y*c2-z*s2,Z=y*s2+z*c2;const k=1/(2.6-W2*.9),k3=1/(3.2-Z*.6);return [cx+X*k*k3*s*2.4,cy+Y*k*k3*s*2.4,W2]});
    ctx.save();ctx.globalAlpha*=o.a??1;for(let i=0;i<16;i++)for(let b=0;b<4;b++){const j=i^(1<<b);if(j<i)continue;const w=(P[i][2]+P[j][2])/2;ctx.strokeStyle=FX.rgba(o.col||C.cyan,.35+.3*(w+1));ctx.lineWidth=2+w;ctx.shadowColor=o.col||C.cyan;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(P[i][0],P[i][1]);ctx.lineTo(P[j][0],P[j][1]);ctx.stroke()}
    P.forEach(p=>{ctx.fillStyle=o.col||C.cyan;ctx.beginPath();ctx.arc(p[0],p[1],4,0,TAU);ctx.fill()});ctx.restore()}
  return {vessel,cone,cyl,frustum,disc,square,poly,pyramids,starPyr,stack,pour,tesseract,LIQ,GLASS}})();
