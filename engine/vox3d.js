/* ---------- VOX: mundo de voxels 3D (three.js r147 na GPU) — corredor com pulos, Terra × Lua (v3.18, 2026-11-08) ----------
   Exemplo: projetos/dino-terra-lua/. meta.json "vox3d": true (build.py injeta kit/vendor/three-r147 + este arquivo).
   Unidades: metros. x = para a frente (sentido da corrida), y = cima, z = para a câmera.
   VOX.init(W,H)                         cria o renderizador (uma metade de tela: W×H) e as duas cenas ('terra' e 'lua')
   VOX.frame(mundo,st)                   desenha um mundo e devolve o canvas. st = {x: posição do dino, y: altura do pé, run: fase da passada,
                                         air: 0..1 no ar, cam:{dx,dy,dz,fov,lx,ly}, obst:[{x,k}], bloom}
   VOX.dino(opts)                        monta o dinossauro de voxels (nosso desenho): corpo, cabeça, cauda, espinhos dourados,
                                         pernas e braços articulados; {helmet:true} põe capacete de vidro e mochila (Lua)
   VOX.ground(mundo)(x,z)                altura do chão; na Lua com crateras caricatas (borda alta, fundo escuro)
   Tudo determinístico (depende só de st). Fundo da Terra: céu, sol de voxels, nuvens, dunas; da Lua: estrelas, a Terra de voxels. */
