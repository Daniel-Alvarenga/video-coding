/* ---------- ECL: Sol, Terra e Lua com a luz calculada por pixel na GPU (WebGL2) — eclipses, nível 2 ----------
   Exemplo: projetos/eclipse-ultimo/. Unidades: raio da Terra = 1 (6.371 km), Terra no centro, eixo y = polo norte.
   Cada pixel lança um raio da câmera e calcula:
   - Sol: disco com escurecimento de borda e granulação, cromosfera, protuberâncias e coroa com raios (streamers);
   - Lua: textura NASA (geo:lua.jpg), luz do Sol + luz cinérea (reflexo da Terra);
   - Terra: textura NASA de dia, luzes da noite e nuvens (geo:terra/noite/nuvens.jpg);
   - atmosfera: espalhamento simples Rayleigh + Mie (ray marching), visto do chão ou do espaço;
   - eclipse: em cada ponto (do chão, do ar ou da Lua) calcula a FRAÇÃO do disco do Sol tapada pela Lua (sobreposição
     de dois discos), então a sombra (umbra, penumbra, antumbra), o céu escuro da totalidade, o pôr do sol em 360° no
     horizonte, o anel de fogo e as contas de Baily saem da geometria, sem truque.
   Dois espaços: "desenho" (sun/moon: onde os corpos aparecem) e "física" (sunQ/moonQ: de onde vem a sombra). Nas cenas
   do chão os dois são iguais (escala real); nas cenas de esquema dá para aproximar e aumentar Sol e Lua sem mexer na sombra.
   Cor em HDR (float), bloom, tone mapping ACES, vinheta; cada quadro é a média de N subquadros (desfoque de movimento).

   ECL.init(W,H,{scale})                 cria o canvas WebGL2; as texturas sobem no 1º frame (depois de __assetsReady)
   ECL.frame(camFn,T,opts)               camFn(t) → {pos,tgt,up?,fov}; opts:
       {sub:8, shutter:.5, bodies:fn(t)→{sun:{p,r},moon:{p,r},sunQ?,moonQ?} (Q = física; sem Q usa o de desenho),
        sunDisk:1 (só o brilho do disco), exp:1 (ou 'auto': pela fração do Sol visível da câmera), sky:1 (atmosfera), stars:1, corona:1, sunI:1,
        hills:1 (relevo no horizonte quando a câmera está no chão), land:[r,g,b] (cor do chão), eshine:1, bloom:1}
   ECL.geo(lat,lon,elev,az)              ponto G no chão e direção S do Sol (elevação/azimute em graus) → {G,S,up,east,north}
   ECL.line(G,S,d)                       ponto a d unidades de G na direção S (Sol e Lua alinhados com G: eclipse central)
   ECL.REAL                              {sunR,sunD,moonR,moonD} em raios da Terra (Sol 109,2 a 23.481; Lua 0,2727 a 60,34)
   ECL.vis(p,sun,moon)                   fração do Sol visível do ponto p (0 = totalidade, 1 = Sol inteiro)
   ECL.proj(cam,p)                       projeta um ponto 3D na tela (px) com a mesma câmera do shader
   Determinístico (sem Math.random). */
const ECL=(()=>{
const V={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),nrm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},
  lerp:(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u]};
