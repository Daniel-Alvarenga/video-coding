/* ---------- SC: zoom de escala (do átomo ao universo) — objetos desenhados em px, centrados, e utilitários do formato "sem narração" ----------
   Todos recebem o centro (x,y) e o raio R em px (quem chama converte metros → px: R = W·r/10^z, z = log10 da largura da tela em metros).
   SC.atom(ctx,x,y,R,t,{a,P})  átomo de carbono: núcleo (6 prótons + 6 nêutrons) e 6 elétrons em 2 camadas, com rastros; P = período do loop (s)
   SC.dna(ctx,x,y,w,len,t,{a,P})  dupla hélice vertical (largura w, comprimento len em px), bases em ouro/ciano, girando
   SC.cell(ctx,x,y,R,t,{a,P})  célula: membrana ondulada, núcleo, organelas
   SC.iris(ctx,x,y,R,t,{a})  olho visto de frente: íris com fibras, pupila, brilho (R = raio do globo visível)
   SC.burj(ctx,x,yBase,h,{a})  silhueta do Burj Khalifa (degraus em Y vistos de lado) com janelas acesas
   SC.web(ctx,x,y,R,t,{a,seed})  teia cósmica: nós de aglomerados e filamentos brilhando
   SC.sphere(ctx,kind,x,y,R,o)  esfera do PL/COS desenhada direto em px ('terra', 'lua', 'sol'); o: opções de PL.planet/PL.moon/COS.sun
   SC.ruler(ctx,x,y0,y1,z,{a,lo,hi,blur,every})  régua log lateral de 10^lo a 10^hi m com o marcador da escala atual (números borrados ao correr)
   SC.type(ctx,s,x,y,t0,t,{cps,...txt})  texto entrando letra a letra (rápido), com cursor
   SC.beat(T,times,{flash,shake})  efeito de batida: {flash 0..1, dx, dy, k} para o quadro (flash branco curto, tremor, tranco de escala)
   SC.pow10(v)  "10⁻¹⁰" (expoente sobrescrito)      SC.sci(m)  metros em texto curto ("0,34 nm", "828 m", "1,4 milhão de km", "100 mil anos-luz") */
