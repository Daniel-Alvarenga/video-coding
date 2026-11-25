/* ---------- BIO: populações que crescem, mutam e evoluem (sempre injetado) ----------
   BIO.plate(key,step,{w,h,bands,seeds,grow,mu,lag,seed})  placa em grade com faixas de remédio (nível 0..n por coluna);
       cada célula guarda a linhagem; uma linhagem de resistência r só ocupa faixas de nível <= r; ao bater numa faixa r+1,
       com chance mu nasce um mutante (nova linhagem, r+1). Avança até o passo pedido (cacheado, determinístico).
       Devolve {w,h,G (linhagem por célula, -1 vazio),lin:[{id,r,parent,born,x,y,col}],front:[colunas máximas],n}
   BIO.paint(ctx,S,x,y,W,H,{a,bandCol,cellA,hi})  pinta faixas e colônias (cada linhagem com sua cor; hi = id destacado)
   BIO.bands(ctx,S,x,y,W,H,{labels,a,size,fmt})  rótulos das faixas acima da placa
   BIO.tree(ctx,S,x,y,w,h,{a,t,hi})  árvore genealógica das linhagens (x = tempo de nascimento, cor = resistência)
   BIO.bug(ctx,x,y,s,ang,t,{color,a})  bactéria em forma de bastão com flagelos
   BIO.diatom(ctx,x,y,s,kind,ang,{color,a})  diatomácea (alga microscópica de sílica): kind 'disc' (cêntrica) ou 'pen' (penada) */
