/* ---------- LENS: buraco negro com lente gravitacional calculada raio a raio na GPU (WebGL2) — nível 2 ----------
   Exemplo: projetos/buraco-negro-lente/. Unidades: raio de Schwarzschild rs = 1 (horizonte em r=1, esfera de fótons em 1,5, ISCO em 3).
   Cada pixel lança um raio da câmera e integra a geodésica nula de Schwarzschild (forma cartesiana: a = −1,5·h²·p/r⁵).
   O raio pode cruzar o disco várias vezes (imagem direta, imagem "por cima" e anel de fótons); o que escapa vira céu
   (estrelas e faixa da galáxia, também desviadas). Cor em HDR (float), bloom, tone mapping ACES, vinheta.
   Desfoque de movimento e antisserrilhado: cada quadro é a média de N subquadros com a câmera/tempo levemente diferentes.

   LENS.init(W,H,{scale})            cria o canvas WebGL2 (scale<1 renderiza menor e amplia; 1 = resolução cheia)
   LENS.frame(camFn,T,opts)          camFn(t) → {pos:[x,y,z], tgt:[x,y,z], up?, fov(graus)}; T = tempo do vídeo (s)
       opts: {sub:8, shutter:.5 (fração de 1/30 s), disk:{rin:3,rout:14,gain:1,dop:1,rot:1,P:0}, back:0..1 (pinta de ouro
              a parte de TRÁS do disco), front:0..1 (apaga a parte da frente), sky:1, bloom:1, exp:1, ring:1}
       devolve o canvas (desenhe com ctx.drawImage(LENS.canvas,0,0,W,H) e ponha o HUD por cima)
   LENS.ray(cam,px,py)               mesmo raio, em JS: lista de pontos 3D até sair, cair ou bater no disco (para desenhar o caminho da luz)
   LENS.proj(cam,p)                  projeta um ponto 3D na tela (px) com a mesma câmera do shader
   LENS.camBasis(cam)                {f,r,u,k} da câmera
   Determinístico (sem Math.random). Loop: disk.P = período; o redemoinho do disco faz crossfade para fechar o ciclo. */