const VOX=(()=>{
const TAU=Math.PI*2,cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
let R,cv,W,H,composer,bloom,ready=false;const S={};
function hash(x,y=0,z=0){let h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h)}
function vnoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);
  const a=hash(xi,zi),b=hash(xi+1,zi),c=hash(xi,zi+1),d=hash(xi+1,zi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
const col=h=>new THREE.Color(h).convertSRGBToLinear();
/* ---------- malha de voxels: lista [x,y,z,cor] -> InstancedMesh ---------- */
function voxMesh(list,size,o={}){const g=new THREE.BoxGeometry(size*(o.gap??.96),size*(o.gap??.96),size*(o.gap??.96));
  const m=new THREE.MeshStandardMaterial({roughness:o.rough??.85,metalness:0,emissive:o.emissive?col(o.emissive):undefined,emissiveIntensity:o.ei??0});
  const im=new THREE.InstancedMesh(g,m,Math.max(1,list.length)),M=new THREE.Matrix4();
  list.forEach((v,i)=>{M.makeTranslation(v[0],v[1],v[2]);im.setMatrixAt(i,M);im.setColorAt(i,col(v[3]))});
  im.count=list.length;im.castShadow=o.cast??true;im.receiveShadow=o.recv??true;if(im.instanceColor)im.instanceColor.needsUpdate=true;return im}
/* superfície de um sólido definido por inside(x,y,z) num grade de passo u (só os voxels com vizinho vazio) */
function solid(inside,box,u,color){const out=[],[x0,y0,z0,x1,y1,z1]=box;
  for(let x=x0;x<=x1;x+=u)for(let y=y0;y<=y1;y+=u)for(let z=z0;z<=z1;z+=u){if(!inside(x,y,z))continue;
    if(inside(x+u,y,z)&&inside(x-u,y,z)&&inside(x,y+u,z)&&inside(x,y-u,z)&&inside(x,y,z+u)&&inside(x,y,z-u))continue;out.push([x,y,z,color(x,y,z)])}return out}
const ell=(cx,cy,cz,rx,ry,rz)=>(x,y,z)=>((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2<=1;

/* ---------- o dinossauro (desenho próprio) ---------- */
function dino(o={}){const u=.1,G=new THREE.Group(),VERDE='#4fae4a',ESC='#2f7a34',BAR='#b8e07c',OURO='#f4b740';
  const pele=(x,y,z)=>{const n=hash(Math.round(x/u/2),Math.round(y/u/2),Math.round(z/u/2));return y<1.0&&x>-.3&&x<.5?BAR:n>.82?ESC:VERDE};
  const corpo=(x,y,z)=>ell(0,1.05,0,.6,.45,.34)(x,y,z)||ell(.42,1.42,0,.22,.28,.22)(x,y,z)||ell(.7,1.72,0,.4,.3,.27)(x,y,z)||
    (x>.85&&x<1.22&&y>1.6&&y<1.86&&Math.abs(z)<.2)||(x>.85&&x<1.15&&y>1.5&&y<1.62&&Math.abs(z)<.17)||
    [0,1,2,3,4,5].some(k=>ell(-.5-k*.26,1.0-k*.07,0,.34-k*.045,.3-k*.04,.26-k*.035)(x,y,z));
  const body=solid(corpo,[-2.0,.5,-.4,1.3,2.1,.4],u,(x,y,z)=>{
    if(x>.78&&x<.92&&y>1.74&&y<1.86&&Math.abs(Math.abs(z)-.24)<.05)return y>1.79&&x>.84?'#111111':'#ffffff'; /* olho */
    if(x>.9&&y>1.5&&y<1.6)return '#ffffff'; /* dentes */return pele(x,y,z)});
  /* espinhos dourados ao longo das costas */
  for(let k=0;k<9;k++){const x=.45-k*.24,yb=1.48+(k<2?.3:0)-k*.03+(k>3?-.06*(k-3):0),h=.18-k*.012;for(let j=0;j<Math.round(h/u);j++)body.push([x,yb+j*u,0,OURO])}
  G.add(voxMesh(body,u));
  /* braços (curtinhos) */
  const arm=s=>{const g=new THREE.Group(),L=solid((x,y,z)=>ell(0,0,0,.08,.16,.07)(x,y,z)||(y<-.12&&y>-.2&&x>0&&x<.14&&Math.abs(z)<.05),[-.12,-.24,-.1,.2,.2,.1],u*.8,(x,y)=>y<-.12?'#ffffff':VERDE);
    g.add(voxMesh(L,u*.8));g.position.set(.5,1.15,.2*s);return g};
  /* pernas: pivô no quadril */
  const leg=s=>{const g=new THREE.Group(),L=solid((x,y,z)=>ell(0,0,0,.24,.32,.18)(x,y,z)||ell(.04,-.42,0,.13,.26,.12)(x,y,z)||(y<-.62&&y>-.74&&x>-.12&&x<.3&&Math.abs(z)<.13),
      [-.3,-.76,-.2,.32,.34,.2],u,(x,y,z)=>y<-.62&&x>.22?'#ffffff':hash(Math.round(x*5),Math.round(y*5),Math.round(z*5))>.85?ESC:VERDE);g.add(voxMesh(L,u));g.position.set(-.05,.76,.2*s);return g};
  const g1=leg(1),g2=leg(-1),a1=arm(1),a2=arm(-1);G.add(g1,g2,a1,a2);G.userData={legs:[g1,g2],arms:[a1,a2]};
  if(o.helmet){const h=new THREE.Mesh(new THREE.SphereGeometry(.62,40,24),new THREE.MeshPhysicalMaterial({color:0xdff2ff,roughness:.05,metalness:0,transparent:true,opacity:.22,clearcoat:1,clearcoatRoughness:.05}));
    h.position.set(.78,1.7,0);h.castShadow=false;G.add(h);
    const ring=solid((x,y,z)=>{const r=Math.hypot(y-1.18,z);return Math.abs(x-.42)<.06&&r<.3&&r>.18},[.3,.85,-.35,.55,1.5,.35],u,()=>'#e8eef5');G.add(voxMesh(ring,u));
    const pack=solid((x,y,z)=>x>-.62&&x<-.18&&y>1.25&&y<1.75&&Math.abs(z)<.26,[-.7,1.2,-.3,-.1,1.8,.3],u,(x,y)=>y>1.66?OURO:'#f2f2f2');G.add(voxMesh(pack,u));
    const ant=[];for(let j=0;j<6;j++)ant.push([-.5,1.8+j*u,0,'#cfd6de']);ant.push([-.5,1.8+6*u,0,'#ff5a3c']);G.add(voxMesh(ant,u,{emissive:'#ff5a3c',ei:.0}))}
  return G}
function pose(D,run,air){const [l1,l2]=D.userData.legs,[a1,a2]=D.userData.arms,s=Math.sin(run*TAU);
  const k=1-air;l1.rotation.z=.5*s*k+air*.35;l2.rotation.z=-.5*s*k+air*.1;a1.rotation.z=.4*s*k-air*.6;a2.rotation.z=-.4*s*k-air*.6;
  D.children[0].position.y=.06*Math.abs(Math.cos(run*TAU))*k;D.rotation.z=air*.12}

/* ---------- chão ---------- */
const CR=[];for(let i=0;i<40;i++)CR.push({x:i*13+hash(i)*7,z:-1-hash(i,2)*10,r:1.4+hash(i,3)*2});
function ground(w){return w==='lua'?(x,z)=>{let h=.12*vnoise(x*.6,z*.6);for(const c of CR){const X=((x-c.x)%520+520)%520,dx=Math.min(X,520-X),d=Math.hypot(dx,z-c.z)/c.r;
      if(d<1.4)h+=d<1?-.7*(1-d*d):.35*Math.sin((d-1)/.4*Math.PI)}return h}:(x,z)=>.1*Math.sin(x*.35+z*.5)+.08*vnoise(x*.5,z*.5)}
function groundMesh(w,N=110,M=96,s=.5){const g=new THREE.BoxGeometry(s*.97,s*.97,s*.97),m=new THREE.MeshStandardMaterial({roughness:.95});
  const im=new THREE.InstancedMesh(g,m,N*M*2);im.receiveShadow=true;im.castShadow=false;im.userData={N,M,s,w};return im}
function updGround(im,x0){const {N,M,s,w}=im.userData,f=ground(w),Mx=new THREE.Matrix4(),c=new THREE.Color();let i=0;const b=Math.floor(x0/s);
  for(let a=0;a<N;a++)for(let k=0;k<M;k++){const x=(b+a)*s,z=-k*s+6,h=Math.round(f(x,z)/(s*.5))*(s*.5),n=hash(b+a,k);
    for(const dy of [0,-s]){Mx.makeTranslation(x,h-s/2+dy,z);im.setMatrixAt(i,Mx);
      if(w==='lua'){const inC=f(x,z)<-.15,rim=f(x,z)>.25;c.set(rim?'#b4b8bf':inC?'#4a4e56':n>.7?'#9a9ea6':n>.3?'#868a92':'#767a82')}else c.set(n>.75?'#e0a85e':n>.4?'#d39a52':'#c48745');
      c.convertSRGBToLinear();if(dy<0)c.multiplyScalar(.7);im.setColorAt(i,c);i++}}
  im.count=i;im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true}

/* ---------- obstáculos ---------- */
function cactus(){const u=.1,L=[],V='#2f9a4e',E='#1f6e36',F='#ffd23f';
  const ins=(x,y,z)=>{const t=Math.hypot(x,z)<.2&&y>0&&y<2.1,a1=(Math.hypot(x-.42,z)<.13&&y>.95&&y<1.75)||(x>0&&x<.45&&Math.abs(y-.95)<.12&&Math.abs(z)<.13),
    a2=(Math.hypot(x+.36,z)<.12&&y>.7&&y<1.35)||(x<0&&x>-.38&&Math.abs(y-.7)<.11&&Math.abs(z)<.12);return t||a1||a2};
  const l=solid(ins,[-.6,0,-.3,.6,2.2,.3],u,(x,y,z)=>y>2.0&&Math.abs(x)<.1?F:Math.abs(Math.atan2(z,x)*4/Math.PI%1)<.25?E:V);return voxMesh(l,u)}
function rock(seed){const u=.12,r=.5+hash(seed)*.35;const l=solid((x,y,z)=>ell(0,r*.55,0,r,r*.75,r*.8)(x,y,z)&&vnoise(x*4+seed,y*4+z*3)>.25,[-1,0,-1,1,1.2,1],u,(x,y,z)=>hash(x*9,y*9,z*9)>.5?'#9aa0a8':'#80868f');return voxMesh(l,u)}
function dune(){const L=[],s=2;for(let x=-200;x<=200;x+=s)for(let z=-130;z<=-70;z+=s){const h=Math.max(0,4+5*Math.sin(x*.045+z*.08)+4*Math.sin(x*.11-z*.05)+3*vnoise(x*.05,z*.05));
    for(let y=0;y<=h;y+=s)if(y>h-2*s)L.push([x,y-2,z,y>h-s?'#dca063':'#bf8247'])}return voxMesh(L,s,{cast:false})}
function earthBall(){const L=[],s=.8,R=7;for(let x=-R;x<=R;x+=s)for(let y=-R;y<=R;y+=s)for(let z=-R;z<=R;z+=s){const d=Math.hypot(x,y,z);if(d>R||d<R-1.7)continue;
    const la=Math.asin(y/d),lo=Math.atan2(z,x),n=vnoise(lo*2.2+5,la*3+2)+.4*vnoise(lo*6,la*6),cl_=vnoise(lo*4+9,la*5)>.66;
    L.push([x,y,z,cl_?'#ffffff':Math.abs(la)>1.25?'#f4f8ff':n>.78?'#4f9a48':n>.7?'#c9b06a':'#2f6fd6'])}const m=voxMesh(L,s,{cast:false,recv:false,emissive:'#ffffff',ei:.0});m.material.emissive=null;return m}
function sunVox(){const L=[],s=1.2;for(let x=-6;x<=6;x+=s)for(let y=-6;y<=6;y+=s)if(Math.hypot(x,y)<6)L.push([x,y,0,'#fff1b0']);return voxMesh(L,s,{cast:false,recv:false,emissive:'#ffd36b',ei:2.2})}
function cloud(seed){const L=[],s=1;for(let i=0;i<5;i++){const cx=i*2.4-5,r=1.6+hash(seed,i)*1.4;for(let x=-r;x<=r;x+=s)for(let y=0;y<=r;y+=s)for(let z=-1;z<=1;z+=s)if(Math.hypot(x,y*1.3)<r)L.push([cx+x,y,z,y>r*.5?'#ffffff':'#f1e7d8'])}return voxMesh(L,s,{cast:false})}

/* ---------- cenas ---------- */
function skyTex(top,mid,bot){const c=document.createElement('canvas');c.width=2;c.height=256;const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,top);gr.addColorStop(.6,mid);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,0,2,256);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}
function buildTerra(){const sc=new THREE.Scene();sc.background=skyTex('#3f8fe0','#8cc4f0','#ffe2b3');sc.fog=new THREE.Fog(0xf6dcb0,70,260);
  const sun=new THREE.DirectionalLight(0xfff0d6,1.9);sun.position.set(-8,14,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:10,bottom:-6,near:1,far:60});sun.shadow.bias=-.0005;
  sc.add(sun,sun.target,new THREE.HemisphereLight(0xbfdcff,0xb07a45,.55));
  const G={sc,sun,gr:groundMesh('terra'),dino:dino(),dunes:dune(),sunV:sunVox(),obst:[],clouds:[cloud(1),cloud(2),cloud(3)]};sc.add(G.gr,G.dino,G.dunes,G.sunV,...G.clouds);
  for(let i=0;i<8;i++){const c=cactus();c.visible=false;G.obst.push(c);sc.add(c)}return G}
