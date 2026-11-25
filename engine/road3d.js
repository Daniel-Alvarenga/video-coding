/* ---------- ROAD3D: carro realista numa estrada que dobra 90° para cima e sobe até o espaço (three.js r147 na GPU) ----------
   Exemplo: projetos/espaco-de-carro/. meta.json "road3d": true (o build.py injeta kit/vendor/three-r147, este arquivo, o carro
   kit/assets/carro/CarConcept.glb, o asfalto e o céu do Poly Haven e o satélite de SP de kit/geo/sp), "gl": true, "geo": true
   (Terra, nuvens e Lua NASA), "dem": ["everest"] e, para o avião, "models": ["aviao/regional-jet-aircraft.glb"].
   Unidades: metros. Mundo: origem O = início da dobra, sobre o chão; x leste, y cima, z sul (como o RIO3D); a Terra tem centro em
   (0, −RE, 0). A estrada vive num referencial próprio (rf) girado pelo rumo real da Imigrantes sobre a represa Billings:
     s < 0          reta no chão, o carro anda para −z_rf
     0 ≤ s ≤ πR/2   dobra (quarto de círculo de raio R)
     s > πR/2       pista vertical; altitude = R + (s − πR/2)
   ROAD3D.init(W,H,{scale,R,lat0,lon0,head})   head = rumo da estrada em graus a partir do norte (Imigrantes: 158°)
   ROAD3D.frame(stFn,T,{sub,shutter})          média de subquadros (desfoque de movimento) → canvas
     stFn(t) → {cam:{pos,tgt,fov,up}|{car:'dentro'|..., ...}, car:{s,x,spin,vis}, env:{sky,stars,exp,sunI,hemi,sat,vig,clouds:[{y,a}],
               moon:{dir,ang}, earthA, ground}, road:{far,glow}, marks:{everest:{a,p,s}, plane:{p,yaw,vis}, balloon:{p,k,burst},
               karman:{a}, sign:{s,a,text}}, bloom, bloomT}
   ROAD3D.path(s) → {p,T,N,B} (mundo) · ROAD3D.alt(s) altitude do ponto da pista · ROAD3D.sOf(h) s da pista na altitude h
   ROAD3D.carCam(car,{eye,look,fov}) câmera presa ao carro (eye/look em metros no referencial do carro: x direita, y cima, z frente)
   ROAD3D.proj(cam,p) ponto 3D → tela {x,y,vis} · ROAD3D.geo(lon,lat,h) → mundo
   Determinístico: tudo depende só de t. */
const ROAD3D=(()=>{
const RE=6.371e6,TAU=Math.PI*2,cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),lp=(a,b,u)=>a+(b-a)*u,sst=(a,b,x)=>{const u=cl((x-a)/(b-a));return u*u*(3-2*u)};
let R,cv,scene,camera,composer,bloom,final,W,H,RW,RH,acc,accx,ready=null,loaded=false,O={R:220,lat0:-23.8010,lon0:-46.5908,head:158.1};
const G={},IMG={};
function rng(seed){let s=(seed*2654435761)>>>0||1;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296)}
const V3=a=>new THREE.Vector3(a[0],a[1],a[2]);

/* ---------- geometria da pista ---------- */
const ROAD={half:5.4,sh:1.7,rail:.35};  /* 3 faixas de 3,6 m, acostamento 1,7 m, guard-rail */
function pathRF(s){const r=O.R,q=Math.PI*r/2;
  if(s<=0)return {p:[0,0,-s],T:[0,0,-1],N:[0,1,0]};
  if(s<q){const a=s/r;return {p:[0,r*(1-Math.cos(a)),-r*Math.sin(a)],T:[0,Math.sin(a),-Math.cos(a)],N:[0,Math.cos(a),Math.sin(a)]}}
  return {p:[0,r+(s-q),-r],T:[0,1,0],N:[0,0,1]}}
let RY=null;
function path(s){const f=pathRF(s),m=RY;const ap=v=>new THREE.Vector3(...v).applyMatrix4(m).toArray(),av=v=>new THREE.Vector3(...v).transformDirection(m).toArray();
  const T=av(f.T),N=av(f.N),B=new THREE.Vector3(...T).cross(new THREE.Vector3(...N)).toArray();return {p:ap(f.p),T,N,B}}
const alt=s=>pathRF(s).p[1];
const rf=v=>new THREE.Vector3(...v).applyMatrix4(RY).toArray();  /* ponto do referencial da pista → mundo */
const sOf=h=>{const r=O.R,q=Math.PI*r/2;if(h<=0)return 0;if(h>=r)return q+(h-r);return Math.acos(1-h/r)*r};

/* ---------- Terra: lon/lat → mundo (ENU em O, girado pelo rumo para casar com a pista) ---------- */
function geo(lon,lat,h=0){const d=Math.PI/180,la=lat*d,lo=lon*d,la0=O.lat0*d,lo0=O.lon0*d,r=RE+h;
  const x=r*Math.cos(la)*Math.cos(lo),y=r*Math.cos(la)*Math.sin(lo),z=r*Math.sin(la);
  const x0=RE*Math.cos(la0)*Math.cos(lo0),y0=RE*Math.cos(la0)*Math.sin(lo0),z0=RE*Math.sin(la0);const dx=x-x0,dy=y-y0,dz=z-z0;
  const e=-Math.sin(lo0)*dx+Math.cos(lo0)*dy,n=-Math.sin(la0)*Math.cos(lo0)*dx-Math.sin(la0)*Math.sin(lo0)*dy+Math.cos(la0)*dz,
    u=Math.cos(la0)*Math.cos(lo0)*dx+Math.cos(la0)*Math.sin(lo0)*dy+Math.sin(la0)*dz;
  return [e,u,-n]}  /* x leste, y cima, z sul */
