/* ---------- ROCKET: Saturno V e a missão Apollo em 3D de verdade (three.js r147 na GPU) ----------
   Exemplo: projetos/apollo-11/. meta.json "rocket3d": true (o build.py injeta kit/vendor/three-r147 e este arquivo) e "gl": true
   (render com --use-angle=d3d11). Unidades: metros; y = cima; o foguete de pé tem a base dos bocais em y = 0.
   O Saturno V é montado por código com as medidas reais (Saturn V Flight Manual SA-506): S-IC 42,1 m com 5 F-1, aletas e carenagens;
   S-II 24,8 m; S-IVB 17,9 m; IU 0,9 m; SLA 8,5 m (4 painéis que abrem); SM; cápsula Columbia 3,2 m; torre de escape 10,1 m (com a capa BPC).
   Cada peça é um grupo separável (ROCKET.PARTS). O módulo lunar é o modelo da NASA (kit/assets/nasa/Apollo_Lunar_Module.glb, domínio público).

   ROCKET.init(W,H,{scale:1})        cria o renderer WebGL (canvas próprio: ROCKET.canvas), cena, Saturno V, plataforma, céu, Terra, Lua, mar
   ROCKET.frame(stFn,T,{sub:3,shutter:.5,bloom:1})  desenha a média de `sub` subquadros (desfoque de movimento) e devolve o canvas.
       stFn(t) → estado da cena no instante t:
       {cam:{pos,tgt,fov,up?,shake?},           câmera (graus); shake = amplitude em metros do tremor (proporcional ao empuxo)
        stack:{p:[x,y,z],r:[rx,ry,rz]},         transformação do foguete inteiro (Euler XYZ em rad)
        parts:{nome:{p,r,vis}},                 peças soltas: posição/rotação no MUNDO (nome em ROCKET.PARTS); vis:false esconde
        flames:[{at,k,vac,len}],                chamas: at ∈ 'sic','sii','sivb','sps','les','retro_sic','ullage','lm','lmA' (subida),'rcs';
                                                  k = empuxo 0..1, vac = 0 (fina, no chão) .. 1 (larga e transparente no vácuo)
        env:{sky:0..1 (0 azul do chão → 1 preto), mast:[x,z] (poste em primeiro plano), envI (reflexo), clouds:[{y,a}], pad:bool, tower:bool, earth:{c:[x,y,z],r,rotY,a},
             moon:{c,r,a}, moonGround:bool, ocean:bool, stars:0..1, sun:[x,y,z] (direção), exp:1 (exposição)},
        smoke:[{seed,src(tb)->[x,y,z],v(tb)->[vx,vy,vz],t0,t1,rate,life,size,grow,col:[r,g,b],a,buoy,drag,spread,lit}],  fumaça analítica
        sparks:[{seed,p,t0,n,speed,life}],     faíscas (aditivas) a partir de p no instante t0
        rings:[{p,t0,r1,dur,a}],                anel de fumaça/condensação expandindo
        plasma:{p,dir,k,len,capOff},            reentrada: rastro laranja a partir de p (atrás da cápsula) e brasa no escudo a capOff m à frente
        chutes:{p,k,sway},                      três paraquedas laranja e branco (k = 0 fechados .. 1 abertos)
        lm:{p,r,vis,split?},                    módulo lunar (modelo da NASA) solto no mundo; split = só a base (estágio de descida)
        lmA:{p,r,vis},                          estágio de subida do LM separado (malhas acima de 3,05 m), mesma origem do LM
        t}
   ROCKET.PARTS = ['sic','sii','sivb','sla0','sla1','sla2','sla3','sm','cm','les','bpc']
   ROCKET.local(nome)               {p,r}: posição de cada peça no foguete de pé (para separar a partir do lugar certo)
   ROCKET.world(stack,nome)         posição no mundo de uma peça presa ao foguete (para a câmera seguir)
   ROCKET.proj(cam,p)               projeta um ponto 3D na tela {x,y,vis} com a câmera de um estado (rótulos 2D por cima)
   ROCKET.HEIGHTS                   alturas reais usadas no modelo (metros)
   Determinístico: fumaça, faíscas e nuvens saem de sementes; o estado depende só de t (o filme pode ser rebobinado). */
const ROCKET=(()=>{
const H3={sic:42.1,sii:24.8,sivb:17.9,iu:.9,sla:8.5,smVis:3.1,cm:3.2,les:10.1,total:110.6,r1:5.05,r3:3.3,rcm:1.95};
const Y={sic0:0,sic1:42.1,sii1:66.9,ivb0:72.3,ivb1:84.8,iu1:85.7,sla1:94.2,cm0:97.3,cm1:100.5,les1:110.6};
let THREE_=null,final,R,cv,scene,camera,composer,bloom,W,H,RW,RH,acc,accx,root={},G={},ready=null,loaded=false;
const TAU=Math.PI*2,cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),lp=(a,b,u)=>a+(b-a)*u;
function rng(seed){let s=(seed*2654435761)>>>0||1;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296)}
function hsh(i,s){let x=Math.sin(i*127.1+s*311.7)*43758.5453;return x-Math.floor(x)}

/* ---------- texturas por código (canvas) ---------- */
function ctex(w,h,draw,o={}){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
  const t=new THREE.CanvasTexture(c);t.encoding=o.lin?THREE.LinearEncoding:THREE.sRGBEncoding;t.anisotropy=8;if(o.wrap){t.wrapS=t.wrapT=THREE.RepeatWrapping}return t}
/* pintura do S-IC: branco com o padrão de rolagem preto, "UNITED STATES" vertical e a faixa preta no topo (u = volta, v = altura 0 em baixo) */
const WHITE='#dcdad4',BLACK='#151617';
function texSIC(){return ctex(2048,2048,(g,w,h)=>{g.fillStyle=WHITE;g.fillRect(0,0,w,h);const Vy=v=>h*(1-v);
  const quad=(v0,v1,odd)=>{for(let k=0;k<4;k++)if((k+odd)%2===0){g.fillStyle=BLACK;g.fillRect(w*k/4,Vy(v1),w/4,Vy(v0)-Vy(v1))}};
  quad(.0,.2,0);quad(.66,.79,1);g.fillStyle=BLACK;g.fillRect(0,Vy(1),w,Vy(.975)-Vy(1));
  /* emendas e anéis */
  g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=3;for(const v of [.2,.31,.45,.66,.79,.93]){g.beginPath();g.moveTo(0,Vy(v));g.lineTo(w,Vy(v));g.stroke()}
  g.fillStyle='rgba(0,0,0,.05)';for(let k=0;k<96;k++)g.fillRect(w*k/96,Vy(.66),2,Vy(.2)-Vy(.66));
  /* letras verticais vermelhas (o vermelho da bandeira; nada de rosa) */
  const word=(s,u,v0,dv,sz)=>{g.save();g.fillStyle='#b8241c';g.font=`700 ${sz}px "Hanken Grotesk",Arial`;g.textAlign='center';g.textBaseline='middle';
    [...s].forEach((ch,i)=>{if(ch!==' ')g.fillText(ch,w*u,Vy(v0-i*dv))});g.restore()};
  word('UNITED',.375,.6,.026,64);word('STATES',.375,.43,.026,64);word('USA',.125,.6,.05,120);
  /* bandeira pequena */
  const fx=w*.375-46,fy=Vy(.645);for(let i=0;i<7;i++){g.fillStyle=i%2?'#f2f0ea':'#b8241c';g.fillRect(fx,fy+i*8,92,8)}g.fillStyle='#22336b';g.fillRect(fx,fy,40,32)})}
function texSII(){return ctex(1024,1024,(g,w,h)=>{g.fillStyle=WHITE;g.fillRect(0,0,w,h);const Vy=v=>h*(1-v);
  g.fillStyle=BLACK;g.fillRect(0,Vy(1),w,Vy(.96)-Vy(1));
  g.strokeStyle='rgba(0,0,0,.2)';g.lineWidth=2;for(const v of [.225,.5,.75,.96]){g.beginPath();g.moveTo(0,Vy(v));g.lineTo(w,Vy(v));g.stroke()}
  g.fillStyle='rgba(0,0,0,.04)';for(let k=0;k<64;k++)g.fillRect(w*k/64,0,2,Vy(.225))})}
function texSIVB(){return ctex(1024,1024,(g,w,h)=>{g.fillStyle=WHITE;g.fillRect(0,0,w,h);const Vy=v=>h*(1-v);
  for(let k=0;k<4;k++)if(k%2===0){g.fillStyle=BLACK;g.fillRect(w*k/4,Vy(.36),w/4,Vy(0)-Vy(.36))}
  g.fillStyle=BLACK;g.fillRect(0,Vy(.42),w,Vy(.36)-Vy(.42));
  g.strokeStyle='rgba(0,0,0,.2)';g.lineWidth=2;for(const v of [.42,.7,.95]){g.beginPath();g.moveTo(0,Vy(v));g.lineTo(w,Vy(v));g.stroke()}})}
