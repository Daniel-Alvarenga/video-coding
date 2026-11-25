/* ---------- GMAP: mapa de satélite em 3D (plano y = 0, em km) + Via Láctea de estrelas com estrutura real, em qualquer escala ----------
   Exemplo: projetos/via-lactea-brasil/ ("Se a Via Láctea fosse o Brasil"). Precisa de meta.json "geo": true e "geo_crops": ["brasil"]
   (recorte gerado por tools/geo_crop.py: geo/<nome>_sat.jpg, _noite.jpg, _crop.json).
   Mesma câmera do W3D/COS (x = leste, y = cima, z = sul; unidades em km).
   GMAP.frame(lat0,lon0)  projeção local equirretangular centrada em (lat0,lon0): .xy(lat,lon) -> [x,0,z] km, .ll([x,,z]) -> [lat,lon], .km(lat,lon,lat2,lon2) distância no globo
   GMAP.quad(ctx,c,img,P0,PU,PV,{n,a,sx,sy,sw,sh,op})  imagem (ou recorte sx,sy,sw,sh) num paralelogramo 3D P0 + u·(PU−P0) + v·(PV−P0), em n×n triângulos afins
   GMAP.map(ctx,c,fr,'brasil',{a,night,day,n})  recorte de satélite no plano y = 0 (day: brilho do dia; night: luzes das cidades por cima)
   GMAP.border(ctx,c,fr,'BRA',{col,lw,a,glow,fill})  fronteira de um país (Natural Earth, __GEO__) no plano
   GMAP.circle(ctx,c,center,r,{col,lw,a,dash,fill,n,glow})  círculo no plano y = 0 (ex.: o anel de 1.118 km)
   GMAP.line(ctx,c,A,B,{col,lw,a,dash,glow})  segmento 3D
   GMAP.galaxy({R,center,sunAt,sunR,seed,n,h})  Via Láctea vista como estrelas: disco exponencial, barra inclinada 27°, bojo, 4 braços
       logarítmicos (passo 12°: Escudo-Centauro e Perseu fortes, Sagitário e Norma/Externo fracos), o esporão de Órion onde fica o Sol,
       faixas de poeira na borda interna dos braços, espessura real (~1.000 anos-luz para 100.000 de diâmetro).
       R = raio do disco nas unidades do mundo; sunAt = ponto do mundo para onde o Sol aponta (gira a galáxia); sunR = raio do Sol (fração de R, 0,52)
       devolve G: G.sun (posição do Sol), G.draw(ctx,c,{a,glow,stars,dust,tw,size}), G.glowTex, G.armAt(r,θ)
   GMAP.ruler(ctx,c,A,B,txt,{col,a,off,size})  régua 3D com pontas e rótulo no meio
   GMAP.disc(ctx,c,P,r,{n,col,a,fill,glow})  disco no plano horizontal em P (ex.: o Sistema Solar de 16 cm)
   GMAP.town({O,u,v,m,u0,u1,block,road,seed}).draw(ctx,c,{a})  bairro à noite: avenida, transversais a cada quarteirão, calçadas, faixas, postes, sobrados
   GMAP.person(ctx,c,P,h,{hand,col,rim,a})  pessoa em silhueta de costas, de pé em P (altura h), braço até o ponto 3D hand; rim = cor da luz de contorno
   Determinístico (FX.rng). */