function mercY(lat){const la=lat*Math.PI/180;return Math.log(Math.tan(Math.PI/4+la/2))}
/* recorte de satélite colado na esfera (grade lon/lat; v em Mercator porque os blocos são Web Mercator) */
function patch(img,b,n,h,o={}){const nx=n,ny=Math.round(n*(b.n-b.s)/(b.e-b.w)*1.1)||n,pos=[],uv=[],idx=[];const my0=mercY(b.s),my1=mercY(b.n);
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const lon=lp(b.w,b.e,i/nx),my=lp(my1,my0,j/ny),lat=Math.atan(Math.sinh(my))*180/Math.PI;
    pos.push(...geo(lon,lat,h));uv.push(i/nx,1-j/ny)}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,c=a+nx+1;idx.push(a,c,a+1,a+1,c,c+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const t=new THREE.Texture(img);t.encoding=THREE.sRGBEncoding;t.anisotropy=16;t.needsUpdate=true;
  let rt=null;if(o.rough){rt=new THREE.Texture(o.rough);rt.needsUpdate=true}
  const m=new THREE.MeshStandardMaterial({map:t,roughnessMap:rt,roughness:.95,metalness:0,polygonOffset:true,polygonOffsetFactor:o.po||0,polygonOffsetUnits:o.po||0});
  if(o.fade){m.transparent=true;m.onBeforeCompile=sh=>{sh.uniforms.fadeB={value:o.fade};sh.vertexShader=sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvUvF=uv;').replace('void main() {','varying vec2 vUvF;\nvoid main() {');
    sh.fragmentShader=sh.fragmentShader.replace('void main() {','varying vec2 vUvF;uniform float fadeB;\nvoid main() {').replace('#include <dithering_fragment>','#include <dithering_fragment>\nvec2 e2=min(vUvF,1.-vUvF);gl_FragColor.a*=smoothstep(0.,fadeB,min(e2.x,e2.y));');
    if(o.detail){/* detalhe fino perto da câmera (copas, solo): o satélite tem ~9 m por pixel; fora da água, ruído em 3 escalas pelo xz do mundo */
      sh.uniforms.det={value:o.detail};sh.vertexShader=sh.vertexShader.replace('void main() {','varying vec3 vWp;\nvoid main() {').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader=sh.fragmentShader.replace('void main() {','varying vec3 vWp;uniform sampler2D det;\nvoid main() {').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n{float wet=1.-smoothstep(.3,.7,texelRoughness.g);float dc=length(vWp-cameraPosition);float k=(1.-smoothstep(600.,4500.,dc))*(1.-wet);\nfloat n=texture2D(det,vWp.xz/23.).r*.5+texture2D(det,vWp.xz/71.).r*.35+texture2D(det,vWp.xz/7.).r*.15;diffuseColor.rgb*=mix(1.,.55+.9*n,k);}')}}}
  const me=new THREE.Mesh(g,m);me.receiveShadow=true;me.frustumCulled=false;return me}
function buildEarth(){const day=imgTex('geo:terra.jpg'),cld=imgTex('geo:nuvens.jpg');const nx=256,ny=128,pos=[],uv=[],idx=[];
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const lon=-180+360*i/nx,lat=90-180*j/ny;pos.push(...geo(lon,lat,-40));uv.push(i/nx,1-j/ny)}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,c=a+nx+1;idx.push(a,c,a+1,a+1,c,c+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const m=new THREE.ShaderMaterial({uniforms:{day:{value:day},cloud:{value:cld},hasC:{value:cld?.9:0},sun:{value:new THREE.Vector3(1,1,1)},C:{value:new THREE.Vector3(0,-RE,0)}},
    vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
uniform vec3 C;varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(position,1.);vN=normalize(wp.xyz-C);vV=cameraPosition-wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;
#include <logdepthbuf_vertex>
}`,fragmentShader:`#include <logdepthbuf_pars_fragment>
uniform sampler2D day,cloud;uniform vec3 sun;uniform float hasC;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
void main(){
#include <logdepthbuf_fragment>
  vec3 n=normalize(vN);float l=dot(n,normalize(sun));vec3 c=pow(texture2D(day,vUv).rgb,vec3(2.2));
  float cl_=hasC>0.?texture2D(cloud,vUv).r*hasC:0.;c=mix(c,vec3(1.),cl_*.8);
  vec3 col=c*smoothstep(-.1,.3,l)*2.6;float rim=pow(1.-max(0.,dot(n,normalize(vV))),5.);col=mix(col,vec3(.3,.52,.9)*smoothstep(-.3,.4,l),rim*.55);
  gl_FragColor=vec4(col,1.);}`});
  const e=new THREE.Mesh(g,m);e.frustumCulled=false;
  /* atmosfera: casca um pouco maior, brilho na borda (azul, nunca rosa) */
  const ag=new THREE.SphereGeometry(RE*1.012,160,80);const atm=new THREE.Mesh(ag,new THREE.ShaderMaterial({uniforms:{sun:{value:new THREE.Vector3(1,1,1)},C:{value:new THREE.Vector3(0,-RE,0)},k:{value:1}},
    vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
uniform vec3 C;varying vec3 vN;varying vec3 vV;void main(){vec4 wp=modelMatrix*vec4(position,1.);vN=normalize(wp.xyz-C);vV=cameraPosition-wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;
#include <logdepthbuf_vertex>
}`,fragmentShader:`#include <logdepthbuf_pars_fragment>
uniform vec3 sun;uniform float k;varying vec3 vN;varying vec3 vV;void main(){
#include <logdepthbuf_fragment>
vec3 n=normalize(vN);float r=1.-abs(dot(n,normalize(vV)));float g=pow(r,3.)*smoothstep(-.3,.3,dot(n,normalize(sun)));gl_FragColor=vec4(vec3(.32,.6,1.)*g*2.*k,g*k);}`,
    side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  atm.position.set(0,-RE,0);atm.frustumCulled=false;
  const grp=new THREE.Group();grp.add(e);grp.add(atm);grp.userData={e,atm};return grp}
function imgTex(k,lin){const im=IMG[k];if(!im)return null;const t=new THREE.Texture(im);t.encoding=lin?THREE.LinearEncoding:THREE.sRGBEncoding;t.anisotropy=16;t.needsUpdate=true;return t}

/* ---------- textura da pista: asfalto do Poly Haven (3 m) repetido + faixas pintadas, tudo no mesmo UV (u = largura, v = 24 m) ---------- */
const TW=ROAD.half*2+ROAD.sh*2,TL=24;
function roadTex(kind){const pxm=72,w=Math.round(TW*pxm),h=TL*pxm,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  const im=IMG['road:asfalto_'+kind+'.jpg'],t=3*pxm;
  if(im)for(let y=0;y<h;y+=t)for(let x=0;x<w;x+=t)g.drawImage(im,x,y,t,t);else{g.fillStyle=kind==='nor'?'#8080ff':'#555';g.fillRect(0,0,w,h)}
  const X=m=>(m+TW/2)*pxm;
  const paint=(x0,x1,y0,y1)=>{if(kind==='diff'){g.fillStyle='rgba(232,230,222,.93)';g.fillRect(X(x0),y0*pxm,(x1-x0)*pxm,(y1-y0)*pxm);
      g.globalAlpha=.25;for(let i=0;i<60;i++){g.fillStyle='#777';g.fillRect(X(x0)+Math.random()*(x1-x0)*pxm,(y0+Math.random()*(y1-y0))*pxm,2,2)}g.globalAlpha=1}
    else if(kind==='nor'){g.fillStyle='rgb(128,128,255)';g.fillRect(X(x0),y0*pxm,(x1-x0)*pxm,(y1-y0)*pxm)}
    else{g.fillStyle='rgb(150,150,150)';g.fillRect(X(x0),y0*pxm,(x1-x0)*pxm,(y1-y0)*pxm)}};
  /* acostamento um pouco mais claro e gasto */
  if(kind==='diff'){g.fillStyle='rgba(150,148,140,.12)';g.fillRect(0,0,X(-ROAD.half),h);g.fillRect(X(ROAD.half),0,w-X(ROAD.half),h)}
  paint(-ROAD.half-.15,-ROAD.half+.05,0,TL);paint(ROAD.half-.05,ROAD.half+.15,0,TL);            /* bordas contínuas */
  for(const xl of [-1.8,1.8])for(let y=0;y<TL;y+=12)paint(xl-.075,xl+.075,y,y+4);             /* tracejado 4 m / 8 m (padrão DNIT) */
  const tx=new THREE.CanvasTexture(c);tx.encoding=kind==='diff'?THREE.sRGBEncoding:THREE.LinearEncoding;tx.wrapS=THREE.ClampToEdgeWrapping;tx.wrapT=THREE.RepeatWrapping;tx.anisotropy=16;return tx}

/* pista dinâmica: malha refeita a cada subquadro em volta do carro (passo fino perto, largo longe), com acostamento, aterro e guard-rail */
const NS=900;let road=null,rails=null,skirt=null,deck=null,posts=null,far=null;
function ribbon(nx,mat){const g=new THREE.BufferGeometry(),P=new Float32Array(NS*nx*3),N=new Float32Array(NS*nx*3),U=new Float32Array(NS*nx*2),I=[];
  for(let j=0;j<NS-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+nx;I.push(a,a+1,b,a+1,b+1,b)}
  g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setAttribute('uv',new THREE.BufferAttribute(U,2));g.setIndex(I);
  const m=new THREE.Mesh(g,mat);m.frustumCulled=false;m.castShadow=false;m.receiveShadow=true;return m}
function samples(sc,back,fwd){const S=[];let s=sc;const step=d=>cl(Math.abs(d)*.012+.8,.8,400);
  const L=[];s=sc;while(s>sc-back&&L.length<NS/2-2){L.push(s);s-=step(s-sc)}L.reverse();s=sc+step(0);while(s<sc+fwd&&L.length<NS-1){L.push(s);s+=step(s-sc)}
  while(L.length<NS)L.push(L[L.length-1]);return L}
/* uma seção: lista de [x lateral, y normal, u, nx, ny] (normal no plano da seção) */
const SEC_ROAD=[[-TW/2,0,0],[-ROAD.half,0,(TW/2-ROAD.half)/TW],[0,0,.5],[ROAD.half,0,(TW/2+ROAD.half)/TW],[TW/2,0,1]];
function fill(mesh,L,sec,vmode,kfn){const P=mesh.geometry.attributes.position.array,Nn=mesh.geometry.attributes.normal.array,U=mesh.geometry.attributes.uv.array,nx=sec.length;
  for(let j=0;j<NS;j++){const s=L[j],f=path(s),kk=kfn?kfn(s):1;for(let i=0;i<nx;i++){let [x,y,u,nb,nn]=sec[i];const k=(j*nx+i)*3;if(kk<1){x=sec[0][0]+(x-sec[0][0])*kk;y=sec[0][1]+(y-sec[0][1])*kk}
      P[k]=f.p[0]+f.B[0]*x+f.N[0]*y;P[k+1]=f.p[1]+f.B[1]*x+f.N[1]*y;P[k+2]=f.p[2]+f.B[2]*x+f.N[2]*y;
      const a=nb||0,b=nn??1;Nn[k]=f.B[0]*a+f.N[0]*b;Nn[k+1]=f.B[1]*a+f.N[1]*b;Nn[k+2]=f.B[2]*a+f.N[2]*b;
      U[(j*nx+i)*2]=u;U[(j*nx+i)*2+1]=vmode==='len'?s/TL:s/4}}
  for(const k of ['position','normal','uv'])mesh.geometry.attributes[k].needsUpdate=true;mesh.geometry.computeBoundingSphere()}
/* guard-rail (perfil W simplificado, aço galvanizado) dos dois lados e aterro de concreto descendo da borda */
const RX=TW/2+.25;
const SEC_RAIL=[[-RX,.45,0,1,0],[-RX,.82,.33,1,0],[-RX+.02,.82,.34,0,1],[-RX-.1,.82,.5,-1,0],[-RX-.1,.45,.66,-1,0],[-RX+.02,.45,.67,0,-1],[-RX,.45,1,1,0]];
const SEC_RAIL2=SEC_RAIL.map(([x,y,u,a,b])=>[-x,y,u,-a,b]);
const SEC_SKIRT=[[-TW/2-.4,.05,0,-1,0],[-TW/2-.4,-1.6,.3,-1,0],[-TW/2-2.6,-4,.6,-.7,.7],[-TW/2-6,-4.2,1,0,1]];
const SEC_SKIRT2=SEC_SKIRT.map(([x,y,u,a,b])=>[-x,y,u,-a,b]);
/* tabuleiro de concreto por baixo da pista (aparece na dobra e na subida, vista de baixo) */
const SEC_DECK=[[-TW/2-.4,.06,0,-1,0],[-TW/2-.4,-1.1,.15,-1,0],[-TW/2+.8,-1.7,.35,0,-1],[TW/2-.8,-1.7,.65,0,-1],[TW/2+.4,-1.1,.85,1,0],[TW/2+.4,.06,1,1,0]];
const KSK=s=>cl((-s-5)/40);
function updRoad(sc){const L=samples(sc,1600,5200);fill(road,L,SEC_ROAD,'len');fill(rails[0],L,SEC_RAIL,'w');fill(rails[1],L,SEC_RAIL2,'w');
  fill(skirt[0],L,SEC_SKIRT,'w',KSK);fill(skirt[1],L,SEC_SKIRT2,'w',KSK);fill(deck,L,SEC_DECK,'w');
  /* postes do guard-rail a cada 4 m (±500 m do carro) */
  const M=new THREE.Matrix4(),q=new THREE.Quaternion(),m3=new THREE.Matrix4();let n=0;const s0=Math.ceil((sc-500)/4)*4;
  for(let s=s0;s<sc+500&&n<posts.count-1;s+=4){const f=path(s);for(const sd of [-1,1]){const x=sd*(RX+.06);
      m3.makeBasis(V3(f.B),V3(f.N),V3(f.T).negate());q.setFromRotationMatrix(m3);
      M.compose(new THREE.Vector3(f.p[0]+f.B[0]*x+f.N[0]*.42,f.p[1]+f.B[1]*x+f.N[1]*.42,f.p[2]+f.B[2]*x+f.N[2]*.42),q,new THREE.Vector3(1,1,1));posts.setMatrixAt(n++,M)}}
  posts.count=n;posts.instanceMatrix.needsUpdate=true}
/* pista inteira vista de longe: fita larga (largura aumenta com a distância para continuar visível) */
const NF=420;
function buildFar(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(NF*2*3),3));
  const I=[];for(let j=0;j<NF-1;j++){const a=j*2;I.push(a,a+2,a+1,a+1,a+2,a+3)}g.setIndex(I);
  const m=new THREE.MeshBasicMaterial({color:new THREE.Color(.55,.55,.58),transparent:true,opacity:1,side:THREE.DoubleSide,depthWrite:false});
  const me=new THREE.Mesh(g,m);me.frustumCulled=false;me.renderOrder=2;return me}
function updFar(camPos,sTop,k){const P=far.geometry.attributes.position.array;const s0=-6000,cp=camPos;
  for(let j=0;j<NF;j++){const u=j/(NF-1),s=s0+(sTop-s0)*Math.pow(u,1.6),f=path(s);const d=Math.hypot(f.p[0]-cp.x,f.p[1]-cp.y,f.p[2]-cp.z);
    const w=Math.max(TW/2,d*.0016*k);/* lado: perpendicular à pista e à direção da câmera */
    const vc=new THREE.Vector3(cp.x-f.p[0],cp.y-f.p[1],cp.z-f.p[2]).normalize(),sd=new THREE.Vector3(...f.T).cross(vc).normalize();
    P.set([f.p[0]+sd.x*w,f.p[1]+sd.y*w,f.p[2]+sd.z*w],j*6);P.set([f.p[0]-sd.x*w,f.p[1]-sd.y*w,f.p[2]-sd.z*w],j*6+3)}
  far.geometry.attributes.position.needsUpdate=true}

/* ---------- carro (Khronos Car Concept, CC BY 4.0) ---------- */
let CAR=null,WHEELS=[],CARINFO={};
function loadGLB(re){const M=typeof __MODELS__!=='undefined'?__MODELS__:{};const k=Object.keys(M).find(n=>re.test(n));if(!k)return Promise.resolve(null);
  const bin=Uint8Array.from(atob(M[k]),c=>c.charCodeAt(0)).buffer;return new Promise(res=>new THREE.GLTFLoader().parse(bin,'',g=>res(g.scene),e=>{console.warn('glb falhou',k,e);res(null)}))}
function prepCar(sc){if(!sc)return;sc.updateMatrixWorld(true);
  /* eixos do modelo: descobre frente (capô), cima e lado pelo contorno; o carro fica com frente = +z local, cima = +y, chão em y = 0 */
  const hood=sc.getObjectByName('BodyHood'),seat=sc.getObjectByName('InteriorSeatsColor1'),box=new THREE.Box3().setFromObject(sc),c=box.getCenter(new THREE.Vector3()),sz=box.getSize(new THREE.Vector3());
  const hc=new THREE.Box3().setFromObject(hood).getCenter(new THREE.Vector3()).sub(c);
  const ax=['x','y','z'];const len=ax.reduce((a,b)=>sz[a]>sz[b]?a:b),up=ax.filter(a=>a!==len).reduce((a,b)=>sz[a]<sz[b]?a:b);
  /* cima: o lado do eixo "up" onde fica o teto (o contorno vai mais longe do centro para cima que para baixo? usa o painel do teto) */
  const roof=sc.getObjectByName('BodyRoofPanel'),rc=new THREE.Box3().setFromObject(roof).getCenter(new THREE.Vector3()).sub(c);
  const F=new THREE.Vector3();F[len]=Math.sign(hc[len]);const U=new THREE.Vector3();U[up]=Math.sign(rc[up]);const S=new THREE.Vector3().crossVectors(F,U); /* S = direita? F×U = -right em mão direita; corrigido abaixo */
  const Rt=new THREE.Vector3().crossVectors(F,U).negate(); /* direita = U×F */
  const m=new THREE.Matrix4().makeBasis(Rt,U,F).invert();const w=new THREE.Group();const inner=new THREE.Group();inner.add(sc);inner.applyMatrix4(m);
  w.add(inner);w.updateMatrixWorld(true);const b2=new THREE.Box3().setFromObject(w);inner.position.y-=b2.min.y;inner.position.x-=(b2.min.x+b2.max.x)/2;inner.position.z-=(b2.min.z+b2.max.z)/2;w.updateMatrixWorld(true);
  CARINFO.size=new THREE.Box3().setFromObject(w).getSize(new THREE.Vector3()).toArray();
  /* assento do motorista: o banco do lado esquerdo (x < 0, volante do lado esquerdo no Brasil) */
  const wheel=sc.getObjectByName('InteriorSteeringWheel01')||sc.getObjectByName('InteriorSteeringBase');
  const wc=new THREE.Box3().setFromObject(wheel).getCenter(new THREE.Vector3());w.worldToLocal(wc);CARINFO.wheel=wc.toArray();
  /* rodas: pivô no centro de cada roda (pneu + aro + disco giram; pinça fica) */
  for(const nm of ['WheelFrontL','WheelFrontR','WheelRearL','WheelRearR']){const tire=sc.getObjectByName(nm);if(!tire)continue;
    const parts=[tire,sc.getObjectByName(nm+'Rim'),sc.getObjectByName(nm+'BrakeDisc')].filter(Boolean);
    const bb=new THREE.Box3().setFromObject(tire),cc=bb.getCenter(new THREE.Vector3());const piv=new THREE.Group();w.attach(piv);piv.position.copy(w.worldToLocal(cc.clone()));
    parts.forEach(p=>piv.attach(p));WHEELS.push({piv,q0:piv.quaternion.clone(),r:bb.getSize(new THREE.Vector3()).y/2})}
  {let mn=1e9;WHEELS.forEach(w=>{mn=Math.min(mn,w.piv.position.y-w.r)});if(mn<1e8&&Math.abs(mn)>.005){w.children.forEach(ch=>ch.position.y-=mn);WHEELS.forEach(x=>x.piv.position.y-=0)}}
  /* materiais: variante grafite (sem logos), pintura com verniz; vidros um pouco escuros; faróis acesos */
  sc.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const mt=o.material;if(!mt)return;
    if(/Khronos|Logo/i.test(o.name)||/License/i.test(mt.name||''))o.visible=false;
    if(/Paint 1/.test(mt.name||'')){mt.color&&mt.color.setRGB(.035,.16,.42);mt.roughness=.28;mt.metalness=.55;if('clearcoat' in mt){mt.clearcoat=1;mt.clearcoatRoughness=.04}}
    if(/Paint 2/.test(mt.name||'')){mt.color&&mt.color.setRGB(.02,.02,.025);mt.roughness=.35}
    if(/Headlight|Signal/.test(mt.name||'')&&mt.emissive){mt.emissiveIntensity=(mt.emissiveIntensity||1)*2}
    mt.envMapIntensity=1;
    if(mt.name==='Dashboard'&&mt.emissiveMap&&mt.emissiveMap.image&&!mt.userData.pt){mt.userData.pt=1;mt.emissiveMap=dashTex(mt.emissiveMap)}});
  CAR=w}
/* painel em português e marcando 100 km/h (a textura original diz "0" e está em inglês) */
function dashTex(src){const im=src.image,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);
  const sx=c.width/1024,sy=c.height/256;g.save();g.scale(sx,sy);g.fillStyle='#000';
  g.fillRect(470,30,240,175);g.fillRect(150,198,300,32);g.fillRect(520,198,180,32);g.fillRect(770,198,150,32);
  g.fillStyle='#fff';g.textAlign='center';g.textBaseline='alphabetic';const rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
  /* dígitos no mesmo desenho do "0" original: anel de cantos arredondados, traço de 22 px */
  g.strokeStyle='#fff';g.lineWidth=22;g.lineJoin='round';g.beginPath();g.moveTo(512,58);g.lineTo(512,182);g.stroke();g.beginPath();g.moveTo(492,72);g.lineTo(512,58);g.stroke();
  for(const x of [545,628]){rr(x,58,62,124,22);g.stroke()}
  g.font='500 19px "Hanken Grotesk",Arial';g.fillText('combustível',212,222);g.fillText('rotação',294,222);g.fillText('aceleração',385,222);g.fillText('velocidade km/h',602,222);g.fillText('temperatura',843,222);
  g.restore();/* o UV do painel é espelhado no modelo: espelha a textura para o texto sair certo */
  const c2=document.createElement('canvas');c2.width=c.width;c2.height=c.height;const g2=c2.getContext('2d');g2.translate(c.width,0);g2.scale(-1,1);g2.drawImage(c,0,0);
  const t=new THREE.CanvasTexture(c2);t.flipY=src.flipY;t.encoding=src.encoding;return t}

/* ---------- céu: foto 360° do Poly Haven (chão) → gradiente → preto com estrelas (espaço) ---------- */
const SKY_FS=`#include <logdepthbuf_pars_fragment>
uniform sampler2D tex;uniform float alt,rot,exp_,has;uniform vec3 sun;varying vec3 vD;
void main(){
#include <logdepthbuf_fragment>
  vec3 d=normalize(vD);float c_=cos(rot),s_=sin(rot);vec3 q=vec3(c_*d.x-s_*d.z,d.y,s_*d.x+c_*d.z);
  vec2 uv=vec2(atan(q.z,q.x)*.15915494+.5,asin(clamp(q.y,-1.,1.))*.31830989+.5);
  vec3 ph=pow(texture2D(tex,uv).rgb,vec3(2.2))*1.15;
  float e=d.y;vec3 zen1=vec3(.03,.06,.2),hor1=vec3(.16,.3,.62);
  vec3 gr=mix(hor1,zen1,pow(clamp(e,0.,1.),.35));gr=mix(gr,hor1*.9,smoothstep(.05,-.3,e));
  vec3 c=mix(has>0.?ph:gr,gr,smoothstep(.0,.35,alt));c=mix(c,vec3(0.),smoothstep(.3,.75,alt));
  float sd=max(0.,dot(d,normalize(sun)));c+=vec3(1.,.95,.85)*pow(sd,900.)*40.*smoothstep(.2,.7,alt);
  gl_FragColor=vec4(c*exp_,1.);}`;
function buildSky(){const t=imgTex('road:ceu.jpg');const m=new THREE.ShaderMaterial({uniforms:{tex:{value:t},has:{value:t?1:0},alt:{value:0},rot:{value:0},exp_:{value:1},sun:{value:new THREE.Vector3(1,1,1)}},
  vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
#include <logdepthbuf_vertex>
}`,fragmentShader:SKY_FS,side:THREE.BackSide,depthWrite:false});const s=new THREE.Mesh(new THREE.SphereGeometry(1,64,32),m);s.renderOrder=-10;s.frustumCulled=false;return s}
const GAL=new THREE.Vector3(.93,.05,.37).normalize();  /* normal do plano da galáxia no céu (direção arbitrária, fixa) */
function buildStars(){const N=26000,r=rng(77),pos=new Float32Array(N*3),col=new Float32Array(N*3);let i=0;
  while(i<N){const u=r()*2-1,a=r()*TAU,s=Math.sqrt(1-u*u),d=new THREE.Vector3(s*Math.cos(a),u,s*Math.sin(a));const g=Math.abs(d.dot(GAL));
    if(r()>.32+.68*Math.exp(-g*g/.02))continue;  /* mais estrelas perto da faixa */
    pos.set([d.x,d.y,d.z],i*3);const b=Math.pow(r(),6)*2.2+.05,c=r();col.set(c<.2?[b*.72,b*.84,b]:c<.85?[b,b*.97,b*.92]:[b,b*.8,b*.58],i*3);i++}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.PointsMaterial({size:2.1,sizeAttenuation:false,vertexColors:true,transparent:true,depthWrite:false});const p=new THREE.Points(g,m);p.frustumCulled=false;p.renderOrder=-9;return p}
/* Via Láctea: faixa difusa com nuvens de estrelas e faixas escuras de poeira (ruído 3D na direção), aditiva, sem rosa */
function buildMilky(){const m=new THREE.ShaderMaterial({uniforms:{a:{value:0},n:{value:GAL}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide,
  vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
#include <logdepthbuf_vertex>
}`,fragmentShader:`#include <logdepthbuf_pars_fragment>
uniform float a;uniform vec3 n;varying vec3 vD;
float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.,w=.5;for(int k=0;k<6;k++){s+=w*vn(p);p*=2.03;w*=.5;}return s;}
void main(){
#include <logdepthbuf_fragment>
vec3 d=normalize(vD);float g=dot(d,n);vec3 c0=normalize(cross(n,vec3(0.,1.,0.)));float core=pow(max(0.,dot(d,c0)),3.)*.45+.4;
float band=exp(-g*g/.005)*.9+exp(-g*g/.03)*.25;float cl=fbm(d*7.)*1.4-.35;float dust=smoothstep(.45,.75,fbm(d*13.+3.))*exp(-g*g/.004);
float v=max(0.,band*(.55+cl)*core-dust*.9*core);vec3 col=mix(vec3(.55,.66,.95),vec3(1.,.9,.74),core*.8)*v;
gl_FragColor=vec4(col*a*.22,1.);}`});const me=new THREE.Mesh(new THREE.SphereGeometry(1,64,32),m);me.frustumCulled=false;me.renderOrder=-9.5;return me}
function noiseTex(seed,w,map){const c=document.createElement('canvas');c.width=c.height=w;const g=c.getContext('2d'),im=g.createImageData(w,w),r=rng(seed);
  const oct=[];for(let k=0;k<6;k++){const n=4<<k,a=[];for(let i=0;i<n*n;i++)a.push(r());oct.push([n,a])}
  for(let y=0;y<w;y++)for(let x=0;x<w;x++){let s=0,amp=.5;for(const [n,a] of oct){const fx=x/w*n,fy=y/w*n,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,q=(i,j)=>a[((iy+j)%n)*n+((ix+i)%n)],sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
      s+=amp*lp(lp(q(0,0),q(1,0),sx),lp(q(0,1),q(1,1),sx),sy);amp*=.5}const v=map(s,x/w,y/w),k=(y*w+x)*4;im.data[k]=v[0];im.data[k+1]=v[1];im.data[k+2]=v[2];im.data[k+3]=v[3]}
  g.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);return t}