function texNoise(seed,w,h,o={}){return ctex(w,h,(g)=>{const im=g.createImageData(w,h),r=rng(seed);
  const oct=[];for(let k=0;k<5;k++){const n=4<<k,a=[];for(let i=0;i<n*n;i++)a.push(r());oct.push([n,a])}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,amp=.5;for(const [n,a] of oct){const fx=x/w*n,fy=y/h*n,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,
    q=(i,j)=>a[((iy+j)%n)*n+((ix+i)%n)],sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);s+=amp*lp(lp(q(0,0),q(1,0),sx),lp(q(0,1),q(1,1),sx),sy);amp*=.5}
    const k=(y*w+x)*4,v=o.map?o.map(s,x/w,y/h):[s*255,s*255,s*255,255];im.data[k]=v[0];im.data[k+1]=v[1];im.data[k+2]=v[2];im.data[k+3]=v[3]}
  g.putImageData(im,0,0)},{wrap:true,lin:o.lin})}

/* ---------- geometria do Saturno V ---------- */
function lathe(pts,seg=96,o={}){const g=new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg,o.phi0||0,o.phi||TAU);return g}
function cyl(r0,r1,y0,y1,seg=96){return lathe([[r0,y0],[r1,y1]],seg)}
const MAT={};
function mats(){
  const std=(o)=>new THREE.MeshStandardMaterial(Object.assign({roughness:.55,metalness:.05},o));
  MAT.sic=std({map:texSIC(),roughness:.5});MAT.sii=std({map:texSII(),roughness:.5});MAT.sivb=std({map:texSIVB(),roughness:.5});
  MAT.white=std({color:0xd8d6d0,roughness:.5});MAT.black=std({color:0x18191b,roughness:.6});MAT.grey=std({color:0x8b8f93,roughness:.45,metalness:.4});
  MAT.metal=std({color:0xcfd3d6,roughness:.22,metalness:.95});MAT.nozzle=std({color:0x2a2724,roughness:.35,metalness:.8});
  MAT.cm=std({color:0xd9dde0,roughness:.18,metalness:1});MAT.sm=std({color:0xcfd2d4,roughness:.32,metalness:.85});
  MAT.shield=std({color:0x5a4130,roughness:.8,metalness:.1});MAT.red=std({color:0xa8321f,roughness:.6});
  MAT.tower=std({color:0x7a1c12,roughness:.7,metalness:.2});MAT.concrete=std({color:0x9d9a92,roughness:.95});MAT.ml=std({color:0x4f5257,roughness:.8,metalness:.3});
}
function mesh(g,m,cast=true){const x=new THREE.Mesh(g,m);x.castShadow=cast;x.receiveShadow=true;return x}
const ENG=[[0,0],[3.86,Math.PI/4],[3.86,3*Math.PI/4],[3.86,5*Math.PI/4],[3.86,7*Math.PI/4]];  /* F-1: centro + 4 nas diagonais */
function nozzle(rExit,rThroat,len,y0){const p=[];for(let i=0;i<=16;i++){const u=i/16;p.push([lp(rExit,rThroat,Math.pow(u,.6)),y0+u*len])}
  const g=lathe(p,48);const m=mesh(g,MAT.nozzle);m.material=MAT.nozzle.clone();m.material.side=THREE.DoubleSide;return m}
function buildSIC(){const g=new THREE.Group();g.name='sic';
  const tank=mesh(cyl(H3.r1,H3.r1,5.6,Y.sic1),MAT.sic);g.add(tank);
  g.add(mesh(lathe([[0,5.6],[H3.r1,5.6]],64),MAT.black));g.add(mesh(lathe([[H3.r1,Y.sic1-.02],[0,Y.sic1-.02]],64),MAT.grey));  /* domo do topo */
  /* 5 F-1 (bocal de 3,76 m) com a turbobomba escura em cima */
  for(const [r,a] of ENG){const e=nozzle(1.88,.6,5.4,.0);e.position.set(r*Math.cos(a),0,r*Math.sin(a));g.add(e);
    const tp=mesh(cyl(.75,.75,5.2,6.2,24),MAT.nozzle);tp.position.copy(e.position);g.add(tp)}
  /* carenagens cônicas sobre os 4 motores externos e as aletas */
  for(let k=1;k<5;k++){const a=ENG[k][1],c=Math.cos(a),s=Math.sin(a);
    const f=mesh(lathe([[2.1,4.6],[2.15,6],[1.6,9.5],[.05,13.2]],32),MAT.black);f.position.set(4.05*c,0,4.05*s);g.add(f);
    const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(3.4,0);sh.lineTo(3.4,1.6);sh.lineTo(0,6.6);sh.lineTo(0,0);
    const fin=mesh(new THREE.ExtrudeGeometry(sh,{depth:.25,bevelEnabled:false}),MAT.white);fin.geometry.translate(0,0,-.125);
    fin.position.set(5.6*c,4.2,5.6*s);fin.rotation.y=-a;g.add(fin)}
  /* retrofoguetes (8) no topo das carenagens: posições para as chamas */
  g.userData.retro=[];for(let k=1;k<5;k++){const a=ENG[k][1];for(const d of [-.25,.25])g.userData.retro.push([5.25*Math.cos(a+d),11.2,5.25*Math.sin(a+d)])}
  return g}
function buildSII(){const g=new THREE.Group();g.name='sii';
  g.add(mesh(cyl(H3.r1,H3.r1,Y.sic1,Y.sii1),MAT.sii));
  g.add(mesh(lathe([[0,Y.sic1+5.4],[H3.r1-.05,Y.sic1+5.4]],64),MAT.black));g.add(mesh(lathe([[H3.r1,Y.sii1-.02],[0,Y.sii1-.02]],64),MAT.grey));
  /* 5 J-2 (bocal 2 m) escondidos no interestágio */
  g.userData.eng=[];for(const [r,a] of ENG){const x=r*.62*Math.cos(a),z=r*.62*Math.sin(a);const e=nozzle(1.0,.35,3.1,Y.sic1+2.3);e.position.set(x,0,z);g.add(e);g.userData.eng.push([x,Y.sic1+2.3,z])}
  return g}
function buildSIVB(){const g=new THREE.Group();g.name='sivb';
  g.add(mesh(lathe([[H3.r1,Y.sii1],[H3.r3,Y.ivb0]],96),MAT.sivb));   /* interestágio cônico */
  const b=mesh(cyl(H3.r3,H3.r3,Y.ivb0,Y.ivb1),MAT.sivb);b.geometry.translate(0,0,0);g.add(b);
  g.add(mesh(cyl(H3.r3,H3.r3,Y.ivb1,Y.iu1),MAT.grey));               /* IU */
  g.add(mesh(lathe([[H3.r3,Y.iu1-.02],[0,Y.iu1-.02]],48),MAT.grey));g.add(mesh(lathe([[0,Y.ivb0+.2],[H3.r3,Y.ivb0+.2]],48),MAT.black));
  const e=nozzle(1.0,.35,2.9,Y.ivb0-2.4);g.add(e);g.userData.eng=[[0,Y.ivb0-2.4,0]];
  /* motores de ullage (2 carenagens pretas) */
  for(const a of [0,Math.PI]){const u=mesh(cyl(.35,.35,Y.ivb0+.3,Y.ivb0+2.6,16),MAT.black);u.position.set((H3.r3+.2)*Math.cos(a),0,(H3.r3+.2)*Math.sin(a));g.add(u)}
  return g}
function buildSLA(i){const g=new THREE.Group();g.name='sla'+i;const piv=new THREE.Group();g.add(piv);
  const m=mesh(lathe([[H3.r3,0],[H3.rcm,Y.sla1-Y.iu1]],32,{phi0:i*TAU/4+.004,phi:TAU/4-.008}),MAT.white);m.material=MAT.white.clone();m.material.side=THREE.DoubleSide;
  piv.add(m);g.position.y=Y.iu1;return g}
function buildSM(){const g=new THREE.Group();g.name='sm';
  g.add(mesh(cyl(H3.rcm,H3.rcm,Y.cm0-3.9,Y.cm0-.05),MAT.sm));g.add(mesh(lathe([[0,Y.cm0-3.9],[H3.rcm,Y.cm0-3.9]],48),MAT.grey));g.add(mesh(lathe([[H3.rcm,Y.cm0-.06],[0,Y.cm0-.06]],48),MAT.grey));
  for(let k=0;k<24;k++){const a=k*TAU/24;const s=mesh(new THREE.BoxGeometry(.04,3.6,.05),MAT.grey);s.position.set((H3.rcm+.01)*Math.cos(a),Y.cm0-2,(H3.rcm+.01)*Math.sin(a));s.rotation.y=-a;g.add(s)}
  const e=nozzle(1.25,.3,2.8,Y.cm0-6.7);g.add(e);g.userData.eng=[[0,Y.cm0-6.7,0]];
  /* quads de RCS (4) e antena de alto ganho */
  for(let k=0;k<4;k++){const a=k*TAU/4+Math.PI/4,q=mesh(new THREE.BoxGeometry(.35,.6,.35),MAT.grey);q.position.set((H3.rcm+.15)*Math.cos(a),Y.cm0-1.4,(H3.rcm+.15)*Math.sin(a));g.add(q)}
  const ant=new THREE.Group();ant.position.set(0,Y.cm0-3.7,-H3.rcm-.2);for(let k=0;k<4;k++){const d=mesh(new THREE.CylinderGeometry(.35,.35,.08,24),MAT.white);d.rotation.x=Math.PI/2;d.position.set((k%2-.5)*.75,-.9-Math.floor(k/2)*.75,-.6);ant.add(d)}g.add(ant);
  return g}
