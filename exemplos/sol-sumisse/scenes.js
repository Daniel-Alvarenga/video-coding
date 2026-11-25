/* ---------- sol-sumisse: "Se o Sol SUMISSE agora, você ia perceber?" — Short vertical narrado, um plano contínuo ----------
   Tempo simulado S (segundos desde que o Sol sumiu) guiado pela narração: a frente da última luz (e da gravidade) sai do lugar do Sol
   a c e chega à Terra em S = 499 s (8 min 19 s ≈ 8 min 20 s). Os fótons já emitidos seguem viajando; dentro da frente não há mais luz.
   Depois da frente, a Terra fica no escuro (luzes das cidades) e sai pela tangente. No fim, rebobina até o quadro 0 (loop). Fora de escala. */
const PLAN=__PLAN__;const DUR=PLAN.dur;
const ST=DUR.map((d,i)=>DUR.slice(0,i).reduce((a,b)=>a+b,0)),TTOT=DUR.reduce((a,b)=>a+b,0);
const ls=i=>ST[PLAN.sched.pt[i][0]]+PLAN.sched.pt[i][1],le=i=>ST[PLAN.sched.pt[i][0]]+PLAN.sched.pt[i][2];
function wt(i,w,frac=0){const tx=PLAN.txt?PLAN.txt.pt[i]:(PLAN.caps.pt[0][i]||[0,''])[1],k=tx.indexOf(w),f=k<0?0:(k+frac*w.length)/tx.length;return ls(i)+(le(i)-ls(i))*f}
const CX=W/2,sm=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*u*(u*(u*6-15)+10)};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],lerp3=(a,b,u)=>[lerp(a[0],b[0],u),lerp(a[1],b[1],u),lerp(a[2],b[2],u)];

/* ---------- tempos ---------- */
const T_V=wt(0,'sumisse')+.15,T_N=wt(5,'noite'),T_RETA=wt(5,'reta'),T_REW=le(6)+.25,T_REW1=TTOT-.7;
const SD=499;                                                     /* s: luz do Sol até a Terra (1 UA / c) */
const Sf=COS.spline([[0,-40],[T_V,0],[ls(1)+.4,20],[le(1),70],[le(2),230],[le(3),340],[le(4),450],[T_N,SD],[le(5),540],[T_REW,575],[T_REW1,-63],[TTOT,-40]]);
const S=T=>Sf(T);

/* ---------- mundo (fora de escala) ---------- */
const RS=1.15,DE=8,RE=.46,DMAX=17,CL=DE/SD;                       /* CL: unidades por segundo simulado (a luz) */
const W0=.00025,TH0=-Math.PI/2+.12;                                 /* giro da Terra na órbita por segundo simulado */
const EP=th=>[DE*Math.cos(th),0,-DE*Math.sin(th)],ETAN=th=>[-Math.sin(th),0,-Math.cos(th)];
function earthPos(s){if(s<=SD)return EP(TH0+W0*s);const th=TH0+W0*SD;return add(EP(th),mul(ETAN(th),DE*W0*5*(s-SD)))}  /* depois da noite, exagera a velocidade para a linha reta aparecer */
const front=s=>Math.max(0,CL*s);                                   /* raio da frente da última luz (centro: onde estava o Sol) */
/* fótons em várias direções do plano e um pouco fora dele; cada um tem uma fase radial */
const PH=(()=>{const R=FX.rng(808),a=[];for(let i=0;i<420;i++){const an=R()*TAU,el=(R()-.5)*.5;a.push({d:[Math.cos(an)*Math.cos(el),Math.sin(el),-Math.sin(an)*Math.cos(el)],p:R(),k:.5+R()*.5})}
  /* um feixe mais denso apontado para a Terra */for(let i=0;i<70;i++){const an=TH0+(R()-.5)*.09,el=(R()-.5)*.04;a.push({d:[Math.cos(an)*Math.cos(el),Math.sin(el),-Math.sin(an)*Math.cos(el)],p:R(),k:1,hot:1})}return a})();

/* ---------- câmera: vista de cima, Sol para cima e Terra para baixo na tela; alvo, altura e posição do alvo na tela por chaves ---------- */
const EAT=T=>earthPos(S(T)),MID=[.5,0,4.3];
const CAMK=[
 [0,        ()=>MID, 17.3, 1030],
 [ls(1)+.3, ()=>MID, 17.3, 1030],
 [le(1),    ()=>MID, 17.3, 1030],
 [ls(3)+.2, ()=>MID, 17.3, 1030],
 [ls(3)+1.2,T=>EAT(T), 3.0, 1150],
 [le(3),    T=>EAT(T), 2.8, 1150],
 [ls(4)+.9, ()=>MID, 17.3, 1030],
 [le(4)-.4, ()=>MID, 17.3, 1030],
 [T_N-.5,   T=>EAT(T), 2.9, 1120],
 [T_RETA,   T=>EAT(T), 2.9, 1120],
 [le(5)+.3, T=>add(EAT(T),[1.2,0,-.8]), 6.5, 1080],
 [T_REW,    T=>add(EAT(T),[1.2,0,-.8]), 7.5, 1080],
 [T_REW1,   ()=>MID, 17.3, 1030],
 [TTOT,     ()=>MID, 17.3, 1030]];