function buildClouds(){const t=noiseTex(31,256,(s,u,v)=>{const d=Math.hypot(u-.5,v-.5)*2,a=cl((s-.36)*2.4)*cl(1-d*d)*255;return [255,255,255,a]});
  const g=new THREE.Group(),r=rng(31);for(let i=0;i<90;i++){const m=new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:0});const s=new THREE.Sprite(m);
    s.userData={x:(r()-.5)*24000,z:(r()-.5)*24000,y:r(),w:900+r()*2600,rot:r()*TAU};m.rotation=s.userData.rot;g.add(s)}return g}

/* ---------- marcos da subida ---------- */
function buildEverest(){const D=typeof __DEM__!=='undefined'&&__DEM__.everest;if(!D)return null;const nx=D.nx,ny=D.ny,c=D.cel_m,g=new THREE.PlaneGeometry((nx-1)*c,(ny-1)*c,nx-1,ny-1);
  g.rotateX(-Math.PI/2);const p=g.attributes.position;let mx=0,pk=0;
  /* bordas descem até o nível do mar (o recorte é um bloco de 24 km a 4–5 km de altitude): o maciço nasce do chão e o cume fica nos 8.849 m reais */
  for(let i=0;i<p.count;i++){const ix=i%nx,iy=Math.floor(i/nx),e=Math.min(ix,nx-1-ix,iy,ny-1-iy)/Math.min(nx,ny),w=sst(0,.32,e);const h=(D.h[i]||0)*w;p.setY(i,h);if(h>mx){mx=h;pk=i}}
  const px=p.getX(pk),pz=p.getZ(pk);g.translate(-px,0,-pz);
  const col=new Float32Array(p.count*3);g.computeVertexNormals();const n=g.attributes.normal;
  for(let i=0;i<p.count;i++){const h=p.getY(i),sl=1-n.getY(i),snow=sst(6100,7300,h+(1-sl)*700)*(1-sst(.22,.45,sl));const rock=[.27,.25,.23],sn=[.6,.64,.7];
    for(let k=0;k<3;k++)col[i*3+k]=lp(rock[k]*(.8+.3*Math.sin(i*1.7)),sn[k],snow)}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0});
  const me=new THREE.Mesh(g,m);me.castShadow=me.receiveShadow=true;me.userData.top=mx;const w=new THREE.Group();w.add(me);return w}
