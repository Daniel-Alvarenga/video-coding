/* ---------- PERS: personagem 3D animado (GLB com esqueleto) num palco simples, em three.js r147 ----------
   Feito para o Short "Onde você pula MAIS ALTO?" (projetos/pulo-planetas, 15/11/2026). meta.json: "pers3d": true, "gl": true,
   "models": ["quaternius_space/Astronaut.glb", ...] (CC0, ver kit/assets/quaternius_space/LICENCA.txt).
     PERS.init(W,H,{chars:{nome:/regex do arquivo/},props:{nome:/regex/}})  carrega os GLB (window.__assetsReady espera)
     PERS.frame(st) → canvas. st = {
        cam:{pos,tgt,fov}, sky:{top,bot} (cores), fog:{col,near,far}, ground:{tex(canvas),rep,col,rough,y,size}, sun:{dir,col,I},
        hemi:{sky,gnd,I}, exp, bloom,
        chars:[{n,pos,rotY,scale,anim,t,blend:{anim,t,w}}],  props:[{n,pos,rot,scale,vis}], extras(scene,THREE) }
     PERS.clips(n)  nomes das animações do personagem n;  PERS.dur(n,anim) duração
   Animação determinística: a pose sai de mixer.setTime(t) a cada quadro (nada depende do relógio). Sombras suaves (PCF). */
const PERS=(()=>{
let R,scene,cam,cv,W,H,sun,hemi,ground,gmat,ready=null,loaded=false,composer,bloom;const CH={},PR={};
function loadGLB(re){const M=typeof __MODELS__!=='undefined'?__MODELS__:{};const k=Object.keys(M).find(n=>re.test(n));if(!k)return Promise.resolve(null);
  const bin=Uint8Array.from(atob(M[k]),c=>c.charCodeAt(0)).buffer;return new Promise(res=>new THREE.GLTFLoader().parse(bin,'',g=>res(g),e=>{console.warn('glb falhou',k,e);res(null)}))}
function init(w,h,o={}){W=w;H=h;cv=document.createElement('canvas');cv.width=W;cv.height=H;
  R=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true,alpha:true});R.setSize(W,H,false);R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.0;
  scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(40,W/H,.05,4000);
  hemi=new THREE.HemisphereLight(0xbcd4ff,0x40302a,.6);scene.add(hemi);sun=new THREE.DirectionalLight(0xffffff,2.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera;sc.left=-6;sc.right=6;sc.top=6;sc.bottom=-6;sc.near=.5;sc.far=60;sun.shadow.bias=-.0004;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
  gmat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95,metalness:0});ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),gmat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  try{composer=new THREE.EffectComposer(R);composer.addPass(new THREE.RenderPass(scene,cam));bloom=new THREE.UnrealBloomPass(new THREE.Vector2(W,H),.35,.6,.85);composer.addPass(bloom)}catch(e){composer=null}
  const jobs=[];for(const [n,re] of Object.entries(o.chars||{}))jobs.push(loadGLB(re).then(g=>{if(!g)return;const root=g.scene;root.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false}});
      const mixer=new THREE.AnimationMixer(root),acts={};g.animations.forEach(c=>{const nm=c.name.split('|').pop();acts[nm]={clip:c,act:mixer.clipAction(c)}});scene.add(root);CH[n]={root,mixer,acts}}));
  for(const [n,re] of Object.entries(o.props||{}))jobs.push(loadGLB(re).then(g=>{if(!g)return;const root=g.scene;root.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});scene.add(root);PR[n]={root}}));
  ready=Promise.all(jobs).then(()=>{loaded=true});const prev=window.__assetsReady||Promise.resolve();window.__assetsReady=Promise.all([prev,ready]);return ready}
const col=c=>new THREE.Color(c);
let skyTex=null,skyKey='';function skyBg(top,bot){const k=top+bot;if(k===skyKey)return skyTex;const c=document.createElement('canvas');c.width=2;c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,top);g.addColorStop(1,bot);x.fillStyle=g;x.fillRect(0,0,2,256);
  if(skyTex)skyTex.dispose();skyTex=new THREE.CanvasTexture(c);skyTex.encoding=THREE.sRGBEncoding;skyKey=k;return skyTex}
const texCache=new Map();function canvasTex(cvx,rep){let t=texCache.get(cvx);if(!t){t=new THREE.CanvasTexture(cvx);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=8;texCache.set(cvx,t)}t.repeat.set(rep,rep);return t}
function frame(st){if(!loaded)return cv;const c=st.cam;cam.position.set(...c.pos);cam.lookAt(...c.tgt);cam.fov=c.fov||40;cam.updateProjectionMatrix();
  scene.background=st.sky?skyBg(st.sky.top,st.sky.bot):null;scene.fog=st.fog?new THREE.Fog(col(st.fog.col),st.fog.near,st.fog.far):null;
  const g=st.ground||{};ground.visible=g.vis!==false;ground.scale.set(g.size||200,g.size||200,1);ground.position.y=g.y||0;gmat.color=col(g.col||'#ffffff');gmat.roughness=g.rough??.95;gmat.map=g.tex?canvasTex(g.tex,g.rep||20):null;gmat.needsUpdate=true;
  const s=st.sun||{};const d=s.dir||[.5,1,.4];sun.position.set(d[0]*20,d[1]*20,d[2]*20);sun.target.position.set(0,0,0);sun.color=col(s.col||'#ffffff');sun.intensity=s.I??2.2;
  const hm=st.hemi||{};hemi.color=col(hm.sky||'#bcd4ff');hemi.groundColor=col(hm.gnd||'#40302a');hemi.intensity=hm.I??.6;R.toneMappingExposure=st.exp??1;
  for(const [n,C] of Object.entries(CH)){const p=(st.chars||[]).find(x=>x.n===n);C.root.visible=!!p;if(!p)continue;C.root.position.set(...p.pos);C.root.rotation.y=p.rotY||0;C.root.scale.setScalar(p.scale||1);
    Object.values(C.acts).forEach(a=>{a.act.enabled=false;a.act.weight=0});
    const use=(nm,t,w)=>{const a=C.acts[nm];if(!a)return;a.act.enabled=true;a.act.play();a.act.paused=true;a.act.setEffectiveWeight(w);a.act.time=clamp(t,0,a.clip.duration-1e-3)};
    const wb=p.blend?p.blend.w:0;use(p.anim||'Idle',p.t||0,1-wb);if(p.blend)use(p.blend.anim,p.blend.t,wb);C.mixer.update(0)}
  for(const [n,P] of Object.entries(PR)){const p=(st.props||[]).find(x=>x.n===n);P.root.visible=!!p&&p.vis!==false;if(!p)continue;P.root.position.set(...p.pos);if(p.rot)P.root.rotation.set(...p.rot);P.root.scale.setScalar(p.scale||1)}
  if(st.extras)st.extras(scene,THREE);
  if(composer&&st.bloom){bloom.strength=st.bloom;composer.render()}else R.render(scene,cam);return cv}
const clips=n=>CH[n]?Object.keys(CH[n].acts):[];const dur=(n,a)=>CH[n]&&CH[n].acts[a]?CH[n].acts[a].clip.duration:1;
return {init,frame,clips,dur,get loaded(){return loaded},get scene(){return scene},CH,PR}})();
