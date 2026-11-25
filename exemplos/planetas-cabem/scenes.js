/* ---------- planetas-cabem: "TODOS os planetas cabem entre a Terra e a Lua?" — Short vertical SEM narração (música + texto), 34 s, loop exato ----------
   v2: gancho visual — Terra e Lua como nos desenhos (coladas) se afastam até a escala real; os 7 planetas aparecem numa ciranda com a pergunta.
   Tudo em escala real (1 px = 309 km): Terra embaixo, Lua no ponto mais longe da órbita (apogeu, 405.500 km de centro a centro) em cima.
   Os 7 planetas entram um por um na batida e se empilham a partir da superfície da Terra (diâmetro no equador).
   Sobram 17.382 km: a câmera aproxima, cabe mais uma Terra (sobram 4.640 km) e Mercúrio tenta e fica de fora por 239 km. */
const PLAN=__PLAN__;const TTOT=34.5,D0=2.5;   /* D0: atraso de toda a sequência da v1 por causa do gancho novo */
const CX=W/2,sm=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*u*(u*(u*6-15)+10)};
const backOut=u=>{u=clamp(u);const s=1.25;return 1+(s+1)*Math.pow(u-1,3)+s*Math.pow(u-1,2)};
const nf=v=>Math.round(v).toLocaleString('pt-BR');

/* ---------- escala ---------- */
const RT=6371,RL=1737.4,APO=405500,GAP=APO-RT-RL;          /* vão de superfície a superfície: 397.392 km */
const XC=380,YB=1500,YM=215,K=(YB-YM)/GAP;               /* px por km */
const PLS=[
 {k:'mercurio',n:'MERCÚRIO',d:4879,  t:3.0+D0},
 {k:'venus',   n:'VÊNUS',   d:12104, t:4.5+D0},
 {k:'marte',   n:'MARTE',   d:6779,  t:6.0+D0},
 {k:'jupiter', n:'JÚPITER', d:139820,t:8.0+D0},
 {k:'saturno', n:'SATURNO', d:116460,t:10.5+D0},
 {k:'urano',   n:'URANO',   d:50724, t:13.0+D0},
 {k:'netuno',  n:'NETUNO',  d:49244, t:15.0+D0}];
let acu=0;PLS.forEach(p=>{p.y=YB-(acu+p.d/2)*K;acu+=p.d;p.sum=acu});
const SUM=acu,LEFT=GAP-SUM,E2={d:2*RT,t:21.5+D0},LEFT2=LEFT-E2.d;E2.y=YB-(SUM+RT)*K;
const MERC={t0:23.0+D0,hit:24.0+D0,t1:26.0+D0};
const T_OK=16.5+D0,Z_IN0=18.0+D0,Z_IN1=19.5+D0,Z_OUT0=26.5+D0,Z_OUT1=28.0+D0,T_EXIT=29.5+D0;
const ZMAX=5,GY=(YB-SUM*K+YM)/2;                       /* centro do vão que sobra */

/* ---------- câmera 2D: zoom em volta do vão de cima ---------- */
const Z2=14,Z2_0=22.3+D0,Z2_1=23.1+D0,GY2=YM+(LEFT2/2)*K;   /* 2º zoom: no vão de 4.640 km, para Mercúrio */
function cam(T){const u=sm(Z_IN0,Z_IN1,T)*(1-sm(Z_OUT0,Z_OUT1,T)),v=sm(Z2_0,Z2_1,T)*(1-sm(Z_OUT0-.3,Z_OUT0+.6,T)),Z=Math.exp(Math.log(ZMAX)*u+Math.log(Z2/ZMAX)*v);
  const fy=lerp(GY,GY2,v),sx=lerp(XC,CX,u),sy=lerp(GY,780,u);   /* o ponto (XC,fy) do mundo vai para (sx,sy) da tela */
  return {Z,u,P:(x,y)=>[sx+(x-XC)*Z,sy+(y-fy)*Z]}}