const SC=(()=>{
  const sup=n=>String(n).replace('-','⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const pow10=v=>'10'+sup(v);
  const glowDot=(ctx,x,y,r,col,al=1)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,FX.rgba(col,al));g.addColorStop(.35,FX.rgba(col,al*.35));g.addColorStop(1,FX.rgba(col,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()};
  /* ---------- átomo de carbono ---------- */
  function atom(ctx,x,y,R,t,o={}){const a=o.a??1;if(a<=0||R<1)return;const P=o.P||30,w=k=>TAU*k*t/P;ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';
    glowDot(ctx,x,y,R*.5,'#f4b740',.25);
    /* núcleo: 12 esferas empacotadas */const rn=R*.055,Rn=FX.rng(6);for(let i=0;i<12;i++){const th=i*2.4+w(1)*.5,rr=rn*1.1*Math.sqrt(i/12)*1.6,px=x+Math.cos(th)*rr,py=y+Math.sin(th)*rr*.9;
      const g=ctx.createRadialGradient(px-rn*.3,py-rn*.3,0,px,py,rn);const pr=i%2===0;g.addColorStop(0,pr?'#fff1c8':'#d8f6ff');g.addColorStop(1,pr?'rgba(244,183,64,.85)':'rgba(98,208,234,.75)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rn,0,TAU);ctx.fill()}
    /* camadas: 2 elétrons a .45R, 4 a R; órbitas em elipses inclinadas, rastros */
    const sh=[[.45,2,[.3,1.9]],[1,4,[.9,2.6,-.4,1.3]]];ctx.lineCap='round';
    for(const [rk,ne,tl] of sh)for(let e=0;e<ne;e++){const tilt=tl[e%tl.length],sp=(rk<.5?5:3)*(e%2?1:-1)*(1+e%2),ph=e*TAU/ne,ra=R*rk,rb=ra*.38,ct=Math.cos(tilt),st=Math.sin(tilt);
      const pos=th=>{const ex=Math.cos(th)*ra,ey=Math.sin(th)*rb;return [x+ex*ct-ey*st,y+ex*st+ey*ct]};
      ctx.strokeStyle='rgba(98,208,234,.18)';ctx.lineWidth=1.5;ctx.beginPath();for(let k=0;k<=64;k++){const q=pos(k/64*TAU);k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}ctx.stroke();
      const th0=ph+w(sp);for(let k=0;k<26;k++){const q0=pos(th0-Math.sign(sp)*k*.05),q1=pos(th0-Math.sign(sp)*(k+1)*.05);ctx.strokeStyle=FX.rgba('#62d0ea',.7*(1-k/26));ctx.lineWidth=Math.max(1,R*.018)*(1-k/30);ctx.beginPath();ctx.moveTo(q0[0],q0[1]);ctx.lineTo(q1[0],q1[1]);ctx.stroke()}
      const q=pos(th0);glowDot(ctx,q[0],q[1],Math.max(4,R*.05),'#bff4ff',1)}
    ctx.restore()}
  /* ---------- DNA ---------- */
  function dna(ctx,x,y,w,len,t,o={}){const a=o.a??1;if(a<=0||w<1)return;const P=o.P||30,ph=TAU*2*t/P,turn=w*3.4/2,n=Math.ceil(len/(turn/10));ctx.save();ctx.globalAlpha*=a;ctx.lineCap='round';
    const y0=y-len/2,pts=[[],[]];for(let i=0;i<=n;i++){const yy=y0+i*len/n,th=yy/turn*TAU+ph;pts[0].push([x+Math.sin(th)*w/2,yy,Math.cos(th)]);pts[1].push([x+Math.sin(th+Math.PI*.8)*w/2,yy,Math.cos(th+Math.PI*.8)])}
    for(let i=0;i<=n;i+=3){const A=pts[0][i],B=pts[1][i],k=(A[2]+B[2])/4+.5;ctx.strokeStyle=FX.rgba(i%2?'#f4b740':'#62d0ea',.35+.4*k);ctx.lineWidth=Math.max(1,w*.05);ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}
    for(const [s,col] of [[0,'#f4b740'],[1,'#62d0ea']]){for(let i=0;i<n;i++){const A=pts[s][i],B=pts[s][i+1],k=A[2]*.5+.5;ctx.strokeStyle=FX.rgba(col,.3+.7*k);ctx.shadowColor=col;ctx.shadowBlur=k*12;ctx.lineWidth=Math.max(1.5,w*(.07+.05*k));ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}}
    ctx.restore()}
  /* ---------- célula ---------- */
  function cell(ctx,x,y,R,t,o={}){const a=o.a??1;if(a<=0||R<1)return;const P=o.P||30,ph=TAU*t/P;ctx.save();ctx.globalAlpha*=a;
    const mem=(rk,amp,f)=>{ctx.beginPath();for(let k=0;k<=120;k++){const an=k/120*TAU,rr=R*rk*(1+amp*Math.sin(an*f+ph*2)+amp*.6*Math.sin(an*(f+3)-ph*3));const px=x+Math.cos(an)*rr,py=y+Math.sin(an)*rr;k?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath()};
    const g=ctx.createRadialGradient(x,y,R*.1,x,y,R);g.addColorStop(0,'rgba(40,80,110,.55)');g.addColorStop(1,'rgba(30,70,100,.25)');ctx.fillStyle=g;mem(1,.025,5);ctx.fill();
    ctx.strokeStyle='#62d0ea';ctx.shadowColor='#62d0ea';ctx.shadowBlur=18;ctx.lineWidth=Math.max(1.5,R*.02);ctx.stroke();ctx.shadowBlur=0;
    const Rg=FX.rng(31);for(let i=0;i<26;i++){const an=Rg()*TAU+ph*(Rg()-.5)*.5,rr=R*(.42+Rg()*.45),px=x+Math.cos(an)*rr,py=y+Math.sin(an)*rr,s=R*(.03+Rg()*.05);
      ctx.fillStyle=i%3?'rgba(98,208,234,.35)':'rgba(244,183,64,.45)';ctx.beginPath();ctx.ellipse(px,py,s*1.8,s,an,0,TAU);ctx.fill()}
    const gn=ctx.createRadialGradient(x,y,0,x,y,R*.32);gn.addColorStop(0,'rgba(244,183,64,.55)');gn.addColorStop(1,'rgba(244,183,64,.12)');ctx.fillStyle=gn;mem(.3,.04,3);ctx.fill();ctx.strokeStyle='#f4b740';ctx.lineWidth=Math.max(1,R*.012);ctx.stroke();
    ctx.restore()}
  /* ---------- olho ---------- */
  function iris(ctx,x,y,R,t,o={}){const a=o.a??1;if(a<=0||R<1)return;const ri=R*.5,rp=ri*.38;ctx.save();ctx.globalAlpha*=a;
    const sc=ctx.createRadialGradient(x,y,ri,x,y,R);sc.addColorStop(0,'#e9e4da');sc.addColorStop(.8,'#cfc6b8');sc.addColorStop(1,'rgba(120,100,90,.0)');ctx.fillStyle=sc;ctx.beginPath();ctx.arc(x,y,R,0,TAU);ctx.fill();
    const Rg=FX.rng(17);ctx.strokeStyle='rgba(170,60,50,.25)';ctx.lineWidth=Math.max(.6,R*.004);for(let i=0;i<22;i++){let an=Rg()*TAU,rr=R*.98;ctx.beginPath();ctx.moveTo(x+Math.cos(an)*rr,y+Math.sin(an)*rr);for(let k=0;k<6;k++){rr-=R*.07;an+=(Rg()-.5)*.25;ctx.lineTo(x+Math.cos(an)*rr,y+Math.sin(an)*rr)}ctx.stroke()}
    const ig=ctx.createRadialGradient(x,y,rp,x,y,ri);ig.addColorStop(0,'#c98a2a');ig.addColorStop(.45,'#7a5a2a');ig.addColorStop(.8,'#2f6f84');ig.addColorStop(1,'#14303c');ctx.fillStyle=ig;ctx.beginPath();ctx.arc(x,y,ri,0,TAU);ctx.fill();
    ctx.lineWidth=Math.max(.6,ri*.012);for(let i=0;i<180;i++){const an=i/180*TAU+Rg()*.02,k=.6+Rg()*.4;ctx.strokeStyle=FX.rgba(i%4?'#f4b740':'#62d0ea',.18+Rg()*.25);ctx.beginPath();ctx.moveTo(x+Math.cos(an)*rp*1.05,y+Math.sin(an)*rp*1.05);ctx.quadraticCurveTo(x+Math.cos(an+.08)*ri*.7,y+Math.sin(an+.08)*ri*.7,x+Math.cos(an)*ri*k,y+Math.sin(an)*ri*k);ctx.stroke()}
    ctx.fillStyle='#05070c';ctx.beginPath();ctx.arc(x,y,rp,0,TAU);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=ri*.05;ctx.beginPath();ctx.arc(x,y,ri,0,TAU);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.ellipse(x-ri*.35,y-ri*.38,ri*.13,ri*.09,-.6,0,TAU);ctx.fill();ctx.restore()}
  /* ---------- Burj Khalifa (perfil em degraus) ---------- */
  function burj(ctx,x,yb,h,o={}){const a=o.a??1;if(a<=0||h<2)return;const L=[[.5,0],[.42,.18],[.36,.33],[.3,.46],[.24,.57],[.18,.66],[.13,.74],[.09,.8],[.06,.85],[.035,.9],[.02,.95],[.006,1]],w=h*.105;ctx.save();ctx.globalAlpha*=a;
    ctx.beginPath();ctx.moveTo(x-w*L[0][0],yb);L.forEach(([k,f],i)=>{ctx.lineTo(x-w*k,yb-h*f);if(i<L.length-1)ctx.lineTo(x-w*k,yb-h*L[i+1][1])});for(let i=L.length-1;i>=0;i--){const [k,f]=L[i];ctx.lineTo(x+w*k,yb-h*(i<L.length-1?L[i+1][1]:f));ctx.lineTo(x+w*k,yb-h*f)}ctx.closePath();
    const g=ctx.createLinearGradient(x-w/2,0,x+w/2,0);g.addColorStop(0,'#1b2433');g.addColorStop(.5,'#3a4a62');g.addColorStop(1,'#151c28');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#f4b740';ctx.shadowColor='#f4b740';ctx.shadowBlur=12;ctx.lineWidth=Math.max(1,h*.003);ctx.stroke();ctx.shadowBlur=0;
    if(h>120){const Rg=FX.rng(8),nf=Math.min(163,Math.floor(h/5));for(let i=0;i<nf;i++){const f=i/163,yy=yb-h*f*.85,lv=L.findIndex(l=>l[1]>f*.85),kk=L[Math.max(0,lv-1)][0]*w*.85;for(let j=0;j<4;j++)if(Rg()<.55){ctx.fillStyle=Rg()<.8?'rgba(255,214,150,.75)':'rgba(170,220,255,.7)';ctx.fillRect(x-kk+(j+.5)*kk/2-1,yy-1,Math.max(1,h*.002),Math.max(1,h*.0015))}}}
    ctx.restore()}
  /* ---------- teia cósmica ---------- */
  let WEB=null;function webData(seed){const R=FX.rng(seed||5),N=[],E=[];for(let i=0;i<260;i++){const r=Math.sqrt(R()),an=R()*TAU;N.push([Math.cos(an)*r,Math.sin(an)*r,.3+R()*R()*1.7])}
    for(let i=0;i<N.length;i++){const d=N.map((q,j)=>[Math.hypot(q[0]-N[i][0],q[1]-N[i][1]),j]).sort((a,b)=>a[0]-b[0]);for(let k=1;k<=3;k++)if(d[k][0]<.22&&d[k][1]>i)E.push([i,d[k][1]])}return {N,E}}
  function web(ctx,x,y,R,t,o={}){const a=o.a??1;if(a<=0||R<2)return;if(!WEB)WEB=webData(o.seed);const {N,E}=WEB;ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';
    const P=i=>[x+N[i][0]*R,y+N[i][1]*R];ctx.lineCap='round';for(const [i,j] of E){const A=P(i),B=P(j),g=ctx.createLinearGradient(A[0],A[1],B[0],B[1]);g.addColorStop(0,'rgba(150,170,255,.45)');g.addColorStop(.5,'rgba(120,140,230,.12)');g.addColorStop(1,'rgba(150,170,255,.45)');
      ctx.strokeStyle=g;ctx.lineWidth=Math.max(1,R*.004);ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}
    N.forEach((n,i)=>{const q=P(i);glowDot(ctx,q[0],q[1],Math.max(2,R*.012*n[2]),i%7?'#c9d4ff':'#f4b740',.8)});ctx.restore()}
  /* ---------- esferas do kit em px ---------- */
  function sphere(ctx,kind,x,y,R,o={}){if(R<.3)return null;const f=(H/2)/Math.tan(.9/2),c=W3D.cam({target:[0,0,0],dist:f/R,yaw:o.yaw??0,pitch:o.pitch??0,fov:.9,cx:x,cy:y});
    if(kind==='sol')return COS.sun(ctx,c,[0,0,0],1,o.t||0,o);if(kind==='lua')return PL.moon(ctx,c,[0,0,0],1,o);return PL.planet(ctx,c,kind,[0,0,0],1,o)}
  /* ---------- régua log lateral ---------- */
  function ruler(ctx,x,y0,y1,z,o={}){const a=o.a??1;if(a<=0)return;const lo=o.lo??-10,hi=o.hi??26,Y=v=>lerp(y1,y0,(v-lo)/(hi-lo)),bl=Math.min(6,o.blur||0);ctx.save();ctx.globalAlpha*=a;
    ctx.strokeStyle='rgba(98,208,234,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y1);ctx.stroke();if(bl>.5)ctx.filter=`blur(${bl.toFixed(1)}px)`;
    for(let v=lo;v<=hi;v++){const yy=Y(v),near=Math.max(0,1-Math.abs(v-z)/3);ctx.strokeStyle=FX.rgba('#62d0ea',.35+.65*near);ctx.lineWidth=v%3===0?2.5:1.2;ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+(v%3===0?18:10),yy);ctx.stroke();
      const zr=Math.round(z),cur=v===zr,show=cur||(o.every?v%o.every===0:v%2===0)&&Math.abs(v-zr)>1;  /* rótulos espaçados; o da escala atual em destaque */
      if(show)txt(ctx,pow10(v),x+26,yy+8,{font:F.mono,size:cur?28:20,color:cur?'#bff4ff':'#5d8a98',align:'left',a:cur?1:.6})}
    ctx.filter='none';const yz=Y(clamp(z,lo,hi));ctx.fillStyle='#f4b740';ctx.shadowColor='#f4b740';ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(x-4,yz);ctx.lineTo(x-20,yz-10);ctx.lineTo(x-20,yz+10);ctx.closePath();ctx.fill();
    ctx.fillRect(x-2,yz-1.5,30,3);ctx.restore()}
  /* ---------- texto letra a letra ---------- */
  function type(ctx,s,x,y,t0,t,o={}){const n=Math.floor((t-t0)*(o.cps||70));if(n<=0)return;const k=Math.min(s.length,n);txt(ctx,s.slice(0,k)+(k<s.length?'▌':''),x,y,o)}
  /* ---------- batida ---------- */
  function beat(T,times,o={}){let f=0,dx=0,dy=0,k=1;for(const t0 of times){const u=T-t0;if(u<0||u>.6)continue;const e=Math.exp(-u*14);f=Math.max(f,e*(o.flash??.45));
      dx+=Math.sin(u*90)*e*(o.shake??10);dy+=Math.cos(u*77)*e*(o.shake??10)*.7;k*=1+.035*Math.exp(-u*9)}return {flash:f,dx,dy,k}}
  function sci(m){const ly=9.4607e15;if(m>=ly*.5){const v=m/ly;return v>=1e9?(v/1e9).toFixed(0)+' bilhões de anos-luz':v>=1e6?(v/1e6).toFixed(0)+' milhões de anos-luz':v>=1e3?(v/1e3).toFixed(0)+' mil anos-luz':v.toFixed(1).replace('.',',')+' anos-luz'}
    const km=m/1e3;if(km>=1e9)return (km/1e9).toFixed(1).replace('.',',')+' bilhões de km';if(km>=1e6)return (km/1e6).toFixed(1).replace('.',',')+' milhões de km';if(km>=1e3)return Math.round(km).toLocaleString('pt-BR')+' km';if(m>=1)return (m<10?m.toFixed(1):Math.round(m)).toString().replace('.',',')+' m';
    if(m>=1e-3)return (m*1e3).toFixed(1).replace('.',',')+' mm';if(m>=1e-6)return (m*1e6).toFixed(1).replace('.',',')+' µm';return (m*1e9).toFixed(2).replace('.',',')+' nm'}
  return {atom,dna,cell,iris,burj,web,sphere,ruler,type,beat,pow10,sci,sup}})();
/* ---------- PEND: onda de pêndulos com física exata (exemplo: projetos/pendulos/) ----------
   PEND.make({n,G,K,g,A,dx})  n pêndulos; o pêndulo i faz K+i vaivéns completos em G segundos (T_i = G/(K+i), L_i = g·T_i²/4π²);
       todos saem juntos da amplitude A (rad) e se realinham em t = G (loop exato). dx = espaço entre pivôs (m).
       Devolve {n,G,K,L[],T[],pivot(i),theta(i,t),pos(i,t),swings(i,t),rows(t)}; pos em metros, pivôs no eixo x (y = 0), balanço no plano y-z.
       rows(t): número de filas k quando t está perto de G·j/k (0 se não está perto de nenhuma).
   PEND.draw(ctx,c,P,t,{a,trail,rb,col,colFn,ribbon,dust,tpos,held})  barra de suporte, fios, bolas com brilho que acendem ao passar pelo ponto mais baixo e rastros neon;
       colFn(i) = cor de cada pêndulo; ribbon = largura (px) da fita de luz do rastro; dust = pontos de pó brilhante por rastro;
       tpos(i,t) = posição a usar (ex.: pêndulos presos antes de soltar); held = sem brilho de passagem pelo ponto baixo;
       devolve a lista de bolas na tela [{i,q,R,glow}] (para rótulos presos e faíscas). */
const PEND=(()=>{
  function make(o={}){const n=o.n??15,G=o.G??30,K=o.K??20,g=o.g??9.81,A=o.A??.33,dx=o.dx??.045;
    const T=[...Array(n)].map((_,i)=>G/(K+i)),L=T.map(t=>g*t*t/(4*Math.PI*Math.PI)),x0=-(n-1)*dx/2;
    const pivot=i=>[x0+i*dx,0,0],theta=(i,t)=>A*Math.cos(TAU*t/T[i]);
    const pos=(i,t)=>{const th=theta(i,t),p=pivot(i);return [p[0],-L[i]*Math.cos(th),L[i]*Math.sin(th)]};
    const swings=(i,t)=>Math.floor(t/T[i]+1e-9);
    const rows=t=>{const m=((t%G)+G)%G;if(Math.min(m,G-m)<.25)return 1;for(const k of [2,3,4,5,6]){const j=Math.round(m*k/G);if(j%k!==0&&Math.abs(m-G*j/k)<.25)return k}return 0};
    return {n,G,K,L,T,A,pivot,theta,pos,swings,rows}}
  function draw(ctx,c,P,t,o={}){const a=o.a??1;if(a<=0)return [];const col=o.col||'#f4b740',out=[];ctx.save();ctx.globalAlpha*=a;
    /* suporte */const p0=c.P(add3(P.pivot(0),[-.03,0,0])),p1=c.P(add3(P.pivot(P.n-1),[.03,0,0]));if(isFinite(p0[0])&&isFinite(p1[0])){ctx.strokeStyle='rgba(236,230,214,.6)';ctx.lineWidth=Math.min(6,Math.max(2,c.f*.006/Math.max(p0[2],p1[2])));ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke()}
    const cf=o.colFn||(i=>i%2?C.cyan:col),tl=o.trail??.5,tp=o.tpos||P.pos;
    /* rastros (atrás): fita larga e suave + linha fina brilhante; com o.dust, pó de luz que fica para trás */
    if(tl>0)for(let i=0;i<P.n;i++){const cc=cf(i);if(o.ribbon){ctx.save();ctx.globalCompositeOperation='lighter';COS.trail(ctx,c,tt=>tp(i,tt),t-tl,t,{color:cc,lw:o.ribbon,a:.22,n:40,glow:false,pow:2});ctx.restore()}
      COS.trail(ctx,c,tt=>tp(i,tt),t-tl,t,{color:cc,lw:3,a:.85,n:40,pow:1.6});
      if(o.dust){const R=FX.rng(i*131+7);ctx.save();ctx.globalCompositeOperation='lighter';for(let k=0;k<o.dust;k++){const age=R()*tl,q=c.P(tp(i,t-age)),j=(R()-.5)*14;if(!isFinite(q[0]))continue;ctx.fillStyle=FX.rgba(cc,.55*(1-age/tl));ctx.beginPath();ctx.arc(q[0]+j,q[1]+(R()-.5)*14,1+1.6*R(),0,TAU);ctx.fill()}ctx.restore()}}
    /* fios e bolas, do mais longe para o mais perto */const items=[...Array(P.n)].map((_,i)=>{const b=tp(i,t),q=c.P(b);return {i,b,q}}).filter(it=>isFinite(it.q[0])).sort((u,v)=>v.q[2]-u.q[2]);
    for(const {i,b,q} of items){const pv=c.P(P.pivot(i)),rb=o.rb??.014,R=Math.max(3,c.f*rb/q[2]),th=o.held?P.A:P.theta(i,t),glow=Math.exp(-Math.pow(th/(P.A*.12),2)),cc=cf(i);
      if(isFinite(pv[0])){ctx.strokeStyle='rgba(236,230,214,.35)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(pv[0],pv[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}
      ctx.save();ctx.globalCompositeOperation='lighter';const gR=R*(2.6+3.5*glow),gg=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],gR);gg.addColorStop(0,FX.rgba(cc,.55+.45*glow));gg.addColorStop(1,FX.rgba(cc,0));ctx.fillStyle=gg;ctx.beginPath();ctx.arc(q[0],q[1],gR,0,TAU);ctx.fill();ctx.restore();
      const sg=ctx.createRadialGradient(q[0]-R*.35,q[1]-R*.35,R*.1,q[0],q[1],R);sg.addColorStop(0,'#fffaf0');sg.addColorStop(.4,cc);sg.addColorStop(1,FX.rgba(cc,.6));ctx.fillStyle=sg;ctx.beginPath();ctx.arc(q[0],q[1],R,0,TAU);ctx.fill();
      out.push({i,q,R,glow})}
    ctx.restore();return out}
  const add3=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  return {make,draw}})();