function buildBalloon(){const g=new THREE.Group();const lat=new THREE.MeshPhysicalMaterial({color:0xe9e3d2,roughness:.45,sheen:.5,transparent:true,opacity:.82,side:THREE.DoubleSide});
  const b=new THREE.Mesh(new THREE.SphereGeometry(1,64,40),lat);b.scale.set(4,4.4,4);b.position.y=12;g.add(b);
  const line=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,10,6),new THREE.MeshStandardMaterial({color:0xdddddd}));line.position.y=3;g.add(line);
  const chute=new THREE.Mesh(new THREE.SphereGeometry(.9,24,12,0,TAU,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xd8541e,roughness:.6,side:THREE.DoubleSide}));chute.position.y=5.5;g.add(chute);
  const box=new THREE.Mesh(new THREE.BoxGeometry(.6,.5,.6),new THREE.MeshStandardMaterial({color:0xf4f1ea,roughness:.8}));box.position.y=-2;g.add(box);
  g.userData={b,chute,line,box};return g}
function buildKarman(){const m=new THREE.ShaderMaterial({uniforms:{a:{value:0},T:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
#include <logdepthbuf_vertex>
}`,fragmentShader:`#include <logdepthbuf_pars_fragment>
uniform float a,T;varying vec2 vP;void main(){
#include <logdepthbuf_fragment>
float r=length(vP);float g=exp(-r/9000.)*.10+exp(-r/700.)*.06;float ring=smoothstep(.96,1.,sin(r*.004-T*3.));g+=ring*.05*exp(-r/6000.);
gl_FragColor=vec4(vec3(1.,.74,.28)*g*a,1.);}`});
  const me=new THREE.Mesh(new THREE.CircleGeometry(30000,128),m);me.rotation.x=-Math.PI/2;me.frustumCulled=false;return me}
function buildSign(){/* placa de rodovia verde (padrão brasileiro) num pórtico ao lado da pista */
  const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');g.fillStyle='#0f6b3a';g.fillRect(0,0,1024,512);
  g.strokeStyle='#f2f2ee';g.lineWidth=14;g.strokeRect(22,22,980,468);g.fillStyle='#f2f2ee';g.font='700 150px "Hanken Grotesk",Arial';g.textAlign='center';g.textBaseline='middle';
  g.fillText('SANTOS',512,200);g.font='600 110px "Hanken Grotesk",Arial';g.fillText('72 km',512,360);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;
  const grp=new THREE.Group();const plate=new THREE.Mesh(new THREE.BoxGeometry(8,4,.14),[0,0,0,0,new THREE.MeshStandardMaterial({map:t,roughness:.5,emissive:0x0a2a18,emissiveIntensity:.0}),new THREE.MeshStandardMaterial({color:0x777777})].map(m=>m||new THREE.MeshStandardMaterial({color:0x777777,metalness:.6,roughness:.4})));
  plate.position.set(0,7,0);grp.add(plate);for(const x of [-3,3]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,6,12),new THREE.MeshStandardMaterial({color:0x9a9ea2,metalness:.8,roughness:.35}));p.position.set(x,3,-.15);grp.add(p)}
  grp.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return grp}

/* ---------- satélites (por código): 'sat' = corpo com manta dourada e dois painéis; 'flat' = tipo Starlink; 'iss' = Estação Espacial (≈109 m) ---------- */
function panelTex(){const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d');g.fillStyle='#0b1630';g.fillRect(0,0,512,256);
  for(let y=0;y<16;y++)for(let x=0;x<32;x++){g.fillStyle=`rgb(${18+((x*7+y*3)%9)},${34+((x*5+y)%11)},${78+((x+y*5)%17)})`;g.fillRect(x*16+1,y*16+1,14,14)}
  g.fillStyle='#8a8f96';for(let x=0;x<512;x+=128)g.fillRect(x,0,3,256);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
function foilTex(){const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d'),r=rng(4);g.fillStyle='#c99a3a';g.fillRect(0,0,256,256);
  for(let i=0;i<900;i++){const v=150+r()*105|0;g.fillStyle=`rgba(${v},${v*.75|0},${v*.3|0},.55)`;g.fillRect(r()*256,r()*256,6+r()*26,2+r()*10)}const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
let MSAT=null;
function satMats(){if(MSAT)return MSAT;const pt=panelTex();MSAT={panel:new THREE.MeshStandardMaterial({map:pt,metalness:.6,roughness:.22,emissive:0x0a1430,side:THREE.DoubleSide}),
  foil:new THREE.MeshStandardMaterial({map:foilTex(),metalness:.95,roughness:.3,emissive:0x2a1a04}),white:new THREE.MeshStandardMaterial({color:0xdedad2,roughness:.5,metalness:.15,emissive:0x151515}),
  metal:new THREE.MeshStandardMaterial({color:0xb8bcc2,roughness:.3,metalness:.9}),dark:new THREE.MeshStandardMaterial({color:0x2a2d33,roughness:.6})};return MSAT}
function buildSat(type){const M=satMats(),g=new THREE.Group(),bx=(w,h,d,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o};
  if(type==='iss'){bx(108,1.6,1.6,M.metal);for(const x of [-46,-34,34,46])for(const sd of [-1,1]){const w=bx(11.6,.12,33,M.panel,x,0,sd*18.5);w.rotation.x=.12*sd}
    for(const x of [-20,20])bx(3,.1,14,M.white,x,-4,0);
    const mod=(L,R,x,y,z,rot)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(R,R,L,24),M.white);o.position.set(x,y,z);if(rot==='x')o.rotation.z=Math.PI/2;if(rot==='z')o.rotation.x=Math.PI/2;g.add(o)};
    mod(46,2.1,0,-4.5,-2,'z');mod(9,2.1,0,-4.5,22,'z');mod(10,2.2,-6,-4.5,-14,'x');mod(10,2.2,6,-4.5,-14,'x');mod(12,1.6,0,-4.5,-30,'z');
    bx(5,.2,2.5,M.white,0,-1.4,6);}
  else if(type==='flat'){bx(2.8,.25,1.4,M.dark);const w=bx(8,.05,2.6,M.panel,5.6,.2,0);w.rotation.z=.08}
  else{bx(2.2,2.2,2.8,M.foil);for(const sd of [-1,1]){bx(.12,.12,1.6,M.metal,0,0,sd*2.1);bx(1.9,.05,6,M.panel,0,0,sd*5)}
    const dish=new THREE.Mesh(new THREE.SphereGeometry(1,24,12,0,TAU,0,.9),M.white);dish.scale.set(1,.35,1);dish.rotation.x=Math.PI;dish.position.set(0,1.6,0);g.add(dish)}
  g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});return g}
/* passe final (igual ao ROCKET): exposição, ACES, saturação, vinheta, sRGB */
const FINAL={uniforms:{tDiffuse:{value:null},exp_:{value:1},sat:{value:1},vig:{value:.25}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float exp_,sat,vig;varying vec2 vUv;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*exp_;c=aces(c);float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);
  vec2 d=vUv-.5;c*=1.-vig*dot(d,d)*2.2;c=pow(max(c,0.),vec3(1./2.2));gl_FragColor=vec4(c,1.);}`};

/* ---------- montagem ---------- */
function loadImgs(){const A=typeof __ASSETS__!=='undefined'?__ASSETS__:{};const keys=Object.keys(A).filter(k=>/^(geo:(terra|nuvens|lua)\.jpg|road:|sp:)/.test(k));
  return Promise.all(keys.map(k=>new Promise(res=>{const im=new Image();im.onload=()=>{IMG[k]=im;res()};im.onerror=res;im.src=A[k]})))}
let PLANE=null;
function init(w,h,o={}){W=w;H=h;Object.assign(O,o);const sc=o.scale||1;RW=Math.round(W*sc);RH=Math.round(H*sc);
  /* rf anda para −z; rumo h em graus a partir do norte (horário). Norte = −z do mundo, leste = +x: dir = (sin h, 0, −cos h).
     A rotação Y por θ leva (0,0,−1) a (−sin θ, 0, −cos θ) ⇒ θ = −h. */
  RY=new THREE.Matrix4().makeRotationY(-O.head*Math.PI/180);
  cv=document.createElement('canvas');cv.width=RW;cv.height=RH;
  R=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});
  R.setPixelRatio(1);R.setSize(RW,RH,false);R.outputEncoding=THREE.LinearEncoding;R.toneMapping=THREE.NoToneMapping;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(50,RW/RH,.05,5e9);
  acc=document.createElement('canvas');acc.width=W;acc.height=H;accx=acc.getContext('2d');
  ready=Promise.all([loadImgs(),loadGLB(/CarConcept/i).then(prepCar),loadGLB(/regional-jet/i).then(p=>{if(p){PLANE=new THREE.Group();PLANE.add(p);p.traverse(m=>{if(m.isMesh){m.castShadow=true}})}})]).then(build);
  if(typeof window!=='undefined'){const prev=window.__assetsReady||Promise.resolve();window.__assetsReady=Promise.all([prev,ready])}
  return ready}