/* ---------- fundo ---------- */
const SPC=document.createElement('canvas');SPC.width=W;SPC.height=H;{const g=SPC.getContext('2d');g.fillStyle='#03050a';g.fillRect(0,0,W,H);const r=g.createRadialGradient(W*.4,H*.45,60,W*.4,H*.45,H*.8);
  r.addColorStop(0,'rgba(24,34,62,.55)');r.addColorStop(1,'rgba(3,5,10,0)');g.fillStyle=r;g.fillRect(0,0,W,H)}
const STARS=(()=>{const R=FX.rng(91),s=[];for(let i=0;i<380;i++)s.push([R(),R(),Math.pow(R(),4),R()*TAU]);return s})();
function stars(ctx,T,cm){ctx.save();for(const [x,y,m,ph] of STARS){const k=.15+.25*m,px=((x*W-(cm.P(0,0)[0]-XC)*k)%W+W)%W,py=((y*H-(cm.P(0,0)[1]-GY)*k*.3)%H+H)%H;
  ctx.fillStyle=`rgba(235,240,255,${(.22+.6*m)*(.8+.2*Math.sin(TAU*T/TTOT*4+ph))})`;ctx.beginPath();ctx.arc(px,py,.6+1.5*m,0,TAU);ctx.fill()}ctx.restore()}

/* ---------- corpos ---------- */
const SUN=[7,3,6],spin=(T,n)=>TAU*n*T/TTOT;
function body(ctx,cm,kind,x,y,r,T,o={}){const q=cm.P(x,y),R=r*cm.Z;if(q[1]+R*2.4<-50||q[1]-R*2.4>H+50||q[0]+R*2.4<-50||q[0]-R*2.4>W+50)return q;
  const bl=R>300?Math.min(5,(R-300)/180):0;if(bl>.2)ctx.filter=`blur(${bl.toFixed(1)}px)`;SC.sphere(ctx,kind,q[0],q[1],R,{sun:SUN,spin:o.spin??0,pitch:o.pitch??0,yaw:o.yaw??0,a:o.a??1,clouds:.02,axis:o.axis});ctx.filter='none';return q}
/* x de um corpo que entra pela direita e assenta na coluna (na batida t) */
function slideX(t,T,r){const enter=XC+W+r*2.4*K-XC,u=clamp((T-(t-.55))/.55);return XC+enter*(1-backOut(u))}
/* ciranda: os 7 planetas girando em roda (tamanho reduzido) com a pergunta; quando começam os encaixes, a roda encolhe e vai para baixo à direita */
const T_INTRO0=1.0,T_INTRO1=2.4,T_CIR=3.0,T_Q0=5.0,T_Q1=5.7,FLY=.6;
function circ(T){const q=sm(T_Q0,T_Q1,T);return {cx:lerp(CX,770,q),cy:lerp(850,1090,q),R:lerp(370,165,q),s:lerp(.38,.27,q),rot:TAU*T/9}}
function cirPos(i,T){const c=circ(T),an=-Math.PI/2+TAU*i/7+c.rot;return [c.cx+Math.cos(an)*c.R,c.cy+Math.sin(an)*c.R*.92,c.s]}
/* posição na tela e escala de um planeta: na roda, voando (sai da roda e cresce até o tamanho real) ou na coluna */
function planetXY(i,T){const p=PLS[i],t0=p.t-FLY;if(T<t0){const [x,y,k]=cirPos(i,T);const pin=sm(T_CIR+i*.12,T_CIR+i*.12+.3,T);return {x,y,k:k*pin,a:pin}}
  if(T<p.t){const u=(T-t0)/FLY,[x0,y0,k0]=cirPos(i,t0),e=backOut(u),e2=u*u*(3-2*u);return {x:lerp(x0,XC,e),y:lerp(y0,p.y,e2),k:Math.exp(lerp(Math.log(k0),0,e2)),a:1}}
  return {x:XC,y:p.y,k:1,a:1}}