function buildCM(){const g=new THREE.Group();g.name='cm';
  g.add(mesh(lathe([[0,Y.cm0-.25],[1.6,Y.cm0-.18],[H3.rcm,Y.cm0],[H3.rcm-.05,Y.cm0+.12],[.45,Y.cm1-.25],[.42,Y.cm1]],96),MAT.cm));
  g.add(mesh(lathe([[0,Y.cm0-.27],[1.62,Y.cm0-.2],[H3.rcm+.02,Y.cm0-.01]],64),MAT.shield));
  g.add(mesh(cyl(.42,.3,Y.cm1,Y.cm1+.35,32),MAT.grey));
  return g}
function trussInst(w0,w1,y0,y1,levels,r,mat){const N=levels*4*3+8,ins=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat,N);let k=0;const M=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
  const corner=(y,i)=>{const w=lp(w0,w1,(y-y0)/(y1-y0))/2,a=[[w,w],[-w,w],[-w,-w],[w,-w]][i%4];return new THREE.Vector3(a[0],y,a[1])};
  const bar=(A,B)=>{const d=B.clone().sub(A),L=d.length();q.setFromUnitVectors(up,d.clone().normalize());M.compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(r,L,r));ins.setMatrixAt(k++,M)};
  for(let i=0;i<4;i++)bar(corner(y0,i),corner(y1,i));
  for(let l=0;l<levels;l++){const ya=lp(y0,y1,l/levels),yb=lp(y0,y1,(l+1)/levels);for(let i=0;i<4;i++){bar(corner(yb,i),corner(yb,i+1));bar(corner(ya,i),corner(yb,i+1));bar(corner(ya,i+1),corner(yb,i))}}
  ins.count=k;ins.castShadow=true;ins.receiveShadow=true;return ins}
function buildLES(){const g=new THREE.Group();g.name='les';
  g.add(trussInst(1.5,.75,Y.cm1+.1,Y.cm1+4,4,.07,MAT.tower));
  g.add(mesh(cyl(.33,.33,Y.cm1+4,Y.les1-1.6,32),MAT.white));
  g.add(mesh(lathe([[.33,Y.les1-1.6],[.25,Y.les1-.6],[.1,Y.les1-.15],[.0,Y.les1]],32),MAT.black));
  /* 4 bocais do motor de escape, inclinados */
  g.userData.noz=[];for(let k=0;k<4;k++){const a=k*TAU/4,n=mesh(cyl(.16,.1,0,.35,16),MAT.nozzle);n.position.set(.36*Math.cos(a),Y.cm1+4.1,.36*Math.sin(a));n.rotation.set(Math.sin(a)*-.6,0,Math.cos(a)*.6);g.add(n);g.userData.noz.push([.5*Math.cos(a),Y.cm1+4.0,.5*Math.sin(a),a])}
  return g}
function buildBPC(){const g=new THREE.Group();g.name='bpc';
  g.add(mesh(lathe([[H3.rcm+.05,Y.cm0-.02],[H3.rcm,Y.cm0+.15],[.5,Y.cm1-.15],[.45,Y.cm1+.1]],64),MAT.white));return g}
function buildSaturn(){const st=new THREE.Group();const parts={sic:buildSIC(),sii:buildSII(),sivb:buildSIVB(),sm:buildSM(),cm:buildCM(),les:buildLES(),bpc:buildBPC()};
  for(let i=0;i<4;i++)parts['sla'+i]=buildSLA(i);
  for(const k in parts){st.add(parts[k]);parts[k].userData.home={p:parts[k].position.clone(),q:parts[k].quaternion.clone()}}
  return {st,parts}}

/* ---------- plataforma 39A: lançador móvel e torre umbilical vermelha ---------- */
function buildPad(){const g=new THREE.Group();
  const ground=mesh(new THREE.CircleGeometry(4000,64),new THREE.MeshStandardMaterial({color:0x6f6b58,roughness:1}),false);ground.rotation.x=-Math.PI/2;ground.position.y=-7.7;g.add(ground);G.ground=ground;
  const ml=mesh(new THREE.BoxGeometry(49,7.6,41),MAT.ml);ml.position.set(0,-3.9,0);g.add(ml);
  const deck=mesh(new THREE.BoxGeometry(14,.4,14),MAT.black);deck.position.set(0,-.05,0);g.add(deck);
  /* 4 braços de apoio (hold-down) */
  for(let k=0;k<4;k++){const a=k*TAU/4+Math.PI/4,b=mesh(new THREE.BoxGeometry(1.4,3,1.4),MAT.grey);b.position.set(6.4*Math.cos(a),1.2,6.4*Math.sin(a));g.add(b)}
  /* torre umbilical (LUT): 12 m × 12 m, 116 m acima do convés, com o guindaste no topo e os braços de acesso */
  const T=new THREE.Group();T.position.set(19,0,0);T.add(trussInst(12,12,0,116,38,.32,MAT.tower));
  const cr=mesh(new THREE.BoxGeometry(26,2.2,2.2),MAT.tower);cr.position.set(-2,118,0);T.add(cr);
  const arms=[[18,0],[48,0],[58,1],[66,0],[72,1],[80,0],[86,0],[92,1],[98,0]];
  for(const [y,k] of arms){const L=19-(y>66?H3.r3:H3.r1)-6.2,a=mesh(new THREE.BoxGeometry(L,2.4,2.6),MAT.grey);a.position.set(-6-L/2,y,0);T.add(a)}
  g.add(T);G.tower=T;
  /* poste de madeira em primeiro plano (o do filme de 70 mm), posto pelo estado: env.mast = [x,z] */
  const mast=mesh(cyl(.42,.32,-8,150,16),new THREE.MeshStandardMaterial({color:0x3b2a1e,roughness:.9}));G.mast=mast;g.add(mast);
  /* areia e mar ao fundo */
  const sea=mesh(new THREE.PlaneGeometry(40000,40000),new THREE.MeshStandardMaterial({color:0x2d5c74,roughness:.25,metalness:.2}),false);sea.rotation.x=-Math.PI/2;sea.position.set(0,-8,-21000);g.add(sea);
  return g}

/* ---------- chama: cones aditivos em HDR (núcleo branco, envelope laranja), largura conforme o vácuo ---------- */
/* Chama física: F-1 queima RP-1 + LOX, chama amarelo-alaranjada com fuligem. Logo na saída de cada sino
   há uma camada escura (gás da turbina injetado na extensão do bocal): a chama começa com borda escura e acende alguns metros abaixo.
   Os 5 jatos são distintos perto dos sinos e se fundem numa coluna única, com fumaça escura nas bordas e turbulência. No vácuo a pluma
   se abre muito (subexpandida), fica larga, translúcida e mais laranja, e a fuligem some. J-2 (hidrogênio): quase invisível, azul-pálida,
   diamantes de choque sutis. Motor sólido (torre de escape, retrofoguetes): chama clara.
   Uma casca = cilindro deformado no vértice (perfil no ar × perfil no vácuo) com ruído 3D que escorre para baixo (turbulência). */
const FLAME_VS=`#include <common>
#include <logdepthbuf_pars_vertex>
uniform float vac,wide,flare,neck;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying float vS;
void main(){vUv=uv;float s=clamp(-position.y,0.,1.);vS=s;
  float fa=(1.+flare*s)*(1.-smoothstep(.55,1.,s)*.85)*mix(1.,1.-.25*smoothstep(0.,.25,s)*(1.-smoothstep(.25,.6,s)),neck);
  float fv=1.+wide*pow(s,.5)*(1.-smoothstep(.8,1.,s)*.3);
  float f=mix(fa,fv,vac);vec3 p=vec3(position.x*f,position.y,position.z*f);
  vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;
#include <logdepthbuf_vertex>
}`;
const FLAME_FS=`#include <logdepthbuf_pars_fragment>
uniform float T,k,vac,seed,mode,collar,flow,Lm,dia,gain,soot,occ;uniform vec3 c0,c1,cHot;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying float vS;
float h3(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.07+vec3(3.1,1.7,5.3);a*=.5;}return s;}
void main(){
#include <logdepthbuf_fragment>
  float s=vS,rim=abs(dot(normalize(vN),normalize(vV)));float an=vUv.x*6.2832;
  vec3 q=vec3(cos(an)*1.6,sin(an)*1.6,s*Lm*.09-T*flow)+seed;float n=fbm(q),n2=fbm(q*2.3+7.);
  float tail=1.-smoothstep(.45,1.,s+(n-.5)*.35);
  if(mode<.5){ /* emissão (aditiva) */
    float ign=smoothstep(collar,collar+.05+.06*n,s);
    float body=pow(rim,mix(1.3,.55,vac));
    float turb=mix(.45+1.1*n*n2*2.,.7+.5*n,vac);
    float sd=1.+dia*(1.-vac)*pow(max(0.,cos(s*Lm*.55)),8.)*(1.-smoothstep(.1,.5,s));
    float I=body*ign*tail*turb*sd*k*gain*mix(1.,.12,vac)*mix(1.,.55+.45*smoothstep(.35,0.,s),vac);
    vec3 col=mix(c0,c1,smoothstep(0.,.8,s));col=mix(col,cHot,pow(rim,5.)*(1.-s)*(1.-vac*.7));
    gl_FragColor=vec4(col*I,clamp(I*occ*mix(1.,.2,vac),0.,1.));  /* pré-multiplicado: a chama também cobre o fundo (cor fiel sobre céu claro) */
  } else if(mode<1.5){ /* fuligem nas bordas da coluna (mistura normal) */
    float edge=pow(1.-rim,.8);float a=edge*smoothstep(.05,.3,s)*tail*smoothstep(.35,.75,n2+n*.3)*soot*k*(1.-vac);
    gl_FragColor=vec4(vec3(.11,.07,.04)*(.6+.6*n),clamp(a,0.,.9));
  } else { /* colar escuro logo abaixo do sino */
    float a=(1.-smoothstep(collar*.75,collar+.03+.05*n,s))*k*(1.-vac*.85)*(.85+.15*n)*pow(rim,.3);
    vec3 col=mix(vec3(.05,.035,.03),vec3(.9,.35,.06)*2.,smoothstep(collar*.5,collar+.04,s)*n);
    gl_FragColor=vec4(col,clamp(a,0.,.95));
  }}`;