function buildLua(){const sc=new THREE.Scene();sc.background=new THREE.Color(0x020308);
  const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-10,12,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:14,bottom:-6,near:1,far:70});sun.shadow.bias=-.0005;
  sc.add(sun,sun.target,new THREE.HemisphereLight(0x6f86c8,0x222222,.18));
  const st=new THREE.BufferGeometry(),P=[],C=[];for(let i=0;i<1600;i++){const a=hash(i)*TAU,b=hash(i,7)*.9+.05,r=300;P.push(r*Math.cos(a)*Math.cos(b),r*Math.sin(b),-Math.abs(r*Math.sin(a)*Math.cos(b))-20);const k=.5+hash(i,3)*.5;C.push(k,k,k*(.9+hash(i,4)*.2))}
  st.setAttribute('position',new THREE.Float32BufferAttribute(P,3));st.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  const stars=new THREE.Points(st,new THREE.PointsMaterial({size:1.6,sizeAttenuation:false,vertexColors:true}));
  const G={sc,sun,gr:groundMesh('lua'),dino:dino({helmet:true}),earth:earthBall(),stars,obst:[]};sc.add(G.gr,G.dino,G.earth,stars);
  /* morros ao fundo */const L=[],s=2;for(let x=-200;x<=200;x+=s)for(let z=-100;z<=-40;z+=s){const h=Math.max(0,2+3*Math.sin(x*.03+z*.1)+3*vnoise(x*.06,z*.06));for(let y=h-2*s;y<=h;y+=s)L.push([x,y-3,z,y>h-s?'#9a9ea6':'#6e737b'])}
  G.hills=voxMesh(L,s,{cast:false});sc.add(G.hills);for(let i=0;i<8;i++){const r=rock(i);r.visible=false;G.obst.push(r);sc.add(r)}return G}

