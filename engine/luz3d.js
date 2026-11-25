/* ---------- LUZ3D: estúdio de óptica realista em three.js r147 (v3.21, 2026-11-08) — exemplo projetos/luz-prisma/ ----------
   meta.json "luz3d": true (o build.py injeta three + este arquivo; usa PRISMA.trace do prisma.js e a textura do NEWTON).
   Vidro físico (MeshPhysicalMaterial: transmissão, espessura, IOR 1,52, verniz, atenuação ciano), prisma extrudado com chanfro,
   estúdio com reflexos (ambiente PMREM gerado de uma sala com softboxes), chão claro que some no escuro, sombras suaves,
   feixes de luz volumétricos (cilindros aditivos com miolo forte e halo) + bloom, manchas coloridas onde os feixes tocam o chão,
   disco de Newton 3D (textura do NEWTON com desfoque de movimento) sobre uma base cônica de metal polido que reflete o disco
   (CubeCamera atualizada a cada quadro).
   LUZ3D.init(W,H)                                   cria tudo (síncrono)
   LUZ3D.frame(st)                                   desenha e devolve o canvas. st = {
       cam:{pos,tgt,fov}, disc:{pos,ang,rps,white,face:[x,y,z] (normal), a}, prisms:[{pos,rot,R,depth,a}], beams:[{a,b,c,w,I}],
       spots:[{p,c,r,I}], bloom, exp, t }
   LUZ3D.beamsFromTrace(segs,{w,I,z})                converte os segmentos do PRISMA.trace em feixes 3D */
const LUZ3D=(()=>{
let R,cv,scene,cam,composer,bloom,W,H,ready=false;const G={};
const V3=a=>new THREE.Vector3(a[0],a[1],a[2]||0);
function studioEnv(){/* sala escura com 3 softboxes: é o que o vidro e o metal refletem */const sc=new THREE.Scene();
  sc.add(new THREE.Mesh(new THREE.BoxGeometry(40,24,40),new THREE.MeshBasicMaterial({color:0x07080b,side:THREE.BackSide})));
  const box=(w,h,p,r,c,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i),side:THREE.DoubleSide}));m.position.set(...p);m.rotation.set(...r);sc.add(m)};
  box(14,6,[0,11.5,0],[Math.PI/2,0,0],0xffffff,3);box(3,14,[-18,4,2],[0,Math.PI/2,0],0xcfe0ff,4.5);box(2.4,12,[18,3,-3],[0,-Math.PI/2,0],0xffe2c0,4);box(10,3,[0,3,-19],[0,0,0],0xffffff,1.6);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshBasicMaterial({color:0x6a6e76}));fl.rotation.x=-Math.PI/2;fl.position.y=-6;sc.add(fl);
  const pm=new THREE.PMREMGenerator(R);return pm.fromScene(sc,.03).texture}
function prismGeo(Rr,depth){const s3=Math.sqrt(3),sh=new THREE.Shape();sh.moveTo(0,Rr);sh.lineTo(-Rr*s3/2,-Rr/2);sh.lineTo(Rr*s3/2,-Rr/2);sh.closePath();
  const bv=Rr*.035,g=new THREE.ExtrudeGeometry(sh,{depth:2*depth-2*bv,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:4,curveSegments:1});g.translate(0,0,-(depth-bv));g.computeVertexNormals();return g}
function glassMat(){return new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.015,transmission:1,thickness:1.6,ior:1.52,clearcoat:1,clearcoatRoughness:.02,
  attenuationColor:new THREE.Color(0xc8f4ee),attenuationDistance:3.5,specularIntensity:1,envMapIntensity:1.6,transparent:false})}
/* feixe: cilindro com material aditivo — miolo intenso e borda suave (parece volume no ar) */
const BEAM_VS=`varying vec3 vN;varying vec3 vV;varying vec2 vU;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);vU=uv;gl_Position=projectionMatrix*mv;}`;
const BEAM_FS=`uniform vec3 uC;uniform float uI,uT,uSoft;varying vec3 vN;varying vec3 vV;varying vec2 vU;
float h(float x){return fract(sin(x*127.1)*43758.5453);}
void main(){float f=abs(dot(normalize(vN),normalize(vV)));float core=pow(f,uSoft);float dust=.8+.4*h(floor(vU.y*180.+uT*20.)+floor(vU.x*8.));
  float ends=smoothstep(0.,.02,vU.y)*smoothstep(1.,.98,vU.y);gl_FragColor=vec4(uC*uI*core*dust*ends,1.);}`;