function flameMat(o){const U={T:{value:0},k:{value:1},vac:{value:0},seed:{value:o.seed||0},mode:{value:o.mode||0},collar:{value:o.collar||0},flow:{value:o.flow||5},Lm:{value:50},
  occ:{value:o.occ??.85},dia:{value:o.dia||0},gain:{value:o.gain||1},soot:{value:o.soot||0},wide:{value:6},flare:{value:o.flare??.4},neck:{value:o.neck||0},
  c0:{value:new THREE.Color(...o.c0)},c1:{value:new THREE.Color(...o.c1)},cHot:{value:new THREE.Color(...(o.cHot||o.c0))}};
  return new THREE.ShaderMaterial({uniforms:U,vertexShader:FLAME_VS,fragmentShader:FLAME_FS,transparent:true,depthWrite:false,
    blending:(o.mode||0)>.5?THREE.NormalBlending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,blendSrcAlpha:THREE.OneFactor,blendDstAlpha:THREE.OneMinusSrcAlphaFactor,side:THREE.DoubleSide})}
/* tipos de pluma: cada casca {r (raio rel.), L (comprimento rel.), m (material)} */
const PL_TYPES={
  f1:[{r:1.02,L:.13,m:{mode:2,collar:.55,c0:[0,0,0],c1:[0,0,0],flare:.25}},                                     /* colar escuro (gás da turbina) */
      {r:1.0,L:.16,m:{collar:.33,c0:[2.3,1.2,.3],c1:[1.5,.55,.09],cHot:[3.4,2.4,1.0],flare:.35,flow:7,gain:1.1}}],   /* jato de cada motor */
  col:[{r:1.0,L:1,m:{collar:.035,c0:[2.6,1.45,.38],c1:[1.0,.32,.045],cHot:[4.6,3.4,1.5],flare:.18,flow:9,dia:.35,gain:1.25}},
       {r:1.12,L:.95,m:{collar:.05,c0:[.7,.26,.05],c1:[.3,.08,.01],flare:.25,flow:7,gain:.8}},
       {r:1.2,L:.9,m:{mode:1,c0:[0,0,0],c1:[0,0,0],flare:.3,flow:6,soot:1.1}}],
  j2:[{r:.95,L:1,m:{collar:0,c0:[.55,.75,1.5],c1:[.25,.35,.8],cHot:[1.2,1.4,2.2],flare:.1,flow:6,dia:2.5,gain:.26,neck:1,occ:.05}},
      {r:1.25,L:.7,m:{collar:0,c0:[.25,.32,.6],c1:[.12,.14,.3],flare:.25,flow:5,gain:.14,occ:.03}}],
  hyp:[{r:.95,L:1,m:{collar:0,c0:[1.0,.75,.55],c1:[.45,.3,.25],cHot:[1.8,1.5,1.2],flare:.1,flow:6,dia:1.2,gain:.45}},   /* SPS e LM (hipergólico): quase invisível */
       {r:1.25,L:.7,m:{collar:0,c0:[.35,.28,.24],c1:[.15,.12,.1],flare:.25,flow:5,gain:.3}}],
  solid:[{r:.9,L:1,m:{collar:0,c0:[7,6,4.2],c1:[3.2,1.6,.5],cHot:[9,8.5,7],flare:.5,flow:9,gain:1.2}},
         {r:1.4,L:.75,m:{collar:0,c0:[2.4,1.4,.5],c1:[.8,.3,.06],flare:.6,flow:7,gain:.8}}]};
function plume(rn,type='f1'){const g=new THREE.Group();g.userData.type=type;
  const geo=new THREE.CylinderGeometry(1,1,1,48,48,true);geo.translate(0,-.5,0);
  PL_TYPES[type].forEach((sh,i)=>{const m=new THREE.Mesh(geo,flameMat(Object.assign({seed:rn*13.7+i*3.1},sh.m)));m.userData={r:sh.r,L:sh.L};m.frustumCulled=false;
    m.renderOrder=sh.m.mode===1?13:sh.m.mode===2?9:10;g.add(m)});
  return g}
function setPlume(p,k,vac,len,r0,t,wide){p.visible=k>.01;if(!p.visible)return;
  p.children.forEach((m)=>{const {r,L}=m.userData,Lx=len*L*lp(1,.8,vac);m.scale.set(r0*r,Lx,r0*r);const U=m.material.uniforms;
    U.T.value=t;U.k.value=k;U.vac.value=vac;U.wide.value=wide??6;U.Lm.value=Lx})}

/* ---------- partículas (fumaça, faíscas) em Points com shader ---------- */
const PT_VS=`#include <common>
#include <logdepthbuf_pars_vertex>
attribute float size;attribute vec4 col;attribute float rot;varying vec4 vCol;varying float vRot;uniform float scaleH;
void main(){vCol=col;vRot=rot;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=min(2048.,size*scaleH/max(.1,-mv.z));gl_Position=projectionMatrix*mv;
#include <logdepthbuf_vertex>
}`;
const PT_FS=`#include <logdepthbuf_pars_fragment>
uniform sampler2D map;uniform float soft;varying vec4 vCol;varying float vRot;
void main(){
#include <logdepthbuf_fragment>
  vec2 p=gl_PointCoord-.5;float c=cos(vRot),s=sin(vRot);p=mat2(c,-s,s,c)*p;float d=length(p)*2.;if(d>1.)discard;
  float n=texture2D(map,p*.9+.5+vec2(vRot*.13,vRot*.07)).r;float a=smoothstep(1.,soft,d)*(.35+.9*n);
  float sh=clamp(.82-p.y*.55+(n-.5)*.4,.45,1.15);  /* lado de cima mais claro, base mais escura (volume) */
  gl_FragColor=vec4(vCol.rgb*(.7+.45*n)*mix(1.,sh,soft>0.?1.:0.),vCol.a*a);}`;
function points(N,additive,map){const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));g.setAttribute('size',new THREE.BufferAttribute(new Float32Array(N),1));
  g.setAttribute('col',new THREE.BufferAttribute(new Float32Array(N*4),4));g.setAttribute('rot',new THREE.BufferAttribute(new Float32Array(N),1));
  const m=new THREE.ShaderMaterial({uniforms:{map:{value:map},scaleH:{value:1000},soft:{value:additive?.0:.35}},vertexShader:PT_VS,fragmentShader:PT_FS,transparent:true,depthWrite:false,
    blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});
  const p=new THREE.Points(g,m);p.frustumCulled=false;p.renderOrder=additive?12:11;p.userData.N=N;return p}

/* ---------- céu (gradiente por altitude, sem rosa), estrelas, nuvens ---------- */
const SKY_FS=`#include <logdepthbuf_pars_fragment>
uniform float alt,exp_;uniform vec3 sun;varying vec3 vD;
void main(){
#include <logdepthbuf_fragment>
  vec3 d=normalize(vD);float e=clamp(d.y,-1.,1.);
  vec3 zen0=vec3(.16,.38,.78),hor0=vec3(.62,.78,.92);
  vec3 zen1=vec3(.045,.06,.2),hor1=vec3(.2,.32,.6);   /* violeta escuro (azul-índigo), sem magenta */
  vec3 zen=mix(mix(zen0,zen1,smoothstep(0.,.55,alt)),vec3(0.),smoothstep(.45,1.,alt));
  vec3 hor=mix(mix(hor0,hor1,smoothstep(0.,.6,alt)),vec3(.02,.05,.14),smoothstep(.55,1.,alt));
  vec3 c=mix(hor,zen,pow(clamp(e,0.,1.),mix(.45,.25,alt)));
  c=mix(c,mix(hor*.85,vec3(.02,.04,.1),smoothstep(.5,1.,alt)),smoothstep(.02,-.25,e));
  float sd=max(0.,dot(d,normalize(sun)));c+=vec3(1.,.9,.7)*(pow(sd,600.)*30.+pow(sd,40.)*.35*(1.-alt*.6));
  gl_FragColor=vec4(c*exp_,1.);}`;
const SKY_VS=`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vD;void main(){vD=position;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
#include <logdepthbuf_vertex>
}`;
function buildSky(){const m=new THREE.ShaderMaterial({uniforms:{alt:{value:0},exp_:{value:1},sun:{value:new THREE.Vector3(1,.3,.4)}},vertexShader:SKY_VS,fragmentShader:SKY_FS,side:THREE.BackSide,depthWrite:false});
  const s=new THREE.Mesh(new THREE.SphereGeometry(1,48,24),m);s.renderOrder=-10;s.frustumCulled=false;return s}