/* Terra e Lua: como nos desenhos (u=0) → em escala (u=1); no fim do loop voltam */
const ILL={E:[CX-20,1180,230],M:[CX+235,860,64]};
function introU(T){return T<6?sm(T_INTRO0,T_INTRO1,T):1-sm(TTOT-1.5,TTOT-.15,T)}
function exitX(T,i,r){const t0=T_EXIT+(6-i)*.1;if(T<t0)return 0;const u=clamp((T-t0)/.6);return u*u*(W+r*2.4*K)}

/* ---------- textos ---------- */
const GOLD=C.gold,CYAN=C.cyan;
function band(ctx,y0,y1,a=.6){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'rgba(3,5,10,0)');g.addColorStop(.3,`rgba(3,5,10,${a})`);g.addColorStop(.7,`rgba(3,5,10,${a})`);g.addColorStop(1,'rgba(3,5,10,0)');ctx.fillStyle=g;ctx.fillRect(0,y0,W,y1-y0)}
function segs(ctx,parts,cx,y){let w=0;parts.forEach(p=>{ctx.font=`600 ${p[1]}px ${F.sans}`;if('letterSpacing' in ctx)ctx.letterSpacing=p[3]+'px';p.w=ctx.measureText(p[0]).width;w+=p.w});
  if('letterSpacing' in ctx)ctx.letterSpacing='0px';let x=cx-w/2;parts.forEach(p=>{txt(ctx,p[0],x,y,{font:F.sans,weight:600,size:p[1],ls:p[3],color:p[2],align:'left'});x+=p.w})}
function hook(ctx,T){
  /* 1) como nos desenhos */const a1=(T<6?1-sm(T_INTRO0-.1,T_INTRO0+.3,T):sm(TTOT-.6,TTOT-.15,T));if(a1>0){ctx.save();ctx.globalAlpha*=a1;band(ctx,150,420,.5);
    txt(ctx,'Terra e Lua',CX,260,{font:F.sans,weight:600,size:92,color:C.chalk});txt(ctx,'como nos desenhos',CX,345,{font:F.mono,size:40,color:C.dim});ctx.restore()}
  /* 2) em escala */if(T<6&&T>=T_INTRO1-.15){const a2=1-sm(T_CIR-.1,T_CIR+.2,T);if(a2>0){COS.stamp(ctx,'EM ESCALA',CX+150,640,T-(T_INTRO1-.15),{size:64,col:CYAN,a:a2,rot:-.05});
    SC.type(ctx,'405.500 km',CX+150,760,T_INTRO1+.2,T,{cps:80,font:F.mono,size:46,color:C.chalk,a:a2})}}
  /* 3) a pergunta no meio da roda */const aq=sm(T_CIR+.4,T_CIR+.7,T)*(1-sm(T_Q0-.2,T_Q0+.2,T));if(aq>0){const pop=1+.25*Math.exp(-Math.max(0,T-T_CIR-.4)*8);ctx.save();ctx.globalAlpha*=aq;ctx.translate(CX,850);ctx.scale(pop,pop);
    txt(ctx,'CABEM',0,-6,{font:F.sans,weight:600,size:104,ls:4,color:GOLD});txt(ctx,'todos aqui?',0,66,{font:F.sans,weight:600,size:52,color:C.chalk});ctx.restore()}}
function hud(ctx,T,cm){const a=sm(T_Q0,T_Q0+.4,T)*(1-sm(T_EXIT,T_EXIT+.4,T))*(1-cm.u*0);if(a<=0)return;
  let sum=0;PLS.forEach(p=>{sum+=p.d*sm(p.t-.15,p.t+.35,T)});sum+=E2.d*sm(E2.t-.15,E2.t+.35,T);const left=GAP-sum;
  const y0=cm.u>.5?1300:330,ga=cm.u>.02&&cm.u<.98?0:1;ctx.save();ctx.globalAlpha*=a*ga;
  if(cm.u>.5)band(ctx,1230,1500,.6);const al=cm.u>.5?'center':'right',x=cm.u>.5?CX:1040;
  txt(ctx,'VÃO  '+nf(GAP)+' km',x,y0,{font:F.mono,size:36,color:'#9fd3e0',align:al});
  txt(ctx,(T>=E2.t-.15&&T<T_EXIT?'TOTAL  ':'PLANETAS  ')+nf(sum)+' km',x,y0+52,{font:F.mono,size:36,color:GOLD,align:al});
  txt(ctx,'SOBRAM  '+nf(left)+' km',x,y0+104,{font:F.mono,size:40,color:left<LEFT+1?C.chalk:'#9fd3e0',align:al,weight:left<LEFT+1?600:400});ctx.restore()}
