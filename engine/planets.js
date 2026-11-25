/* ---------- PL: Sistema Solar em 3D (mesma câmera do W3D) ----------
   Texturas procedurais (equirretangulares, geradas uma vez) para Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano e Netuno;
   a Terra usa a imagem de satélite do kit (meta.json "geo": true) com luzes das cidades no lado noturno.
   PL.planet(ctx,c,k,pos,r,{sun,spin,a,dim,outline,rim})  esfera iluminada pelo Sol (terminador, ambiente ~3%, borda clara do lado do Sol)
       k: 'mercurio','venus','terra','marte','jupiter','saturno','urano','netuno' (Saturno com anel; Urano com o eixo deitado)
   PL.sun(ctx,c,pos,r,t,{a,hue})  Sol com granulação, bloom forte e coroa animada; hue 0 = amarelo, 1 = gigante vermelha
   PL.sky(ctx,c,{a})  Via Láctea procedural (estrelas + faixa galáctica com poeira), presa à direção da câmera
   PL.orbit(ctx,c,r,cor,{a,lw,glow})  órbita circular no plano y=0      PL.wedge(ctx,c,ang,larg,r0,r1,{a,color})  fatia (cunha) a partir do Sol
   PL.moon(ctx,c,pos,r,{sun,spin,a,dim,rim})  Lua com o mapa de cor real da NASA (geo/lua.jpg, LROC); spin = -ângulo da órbita deixa a mesma face voltada para a Terra
   PL.planet(...,{axis,clouds,cloudA,rimCol})  eixo próprio (ex.: Terra inclinada 23,4°), nuvens reais na Terra (deslocamento em u) e cor da borda (atmosfera)
   PL.surf(pos,r,lat,lon,{axis,spin})  ponto preso à superfície (mesmo mapa da textura): {P, n}; lat/lon em graus (lon 0 = centro do mapa; na Lua, o centro da face visível)
   PL.sphere(...,{maxR,clip})  esfera enorme em close: maxR = raio máximo do buffer em px (padrão 700; maior = menos borrado), clip = só calcula os pixels dentro da tela
   PL.sphere(...,{stretch:{ang,k}})  estica a esfera na tela na direção ang (rad) por 1+k (deformação de maré exagerada)
   PL.sphere(...,{snow:{lat,k,hemi}})  neve sazonal: embranquece a terra firme acima da latitude lat (hemi 1 = norte, -1 = sul), força k 0..1 (o mar fica azul)
   PL.faceSpin(axis,lon,dir)  spin que deixa a longitude lon (graus) virada para a direção dir (ex.: o Sol → meio-dia ali)
   PL.borders(ctx,c,p,r,{axis,spin,a,color,lw,hi:{iso,color,fill,lw}})  fronteiras (Natural Earth) desenhadas no globo 3D, só no lado visível; hi destaca um país
   PL.geoPt(p,r,{axis,spin})(lat,lon,h) -> {P,n}  ponto 3D do globo (h = altura relativa, 1 = superfície), mesmo mapa da textura
   PL.parallel(ctx,c,p,r,lat,{axis,spin,sun,a,col,night,lw})  paralelo (ex.: trópico) com o trecho de dia em col e o de noite apagado; devolve a fração de dia (0..1)
   Mapas reais (4K, Solar System Scope CC BY 4.0 sobre dados da NASA): kit/geo/planetas/<k>_web.jpg, embutidos por build.py (meta "planet_maps": false desliga);
       mipmaps automáticos em planeta pequeno e bilinear em close; sem o mapa, volta a textura procedural. PL.planet('saturno',...,{hq:true,t,P}) usa SAT.draw.
   PL.addTex(k,fn,{w,h})  textura procedural nova para PL.sphere(ctx,c,k,...): fn(x,y,z,lat,lon) -> [r,g,b] (usada pelas luas de Saturno)
   PL.D  dados: período (dias), longitude em J2000, raio de órbita na tela (k·√a), raio visual, cor
   PL.lon(i,dias)  longitude heliocêntrica (graus) em órbita circular      PL.pos(i,lonGraus) -> [x,0,z] */
