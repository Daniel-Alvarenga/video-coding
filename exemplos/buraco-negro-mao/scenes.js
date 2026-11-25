/* ---------- buraco-negro-mao: "Se a Terra virasse buraco negro, caberia na sua MÃO?" — Short vertical narrado ----------
   A Terra (satélite NASA) é espremida sem perder massa: o diâmetro cai de 12.742 km para 1,8 cm (Rs = 2GM/c² = 8,87 mm).
   Vira buraco negro com lente gravitacional de verdade (BH.lens) sobre o céu, cabe numa mão ao lado de uma bolinha de gude,
   a Lua segue na mesma órbita, o anel de Einstein aparece; o Sol espremido teria 5,9 km (sobre São Paulo à noite).
   Fim: a bolinha volta a crescer até a Terra do quadro 0 (loop). */
const PLAN=__PLAN__;const DUR=PLAN.dur;
const ST=DUR.map((d,i)=>DUR.slice(0,i).reduce((a,b)=>a+b,0)),TTOT=DUR.reduce((a,b)=>a+b,0);
const ls=i=>ST[PLAN.sched.pt[i][0]]+PLAN.sched.pt[i][1],le=i=>ST[PLAN.sched.pt[i][0]]+PLAN.sched.pt[i][2];
function wt(i,w,frac=0){const tx=(PLAN.caps.pt[0][i]||[0,''])[1],k=tx.indexOf(w),f=k<0?0:(k+frac*w.length)/tx.length;return ls(i)+(le(i)-ls(i))*f}
const CX=W/2,sm=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*u*(u*(u*6-15)+10)};
const win=(T,a,b,f=.35)=>sm(a-f,a,T)*(1-sm(b-f,b,T));
const nf=v=>v.toLocaleString('pt-BR',{maximumFractionDigits:v<10?1:0});

/* ---------- tempos ---------- */
const T_SQ0=ls(1)+.2,T_SQ1=wt(2,'centímetro'),T_BH=T_SQ1,T_HAND=ls(3)-.3,T_MOON=ls(4)-.2,T_LENS=ls(5)-.2,T_SUN=ls(6)-.2,T_END=ls(7)-.1,T_BACK=TTOT-1.5,T_SUNB=wt(6,'seis');
/* diâmetro durante o aperto (em metros, log): 12.742 km → 1,77 cm */
const D0=1.2742e7,D1=.01774;
const diam=T=>T<T_SQ0?D0:T>T_SQ1?D1:Math.exp(lerp(Math.log(D0),Math.log(D1),Math.pow(sm(T_SQ0,T_SQ1,T),.85)));
const dTxt=d=>d>=1000?nf(d/1000)+' km':d>=1?nf(d)+' m':d>=.1?nf(d*100)+' cm':(d*100).toFixed(1).replace('.',',')+' cm';

/* ---------- céu 3D (gira devagar) e camada extra de estrelas ---------- */
const skyCam=T=>W3D.cam({target:[0,0,0],dist:10,yaw:.4+T*.012,pitch:.18+.03*Math.sin(T*.2),fov:.9,cy:H/2});
const XS=(()=>{const R=FX.rng(5150),a=[];for(let i=0;i<1700;i++){const z=R()*2-1,an=R()*TAU,s=Math.sqrt(1-z*z),m=Math.pow(R(),6);a.push({d:[s*Math.cos(an),z,s*Math.sin(an)],m,col:R()<.15?'255,220,190':R()<.35?'200,215,255':'240,243,255'})}return a})();
function sky(ctx,T){const c=skyCam(T);ctx.fillStyle='#02040a';ctx.fillRect(0,0,W,H);COS.sky(ctx,c,{a:1,band:1.1,pole:[.2,.35,.9]});
  ctx.save();ctx.globalCompositeOperation='lighter';for(const s of XS){const q=COS.dirP(c,s.d);if(!q||q[0]<-4||q[0]>W+4||q[1]<-4||q[1]>H+4)continue;ctx.fillStyle=`rgba(${s.col},${.25+.7*s.m})`;ctx.beginPath();ctx.arc(q[0],q[1],.55+1.9*s.m,0,TAU);ctx.fill()}ctx.restore()}

