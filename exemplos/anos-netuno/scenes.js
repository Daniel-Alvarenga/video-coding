/* ---------- anos-netuno: "Quantos anos você tem em NETUNO?" — Short vertical narrado, um plano contínuo ----------
   Fora de escala (órbitas comprimidas). Ano simulado Y(T): 1846 → 2011 enquanto a Terra dá 165 voltas e Netuno dá UMA,
   voltando à bandeira da descoberta em julho de 2011. Depois: 30 anos = 0,18 de volta de Netuno; Mercúrio dá 124 voltas
   em 30 anos; fecha com as três idades e volta ao "0" do quadro 0 (loop). */
const PLAN=__PLAN__;const DUR=PLAN.dur;
const ST=DUR.map((d,i)=>DUR.slice(0,i).reduce((a,b)=>a+b,0)),TTOT=DUR.reduce((a,b)=>a+b,0);
const ls=i=>ST[PLAN.sched.pt[i][0]]+PLAN.sched.pt[i][1],le=i=>ST[PLAN.sched.pt[i][0]]+PLAN.sched.pt[i][2];
function wt(i,w,frac=0){const tx=(PLAN.caps.pt[0][i]||[0,''])[1],k=tx.indexOf(w),f=k<0?0:(k+frac*w.length)/tx.length;return ls(i)+(le(i)-ls(i))*f}
const CX=W/2,sm=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*u*(u*(u*6-15)+10)};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],lerp3=(a,b,u)=>[lerp(a[0],b[0],u),lerp(a[1],b[1],u),lerp(a[2],b[2],u)];

/* ---------- tempos ---------- */
const T_ZERO=wt(0,'zero'),T_Y0=ls(2)-.3,T_JUL=wt(3,'julho'),T_Y1=T_JUL+.15,T_30=ls(4),T_ME0=ls(5)+.3,T_ME1=le(5)-.6,T_END=ls(6),T_BACK=TTOT-1.6;
const PN=164.79,PM=87.969/365.25,Y0=1846.73,Y1=Y0+PN;                 /* períodos em anos; descoberta (23/9/1846) e 1ª volta (jul/2011) */
/* ano simulado: parado na descoberta, corre até julho de 2011 (acelera e freia), depois fica */
const Yf=COS.spline([[0,Y0],[T_Y0,Y0],[T_Y0+1.2,Y0+4],[T_JUL-1.4,Y1-5],[T_Y1,Y1],[TTOT,Y1]]);
const Y=T=>T<T_Y0?Y0:T>T_Y1?Y1:Yf(T);
/* anos de Mercúrio: 0 → 124,6 em 30 anos terrestres */
const MY=T=>30*sm(T_ME0,T_ME1,T);

/* ---------- mundo (fora de escala) ---------- */
const RS=.6,RM=1.3,RE=2.2,RN=7,PRN=.75,PRE=.3,PRM=.17,AN0=-.35*Math.PI;   /* raios das órbitas e dos planetas; ângulo de Netuno na descoberta */
const pos=(r,an)=>[r*Math.cos(an),0,-r*Math.sin(an)];
const angN=y=>AN0+TAU*(y-Y0)/PN,angE=y=>1.3+TAU*(y-Y0),angM=my=>2.4+TAU*my/PM;
const SUN=[0,0,0];

/* ---------- câmera: chaves de alvo, distância, guinada e inclinação ---------- */
const NP=()=>pos(RN,angN(Y(0)));
const near=(a,ref)=>a+TAU*Math.round((ref-a)/TAU),YN=near(Math.atan2(-Math.cos(AN0),Math.sin(AN0))+.45,.1);   /* câmera do lado do Sol: Netuno iluminado */
const CAMK=[
 [0,         ()=>NP(), 3.4, YN, .22, 1050],
 [ls(1)+.2,  ()=>NP(), 3.4, YN, .22, 1050],
 [ls(1)+2.2, ()=>[0,0,0], 33, -.15, 1.05, 880],
 [T_Y0+.6,   ()=>[0,0,0], 31, .25, 1.0, 880],
 [T_JUL-1.2, ()=>[0,0,0], 33, .1, 1.05, 880],
 [T_JUL+.4,  T=>pos(RN*.8,angN(Y(T))), 11, .1, .9, 1000],
 [T_30-.2,   T=>pos(RN*.8,angN(Y(T))), 11, .1, .9, 1000],
 [T_30+1.2,  ()=>[0,0,0], 33, .1, 1.05, 880],
 [T_ME0-.4,  ()=>[0,0,0], 33, .1, 1.05, 880],
 [T_ME0+.4,  ()=>[0,0,0], 5.6, .1, 1.3, 1020],
 [T_END-.2,  ()=>[0,0,0], 5.6, .1, 1.3, 1020],
 [T_END+1.2, ()=>[0,0,0], 33, .1, 1.05, 880],
 [T_BACK,    ()=>[0,0,0], 33, .1, 1.05, 880],
 [TTOT,      ()=>NP(), 3.4, YN, .22, 1050]];