function beamMesh(){const m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,20,1,true),new THREE.ShaderMaterial({uniforms:{uC:{value:new THREE.Color()},uI:{value:1},uT:{value:0},uSoft:{value:1.6}},vertexShader:BEAM_VS,fragmentShader:BEAM_FS,
  blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide}));m.frustumCulled=false;m.renderOrder=10;return m}
function placeBeam(m,a,b,w){const A=V3(a),B=V3(b),d=new THREE.Vector3().subVectors(B,A),L=d.length();if(L<1e-4){m.visible=false;return}m.visible=true;
  m.position.copy(A).addScaledVector(d,.5);m.scale.set(w,L,w);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())}
function spotTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}
/* base cônica do disco (perfil girado): prato embaixo, cone, haste fina, garfo */
function baseGeo(){const p=[[0,0],[1.05,0],[1.1,.03],[1.1,.09],[1.02,.12],[.32,.2],[.16,.42],[.075,.7],[.06,1.62],[.09,1.66],[.09,1.74],[0,1.74]].map(([x,y])=>new THREE.Vector2(x,y));return new THREE.LatheGeometry(p,96)}
function init(w,h){W=w;H=h;cv=document.createElement('canvas');cv.width=W;cv.height=H;
  R=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});R.setPixelRatio(1);R.setSize(W,H,false);
  R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.0;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.physicallyCorrectLights=true;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x050608);scene.fog=new THREE.FogExp2(0x050608,.035);G.env=studioEnv();scene.environment=G.env;
  cam=new THREE.PerspectiveCamera(38,W/H,.05,400);
  /* luzes: chave de cima (sombra macia), recortes frio e quente */
  const key=new THREE.SpotLight(0xffffff,160,60,.5,.85,2);key.position.set(-2,14,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.radius=6;key.shadow.bias=-.0004;scene.add(key,key.target);G.key=key;
  const r1=new THREE.DirectionalLight(0xbfd6ff,1.2);r1.position.set(-8,4,-6);scene.add(r1);const r2=new THREE.DirectionalLight(0xffe0c0,1.0);r2.position.set(8,3,-4);scene.add(r2);scene.add(new THREE.HemisphereLight(0x9aa6c0,0x101114,.08));
  /* chão claro de estúdio (some no escuro pela neblina) */
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:0x585e68,roughness:.32,metalness:0,envMapIntensity:.25}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;scene.add(fl);G.floor=fl;
  /* prismas */G.prisms=[0,1].map(()=>{const m=new THREE.Mesh(prismGeo(1.3,.75),glassMat());m.castShadow=true;m.receiveShadow=false;m.visible=false;scene.add(m);return m});
  /* feixes */G.beams=[];for(let i=0;i<64;i++){const core=beamMesh(),halo=beamMesh();halo.material.uniforms.uSoft.value=.6;core.visible=halo.visible=false;scene.add(core,halo);G.beams.push([core,halo])}
  G.spot=spotTex();G.spots=[];for(let i=0;i<16;i++){const s=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:G.spot,color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));s.rotation.x=-Math.PI/2;s.visible=false;scene.add(s);G.spots.push(s)}
  /* disco de Newton + base de metal com reflexo ao vivo */
  G.discTex=new THREE.CanvasTexture(document.createElement('canvas'));G.discTex.encoding=THREE.sRGBEncoding;
  const disc=new THREE.Group();const face=new THREE.Mesh(new THREE.CircleGeometry(1.25,128),new THREE.MeshStandardMaterial({map:G.discTex,roughness:.35,metalness:0,emissive:0xffffff,emissiveMap:G.discTex,emissiveIntensity:0}));face.position.z=.026;
  const back=new THREE.Mesh(new THREE.CircleGeometry(1.25,96),new THREE.MeshStandardMaterial({color:0x22252b,roughness:.4}));back.rotation.y=Math.PI;back.position.z=-.026;
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.26,.045,24,160),new THREE.MeshStandardMaterial({color:0xd9b25a,metalness:1,roughness:.18}));
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.14,48),new THREE.MeshStandardMaterial({color:0xdde2ea,metalness:1,roughness:.12}));hub.rotation.x=Math.PI/2;
  disc.add(face,back,rim,hub);G.discFace=face;G.disc=disc;
  G.cube=new THREE.WebGLCubeRenderTarget(256,{generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});G.cubeCam=new THREE.CubeCamera(.05,60,G.cube);
  const metal=new THREE.MeshStandardMaterial({color:0xe6e9ee,metalness:1,roughness:.08,envMap:G.cube.texture,envMapIntensity:1.2});
  const base=new THREE.Mesh(baseGeo(),metal);base.castShadow=true;base.receiveShadow=true;const stand=new THREE.Group();stand.add(base,disc,G.cubeCam);disc.position.y=1.74+1.25+.02;G.cubeCam.position.set(0,1.0,0);
  base.castShadow=true;disc.traverse(o=>{if(o.isMesh)o.castShadow=true});scene.add(stand);G.stand=stand;G.base=base;
  /* hastes dos prismas: a mesma base cônica de metal, esticada até a aresta de baixo do prisma */
  G.pstands=[0,1].map(()=>{const m=new THREE.Mesh(baseGeo(),new THREE.MeshStandardMaterial({color:0xe6e9ee,metalness:1,roughness:.1,envMapIntensity:1.3}));m.castShadow=true;m.visible=false;scene.add(m);return m});
  composer=new THREE.EffectComposer(R);composer.addPass(new THREE.RenderPass(scene,cam));bloom=new THREE.UnrealBloomPass(new THREE.Vector2(W,H),.6,.5,.9);composer.addPass(bloom);
  ready=true}