/* nome grande do planeta que acabou de chegar, com linha até ele */
function callout(ctx,T,cm){if(cm.u>.02||T>=T_OK)return;let i=-1;PLS.forEach((p,k)=>{if(T>=p.t-.05)i=k});if(i<0)return;const p=PLS[i],k=T-p.t,nx=PLS[i+1]?PLS[i+1].t:T_OK,a=sm(-.05,.08,k)*(1-sm(nx-.35,nx-.08,T));if(a<=0)return;
  const pop=1+.2*Math.exp(-Math.max(0,k)*10),LX=820,LY=560;ctx.save();ctx.globalAlpha*=a;
  const q=cm.P(XC,p.y),r=p.d/2*K;ctx.strokeStyle='rgba(244,183,64,.7)';ctx.lineWidth=2.5;ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo(LX-170,LY+44);ctx.lineTo(q[0]+r+10,q[1]);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle=GOLD;ctx.beginPath();ctx.arc(q[0]+r+10,q[1],5,0,TAU);ctx.fill();
  ctx.translate(LX,LY);ctx.scale(pop,pop);txt(ctx,p.n,0,0,{font:F.sans,weight:600,size:p.n.length>7?70:80,ls:4,color:GOLD});ctx.restore();
  SC.type(ctx,nf(p.d)+' km',LX,LY+66,p.t,T,{cps:60,font:F.mono,size:42,color:CYAN,a})}
/* rótulos fixos de Terra e Lua e régua do vão */
function marks(ctx,T,cm){const a=1-sm(T_EXIT,T_EXIT+.5,T)*0;const qE=cm.P(XC,YB+RT*K),qM=cm.P(XC,YM-RL*K);
  const la=(1-cm.u)*sm(.97,1,introU(T));if(la>0){ctx.save();ctx.globalAlpha*=la;
    txt(ctx,'TERRA',qE[0]+38,qE[1]+12,{font:F.mono,size:28,ls:4,color:CYAN,align:'left'});
    txt(ctx,'LUA',qM[0]+30,qM[1]-2,{font:F.mono,size:28,ls:4,color:GOLD,align:'left'});txt(ctx,'no ponto mais longe',qM[0]+30,qM[1]+32,{font:F.mono,size:22,color:C.dim,align:'left'});
    /* régua do vão, à esquerda */const x=70,y0=cm.P(0,YM)[1],y1=cm.P(0,YB)[1];ctx.strokeStyle='rgba(98,208,234,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y1);ctx.moveTo(x-12,y0);ctx.lineTo(x+12,y0);ctx.moveTo(x-12,y1);ctx.lineTo(x+12,y1);ctx.stroke();
    /* trecho já ocupado pelos planetas, em ouro */let s=0;PLS.forEach(p=>{s+=p.d*sm(p.t-.15,p.t+.35,T)*(1-sm(T_EXIT,T_EXIT+.8,T))});if(s>0){ctx.strokeStyle=GOLD;ctx.shadowColor=GOLD;ctx.shadowBlur=10;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y1-s*K*cm.Z);ctx.stroke();ctx.shadowBlur=0}
    ctx.save();ctx.translate(x+30,(y0+y1)/2);ctx.rotate(-Math.PI/2);txt(ctx,'405.500 km de centro a centro',0,0,{font:F.mono,size:22,color:'#5d8a98'});ctx.restore();ctx.restore()}
  /* linha tracejada central (o "caminho" Terra–Lua) */
  ctx.save();ctx.globalAlpha*=.35*(1-cm.u)*sm(.9,1,introU(T));ctx.strokeStyle='rgba(98,208,234,.8)';ctx.setLineDash([6,10]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(qE[0],qE[1]-RT*K-4);ctx.lineTo(qM[0],qM[1]+RL*K+4);ctx.stroke();ctx.restore()}