function init(w,h){W=w;H=h;cv=document.createElement('canvas');cv.width=W;cv.height=H;
  R=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});R.setPixelRatio(1);R.setSize(W,H,false);
  R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.0;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  S.terra=buildTerra();S.lua=buildLua();S.cam=new THREE.PerspectiveCamera(38,W/H,.1,2000);
  composer=new THREE.EffectComposer(R);S.pass=new THREE.RenderPass(S.terra.sc,S.cam);composer.addPass(S.pass);bloom=new THREE.UnrealBloomPass(new THREE.Vector2(W,H),.35,.6,.92);composer.addPass(bloom);
  ready=true;return Promise.resolve()}
function frame(w,st){if(!ready)return null;const G=S[w],x=st.x,cam=st.cam||{};
  updGround(G.gr,x-14);G.dino.position.set(x,st.y,0);pose(G.dino,st.run||0,st.air||0);
  G.sun.position.set(x-10,14,9);G.sun.target.position.set(x+4,0,0);
  (st.obst||[]).forEach((o,i)=>{const m=G.obst[i];if(!m)return;m.visible=true;m.position.set(o.x,ground(w)(o.x,0)-(w==='lua'?.05:0),o.z??0);m.rotation.y=o.r||0;m.scale.setScalar(o.k||1)});
  for(let i=(st.obst||[]).length;i<G.obst.length;i++)G.obst[i].visible=false;
  if(w==='terra'){G.dunes.position.x=x*.55;G.sunV.position.set(x*.98+14,26,-120);G.clouds.forEach((c,i)=>c.position.set(x*.9+[-20,10,34][i]+((st.t||0)*[.6,.4,.8][i]),[19,24,16][i],-90-i*10))}
  else{G.hills.position.x=x*.6;G.earth.position.set(x*.97+22,36,-110);G.earth.rotation.y=(st.t||0)*.05;G.stars.position.x=x}
  S.cam.fov=cam.fov||38;S.cam.updateProjectionMatrix();S.cam.position.set(x+(cam.dx??3),cam.dy??2.6,cam.dz??11);S.cam.lookAt(x+(cam.lx??4),cam.ly??1.6,0);
  S.pass.scene=G.sc;bloom.strength=st.bloom??(w==='lua'?.45:.3);composer.render();return cv}
return {init,frame,dino,ground,get canvas(){return cv},get ready(){return ready},S}})();