function cam(T){let i=0;while(i<CAMK.length-2&&T>CAMK[i+1][0])i++;const a=CAMK[i],b=CAMK[i+1],u=sm(a[0],b[0],T),tg=lerp3(a[1](T),b[1](T),u),h=COS.lerpL(a[2],b[2],u);
  return COS.lookCam(add(tg,[0,h,h*.42]),tg,{fov:.85,cy:lerp(a[3],b[3],u)})}

/* ---------- desenho ---------- */
function ringAt(ctx,c,r,o={}){if(r<=.02)return;const n=160;ctx.save();ctx.globalAlpha*=o.a??1;ctx.strokeStyle=o.col;ctx.lineWidth=o.lw||3;if(o.dash)ctx.setLineDash(o.dash);if(o.glow){ctx.shadowColor=o.col;ctx.shadowBlur=o.glow}
  ctx.beginPath();let pen=false;for(let k=0;k<=n;k++){const an=k/n*TAU,q=c.P([r*Math.cos(an),0,-r*Math.sin(an)]);if(!isFinite(q[0])||q[2]<=0){pen=false;continue}pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}ctx.stroke();ctx.restore()}
function photons(ctx,c,s,T){const L=CL*s,F=front(s),dl=.32;ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(const p of PH){const r=RS+((p.p*DMAX+L)%DMAX+DMAX)%DMAX;if(s>0&&r-RS<F)continue;const r0=Math.max(RS,r-dl*p.k),A=c.P(mul(p.d,r0)),B=c.P(mul(p.d,r));if(!isFinite(A[0])||!isFinite(B[0])||B[2]<=0)continue;
    const fade=clamp((DMAX+RS-r)/3)*clamp((r-RS)/.6+.3);ctx.strokeStyle=p.hot?`rgba(255,236,190,${.85*fade})`:`rgba(255,214,140,${.5*fade})`;ctx.lineWidth=p.hot?3:2;ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}
  ctx.restore()}
function clock(s){const v=Math.max(0,Math.round(s)),m=Math.floor(v/60),x=v%60;return String(m).padStart(2,'0')+':'+String(x).padStart(2,'0')}