const PL=(()=>{
  const D=[['mercurio',87.969,252.25,.387,.048,'#b7b1a6'],['venus',224.701,181.98,.723,.072,'#e8cf96'],['terra',365.256,100.46,1,.078,'#5fa8e6'],['marte',686.98,355.45,1.524,.058,'#d0703f'],
    ['jupiter',4332.59,34.40,5.203,.195,'#d9b48a'],['saturno',10759.22,49.94,9.537,.165,'#e3cf9a'],['urano',30688.5,313.23,19.19,.115,'#9fdde3'],['netuno',60182,304.88,30.07,.11,'#5d86e0']]
    .map(([k,T,L0,a,r,col])=>({k,T,L0,a,orb:Math.sqrt(a),r,col}));
  const lon=(i,d)=>((D[i].L0+360*d/D[i].T)%360+360)%360;
  const pos=(i,L)=>{const a=L*Math.PI/180,R=D[i].orb;return [R*Math.cos(a),0,-R*Math.sin(a)]};
  /* ---------- texturas procedurais ---------- */
  const TX={},TW=512,TH=256;
  const hex=c=>{const n=parseInt(c.slice(1,7),16);return [n>>16&255,n>>8&255,n&255]},mixc=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];
  const poleAvg=(d,w,h,top)=>{const n=Math.max(1,Math.round(h*.02)),a=[0,0,0];for(let j=0;j<n;j++){const y=top?j:h-1-j;for(let i=0;i<w;i++){const q=(y*w+i)*4;a[0]+=d[q];a[1]+=d[q+1];a[2]+=d[q+2]}}return a.map(v=>v/(n*w))};
  const rd=(im,w,h)=>{const c=document.createElement('canvas');c.width=w||im.width;c.height=h||im.height;const g=c.getContext('2d');g.drawImage(im,0,0,c.width,c.height);const d=g.getImageData(0,0,c.width,c.height).data;return {w:c.width,h:c.height,d,pn:poleAvg(d,c.width,c.height,1),ps:poleAvg(d,c.width,c.height,0)}};
  /* texturas extras: PL.addTex(k, (x,y,z,lat,lon)=>[r,g,b], {w,h})  (ex.: luas de Saturno em engine/saturn.js) */
  const GEN={};const addTex=(k,f,o={})=>{GEN[k]={f,w:o.w||512,h:o.h||256,img:o.img};delete TX[k]};  /* o.img = chave de FX.IMG (cinza do mapa vai em f(...,g)) */
  /* mapas reais (kit/geo/planetas/<k>_web.jpg, Solar System Scope CC BY 4.0 sobre dados da NASA; build.py embute como geo:pl_<k>.jpg) */
  function make(k){const PM=k!=='terra'&&k!=='lua'&&FX.IMG&&FX.IMG['geo:pl_'+k+'.jpg'];if(PM&&!(TX[k]&&TX[k].real)){const t=rd(PM);t.real=true;return TX[k]=t}
    if(TX[k])return TX[k];
    if(GEN[k]){const {f,w,h,img}=GEN[k],d=new Uint8ClampedArray(w*h*4);let G=null;if(img){const im=FX.IMG&&FX.IMG[img];if(im)G=rd(im,w,h)}for(let j=0;j<h;j++){const lat=(.5-(j+.5)/h)*Math.PI;for(let i=0;i<w;i++){const lo=(i+.5)/w*2*Math.PI,x=Math.cos(lat)*Math.cos(lo),y=Math.sin(lat),z=Math.cos(lat)*Math.sin(lo),c=f(x,y,z,lat,lo,G?G.d[(j*w+i)*4]/255:null),q=(j*w+i)*4;d[q]=c[0];d[q+1]=c[1];d[q+2]=c[2];d[q+3]=255}}
      const T2={w,h,d,pn:poleAvg(d,w,h,1),ps:poleAvg(d,w,h,0)};if(img&&!G)return T2;return TX[k]=T2}  /* mapa ainda carregando: não guarda */
    if(k==='lua'){const im=FX.IMG&&FX.IMG['geo:lua.jpg'];if(im)return TX[k]=rd(im);if(TX._lua)return TX._lua;const d=new Uint8ClampedArray(TW*TH*4);for(let j=0;j<TH;j++)for(let i=0;i<TW;i++){const lo=(i+.5)/TW*TAU,la=(.5-(j+.5)/TH)*Math.PI,x=Math.cos(la)*Math.cos(lo),y=Math.sin(la),z=Math.cos(la)*Math.sin(lo),v=150+60*FX.fbm(x*3,y*3,z*3)-50*clamp(FX.fbm(x*1.3+4,y*1.3,z*1.3)*3),q=(j*TW+i)*4;d[q]=d[q+1]=d[q+2]=v;d[q+3]=255}return TX._lua=TX._lua||{w:TW,h:TH,d}}  /* sem a imagem (ainda carregando): não guarda, tenta de novo no próximo quadro */
    if(k==='terra'){const im=FX.IMG&&FX.IMG['geo:terra.jpg'];if(im){const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);
      const N=FX.IMG['geo:noite.jpg'];let nd=null;if(N){const c2=document.createElement('canvas');c2.width=im.width;c2.height=im.height;const g2=c2.getContext('2d');g2.drawImage(N,0,0,im.width,im.height);nd=g2.getImageData(0,0,im.width,im.height).data}
      const CL=FX.IMG['geo:nuvens.jpg'],dd=g.getImageData(0,0,c.width,c.height).data;return TX[k]={w:c.width,h:c.height,d:dd,n:nd,cl:CL?rd(CL):null,pn:poleAvg(dd,c.width,c.height,1),ps:poleAvg(dd,c.width,c.height,0)}}}
    const d=new Uint8ClampedArray(TW*TH*4),n=FX.noise,fb=(x,y,z,o=5)=>{let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*n(x*f,y*f,z*f);a*=.5;f*=2}return s};
    for(let j=0;j<TH;j++){const lat=(.5-(j+.5)/TH)*Math.PI;for(let i=0;i<TW;i++){const lo=(i+.5)/TW*2*Math.PI,x=Math.cos(lat)*Math.cos(lo),y=Math.sin(lat),z=Math.cos(lat)*Math.sin(lo);let c;
      if(k==='mercurio'){const v=fb(x*3,y*3,z*3),cr=Math.abs(n(x*14,y*14,z*14));c=mixc([92,88,82],[190,184,172],.5+v*.9);c=mixc(c,[60,58,55],clamp((cr-.32)*3)*.6)}
      else if(k==='venus'){const sw=fb(x*2+n(y*3,z*3,1)*1.2,y*5,z*2),v=.5+sw*.8;c=mixc([196,160,92],[246,226,178],clamp(v))}
      else if(k==='marte'){const v=fb(x*2.5,y*2.5,z*2.5),dark=clamp((fb(x*1.6+5,y*1.6,z*1.6)+.05)*3);c=mixc([186,92,48],[226,140,86],.5+v);c=mixc(c,[92,52,38],dark*.55);if(Math.abs(y)>.93)c=mixc(c,[240,236,230],clamp((Math.abs(y)-.93)*25))}
      else if(k==='jupiter'||k==='saturno'){const turb=fb(x*4,y*2,z*4)*.35,b=Math.sin((y+turb*.25)*(k==='jupiter'?22:16)),b2=Math.sin((y+turb*.2)*47)*.3;
        const A=k==='jupiter'?[226,208,180]:[234,216,166],B=k==='jupiter'?[176,126,86]:[198,170,112];c=mixc(A,B,clamp(.5+.45*b+b2*.4));
        if(k==='jupiter'){const dx=lo-4.2,dy=lat+.38,e=(dx*dx)/(.09)+(dy*dy)/(.012);if(e<1)c=mixc(c,[196,98,64],(1-e)*.9)}}
      else if(k==='urano'){const v=fb(x*2,y*6,z*2)*.12;c=mixc([150,214,222],[196,236,238],clamp(.5+v+y*.15))}
      else{/* Netuno como nas fotos da Voyager 2: azul profundo com faixas suaves, polos mais escuros, a Grande Mancha Escura (~22° S)
           com nuvens brancas finas ao lado, e cirros brancos esticados na direção leste-oeste */
        const sl=Math.sin(lat),tb=fb(x*2.2,y*9,z*2.2)*.5,band=Math.sin((sl+tb*.08)*9)*.5+Math.sin((sl+tb*.05)*23)*.18;
        c=mixc([38,72,176],[86,134,226],clamp(.52+band*.22+tb*.35));c=mixc(c,[26,44,120],clamp((Math.abs(sl)-.6)*1.6));
        const dl=((lo-3.6+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI,dy=lat+.38,e=dl*dl/.05+dy*dy/.006;
        if(e<1.6)c=mixc(c,[18,34,96],clamp((1.6-e)/1.2)*.85);
        const cw=(lat0,w,k)=>{const s=clamp(1-Math.abs(lat-lat0)/w),st=fb(x*1.2+k,y*40,z*1.2-k,4);return s*clamp((st-.12)*4)};
        const wc=Math.max(cw(-.28,.035,1.3)*clamp(1-Math.abs(dl+.25)/.5),cw(.47,.03,5.1),cw(-.75,.03,8.7)*.7,cw(.12,.02,3.3)*.5);
        if(wc>0)c=mixc(c,[236,244,255],wc*.9)}
      const q=(j*TW+i)*4;d[q]=c[0];d[q+1]=c[1];d[q+2]=c[2];d[q+3]=255}}
    /* Terra sem a imagem (página ainda carregando): textura provisória, não guardada */
    return k==='terra'?{w:TW,h:TH,d}:TX[k]={w:TW,h:TH,d}}
  /* mipmaps: metades sucessivas (média 2×2), feitas na primeira vez que a esfera fica pequena; evitam o cintilado do mapa 4K em planeta pequeno */
  function half(T){const w=Math.max(1,T.w>>1),h=Math.max(1,T.h>>1),d=new Uint8ClampedArray(w*h*4),s=T.d,W0=T.w;
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){const a=((2*j)*W0+2*i)*4,b=a+4,c2=a+W0*4,e=c2+4,q=(j*w+i)*4;for(let ch=0;ch<3;ch++)d[q+ch]=(s[a+ch]+s[b+ch]+s[c2+ch]+s[e+ch])>>2;d[q+3]=255}
    return {w,h,d,pn:T.pn,ps:T.ps,n:null}}
  function level(T,tpp){if(!T.real||tpp<2)return T;T.mip=T.mip||[T];let L=0;while(tpp>2&&T.mip[L].w>128){if(!T.mip[L+1])T.mip[L+1]=half(T.mip[L]);L++;tpp/=2}return T.mip[L]}
  const buf=document.createElement('canvas'),bg2=buf.getContext('2d');
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  /* esfera texturizada: cada pixel vira uma normal no mundo; luz do Sol, terminador suave, ambiente mínimo */
  function sphere(ctx,c,k,p,r,o={}){const q=c.P(p);if(!isFinite(q[0]))return null;const R=c.f*r/q[2];if(R<.6)return {q,R};
    if(q[0]+R<-50||q[0]-R>W+50||q[1]+R<-50||q[1]-R>H+50)return {q,R};
    const T0=make(k),sun=o.sun||[0,0,0],Ld=nrm(sub(sun,p)),toC=nrm(sub(c.eye,p)),rt=c.rt,up=c.up,bk=c.fw.map(v=>-v);
    const Rr=Math.max(2,Math.min(o.maxR||700,Math.round(R))),S=2*Rr+2,tpp=T0.w/(2*Math.PI*Rr),T=level(T0,tpp),BIL=T0.real&&tpp<1.6;  /* texels por pixel no centro do disco: escolhe o nível e liga o bilinear em close */if(buf.width<S||buf.height<S){buf.width=buf.height=Math.max(S,buf.width,buf.height)}  /* canvas novo nasce 300×150: confere as duas medidas */bg2.clearRect(0,0,S+2,S+2);  /* limpa uma borda a mais: a suavização do drawImage lê o pixel vizinho (sobra de esferas maiores) */const img=bg2.createImageData(S,S),out=img.data;
    const ax=o.axis||[0,1,0],sp=o.spin||0,ex=nrm(Math.abs(ax[1])>.9?[1,0,0]:[0,1,0].map((v,i)=>v-ax[i]*ax[1])),ez=[ax[1]*ex[2]-ax[2]*ex[1],ax[2]*ex[0]-ax[0]*ex[2],ax[0]*ex[1]-ax[1]*ex[0]];
    const amb=o.amb??.03,rim=o.rim??.35,dim=o.dim??1,rc=o.rimCol||[.9,.95,1],CLD=o.clouds!=null&&T.cl?T.cl:null,cA=o.cloudA??.85,SNW=o.snow&&o.snow.k>0?o.snow:null;
    const kS=R/Rr,ox=q[0]-R*S/(2*Rr),oy=q[1]-R*S/(2*Rr),PY0=o.clip?Math.max(0,Math.floor(-oy/kS)-2):0,PY1=o.clip?Math.min(S,Math.ceil((H-oy)/kS)+2):S,PX0=o.clip?Math.max(0,Math.floor(-ox/kS)-2):0,PX1=o.clip?Math.min(S,Math.ceil((W-ox)/kS)+2):S;
    for(let py=PY0;py<PY1;py++){const y=-(py-Rr-.5)/Rr;for(let px=PX0;px<PX1;px++){const x=(px-Rr-.5)/Rr,r2=x*x+y*y;if(r2>1)continue;const z=Math.sqrt(1-r2);
      const nw=[x*rt[0]+y*up[0]+z*bk[0],x*rt[1]+y*up[1]+z*bk[1],x*rt[2]+y*up[2]+z*bk[2]];
      const la=Math.asin(clamp(dot(nw,ax),-1,1)),lo2=Math.atan2(dot(nw,ez),dot(nw,ex))+sp;let u=(lo2/(2*Math.PI))%1;if(u<0)u+=1;const v=.5-la/Math.PI;
      const ti=(Math.min(T.h-1,v*T.h|0)*T.w+(u*T.w|0))*4;let cr,cg,cb;
      if(BIL){const fx=u*T.w-.5,fy=Math.max(0,Math.min(T.h-1.001,v*T.h-.5)),x0=Math.floor(fx),y0=fy|0,ax=fx-x0,ay=fy-y0,X0=((x0%T.w)+T.w)%T.w,X1=(X0+1)%T.w,r0=y0*T.w,r1=Math.min(T.h-1,y0+1)*T.w,dd=T.d,
          i00=(r0+X0)*4,i01=(r0+X1)*4,i10=(r1+X0)*4,i11=(r1+X1)*4,w00=(1-ax)*(1-ay),w01=ax*(1-ay),w10=(1-ax)*ay,w11=ax*ay;
        cr=dd[i00]*w00+dd[i01]*w01+dd[i10]*w10+dd[i11]*w11;cg=dd[i00+1]*w00+dd[i01+1]*w01+dd[i10+1]*w10+dd[i11+1]*w11;cb=dd[i00+2]*w00+dd[i01+2]*w01+dd[i10+2]*w10+dd[i11+2]*w11}
      else{cr=T.d[ti];cg=T.d[ti+1];cb=T.d[ti+2]}
      if(T.pn&&Math.abs(la)>1.2){const pc=la>0?T.pn:T.ps,kp=clamp((Math.abs(la)-1.2)/.25);cr+=(pc[0]-cr)*kp;cg+=(pc[1]-cg)*kp;cb+=(pc[2]-cb)*kp}
      const ld=dot(nw,Ld),day=clamp((ld+.08)/.22),lit=amb+(1-amb)*day*(.35+.65*Math.max(0,ld));
      if(SNW){const lt=la*(SNW.hemi??1)*57.2958;if(lt>SNW.lat-6&&!(cb>cr*1.12&&cr<95)){const ks=SNW.k*clamp((lt-SNW.lat+6)/14)*(.7+.3*clamp((cr+cg+cb)/300));cr+=(236-cr)*ks;cg+=(242-cg)*ks;cb+=(250-cb)*ks}}
      if(CLD){let uc=(u+o.clouds)%1;if(uc<0)uc+=1;const cv=CLD.d[(Math.min(CLD.h-1,v*CLD.h|0)*CLD.w+(uc*CLD.w|0))*4]/255*cA*clamp((1.22-Math.abs(la))/.35);  /* some perto dos polos (o mapa de nuvens se estica ali) */cr+=(245-cr)*cv;cg+=(248-cg)*cv;cb+=(255-cb)*cv}
      let R2=cr*lit,G2=cg*lit,B2=cb*lit;if(T.n&&day<1){const k2=(1-day)*.9;R2+=T.n[ti]*k2;G2+=T.n[ti+1]*k2*.85;B2+=T.n[ti+2]*k2*.6}
      const fr=Math.pow(1-z,3);if(rim>0){const rs=Math.max(0,ld+.3)*fr*rim*255;R2+=rs*rc[0];G2+=rs*rc[1];B2+=rs*rc[2]}
      const i=(py*S+px)*4;out[i]=R2*dim;out[i+1]=G2*dim;out[i+2]=B2*dim;out[i+3]=255*Math.min(1,(1-Math.sqrt(r2))*Rr*1.5)}}
    bg2.putImageData(img,0,0);ctx.save();ctx.globalAlpha*=o.a??1;if(o.stretch&&o.stretch.k){const st=o.stretch;ctx.translate(q[0],q[1]);ctx.rotate(st.ang);ctx.scale(1+st.k,1/Math.sqrt(1+st.k));ctx.rotate(-st.ang);ctx.translate(-q[0],-q[1])}ctx.drawImage(buf,0,0,S,S,q[0]-R*S/(2*Rr),q[1]-R*S/(2*Rr),R*S/Rr,R*S/Rr);ctx.restore();return {q,R}}
  /* anel de Saturno: metade de trás antes da esfera, metade da frente depois */
  function ring(ctx,c,p,r,half,o={}){const tilt=.47,ax=[Math.sin(tilt),Math.cos(tilt),0],e1=[Math.cos(tilt),-Math.sin(tilt),0],e2=[0,0,1],toC=nrm(sub(c.eye,p));
    const bands=[[1.25,1.42,.55],[1.45,1.95,.8],[2.0,2.05,.15],[2.08,2.3,.6]],sun=o.sun||[0,0,0],lit=.45+.55*Math.max(0,dot(nrm(sub(sun,p)),[0,1,0])*0+1);
    ctx.save();ctx.globalAlpha*=(o.a??1)*(o.dim??1);for(const [a0,a1,al] of bands){for(let k=0;k<96;k++){const t0=k/96*TAU,t1=(k+1)/96*TAU,mid=(t0+t1)/2,pm=[p[0]+(e1[0]*Math.cos(mid)+e2[0]*Math.sin(mid))*r*a1,p[1]+(e1[1]*Math.cos(mid))*r*a1,p[2]+(e2[2]*Math.sin(mid))*r*a1];
        const front=dot(sub(pm,p),toC)>0;if(front!==(half==='front'))continue;const P=(t,rr)=>c.P([p[0]+(e1[0]*Math.cos(t))*r*rr,p[1]+(e1[1]*Math.cos(t))*r*rr,p[2]+Math.sin(t)*r*rr]);
        const A=P(t0,a0),B=P(t1,a0),C2=P(t1,a1),D2=P(t0,a1);if(![A,B,C2,D2].every(q=>isFinite(q[0])))continue;ctx.fillStyle=`rgba(226,206,160,${al*.75*lit})`;ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.lineTo(C2[0],C2[1]);ctx.lineTo(D2[0],D2[1]);ctx.closePath();ctx.fill()}}ctx.restore()}
  /* o.hq em Saturno: anéis com o perfil real por traçado de raios (SAT.draw, engine/saturn.js); o.t/o.P = tempo e loop dos aglomerados, o.q = orçamento de pixels */
  function planet(ctx,c,k,p,r,o={}){const i=typeof k==='number'?k:D.findIndex(d=>d.k===k),kk=D[i].k,ax=o.axis||(kk==='urano'?[1,.05,0]:[0,1,0]);
    if(kk==='saturno'&&o.hq&&typeof SAT!=='undefined'){const s=SAT.draw(ctx,c,{p,R:r,axis:o.axis||[Math.sin(.466),Math.cos(.466),0],sun:nrm(sub(o.sun||[0,0,0],p)),t:o.t||0,P:o.P,spin:o.spin,a:o.a,q:o.q});
      if(s&&s.R<(o.minR??4)){ctx.save();ctx.globalAlpha*=o.a??1;ctx.fillStyle=D[i].col;ctx.shadowColor=D[i].col;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(s.q[0],s.q[1],o.minR??4,0,TAU);ctx.fill();ctx.restore()}return s}
    if(kk==='saturno')ring(ctx,c,p,r,'back',o);
    const s=sphere(ctx,c,kk,p,r,{...o,axis:ax});if(kk==='saturno')ring(ctx,c,p,r,'front',o);
    if(s&&o.outline>0&&s.R>.5){ctx.save();ctx.globalAlpha*=o.outline;ctx.strokeStyle=o.outCol||C.gold;ctx.lineWidth=3;ctx.shadowColor=o.outCol||C.gold;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(s.q[0],s.q[1],Math.max(6,s.R+6),0,TAU);ctx.stroke();ctx.restore()}
    if(s&&s.R<(o.minR??4)){ctx.save();ctx.globalAlpha*=(o.a??1)*Math.max(.5,o.dim??1);ctx.fillStyle=D[i].col;ctx.shadowColor=D[i].col;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(s.q[0],s.q[1],o.minR??4,0,TAU);ctx.fill();ctx.restore()}return s}
  /* Sol */
  let SB=null;function sun(ctx,c,p,r,t,o={}){const q=c.P(p);if(!isFinite(q[0]))return;const R=c.f*r/q[2],a=o.a??1,h=o.hue||0,col=h<.5?mixc([255,214,120],[255,150,60],h*2):mixc([255,150,60],[220,60,40],(h-.5)*2),cs=`rgb(${col.map(Math.round).join(',')})`;
    ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation='lighter';
    for(const [k,al] of [[9,.10],[4.5,.18],[2.2,.32]]){const g=ctx.createRadialGradient(q[0],q[1],R*.6,q[0],q[1],R*k);g.addColorStop(0,`rgba(${col.map(Math.round).join(',')},${al})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],R*k,0,TAU);ctx.fill()}
    /* coroa: raios com ruído lento */ctx.strokeStyle=`rgba(${col.map(Math.round).join(',')},.10)`;for(let i=0;i<90;i++){const an=i/90*TAU,l=R*(1.25+.9*Math.max(0,FX.noise(Math.cos(an)*2,Math.sin(an)*2,t*.15)));ctx.lineWidth=Math.max(1,R*.05);ctx.beginPath();ctx.moveTo(q[0]+Math.cos(an)*R*.95,q[1]+Math.sin(an)*R*.95);ctx.lineTo(q[0]+Math.cos(an)*l,q[1]+Math.sin(an)*l);ctx.stroke()}
    ctx.restore();
    /* fotosfera granulada (buffer pequeno, escalado) */const S=96;if(!SB){SB=document.createElement('canvas');SB.width=SB.height=S}const g=SB.getContext('2d'),img=g.createImageData(S,S),d=img.data;
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){const u=(x+.5)/S*2-1,v=(y+.5)/S*2-1,r2=u*u+v*v;if(r2>1)continue;const z=Math.sqrt(1-r2),gr=FX.noise(u*9/(z+.3),v*9/(z+.3),t*.4)*.5+FX.noise(u*22,v*22,t*.7)*.25,ld=.62+.38*z;
      const i=(y*S+x)*4;d[i]=Math.min(255,(col[0]+40)*ld*(1+gr*.25));d[i+1]=Math.min(255,(col[1]+30)*ld*(1+gr*.3));d[i+2]=Math.min(255,col[2]*ld*(1+gr*.4));d[i+3]=255*Math.min(1,(1-Math.sqrt(r2))*S*.6)}
    g.putImageData(img,0,0);ctx.save();ctx.globalAlpha*=a;ctx.shadowColor=cs;ctx.shadowBlur=Math.min(120,R*.8);ctx.drawImage(SB,q[0]-R,q[1]-R,2*R,2*R);ctx.restore()}
  /* Via Láctea procedural (panorama 4096×2048 gerado uma vez) */
  let SKY=null;function skyTex(){if(SKY)return SKY;const w=4096,h=2048,cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');g.fillStyle='#04060c';g.fillRect(0,0,w,h);
    const R=FX.rng(2026);/* faixa galáctica: senoide inclinada no panorama */const band=x=>h*.5+Math.sin(x/w*TAU+.6)*h*.22;
    const im=g.getImageData(0,0,w,h),d=im.data;for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const dy=(y-band(x))/(h*.09),core=Math.exp(-dy*dy),dust=clamp(FX.noise(x/90,y/90)*1.4+.15),cloud=.5+FX.noise(x/260,y/260,2)*.8,
      b=core*cloud*(1-dust*.75)*46;if(b<1)continue;for(const [ox,oy] of [[0,0],[1,0],[0,1],[1,1]]){const i=((y+oy)*w+x+ox)*4;d[i]+=b*1.05;d[i+1]+=b*.95;d[i+2]+=b*1.15}}g.putImageData(im,0,0);
    for(let i=0;i<26000;i++){let x=R()*w,y=R()*h;if(R()<.45){y=band(x)+(R()+R()+R()-1.5)*h*.07}const m=Math.pow(R(),9),s=.5+m*2.2,c=R();g.fillStyle=c<.15?`rgba(255,210,170,${.35+m*.65})`:c<.3?`rgba(180,205,255,${.35+m*.65})`:`rgba(240,240,255,${.3+m*.7})`;
      g.beginPath();g.arc(x,y,s,0,TAU);g.fill();if(m>.35){const gg=g.createRadialGradient(x,y,0,x,y,s*6);gg.addColorStop(0,'rgba(255,255,255,.25)');gg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gg;g.beginPath();g.arc(x,y,s*6,0,TAU);g.fill()}}
    return SKY=cv}
  function sky(ctx,c,o={}){const T=skyTex(),fw=c.fw,yaw=Math.atan2(fw[0],-fw[2]),pit=Math.asin(clamp(fw[1],-1,1)),fov=o.fov??.9,ppr=H/fov*.9,x=-(yaw/TAU)*T.width-T.width/2+W/2,sy=H/2+pit*ppr-T.height/2;
    ctx.save();ctx.globalAlpha*=o.a??.55;const sc=ppr*TAU/T.width;ctx.translate(W/2,H/2);ctx.scale(sc,sc);ctx.translate(-W/2,-H/2);let X=((x%T.width)+T.width)%T.width-T.width;for(let k=0;k<3;k++)ctx.drawImage(T,X+k*T.width,sy);ctx.restore()}
  function orbit(ctx,c,r,col,o={}){ctx.save();ctx.globalAlpha*=o.a??.3;ctx.strokeStyle=col;ctx.lineWidth=o.lw??1.6;if(o.glow){ctx.shadowColor=col;ctx.shadowBlur=o.glow}ctx.beginPath();let pen=false;
    for(let k=0;k<=240;k++){const a=k/240*TAU,q=c.P([r*Math.cos(a),0,-r*Math.sin(a)]);if(!isFinite(q[0])){pen=false;continue}pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}ctx.stroke();ctx.restore()}
  /* cunha: fatia translúcida no plano, mais forte perto do Sol e sumindo na ponta */
  function wedge(ctx,c,ang,wd,r0,r1,o={}){const a=o.a??1;if(a<=0)return;const col=o.color||C.gold,a0=(ang-wd/2)*Math.PI/180,a1=(ang+wd/2)*Math.PI/180,N=40;ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<N;i++){const ra=lerp(r0,r1,i/N),rb=lerp(r0,r1,(i+1)/N),P=(an,rr)=>c.P([rr*Math.cos(an),0,-rr*Math.sin(an)]),pts=[P(a0,ra),P(a1,ra),P(a1,rb),P(a0,rb)];if(!pts.every(q=>isFinite(q[0])))continue;
      ctx.fillStyle=FX.rgba(col,a*.32*Math.pow(1-i/N,1.3));ctx.beginPath();pts.forEach((q,k)=>k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill()}
    ctx.strokeStyle=FX.rgba(col,a*.55);ctx.lineWidth=2;ctx.shadowColor=col;ctx.shadowBlur=10;[a0,a1].forEach(an=>{ctx.beginPath();for(let i=0;i<=20;i++){const rr=lerp(r0,r1,i/20),q=c.P([rr*Math.cos(an),0,-rr*Math.sin(an)]);ctx.globalAlpha=1;i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}ctx.stroke()});ctx.restore()}
  /* ponto na superfície: mesma base (ex, ez, eixo) usada pela textura em sphere() */
  function surf(p,r,lat,lon,o={}){const ax=nrm(o.axis||[0,1,0]),ex=nrm(Math.abs(ax[1])>.9?[1,0,0]:[0,1,0].map((v,i)=>v-ax[i]*ax[1])),ez=[ax[1]*ex[2]-ax[2]*ex[1],ax[2]*ex[0]-ax[0]*ex[2],ax[0]*ex[1]-ax[1]*ex[0]];
    const la=lat*Math.PI/180,a=(lon+180)/360*TAU-(o.spin||0),cl=Math.cos(la),n=[0,1,2].map(i=>cl*(Math.cos(a)*ex[i]+Math.sin(a)*ez[i])+Math.sin(la)*ax[i]);return {P:p.map((v,i)=>v+r*n[i]),n}}
  function moon(ctx,c,p,r,o={}){return sphere(ctx,c,'lua',p,r,{amb:.045,rim:.1,...o})}  /* amb: luz cinérea (a Terra ilumina de leve o lado noturno) */
  /* base (ex, ez, eixo) igual à de sphere()/surf() */
  const basis=ax0=>{const ax=nrm(ax0||[0,1,0]),ex=nrm(Math.abs(ax[1])>.9?[1,0,0]:[0,1,0].map((v,i)=>v-ax[i]*ax[1])),ez=[ax[1]*ex[2]-ax[2]*ex[1],ax[2]*ex[0]-ax[0]*ex[2],ax[0]*ex[1]-ax[1]*ex[0]];return {ax,ex,ez}};
  function faceSpin(axis,lon,d){const {ex,ez}=basis(axis);return (lon+180)/360*TAU-Math.atan2(dot(d,ez),dot(d,ex))}
  function geoPt(p,r,o={}){const {ax,ex,ez}=basis(o.axis),sp=o.spin||0,D2=Math.PI/180;
    return (lat,lon,h=1)=>{const la=lat*D2,a=(lon+180)*D2-sp,cl=Math.cos(la),n=[0,1,2].map(i=>cl*(Math.cos(a)*ex[i]+Math.sin(a)*ez[i])+Math.sin(la)*ax[i]);return {P:[p[0]+r*h*n[0],p[1]+r*h*n[1],p[2]+r*h*n[2]],n}}}
  /* fronteiras: um ponto entra no traço quando a normal olha para a câmera */
  function borders(ctx,c,p,r,o={}){const G=typeof __GEO__!=='undefined'?__GEO__:[];if(!G.length)return;const a=o.a??1;if(a<=0)return;const g=geoPt(p,r,o),hi=o.hi,
      Q=(lo,la)=>{const s=g(la,lo,1.002),v=dot(s.n,sub(c.eye,s.P));if(v<=0)return null;const q=c.P(s.P);return isFinite(q[0])?q:null};
    ctx.save();ctx.globalAlpha*=a;ctx.lineJoin='round';ctx.lineCap='round';
    for(const cn of G){const isH=hi&&cn.iso===hi.iso;if(!isH&&o.only&&!o.only.includes(cn.iso))continue;
      if(isH&&hi.fill){ctx.fillStyle=hi.fill;for(const rg of cn.r){ctx.beginPath();let n=0;for(const [lo,la] of rg){const q=Q(lo,la);if(!q)continue;n++?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}if(n>2){ctx.closePath();ctx.fill()}}}
      ctx.strokeStyle=isH?(hi.color||C.gold):(o.color||'rgba(236,230,214,.45)');ctx.lineWidth=isH?(hi.lw||3):(o.lw||1);ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=isH?14:0;
      ctx.beginPath();for(const rg of cn.r){let pen=false;for(const [lo,la] of rg){const q=Q(lo,la);if(q){pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}else pen=false}}ctx.stroke()}
    ctx.restore()}
  function parallel(ctx,c,p,r,lat,o={}){const g=geoPt(p,r,o),sun=o.sun||[0,0,0],N=180,col=o.col||C.gold,nc=o.night||'rgba(150,160,190,.5)',a=o.a??1;let day=0;const pts=[];
    const L=nrm(sub(sun,p));  /* luz paralela (Sol no infinito), igual ao sombreamento da esfera */
    for(let k=0;k<=N;k++){const s=g(lat,k/N*360-180,1.004),d=dot(s.n,L)>0;if(k<N&&d)day++;pts.push({q:c.P(s.P),d,v:dot(s.n,sub(c.eye,s.P))>0})}
    if(a>0){ctx.save();ctx.globalAlpha*=a;ctx.lineCap='round';for(let k=0;k<N;k++){const A=pts[k],B=pts[k+1];if(!A.v||!B.v||!isFinite(A.q[0])||!isFinite(B.q[0]))continue;
      ctx.strokeStyle=A.d?col:nc;ctx.lineWidth=(o.lw||3)*(A.d?1:.7);ctx.shadowColor=A.d?col:'transparent';ctx.shadowBlur=A.d?10:0;ctx.beginPath();ctx.moveTo(A.q[0],A.q[1]);ctx.lineTo(B.q[0],B.q[1]);ctx.stroke()}ctx.restore()}
    return day/N}
  return {D,lon,pos,planet,moon,surf,sun,sky,orbit,wedge,sphere,faceSpin,geoPt,borders,parallel,addTex}})();
