/* ---------- WALK: passeios aleatórios em rede 1D/2D/3D (sempre injetado) ----------
   WALK.path(dim,n,seed)  caminho determinístico [[x,y,z]...] com n passos (cacheado)
   WALK.firstReturn(path)  passo da primeira volta à origem (-1 se não voltou)
   WALK.stats(dim,walkers,steps,seed)  fração acumulada que já voltou, por passo (Float32Array, cacheado)
   WALK.grid(ctx,{cx,cy,cell,n,a})  rede de pontos 2D       WALK.lattice3(ctx,cam,{n,cell,a})  rede 3D esparsa
   WALK.draw2(ctx,path,k,{cx,cy,cell,color,lw,glow,a,tail})  rastro 2D até o passo k (k pode ser fracionário)
   WALK.draw1(ctx,path,k,{x0,y,cell,color,a,trace:{y0,dy}})  posição numa reta + rastro espaço-tempo descendo
   WALK.draw3(ctx,cam,path,k,{cell,color,lw,a,tail})  rastro 3D com profundidade
   WALK.house(ctx,x,y,s,{color,a})  WALK.bird(ctx,x,y,s,t,{color,a})  WALK.person(ctx,x,y,s,t,{color,a})  ícones de traço */
const WALK=(()=>{
  const PC={};
  function path(dim,n,seed=1){const key=dim+':'+n+':'+seed;if(PC[key])return PC[key];const R=FX.rng(seed*7919+dim),p=[[0,0,0]];
    for(let i=0;i<n;i++){const q=p[i].slice(),ax=Math.floor(R()*dim),s=R()<.5?-1:1;q[ax]+=s;p.push(q)}return PC[key]=p}
  const isO=q=>q[0]===0&&q[1]===0&&q[2]===0;
  function firstReturn(p){for(let i=1;i<p.length;i++)if(isO(p[i]))return i;return -1}
  const SC={};function stats(dim,W=2000,S=3000,seed=1){const key=[dim,W,S,seed].join(':');if(SC[key])return SC[key];const c=new Float32Array(S+1);
    for(let w=0;w<W;w++){const R=FX.rng(seed*104729+w*31+dim);let x=0,y=0,z=0;for(let i=1;i<=S;i++){const ax=Math.floor(R()*dim),s=R()<.5?-1:1;if(ax===0)x+=s;else if(ax===1)y+=s;else z+=s;if(!x&&!y&&!z){c[i]++;break}}}
    for(let i=1;i<=S;i++)c[i]=c[i-1]+c[i];for(let i=0;i<=S;i++)c[i]/=W;return SC[key]=c}
  const at=(p,k)=>{const i=Math.min(p.length-1,Math.floor(k)),j=Math.min(p.length-1,i+1),f=k-Math.floor(k),u=easeOut(f);return [lerp(p[i][0],p[j][0],u),lerp(p[i][1],p[j][1],u),lerp(p[i][2],p[j][2],u)]};
  function grid(ctx,o={}){const cx=o.cx??W/2,cy=o.cy??H/2,c=o.cell||30,n=o.n||12;ctx.save();ctx.globalAlpha*=o.a??1;ctx.fillStyle=o.color||'rgba(236,230,214,.18)';
    for(let i=-n;i<=n;i++)for(let j=-n;j<=n;j++){ctx.beginPath();ctx.arc(cx+i*c,cy+j*c,1.6,0,TAU);ctx.fill()}ctx.restore()}
  function lattice3(ctx,cam,o={}){const n=o.n||4,c=o.cell||1;ctx.save();ctx.globalAlpha*=o.a??1;ctx.fillStyle=o.color||'rgba(236,230,214,.22)';
    for(let i=-n;i<=n;i++)for(let j=-n;j<=n;j++)for(let k=-n;k<=n;k++){const q=FX.pj(cam,i*c,j*c,k*c);ctx.beginPath();ctx.arc(q[0],q[1],1.4,0,TAU);ctx.fill()}ctx.restore()}
  /* rastro com cauda que esmaece; o.tail = quantos passos ficam visíveis (padrão: todos) */
  function stroke(ctx,Q,o){const n=Q.length;if(n<2)return;const tail=o.tail||n;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=o.color||C.gold;ctx.shadowColor=o.color||C.gold;ctx.shadowBlur=o.glow??8;
    const seg=Math.max(1,Math.ceil(n/60));for(let i=Math.max(1,n-tail);i<n;i+=seg){const e=Math.min(n-1,i+seg),f=(i-(n-tail))/tail;ctx.globalAlpha=(o.a??1)*(o.tail?clamp(f)**1.2:.25+.75*(i/n));ctx.lineWidth=o.lw||3;
      ctx.beginPath();ctx.moveTo(Q[i-1][0],Q[i-1][1]);for(let j=i;j<=e;j++)ctx.lineTo(Q[j][0],Q[j][1]);ctx.stroke()}ctx.restore()}
  function head(ctx,q,o){ctx.save();ctx.globalAlpha*=o.a??1;ctx.fillStyle=o.head||C.chalk;ctx.shadowColor=o.color||C.gold;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(q[0],q[1],o.hr||7,0,TAU);ctx.fill();ctx.restore()}
  function draw2(ctx,p,k,o={}){const cx=o.cx??W/2,cy=o.cy??H/2,c=o.cell||30,K=Math.min(k,p.length-1),Q=[];for(let i=0;i<=Math.floor(K);i++)Q.push([cx+p[i][0]*c,cy-p[i][1]*c]);
    const h=at(p,K),H2=[cx+h[0]*c,cy-h[1]*c];Q.push(H2);stroke(ctx,Q,o);if(o.head!==false)head(ctx,H2,o);return H2}
  function draw1(ctx,p,k,o={}){const x0=o.x0??W/2,y=o.y??H/2,c=o.cell||30,K=Math.min(k,p.length-1),h=at(p,K),X=x0+h[0]*c;
    if(o.trace){const {y0,dy}=o.trace,Q=[];for(let i=0;i<=Math.floor(K);i++)Q.push([x0+p[i][0]*c,y0+i*dy]);Q.push([X,y0+K*dy]);stroke(ctx,Q,{...o,glow:4,lw:o.lw||2})}
    if(o.head!==false)head(ctx,[X,y],o);return [X,y]}
  function draw3(ctx,cam,p,k,o={}){const c=o.cell||1,K=Math.min(k,p.length-1),Q=[];for(let i=0;i<=Math.floor(K);i++)Q.push(FX.pj(cam,p[i][0]*c,p[i][1]*c,p[i][2]*c));
    const h=at(p,K),H3=FX.pj(cam,h[0]*c,h[1]*c,h[2]*c);Q.push(H3);stroke(ctx,Q,o);if(o.head!==false)head(ctx,H3,o);return H3}
  function ink(ctx,o){ctx.strokeStyle=o.color||C.chalk;ctx.fillStyle=o.color||C.chalk;ctx.lineWidth=o.lw||3;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=o.color||C.chalk;ctx.shadowBlur=o.glow??8;ctx.globalAlpha*=o.a??1}
  function house(ctx,x,y,s,o={}){if((o.a??1)<=0)return;ctx.save();ink(ctx,o);ctx.beginPath();ctx.moveTo(x-s*.6,y+s*.55);ctx.lineTo(x-s*.6,y-s*.05);ctx.lineTo(x,y-s*.6);ctx.lineTo(x+s*.6,y-s*.05);ctx.lineTo(x+s*.6,y+s*.55);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.rect(x-s*.14,y+s*.15,s*.28,s*.4);ctx.stroke();ctx.restore()}
  function bird(ctx,x,y,s,t=0,o={}){if((o.a??1)<=0)return;ctx.save();ink(ctx,o);const f=Math.sin(t*9)*s*.35;ctx.beginPath();ctx.moveTo(x-s,y-f);ctx.quadraticCurveTo(x-s*.45,y-s*.5-f*.3,x,y);ctx.quadraticCurveTo(x+s*.45,y-s*.5-f*.3,x+s,y-f);ctx.stroke();
    ctx.beginPath();ctx.arc(x,y+s*.05,s*.12,0,TAU);ctx.fill();ctx.restore()}
  function person(ctx,x,y,s,t=0,o={}){if((o.a??1)<=0)return;ctx.save();ink(ctx,o);const sw=Math.sin(t*5)*.25,tl=Math.sin(t*2.3)*.12;ctx.translate(x,y);ctx.rotate(tl);
    ctx.beginPath();ctx.arc(0,-s*.82,s*.14,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-s*.68);ctx.lineTo(0,-s*.25);
    ctx.moveTo(0,-s*.25);ctx.lineTo(Math.sin(sw)*s*.3,0);ctx.moveTo(0,-s*.25);ctx.lineTo(-Math.sin(sw)*s*.3,0);
    ctx.moveTo(0,-s*.58);ctx.lineTo(-s*.28,-s*.38+sw*s*.2);ctx.moveTo(0,-s*.58);ctx.lineTo(s*.28,-s*.38-sw*s*.2);ctx.stroke();ctx.restore()}
  return {path,firstReturn,stats,grid,lattice3,draw1,draw2,draw3,house,bird,person,at};
})();
