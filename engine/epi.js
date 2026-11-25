/* ---------- EPI: epiciclos de Fourier (qualquer contorno → círculos girando que o desenham) ----------
   Entrada (todas devolvem uma lista de pontos [x,y] fechada, em coordenadas próprias; y para cima):
     EPI.geo(iso,{ring})          contorno de um país do __GEO__ (Natural Earth); ring = índice do anel (0 = o maior); projeção equirretangular
                                   com cos(latitude média), então o mapa fica com a forma certa
     EPI.svg(d,{step})            caminho SVG (M L H V C S Q T Z, absolutos e relativos; arcos A viram reta) amostrado a cada `step`
     EPI.pts(lista)               lista de pontos qualquer
   EPI.make(pts,{M,keep})  reamostra por comprimento de arco (M pontos), faz a DFT e ordena os termos por raio (do maior para o menor);
       normaliza para caber num círculo de raio 1. Devolve E = {terms:[{n,r,ph}], c0:[x,y], scale, pts (contorno normalizado), M}.
   EPI.chain(E,u,N)  juntas da cadeia no parâmetro u (0..1 = uma volta completa): [[x,y],...] com N termos (N pode ser fracionário:
       o termo k entra com peso clamp(N-k), então aumentar N é contínuo, sem saltos). EPI.tip(E,u,N) = ponta da caneta.
   EPI.view(cx,cy,s,fx,fy)  câmera 2D: ponto do mundo (fx,fy) no centro (cx,cy) da tela, s = px por unidade. v.P([x,y]) -> [X,Y]
   EPI.circles(ctx,v,E,joints,N,{a,col,vec,fill,minPx})  círculos com aro fino brilhante, raio-vetor e preenchimento sutil; a espessura e o
       brilho acompanham o raio na tela; termos menores que minPx somem
   EPI.ink(ctx,v,samples,{a,w,cols,glow,tail})  traço de luz: samples = [{p:[x,y],sp,age}] do mais antigo ao mais novo; espessura pela
       velocidade (sp), cor em gradiente ao longo do caminho (cols), cauda que esmaece (age), brilho em camadas; resto vira "tinta" fraca
   EPI.spark(ctx,q,t,{col,n,size})  faíscas na ponta da caneta
   EPI.sym(n)  "e^{inωt}" com o n formatado (para o HUD) */