const RE=6371,REAL={sunR:695700/RE,sunD:149597870.7/RE,moonR:1737.4/RE,moonD:384400/RE};
let gl,cv,W,H,RW,RH,progs={},fb={},quad,texs=null,dummy;
const VS=`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0,1);}`;
const TRACE=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;
uniform vec3 ro,cf,cr,cu,sunP,moonP,sunQ,moonQ;uniform float tf,asp,T,alt,sunR,moonR,sunRq,moonRq,sunI,corI,skyK,starK,hillK,eshine,hasTex,sunDisk;
uniform vec3 land;uniform vec2 jit,res;uniform sampler2D sE,sN,sC,sM;
const float PI=3.14159265,RA=1.0094,HR=1.2557e-3,HM=1.8835e-4;
const vec3 BR=vec3(36.95,86.0,210.9);const float BM=133.8;
float h31(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm2(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 stars(vec3 d,float sc,float th){vec3 p=d*sc,i=floor(p),f=fract(p)-.5;float h=h31(i);
  if(h<th)return vec3(0);vec3 off=vec3(h31(i+11.),h31(i+23.),h31(i+37.))-.5;float r=length(f-off*.6);
  float b=pow(max(0.,1.-r*sc*.018/(.25+.75*(h-th)/(1.-th))),6.);float c=h31(i+5.);
  vec3 col=c<.25?vec3(.7,.82,1.):c<.8?vec3(1.,.97,.92):vec3(1.,.8,.55);return col*b*(.4+3.*(h-th)/(1.-th));}
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
/* ângulo entre duas direções unitárias, estável para ângulos pequenos */
float ang(vec3 a,vec3 b){return 2.*asin(clamp(length(a-b)*.5,0.,1.));}
/* fração do disco do Sol (raio angular a) tapada por um disco (raio b) a uma separação d (tudo em radianos) */
float cover(float a,float b,float d){b/=a;d/=a;if(d>=1.+b)return 0.;if(d<=abs(1.-b))return min(1.,b*b);
  float k1=acos(clamp((d*d+1.-b*b)/(2.*d),-1.,1.)),k2=acos(clamp((d*d+b*b-1.)/(2.*d*b),-1.,1.));
  return (k1+b*b*k2-.5*sqrt(max(0.,(-d+1.+b)*(d+1.-b)*(d-1.+b)*(d+1.+b))))/PI;}
/* quanto do Sol se vê do ponto p (espaço da física) */
float sunVis(vec3 p){vec3 s=sunQ-p,m=moonQ-p;float ds=length(s),dm=length(m);if(dm>ds)return 1.;
  return 1.-cover(asin(min(1.,sunRq/ds)),asin(min(1.,moonRq/dm)),ang(s/ds,m/dm));}
/* esfera: distância de entrada (ou -1) — forma estável para centro longe */
float hitS(vec3 o,vec3 d,vec3 c,float R){vec3 m=c-o;float dm=length(m);float th=ang(d,m/dm);if(th>=asin(min(1.,R/dm))||dot(m,d)<0.)return -1.;
  float pp=dm*sin(th),tc=dm*cos(th);return tc-sqrt(max(0.,R*R-pp*pp));}
vec2 sph(vec3 o,vec3 d,float R2){float b=dot(o,d),c=dot(o,o)-R2;float D=b*b-c;if(D<0.)return vec2(-1);D=sqrt(D);return vec2(-b-D,-b+D);}
/* profundidade óptica até o topo da atmosfera na direção l (luz do Sol chegando em p) */
vec2 odSun(vec3 p,vec3 l){vec2 e=sph(p,l,1.);if(e.x>0.)return vec2(1e9);vec2 a=sph(p,l,RA*RA);float L=max(a.y,0.);vec2 od=vec2(0);
  for(int i=0;i<6;i++){float t=L*(float(i)+.5)/6.;float h=length(p+l*t)-1.;od+=vec2(exp(-h/HR),exp(-h/HM));}return od*L/6.;}
vec3 trans(vec2 od){return exp(-(BR*od.x+BM*1.1*od.y));}
void main(){vec2 q=(gl_FragCoord.xy+jit)/res*2.-1.;q.x*=asp;
  vec3 d=normalize(cf+q.x*tf*cr+q.y*tf*cu);
  vec3 up=normalize(ro);
  /* ---- o que o raio atinge: chão/Terra, Lua, Sol ---- */
  float tE=-1.;{float b=dot(ro,d),c=alt*(2.+alt),D=b*b-c;if(D>=0.&&b<0.)tE=c/(-b+sqrt(D));if(c<0.)tE=0.;}
  /* relevo no horizonte (só perto do chão) */
  bool hill=false;if(hillK>0.&&alt<.002){if(tE>0.)hill=true;vec3 ea=normalize(cross(vec3(0,1,0),up)),no=cross(up,ea);float az=atan(dot(d,ea),dot(d,no));
    float el=asin(clamp(dot(d,up),-1.,1.));vec2 cs=vec2(cos(az),sin(az));
    float hp=hillK*(.003+.05*pow(fbm2(cs*2.6+3.),3.)+.004*fbm2(cs*30.));if(el<hp)hill=true;}
  float tM=hitS(ro,d,moonP,moonR);if(tE>0.&&tM>tE)tM=-1.;
  float tA=tE>0.?tE:1e9;if(hill)tA=min(tA,.0009);
  vec3 col=vec3(0);bool open=!hill&&tE<0.;
  vec3 lsD=normalize(sunP-ro);
  if(hill){vec3 ea=normalize(cross(vec3(0,1,0),up));col=land*(.6+.8*fbm2(vec2(atan(dot(d,ea),dot(d,cross(up,ea)))*40.,asin(clamp(dot(d,up),-1.,1.))*400.)));}
  else if(tM>0.){vec3 h=ro+d*tM,n=normalize(h-moonP);vec3 f=normalize(-moonP),e2=normalize(cross(vec3(0,1,0),f)),u2=cross(f,e2);
    float lon=atan(dot(n,e2),dot(n,f)),lat=asin(clamp(dot(n,u2),-1.,1.));
    vec3 alb=hasTex>.5?lin(texture(sM,vec2(lon/(2.*PI)+.5,.5-lat/PI)).rgb):vec3(.12);
    vec3 L=normalize(sunP-h);float lam=max(0.,dot(n,L));float ls=lam/(lam+max(0.,dot(n,-d))+1e-3)*2.;
    float sh=max(0.,dot(n,normalize(-h)));
    col=alb*(sunI*3.*mix(lam,ls,.5)+eshine*vec3(.03,.045,.07)*sh);open=false;tA=min(tA,tM);}
  else if(tE>0.){vec3 h=ro+d*tE,n=normalize(h);float lat=asin(clamp(n.y,-1.,1.)),lon=atan(-n.z,n.x);vec2 tuv=vec2(lon/(2.*PI)+.5,.5-lat/PI);
    vec3 alb=hasTex>.5?lin(texture(sE,tuv).rgb):vec3(.1,.2,.4);float cl=hasTex>.5?texture(sC,tuv).r:0.;
    vec3 L=normalize(sunP-h);float mu=dot(n,L);float v=sunVis(h);vec3 Ts=trans(odSun(h+n*1e-4,L));
    vec3 E=sunI*v*Ts*max(0.,mu);
    vec3 surf=mix(alb,vec3(.85),cl*.9);col=surf*E*.9+surf*.004*sunI*v;
    /* brilho do mar */
    float ocean=smoothstep(.02,.0,alb.r-alb.b*.6)*(1.-cl);vec3 rf=reflect(d,n);col+=ocean*E*.6*pow(max(0.,dot(rf,L)),60.);
    vec3 night=hasTex>.5?lin(texture(sN,tuv).rgb):vec3(0);col+=night*vec3(1.,.8,.5)*.25*smoothstep(.05,-.15,mu)*(1.-cl*.7);}
  if(open){
    /* ---- Sol, cromosfera, protuberâncias e coroa (espaço de desenho) ---- */
    vec3 sm=sunP-ro;float sd=length(sm);vec3 ns=sm/sd;float as=asin(min(1.,sunR/sd));float th=ang(d,ns);float rho=th/as;
    vec3 ua=normalize(cross(ns,abs(ns.y)<.9?vec3(0,1,0):vec3(1,0,0))),va=cross(ns,ua);float phi=atan(dot(d,va),dot(d,ua));vec2 ph=vec2(cos(phi),sin(phi));
    if(rho<1.){float mu=sqrt(max(0.,1.-rho*rho));vec2 sp=vec2(dot(d,ua),dot(d,va))/as;
      float gr=.85+.3*fbm2(sp*38.+T*.05);col+=vec3(1.,.93,.82)*sunI*sunDisk*900.*(.3+.7*mu)*mix(vec3(1),vec3(1.,.75,.5),1.-mu)*gr;}
    else{float r=rho;
      float str=.35+1.6*pow(fbm2(vec2(phi*2.2,log(r)*.7)+ph*1.3),2.5)+.18*pow(n2(vec2(phi*11.,log(r)*.5)),2.);
      float pol=1.-.45*pow(abs(dot(ph,vec2(0.,1.))),4.);
      float k=corI*sunI*(1.2*pow(r,-7.)+.5*pow(r,-3.2)*str*pol)*smoothstep(9.,2.,r);
      col+=vec3(1.,.95,.88)*k;
      /* cromosfera: anel fino vermelho-alaranjado; protuberâncias */
      col+=corI*sunI*vec3(1.,.3,.08)*6.*exp(-(r-1.)*220.);
      float pr=smoothstep(.62,.8,fbm2(vec2(phi*9.,(r-1.)*60.)+3.))*exp(-(r-1.)*28.)*step(1.,r);
      col+=corI*sunI*vec3(1.,.36,.1)*7.*pr;}
    col+=(stars(d,150.,.975)*1.5+stars(d,380.,.985)+stars(d,800.,.99)*.7)*starK*.006;}
  /* ---- atmosfera: espalhamento simples, com a sombra da Lua em cada amostra ---- */
  if(skyK>0.){vec2 a=sph(ro,d,RA*RA);float t0=max(a.x,0.),t1=min(a.y,tA);
    if(a.y>0.&&t1>t0){vec3 ins=vec3(0);vec2 od=vec2(0);float mu=dot(d,lsD);float pR=.0597*(1.+mu*mu);float g=.76;float pM=.1194*(1.-g*g)*(1.+mu*mu)/((2.+g*g)*pow(1.+g*g-2.*g*mu,1.5));
      const int N=22;float prev=t0;
      for(int i=0;i<N;i++){float u=(float(i)+.5)/float(N);float t=t0+(t1-t0)*u*u;float dt=(t1-t0)*(2.*u/float(N));
        vec3 p=ro+d*t;float h=length(p)-1.;vec2 dn=vec2(exp(-h/HR),exp(-h/HM));od+=dn*dt;
        vec3 Tv=trans(od);vec3 l=normalize(sunP-p);float v=sunVis(p);vec3 Ts=trans(odSun(p,l));
        /* luz direta espalhada + um pouco de luz de várias reflexões (céu escuro, não preto, na totalidade) */
        ins+=Tv*(BR*dn.x*(pR*v*Ts+.012*(.03+.97*v))+BM*dn.y*pM*v*Ts)*dt;}
      col=col*trans(od)+ins*sunI*6.*skyK;}}
  o=vec4(col,1.);}`;
/* pós-processamento: o mesmo do LENS (acumula subquadros, bloom em 4 níveis, ACES) */
const ACC=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s;uniform float k;void main(){o=min(texture(s,uv)*k,vec4(6e4));}`;
const BRIGHT=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s;uniform vec2 px;void main(){
  vec3 c=vec3(0);for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)c+=min(texture(s,uv+vec2(i,j)*px).rgb,vec3(60.));c/=9.;
  float l=max(c.r,max(c.g,c.b));o=vec4(c*smoothstep(1.,4.,l),1.);}`;
const BLUR=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s;uniform vec2 dir;void main(){
  float w[5]=float[](.227027,.1945946,.1216216,.054054,.016216);vec3 c=texture(s,uv).rgb*w[0];
  for(int i=1;i<5;i++){c+=texture(s,uv+dir*float(i)).rgb*w[i];c+=texture(s,uv-dir*float(i)).rgb*w[i];}o=vec4(c,1.);}`;
const FINAL=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s,b0,b1,b2,b3;uniform float bloom,ex,asp;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 c=texture(s,uv).rgb;vec3 bl=texture(b0,uv).rgb*.5+texture(b1,uv).rgb*.6+texture(b2,uv).rgb*.8+texture(b3,uv).rgb*1.;
  c=(c+bl*bloom*.35)*ex;vec2 q=uv-.5;q.x*=asp;c*=1.-.3*smoothstep(.35,.95,length(q));
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
function tex(P,name,unit,t){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t.t||t);gl.uniform1i(P.U[name],unit)}
/* texturas NASA (FX.IMG, chaves geo:*), com mipmap e repetição na longitude */
function upTex(){const I=(typeof FX!=='undefined'&&FX.IMG)||{};const mk=k=>{const im=I['geo:'+k];if(!im)return null;const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t};
  const T={E:mk('terra.jpg'),N:mk('noite.jpg'),C:mk('nuvens.jpg'),M:mk('lua.jpg')};T.ok=!!(T.E&&T.M);
  if(T.ok){for(const k of 'NC')if(!T[k])T[k]=T.E}return T}