/* ---------- mão aberta (silhueta com volume) e bolinha de gude ---------- */
function hand(ctx,x,y,s,a){if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);ctx.scale(s,s);
  const P=new Path2D();P.moveTo(-.42,.95);P.bezierCurveTo(-.5,.55,-.55,.25,-.5,.05);   /* lado do mindinho */
  const fing=[[-.36,-.02,.105,.52],[-.15,-.1,.115,.66],[.07,-.12,.115,.7],[.28,-.06,.105,.6]];  /* x, base, meia-largura, comprimento */
  fing.forEach(([fx,fb,fw,fl])=>{P.lineTo(fx-fw,fb);P.lineTo(fx-fw,fb-fl+fw);P.arc(fx,fb-fl+fw,fw,Math.PI,0);P.lineTo(fx+fw,fb)});
  P.bezierCurveTo(.42,.05,.5,.12,.58,.1);P.bezierCurveTo(.78,.05,.9,-.05,.98,0);P.bezierCurveTo(1.04,.06,.95,.18,.86,.26);  /* polegar */
  P.bezierCurveTo(.7,.42,.55,.55,.48,.7);P.bezierCurveTo(.44,.82,.42,.9,.4,.95);P.closePath();
  const g=ctx.createLinearGradient(0,-.7,0,1);g.addColorStop(0,'#3a2a22');g.addColorStop(.5,'#5a3e30');g.addColorStop(1,'#2a1c16');ctx.fillStyle=g;ctx.fill(P);
  const pg=ctx.createRadialGradient(0,.35,.05,0,.35,.5);pg.addColorStop(0,'rgba(255,190,140,.22)');pg.addColorStop(1,'rgba(255,190,140,0)');ctx.fillStyle=pg;ctx.fill(P);
  ctx.strokeStyle=C.gold;ctx.lineWidth=.012;ctx.shadowColor=C.gold;ctx.shadowBlur=14;ctx.stroke(P);
  ctx.shadowBlur=0;ctx.strokeStyle='rgba(244,183,64,.35)';ctx.lineWidth=.006;ctx.beginPath();ctx.moveTo(-.38,.3);ctx.quadraticCurveTo(0,.42,.4,.22);ctx.moveTo(-.4,.12);ctx.quadraticCurveTo(-.05,.2,.3,.06);ctx.stroke();
  ctx.restore()}