/* vão de cima de perto: cota com o que sobra */
function gapMark(ctx,T,cm){const a=sm(.85,1,cm.u);if(a<=0)return;const yTop=YM,yBot=YB-SUM*K,ins=T>=E2.t?E2.d*sm(E2.t-.15,E2.t+.35,T):0,yb=yBot-ins*K,qa=cm.P(XC,yTop),qb=cm.P(XC,yb),x=CX-260;
  ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle='rgba(236,230,214,.75)';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x,qa[1]);ctx.lineTo(x,qb[1]);ctx.moveTo(x-16,qa[1]);ctx.lineTo(x+16,qa[1]);ctx.moveTo(x-16,qb[1]);ctx.lineTo(x+16,qb[1]);ctx.stroke();
  ctx.setLineDash([4,8]);ctx.strokeStyle='rgba(236,230,214,.35)';ctx.beginPath();ctx.moveTo(qa[0],qa[1]);ctx.lineTo(x,qa[1]);ctx.moveTo(qb[0],qb[1]);ctx.lineTo(x,qb[1]);ctx.stroke();ctx.setLineDash([]);
  txt(ctx,nf(GAP-SUM-ins)+' km',x-26,(qa[1]+qb[1])/2+14,{font:F.mono,size:38,color:C.chalk,align:'right',weight:600});ctx.restore()}
function zoomTexts(ctx,T,cm){if(cm.u<.5)return;ctx.save();ctx.globalAlpha*=sm(.6,.95,cm.u);band(ctx,150,420,.55);
  if(T<E2.t+.6&&T>=Z_IN1-.2){SC.type(ctx,'e ainda sobra espaço para',CX,250,Z_IN1,T,{cps:50,font:F.sans,weight:600,size:56,color:C.chalk});txt(ctx,'OUTRA TERRA',CX,350,{font:F.sans,weight:600,size:96,ls:6,color:CYAN,a:sm(E2.t-.2,E2.t,T)})}
  else if(T<MERC.t0){txt(ctx,'+ OUTRA TERRA',CX,280,{font:F.sans,weight:600,size:96,ls:6,color:CYAN});txt(ctx,'12.742 km',CX,355,{font:F.mono,size:44,color:'#9fd3e0'})}
  else if(T<MERC.hit){txt(ctx,'E MERCÚRIO?',CX,300,{font:F.sans,weight:600,size:104,ls:6,color:GOLD,a:sm(MERC.t0,MERC.t0+.15,T)})}
  else {COS.stamp(ctx,'NÃO CABE',CX,280,T-MERC.hit,{size:84,col:GOLD,rot:-.06});SC.type(ctx,'faltam 239 km',CX,420,MERC.hit+.4,T,{cps:40,font:F.mono,size:44,color:C.chalk})}
  ctx.restore()}
function endTexts(ctx,T,cm){/* "CABEM!" na hora em que Netuno assenta */
  if(T>=T_OK&&T<Z_IN0+.4){const a=1-sm(Z_IN0,Z_IN0+.4,T);COS.stamp(ctx,'CABEM!',CX+180,780,T-T_OK,{size:96,col:GOLD,a,rot:-.08})}
  /* vista geral depois do zoom: as 8 bolas */
  if(T>=Z_OUT1-.3&&T<T_EXIT+.4){const a=sm(Z_OUT1-.3,Z_OUT1,T)*(1-sm(T_EXIT,T_EXIT+.4,T));ctx.save();ctx.globalAlpha*=a;
    txt(ctx,'7 planetas',820,560,{font:F.sans,weight:600,size:70,color:GOLD});txt(ctx,'+ 1 Terra',820,645,{font:F.sans,weight:600,size:70,color:CYAN});
    txt(ctx,'sobram',820,740,{font:F.mono,size:34,color:C.dim});txt(ctx,'4.640 km',820,795,{font:F.mono,size:46,color:C.chalk,weight:600});ctx.restore()}}