function init(w,h,o={}){W=w;H=h;const sc=o.scale||1;RW=Math.round(w*sc);RH=Math.round(h*sc);
  cv=document.createElement('canvas');cv.width=W;cv.height=H;gl=cv.getContext('webgl2',{preserveDrawingBuffer:true,antialias:false});
  if(!gl)throw new Error('WebGL2 indisponível');gl.getExtension('EXT_color_buffer_float');gl.getExtension('OES_texture_float_linear');
  quad=gl.createVertexArray();gl.bindVertexArray(quad);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  dummy=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,dummy);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([20,20,20,255]));
  progs={tr:prog(TRACE),acc:prog(ACC),br:prog(BRIGHT),bl:prog(BLUR),fin:prog(FINAL)};
  fb.one=target(RW,RH);fb.acc=target(RW,RH);fb.mip=[];let mw=RW>>1,mh=RH>>1;for(let i=0;i<4;i++){fb.mip.push([target(mw,mh),target(mw,mh)]);mw=Math.max(8,mw>>1);mh=Math.max(8,mh>>1)}
  ECL.canvas=cv;return cv}
function camBasis(c){const f=V.nrm(V.sub(c.tgt,c.pos));let up=c.up||[0,1,0];const r=V.nrm(V.crs(f,up));const u=V.crs(r,f);return{f,r,u,k:Math.tan((c.fov||40)*Math.PI/360)}}
/* geometria do eclipse em JS (a mesma do shader) */
function cover(a,b,d){b/=a;d/=a;if(d>=1+b)return 0;if(d<=Math.abs(1-b))return Math.min(1,b*b);const C=x=>Math.acos(Math.max(-1,Math.min(1,x)));
  return(C((d*d+1-b*b)/(2*d))+b*b*C((d*d+b*b-1)/(2*d*b))-.5*Math.sqrt(Math.max(0,(-d+1+b)*(d+1-b)*(d-1+b)*(d+1+b))))/Math.PI}
