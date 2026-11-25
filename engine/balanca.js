/* ---------- BAL: balança de pratos dourada em 3D (canvas), com braço que inclina ----------
   Feito para o Short "Qual é MAIS PESADO?" (projetos/balanca-sol, 15/11/2026). Unidades: altura do pivô ≈ 1,2; x para a direita, y para cima.
     const b=BAL.draw(ctx,{cx,cy,s,yaw,pitch,tilt,D})   desenha a balança inteira; cx,cy = ponto da tela onde fica o pé (y=0);
        s = px por unidade; tilt (rad) > 0 abaixa o prato da ESQUERDA; devolve {L:[x,y,esc],R:[x,y,esc]} = centro do topo de cada prato
        na tela (esc = px por unidade naquele ponto), para pôr os objetos em cima.
     BAL.tiltFor(mEsq,mDir,{max})  ângulo final pela razão das massas (log, com teto)
     BAL.swing(t,t0,alvo,de)       inclinação com balanço amortecido entre o ângulo "de" e o "alvo" a partir de t0
   Ouro com gradiente por face (luz de cima/esquerda), reflexo especular nas bordas. */
const BAL=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
    dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  const LIGHT=nrm([-.5,.8,.6]);
  const gold=(k,a=1)=>{k=clamp(k);const r=lerp(90,255,k),g=lerp(58,214,k),b=lerp(14,120,k*k);return `rgba(${r|0},${g|0},${b|0},${a})`};
  function cam(o){const yaw=o.yaw||0,pit=o.pitch??.22,D=o.D||7,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pit),sp=Math.sin(pit),Y0=o.look??.75;
    const P=p=>{let [x,y,z]=p;y-=Y0;const x1=x*cy+z*sy,z1=-x*sy+z*cy;const y2=y*cp-z1*sp,z2=y*sp+z1*cp;const k=D/(D-z2);return [o.cx+x1*o.s*k,o.cy-(y2+Y0*cp)*o.s*k,o.s*k,z2]};
    const eye=[Math.sin(yaw)*D*cp,Y0+D*sp,Math.cos(yaw)*D*cp];return {P,eye,o}}
  /* cilindro vertical (eixo y) de raio r entre y0 e y1 em (x,z): lateral + tampa de cima */
  function cyl(ctx,c,x,z,r,y0,y1,o={}){const n=36,top=[],bot=[];for(let i=0;i<n;i++){const a=i/n*TAU;top.push(c.P([x+r*Math.cos(a),y1,z+r*Math.sin(a)]));bot.push(c.P([x+r*Math.cos(a),y0,z+r*Math.sin(a)]))}
    /* lateral: faixas verticais com tom pela normal */for(let i=0;i<n;i++){const j=(i+1)%n,a=(i+.5)/n*TAU,nn=[Math.cos(a),0,Math.sin(a)],v=sub(c.eye,[x+r*nn[0],(y0+y1)/2,z+r*nn[2]]);if(dot(nn,v)<=0)continue;
      const k=.25+.75*Math.max(0,dot(nn,LIGHT))+.35*Math.pow(Math.max(0,dot(nn,nrm(v))),6);ctx.fillStyle=gold(k*(o.k??1));ctx.beginPath();ctx.moveTo(top[i][0],top[i][1]);ctx.lineTo(top[j][0],top[j][1]);ctx.lineTo(bot[j][0],bot[j][1]);ctx.lineTo(bot[i][0],bot[i][1]);ctx.closePath();ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1;ctx.stroke()}
    if(c.eye[1]>y1){const cc=c.P([x,y1,z]),g=ctx.createRadialGradient(cc[0]-r*cc[2]*.3,cc[1]-r*cc[2]*.1,0,cc[0],cc[1],r*cc[2]*1.05);g.addColorStop(0,gold(1));g.addColorStop(.6,gold(.75));g.addColorStop(1,gold(.5));
      ctx.fillStyle=g;ctx.beginPath();top.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill();
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(255,240,190,.55)';ctx.lineWidth=Math.max(1,cc[2]*.012);ctx.beginPath();top.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.stroke();ctx.restore()}}
  /* caixa orientada: centro, eixos u,v,w (vetores meia-extensão) */
  function box(ctx,c,cen,U,V,Wv){const C=[];for(const a of [-1,1])for(const b of [-1,1])for(const d of [-1,1])C.push([cen[0]+a*U[0]+b*V[0]+d*Wv[0],cen[1]+a*U[1]+b*V[1]+d*Wv[1],cen[2]+a*U[2]+b*V[2]+d*Wv[2]]);
    const F=[[0,1,3,2,[-1,0,0]],[4,6,7,5,[1,0,0]],[0,4,5,1,[0,-1,0]],[2,3,7,6,[0,1,0]],[0,2,6,4,[0,0,-1]],[1,5,7,3,[0,0,1]]];
    const ax=[nrm(U),nrm(V),nrm(Wv)];const fl=F.map(f=>{const s=f[4],n=[0,1,2].map(i=>s[0]*ax[0][i]+s[1]*ax[1][i]+s[2]*ax[2][i]),fc=[0,1,2,3].map(k=>C[f[k]]),m=fc.reduce((a,b)=>[a[0]+b[0]/4,a[1]+b[1]/4,a[2]+b[2]/4],[0,0,0]);return {fc,n,m}})
      .filter(f=>dot(f.n,sub(c.eye,f.m))>0);
    for(const f of fl){const q=f.fc.map(c.P),v=nrm(sub(c.eye,f.m)),k=.25+.75*Math.max(0,dot(f.n,LIGHT))+.4*Math.pow(Math.max(0,dot(f.n,v)),8);ctx.fillStyle=gold(k);ctx.beginPath();q.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.strokeStyle=gold(k*.8);ctx.lineWidth=1;ctx.stroke()}}
  function sphere(ctx,c,p,r){const q=c.P(p),R=r*q[2],g=ctx.createRadialGradient(q[0]-R*.35,q[1]-R*.4,R*.05,q[0],q[1],R);g.addColorStop(0,'#fff4c8');g.addColorStop(.35,gold(.95));g.addColorStop(1,gold(.35));ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],R,0,TAU);ctx.fill()}
  function draw(ctx,o){const c=cam(o),t=o.tilt||0,ct=Math.cos(t),st=Math.sin(t),PIV=[0,1.25,0],L=1.08;
    /* pé */cyl(ctx,c,0,0,.62,0,.07);cyl(ctx,c,0,0,.42,.07,.13,{k:.95});
    /* coluna afinando */cyl(ctx,c,0,0,.075,.13,1.18);sphere(ctx,c,[0,1.08,0],.09);
    /* braço girando em volta de z: ponta esquerda = PIV + (-L·ct, +L·st)  (tilt>0: esquerda desce) */
    const end=s=>[PIV[0]+s*L*ct,PIV[1]-s*L*st*-1*-1,0];
    const eL=[PIV[0]-L*ct,PIV[1]-L*st,0],eR=[PIV[0]+L*ct,PIV[1]+L*st,0];
    const pans=[eL,eR].map(e=>[e[0],e[1]+.16,e[2]]);
    /* ordem de pintura: o que está mais longe primeiro (pratos e braço) */
    const items=[{z:c.P(pans[0])[3],f:()=>pan(ctx,c,pans[0],eL)},{z:c.P(pans[1])[3],f:()=>pan(ctx,c,pans[1],eR)},
      {z:c.P(PIV)[3]+.01,f:()=>{box(ctx,c,PIV,[L*ct,L*st,0],[-.04*st,.04*ct,0],[0,0,.05]);sphere(ctx,c,PIV,.1);
        /* ponteiro */box(ctx,c,[PIV[0]+.22*st,PIV[1]+.22*ct*.999,0.06],[.012,0,0],[.22*st,.22*ct,0],[0,0,.008])}}];
    items.sort((a,b)=>a.z-b.z).forEach(i=>i.f());
    const top=pans.map(p=>{const q=c.P([p[0],p[1]+.03,p[2]]);return [q[0],q[1],q[2]]});return {L:top[0],R:top[1],cam:c}}
  function pan(ctx,c,p,e){cyl(ctx,c,e[0],0,.03,e[1],p[1]-.02);cyl(ctx,c,p[0],0,.5,p[1]-.035,p[1]+.03);cyl(ctx,c,p[0],0,.38,p[1]+.03,p[1]+.045,{k:1.08})}
  const tiltFor=(mL,mR,o={})=>{const r=Math.log10(mL/mR),mx=o.max??.3;return mx*Math.tanh(r/1.2)};
  function swing(t,t0,alvo,de=0){if(t<t0)return de;const u=t-t0;return alvo+(de-alvo)*Math.exp(-u*3.2)*Math.cos(u*7.5)}
  return {draw,tiltFor,swing,cam}})();