function build(){
  const sun=new THREE.DirectionalLight(0xfff2e0,3);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);const s=sun.shadow.camera;s.left=-16;s.right=16;s.top=16;s.bottom=-16;s.near=1;s.far=400;sun.shadow.bias=-.0003;sun.shadow.normalBias=.02;
  scene.add(sun);scene.add(sun.target);G.sun=sun;G.hemi=new THREE.HemisphereLight(0xa8c8ff,0x56604a,.5);scene.add(G.hemi);
  /* reflexos: o próprio céu do Poly Haven (chão) e um ambiente escuro com a Terra embaixo (espaço) */
  const pm=new THREE.PMREMGenerator(R);const ct=imgTex('road:ceu.jpg');if(ct){ct.mapping=THREE.EquirectangularReflectionMapping;G.envSky=pm.fromEquirectangular(ct).texture}
  {const es=new THREE.Scene();es.add(new THREE.Mesh(new THREE.SphereGeometry(10,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:`varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 d;void main(){float e=normalize(d).y;vec3 c=e>0.?vec3(.01,.012,.02):mix(vec3(.1,.2,.4),vec3(.05,.12,.3),-e);gl_FragColor=vec4(c,1.);}`})));G.envSpace=pm.fromScene(es,.02).texture}
  G.sky=buildSky();scene.add(G.sky);G.stars=buildStars();scene.add(G.stars);G.milky=buildMilky();scene.add(G.milky);G.clouds=buildClouds();scene.add(G.clouds);
  G.earth=buildEarth();scene.add(G.earth);
  const SPI=typeof __SP__!=='undefined'?__SP__:null;
  if(SPI&&IMG['sp:sp_regiao.jpg']){G.reg=patch(IMG['sp:sp_regiao.jpg'],SPI.sp_regiao,220,-12,{fade:.22,rough:IMG['sp:sp_regiao_rough.png']});scene.add(G.reg)}
  if(SPI&&IMG['sp:sp_perto.jpg']){G.near=patch(IMG['sp:sp_perto.jpg'],SPI.sp_perto,260,-4,{fade:.12,rough:IMG['sp:sp_perto_rough.png'],detail:(()=>{const t=noiseTex(17,512,(v)=>{const c=cl((v-.25)*1.8)*255;return [c,c,c,255]});t.wrapS=t.wrapT=THREE.RepeatWrapping;return t})()});scene.add(G.near)}
  {const t=imgTex('geo:lua.jpg');G.moon=new THREE.Mesh(new THREE.SphereGeometry(1,96,48),new THREE.MeshBasicMaterial({map:t,color:new THREE.Color(.92,.92,.9)}));G.moon.frustumCulled=false;scene.add(G.moon)}
  /* pista */
  const mRoad=new THREE.MeshStandardMaterial({map:roadTex('diff'),normalMap:roadTex('nor'),roughnessMap:roadTex('rough'),roughness:1,metalness:0,normalScale:new THREE.Vector2(.8,.8)});
  road=ribbon(SEC_ROAD.length,mRoad);scene.add(road);
  const mRail=new THREE.MeshStandardMaterial({color:0x7d8388,metalness:.85,roughness:.5,side:THREE.DoubleSide});rails=[ribbon(SEC_RAIL.length,mRail),ribbon(SEC_RAIL2.length,mRail)];rails.forEach(r=>{r.castShadow=true;scene.add(r)});
  const mSk=new THREE.MeshStandardMaterial({color:0x8d8a83,roughness:.9,side:THREE.DoubleSide});skirt=[ribbon(SEC_SKIRT.length,mSk),ribbon(SEC_SKIRT2.length,mSk)];skirt.forEach(r=>scene.add(r));
  deck=ribbon(SEC_DECK.length,new THREE.MeshStandardMaterial({color:0x9b9890,roughness:.85,side:THREE.DoubleSide}));deck.castShadow=true;scene.add(deck);
  posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.1,.85,.1),new THREE.MeshStandardMaterial({color:0x9da1a5,metalness:.8,roughness:.4}),600);posts.castShadow=true;posts.frustumCulled=false;scene.add(posts);
  far=buildFar();scene.add(far);
  if(CAR){scene.add(CAR);G.cabin=new THREE.PointLight(0xdfe8ff,0,3,2);CAR.add(G.cabin);G.cabin.position.set(0,.95,.6)}
  if(PLANE){scene.add(PLANE);G.plane=PLANE}
  G.everest=buildEverest();if(G.everest)scene.add(G.everest);G.balloon=buildBalloon();scene.add(G.balloon);G.karman=buildKarman();scene.add(G.karman);G.sign=buildSign();scene.add(G.sign);
  G.sats=['sat','flat','sat','flat','iss'].map(k=>{const o=buildSat(k);o.userData.k=k;o.visible=false;scene.add(o);return o});
  G.frag=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(400*3),3)),new THREE.PointsMaterial({color:0xf2efe6,size:.25,sizeAttenuation:true}));G.frag.frustumCulled=false;scene.add(G.frag);
  const rt=new THREE.WebGLRenderTarget(RW,RH,{type:THREE.HalfFloatType,samples:4});
  composer=new THREE.EffectComposer(R,rt);composer.setSize(RW,RH);composer.addPass(new THREE.RenderPass(scene,camera));
  bloom=new THREE.UnrealBloomPass(new THREE.Vector2(RW,RH),.5,.45,1.6);composer.addPass(bloom);final=new THREE.ShaderPass(FINAL);composer.addPass(final);
  /* direção do Sol da foto (pixel mais claro, medido na foto: u 0,6016, v 0,754 de cima) */
  G.sunPh=(()=>{const u=.6016,v=1-.246,ph=(u-.5)*TAU,el=(v-.5)*Math.PI;return [Math.cos(el)*Math.cos(ph),Math.sin(el),Math.cos(el)*Math.sin(ph)]})();
  loaded=true}