function cam(T){let i=0;while(i<CAMK.length-2&&T>CAMK[i+1][0])i++;const a=CAMK[i],b=CAMK[i+1],u=sm(a[0],b[0],T);
  return W3D.cam({target:lerp3(a[1](T),b[1](T),u),dist:COS.lerpL(a[2],b[2],u),yaw:lerp(a[3],b[3],u),pitch:lerp(a[4],b[4],u),fov:.8,cy:lerp(a[5],b[5],u)})}

/* ---------- desenho ---------- */
/* 1,5× mais estrelas: uma segunda camada em direções fixas (giram certo com a câmera) */
const XS=(()=>{const R=FX.rng(2718),a=[];for(let i=0;i<1700;i++){const z=R()*2-1,an=R()*TAU,s=Math.sqrt(1-z*z),m=Math.pow(R(),6);a.push({d:[s*Math.cos(an),z,s*Math.sin(an)],m,col:R()<.15?'255,220,190':R()<.35?'200,215,255':'240,243,255'})}return a})();
function moreStars(ctx,c){ctx.save();ctx.globalCompositeOperation='lighter';for(const s of XS){const q=COS.dirP(c,s.d);if(!q||q[0]<-4||q[0]>W+4||q[1]<-4||q[1]>H+4)continue;ctx.fillStyle=`rgba(${s.col},${.25+.7*s.m})`;ctx.beginPath();ctx.arc(q[0],q[1],.55+1.9*s.m,0,TAU);ctx.fill()}ctx.restore()}
/* os 8 planetas em ordem (só na apresentação, logo depois do gancho): órbitas, bolinhas e a contagem 1º…8º */
const ORD=[['mercurio','MERCÚRIO',RM],['venus','VÊNUS',1.75],['terra','TERRA',RE],['marte','MARTE',2.75],['jupiter','JÚPITER',3.9],['saturno','SATURNO',5.0],['urano','URANO',6.0],['netuno','NETUNO',RN]];
const T_ORD=ls(1)+.9,T_8=wt(1,'oitavo');
function others(ctx,c,T){const a=sm(T_ORD,T_ORD+.5,T)*(1-sm(T_Y0+.2,T_Y0+.9,T));if(a<=0)return;
  ORD.forEach(([k,n,r],i)=>{if(k==='mercurio'||k==='terra'||k==='netuno')return;const an=1.1+i*.9+T*.25/Math.pow(r,1.5);PL.orbit(ctx,c,r,'#ece6d6',{a:.18*a,lw:1.2});
    const P=pos(r,an);ctx.save();ctx.globalAlpha*=a;PL.planet(ctx,c,k,P,k==='jupiter'||k==='saturno'?.42:.22,{sun:SUN,spin:T*.6});ctx.restore()})}
function ordLabels(ctx,c,T){const a=sm(T_ORD,T_ORD+.4,T)*(1-sm(T_Y0+.2,T_Y0+.8,T));if(a<=0)return;
  ORD.forEach(([k,n,r],i)=>{const t0=T_ORD+i*(Math.max(.6,T_8-T_ORD-.2)/8),la=a*sm(t0,t0+.2,T);if(la<=0)return;const an=k==='netuno'?angN(Y(T)):k==='terra'?angE(Y(T)):k==='mercurio'?angM(0):1.1+i*.9+T*.25/Math.pow(r,1.5);
    const q=c.P(pos(r,an));if(!isFinite(q[0]))return;const last=k==='netuno',sz=last?44:26;
    txt(ctx,(i+1)+'º',q[0],q[1]-(last?44:22),{font:F.mono,weight:500,size:sz,color:last?C.gold:C.chalk,a:la*(last?1:.85)})})}