const LENS=(()=>{
const V={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  nrm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}};
let gl,cv,W,H,RW,RH,progs={},fb={},quad;
const VS=`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0,1);}`;
const TRACE=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;
uniform vec3 ro,cf,cr,cu;uniform float tf,asp,T,rin,rout,gain,dop,rot,P,back,front,skyk,ring;uniform vec2 jit,res;
float h31(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
/* céu: estrelas em 3 camadas + faixa da galáxia (azul-acinzentada, poeira dourada), sem rosa */
vec3 stars(vec3 d,float sc,float th){vec3 p=d*sc,i=floor(p),f=fract(p)-.5;float h=h31(i);
  if(h<th)return vec3(0);vec3 off=vec3(h31(i+11.),h31(i+23.),h31(i+37.))-.5;float r=length(f-off*.6);
  float b=pow(max(0.,1.-r*sc*.018/(.25+.75*(h-th)/(1.-th))),6.);float c=h31(i+5.);
  vec3 col=c<.25?vec3(.7,.82,1.):c<.8?vec3(1.,.97,.92):vec3(1.,.8,.55);return col*b*(.4+3.*(h-th)/(1.-th));}
vec3 sky(vec3 d){vec3 c=vec3(.006,.009,.02);
  vec3 g=normalize(vec3(.25,1.,.35));float lat=dot(d,g);float band=exp(-lat*lat*9.);
  float n=fbm3(d*3.2),dust=fbm3(d*7.+3.);
  c+=band*(vec3(.006,.011,.024)*(.3+n)+vec3(.022,.016,.008)*smoothstep(.55,.85,n));
  c*=1.-band*.75*smoothstep(.5,.75,dust);
  c+=stars(d,150.,.975)*1.5+stars(d,380.,.985)+stars(d,800.,.99)*.7;
  return c*skyk;}
/* cor de corpo negro aproximada (temperatura relativa), do vermelho-laranja ao branco-azulado */
vec3 bb(float t){t=clamp(t,0.,3.);
  vec3 a=vec3(.9,.18,.02),b=vec3(1.,.5,.12),c=vec3(1.,.82,.55),e=vec3(.85,.92,1.);
  return t<1.?mix(a,b,t):t<2.?mix(b,c,t-1.):mix(c,e,t-2.);}
float swirl(float r,float ph,float t){float om=rot*.7*pow(r,-1.5);float a=ph-om*t;
  float lr=log(r);
  vec2 q=vec2(cos(a),sin(a));
  float s=fbm3(vec3(q*1.6,lr*7.))*.45+fbm3(vec3(q*3.5,lr*38.+2.))*.35+n3(vec3(q*9.,lr*90.))*.2;
  return s;}
vec4 diskCol(vec3 p,vec3 v){float r=length(p.xz);if(r<rin*.92||r>rout)return vec4(0);
  float ph=atan(p.z,p.x);
  float s=swirl(r,ph,T);
  if(P>0.){float w=smoothstep(P-2.5,P,T);s=mix(s,swirl(r,ph,T-P),w);}
  float x=rin/r;float prof=pow(x,2.2)*pow(max(0.,1.-sqrt(x*.97)),.35)*4.;
  float edge=smoothstep(rout,rout*.6,r)*smoothstep(rin*.92,rin*1.06,r);
  /* gás em órbita circular (sentido anti-horário visto de cima): v = sqrt(0.5/(r-1)) */
  float beta=min(.7,sqrt(.5/max(r-1.,.5)));vec3 u=normalize(vec3(-p.z,0,p.x));
  float cosA=dot(u,-normalize(v));float gam=1./sqrt(1.-beta*beta);
  float D=1./(gam*(1.-beta*cosA));float gr=sqrt(max(0.,1.-1./r));float g=mix(1.,D*gr,dop);
  float I=prof*(.15+1.6*s*s*s)*pow(g,3.)*gain*.7;
  float temp=mix(.15,2.2,clamp(pow(x,1.3)*1.15,0.,1.))*mix(1.,g,.8)+.25*s;
  vec3 col=bb(temp)*I;
  /* destaque da parte de trás (ouro) e apagamento da frente */
  float behind=smoothstep(-.3,.6,dot(normalize(vec3(p.x,0,p.z)),normalize(vec3(-ro.x,0,-ro.z))));
  col=mix(col,vec3(1.,.72,.25)*(length(col)*.9+.25*edge),back*behind);
  col*=1.-front*(1.-behind);
  float a=edge*clamp(.25+I*.8,0.,1.)*(1.-.6*smoothstep(.5,.2,s));
  return vec4(col*edge,a);}
void main(){vec2 q=(gl_FragCoord.xy+jit)/res*2.-1.;q.x*=asp;
  vec3 d=normalize(cf+q.x*tf*cr+q.y*tf*cu);vec3 p=ro;vec3 acc=vec3(0);float tr=1.;
  float h2=dot(cross(p,d),cross(p,d));bool hit=false;float minr=1e9;
  for(int i=0;i<520;i++){float r=length(p);minr=min(minr,r);
    if(r<1.){hit=true;break;}
    if(r>90.&&dot(p,d)>0.)break;
    float dt=clamp(.045*r*r/(1.+r*.25),.008,3.)*(r<2.2?.6:1.);
    /* RK2 (ponto médio) na equação de Binet cartesiana */
    vec3 a1=-1.5*h2*p/pow(r,5.);vec3 pm=p+d*dt*.5;vec3 dm=d+a1*dt*.5;float rm=length(pm);
    vec3 a2=-1.5*h2*pm/pow(rm,5.);vec3 pn=p+dm*dt;d=normalize(d+a2*dt);
    if(p.y*pn.y<0.){float f=p.y/(p.y-pn.y);vec3 c=mix(p,pn,f);vec4 dc=diskCol(c,d);acc+=tr*dc.rgb*dc.a*1.;tr*=1.-dc.a;if(tr<.01)break;}
    p=pn;}
  vec3 col=acc;
  if(!hit&&tr>.01)col+=tr*sky(d);
  /* anel de fótons: um fio fino de luz extra onde o raio passou rente à esfera de fótons */
  col+=ring*vec3(1.,.8,.5)*.6*exp(-pow((minr-1.5)/.03,2.))*(hit?0.:1.);
  o=vec4(col,1.);}`;
const ACC=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s;uniform float k;void main(){o=texture(s,uv)*k;}`;
const BRIGHT=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s;uniform vec2 px;void main(){
  vec3 c=vec3(0);for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)c+=texture(s,uv+vec2(i,j)*px).rgb;c/=9.;
  float l=max(c.r,max(c.g,c.b));o=vec4(c*smoothstep(1.,4.,l),1.);}`;
const BLUR=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s;uniform vec2 dir;void main(){
  float w[5]=float[](.227027,.1945946,.1216216,.054054,.016216);vec3 c=texture(s,uv).rgb*w[0];
  for(int i=1;i<5;i++){c+=texture(s,uv+dir*float(i)).rgb*w[i];c+=texture(s,uv-dir*float(i)).rgb*w[i];}o=vec4(c,1.);}`;
const FINAL=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s,b0,b1,b2,b3;uniform float bloom,ex,asp;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 c=texture(s,uv).rgb;vec3 bl=texture(b0,uv).rgb*.5+texture(b1,uv).rgb*.6+texture(b2,uv).rgb*.8+texture(b3,uv).rgb*1.;
  c+=bl*bloom*.35;c*=ex;float lu=dot(c,vec3(.2126,.7152,.0722));c=max(vec3(0),mix(vec3(lu),c,1.35));
  vec2 q=uv-.5;q.x*=asp;c*=1.-.35*smoothstep(.35,.95,length(q));
  c=aces(c*1.1);c=pow(c,vec3(1./2.2));
  float d=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)/255.;o=vec4(c+d,1.);}`;
function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
function prog(fs){const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));const U={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){const a=gl.getActiveUniform(p,i);U[a.name.replace('[0]','')]=gl.getUniformLocation(p,a.name)}return{p,U}}
function target(w,h){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);return{t,f,w,h}}
function use(P,tgt){gl.useProgram(P.p);if(tgt){gl.bindFramebuffer(gl.FRAMEBUFFER,tgt.f);gl.viewport(0,0,tgt.w,tgt.h)}else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H)}}
function draw(){gl.bindVertexArray(quad);gl.drawArrays(gl.TRIANGLES,0,6)}
function tex(P,name,unit,t){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t.t);gl.uniform1i(P.U[name],unit)}
function init(w,h,o={}){W=w;H=h;const sc=o.scale||1;RW=Math.round(w*sc);RH=Math.round(h*sc);
  cv=document.createElement('canvas');cv.width=W;cv.height=H;gl=cv.getContext('webgl2',{preserveDrawingBuffer:true,antialias:false});
  if(!gl)throw new Error('WebGL2 indisponível');gl.getExtension('EXT_color_buffer_float');gl.getExtension('OES_texture_float_linear');
  quad=gl.createVertexArray();gl.bindVertexArray(quad);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  progs={tr:prog(TRACE),acc:prog(ACC),br:prog(BRIGHT),bl:prog(BLUR),fin:prog(FINAL)};
  fb.one=target(RW,RH);fb.acc=target(RW,RH);fb.mip=[];let mw=RW>>1,mh=RH>>1;for(let i=0;i<4;i++){fb.mip.push([target(mw,mh),target(mw,mh)]);mw=Math.max(8,mw>>1);mh=Math.max(8,mh>>1)}
  LENS.canvas=cv;return cv}
function camBasis(c){const f=V.nrm(V.sub(c.tgt,c.pos));let up=c.up||[0,1,0];const r=V.nrm(V.crs(f,up));const u=V.crs(r,f);return{f,r,u,k:Math.tan((c.fov||40)*Math.PI/360)}}
function frame(camFn,T,o={}){const n=o.sub||8,sh=(o.shutter??.5)/30,D=Object.assign({rin:3,rout:14,gain:1,dop:1,rot:1,P:0},o.disk||{});
  const P=progs.tr;
  use(progs.acc,fb.acc);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
  for(let i=0;i<n;i++){const ti=T+((i+.5)/n-.5)*sh,c=camFn(ti),B=camBasis(c);
    use(P,fb.one);const U=P.U;
    gl.uniform3fv(U.ro,c.pos);gl.uniform3fv(U.cf,B.f);gl.uniform3fv(U.cr,B.r);gl.uniform3fv(U.cu,B.u);gl.uniform1f(U.tf,B.k);gl.uniform1f(U.asp,RW/RH);
    gl.uniform1f(U.T,ti);gl.uniform1f(U.rin,D.rin);gl.uniform1f(U.rout,D.rout);gl.uniform1f(U.gain,D.gain);gl.uniform1f(U.dop,D.dop);gl.uniform1f(U.rot,D.rot);gl.uniform1f(U.P,D.P);
    gl.uniform1f(U.back,o.back||0);gl.uniform1f(U.front,o.front||0);gl.uniform1f(U.skyk,o.sky??1);gl.uniform1f(U.ring,o.ring??1);
    /* jitter de subpixel (sequência de Halton) para antisserrilhado */
    const hal=(k,b)=>{let f=1,r=0;while(k>0){f/=b;r+=f*(k%b);k=Math.floor(k/b)}return r};gl.uniform2f(U.jit,hal(i+1,2)-.5,hal(i+1,3)-.5);gl.uniform2f(U.res,RW,RH);
    draw();
    use(progs.acc,fb.acc);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);tex(progs.acc,'s',0,fb.one);gl.uniform1f(progs.acc.U.k,1/n);draw();gl.disable(gl.BLEND)}
  /* bloom: 4 níveis */
  let src=fb.acc;fb.mip.forEach((m,i)=>{use(progs.br,m[0]);tex(progs.br,'s',0,src);gl.uniform2f(progs.br.U.px,1/src.w,1/src.h);draw();
    for(let k=0;k<2;k++){use(progs.bl,m[1]);tex(progs.bl,'s',0,m[0]);gl.uniform2f(progs.bl.U.dir,1.5/m[0].w,0);draw();use(progs.bl,m[0]);tex(progs.bl,'s',0,m[1]);gl.uniform2f(progs.bl.U.dir,0,1.5/m[0].h);draw()}
    src=m[0]});
  use(progs.fin,null);tex(progs.fin,'s',0,fb.acc);fb.mip.forEach((m,i)=>tex(progs.fin,'b'+i,i+1,m[0]));gl.uniform1f(progs.fin.U.bloom,o.bloom??1);gl.uniform1f(progs.fin.U.ex,o.exp??1);gl.uniform1f(progs.fin.U.asp,W/H);draw();
  return cv}
function proj(c,p){const B=camBasis(c),d=V.sub(p,c.pos),z=V.dot(d,B.f);if(z<=.01)return null;const x=V.dot(d,B.r)/(z*B.k),y=V.dot(d,B.u)/(z*B.k);
  return[W/2+x*H/2,H/2-y*H/2,z]}
function ray(c,px,py,o={}){const B=camBasis(c);const qx=(px-W/2)/(H/2),qy=(H/2-py)/(H/2);let d=V.nrm(V.add(B.f,V.add(V.mul(B.r,qx*B.k),V.mul(B.u,qy*B.k))));
  let p=c.pos.slice();const cr=V.crs(p,d),h2=V.dot(cr,cr);const pts=[p.slice()];const rin=o.rin||3,rout=o.rout||14;let end='sky';
  for(let i=0;i<4000;i++){const r=Math.hypot(...p);if(r<1){end='bh';break}if(r>90&&V.dot(p,d)>0)break;
    const dt=Math.min(3,Math.max(.004,.02*r*r/(1+r*.25)));const a1=V.mul(p,-1.5*h2/r**5),pm=V.add(p,V.mul(d,dt*.5)),dm=V.add(d,V.mul(a1,dt*.5)),rm=Math.hypot(...pm);
    const a2=V.mul(pm,-1.5*h2/rm**5),pn=V.add(p,V.mul(dm,dt));d=V.nrm(V.add(d,V.mul(a2,dt)));
    if(p[1]*pn[1]<0&&o.stopDisk!==false){const f=p[1]/(p[1]-pn[1]),cpt=V.add(p,V.mul(V.sub(pn,p),f)),rr=Math.hypot(cpt[0],cpt[2]);if(rr>=rin&&rr<=rout){pts.push(cpt);end='disk';break}}
    p=pn;if(i%2===0)pts.push(p.slice())}
  return{pts,end}}
return{init,frame,proj,ray,camBasis,V,get W(){return W},get H(){return H}}})();