const EPI=(()=>{
  const D=Math.PI/180;
  function geo(iso,o={}){const G=typeof __GEO__!=='undefined'?__GEO__:[],c=G.find(k=>k.iso===iso);if(!c)return [];const rings=c.r.slice().sort((a,b)=>b.length-a.length),R=rings[o.ring||0];
    const lat0=R.reduce((s,p)=>s+p[1],0)/R.length,k=Math.cos(lat0*D);return R.map(([lo,la])=>[lo*k,la])}
  function pts(L){return L.map(p=>[p[0],p[1]])}
  function svg(d,o={}){const tk=d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g)||[];let i=0,cmd='M',x=0,y=0,sx=0,sy=0,px=0,py=0,out=[];const st=o.step||1;
    const num=()=>parseFloat(tk[i++]),line=(x1,y1)=>{const n=Math.max(1,Math.ceil(Math.hypot(x1-x,y1-y)/st));for(let k=1;k<=n;k++)out.push([x+(x1-x)*k/n,-(y+(y1-y)*k/n)]);x=x1;y=y1};
    const cub=(x1,y1,x2,y2,x3,y3)=>{const L=Math.hypot(x1-x,y1-y)+Math.hypot(x2-x1,y2-y1)+Math.hypot(x3-x2,y3-y2),n=Math.max(2,Math.ceil(L/st));for(let k=1;k<=n;k++){const u=k/n,a=1-u;out.push([a*a*a*x+3*a*a*u*x1+3*a*u*u*x2+u*u*u*x3,-(a*a*a*y+3*a*a*u*y1+3*a*u*u*y2+u*u*u*y3)])}px=x2;py=y2;x=x3;y=y3};
    while(i<tk.length){if(/[a-zA-Z]/.test(tk[i]))cmd=tk[i++];const rel=cmd===cmd.toLowerCase(),C=cmd.toUpperCase(),ox=rel?x:0,oy=rel?y:0;
      if(C==='M'){x=num()+ox;y=num()+oy;sx=x;sy=y;out.push([x,-y]);cmd=rel?'l':'L'}else if(C==='L')line(num()+ox,num()+oy);else if(C==='H')line(num()+ox,y);else if(C==='V')line(x,num()+oy);
      else if(C==='C'){const a=[num()+ox,num()+oy,num()+ox,num()+oy,num()+ox,num()+oy];cub(...a)}else if(C==='S'){const a=[2*x-px,2*y-py,num()+ox,num()+oy,num()+ox,num()+oy];cub(...a)}
      else if(C==='Q'){const qx=num()+ox,qy=num()+oy,ex=num()+ox,ey=num()+oy;cub(x+2/3*(qx-x),y+2/3*(qy-y),ex+2/3*(qx-ex),ey+2/3*(qy-ey),ex,ey)}
      else if(C==='A'){for(let k=0;k<5;k++)num();line(num()+ox,num()+oy)}else if(C==='Z'){line(sx,sy);cmd='M';if(i<tk.length&&!/[a-zA-Z]/.test(tk[i]))cmd='L'}else i++}
    return out}
  /* reamostragem por comprimento de arco + DFT */
  function make(P,o={}){const M=o.M||1024,L=[0];for(let k=1;k<=P.length;k++){const a=P[k-1],b=P[k%P.length];L.push(L[k-1]+Math.hypot(b[0]-a[0],b[1]-a[1]))}const tot=L[P.length];
    const S=[];let j=0;for(let k=0;k<M;k++){const s=k/M*tot;while(L[j+1]<s)j++;const a=P[j],b=P[(j+1)%P.length],u=(s-L[j])/((L[j+1]-L[j])||1);S.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u])}
    let cx=0,cy=0;S.forEach(p=>{cx+=p[0];cy+=p[1]});cx/=M;cy/=M;let R=0;S.forEach(p=>{R=Math.max(R,Math.hypot(p[0]-cx,p[1]-cy))});const sc=1/R,Z=S.map(p=>[(p[0]-cx)*sc,(p[1]-cy)*sc]);
    const terms=[],H=Math.floor(M/2),keep=o.keep||Math.min(M-1,600);
    for(let n=-H+1;n<H;n++){if(n===0)continue;let re=0,im=0;for(let k=0;k<M;k++){const a=-2*Math.PI*n*k/M;re+=Z[k][0]*Math.cos(a)-Z[k][1]*Math.sin(a);im+=Z[k][0]*Math.sin(a)+Z[k][1]*Math.cos(a)}re/=M;im/=M;terms.push({n,r:Math.hypot(re,im),ph:Math.atan2(im,re)})}
    terms.sort((a,b)=>b.r-a.r);return {terms:terms.slice(0,keep),pts:Z,M,scale:sc,c0:[cx,cy]}}
  function chain(E,u,N){const J=[[0,0]];let x=0,y=0;const n=Math.min(E.terms.length,Math.ceil(N));for(let k=0;k<n;k++){const T=E.terms[k],w=clamp(N-k),a=2*Math.PI*T.n*u+T.ph;x+=w*T.r*Math.cos(a);y+=w*T.r*Math.sin(a);J.push([x,y])}return J}
  function tip(E,u,N){let x=0,y=0;const n=Math.min(E.terms.length,Math.ceil(N));for(let k=0;k<n;k++){const T=E.terms[k],w=clamp(N-k),a=2*Math.PI*T.n*u+T.ph;x+=w*T.r*Math.cos(a);y+=w*T.r*Math.sin(a)}return [x,y]}
  const view=(cx,cy,s,fx=0,fy=0)=>({cx,cy,s,fx,fy,P:p=>[cx+(p[0]-fx)*s,cy-(p[1]-fy)*s]});
  function circles(ctx,v,E,J,N,o={}){const a=o.a??1;if(a<=0)return;const col=o.col||'#62d0ea',vc=o.vec||'rgba(236,230,214,.75)',mn=o.minPx??1.2,n=J.length-1;ctx.save();ctx.globalAlpha*=a;ctx.lineCap='round';
    for(let k=0;k<n;k++){const T=E.terms[k],w=clamp(N-k),R=T.r*w*v.s;if(R<mn)continue;const c=v.P(J[k]),e=v.P(J[k+1]);
      if(c[0]+R<-40||c[0]-R>W+40||c[1]+R<-40||c[1]-R>H+40)continue;const big=clamp(Math.log10(R)/2.6),lw=.7+1.6*big;
      if(o.fill!==false){ctx.fillStyle=FX.rgba(col,.035+.04*big);ctx.beginPath();ctx.arc(c[0],c[1],R,0,TAU);ctx.fill()}
      ctx.strokeStyle=FX.rgba(col,.25+.45*big);ctx.lineWidth=lw;ctx.shadowColor=col;ctx.shadowBlur=6+10*big;ctx.beginPath();ctx.arc(c[0],c[1],R,0,TAU);ctx.stroke();
      ctx.shadowBlur=0;ctx.strokeStyle=vc;ctx.lineWidth=lw*.9;ctx.beginPath();ctx.moveTo(c[0],c[1]);ctx.lineTo(e[0],e[1]);ctx.stroke();
      if(R>6){ctx.fillStyle=vc;ctx.beginPath();ctx.arc(e[0],e[1],Math.min(3.5,1+R*.02),0,TAU);ctx.fill()}}
    ctx.restore()}
  const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const mix=(cols,u)=>{const x=((u%1)+1)%1*(cols.length),k=Math.floor(x)%cols.length,f=x-Math.floor(x),a=hx(cols[k]),b=hx(cols[(k+1)%cols.length]);return a.map((v,i)=>Math.round(v+(b[i]-v)*f))};
  function ink(ctx,v,S,o={}){const a=o.a??1;if(a<=0||S.length<2)return;const cols=o.cols||['#f4b740','#ffd27a','#62d0ea','#9ff5d8'],w=o.w||5,tail=o.tail||2.5,glow=o.glow??1;const Q=S.map(s=>v.P(s.p));
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    /* camada 1: tinta antiga (fraca, fina) e brilho largo; camada 2: núcleo forte só na cauda recente */
    for(const pass of [0,1,2]){if(pass===0)ctx.globalCompositeOperation='lighter';for(let k=1;k<S.length;k++){const A=Q[k-1],B=Q[k];if(!isFinite(A[0])||!isFinite(B[0]))continue;if((A[0]<-60&&B[0]<-60)||(A[0]>W+60&&B[0]>W+60)||(A[1]<-60&&B[1]<-60)||(A[1]>H+60&&B[1]>H+60))continue;
        const s=S[k],fresh=Math.max(0,1-s.age/tail),thick=w*(.45+.9/(1+s.sp*(o.spk||.6))),c=mix(cols,s.u??k/S.length);
        if(pass===0){ctx.strokeStyle=`rgba(${c},${(.05+.22*fresh)*glow})`;ctx.lineWidth=thick*(3.2+2*fresh)}else if(pass===1){ctx.strokeStyle=`rgba(${c},${.28+.72*fresh})`;ctx.lineWidth=thick*(.55+.6*fresh)}
        else{if(fresh<=0)continue;ctx.strokeStyle=`rgba(255,250,235,${.75*fresh*fresh})`;ctx.lineWidth=Math.max(1,thick*.28*fresh)}
        ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}if(pass===0)ctx.globalCompositeOperation='source-over'}
    ctx.restore()}
  function spark(ctx,q,t,o={}){if(!q||!isFinite(q[0]))return;const col=o.col||'#fff3d6',n=o.n||10,sz=o.size||28,R=FX.rng(Math.floor(t*60));ctx.save();ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],sz);g.addColorStop(0,'rgba(255,250,235,1)');g.addColorStop(.25,FX.rgba(col,.55));g.addColorStop(1,FX.rgba(col,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],sz,0,TAU);ctx.fill();
    for(let k=0;k<n;k++){const an=R()*TAU,l=sz*(.4+R()*1.4);ctx.strokeStyle=FX.rgba(col,.4+.5*R());ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(q[0]+Math.cos(an)*sz*.2,q[1]+Math.sin(an)*sz*.2);ctx.lineTo(q[0]+Math.cos(an)*l,q[1]+Math.sin(an)*l);ctx.stroke()}ctx.restore()}
  const sym=n=>'e^(i·'+n+'·ωt)';
  return {geo,svg,pts,make,chain,tip,view,circles,ink,spark,sym,mix}})();