function vis(p,sun,moon){const s=V.sub(sun.p,p),m=V.sub(moon.p,p),ds=V.len(s),dm=V.len(m);if(dm>ds)return 1;
  const th=2*Math.asin(Math.min(1,V.len(V.sub(V.mul(s,1/ds),V.mul(m,1/dm)))/2));return 1-cover(Math.asin(Math.min(1,sun.r/ds)),Math.asin(Math.min(1,moon.r/dm)),th)}
function geo(lat,lon,elev,az){const R=Math.PI/180,la=lat*R,lo=lon*R;const up=[Math.cos(la)*Math.cos(lo),Math.sin(la),-Math.cos(la)*Math.sin(lo)];
  const east=V.nrm(V.crs([0,1,0],up)),north=V.crs(up,east),e=elev*R,a=az*R;
  const S=V.nrm(V.add(V.mul(up,Math.sin(e)),V.mul(V.add(V.mul(north,Math.cos(a)),V.mul(east,Math.sin(a))),Math.cos(e))));return{G:up,S,up,east,north}}
const line=(G,S,d)=>V.add(G,V.mul(S,d));
function frame(camFn,T,o={}){const n=o.sub||8,shu=(o.shutter??.5)/30;
  if(!texs&&typeof FX!=='undefined'&&FX.IMG&&FX.IMG['geo:terra.jpg'])texs=upTex();
  const P=progs.tr;
  /* exposição: 'auto' segue a fração do Sol visível da câmera (dia ≈ 2,4; totalidade ≈ 17), como o olho/câmera se adaptando */
  const c0=camFn(T),b0=o.bodies(T),exAuto=1/(.06+.35*vis(c0.pos,b0.sunQ||b0.sun,b0.moonQ||b0.moon));
  const ex=o.exp==='auto'?exAuto:typeof o.exp==='function'?o.exp(exAuto):(o.exp??1);
  use(progs.acc,fb.acc);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
  for(let i=0;i<n;i++){const ti=T+((i+.5)/n-.5)*shu,c=camFn(ti),B=camBasis(c),bd=o.bodies(ti);const sQ=bd.sunQ||bd.sun,mQ=bd.moonQ||bd.moon;
    use(P,fb.one);const U=P.U;const alt=V.len(c.pos)-1;
    gl.uniform3fv(U.ro,c.pos);gl.uniform1f(U.alt,alt);gl.uniform3fv(U.cf,B.f);gl.uniform3fv(U.cr,B.r);gl.uniform3fv(U.cu,B.u);gl.uniform1f(U.tf,B.k);gl.uniform1f(U.asp,RW/RH);
    gl.uniform1f(U.T,ti);gl.uniform3fv(U.sunP,bd.sun.p);gl.uniform1f(U.sunR,bd.sun.r);gl.uniform3fv(U.moonP,bd.moon.p);gl.uniform1f(U.moonR,bd.moon.r);
    gl.uniform3fv(U.sunQ,sQ.p);gl.uniform1f(U.sunRq,sQ.r);gl.uniform3fv(U.moonQ,mQ.p);gl.uniform1f(U.moonRq,mQ.r);
    gl.uniform1f(U.sunI,o.sunI??1);gl.uniform1f(U.corI,o.corona??1);gl.uniform1f(U.skyK,o.sky??1);gl.uniform1f(U.starK,o.stars??1);gl.uniform1f(U.hillK,o.hills??1);
    gl.uniform1f(U.sunDisk,o.sunDisk??1);gl.uniform1f(U.eshine,o.eshine??.3);gl.uniform3fv(U.land,o.land||[.0004,.00034,.0003]);gl.uniform1f(U.hasTex,texs&&texs.ok?1:0);
    /* sem textura ainda: amostradores apontam para um 1×1 (nunca para o alvo em que se desenha) */
    const tx=texs&&texs.ok?texs:{E:dummy,N:dummy,C:dummy,M:dummy};tex(P,'sE',4,tx.E);tex(P,'sN',5,tx.N);tex(P,'sC',6,tx.C);tex(P,'sM',7,tx.M);
    const hal=(k,b)=>{let f=1,r=0;while(k>0){f/=b;r+=f*(k%b);k=Math.floor(k/b)}return r};gl.uniform2f(U.jit,hal(i+1,2)-.5,hal(i+1,3)-.5);gl.uniform2f(U.res,RW,RH);
    draw();
    use(progs.acc,fb.acc);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);tex(progs.acc,'s',0,fb.one);gl.uniform1f(progs.acc.U.k,ex/n);draw();gl.disable(gl.BLEND)}
  let src=fb.acc;fb.mip.forEach(m=>{use(progs.br,m[0]);tex(progs.br,'s',0,src);gl.uniform2f(progs.br.U.px,1/src.w,1/src.h);draw();
    for(let k=0;k<2;k++){use(progs.bl,m[1]);tex(progs.bl,'s',0,m[0]);gl.uniform2f(progs.bl.U.dir,1.5/m[0].w,0);draw();use(progs.bl,m[0]);tex(progs.bl,'s',0,m[1]);gl.uniform2f(progs.bl.U.dir,0,1.5/m[0].h);draw()}
    src=m[0]});
  use(progs.fin,null);tex(progs.fin,'s',0,fb.acc);fb.mip.forEach((m,i)=>tex(progs.fin,'b'+i,i+1,m[0]));gl.uniform1f(progs.fin.U.bloom,o.bloom??1);gl.uniform1f(progs.fin.U.ex,1);gl.uniform1f(progs.fin.U.asp,W/H);draw();
  return cv}
function proj(c,p){const B=camBasis(c),d=V.sub(p,c.pos),z=V.dot(d,B.f);if(z<=1e-9)return null;const x=V.dot(d,B.r)/(z*B.k),y=V.dot(d,B.u)/(z*B.k);
  return[W/2+x*H/2,H/2-y*H/2,z]}
return{init,frame,proj,camBasis,vis,geo,line,cover,REAL,V,get W(){return W},get H(){return H}}})();