/* ---------- o filme ---------- */
const BEATS=[T_INTRO1,...PLS.map(p=>p.t),T_OK,E2.t,MERC.hit];
function film(ctx,T){if(T<0){thumbFrame(ctx);return}T=((T%TTOT)+TTOT)%TTOT;ctx.drawImage(SPC,0,0);const cm=cam(T),b=SC.beat(T,BEATS,{flash:.18,shake:7});
  stars(ctx,T,cm);
  ctx.save();ctx.translate(b.dx,b.dy);
  /* Lua e Terra */
  {const u=introU(T);if(u<.999){const e=u*u*(3-2*u),mv=(A,x,y,r)=>[lerp(A[0],x,e),lerp(A[1],y,e),Math.exp(lerp(Math.log(A[2]),Math.log(r),e))],m=mv(ILL.M,XC,YM-RL*K,RL*K),t=mv(ILL.E,XC,YB+RT*K,RT*K);
      SC.sphere(ctx,'lua',m[0],m[1],m[2],{sun:SUN,spin:-.3});SC.sphere(ctx,'terra',t[0],t[1],t[2],{sun:SUN,spin:spin(T,2)+2.2,axis:[0,1,0],clouds:.02});
      if(e>.05&&e<.98){ctx.save();ctx.globalAlpha*=Math.sin(Math.PI*e)*.8;ctx.strokeStyle=CYAN;ctx.setLineDash([6,10]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(t[0],t[1]-t[2]-6);ctx.lineTo(m[0],m[1]+m[2]+6);ctx.stroke();ctx.restore()}}
    else{body(ctx,cm,'lua',XC,YM-RL*K,RL*K,T,{spin:-.3});body(ctx,cm,'terra',XC,YB+RT*K,RT*K,T,{spin:spin(T,2)+2.2,axis:[0,1,0]})}}
  if(cm.u<.3&&introU(T)>.98){const q=cm.P(XC,YM-RL*K);COS.ring(ctx,q,{r:16,t:T,a:(1-cm.u/.3)*.8})}
  /* planetas: entram na batida, saem no fim */
  /* planetas: aparecem na roda, voam até a coluna na batida e saem pela direita no fim (na roda, desenhados direto na tela) */
  PLS.map((p,i)=>i).sort((i,j)=>planetXY(i,T).y-planetXY(j,T).y).forEach(i=>{const p=PLS[i];if(T<T_CIR+i*.12||T>=T_EXIT+1.6)return;const P=planetXY(i,T),r=p.d/2*K,o={spin:spin(T,p.k==='jupiter'||p.k==='saturno'?3:1),pitch:p.k==='saturno'?.32:0};
    if(T<p.t){if(P.k>.01)SC.sphere(ctx,p.k,P.x,P.y,r*P.k,{sun:SUN,...o,a:P.a});return}
    body(ctx,cm,p.k,XC+exitX(T,i,p.d/2),p.y,r,T,o)});
  /* outra Terra e Mercúrio no vão de cima */
  if(T>=E2.t-.55&&T<T_EXIT+.8){const x=(T<E2.t?slideX(E2.t,T,RT):XC)+exitX(T,7,RT);body(ctx,cm,'terra',x,E2.y,RT*K,T,{spin:spin(T,2)+4,axis:[0,1,0]})}
  if(T>=MERC.t0&&T<MERC.t1){const rM=PLS[0].d/2,dy=LEFT2/2+RT,xs0=Math.sqrt((rM+RT)**2-dy*dy)*K,y=GY2,off=W/Z2*.7;let x;   /* encosta na outra Terra a 1.446 km do centro */
    if(T<MERC.hit){const u=(T-MERC.t0)/(MERC.hit-MERC.t0);x=XC+xs0+off*(1-u*u*(3-2*u))}
    else{const k=T-MERC.hit,u=clamp((k-.6)/(MERC.t1-MERC.hit-.6));x=XC+xs0+Math.abs(Math.sin(k*40))*Math.exp(-k*7)*xs0*.25+off*u*u}
    const q=body(ctx,cm,'mercurio',x,y,rM*K,T,{spin:spin(T,1)}),la=sm(MERC.t0+.3,MERC.t0+.6,T)*(1-sm(MERC.t1-.6,MERC.t1-.3,T)),R=rM*K*cm.Z;
    txt(ctx,'MERCÚRIO',q[0]+R+24,q[1]-6,{font:F.mono,size:30,ls:3,color:GOLD,align:'left',a:la});txt(ctx,'4.879 km',q[0]+R+24,q[1]+32,{font:F.mono,size:26,color:'#9fd3e0',align:'left',a:la})}
  /* de perto: nomes da Lua e da outra Terra */
  if(cm.u>.5){const a=sm(.6,.95,cm.u),qm=cm.P(XC,YM-RL*K),qe=cm.P(XC,E2.y),rm=RL*K*cm.Z,re=RT*K*cm.Z;
    txt(ctx,'LUA',qm[0]+rm+20,qm[1]+10,{font:F.mono,size:28,ls:4,color:C.chalk,align:'left',a:a*(T<MERC.t0||T>MERC.t1?1:0)});
    if(T>=E2.t)txt(ctx,'TERRA',qe[0]+re+20,qe[1]+10,{font:F.mono,size:28,ls:4,color:CYAN,align:'left',a:a*sm(E2.t,E2.t+.3,T)*(T<MERC.t0||T>MERC.t1?1:0)})}
  ctx.restore();
  marks(ctx,T,cm);gapMark(ctx,T,cm);
  hook(ctx,T);hud(ctx,T,cm);callout(ctx,T,cm);zoomTexts(ctx,T,cm);endTexts(ctx,T,cm);
  if(b.flash>.01){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,248,230,${b.flash})`;ctx.fillRect(0,0,W,H);ctx.restore()}
  /* sons: cada planeta entra na roda com um pop; cada encaixe tem whoosh, baque e uma nota que sobe (pentatônica) */
  PLS.forEach((p,i)=>{if(T>=T_CIR+i*.12)logEv('cir'+i,'pop',i);if(T>=p.t-FLY)logEv('in'+i,'whoosh',.7);if(T>=p.t){logEv('hit'+i,'impact',i===3||i===4?0:.6);logEv('nt'+i,'note',[74,77,79,81,84,86,89][i]);logEv('th'+i,'thud',0);if(i===3||i===4)logEv('gg'+i,'gong',0);logEv('sp'+i,'sparkle',0)}});
  if(T>=T_INTRO0)logEv('apart','whoosh',1.4);if(T>=T_INTRO1-.15)logEv('esc','stamp',0);if(T>=T_CIR+.4)logEv('q','chime',0);if(T>=E2.t)logEv('e2n','note',93);
  if(T>=T_OK){logEv('ok','chime',1);logEv('okst','stamp',0)}if(T>=TTOT-1.5)logEv('back','whoosh',1.2);if(T>=Z_IN0)logEv('zin','riser',1);if(T>=E2.t)logEv('e2','impact',.4);if(T>=MERC.t0)logEv('min','whoosh',.6);if(T>=MERC.hit)logEv('mhit','pop',1);
  if(T>=T_EXIT)logEv('out','swoosh',1)}

function thumbFrame(ctx){film(ctx,T_OK+.4)}
const scenes=[{name:'Planetas',nameEn:'Planets',dur:DUR_ALL(),tr:null,caps:[],en:[],draw(ctx,t){film(ctx,t)}}];
function DUR_ALL(){return PLAN.dur[0]}