const GMAP=(()=>{
  const D=Math.PI/180,add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l]},dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const ok=q=>q&&isFinite(q[0])&&isFinite(q[1]);
  /* ---------- projeção local ---------- */
  function frame(lat0,lon0){const kx=111.32*Math.cos(lat0*D),kz=110.57;
    return {lat0,lon0,xy:(la,lo)=>[(lo-lon0)*kx,0,(lat0-la)*kz],ll:p=>[lat0-p[2]/kz,lon0+p[0]/kx],
      km:(a,b,c2,d)=>6371*Math.acos(clamp(Math.sin(a*D)*Math.sin(c2*D)+Math.cos(a*D)*Math.cos(c2*D)*Math.cos((b-d)*D),-1,1))}}
  /* ---------- imagem num quadrilátero 3D (triângulos afins) ---------- */
  function tri(ctx,img,s0,s1,s2,d0,d1,d2){const [u0,v0]=s0,[u1,v1]=s1,[u2,v2]=s2,den=(u1-u0)*(v2-v0)-(u2-u0)*(v1-v0);if(Math.abs(den)<1e-9)return;
    /* aumenta o triângulo de destino ~0,6 px para esconder as costuras */
    const cx=(d0[0]+d1[0]+d2[0])/3,cy=(d0[1]+d1[1]+d2[1])/3,gr=p=>{const dx=p[0]-cx,dy=p[1]-cy,l=Math.hypot(dx,dy)||1;return [p[0]+dx/l*.6,p[1]+dy/l*.6]};
    const e0=gr(d0),e1=gr(d1),e2=gr(d2);
    const a=((d1[0]-d0[0])*(v2-v0)-(d2[0]-d0[0])*(v1-v0))/den,b=((d1[1]-d0[1])*(v2-v0)-(d2[1]-d0[1])*(v1-v0))/den,
      c=((d2[0]-d0[0])*(u1-u0)-(d1[0]-d0[0])*(u2-u0))/den,d=((d2[1]-d0[1])*(u1-u0)-(d1[1]-d0[1])*(u2-u0))/den,e=d0[0]-a*u0-c*v0,f=d0[1]-b*u0-d*v0;
    ctx.save();ctx.beginPath();ctx.moveTo(e0[0],e0[1]);ctx.lineTo(e1[0],e1[1]);ctx.lineTo(e2[0],e2[1]);ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,e,f);ctx.drawImage(img,0,0);ctx.restore()}
  function quad(ctx,c,img,P0,PU,PV,o={}){if(!img)return;const a=o.a??1;if(a<=0)return;const n=o.n||12,sx=o.sx||0,sy=o.sy||0,sw=o.sw||img.width,sh=o.sh||img.height,
      dU=sub(PU,P0),dV=sub(PV,P0),Q=[];
    for(let j=0;j<=n;j++){const row=[];for(let i=0;i<=n;i++)row.push(c.P(add(P0,add(mul(dU,i/n),mul(dV,j/n)))));Q.push(row)}
    /* desenha numa camada própria e compõe uma vez: as costuras sobrepostas não somam luz no modo 'lighter' */
    const out=ctx;if(!SCR){SCR=document.createElement('canvas');SCR.width=W;SCR.height=H}const sg=SCR.getContext('2d');sg.setTransform(1,0,0,1,0,0);sg.clearRect(0,0,W,H);ctx=sg;
    ctx.save();ctx.imageSmoothingQuality='high';
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const A=Q[j][i],B=Q[j][i+1],C2=Q[j+1][i],E=Q[j+1][i+1];if(!ok(A)||!ok(B)||!ok(C2)||!ok(E))continue;
      if(Math.max(A[0],B[0],C2[0],E[0])<-20||Math.min(A[0],B[0],C2[0],E[0])>W+20||Math.max(A[1],B[1],C2[1],E[1])<-20||Math.min(A[1],B[1],C2[1],E[1])>H+20)continue;
      const u0=sx+sw*i/n,u1=sx+sw*(i+1)/n,v0=sy+sh*j/n,v1=sy+sh*(j+1)/n;
      tri(ctx,img,[u0,v0],[u1,v0],[u0,v1],A,B,C2);tri(ctx,img,[u1,v0],[u1,v1],[u0,v1],B,E,C2)}
    ctx.restore();out.save();out.globalAlpha*=a;if(o.op)out.globalCompositeOperation=o.op;out.setTransform(1,0,0,1,0,0);out.drawImage(SCR,0,0);out.restore()}
  let SCR=null;
  /* ---------- mapa de satélite ---------- */
  const region=k=>(typeof __CROPS__!=='undefined'&&__CROPS__[k])||null;
  const FEA={};function feather(name,f=.08){if(FEA[name])return FEA[name];const im=FX.IMG[name];if(!im)return null;const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;
    const g=cv.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='destination-in';const w=cv.width,h=cv.height,fx=w*f,fy=h*f;
    const m=document.createElement('canvas');m.width=w;m.height=h;const mg=m.getContext('2d');mg.fillStyle='#fff';mg.fillRect(0,0,w,h);mg.globalCompositeOperation='destination-in';
    for(const [x0,y0,x1,y1] of [[0,0,fx,0],[w,0,w-fx,0],[0,0,0,fy],[0,h,0,h-fy]]){const gr=mg.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,1)');mg.fillStyle=gr;mg.fillRect(0,0,w,h)}
    g.drawImage(m,0,0);return FEA[name]=cv}
  function map(ctx,c,fr,k,o={}){const R=region(k),im=feather(`geo:${k}_sat.jpg`);if(!R||!im)return;const a=o.a??1;if(a<=0)return;
    const P0=fr.xy(R.lat[0],R.lon[0]),PU=fr.xy(R.lat[0],R.lon[1]),PV=fr.xy(R.lat[1],R.lon[0]),n=o.n||16,day=o.day??1;
    if(day>0){ctx.save();if(day<1)ctx.filter=`brightness(${day.toFixed(3)})`;quad(ctx,c,im,P0,PU,PV,{n,a});ctx.restore()}
    const nt=feather(`geo:${k}_noite.jpg`);if(nt&&(o.night??0)>0)quad(ctx,c,nt,P0,PU,PV,{n,a:a*o.night,op:'lighter'})}
  function border(ctx,c,fr,iso,o={}){const G=typeof __GEO__!=='undefined'?__GEO__:[],it=G.find(g=>g.iso===iso);if(!it)return;const a=o.a??1;if(a<=0)return;
    ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=o.col||C.gold;ctx.lineWidth=o.lw||2.5;ctx.lineJoin='round';if(o.glow!==false){ctx.shadowColor=o.col||C.gold;ctx.shadowBlur=o.glow||12}
    ctx.beginPath();for(const ring of it.r){let on=false;for(const [lo,la] of ring){const q=c.P(fr.xy(la,lo));if(!ok(q)){on=false;continue}on?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);on=true}if(on)ctx.closePath()}
    if(o.fill){ctx.fillStyle=o.fill;ctx.fill('evenodd')}ctx.stroke();ctx.restore()}
  function circle(ctx,c,P,r,o={}){const a=o.a??1;if(a<=0)return;const n=o.n||160,y=P[1]||0;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=o.col||C.gold;ctx.lineWidth=o.lw||3;if(o.dash)ctx.setLineDash(o.dash);
    if(o.glow!==false){ctx.shadowColor=o.col||C.gold;ctx.shadowBlur=o.glow||12}ctx.beginPath();let on=false;const end=o.arc??1;
    for(let k=0;k<=n*end;k++){const t=k/n*TAU+(o.a0||0),q=c.P([P[0]+r*Math.cos(t),y,P[2]+r*Math.sin(t)]);if(!ok(q)){on=false;continue}on?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);on=true}
    if(o.fill){ctx.fillStyle=o.fill;ctx.fill()}ctx.stroke();ctx.restore()}
  function line(ctx,c,A,B,o={}){const a=o.a??1;if(a<=0)return;const S=W3D.clipSeg(c,A,B);if(!S)return;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=o.col||C.gold;ctx.lineWidth=o.lw||3;
    if(o.dash)ctx.setLineDash(o.dash);if(o.glow!==false){ctx.shadowColor=o.col||C.gold;ctx.shadowBlur=o.glow||10}ctx.beginPath();ctx.moveTo(S[0][0],S[0][1]);ctx.lineTo(S[1][0],S[1][1]);ctx.stroke();ctx.restore();return S}
  function ruler(ctx,c,A,B,s,o={}){const a=o.a??1;if(a<=0)return;const col=o.col||C.gold,up=o.up||[0,1,0],tk=o.tick||len3(sub(B,A))*.04;const S=line(ctx,c,A,B,{col,a,lw:o.lw||3});
    for(const P of [A,B])line(ctx,c,add(P,mul(up,-tk)),add(P,mul(up,tk)),{col,a,lw:o.lw||3});
    if(S&&s){const mx=(S[0][0]+S[1][0])/2,my=(S[0][1]+S[1][1])/2;ctx.save();ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=12;txt(ctx,s,mx+(o.dx||0),my+(o.off??-22),{font:F.mono,weight:500,size:o.size||38,color:col,a});ctx.restore()}}
  const len3=a=>Math.hypot(a[0],a[1],a[2]);
  function disc(ctx,c,P,r,o={}){circle(ctx,c,P,r,{...o,fill:o.fill||FX.rgba(o.col||C.gold,.12)})}

  /* ---------- Via Láctea ---------- */
  const B=Math.tan(12*D),SUN_PHI=Math.PI/2;
  /* fase de cada braço escolhida para que, na direção do Sol (θ = 90°), os braços cruzem em r = 0,30 (Escudo-Centauro), 0,42 (Sagitário),
     0,59 (Perseu) e 0,82 (Norma/Externo): o Sol (0,52) fica entre Sagitário e Perseu, no esporão de Órion */
  const ARMS=[[.30,1],[.42,.3],[.59,1],[.82,.3]].map(([r,w])=>({psi:SUN_PHI-Math.log(r)/B,w}));
  const wrapA=x=>{x=(x+Math.PI)%TAU;return x<0?x+TAU-Math.PI:x-Math.PI};
  function armAt(r,th){let best=0,lane=0;const X=r*Math.cos(th),Y=r*Math.sin(th),psi=th-Math.log(Math.max(r,.02))/B+FX.fbm(X*2.2,Y*2.2,11,3)*.45;
    for(const A of ARMS){/* braços a cada 90° de fase com 4 braços: a fase repete a cada 2π (cada braço é uma volta) */const dpsi=wrapA(psi-A.psi),d=r*B*dpsi*Math.cos(12*D),
        s=(.03+.03*r)*(.7+.6*clamp(.5+FX.noise(X*5,Y*5,4))),m=Math.exp(-(d*d)/(2*s*s))*A.w;if(m>best)best=m;const dl=d+s*1.1;lane=Math.max(lane,Math.exp(-(dl*dl)/(2*(s*.45)**2))*A.w)}
    /* esporão de Órion: pedaço de braço passando pelo Sol */
    const ds=wrapA(th-SUN_PHI),so=Math.exp(-ds*ds/(2*.45*.45)),dOr=(r-.52-.08*ds),mo=Math.exp(-(dOr*dOr)/(2*.022*.022))*so*.55;if(mo>best)best=mo;
    return {arm:best,lane}}
  function density(r,th){if(r>1.08)return {d:0};const {arm,lane}=armAt(r,th),bx=r*Math.cos(th-BAR),by=r*Math.sin(th-BAR);
    const bar=Math.exp(-(bx*bx)/(2*.17*.17)-(by*by)/(2*.04*.04)),bul=Math.exp(-(r*r)/(2*.05*.05)),disk=Math.exp(-r/.42)*(1-sm2(.9,1.08,r)),ring=Math.exp(-((r-.08)**2)/(2*.03*.03))*.2;
    return {d:disk*(.3+2.2*arm*sm2(.18,.27,r))+bar*1.1+bul*1.5+ring,arm,lane,old:clamp(bul*1.5+bar*1.2+disk*.15*(1-arm)),bul,bar}}
  const sm2=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
  const BAR=SUN_PHI+Math.PI-27*D;   /* barra a 27° da linha Sol–centro, ponta perto no 1º quadrante */
  const GS=1024;
  function makeGlow(seed){const cv=document.createElement('canvas');cv.width=cv.height=GS;const g=cv.getContext('2d'),img=g.createImageData(GS,GS),dd=img.data,c0=GS/2,Rd=GS/2/1.1;
    const dcv=document.createElement('canvas');dcv.width=dcv.height=GS;const dg=dcv.getContext('2d'),dimg=dg.createImageData(GS,GS),du=dimg.data;
    for(let y=0;y<GS;y++)for(let x=0;x<GS;x++){const X=(x+.5-c0)/Rd,Y=(y+.5-c0)/Rd,r=Math.hypot(X,Y);if(r>1.1)continue;const th=Math.atan2(Y,X),q=density(r,th);if(!q.d)continue;
      const cl=.55+.9*clamp(.5+FX.fbm(X*6,Y*6,seed,4)*1.3)*(.7+.6*clamp(.5+FX.fbm(X*18,Y*18,seed+9,3))),I=1-Math.exp(-1.25*q.d*cl),w=q.old,i=(y*GS+x)*4;
      dd[i]=255*I*lerp(.72,1,w);dd[i+1]=255*I*lerp(.82,.86,w);dd[i+2]=255*I*lerp(1,.62,w);dd[i+3]=255;
      const lane=q.lane*sm2(.1,.25,r)*(.55+.45*clamp(.5+FX.fbm(X*11,Y*11,seed+3,4)*1.4))+q.bul*.0+Math.max(0,FX.fbm(X*9,Y*9,seed+5,4))*.35*q.arm;
      du[i]=6;du[i+1]=5;du[i+2]=9;du[i+3]=255*clamp(lane*.9)}
    g.putImageData(img,0,0);dg.putImageData(dimg,0,0);return {glow:cv,dust:dcv,span:1.1}}
  function galaxy(o={}){const R=o.R||1,Ct=o.center||[0,0,0],seed=o.seed||7,Rn=FX.rng(seed),N=o.n||42000,h=o.h??.005;
    const sunR=o.sunR??.52,dirS=o.sunAt?nrm(sub(o.sunAt,Ct)):[1,0,0],rot=Math.atan2(dirS[2],dirS[0])-SUN_PHI;   /* θ galáctico → ângulo no mundo */
    const toW=(r,th,y)=>{const a=th+rot;return [Ct[0]+r*R*Math.cos(a),Ct[1]+y*R,Ct[2]+r*R*Math.sin(a)]};
    /* estrelas por rejeição na densidade */
    const S=new Float32Array(N*3),M=new Float32Array(N),K=new Uint8Array(N);let n=0,guard=0;
    while(n<N&&guard<N*60){guard++;const r=Math.sqrt(Rn())*1.08,th=Rn()*TAU,q=density(r,th);if(Rn()*2.4>q.d*(r<.15?.6:1.4))continue;
      const thick=h*(1+3*q.bul)+.002,y=(Rn()+Rn()+Rn()-1.5)*thick*1.15,P=toW(r,th,y);S[n*3]=P[0];S[n*3+1]=P[1];S[n*3+2]=P[2];
      M[n]=Math.pow(Rn(),q.arm>.4?2.2:3.2);K[n]=q.old>.5?1:(q.arm>.45&&Rn()<.55?2:0);n++}
    const T=makeGlow(seed),span=T.span*R;
    /* cantos do plano da textura (u = x da textura, v = y) seguindo a mesma rotação */
    const cx=Math.cos(rot),sn=Math.sin(rot),corner=(u,v)=>[Ct[0]+(u*cx-v*sn)*span,Ct[1],Ct[2]+(u*sn+v*cx)*span];
    const Q0=corner(-1,-1),QU=corner(1,-1),QV=corner(-1,1),sun=toW(sunR,SUN_PHI,0);
    const COLS=['#e8eeff','#ffd9a0','#bcd4ff'];
    function draw(ctx,c,d={}){const a=d.a??1;if(a<=0)return;
      if((d.glow??1)>0)quad(ctx,c,T.glow,Q0,QU,QV,{n:d.n||14,a:a*(d.glow??1),op:'lighter'});
      if((d.dust??1)>0)quad(ctx,c,T.dust,Q0,QU,QV,{n:d.n||14,a:a*(d.dust??1)*.8});
      /* de lado: o disco ganha volume (camadas da textura em alturas diferentes, ~ a espessura real) */
      const edge=1-Math.min(1,Math.abs(c.fw[1])*14),vol=d.vol??1;if(edge>0&&vol>0){const th=(d.thick??(h*2.2))*R;
        for(let j=0;j<16;j++){const k=-1+2*(j+.5)/16,dy=[0,k*th,0];quad(ctx,c,T.glow,add(Q0,dy),add(QU,dy),add(QV,dy),{n:d.n||10,a:a*vol*edge*.12*Math.exp(-k*k*2.2),op:'lighter'})}}
      const st=d.stars??1;if(st<=0)return;const sz=d.size??1,tw=d.tw||0,lim=d.limit||N;ctx.save();ctx.globalCompositeOperation='lighter';
      for(let k=0;k<3;k++){ctx.fillStyle=COLS[k];
        for(let i=0;i<lim;i++){if(K[i]!==k)continue;const q=c.P([S[i*3],S[i*3+1],S[i*3+2]]);if(!ok(q)||q[0]<-4||q[0]>W+4||q[1]<-4||q[1]>H+4)continue;
          const m=M[i],near=Math.min(1.5,c.f*R*.0012/q[2]),s=(.7+2.2*m*m)*sz*Math.max(.55,near);ctx.globalAlpha=a*st*clamp((.08+.92*m*m)*(1+.3*Math.sin(tw*3+i*1.7)));
          if(s>2.4){ctx.beginPath();ctx.arc(q[0],q[1],s/2,0,TAU);ctx.fill()}else ctx.fillRect(q[0]-s/2,q[1]-s/2,s,s)}}
      ctx.restore()}
    return {sun,R,center:Ct,rot,toW,draw,glowTex:T.glow,dustTex:T.dust,armAt,stars:S,n}}
  /* ---------- pessoa em silhueta (de costas), de pé em P, altura h, com um braço indo até um ponto 3D (ex.: segurando algo) ---------- */
  function person(ctx,c,P,h,o={}){const A=c.P(P),B=c.P(add(P,[0,h,0]));if(!ok(A)||!ok(B))return;const Hp=A[1]-B[1];if(Hp<3)return;const x=A[0],y=A[1],s=Hp,a=o.a??1;if(a<=0)return;
    const col=o.col||'#06070b',X=u=>x+u*s,Y=v=>y-v*s;ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineCap='round';ctx.lineJoin='round';
    if(o.rim){ctx.shadowColor=o.rim;ctx.shadowBlur=Math.max(10,s*.05)}
    const body=()=>{ctx.beginPath();
      ctx.ellipse(X(0),Y(.925),.062*s,.075*s,0,0,TAU);ctx.moveTo(X(-.03),Y(.86));
      ctx.lineTo(X(-.03),Y(.84));ctx.quadraticCurveTo(X(-.13),Y(.835),X(-.135),Y(.79));ctx.lineTo(X(-.15),Y(.62));ctx.quadraticCurveTo(X(-.155),Y(.5),X(-.14),Y(.47));
      ctx.lineTo(X(-.12),Y(.47));ctx.lineTo(X(-.11),Y(.6));ctx.lineTo(X(-.1),Y(.53));ctx.lineTo(X(-.095),Y(.03));ctx.quadraticCurveTo(X(-.1),Y(0),X(-.06),Y(0));ctx.lineTo(X(-.03),Y(0));
      ctx.lineTo(X(-.015),Y(.45));ctx.lineTo(X(.015),Y(.45));ctx.lineTo(X(.03),Y(0));ctx.lineTo(X(.06),Y(0));ctx.quadraticCurveTo(X(.1),Y(0),X(.095),Y(.03));ctx.lineTo(X(.1),Y(.53));
      ctx.lineTo(X(.11),Y(.79));ctx.quadraticCurveTo(X(.13),Y(.835),X(.03),Y(.84));ctx.lineTo(X(.03),Y(.86));ctx.closePath();ctx.fill()};
    body();
    /* braço até a mão (2D: ombro → cotovelo → ponto projetado) */
    if(o.hand){const Hq=c.P(o.hand);if(ok(Hq)){const side=Hq[0]>=x?1:-1,sh=[X(side*.12),Y(.8)],mid=[(sh[0]+Hq[0])/2+side*.04*s,(sh[1]+Hq[1])/2+.06*s];
      ctx.lineWidth=.07*s;ctx.beginPath();ctx.moveTo(sh[0],sh[1]);ctx.quadraticCurveTo(mid[0],mid[1],Hq[0],Hq[1]);ctx.stroke()}}
    if(o.rim){ctx.shadowBlur=0;body()}ctx.restore()}
  /* ---------- bairro à noite: avenida paralela à orla, ruas transversais a cada quarteirão, calçadas, faixas, postes e sobrados ----------
     o: {O (origem no chão), u (ao longo da avenida), v (para dentro da terra), m (1 metro nas unidades do mundo), u0,u1 (trecho em m),
         block (m entre ruas), road:[v0,v1] (m), seed}  → objeto com .draw(ctx,c,{a}) */
  function town(o){const m=o.m||1,O=o.O,U=nrm(o.u),V=nrm(o.v),Rn=FX.rng(o.seed||5),u0=o.u0??-60,u1=o.u1??260,blk=o.block??90,rw=o.road||[12,22],cw=o.cross??10;
    const P=(u,v,y=0)=>add(O,add(add(mul(U,u*m),mul(V,v*m)),[0,y*m,0]));
    const cross=[];for(let u=Math.ceil((u0+20)/blk)*blk-blk/2;u<u1;u+=blk)cross.push(u);
    const inCross=(u,w=0)=>cross.some(x=>Math.abs(u-x)<cw/2+w);
    /* casas: duas fileiras por quarteirão, de frente para a avenida */
    const H=[];for(const row of [rw[1]+7,rw[1]+22])for(let u=u0;u<u1;u+=10+Rn()*3){if(inCross(u,6))continue;H.push({p:P(u+Rn()*1.5,row+Rn()*2),k:Rn(),s:.85+.3*Rn()})}
    const yaw=Math.atan2(-V[0],-V[2]);
    const lamps=[];for(let u=u0+5;u<u1;u+=28)if(!inCross(u,3))lamps.push(u);
    function poly(ctx,c,pts,fill){const Q=W3D.clipPoly(c,pts);if(Q.length<3)return;ctx.fillStyle=fill;ctx.beginPath();Q.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill()}
    const rect=(ua,ub,va,vb)=>[P(ua,va),P(ub,va),P(ub,vb),P(ua,vb)];
    function draw(ctx,c,d={}){const a=d.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;
      /* chão: calçadão, avenida, calçada do outro lado, quadras, ruas transversais */
      poly(ctx,c,rect(u0,u1,rw[0]-4,rw[0]),'#1d1b1a');poly(ctx,c,rect(u0,u1,rw[0],rw[1]),'#0f1013');poly(ctx,c,rect(u0,u1,rw[1],rw[1]+3),'#1d1b1a');
      poly(ctx,c,rect(u0,u1,rw[1]+3,rw[1]+40),'#0c0c0d');
      for(const x of cross){poly(ctx,c,rect(x-cw/2,x+cw/2,rw[1],rw[1]+45),'#0f1013');
        /* faixas de pedestre atravessando a avenida e a transversal */
        for(let k=-4;k<=4;k++){const uu=x+cw/2+2+0,vv=rw[0]+5+k*1.05;poly(ctx,c,rect(x-cw/2-3.4,x-cw/2-1,rw[0]+1+((k+4)*1.05),rw[0]+1.55+((k+4)*1.05)),'rgba(220,220,210,.75)')}
        for(let k=0;k<5;k++)poly(ctx,c,rect(x-cw/2+.6+k*1.9,x-cw/2+1.3+k*1.9,rw[1]+3.5,rw[1]+6),'rgba(220,220,210,.75)')}
      /* faixa central tracejada e bordas */
      for(let u=u0;u<u1;u+=6)if(!inCross(u,1))poly(ctx,c,rect(u,u+3,(rw[0]+rw[1])/2-.08,(rw[0]+rw[1])/2+.08),'rgba(244,183,64,.85)');
      for(const vv of [rw[0]+.4,rw[1]-.4])poly(ctx,c,rect(u0,u1,vv-.06,vv+.06),'rgba(220,220,210,.5)');
      /* poças de luz dos postes no chão */
      ctx.globalCompositeOperation='lighter';
      for(const u of lamps){const G=P(u,rw[0]-1.5),q=c.P(G);if(!ok(q))continue;const r=c.f*9*m/q[2];if(r<2)continue;const gr=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],r);gr.addColorStop(0,'rgba(255,190,110,.22)');gr.addColorStop(1,'rgba(255,190,110,0)');
        ctx.save();ctx.translate(q[0],q[1]);ctx.scale(1,Math.max(.12,Math.abs(c.fw[1])+.08));ctx.translate(-q[0],-q[1]);ctx.fillStyle=gr;ctx.beginPath();ctx.arc(q[0],q[1],r,0,TAU);ctx.fill();ctx.restore()}
      ctx.globalCompositeOperation='source-over';
      /* casas (de trás para a frente) */
      const L=H.slice().sort((p,q)=>len3(sub(q.p,c.eye))-len3(sub(p.p,c.eye)));
      for(const h of L)LM.draw(ctx,c,LM.house,{pos:[h.p[0],0,h.p[2]],yaw,s:m*h.s,a,fogK:.55});
      /* postes: haste e lâmpada */
      for(const u of lamps){const A=P(u,rw[0]-1.5),B=P(u,rw[0]-1.5,7.5),qa=c.P(A),qb=c.P(B);if(!ok(qa)||!ok(qb))continue;ctx.strokeStyle='#050506';ctx.lineWidth=Math.max(1,c.f*.18*m/qa[2]);ctx.beginPath();ctx.moveTo(qa[0],qa[1]);ctx.lineTo(qb[0],qb[1]);ctx.stroke();
        ctx.save();ctx.globalCompositeOperation='lighter';const r=Math.max(4,c.f*1.6*m/qb[2]),gr=ctx.createRadialGradient(qb[0],qb[1],0,qb[0],qb[1],r*3);gr.addColorStop(0,'rgba(255,214,150,.9)');gr.addColorStop(.25,'rgba(255,190,110,.3)');gr.addColorStop(1,'rgba(255,190,110,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(qb[0],qb[1],r*3,0,TAU);ctx.fill();ctx.restore()}
      ctx.restore()}
    return {draw,cross,P}}
  return {frame,quad,map,border,circle,line,ruler,disc,galaxy,region,armAt,person,town}})();