function marble(ctx,x,y,r,a){if(a<=0)return;ctx.save();ctx.globalAlpha*=a;const g=ctx.createRadialGradient(x-r*.35,y-r*.35,r*.1,x,y,r);g.addColorStop(0,'rgba(220,250,255,.95)');g.addColorStop(.5,'rgba(98,208,234,.55)');g.addColorStop(1,'rgba(30,80,110,.85)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.strokeStyle='rgba(244,183,64,.85)';ctx.lineWidth=r*.18;ctx.beginPath();ctx.ellipse(x,y,r*.75,r*.25,.6,0,TAU);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.ellipse(x-r*.38,y-r*.42,r*.2,r*.12,-.6,0,TAU);ctx.fill();ctx.restore()}
function ruler(ctx,x0,y,pxPerCm,cm,a){if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle='rgba(236,230,214,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x0+cm*pxPerCm,y);ctx.stroke();
  for(let k=0;k<=cm*10;k++){const x=x0+k*pxPerCm/10,l=k%10===0?22:k%5===0?14:8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-l);ctx.stroke();if(k%10===0)txt(ctx,String(k/10),x,y+30,{font:F.mono,size:22,color:C.dim})}
  txt(ctx,'cm',x0+cm*pxPerCm+30,y+30,{font:F.mono,size:22,color:C.dim});ctx.restore()}

/* onda de choque: anel que se expande e some (implosões) */
function shock(ctx,x,y,t0,T,R,col){const k=T-t0;if(k<0||k>.9)return;const u=k/.9,r=R*(1-Math.pow(1-u,3));ctx.save();ctx.globalCompositeOperation='lighter';
  for(const [lw,al] of [[40,.12],[12,.35],[3,.9]]){ctx.strokeStyle=`rgba(${col},${al*(1-u)})`;ctx.lineWidth=lw*(1-u*.6);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke()}ctx.restore()}
/* ---------- textos ---------- */
const big=(ctx,s,x,y,o={})=>{ctx.save();ctx.shadowColor=o.col||C.gold;ctx.shadowBlur=o.blur??22;txt(ctx,s,x,y,{font:o.font||F.sans,weight:600,size:o.size||110,ls:o.ls||0,color:o.col||C.gold,a:o.a??1});ctx.restore()};
function band(ctx,y0,y1,a=.55){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'rgba(2,4,10,0)');g.addColorStop(.25,`rgba(2,4,10,${a})`);g.addColorStop(.75,`rgba(2,4,10,${a})`);g.addColorStop(1,'rgba(2,4,10,0)');ctx.fillStyle=g;ctx.fillRect(0,y0,W,y1-y0)}
const TAGS=[{t:-1e4,name:''},{t:T_SQ0+.2,name:'MASSA',val:'a mesma',col:C.cyan},{t:T_HAND,name:''},{t:T_MOON+.3,name:'A LUA',val:'mesma órbita',col:C.cyan},{t:T_LENS+.4,name:'A LUZ',val:'se curva',col:C.cyan},{t:T_SUN,name:''},{t:T_END,name:''}];