/* ---------- pose do carro ---------- */
function carPose(car){const f=path(car.s||0),x=car.x||0;const p=[f.p[0]+f.B[0]*x,f.p[1]+f.B[1]*x,f.p[2]+f.B[2]*x];
  const m=new THREE.Matrix4().makeBasis(V3(f.B),V3(f.N),V3(f.T));m.setPosition(...p);return {m,f,p}}
function carCam(car,o={}){const {m}=carPose(car);const e=V3(o.eye||[0,1.12,.02]).applyMatrix4(m),l=V3(o.look||[0,1.02,30]).applyMatrix4(m);
  const up=V3(o.up||[0,1,0]).transformDirection(m);return {pos:e.toArray(),tgt:l.toArray(),up:up.toArray(),fov:o.fov||62,near:.02}}

/* ---------- um subquadro ---------- */
function setup(st,t){const env=st.env||{},car=st.car||{s:0};const altC=Math.max(0,st.cam.pos[1]);
  const skyRot=env.skyRot||0;const sp=G.sunPh,cr=Math.cos(skyRot),sr=Math.sin(skyRot);const sunD=V3(env.sun||[cr*sp[0]+sr*sp[2],sp[1],-sr*sp[0]+cr*sp[2]]).normalize();
  /* carro */
  if(CAR){const {m}=carPose(car);CAR.matrixAutoUpdate=false;CAR.matrix.copy(m);CAR.matrixWorldNeedsUpdate=true;CAR.visible=car.vis!==false;
    const ang=car.spin??((car.s||0)/(WHEELS[0]?WHEELS[0].r:.35));WHEELS.forEach(w=>{w.piv.quaternion.copy(w.q0).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),ang))})}
  if(G.cabin)G.cabin.intensity=env.cabin||0;
  updRoad(car.s||0);
  const rf=st.road||{};far.visible=(rf.far||0)>.01;if(far.visible){updFar(camera.position.set(...st.cam.pos),rf.top??(car.s||0),rf.w??1);far.material.opacity=rf.far;far.material.color.setScalar(rf.glow??.6)}
  /* câmera */
  const c=st.cam;camera.position.set(...c.pos);camera.up.set(...(c.up||[0,1,0]));camera.fov=c.fov||50;camera.near=c.near||.05;camera.far=5e9;camera.aspect=RW/RH;camera.updateProjectionMatrix();camera.lookAt(...c.tgt);
  /* Sol: sombra numa caixa em volta do alvo da câmera */
  const fc=V3(st.shadowAt||c.tgt);G.sun.position.copy(fc).addScaledVector(sunD,200);G.sun.target.position.copy(fc);G.sun.target.updateMatrixWorld();
  G.sun.intensity=env.sunI??3;G.hemi.intensity=(env.hemi??.5)*(1-cl(env.sky||0)*.9);
  /* céu e reflexos */
  const sk=cl(env.sky??0);G.sky.position.copy(camera.position);G.sky.scale.setScalar(4e9);const U=G.sky.material.uniforms;U.alt.value=sk;U.rot.value=skyRot;U.sun.value.copy(sunD);U.exp_.value=env.skyExp??1;
  scene.environment=sk>.45?G.envSpace:G.envSky;const ei=env.envI??(sk>.45?.6:1);scene.traverse(o=>{if(o.isMesh&&o.material&&o.material.isMeshStandardMaterial)o.material.envMapIntensity=ei});
  G.stars.position.copy(camera.position);G.stars.scale.setScalar(3e9);G.stars.material.opacity=cl(env.stars??0);G.stars.visible=(env.stars||0)>.01;
  G.milky.position.copy(camera.position);G.milky.scale.setScalar(2.9e9);G.milky.material.uniforms.a.value=(env.milky??env.stars??0);G.milky.visible=G.milky.material.uniforms.a.value>.01;
  /* Terra e satélite */
  for(const k of ['e','atm'])G.earth.userData[k].material.uniforms.sun.value.copy(sunD);G.earth.userData.atm.material.uniforms.k.value=env.atm??1;
  G.earth.visible=env.earth!==false;if(G.near){G.near.visible=env.near!==false;G.near.material.opacity=env.nearA??1}if(G.reg){G.reg.visible=env.reg!==false;G.reg.material.opacity=env.regA??1}
  /* Lua: direção e tamanho aparente (graus) a partir da câmera */
  const Mo=env.moon;G.moon.visible=!!Mo;if(Mo){const D=3e8,d=V3(Mo.dir).normalize();G.moon.position.copy(camera.position).addScaledVector(d,D);G.moon.scale.setScalar(D*Math.tan((Mo.ang||2)*Math.PI/360));G.moon.rotation.set(0,Mo.rotY??-1.2,0)}
  /* nuvens */
  const cls=env.clouds||[];G.clouds.visible=cls.length>0;G.clouds.children.forEach((s,i)=>{const L=cls[i%Math.max(1,cls.length)];if(!L){s.visible=false;return}const u=s.userData;s.visible=true;
    s.position.set(u.x+(L.x||0),L.y+u.y*(L.dy||500),u.z+(L.z||0));s.scale.set(u.w*(L.s||1),u.w*.42*(L.s||1),1);s.material.opacity=L.a??.8;s.material.color.setScalar(L.lit??1)});
  /* marcos */
  const mk=st.marks||{};
  if(G.everest){const E=mk.everest;G.everest.visible=!!E;if(E){G.everest.position.set(...E.p);G.everest.rotation.y=E.ry||0;G.everest.scale.setScalar(E.s||1)}}
  if(PLANE){const P=mk.plane;PLANE.visible=!!P;if(P){PLANE.position.set(...P.p);PLANE.rotation.set(P.roll||0,P.yaw||0,P.pitch||0,'YXZ');PLANE.scale.setScalar(P.s||1)}}
  {const B=mk.balloon,g=G.balloon;g.visible=!!B;G.frag.visible=false;if(B){g.position.set(...B.p);const u=g.userData,k=B.k??1;u.b.visible=!(B.burst>0);u.b.scale.set(4*k,4.4*k,4*k);
      if(B.burst>0){const P=G.frag.geometry.attributes.position.array,r=rng(9);G.frag.visible=true;for(let i=0;i<400;i++){const a=r()*TAU,b=Math.acos(2*r()-1),v=(6+r()*10)*(1-Math.exp(-B.burst*3));
        P.set([B.p[0]+Math.sin(b)*Math.cos(a)*v,B.p[1]+12+Math.cos(b)*v-B.burst*B.burst*2,B.p[2]+Math.sin(b)*Math.sin(a)*v],i*3)}G.frag.geometry.attributes.position.needsUpdate=true}}}
  {/* satélites: lista [{k:'sat'|'flat'|'iss',p,r:[x,y,z],s}] */const L=mk.sats||[];const used=new Set();G.sats.forEach(o=>o.visible=false);
    for(const e of L){const o=G.sats.find(x=>x.userData.k===(e.k||'sat')&&!used.has(x));if(!o)continue;used.add(o);o.visible=true;o.position.set(...e.p);o.rotation.set(...(e.r||[0,0,0]));o.scale.setScalar(e.s||1)}}
  {const K=mk.karman;G.karman.visible=!!(K&&K.a>0);if(K){G.karman.position.set(K.p?K.p[0]:0,100000,K.p?K.p[2]:-O.R);G.karman.material.uniforms.a.value=K.a;G.karman.material.uniforms.T.value=t}}
  {const S=mk.sign;G.sign.visible=!!S;if(S){const f=path(S.s);const x=S.x??(TW/2+3.2);const m=new THREE.Matrix4().makeBasis(V3(f.B),V3(f.N),V3(f.T).negate());  /* placa de frente para quem sobe; texto para fora da pista */
      m.setPosition(f.p[0]+f.B[0]*x,f.p[1]+f.B[1]*x,f.p[2]+f.B[2]*x);G.sign.matrixAutoUpdate=false;G.sign.matrix.copy(m);G.sign.matrixWorldNeedsUpdate=true}}
  final.uniforms.exp_.value=env.exp??1;final.uniforms.sat.value=env.sat??1.05;final.uniforms.vig.value=env.vig??.28;bloom.strength=st.bloom??.45;bloom.threshold=st.bloomT??1.6}
function frame(stFn,T,o={}){if(!loaded)return null;const sub=o.sub||3,sh=(o.shutter??.5)/30;
  for(let i=0;i<sub;i++){const t=T+(sub>1?(i/(sub-1)-.5)*sh:0);setup(stFn(t),t);composer.render();accx.globalAlpha=1/(i+1);accx.drawImage(cv,0,0,W,H)}
  accx.globalAlpha=1;return acc}
function proj(cam,p){const c=new THREE.PerspectiveCamera(cam.fov||50,W/H,.05,5e9);c.position.set(...cam.pos);c.up.set(...(cam.up||[0,1,0]));c.lookAt(...cam.tgt);c.updateMatrixWorld();
  const v=V3(p).project(c);return {x:(v.x*.5+.5)*W,y:(.5-v.y*.5)*H,vis:v.z<1&&v.z>-1}}
return {init,frame,path,alt,sOf,rf,geo,carCam,carPose,proj,RE,ROAD,get O(){return O},get car(){return CARINFO},get carObj(){return CAR},get canvas(){return acc},get ready(){return ready},get loaded(){return loaded},G}})();