function beamsFromTrace(segs,o={}){const w=o.w||.06,z=o.z||0,out=[];segs.forEach(s=>{out.push({a:[s.a[0],s.a[1],z],b:[s.b[0],s.b[1],z],c:s.white?[1,1,1]:(()=>{const mx=Math.max(...s.c)||1;return s.c.map(v=>v/mx)})(),w:s.white?w:w*(s.inGlass?.55:.8),I:(s.white?1:.55)*(o.I||1)})});return out}
function frame(st){if(!ready)return null;const t=st.t||0;
  /* disco */const D=st.disc;G.stand.visible=!!D&&(D.a??1)>0;if(D){G.stand.position.set(...D.pos);G.stand.rotation.y=D.yaw||0;
    const T=NEWTON.texture(D.ang||0,2*Math.PI*(D.rps||0)*(1/50),D.white||0);G.discTex.image=T;G.discTex.needsUpdate=true;G.discFace.material.emissiveIntensity=(D.white||0)*1.4+.12;
    G.disc.rotation.z=0;G.stand.visible=false;G.cubeCam.update(R,scene);G.stand.visible=true}
  /* prismas */G.prisms.forEach((m,i)=>{const P=(st.prisms||[])[i];m.visible=!!P&&(P.a??1)>0;if(!P)return;m.position.set(P.pos[0],P.pos[1],P.pos[2]||0);m.rotation.set(0,0,P.rot||0);m.scale.setScalar(P.s||1)});
  G.pstands.forEach((m,i)=>{const P=(st.prisms||[])[i];m.visible=!!(P&&P.stand!=null&&(P.a??1)>0);if(!m.visible)return;m.position.set(P.pos[0],0,P.pos[2]||0);m.scale.set(.8,P.stand/1.74,.8)});
  /* feixes */const B=st.beams||[];G.beams.forEach(([c,h],i)=>{const b=B[i];if(!b){c.visible=h.visible=false;return}placeBeam(c,b.a,b.b,b.w);placeBeam(h,b.a,b.b,b.w*3.2);
    c.material.uniforms.uC.value.setRGB(...b.c);h.material.uniforms.uC.value.setRGB(...b.c);c.material.uniforms.uI.value=.55*(b.I??1);h.material.uniforms.uI.value=.035*(b.I??1);c.material.uniforms.uT.value=h.material.uniforms.uT.value=t});
  const S=st.spots||[];G.spots.forEach((m,i)=>{const s=S[i];m.visible=!!s;if(!s)return;m.position.set(s.p[0],(s.p[1]??0)+.003,s.p[2]||0);m.scale.set(s.r*(s.sx||1),s.r*(s.sy||1),1);m.rotation.z=s.rz||0;m.material.color.setRGB(...s.c.map(v=>v*(s.I??1)))});
  const C=st.cam;cam.fov=C.fov||38;cam.updateProjectionMatrix();cam.position.set(...C.pos);cam.lookAt(...C.tgt);
  bloom.strength=st.bloom??.9;R.toneMappingExposure=st.exp??1;composer.render();return cv}
function proj(p){const v=V3(p).project(cam);return {x:(v.x*.5+.5)*W,y:(.5-v.y*.5)*H,vis:v.z<1&&v.z>-1}}
return {init,frame,beamsFromTrace,proj,G}})();