/* ---------- o filme ---------- */
function film(ctx,T){if(T<0){thumbFrame(ctx);return}sky(ctx,T);
  const sq=sm(T_SQ0,T_SQ1,T),back=sm(T_BACK,TTOT-.05,T),hA=win(T,T_HAND,T_MOON+.2),mA=win(T,T_MOON,T_LENS+.2),lA=win(T,T_LENS,T_SUN+.2),sA=win(T,T_SUN,T_END+.3),eA=win(T,T_END,T_BACK+.4);
  /* câmera 2D do "mundo" (os textos ficam fora dela): empurrões, giro leve e tremor no aperto */
  const shake=sq*(1-sm(T_BH,T_BH+.6,T))*16+Math.exp(-Math.max(0,T-T_BH)*6)*(T>=T_BH?26:0)+Math.exp(-Math.max(0,T-T_SUNB)*6)*(T>=T_SUNB?18:0);
  const sx=Math.sin(T*47)*shake,sy=Math.cos(T*39)*shake*.8;
  const zoom=T<T_SQ0?1+.08*T/T_SQ0:T<T_BH?1.08+1.1*Math.pow(sq,1.6):T<T_HAND?lerp(2.18,1,sm(T_BH+.2,T_HAND,T)):1;
  const rot=T<T_BH?.06*Math.sin(T*.6)+.08*sq:T<T_HAND?.08*(1-sm(T_BH,T_HAND,T)):0;
  ctx.save();ctx.translate(CX+sx,1000+sy);ctx.rotate(rot);ctx.scale(zoom,zoom);ctx.translate(-CX,-1000);
  /* 1) a Terra espremida (e voltando no fim do loop), com detritos sendo sugados em espiral */
  {const dNow=T<T_BACK?diam(T):Math.exp(lerp(Math.log(D1),Math.log(D0),Math.pow(back,1.2))),Re=380*Math.pow(Math.max(D1,dNow)/D0,.12);
    if(T<T_BH||T>T_BACK){const heat=sq*(1-back);
      if(heat>0){ctx.save();ctx.globalCompositeOperation='lighter';const R=FX.rng(77);for(let k=0;k<140;k++){const ph=(R()+T*(.6+R()*.8))%1,an=R()*TAU+ph*3.5,r=Re*(1.15+5*(1-ph)),q=[CX+Math.cos(an)*r,1000+Math.sin(an)*r*.9];
        ctx.fillStyle=`rgba(255,${170+R()*70|0},${90+R()*60|0},${heat*ph*.9})`;ctx.beginPath();ctx.arc(q[0],q[1],1.2+2.5*ph,0,TAU);ctx.fill()}
        const g=ctx.createRadialGradient(CX,1000,0,CX,1000,Re*2.6);g.addColorStop(0,`rgba(255,190,110,${.6*heat})`);g.addColorStop(1,'rgba(255,120,40,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(CX,1000,Re*2.6,0,TAU);ctx.fill();ctx.restore()}
      SC.sphere(ctx,'terra',CX,1000,Re,{sun:[-6,2,8],spin:T*.35+heat*6,axis:[0,1,0],clouds:.02});
      if(sq>0&&sq<1&&T<T_BACK){ctx.save();ctx.globalAlpha*=Math.sin(Math.PI*sq)*.9;for(let k=0;k<10;k++){const an=k*TAU/10+T*.7,r0=Re+40+30*Math.sin(T*9+k),r1=r0+60;COS.arrow(ctx,CX+Math.cos(an)*r1,1000+Math.sin(an)*r1,CX+Math.cos(an)*r0,1000+Math.sin(an)*r0,{col:C.gold,lw:3,head:12,glow:10})}ctx.restore()}}}
  /* 2) implosão: onda de choque e o buraco negro no lugar da Terra */
  shock(ctx,CX,1000,T_BH,T,700,'255,214,150');
  const bhOn=T>=T_BH&&T<T_BACK+.2;
  if(bhOn&&hA<.5&&mA<.5&&lA<.5&&sA<.5&&eA<.02){const pop=sm(T_BH,T_BH+.25,T)*(1-sm(T_BACK,T_BACK+.2,T));BH.lens(ctx,CX,1000,30*pop,{rE:30*3.6*pop,a:pop})}
  ctx.restore();
  if(T>=T_BH&&T<T_BACK){const fl=Math.exp(-(T-T_BH)*9);if(fl>.01){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,240,210,${fl*.5})`;ctx.fillRect(0,0,W,H);ctx.restore()}}
  /* contador da largura */
  {const ca=sm(T_SQ0-.2,T_SQ0+.2,T)*(1-sm(T_HAND,T_HAND+.4,T));if(ca>0){band(ctx,150,560);txt(ctx,'LARGURA DA TERRA',CX,240,{font:F.mono,size:34,ls:6,color:C.dim,a:ca});
    const pp=T>=T_BH?1+.25*Math.exp(-(T-T_BH)*7):1;ctx.save();ctx.translate(CX,380);ctx.scale(pp,pp);big(ctx,dTxt(diam(T)),0,0,{size:130,font:F.mono,a:ca,col:T>=T_BH?C.gold:'#fff2d8'});ctx.restore()}}
  /* 3) na mão: a mão sobe, o buraco negro cai na palma e a bolinha de gude rola até o lado (1 cm = 120 px) */
  if(hA>0){const pc=120,u=clamp((T-T_HAND)/.8),up=Math.pow(1-u,3),hx=CX-40,hy=860+900*up,zr=1+.05*sm(T_HAND,T_MOON,T);
    ctx.save();ctx.translate(CX,1100);ctx.scale(zr,zr);ctx.rotate(-.1*up);ctx.translate(-CX,-1100);hand(ctx,hx,hy,1100,hA);
    const fd=clamp((T-T_HAND-.5)/.55),by=lerp(-300,hy+400,fd*fd)-(fd>=1?Math.abs(Math.sin((T-T_HAND-1.05)*9))*40*Math.exp(-(T-T_HAND-1.05)*4):0);
    if(fd>0)BH.lens(ctx,hx-60,by,D1/2*100*pc/BH.SH,{rE:D1/2*100*pc/BH.SH*3.2,a:hA,box:300});
    const mr=clamp((T-T_HAND-1.0)/.8),mx=lerp(W+150,hx+230,1-Math.pow(1-mr,3));if(mr>0){ctx.save();ctx.translate(mx,hy+420);ctx.rotate(-(1-mr)*6);ctx.translate(-mx,-(hy+420));marble(ctx,mx,hy+420,.8*pc,hA);ctx.restore()}
    ctx.restore();ruler(ctx,CX-300,1420,pc,5,hA*sm(T_HAND+1.2,T_HAND+1.6,T));band(ctx,120,520,.75*hA);
    const pz=1+.2*Math.exp(-Math.max(0,T-T_HAND-1.05)*8)*(T>T_HAND+1.05?1:0);ctx.save();ctx.translate(CX,360);ctx.scale(pz,pz);big(ctx,'1,8 cm',0,0,{size:150,font:F.mono,a:hA});ctx.restore();
    txt(ctx,'uma bolinha de gude',CX,450,{font:F.sans,weight:600,size:52,color:C.chalk,a:hA*sm(ls(3),ls(3)+.3,T)})}
  /* 4) a Lua na mesma órbita: a câmera gira em volta */
  if(mA>0){const k=T-T_MOON,c=W3D.cam({target:[0,0,0],dist:lerp(30,21,sm(T_MOON,T_LENS,T)),yaw:.3+k*.32,pitch:lerp(.95,.45,sm(T_MOON,T_LENS,T)),fov:.8,cy:980}),an=k*.7+1.2,mp=[6*Math.cos(an),0,-6*Math.sin(an)];ctx.save();ctx.globalAlpha*=mA;
    PL.orbit(ctx,c,6,'#62d0ea',{a:.55,lw:2.5,glow:8});COS.trail(ctx,c,kk=>{const b=an-kk*1.8;return [6*Math.cos(b),0,-6*Math.sin(b)]},0,1,{color:'#ece6d6',lw:4,n:40});PL.moon(ctx,c,mp,.5,{sun:[-30,5,20],spin:-an});ctx.restore();
    const q=c.P([0,0,0]);BH.lens(ctx,q[0],q[1],20,{rE:72,a:mA,box:260});txt(ctx,'TERRA (1,8 cm)',q[0],q[1]+120,{font:F.mono,size:28,ls:3,color:C.gold,a:mA});
    const qm=c.P(mp);txt(ctx,'LUA',qm[0],qm[1]-56,{font:F.mono,size:28,ls:4,color:C.chalk,a:mA})}
  /* 5) a galáxia passa por trás do buraco negro e vira um anel de luz; a câmera chega mais perto */
  if(lA>0){const u=sm(T_LENS,wt(5,'anel')+.2,T),z=sm(T_LENS,T_SUN,T),rs=lerp(34,74,z),gx=lerp(CX+520,CX+20,u),gy=lerp(560,930,u);
    ctx.save();ctx.translate(CX,920);ctx.rotate(.12*z);ctx.translate(-CX,-920);ctx.globalAlpha*=lA;COS.galaxy(ctx,gx,gy,560,T*.08,{a:1,tilt:.55});ctx.restore();
    BH.lens(ctx,CX,920,rs,{rE:rs*3.6,a:lA,box:Math.min(900,rs*3.6*3)});
    band(ctx,1200,1420,.5*lA);const ta=lA*sm(wt(5,'anel')-.3,wt(5,'anel'),T),pz=1+.2*Math.exp(-Math.max(0,T-wt(5,'anel'))*7);ctx.save();ctx.translate(CX,1330);ctx.scale(pz,pz);big(ctx,'ANEL DE LUZ',0,0,{size:96,a:ta});ctx.restore()}
  /* 6) o Sol espremido: de 1,39 milhão de km para 5,9 km, com a câmera perseguindo e a implosão */
  if(sA>0){const u=sm(T_SUN+.3,T_SUNB,T),d=Math.exp(lerp(Math.log(1.3927e9),Math.log(5907),Math.pow(u,.9))),Rs=560*Math.pow(d/1.3927e9,.14),zs=1+1.4*Math.pow(u,1.8)*(1-sm(T_SUNB,T_SUNB+.8,T));
    ctx.save();ctx.translate(CX+sx,1020+sy);ctx.scale(zs,zs);ctx.translate(-CX,-1020);
    if(T<T_SUNB){ctx.save();ctx.globalAlpha*=sA;SC.sphere(ctx,'sol',CX,1020,Rs,{t:T,loop:TTOT,glow:.9,spin:u*8});ctx.restore()}
    shock(ctx,CX,1020,T_SUNB,T,600,'255,226,170');const bh=sm(T_SUNB,T_SUNB+.25,T);if(bh>0)BH.lens(ctx,CX,1020,30,{rE:108,a:sA*bh});ctx.restore();
    band(ctx,150,560,.6*sA);txt(ctx,'O SOL ESPREMIDO',CX,240,{font:F.mono,size:34,ls:6,color:C.dim,a:sA});const pz=T>=T_SUNB?1+.25*Math.exp(-(T-T_SUNB)*7):1;ctx.save();ctx.translate(CX,390);ctx.scale(pz,pz);big(ctx,dTxt(d),0,0,{size:140,font:F.mono,a:sA,col:bh>.5?C.gold:'#fff2d8'});ctx.restore();
    txt(ctx,'do tamanho de um bairro',CX,470,{font:F.sans,weight:600,size:48,color:C.chalk,a:sA*bh})}
  /* 7) fecho: o buraco negro pulsa e volta a crescer até a Terra (loop) */
  if(eA>0){const pz=1+.06*Math.sin((T-T_END)*5);BH.lens(ctx,CX,1000,34*pz,{rE:120*pz,a:eA*(1-back)});band(ctx,150,560,.55*eA);txt(ctx,'QUALQUER COISA',CX,280,{font:F.sans,weight:600,size:70,color:C.chalk,a:eA});big(ctx,'APERTADA O BASTANTE',CX,380,{size:76,a:eA})}
  /* gancho (quadro 0 e volta do loop) */
  const ga=T<6?1-sm(T_SQ0,T_SQ0+.4,T):sm(T_BACK+.6,TTOT-.1,T);if(ga>0){band(ctx,120,560,.5*ga);txt(ctx,'Se a Terra virasse buraco negro…',CX,250,{font:F.sans,weight:600,size:54,color:C.chalk,a:ga});big(ctx,'NA SUA MÃO?',CX,390,{size:118,ls:3,a:ga})}
  COS.tag(ctx,T,TAGS,{y:1480,nameSize:40,valSize:56});
  /* sons */
  if(T>=T_SQ0)logEv('sq','riser',1);if(T>=T_BH)logEv('bh','impact',0);if(T>=T_HAND)logEv('hand','pop',0);if(T>=T_MOON)logEv('moon','whoosh',1);if(T>=T_LENS)logEv('lens','chime',0);if(T>=T_SUN)logEv('sun','whoosh',1.4);if(T>=T_SUNB)logEv('six','impact',0);if(T>=T_HAND+1.05)logEv('drop','thud',0);if(T>=T_HAND+1.0)logEv('roll','swoosh',.6);if(T>=T_BACK)logEv('back','riser',1)}

function thumbFrame(ctx){film(ctx,T_HAND+1.2)}
const scenes=[{name:'BuracoNegro',nameEn:'BlackHole',dur:TTOT,tr:null,caps:[],en:[],draw(ctx,t){film(ctx,t)}}];