function buildStars(){const N=5000,r=rng(77),pos=new Float32Array(N*3),col=new Float32Array(N*3);
  for(let i=0;i<N;i++){const u=r()*2-1,a=r()*TAU,s=Math.sqrt(1-u*u);pos.set([s*Math.cos(a),u,s*Math.sin(a)],i*3);const b=Math.pow(r(),5)*1.6+.08,c=r();col.set(c<.2?[b*.75,b*.85,b]:c<.85?[b,b*.97,b*.92]:[b,b*.82,b*.6],i*3)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.PointsMaterial({size:2.2,sizeAttenuation:false,vertexColors:true,transparent:true,depthWrite:false});const p=new THREE.Points(g,m);p.frustumCulled=false;p.renderOrder=-9;return p}
function buildClouds(tex){const g=new THREE.Group(),r=rng(31);
  for(let i=0;i<70;i++){const m=new THREE.SpriteMaterial({map:tex,color:0xffffff,transparent:true,depthWrite:false,opacity:.0});const s=new THREE.Sprite(m);
    s.userData={x:(r()-.5)*9000,z:(r()-.5)*9000,y:r(),w:600+r()*1400,rot:r()*TAU};s.material.rotation=s.userData.rot;g.add(s)}
  return g}

/* ---------- Terra e Lua com texturas NASA (kit/geo via meta "geo": true) ---------- */
const IMG={};
function loadImgs(){const A=typeof __ASSETS__!=='undefined'?__ASSETS__:{};const keys=['geo:terra.jpg','geo:nuvens.jpg','geo:lua.jpg','geo:noite.jpg'];
  return Promise.all(keys.filter(k=>A[k]).map(k=>new Promise(res=>{const im=new Image();im.onload=()=>{IMG[k]=im;res()};im.onerror=res;im.src=A[k]})))}
function imgTex(k){const im=IMG[k];if(!im)return null;const t=new THREE.Texture(im);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;t.needsUpdate=true;return t}
const EARTH_FS=`#include <logdepthbuf_pars_fragment>
uniform sampler2D day,cloud;uniform vec3 sun;uniform float a;uniform float hasC;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
void main(){
#include <logdepthbuf_fragment>
  vec3 n=normalize(vN);float l=dot(n,normalize(sun));vec3 c=texture2D(day,vUv).rgb;c=pow(c,vec3(2.2));
  float cl=hasC>0.?texture2D(cloud,vUv).r*hasC:0.;c=mix(c,vec3(1.),cl*.85);
  float dl=smoothstep(-.1,.25,l);vec3 col=c*dl*1.6;
  float rim=pow(1.-max(0.,dot(n,normalize(vV))),3.);col+=vec3(.25,.5,1.)*rim*smoothstep(-.3,.4,l)*1.4;
  gl_FragColor=vec4(col,a);}`;
const STD_VS=`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 wp=modelMatrix*vec4(position,1.);vV=cameraPosition-wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;
#include <logdepthbuf_vertex>
}`;
function buildEarth(){const day=imgTex('geo:terra.jpg'),cld=imgTex('geo:nuvens.jpg');
  const m=new THREE.ShaderMaterial({uniforms:{day:{value:day},cloud:{value:cld},hasC:{value:cld?1:0},sun:{value:new THREE.Vector3(1,.2,.3)},a:{value:1}},vertexShader:STD_VS,fragmentShader:EARTH_FS,transparent:true});
  const e=new THREE.Mesh(new THREE.SphereGeometry(1,128,64),m);
  const atm=new THREE.Mesh(new THREE.SphereGeometry(1.025,96,48),new THREE.ShaderMaterial({uniforms:{sun:{value:new THREE.Vector3(1,.2,.3)},a:{value:1}},vertexShader:STD_VS,
    fragmentShader:`#include <logdepthbuf_pars_fragment>
uniform vec3 sun;uniform float a;varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){
#include <logdepthbuf_fragment>
vec3 n=normalize(vN);float r=1.-abs(dot(n,normalize(vV)));float g=pow(r,2.5)*smoothstep(-.35,.3,dot(n,normalize(sun)));gl_FragColor=vec4(vec3(.3,.58,1.)*g*1.8*a,g*a);}`,
    side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  const g=new THREE.Group();g.add(e);g.add(atm);g.userData={e,atm};return g}
function buildMoon(){const t=imgTex('geo:lua.jpg');const m=new THREE.MeshStandardMaterial({map:t,color:t?0xffffff:0x9a9a96,roughness:1,metalness:0});return mesh(new THREE.SphereGeometry(1,128,64),m,false)}
/* chão lunar para o pouso: relevo com crateras (determinístico) e textura de regolito */
function buildMoonGround(){const S=2400,N=200,g=new THREE.PlaneGeometry(S,S,N,N);g.rotateX(-Math.PI/2);const p=g.attributes.position,r=rng(5),cr=[];
  for(let i=0;i<160;i++)cr.push([(r()-.5)*S,(r()-.5)*S,Math.pow(r(),3)*90+4]);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);let y=0;for(const [cx,cz,R] of cr){const d=Math.hypot(x-cx,z-cz)/R;if(d<1.6)y+=d<1?-R*.22*(1-d*d)+R*.08*d*d*d*d:R*.08*Math.exp(-(d-1)*6)}
    y+=Math.sin(x*.013)*Math.cos(z*.011)*3;p.setY(i,y)}
  g.computeVertexNormals();
  const tex=texNoise(9,256,256,{map:(s)=>{const v=90+s*90;return [v,v*.98,v*.95,255]}});tex.repeat.set(30,30);
  const m=new THREE.MeshStandardMaterial({map:tex,color:0xbdbab4,roughness:1});const ms=mesh(g,m,false);ms.receiveShadow=true;return ms}
/* mar do resgate: ondas por shader */
function buildOcean(){const m=new THREE.ShaderMaterial({uniforms:{T:{value:0},sun:{value:new THREE.Vector3(.3,.6,.4)}},vertexShader:STD_VS,
  fragmentShader:`#include <logdepthbuf_pars_fragment>
uniform float T;uniform vec3 sun;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
float h(vec2 p){return sin(p.x*.9+T*1.3)*.5+sin(p.y*1.3-T*1.1+p.x*.4)*.4+sin((p.x+p.y)*2.7+T*2.)*.15;}
void main(){
#include <logdepthbuf_fragment>
vec2 p=vUv*1800.;float e=.05;vec3 n=normalize(vec3(h(p)-h(p+vec2(e,0.)),e*4.,h(p)-h(p+vec2(0.,e))));
vec3 v=normalize(vV);float fr=pow(1.-max(0.,dot(n,v)),4.);vec3 deep=vec3(.02,.12,.2),sky=vec3(.55,.72,.88);
float sp=pow(max(0.,dot(reflect(-normalize(sun),n),v)),300.)*6.;vec3 c=mix(deep,sky,fr*.85+.08)+sp;float d=length(vV);c=mix(c,vec3(.6,.74,.88),smoothstep(800.,6000.,d));
gl_FragColor=vec4(c,1.);}`});
  const o=new THREE.Mesh(new THREE.PlaneGeometry(20000,20000,1,1),m);o.rotation.x=-Math.PI/2;return o}
/* paraquedas: 3 cúpulas laranja e branco (gomos) com as linhas */
function buildChutes(){const g=new THREE.Group();
  const tex=ctex(512,128,(c,w,h)=>{for(let i=0;i<24;i++){c.fillStyle=i%2?'#f1efe8':'#e2702b';c.fillRect(w*i/24,0,w/24+1,h)}c.fillStyle='rgba(0,0,0,.12)';c.fillRect(0,h*.92,w,h*.08)});
  const m=new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,roughness:.9});
  for(let i=0;i<3;i++){const c=new THREE.Group();const dome=mesh(new THREE.SphereGeometry(13,32,12,0,TAU,0,Math.PI*.42),m,false);c.add(dome);
    const lm=new THREE.LineBasicMaterial({color:0xd8d4cc,transparent:true,opacity:.6});const pts=[];for(let k=0;k<16;k++){const a=k*TAU/16;pts.push(new THREE.Vector3(0,-34,0),new THREE.Vector3(13*Math.sin(Math.PI*.42)*Math.cos(a),13*Math.cos(Math.PI*.42),13*Math.sin(Math.PI*.42)*Math.sin(a)))}
    const ls=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),lm);c.add(ls);c.userData.dome=dome;c.userData.lines=ls;g.add(c)}
  return g}
/* plasma da reentrada: casca brilhante na frente do escudo e rastro */
function buildPlasma(){const g=plume(50,'solid');
  g.children.forEach(m=>{const U=m.material.uniforms;U.c0.value.setRGB(2.4,.75,.12);U.c1.value.setRGB(.8,.15,.02);U.cHot.value.setRGB(3.4,1.3,.3)});
  const cap=new THREE.Mesh(new THREE.SphereGeometry(1,32,16,0,TAU,0,Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(2.6,.7,.08),transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
  cap.rotation.x=Math.PI;g.add(cap);g.userData.cap=cap;return g}
/* ---------- módulo lunar (GLB da NASA) ---------- */
let LMmodel=null;
function loadLM(){const M=typeof __MODELS__!=='undefined'?__MODELS__:{};const k=Object.keys(M).find(n=>/Lunar_Module/i.test(n));if(!k)return Promise.resolve();
  const bin=Uint8Array.from(atob(M[k]),c=>c.charCodeAt(0)).buffer;
  return new Promise(res=>{new THREE.GLTFLoader().parse(bin,'',g=>{LMmodel=g.scene;LMmodel.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
    if(o.material){o.material.metalness=Math.max(o.material.metalness||0,.25);o.material.roughness=.5}}});
    /* o GLB vem com cerca de 4,6 unidades de altura: escala para 7,04 m (pernas abertas) */
    const b=new THREE.Box3().setFromObject(LMmodel),sz=b.getSize(new THREE.Vector3());const s=7.04/sz.y;LMmodel.scale.setScalar(s);LMmodel.position.y=-b.min.y*s;
    const w=new THREE.Group();w.add(LMmodel);LMmodel=w;splitLM(w);res()},e=>{console.warn('LM falhou',e);res()})})}