const BIO=(()=>{
  const PS={},PAL=['#e9e3d0','#f4b740','#f08a4b','#ef6f95','#c77dff','#62d0ea'];
  /* variação de tom por linhagem, para irmãs da mesma resistência se distinguirem */
  const tint=(c,R)=>{const n=parseInt(c.slice(1),16),f=.78+R()*.44,h=v=>Math.max(0,Math.min(255,Math.round(v*f))).toString(16).padStart(2,'0');return '#'+h(n>>16&255)+h(n>>8&255)+h(n&255)};
  function setup(o){const w=o.w||240,h=o.h||60,G=new Int32Array(w*h).fill(-1),band=new Int8Array(w),nb=o.bands.length,R=FX.rng(o.seed||5);
    for(let i=0;i<w;i++)band[i]=o.bands[Math.min(nb-1,Math.floor(i/w*nb))];
    const lin=[];const S={w,h,G,band,lin,R,n:0,occ:[]};
    (o.seeds||[[0,null],[w-1,null]]).forEach(([cx])=>{const id=lin.length;lin.push({id,r:0,parent:-1,born:0,x:cx,y:h/2,col:PAL[0],root:true});for(let j=0;j<h;j++){G[j*w+cx]=id;S.occ.push(j*w+cx)}});
    return S}
  const DIR=[[1,0],[-1,0],[0,1],[0,-1]];
  function step(S,o){const {w,h,G,band,lin,R}=S,g=o.grow??.35,mu=o.mu??.0008,N=S.occ.length,add=[];
    for(let q=0;q<N;q++){const k=S.occ[q];if(R()>g)continue;const x=k%w,y=(k/w)|0,d=DIR[(R()*4)|0],X=x+d[0],Y=y+d[1];if(X<0||X>=w||Y<0||Y>=h)continue;const kk=Y*w+X;if(G[kk]>=0)continue;
      const L=lin[G[k]],b=band[X];if(b<=L.r){G[kk]=L.id;add.push(kk)}
      else if(b===L.r+1){if(L.blk==null)L.blk=S.n;if(S.n-L.blk<(o.lag??0)||R()>=mu)continue;const id=lin.length,r=L.r+1;lin.push({id,r,parent:L.id,born:S.n,x:X,y:Y,col:tint(PAL[Math.min(PAL.length-1,r)],R)});G[kk]=id;add.push(kk)}}
    for(const k of add)S.occ.push(k);S.n++}
  function plate(key,n,o){let S=PS[key];if(!S||n<S.n)S=PS[key]=setup(o);let guard=0;while(S.n<n&&guard++<20000)step(S,o);return S}
  const cv={};function paint(ctx,S,x,y,Wd,Hd,o={}){const {w,h,G,band,lin}=S;let c=cv[w+'x'+h];if(!c){c=document.createElement('canvas');c.width=w;c.height=h;cv[w+'x'+h]=c}
    const g=c.getContext('2d'),im=g.createImageData(w,h),d=im.data,mx=Math.max(...band),hx=FX.rgba;
    const rgb=s=>{const n=parseInt(s.slice(1),16);return [n>>16&255,n>>8&255,n&255]},LC=lin.map(l=>rgb(l.col)),hiSet=o.hi!=null?new Set(o.hi):null;
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=j*w+i,id=G[k],b=band[i]/Math.max(1,mx);let r=lerp(28,58,b),gg=lerp(30,22,b),bb=lerp(42,66,b);
      if(id>=0){const L=LC[id],dim=hiSet&&!hiSet.has(id)?.25:1,ca=(o.cellA??.95)*dim;r=lerp(r,L[0],ca);gg=lerp(gg,L[1],ca);bb=lerp(bb,L[2],ca)}
      d[k*4]=r;d[k*4+1]=gg;d[k*4+2]=bb;d[k*4+3]=255}
    g.putImageData(im,0,0);ctx.save();ctx.globalAlpha*=o.a??1;ctx.imageSmoothingEnabled=false;ctx.drawImage(c,x,y,Wd,Hd);
    /* divisões das faixas */ctx.strokeStyle='rgba(236,230,214,.18)';ctx.lineWidth=1.5;for(let i=1;i<w;i++)if(band[i]!==band[i-1]){const X=x+i/w*Wd;ctx.beginPath();ctx.moveTo(X,y);ctx.lineTo(X,y+Hd);ctx.stroke()}
    ctx.strokeStyle=C.chalk;ctx.lineWidth=3;ctx.strokeRect(x,y,Wd,Hd);ctx.restore()}
  function bands(ctx,S,x,y,Wd,o={}){const {w,band}=S;let s=0;for(let i=1;i<=w;i++)if(i===w||band[i]!==band[s]){const cx=x+(s+i)/2/w*Wd;txt(ctx,(o.fmt||(v=>String(v)))(band[s]),cx,y,{font:F.mono,size:o.size||22,color:o.color||C.dim,a:o.a??1});s=i}}
  function tree(ctx,S,x,y,w,h,o={}){const L=S.lin,n=Math.max(1,S.n),kids={};L.forEach(l=>{if(l.parent>=0)(kids[l.parent]=kids[l.parent]||[]).push(l.id)});
    /* ordem das folhas por busca em profundidade */let row=0;const Y={};const dfs=id=>{const ch=kids[id]||[];if(!ch.length){Y[id]=row++;return Y[id]}const ys=ch.map(dfs);Y[id]=(Math.min(...ys)+Math.max(...ys))/2;return Y[id]};
    L.filter(l=>l.parent<0).forEach(l=>dfs(l.id));const rows=Math.max(1,row-1),px=l=>x+l.born/n*w,py=id=>y+Y[id]/rows*h,a=o.a??1;
    ctx.save();ctx.globalAlpha*=a;ctx.lineWidth=2.5;ctx.lineCap='round';
    L.forEach(l=>{if(o.t!=null&&l.born>o.t)return;const ch=(kids[l.id]||[]).filter(c=>o.t==null||L[c].born<=o.t),end=ch.length?Math.max(...ch.map(c=>L[c].born)):Math.min(o.t??n,n);
      ctx.strokeStyle=l.col;ctx.globalAlpha=a*(o.hi&&!o.hi.includes(l.id)?.35:1);ctx.beginPath();ctx.moveTo(px(l),py(l.id));ctx.lineTo(x+Math.max(l.born,end)/n*w,py(l.id));ctx.stroke();
      ch.forEach(c=>{ctx.beginPath();ctx.moveTo(px(L[c]),py(l.id));ctx.lineTo(px(L[c]),py(c));ctx.stroke()});
      ctx.fillStyle=l.col;ctx.beginPath();ctx.arc(px(l),py(l.id),4,0,TAU);ctx.fill()});ctx.restore()}
  function bug(ctx,x,y,s,ang=0,t=0,o={}){if((o.a??1)<=0)return;ctx.save();ctx.globalAlpha*=o.a??1;ctx.translate(x,y);ctx.rotate(ang);const col=o.color||C.chalk;
    ctx.strokeStyle=FX.rgba(col,.7);ctx.lineWidth=Math.max(1,s*.05);for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(-s*.9,(k-1)*s*.12);for(let i=1;i<=12;i++){const u=i/12;ctx.lineTo(-s*.9-u*s*.9,(k-1)*s*.12+Math.sin(u*9-t*12+k)*s*.12*u)}ctx.stroke()}
    ctx.fillStyle=FX.rgba(col,.85);ctx.shadowColor=col;ctx.shadowBlur=s*.4;ctx.beginPath();ctx.roundRect(-s,-s*.36,2*s,s*.72,s*.36);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(s*.1,0,s*.35,s*.14,0,0,TAU);ctx.fill();ctx.restore()}
  function diatom(ctx,x,y,s,kind='disc',ang=0,o={}){if((o.a??1)<=0)return;ctx.save();ctx.globalAlpha*=o.a??1;ctx.translate(x,y);ctx.rotate(ang);const col=o.color||'#cfe8d0';
    ctx.strokeStyle=col;ctx.fillStyle=FX.rgba(col,.12);ctx.lineWidth=Math.max(1,s*.04);ctx.shadowColor=col;ctx.shadowBlur=s*.25;
    if(kind==='disc'){ctx.beginPath();ctx.arc(0,0,s,0,TAU);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha*=.7;ctx.beginPath();ctx.arc(0,0,s*.25,0,TAU);ctx.stroke();
      for(let i=0;i<24;i++){const a=i/24*TAU;ctx.beginPath();ctx.moveTo(Math.cos(a)*s*.3,Math.sin(a)*s*.3);ctx.lineTo(Math.cos(a)*s*.92,Math.sin(a)*s*.92);ctx.stroke()}}
    else{ctx.beginPath();ctx.ellipse(0,0,s*1.6,s*.42,0,0,TAU);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha*=.7;ctx.beginPath();ctx.moveTo(-s*1.3,0);ctx.lineTo(s*1.3,0);ctx.stroke();
      for(let i=-9;i<=9;i++){const X=i/9*s*1.35,hh=s*.4*Math.sqrt(Math.max(0,1-(X/(s*1.6))**2));ctx.beginPath();ctx.moveTo(X,-hh*.9);ctx.lineTo(X,-hh*.2);ctx.moveTo(X,hh*.2);ctx.lineTo(X,hh*.9);ctx.stroke()}}
    ctx.restore()}
  return {plate,paint,bands,tree,bug,diatom,PAL};
})();
