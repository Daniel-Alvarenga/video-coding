/* ---------- NET: redes/grafos (sempre injetado) ----------
   Dados: tools/net_gen.py grava PROJECT/assets/rede.json (pos em [0,1]², edges, deg, fav, stats); NET.load('rede.json').
   Também gera na hora: NET.ba(n,m,seed) e NET.layout(G,iter,seed).
   NET.draw(ctx,G,{box:[x,y,w,h], t (s desde o início do crescimento), grow (s), nodeR:i=>raio, col:i=>cor, edgeCol:(a,b)=>cor|null, edgeA, hi:Set})
   NET.adj(G) lista de vizinhos; NET.xy(G,box,i) posição na tela. */
const NET=(()=>{
  const DATA=typeof __DATA__!=='undefined'?__DATA__:{};
  function load(name){const d=DATA[name];if(!d)throw new Error('NET: dado não encontrado '+name);if(!d._adj){d._adj=d.deg.map(()=>[]);d.edges.forEach(([a,b])=>{d._adj[a].push(b);d._adj[b].push(a)})}return d}
  function ba(n,m,seed=1){const R=FX.rng(seed),E=[],deg=[];for(let i=0;i<=m;i++){deg.push(m);for(let j=i+1;j<=m;j++)E.push([i,j])}
    for(let v=m+1;v<n;v++){const tg=new Set(),tot=deg.reduce((a,b)=>a+b,0);while(tg.size<m){let r=R()*tot;for(let u=0;u<deg.length;u++){r-=deg[u];if(r<=0){tg.add(u);break}}}deg.push(0);for(const u of tg){E.push([u,v]);deg[u]++;deg[v]++}}
    const G={edges:E,deg};G._adj=deg.map(()=>[]);E.forEach(([a,b])=>{G._adj[a].push(b);G._adj[b].push(a)});return G}
  function layout(G,iter=400,seed=2){const n=G.deg.length,R=FX.rng(seed),p=[...Array(n)].map(()=>[R(),R()]),k=1/Math.sqrt(n);let T=.1;
    for(let it=0;it<iter;it++){const d=p.map(()=>[0,0]);for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){let dx=p[i][0]-p[j][0],dy=p[i][1]-p[j][1],l=Math.hypot(dx,dy)+1e-9,f=k*k/l;dx/=l;dy/=l;d[i][0]+=dx*f;d[i][1]+=dy*f;d[j][0]-=dx*f;d[j][1]-=dy*f}
      for(const [a,b] of G.edges){let dx=p[a][0]-p[b][0],dy=p[a][1]-p[b][1],l=Math.hypot(dx,dy)+1e-9,f=l*l/k;dx/=l;dy/=l;d[a][0]-=dx*f;d[a][1]-=dy*f;d[b][0]+=dx*f;d[b][1]+=dy*f}
      for(let i=0;i<n;i++){const l=Math.hypot(...d[i])+1e-9,s=Math.min(l,T)/l;p[i][0]+=d[i][0]*s+(.5-p[i][0])*.01;p[i][1]+=d[i][1]*s+(.5-p[i][1])*.01}T*=.993}
    const mn=[Math.min(...p.map(q=>q[0])),Math.min(...p.map(q=>q[1]))],mx=[Math.max(...p.map(q=>q[0])),Math.max(...p.map(q=>q[1]))];G.pos=p.map(q=>[(q[0]-mn[0])/(mx[0]-mn[0]),(q[1]-mn[1])/(mx[1]-mn[1])]);return G}
  const xy=(G,box,i)=>[box[0]+G.pos[i][0]*box[2],box[1]+G.pos[i][1]*box[3]];
  function draw(ctx,G,o){const box=o.box,n=G.deg.length,t=o.t??99,grow=o.grow??0,app=i=>grow?clamp((t-i/n*grow)/.4):1;
    ctx.save();ctx.lineCap='round';const base=ctx.globalAlpha*(o.a??1);
    for(const [a,b] of G.edges){const al=Math.min(app(a),app(b))*(o.edgeA??.35);if(al<=0)continue;const c=o.edgeCol?o.edgeCol(a,b):null;const [x1,y1]=xy(G,box,a),[x2,y2]=xy(G,box,b);
      ctx.globalAlpha=base*(c?Math.min(1,al*2.6):al);ctx.strokeStyle=c||C.chalk;ctx.lineWidth=c?3:1.4;if(c){ctx.shadowColor=c;ctx.shadowBlur=10}else ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
    for(let i=0;i<n;i++){const a=app(i);if(a<=0)continue;const [x,y]=xy(G,box,i),r=(o.nodeR?o.nodeR(i):5+2.2*Math.sqrt(G.deg[i]))*easeOut(a),col=o.col?o.col(i):C.cyan;
      ctx.globalAlpha=base*(o.nodeA?o.nodeA(i):1);ctx.fillStyle=FX.rgba(col,.3);ctx.strokeStyle=col;ctx.lineWidth=2.2;ctx.shadowColor=col;ctx.shadowBlur=o.hi&&o.hi.has(i)?18:6;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.stroke()}
    ctx.restore()}
  const adj=G=>G._adj;
  return {load,ba,layout,draw,xy,adj};
})();