/* estágio de subida do LM (longo apollo-11, 03/11): as malhas cujo centro fica acima de LM_SPLIT m (topo do estágio de descida) viram
   uma cópia separada (root.lmA, estado st.lmA {p,r,vis}); com st.lm.split = true elas somem do LM inteiro, que fica só com a base */
const LM_SPLIT=3.05;let LMasc=null,LMascSrc=[];
function splitLM(w){w.updateMatrixWorld(true);const g=new THREE.Group(),inv=new THREE.Matrix4().copy(w.matrixWorld).invert();
  w.traverse(o=>{if(!o.isMesh)return;const b=new THREE.Box3().setFromObject(o),c=b.getCenter(new THREE.Vector3());
    if(c.y>LM_SPLIT){LMascSrc.push(o);const m=new THREE.Mesh(o.geometry,o.material);m.castShadow=m.receiveShadow=true;m.matrixAutoUpdate=false;
      m.matrix.copy(inv).multiply(o.matrixWorld);g.add(m)}});
  LMasc=g}

/* passe final: exposição, tone mapping ACES (aprox. de Narkowicz), saturação, vinheta leve e sRGB */
const FINAL={uniforms:{tDiffuse:{value:null},exp_:{value:1},sat:{value:1},vig:{value:.25},lift:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float exp_,sat,vig,lift;varying vec2 vUv;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*exp_;c=aces(c);float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);
  vec2 d=vUv-.5;c*=1.-vig*dot(d,d)*2.2;c=pow(max(c,0.),vec3(1./2.2));c=c+lift*(1.-c);gl_FragColor=vec4(c,1.);}`};
/* ---------- montagem ---------- */
function init(w,h,o={}){W=w;H=h;const sc=o.scale||1;RW=Math.round(W*sc);RH=Math.round(H*sc);
  cv=document.createElement('canvas');cv.width=RW;cv.height=RH;
  R=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});
  R.setPixelRatio(1);R.setSize(RW,RH,false);R.outputEncoding=THREE.LinearEncoding;R.toneMapping=THREE.NoToneMapping;  /* HDR linear até o passe final (FINAL) */
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,RW/RH,.5,5e9);
  acc=document.createElement('canvas');acc.width=W;acc.height=H;accx=acc.getContext('2d');
  ready=Promise.all([loadImgs(),loadLM()]).then(build);
  if(typeof window!=='undefined'){const prev=window.__assetsReady||Promise.resolve();window.__assetsReady=Promise.all([prev,ready])}
  return ready}
function build(){mats();
  const sun=new THREE.DirectionalLight(0xfff4e6,3.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-90;sc.right=90;sc.top=90;sc.bottom=-90;sc.near=1;sc.far=900;sun.shadow.bias=-.0004;
  scene.add(sun);scene.add(sun.target);root.sun=sun;
  root.hemi=new THREE.HemisphereLight(0x9fc4ff,0x6b6455,.75);scene.add(root.hemi);
  root.fill=new THREE.PointLight(0xffa040,0,600,2);scene.add(root.fill);   /* clarão laranja da chama nas peças */
  {const es=new THREE.Scene();es.add(new THREE.Mesh(new THREE.SphereGeometry(10,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:`varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 d;void main(){float e=normalize(d).y;vec3 c=e>0.?mix(vec3(.75,.8,.85),vec3(.35,.5,.8),pow(e,.6)):mix(vec3(.75,.8,.85),vec3(.22,.2,.18),pow(-e,.5));gl_FragColor=vec4(c*1.2,1.);}`})));
   const pm=new THREE.PMREMGenerator(R);scene.environment=pm.fromScene(es,.02).texture}
  root.sky=buildSky();scene.add(root.sky);root.stars=buildStars();scene.add(root.stars);
  const ctex_=texNoise(3,256,256,{map:(s,u,v)=>{const d=Math.hypot(u-.5,v-.5)*2,a=cl((s-.38)*2.2)*cl(1-d*d)*255;return [255,255,255,a]}});
  root.clouds=buildClouds(ctex_);scene.add(root.clouds);
  const S=buildSaturn();root.stack=S.st;root.parts=S.parts;scene.add(S.st);
  /* peças separadas vivem na cena (não no foguete) quando o estado manda: guardamos o pai original */
  root.pad=buildPad();scene.add(root.pad);
  root.earth=buildEarth();scene.add(root.earth);root.moon=buildMoon();scene.add(root.moon);
  root.moonGround=buildMoonGround();scene.add(root.moonGround);root.ocean=buildOcean();scene.add(root.ocean);
  root.chutes=buildChutes();scene.add(root.chutes);root.plasma=buildPlasma();scene.add(root.plasma);
  if(LMmodel){root.lm=LMmodel;scene.add(LMmodel)}if(LMasc){root.lmA=LMasc;scene.add(LMasc)}
  /* chamas: uma pluma por motor */
  root.pl={sic:ENG.map((e,i)=>plume(i,'f1')),sicCol:[plume(9,'col')],sii:ENG.map((e,i)=>plume(i+5,'j2')),sivb:[plume(11,'j2')],sps:[plume(12,'hyp')],lm:[plume(13,'hyp')],lmA:[plume(14,'hyp')],les:[0,1,2,3].map(i=>plume(20+i,'solid')),retro:Array.from({length:8},(e,i)=>plume(30+i,'solid')),ullage:[plume(40,'solid'),plume(41,'solid')]};
  for(const k in root.pl)root.pl[k].forEach(p=>scene.add(p));
  const smk=texNoise(11,128,128,{lin:true});root.smoke=points(9000,false,smk);scene.add(root.smoke);root.spark=points(1500,true,smk);scene.add(root.spark);
  root.ring=points(1400,false,smk);scene.add(root.ring);
  const rt=new THREE.WebGLRenderTarget(RW,RH,{type:THREE.HalfFloatType,samples:4});
  composer=new THREE.EffectComposer(R,rt);composer.setSize(RW,RH);composer.addPass(new THREE.RenderPass(scene,camera));
  bloom=new THREE.UnrealBloomPass(new THREE.Vector2(RW,RH),.8,.5,2.2);composer.addPass(bloom);
  final=new THREE.ShaderPass(FINAL);composer.addPass(final);
  loaded=true}

/* ---------- posições ---------- */
const PARTS=['sic','sii','sivb','sla0','sla1','sla2','sla3','sm','cm','les','bpc'];
const V3=(a)=>new THREE.Vector3(a[0],a[1],a[2]),E3=(r)=>new THREE.Euler(r?r[0]:0,r?r[1]:0,r?r[2]:0,'XYZ');
function stackMatrix(s){const m=new THREE.Matrix4();m.compose(V3(s&&s.p||[0,0,0]),new THREE.Quaternion().setFromEuler(E3(s&&s.r)),new THREE.Vector3(1,1,1));return m}
function world(stack,name,lp_){const m=stackMatrix(stack);const v=V3(lp_||[0,0,0]);if(name){const P=root.parts[name];if(P)v.add(P.userData.home.p)}return v.applyMatrix4(m).toArray()}
function applyParts(st){const sm_=stackMatrix(st.stack);root.stack.matrixAutoUpdate=false;root.stack.matrix.identity();root.stack.matrixWorldNeedsUpdate=true;
  const sp=st.parts||{};
  for(const k of PARTS){const P=root.parts[k],o=sp[k],h=P.userData.home;P.matrixAutoUpdate=false;
    if(o&&o.vis===false){P.visible=false;continue}P.visible=true;
    let m=new THREE.Matrix4();
    if(o&&(o.p||o.r)){/* o.p/o.r: transformação no mundo da peça inteira (em volta do próprio ponto de referência = origem do foguete) */
      m.compose(V3(o.p||[0,0,0]),new THREE.Quaternion().setFromEuler(E3(o.r)),new THREE.Vector3(1,1,1));
      if(o.hinge!=null&&/^sla/.test(k)){/* painel do SLA girando na dobradiça de baixo */}
    }else m.copy(sm_);
    const hm=new THREE.Matrix4().compose(h.p,h.q,new THREE.Vector3(1,1,1));
    if(/^sla/.test(k)){const i=+k[3],a=i*TAU/4+TAU/8,ang=(o&&o.open)||0;const piv=P.children[0];
      /* gira em torno da borda de baixo do painel: eixo tangente */
      const ax=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));const hp=new THREE.Vector3(H3.r3*Math.cos(a),0,H3.r3*Math.sin(a));
      const T1=new THREE.Matrix4().makeTranslation(-hp.x,0,-hp.z),Rm=new THREE.Matrix4().makeRotationAxis(ax,-ang),T2=new THREE.Matrix4().makeTranslation(hp.x,0,hp.z);
      piv.matrixAutoUpdate=false;piv.matrix.copy(T2).multiply(Rm).multiply(T1);}
    P.matrix.copy(m).multiply(hm)}
}
function partMatrix(k){root.parts[k].updateMatrixWorld(true);return root.parts[k].matrixWorld}

/* ---------- fumaça analítica: cada partícula nasce em tb e só depende de t ---------- */
function fillSmoke(P,list,t,camPos,lit){const pos=P.geometry.attributes.position.array,sz=P.geometry.attributes.size.array,col=P.geometry.attributes.col.array,rot=P.geometry.attributes.rot.array;let n=0;const N=P.userData.N;
  for(const e of list||[]){const t0=e.t0??0,t1=Math.min(e.t1??t,t),life=e.life||6,rate=e.rate||60;if(t<t0)continue;
    const i0=Math.max(0,Math.floor((t-life-t0)*rate)),i1=Math.floor((t1-t0)*rate);
    for(let i=i0;i<=i1&&n<N;i++){const tb=t0+i/rate,age=t-tb;if(age<0||age>life)continue;const s=e.seed||1,h1=hsh(i,s),h2=hsh(i,s+1.7),h3=hsh(i,s+3.1),h4=hsh(i,s+5.3);
      const p0=e.src(tb,i),v0=e.v?e.v(tb,i):[0,0,0],sp=e.spread||4,dr=e.drag??.6;
      const dir=[(h1-.5)*2,(h2-.5)*2,(h3-.5)*2],f=(1-Math.exp(-dr*age))/dr;
      const x=p0[0]+(v0[0]+dir[0]*sp)*f,y=p0[1]+(v0[1]+dir[1]*sp)*f+(e.buoy||0)*age*age*.5,z=p0[2]+(v0[2]+dir[2]*sp)*f;
      pos[n*3]=x;pos[n*3+1]=y;pos[n*3+2]=z;const u=age/life;
      sz[n]=(e.size||8)*(1+(e.grow??3)*Math.sqrt(u))*(.7+.6*h4);
      const fade=Math.min(1,age/(e.fadeIn||.25))*Math.pow(1-u,e.fadeP||1.3);const c=e.col||[.82,.8,.76],lt=(e.lit??1)*lit;
      const hot=e.hot?Math.exp(-age*e.hot):0;
      col[n*4]=c[0]*lt+hot*1.6;col[n*4+1]=c[1]*lt+hot*.7;col[n*4+2]=c[2]*lt+hot*.15;col[n*4+3]=(e.a??.6)*fade;rot[n]=h1*TAU+age*(h2-.5);n++}}
  /* ordena de trás para frente (mistura normal) */
  if(n>1&&P.material.blending!==THREE.AdditiveBlending){const idx=Array.from({length:n},(_,i)=>i),cx=camPos.x,cy=camPos.y,cz=camPos.z,d=new Float32Array(n);
    for(let i=0;i<n;i++)d[i]=(pos[i*3]-cx)**2+(pos[i*3+1]-cy)**2+(pos[i*3+2]-cz)**2;idx.sort((a,b)=>d[b]-d[a]);
    const p2=pos.slice(0,n*3),s2=sz.slice(0,n),c2=col.slice(0,n*4),r2=rot.slice(0,n);
    idx.forEach((j,i)=>{pos[i*3]=p2[j*3];pos[i*3+1]=p2[j*3+1];pos[i*3+2]=p2[j*3+2];sz[i]=s2[j];col[i*4]=c2[j*4];col[i*4+1]=c2[j*4+1];col[i*4+2]=c2[j*4+2];col[i*4+3]=c2[j*4+3];rot[i]=r2[j]})}
  P.geometry.setDrawRange(0,n);for(const k of ['position','size','col','rot'])P.geometry.attributes[k].needsUpdate=true}
function fillSparks(P,list,t){const pos=P.geometry.attributes.position.array,sz=P.geometry.attributes.size.array,col=P.geometry.attributes.col.array,rot=P.geometry.attributes.rot.array;let n=0;
  for(const e of list||[]){const age=t-e.t0;if(age<0||age>(e.life||1.6))continue;const N=e.n||200;
    for(let i=0;i<N&&n<P.userData.N;i++){const s=e.seed||3,a=hsh(i,s)*TAU,b=Math.acos(2*hsh(i,s+1)-1),v=(e.speed||40)*(.3+.7*hsh(i,s+2)),l=(e.life||1.6)*(.4+.6*hsh(i,s+4));if(age>l)continue;
      const d=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)],f=(1-Math.exp(-1.2*age))/1.2;
      pos[n*3]=e.p[0]+d[0]*v*f;pos[n*3+1]=e.p[1]+d[1]*v*f-(e.g||0)*age*age;pos[n*3+2]=e.p[2]+d[2]*v*f;sz[n]=(e.size||.9)*(1-age/l*.6);
      const k=Math.pow(1-age/l,1.5)*3;col[n*4]=k*1.4;col[n*4+1]=k*.75;col[n*4+2]=k*.25;col[n*4+3]=1;rot[n]=0;n++}}
  P.geometry.setDrawRange(0,n);for(const k of ['position','size','col','rot'])P.geometry.attributes[k].needsUpdate=true}

/* ---------- um subquadro ---------- */
function setup(st,t){const env=st.env||{};const sunD=V3(env.sun||[.55,.42,.35]).normalize();
  applyParts(st);
  /* câmera (com tremor) */
  const c=st.cam,sh=c.shake||0,j=sh?[Math.sin(t*61.3)*.6+Math.sin(t*23.7)*.4,Math.sin(t*47.1+1)*.6+Math.sin(t*17.9)*.4,Math.sin(t*53.9+2)*.5]:[0,0,0];
  camera.position.set(c.pos[0]+j[0]*sh,c.pos[1]+j[1]*sh,c.pos[2]+j[2]*sh);camera.up.set(...(c.up||[0,1,0]));camera.fov=c.fov||40;camera.near=c.near||.3;camera.far=c.far||5e9;
  camera.aspect=RW/RH;camera.updateProjectionMatrix();camera.lookAt(c.tgt[0]+j[0]*sh*.3,c.tgt[1]+j[1]*sh*.3,c.tgt[2]);
  /* luz do Sol segue a câmera (sombras no entorno do foguete) */
  const fc=V3(c.tgt);root.sun.position.copy(fc).addScaledVector(sunD,400);root.sun.target.position.copy(fc);root.sun.target.updateMatrixWorld();
  root.sun.intensity=(env.sunI??1.5);root.hemi.intensity=(env.hemi??.45)*(1-cl(env.sky||0)*.85);
  /* céu */
  root.sky.position.copy(camera.position);root.sky.scale.setScalar(4e9*.9);root.sky.material.uniforms.alt.value=cl(env.sky||0);root.sky.material.uniforms.sun.value.copy(sunD);root.sky.material.uniforms.exp_.value=env.skyExp??1;
  root.sky.visible=env.skyOn!==false;
  const ei=env.envI??lp(1,.3,cl(env.sky||0));scene.traverse(o=>{if(o.isMesh&&o.material&&o.material.isMeshStandardMaterial)o.material.envMapIntensity=ei});
  root.stars.position.copy(camera.position);root.stars.scale.setScalar(3e9);root.stars.material.opacity=cl(env.stars??0);root.stars.visible=(env.stars||0)>.01;
  /* nuvens: camadas que passam pela câmera durante a subida (y em metros relativos ao foguete) */
  const cls=env.clouds||[];root.clouds.visible=cls.length>0;
  root.clouds.children.forEach((s,i)=>{const L=cls[i%Math.max(1,cls.length)];if(!L){s.visible=false;return}const u=s.userData;s.visible=true;
    s.position.set(u.x+(L.x||0),L.y+u.y*(L.dy||600),u.z+(L.z||0));s.scale.set(u.w,u.w*.45,1);s.material.opacity=(L.a??.8);s.material.color.setScalar(L.lit??1)});
  root.pad.visible=!!env.pad;G.tower.visible=env.tower!==false;G.mast.visible=!!env.mast;if(env.mast)G.mast.position.set(env.mast[0],0,env.mast[1]);
  /* Terra */
  const E=env.earth;root.earth.visible=!!E;if(E){root.earth.position.set(...E.c);root.earth.scale.setScalar(E.r);root.earth.rotation.set(E.tilt||.35,E.rotY||0,0);
    for(const m of [root.earth.userData.e.material,root.earth.userData.atm.material]){m.uniforms.sun.value.copy(sunD);m.uniforms.a.value=E.a??1}root.earth.userData.e.material.uniforms.hasC.value=IMG['geo:nuvens.jpg']?(E.cl??1):0;}
  const M=env.moon;root.moon.visible=!!M;if(M){root.moon.position.set(...M.c);root.moon.scale.setScalar(M.r);root.moon.rotation.set(0,M.rotY||-1.6,0)}
  root.moonGround.visible=!!env.moonGround;if(env.moonGround){root.moonGround.position.set(0,env.mgY||0,0)}
  root.ocean.visible=!!env.ocean;if(env.ocean){root.ocean.position.set(camera.position.x,0,camera.position.z);root.ocean.material.uniforms.T.value=t;root.ocean.material.uniforms.sun.value.copy(sunD)}
  /* módulo lunar */
  if(root.lm){const L=st.lm;root.lm.visible=!!(L&&L.vis!==false);if(L){root.lm.position.set(...L.p);root.lm.rotation.copy(E3(L.r));root.lm.scale.setScalar(L.s||1)}
    LMascSrc.forEach(o=>o.visible=!(L&&L.split))}
  if(root.lmA){const A=st.lmA;root.lmA.visible=!!(A&&A.vis!==false);if(A){root.lmA.position.set(...A.p);root.lmA.rotation.copy(E3(A.r));root.lmA.scale.setScalar(A.s||1)}}
  /* paraquedas */
  const ch=st.chutes;root.chutes.visible=!!ch;if(ch){root.chutes.position.set(...ch.p);root.chutes.children.forEach((c,i)=>{const a=(i-1)*.42+Math.sin(t*.7+i)*.03*(ch.sway??1),k=cl(ch.k);
    c.position.set(Math.sin(a)*34*k,34*k*Math.cos(a)*.98,Math.cos(i*2.1)*3*k);c.rotation.set(Math.cos(i*2.1)*.1,0,-a);const s=lp(.12,1,Math.pow(k,1.5));c.userData.dome.scale.set(s,lp(1.6,1,k),s);c.userData.lines.scale.set(1,Math.max(.02,k),1);c.scale.setScalar(ch.s||1)})}
  /* plasma */
  const pz=st.plasma;root.plasma.visible=!!(pz&&pz.k>.01);if(pz&&pz.k>.01){root.plasma.position.set(...pz.p);const d=V3(pz.dir||[0,-1,0]).normalize();
    root.plasma.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),d.clone().negate());const L=pz.len||40;
    const cap=root.plasma.userData.cap;cap.scale.set(2.2,.7,2.2);cap.position.set(0,pz.capOff||0,0);cap.material.opacity=.45*pz.k;
    root.plasma.children.forEach(m=>{if(m===cap)return;const {r,L:Lr}=m.userData;m.scale.set(1.5*r,L*Lr,1.5*r);const U=m.material.uniforms;U.T.value=t;U.k.value=pz.k;U.vac.value=.3;U.wide.value=2;U.Lm.value=L*Lr})}
  /* chamas */
  let glow=0,gp=new THREE.Vector3();for(const k in root.pl)root.pl[k].forEach(p=>p.visible=false);
  for(const f of st.flames||[]){const list=root.pl[f.at==='retro_sic'?'retro':f.at];if(!list)continue;const k=f.k??1,vac=f.vac??0;
    let src=[],part=null,dir=new THREE.Vector3(0,-1,0),r0=1.88,len=f.len||45;
    if(f.at==='sic'){part='sic';src=ENG.map(([r,a])=>[r*Math.cos(a),.1,r*Math.sin(a)]);r0=1.75}
    else if(f.at==='sii'){part='sii';src=root.parts.sii.userData.eng.map(e=>[e[0],e[1],e[2]]);r0=.95;len=f.len||30}
    else if(f.at==='sivb'){part='sivb';src=[[0,Y.ivb0-2.4,0]];r0=.95;len=f.len||30}
    else if(f.at==='sps'){part='sm';src=[[0,Y.cm0-6.7,0]];r0=1.2;len=f.len||22}
    else if(f.at==='les'){part='les';src=root.parts.les.userData.noz.map(e=>[e[0],e[1],e[2]]);r0=.2;len=f.len||9}
    else if(f.at==='retro_sic'){part='sic';src=root.parts.sic.userData.retro;r0=.18;len=f.len||7;dir=new THREE.Vector3(0,1,0)}
    else if(f.at==='ullage'){part='sii';src=[[H3.r1-.2,Y.sic1+4,0],[-H3.r1+.2,Y.sic1+4,0]];r0=.2;len=f.len||5}
    else if(f.at==='lm'){src=[[0,.9,0]];r0=.7;len=f.len||6}
    else if(f.at==='lmA'){src=[[0,LM_SPLIT-.1,0]];r0=.45;len=f.len||5}
    const M=part?partMatrix(part):f.at==='lmA'?(root.lmA?(root.lmA.updateMatrixWorld(true),root.lmA.matrixWorld):new THREE.Matrix4()):(root.lm?root.lm.matrixWorld:new THREE.Matrix4());
    const q=new THREE.Quaternion();M.decompose(new THREE.Vector3(),q,new THREE.Vector3());
    src.forEach((s,i)=>{const p=list[i%list.length];if(!p)return;
      let lp_=V3(s);if(f.at==='lm'&&root.lm){root.lm.updateMatrixWorld(true);lp_=lp_.divideScalar(root.lm.scale.x||1)}if(f.at==='lmA'&&root.lmA)lp_=lp_.divideScalar(root.lmA.scale.x||1);
      const wp=lp_.applyMatrix4(M);p.position.copy(wp);
      let d=dir.clone();if(f.at==='les'){const a=root.parts.les.userData.noz[i][3];d=new THREE.Vector3(Math.cos(a)*.55,-1,Math.sin(a)*.55).normalize()}
      if(f.at==='retro_sic'){const a=Math.atan2(s[2],s[0]);d=new THREE.Vector3(Math.cos(a)*.25,1,Math.sin(a)*.25).normalize()}
      if(f.at==='ullage')d=new THREE.Vector3(0,-1,0);
      d.applyQuaternion(q);p.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),d);
      if(f.at==='sic')setPlume(p,k,vac,len*lp(1,.25,vac),r0,t+i*.37,f.wide??1.2);else setPlume(p,k,vac,len,r0,t+i*.37,f.wide);glow+=k;gp.add(wp)});
    if(f.at==='sic'){/* coluna única: começa logo abaixo dos sinos com o raio do conjunto (4 motores a 3,86 m + bocal 1,88 m) */
      const c=root.pl.sicCol[0],wp=new THREE.Vector3(0,-1.2,0).applyMatrix4(M);c.position.copy(wp);const d=new THREE.Vector3(0,-1,0).applyQuaternion(q);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),d);setPlume(c,k,vac,len*lp(1,1.4,vac),5.5,t,f.wide??9)}}
  if(glow>0){gp.divideScalar(Math.max(1,(st.flames||[]).reduce((a,f)=>a+1,0)));root.fill.position.copy(gp);root.fill.intensity=Math.min(4,glow)*(env.fillK??.9)}else root.fill.intensity=0;
  /* fumaça, faíscas, anéis */
  const lit=env.smokeLit??1;fillSmoke(root.smoke,st.smoke,t,camera.position,lit);fillSparks(root.spark,st.sparks,t);
  const rl=(st.rings||[]).map(r=>({seed:r.seed||9,t0:r.t0,t1:r.t0+(r.emit||.12),rate:r.n?r.n/(r.emit||.12):6000,life:r.dur||2.5,size:r.size||3,grow:r.grow??2.5,a:r.a??.55,col:r.col,drag:r.drag??1.6,spread:0,lit:r.lit,fadeIn:.05,hot:r.hot,
    src:()=>r.p,v:(tb,i)=>{const a=hsh(i,r.seed||9)*TAU,up=(hsh(i,(r.seed||9)+2)-.5)*(r.thick||.25);const ax=r.axis||[0,1,0];
      /* círculo perpendicular ao eixo */
      const A=V3(ax).normalize(),u=Math.abs(A.y)<.9?new THREE.Vector3(0,1,0).cross(A).normalize():new THREE.Vector3(1,0,0).cross(A).normalize(),w=A.clone().cross(u);
      const sp=r.r1||30;return [ (u.x*Math.cos(a)+w.x*Math.sin(a))*sp+A.x*up*sp,(u.y*Math.cos(a)+w.y*Math.sin(a))*sp+A.y*up*sp+(r.vy||0),(u.z*Math.cos(a)+w.z*Math.sin(a))*sp+A.z*up*sp]}}));
  fillSmoke(root.ring,rl,t,camera.position,lit);
  const sH=RH/(2*Math.tan(camera.fov*Math.PI/360));for(const P of [root.smoke,root.spark,root.ring])P.material.uniforms.scaleH.value=sH;
  final.uniforms.exp_.value=env.exp??1;final.uniforms.sat.value=env.sat??1.05;final.uniforms.vig.value=env.vig??.3;bloom.strength=(st.bloom??.8);bloom.threshold=st.bloomT??2.2;
}
function frame(stFn,T,o={}){if(!loaded)return null;const sub=o.sub||3,sh=(o.shutter??.5)/30;accx.globalCompositeOperation='source-over';
  for(let i=0;i<sub;i++){const t=T+(sub>1?(i/(sub-1)-.5)*sh:0);const st=stFn(t);setup(st,t);composer.render();
    accx.globalAlpha=1/(i+1);accx.drawImage(cv,0,0,W,H)}
  accx.globalAlpha=1;return acc}
/* projeta um ponto do mundo na tela (px) com a câmera de um estado: {x,y,vis} (vis = na frente da câmera) */
function proj(cam,p){const c=new THREE.PerspectiveCamera(cam.fov||40,W/H,.3,5e9);c.position.set(...cam.pos);c.up.set(...(cam.up||[0,1,0]));c.lookAt(...cam.tgt);c.updateMatrixWorld();
  const v=V3(p).project(c);return {x:(v.x*.5+.5)*W,y:(.5-v.y*.5)*H,vis:v.z<1&&v.z>-1}}
function local(name){const h=root.parts[name].userData.home;return {p:h.p.toArray(),r:[0,0,0]}}
return {init,frame,world,local,proj,PARTS,HEIGHTS:H3,Y,ENG,get canvas(){return acc},get ready(){return ready},get loaded(){return loaded},root}})();