function film(ctx,T){if(T<0){thumbFrame(ctx);return}const c=cam(T),y=Y(T),my=MY(T);
  ctx.fillStyle='#03050a';ctx.fillRect(0,0,W,H);COS.sky(ctx,c,{a:1,band:.75});moreStars(ctx,c);
  others(ctx,c,T);
  /* órbitas */
  PL.orbit(ctx,c,RN,'#62d0ea',{a:.35,lw:2});PL.orbit(ctx,c,RE,'#62d0ea',{a:.3,lw:1.6});PL.orbit(ctx,c,RM,'#ece6d6',{a:.25*sm(T_30,T_ME0,T)+.12,lw:1.4});
  /* volta de Netuno desde 1846 (rastro dourado que cresce) e bandeira da descoberta */
  const prog=(y-Y0)/PN;if(prog>.002&&T<T_BACK+.6){const a1=angN(y),n=Math.max(8,Math.round(160*prog));ctx.save();ctx.strokeStyle=C.gold;ctx.shadowColor=C.gold;ctx.shadowBlur=14;ctx.lineWidth=6;ctx.globalAlpha=1-sm(T_BACK,T_BACK+.6,T);ctx.beginPath();
    for(let k=0;k<=n;k++){const q=c.P(pos(RN,AN0+(a1-AN0)*k/n));k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}ctx.stroke();ctx.restore()}
  const fa=sm(ls(3)-.4,ls(3),T)*(1-sm(T_BACK,T_BACK+.6,T));if(fa>0)COS.flag(ctx,c,pos(RN,AN0),{h:1.4,label:'1846',col:C.gold,t:T,a:fa});
  /* 30 anos = fatia de 0,18 da volta de Netuno */
  const wa=sm(T_30,T_30+.6,T)*(1-sm(T_ME0-.6,T_ME0,T));if(wa>0){const a0=angN(Y1),deg=a=>a*180/Math.PI;PL.wedge(ctx,c,deg(a0)+deg(TAU*30/PN)/2,deg(TAU*30/PN),RN-.8,RN+.8,{a:wa*.85,color:C.gold})}
  /* Sol, planetas (a Terra com rastro ciano quando corre) */
  COS.sun(ctx,c,SUN,RS,T,{glow:.9,loop:TTOT});
  const eA=angE(y),spd=T>T_Y0&&T<T_Y1?1:0;if(spd){ctx.save();ctx.globalAlpha*=.65*sm(T_Y0,T_Y0+.6,T)*(1-sm(T_JUL-.8,T_JUL,T));COS.trail(ctx,c,k=>pos(RE,eA-k*TAU*.9),0,1,{color:'#62d0ea',lw:5,n:60});ctx.restore()}
  PL.planet(ctx,c,'terra',pos(RE,eA),PRE,{sun:SUN,spin:y*TAU,clouds:.02});
  const mA=angM(my);if(T>T_ME0&&T<T_ME1){ctx.save();ctx.globalAlpha*=.7;COS.trail(ctx,c,k=>pos(RM,mA-k*TAU*.85),0,1,{color:'#ece6d6',lw:4,n:50});ctx.restore()}
  PL.planet(ctx,c,'mercurio',pos(RM,mA),PRM,{sun:SUN,spin:mA});
  PL.planet(ctx,c,'netuno',pos(RN,angN(y)),PRN,{sun:SUN,spin:T*.8});
  /* clarão quando Netuno fecha a volta */
  const fl=Math.exp(-Math.max(0,T-T_JUL)*5)*(T>=T_JUL?1:0);if(fl>.01){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,240,200,${fl*.45})`;ctx.fillRect(0,0,W,H);ctx.restore()}
  ordLabels(ctx,c,T);hud(ctx,T,y,my);
  if(T>=T_ZERO)logEv('zero','stamp',0);if(T>=T_Y0)logEv('run','riser',1);if(T>=T_JUL)logEv('jul','impact',0);if(T>=T_JUL)logEv('julc','chime',0);if(T>=T_30)logEv('w30','whoosh',.8);
  if(T>=T_ME0)logEv('me','whoosh',1);if(T>=T_ME1)logEv('me124','stamp',0);if(T>=T_BACK)logEv('back','whoosh',1.2);
  /* um tique por volta da Terra (até 165) e por ano de Mercúrio (124) */
  const ne=Math.floor(y-Y0);if(ne>0&&T<T_Y1+.1)logEv('e'+ne,'tick',1);const nm=Math.floor(my/PM);if(nm>0&&T<T_ME1+.1)logEv('m'+nm,'tick',1)}

function band(ctx,y0,y1,a=.6){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'rgba(3,5,10,0)');g.addColorStop(.25,`rgba(3,5,10,${a})`);g.addColorStop(.75,`rgba(3,5,10,${a})`);g.addColorStop(1,'rgba(3,5,10,0)');ctx.fillStyle=g;ctx.fillRect(0,y0,W,y1-y0)}
function big(ctx,s,y,o={}){const pop=1+(o.pop||0);ctx.save();ctx.translate(CX,y);ctx.scale(pop,pop);ctx.shadowColor=o.col||C.gold;ctx.shadowBlur=24;txt(ctx,s,0,0,{font:o.font||F.sans,weight:600,size:o.size||300,ls:o.ls||0,color:o.col||C.gold,a:o.a??1});ctx.restore()}
const TAGS=[
 {t:-1e4,name:''},
 {t:wt(1,'oitavo')-.1,name:'8º PLANETA',val:'o mais distante'},
 {t:wt(1,'cento')-.1,name:'1 VOLTA DE NETUNO',val:'165 anos'},
 {t:ls(2),name:'A TERRA DÁ',val:'165 voltas',col:C.cyan},
 {t:ls(3)+.2,name:'DESCOBERTO EM',val:'1846'},
 {t:T_JUL,name:'1ª VOLTA',val:'julho de 2011'},
 {t:T_30,name:'30 ANOS AQUI',val:'0,18 lá'},
 {t:T_ME0,name:'MERCÚRIO',val:'88 dias por ano',col:C.cyan},
 {t:T_END,name:''}];
function hud(ctx,T,y,my){
  band(ctx,0,560,.55);
  /* quadro 0 e volta do loop: o "0" gigante */
  const za=T<6?1-sm(ls(1)+.6,ls(1)+1.2,T):sm(T_BACK+.6,TTOT-.15,T);
  if(za>0){txt(ctx,'Sua idade em',CX,170,{font:F.sans,weight:600,size:64,color:C.chalk,a:za});txt(ctx,'NETUNO',CX,250,{font:F.sans,weight:600,size:92,ls:8,color:C.cyan,a:za});
    big(ctx,'0',520,{size:300,a:za,pop:.25*Math.exp(-Math.max(0,T-T_ZERO)*8)*(T>=T_ZERO&&T<6?1:0)})}
  /* contador de anos 1846 → 2011 e voltas da Terra */
  const ya=sm(ls(3)-.6,ls(3)-.1,T)*(1-sm(T_30-.3,T_30+.1,T));if(ya>0){txt(ctx,'ANO',CX,170,{font:F.mono,size:30,ls:6,color:C.dim,a:ya});big(ctx,String(Math.floor(y)),330,{size:170,font:F.mono,a:ya,col:T>=T_JUL?C.gold:'#fff2d8'});
    txt(ctx,'TERRA: '+Math.min(165,Math.round(y-Y0))+' voltas',CX,430,{font:F.mono,size:42,color:C.cyan,a:ya})}
  const ea=sm(ls(2)-.2,ls(2)+.2,T)*(1-sm(ls(3)-.6,ls(3)-.1,T));if(ea>0){txt(ctx,'TERRA',CX,170,{font:F.mono,size:30,ls:6,color:C.dim,a:ea});big(ctx,String(Math.min(165,Math.round(y-Y0))),360,{size:220,font:F.mono,col:C.cyan,a:ea});txt(ctx,'voltas',CX,450,{font:F.sans,weight:600,size:52,color:C.chalk,a:ea})}
  /* 30 anos = 0,18 */
  const ta=sm(T_30,T_30+.3,T)*(1-sm(T_ME0-.5,T_ME0-.1,T));if(ta>0){txt(ctx,'30 anos aqui =',CX,190,{font:F.sans,weight:600,size:66,color:C.chalk,a:ta});big(ctx,'0,18',400,{size:220,a:ta})}
  /* Mercúrio: contador até 124 */
  const ma=sm(T_ME0-.1,T_ME0+.3,T)*(1-sm(T_END+.6,T_END+1,T));if(ma>0){txt(ctx,'Em MERCÚRIO, 30 anos =',CX,190,{font:F.sans,weight:600,size:58,color:C.chalk,a:ma});big(ctx,String(Math.floor(my/PM)),400,{size:230,font:F.mono,col:'#ece6d6',a:ma,pop:.15*Math.exp(-Math.max(0,T-T_ME1)*8)*(T>=T_ME1?1:0)});txt(ctx,'anos',CX,480,{font:F.sans,weight:600,size:52,color:C.chalk,a:ma})}
  /* fecho: as três idades */
  const fa=sm(T_END+.6,T_END+1.1,T)*(1-sm(T_BACK,T_BACK+.5,T));if(fa>0){const rows=[['MERCÚRIO','124','#ece6d6'],['TERRA','30',C.cyan],['NETUNO','0,18',C.gold]];
    rows.forEach(([n,v,col],k)=>{const yy=200+k*120,a=fa*sm(T_END+.6+k*.25,T_END+1+k*.25,T);txt(ctx,n,CX-40,yy,{font:F.mono,size:40,ls:4,color:C.dim,align:'right',a});txt(ctx,v,CX+10,yy+8,{font:F.mono,weight:500,size:96,color:col,align:'left',a})})}
  COS.tag(ctx,T,TAGS,{y:1480,nameSize:40,valSize:56})}

function thumbFrame(ctx){film(ctx,T_JUL+.5)}
const scenes=[{name:'Netuno',nameEn:'Neptune',dur:TTOT,tr:null,caps:[],en:[],draw(ctx,t){film(ctx,t)}}];