function film(ctx,T){if(T<0){thumbFrame(ctx);return}const c=cam(T),s=S(T),F=front(s),E=earthPos(s),Ed=Math.hypot(E[0],E[2]);
  ctx.fillStyle='#03050a';ctx.fillRect(0,0,W,H);COS.sky(ctx,c,{a:1,band:.7});
  /* órbita: tracejada à frente da Terra depois que ela sai pela tangente */
  ringAt(ctx,c,DE,{col:'rgba(98,208,234,.35)',lw:2,dash:s>SD?[8,10]:null});
  /* linha reta (tangente) depois da noite */
  const ra=sm(T_RETA-.3,T_RETA+.4,T)*(1-sm(T_REW,T_REW+.6,T));if(ra>0){const th=TH0+W0*SD,P0=add(E,mul(ETAN(th),RE*1.6)),P1=add(P0,mul(ETAN(th),5)),q0=c.P(P0),q1=c.P(P1);if(isFinite(q0[0])&&isFinite(q1[0]))COS.arrow(ctx,q0[0],q0[1],q1[0],q1[1],{col:C.gold,lw:4,a:ra,glow:14})}
  /* Sol: encolhe e some com um clarão; depois, só o contorno de onde ele estava */
  const sv=1-sm(T_V-.25,T_V+.12,T)+sm(T_REW1-.5,T_REW1,T)*(T>T_REW?1:0);if(sv>.01)COS.sun(ctx,c,[0,0,0],RS*Math.max(.05,sv),T,{a:Math.min(1,sv*1.5),glow:1,loop:TTOT});
  const ga=clamp(1-sv)*(1-sm(T_REW1-.6,T_REW1-.2,T));if(ga>0){ringAt(ctx,c,RS,{col:'rgba(236,230,214,.5)',lw:2,dash:[5,8],a:ga});const q=c.P([0,0,0]);if(isFinite(q[0])&&T<ls(3)&&T>ls(1)+.2)txt(ctx,'onde estava o Sol',q[0],q[1]-c.f*RS/q[2]-22,{font:F.mono,size:24,color:C.dim,a:ga})}
  /* fótons já emitidos + frente da última luz (e da gravidade, a partir da fala 4) */
  photons(ctx,c,s,T);
  if(s>0&&F<DMAX){const fa=clamp(s/6);ringAt(ctx,c,F,{col:'rgba(255,240,210,.9)',lw:4,glow:20,a:fa});
    const gv=sm(wt(4,'gravidade')-.2,wt(4,'gravidade')+.3,T)*(T<T_REW?1:0);if(gv>0)ringAt(ctx,c,F*1.012,{col:C.gold,lw:3,dash:[14,10],glow:10,a:gv});
    /* rótulos da frente, no ponto mais perto da câmera */
    const la=clamp(s/10)*(F<Ed+.5?1:1-sm(T_N,T_N+.6,T));if(la>0){const an=TH0+.55,q=c.P([F*Math.cos(an),0,-F*Math.sin(an)]);if(isFinite(q[0])){
      txt(ctx,'ÚLTIMA LUZ',q[0]+16,q[1]-14,{font:F.mono,size:26,ls:3,color:'#fff2d8',align:'left',a:la});if(gv>0)txt(ctx,'+ GRAVIDADE',q[0]+16,q[1]+22,{font:F.mono,size:26,ls:3,color:C.gold,align:'left',a:la*gv})}}}
  /* Terra: iluminada até a frente passar; depois, noite inteira (luzes das cidades) */
  const dark=clamp((F-(Ed-RE))/(2*RE));
  PL.planet(ctx,c,'terra',E,RE,{sun:lerp3([0,0,0],[E[0]*3,-30,E[2]*3],dark),spin:.6+s*.004,axis:[0,1,0],clouds:.02,cloudA:.6});
  /* textos */
  hud(ctx,T,s);
  if(T>=T_V)logEv('vanish','impact',0);if(T>=T_N)logEv('night','impact',.5);if(T>=wt(4,'gravidade'))logEv('grav','whoosh',.6);if(T>=T_REW)logEv('rew','whoosh',2);if(T>=T_RETA)logEv('reta','whoosh',1);
  /* clarão quando o Sol some */const fl=Math.exp(-Math.max(0,T-T_V)*6)*(T>=T_V?1:0);if(fl>.01){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,240,210,${fl*.55})`;ctx.fillRect(0,0,W,H);ctx.restore()}}

const TAGS=[
 {t:-1e4,name:''},
 {t:wt(1,'oito'),name:'A LUZ LEVA',val:'8 min 20 s'},
 {t:ls(2)+.1,name:'LUZ',val:'300.000 km/s',col:C.cyan},
 {t:wt(2,'cento'),name:'DISTÂNCIA',val:'150 mi km',col:C.cyan},
 {t:wt(3,'céu'),name:'O CÉU',val:'igual'},
 {t:wt(4,'gravidade'),name:'GRAVIDADE',val:'= velocidade da luz'},
 {t:T_N,name:'NOITE',val:'08:20'},
 {t:T_RETA-.1,name:'A TERRA SEGUE',val:'em linha reta'},
 {t:wt(6,'olha'),name:'O SOL QUE VOCÊ VÊ',val:'8 min atrás'},
 {t:T_REW,name:''}];
function hud(ctx,T,s){
  /* gancho (início e volta do loop) */
  const ha=T<6?1-sm(ls(1)-.2,ls(1)+.2,T):sm(T_REW1-.4,TTOT-.1,T);
  {const g=ctx.createLinearGradient(0,0,0,520);g.addColorStop(0,'rgba(3,5,10,.8)');g.addColorStop(.7,'rgba(3,5,10,.45)');g.addColorStop(1,'rgba(3,5,10,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,520)}
  if(ha>0){txt(ctx,'Se o Sol',CX,240,{font:F.sans,weight:600,size:84,color:C.chalk,a:ha});txt(ctx,'SUMISSE',CX,350,{font:F.sans,weight:600,size:120,ls:8,color:C.gold,a:ha});txt(ctx,'agora…',CX,430,{font:F.sans,weight:600,size:64,color:C.chalk,a:ha})}
  /* relógio desde que o Sol sumiu */
  const ca=sm(ls(1)-.1,ls(1)+.3,T)*(1-sm(T_REW1-.5,T_REW1-.1,T));if(ca>0){txt(ctx,'DESDE QUE O SOL SUMIU',CX,190,{font:F.mono,size:28,ls:4,color:C.dim,a:ca});
    const done=s>=SD;ctx.save();ctx.shadowColor=done?C.gold:'#fff2d8';ctx.shadowBlur=20;txt(ctx,clock(s),CX,330,{font:F.mono,weight:500,size:132,color:done?C.gold:'#fff2d8',a:ca});ctx.restore();
    const pa=ca*(1-sm(T_N,T_N+.5,T));if(pa>0){const w=520,x0=CX-w/2,y=380,u=clamp(s/SD);ctx.save();ctx.globalAlpha*=pa;ctx.fillStyle='rgba(236,230,214,.15)';ctx.fillRect(x0,y,w,8);ctx.fillStyle='#fff2d8';ctx.fillRect(x0,y,w*u,8);
      txt(ctx,'SOL',x0,y+40,{font:F.mono,size:22,color:C.dim,align:'left'});txt(ctx,'TERRA',x0+w,y+40,{font:F.mono,size:22,color:C.cyan,align:'right'});ctx.restore()}}
  COS.tag(ctx,T,TAGS,{y:1500,nameSize:40,valSize:56})}

function thumbFrame(ctx){film(ctx,ls(2)+2)}
const scenes=[{name:'Sol',nameEn:'Sun',dur:TTOT,tr:null,caps:[],en:[],draw(ctx,t){film(ctx,t)}}];
