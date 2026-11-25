/* ---------- RIO3D: o Rio de Janeiro em 3D na GPU (WebGL2), à noite, com o mar subindo ----------
   Dados (tools/rio_prep.py, meta.json "rio3d": true): relevo real em grade de 12 m (AWS Terrain Tiles: SRTM + GEBCO, com o fundo do mar),
   imagem de satélite Sentinel-2 cloudless 2016 (EOX, CC BY 4.0) a 4 m por pixel, 15.909 prédios do OpenStreetMap (ODbL) extrudados.
   Mundo em metros: x para leste, y para cima, z para o sul; origem em lat −22,9575, lon −43,225 (Botafogo).
   Cada quadro: mapa de sombra visto da Lua → reflexo (cena espelhada no plano do mar) → cena (céu com a Lua de verdade, relevo
   iluminado pela Lua com sombra, luzes da cidade, prédios com janelas, mar com ondas, Fresnel, rastro de brilho da Lua, espuma na
   arrebentação e na linha d'água, água por cima do que afundou) → brilho (bloom) e tone mapping.
   RIO3D.frame({eye,target,fov(graus),moon:{dir,ang (raio angular, rad),sun (opcional: direção do Sol → fase física da Lua, terminador nítido e luz cinzenta)},level (m),t,lit 0..1 (Lua grande clareia o céu),red,exposure})
     → canvas WebGL do tamanho da tela; desenhe com ctx.drawImage(RIO3D.canvas,0,0)
   RIO3D.proj(p) → [x,y,z] na tela (mesma câmera)      RIO3D.height(x,z) → altitude do relevo (m)      RIO3D.ll(lat,lon) → [x,z]
   RIO3D.PLACES  pontos com nome e altitude (Pão de Açúcar, Urca, Leme, Corcovado, Gávea, Tijuca, Copacabana) */
const RIO3D=(()=>{
  const R=typeof __RIO__!=='undefined'?__RIO__:null;
  let gl=null,cv=null,P={},B={},T={},ready=false,HT=null,nTer=0,nBld=0,cam=null,SW=0,SH=0,FB={};
  const ll=(lat,lon)=>[(lon-R.lon0)*R.mx,-(lat-R.lat0)*R.mz];
  const PLACES=R?[['PÃO DE AÇÚCAR',-22.9495,-43.1558,396],['MORRO DA URCA',-22.9516,-43.1651,220],['COPACABANA',-22.9711,-43.1822,4],
    ['CORCOVADO',-22.9517,-43.2117,710],['PEDRA DA GÁVEA',-22.9988,-43.2844,844],['PICO DA TIJUCA',-22.9437,-43.2864,1021]].map(([n,a,b,h])=>({name:n,p:ll(a,b),h})):[];
  /* ---------- relevo na CPU (para câmera, rótulos e o mar) ---------- */
  function height(x,z){if(!HT)return 0;const fx=(x-R.x0)/R.step,fz=(z-R.z0)/R.step,i=Math.max(0,Math.min(R.nx-2,Math.floor(fx))),j=Math.max(0,Math.min(R.nz-2,Math.floor(fz))),u=Math.max(0,Math.min(1,fx-i)),v=Math.max(0,Math.min(1,fz-j));
    const a=HT[j*R.nx+i],b=HT[j*R.nx+i+1],c=HT[(j+1)*R.nx+i],d=HT[(j+1)*R.nx+i+1];return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v}
  /* ---------- matrizes (coluna principal) ---------- */
  const M4={persp(f,a,n,fr){const t=1/Math.tan(f/2);return new Float32Array([t/a,0,0,0,0,t,0,0,0,0,(fr+n)/(n-fr),-1,0,0,2*fr*n/(n-fr),0])},
    look(e,c,u){const z=nrm3(sub3(e,c)),x=nrm3(cr3(u,z)),y=cr3(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dt3(x,e),-dt3(y,e),-dt3(z,e),1])},
    ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1])},
    mul(a,b){const o=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k];o[i*4+j]=s}return o},
    xf(m,p){const x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],z=m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14],w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return [x/w,y/w,z/w,w]}};
  const sub3=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cr3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dt3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm3=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l]};

  /* ---------- shaders ---------- */
  const HEAD=`#version 300 es
precision highp float;precision highp sampler2DShadow;`;
  const COMMON=`
uniform vec3 uEye,uMoon,uMoonUp;uniform vec4 uMoonSun;uniform float uMoonAng,uLevel,uT,uLit,uRed,uClip,uMoonI;
uniform sampler2D uSat,uHgt,uLua;uniform sampler2DShadow uShadow;uniform mat4 uShadowM;uniform vec4 uBox;uniform vec2 uHres;
float hash(vec2 p){p=fract(mod(p,4096.)*vec2(.1031,.1030)*7.13);p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=mod(floor(p),1024.),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p*=2.03;a*=.5;}return s;}
float hgt(vec2 xz){vec2 f=(xz-uBox.xy)/uBox.zw*uHres;vec2 i=floor(f),u=f-i;
  float a=texelFetch(uHgt,ivec2(clamp(i,vec2(0),uHres-1.)),0).r,b=texelFetch(uHgt,ivec2(clamp(i+vec2(1,0),vec2(0),uHres-1.)),0).r,c=texelFetch(uHgt,ivec2(clamp(i+vec2(0,1),vec2(0),uHres-1.)),0).r,d=texelFetch(uHgt,ivec2(clamp(i+vec2(1,1),vec2(0),uHres-1.)),0).r;
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
vec3 sky(vec3 v){float el=max(v.y,-.02),k=uLit,h=exp(-max(el,0.)/.18);
  vec3 c=mix(vec3(.004,.007,.02),vec3(.03,.07,.19),k)+mix(vec3(.01,.016,.04),vec3(.11,.16,.26),k)*h;
  float az=atan(v.x,-v.z);c+=vec3(.11,.065,.03)*exp(-pow((az+1.2)/.9,2.))*exp(-max(el,0.)/.05)*(1.-k*.5);
  float m=dot(v,uMoon),an=acos(clamp(m,-1.,1.));float au=(.12+.5*k)*(.35*exp(-max(an-uMoonAng,0.)/.045)+.07*exp(-an/.4));c+=au*vec3(.86,.92,1.);
  c+=uRed*vec3(.25*exp(-max(el,0.)/.3)+.04,.06*exp(-max(el,0.)/.3)+.008,.01);return c;}
vec3 moonDisk(vec3 v){float m=dot(v,uMoon);float ca=cos(uMoonAng);if(m<ca)return vec3(0);
  vec3 r=normalize(cross(uMoon,uMoonUp)),u=cross(r,uMoon);float x=dot(v,r)/sin(uMoonAng),y=dot(v,u)/sin(uMoonAng);float rr=x*x+y*y;float aa=max(fwidth(rr)*1.5,.002);if(rr>1.)return vec3(0);
  float zz=sqrt(1.-rr);float lon=atan(x,zz),lat=asin(y);vec3 tx=texture(uLua,vec2(lon/6.2831853+.5,.5-lat/3.14159265)).rgb;tx=pow(tx,vec3(2.2));
  float sh=.75+.25*zz;if(uMoonSun.w>.5){vec3 nn=r*x+u*y-uMoon*zz;float ld=dot(nn,uMoonSun.xyz),dy=clamp((ld+.012)/.03,0.,1.);sh=dy*max(ld,0.)/(max(ld,0.)+zz+.02)*2.+.05*(1.-dy);}
  return tx*uMoonI*sh*smoothstep(1.,1.-aa,rr);}
float shadowAt(vec3 wp,vec3 n){vec4 s=uShadowM*vec4(wp+n*1.5,1.);vec3 q=s.xyz/s.w*.5+.5;if(q.x<0.||q.x>1.||q.y<0.||q.y>1.)return 1.;
  float sh=0.;for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)sh+=texture(uShadow,vec3(q.xy+vec2(i,j)/2048.,q.z-.0015));return sh/9.;}
vec3 fogit(vec3 c,vec3 wp){float d=length(wp-uEye);vec3 v=normalize(wp-uEye);return mix(c,sky(vec3(v.x,.004,v.z)),1.-exp(-d/14000.));}
`;
  const VS_T=HEAD+`
in vec3 aP;uniform mat4 uVP;out vec3 vP;void main(){vP=aP;gl_Position=uVP*vec4(aP,1.);}`;
  const FS_T=HEAD+COMMON+`
in vec3 vP;out vec4 o;
void main(){if(uClip>.5&&vP.y<uLevel-.2)discard;
  vec2 uv=(vP.xz-uBox.xy)/uBox.zw;float e=4.;
  vec3 n=normalize(vec3(hgt(vP.xz-vec2(e,0))-hgt(vP.xz+vec2(e,0)),2.*e,hgt(vP.xz-vec2(0,e))-hgt(vP.xz+vec2(0,e))));
  vec3 al=min(pow(texture(uSat,uv).rgb,vec3(2.2)),vec3(.28));float d=length(vP-uEye);
  /* detalhe perto da câmera: grão e ondulação da areia, rugosidade da mata */
  float det=fbm(vP.xz*.8)*.5+fbm(vP.xz*6.)*.5;al*=mix(1.,.7+.6*det,clamp(1.-d/800.,0.,1.));
  /* areia de perto: marcas de vento, pegadas e grão */
  if(vP.y>.3&&vP.y<4.5&&d<120.){float k=clamp(1.-d/120.,0.,1.);float rip=.5+.5*sin(dot(vP.xz,vec2(.8,1.9))*2.2+fbm(vP.xz*.4)*7.);
    vec2 fp=vP.xz*.55;vec2 fi=floor(fp),ff=fract(fp)-.5-(vec2(hash(fi+3.),hash(fi+7.))-.5)*.5;float ra=hash(fi+11.)*6.28;ff=mat2(cos(ra),-sin(ra),sin(ra),cos(ra))*ff;float pe=step(.8,hash(fi))*smoothstep(.16,.05,length(ff*vec2(1.,2.2)))*.8;
    float gr=hash(floor(vP.xz*60.));al*=mix(1.,(.82+.3*rip)*(1.-.45*pe)*(.85+.3*gr),k);}
  float al0=dot(al,vec3(.3,.59,.11));vec3 alN=mix(vec3(al0),al,.55);
  float lum=dot(al,vec3(.3,.59,.11)),sat=length(al-vec3(lum)),green=al.g-max(al.r,al.b);
  float sh=shadowAt(vP,n),nl=max(dot(n,uMoon),0.);
  vec3 c=alN*(vec3(.75,.85,1.)*uMoonI*.95*nl*sh+sky(n)*1.1+.006);
  /* luzes da cidade: postes em grade, mais densos onde o satélite mostra área urbana (cinza, sem verde) */
  float urb=smoothstep(.02,.06,lum)*smoothstep(.06,.0,green)*smoothstep(.2,.05,sat)*step(4.,vP.y);
  vec2 g=vP.xz/14.;vec2 gi=floor(g),gf=fract(g)-.5;float hs=hash(gi);float lamp=step(.55,hs)*smoothstep(.22,.0,length(gf))*urb;
  c+=lamp*mix(vec3(1.,.62,.3),vec3(1.,.9,.75),step(.85,hs))*2.2+urb*vec3(1.,.6,.3)*.035;
  /* debaixo d'água: escurece e esverdeia com a profundidade */
  /* areia: luz quente dos postes da avenida (mais forte longe da água, onde fica o calçadão) */
  float dw=(vP.y-.4)/.022,sand=smoothstep(.05,.12,lum)*step(vP.y,4.5)*step(.3,vP.y);c+=sand*al0*vec3(1.,.6,.3)*.9*smoothstep(40.,150.,dw)*(1.-smoothstep(150.,200.,dw));
  float dep=uLevel-vP.y;if(dep>0.){c=mix(c*vec3(.6,.85,.9),vec3(.002,.012,.016),1.-exp(-dep*.18));}
  o=vec4(fogit(c,vP),1.);}`;
  const VS_B=HEAD+`
in vec3 aP;in vec3 aN;in vec3 aW;uniform mat4 uVP;out vec3 vP;out vec3 vN;out vec3 vW;void main(){vP=aP;vN=aN;vW=aW;gl_Position=uVP*vec4(aP,1.);}`;
  const FS_B=HEAD+COMMON+`
in vec3 vP;in vec3 vN;in vec3 vW;out vec4 o;
void main(){if(uClip>.5&&vP.y<uLevel-.2)discard;
  vec3 n=normalize(vN);float sh=shadowAt(vP,n),nl=max(dot(n,uMoon),0.);float seed=vW.z;
  vec3 base=mix(vec3(.16,.155,.15),vec3(.26,.25,.23),hash(vec2(seed,1.)));if(n.y>.5)base*=.6;
  vec3 c=base*(vec3(.75,.85,1.)*uMoonI*.55*nl*sh+sky(n)*.6+.003);
  if(n.y<.5){/* janelas: andares de 3,1 m, colunas de 3,2 m; acesas por sorteio (amarela, branca ou azul de TV) */
    float fl=floor((vP.y-vW.y)/3.1),col=floor(vW.x/3.2);vec2 f=vec2(fract(vW.x/3.2),fract((vP.y-vW.y)/3.1));
    float win=step(.18,f.x)*step(f.x,.82)*step(.25,f.y)*step(f.y,.8)*step(1.,fl);float r=hash(vec2(col+seed*13.,fl+seed*7.));
    vec3 wc=r<.06?vec3(.45,.6,1.)*(.8+.2*sin(uT*7.+r*90.)):r<.2?vec3(1.,.97,.9):vec3(1.,.72,.4);float on=step(r,.42)*win;
    float under=step(vP.y,uLevel);c=mix(c,c*.6+wc*1.6,on*(1.-under));c+=win*.01;}
  float dep=uLevel-vP.y;if(dep>0.)c=mix(c,vec3(.002,.012,.016),1.-exp(-dep*.25));
  o=vec4(fogit(c,vP),1.);}`;
  const VS_S=HEAD+`in vec3 aP;uniform mat4 uVP;void main(){gl_Position=uVP*vec4(aP,1.);}`;
  const FS_S=HEAD+`out vec4 o;void main(){o=vec4(1);}`;
  /* céu: quad de tela inteira, direção pelo inverso da câmera */
  const VS_Q=HEAD+`in vec2 aQ;out vec2 vQ;void main(){vQ=aQ;gl_Position=vec4(aQ,.9999,1.);}`;
  const FS_SKY=HEAD+COMMON+`
in vec2 vQ;out vec4 o;uniform vec3 uCF,uCR,uCU;uniform vec2 uTan;uniform float uMirror;
void main(){vec3 v=normalize(uCF+vQ.x*uTan.x*uCR+vQ.y*uTan.y*uCU);if(uMirror>.5)v.y=-v.y;
  vec3 c=sky(v)+moonDisk(v);
  /* estrelas: somem quando a Lua clareia o céu */
  vec3 sv=v*420.;vec3 si=floor(sv);float h=fract(sin(dot(si,vec3(12.9898,78.233,37.719)))*43758.5453);
  if(h>.9965&&v.y>.03){vec3 sf=fract(sv)-.5;float s=smoothstep(.16,.0,length(sf))*(h-.9965)/.0035;c+=s*vec3(1.,.97,.92)*1.3*(1.-smoothstep(.05,.6,uLit))*(.7+.3*sin(uT*3.+h*99.));}
  o=vec4(c,1.);}`;
  const VS_W=HEAD+`in vec3 aP;uniform mat4 uVP;uniform vec3 uOff;out vec3 vP;void main(){vP=aP+uOff;gl_Position=uVP*vec4(vP,1.);}`;
  const FS_W=HEAD+COMMON+`
in vec3 vP;out vec4 o;uniform sampler2D uRefl;uniform vec2 uRes;
vec2 wav(vec2 p,float t,float k){vec2 g=vec2(0);
  /* 12 ondas em direções espalhadas em volta do vento (de sudeste), comprimentos de 80 m a 1,5 m, fases sorteadas */
  for(int i=0;i<12;i++){float fi=float(i),h1=fract(sin(fi*91.7)*4375.85),h2=fract(sin(fi*37.3)*9123.4),lam=70.*pow(.72,fi)*(.7+.6*h1),a=lam*.009*(.6+.8*h2),ang=2.4+(h1-.5)*2.6,kk=6.2831/lam;
    vec2 d=vec2(cos(ang),sin(ang));float w=sqrt(9.8*kk);float att=1./(1.+pow(k*kk*.3,2.));g+=d*kk*a*cos(dot(d,p)*kk-w*t+h2*6.28)*att;}
  /* marola: gradiente de ruído em duas escalas */
  for(int o=0;o<2;o++){float sc=o==0?.09:.6,amp=o==0?2.6:.9,e=.4/sc;vec2 q=p*sc+vec2(t*.15,-t*.1)*(1.+float(o));float nz=fbm(q);
    g+=vec2(fbm(q+vec2(.4,0))-nz,fbm(q+vec2(0,.4))-nz)/.4*sc*amp/(1.+k*sc*3.);}
  return g;}
void main(){float th=hgt(vP.xz),dep=uLevel-th;if(dep<-.05)discard;
  vec3 V=normalize(vP-uEye);float d=length(vP-uEye),foot=d*2./(uRes.y*1.2)/max(.02,-V.y);
  float shallow=clamp(dep/3.,0.,1.);vec2 g=wav(vP.xz,uT,foot)*(.35+.65*shallow);vec3 n=normalize(vec3(-g.x,1.,-g.y));
  float cs=max(0.,-dot(V,n)),F=.02+.98*pow(1.-cs,5.);vec3 Rv=reflect(V,n);
  vec2 su=gl_FragCoord.xy/uRes;vec3 rc=texture(uRefl,su+n.xz*.03).rgb;
  float mr=dot(Rv,uMoon),gl2=mr>cos(uMoonAng*1.05)?1.:.45*exp(-(acos(clamp(mr,-1.,1.))-uMoonAng)/(.008+uMoonAng*.06));rc+=gl2*uMoonI*vec3(.95,.93,.86)*.9;
  vec3 body=vec3(.003,.010,.016)+vec3(.012,.03,.034)*uMoonI*.35;float op=1.-exp(-(dep+.5)*.6);
  /* arrebentação: cristas que andam para o raso, espuma rendada atrás, borda espumando na linha d'água */
  float fo=0.;if(uLevel<1.){float u=fract(dep*.55+uT*.11+fbm(vP.xz*.015)*.9),brk=smoothstep(3.6,1.4,dep)*smoothstep(0.,.3,dep),n1=fbm(vP.xz*.35+uT*.15)+.5*fbm(vP.xz*1.3);
    float sec=smoothstep(.35,.6,fbm(vP.xz*.006+vec2(uT*.01,0.)));fo=brk*sec*(smoothstep(0.,.01,u)*smoothstep(.1,.04,u)*clamp(.5+n1,0.,1.)+smoothstep(.5,.08,u)*.55*smoothstep(.42+u*1.7,.5+u*1.7,n1+.55));}
  fo+=smoothstep(.35,.0,dep)*clamp(.5+fbm(vP.xz*.8+uT*.4),0.,1.);
  if(uLevel>=1.)fo+=smoothstep(2.5,0.,dep)*clamp(fbm(vP.xz*.25+uT*.5)*1.4-.2,0.,1.)*.8;
  fo=clamp(fo,0.,1.)*.85;vec3 foc=vec3(.85,.88,.9)*(uMoonI*.42+.04);
  vec3 col=rc*F+body*(1.-F);float al=clamp(F+(1.-F)*op,0.,1.);col=mix(col,foc,fo);al=max(al,fo);
  o=vec4(fogit(col,vP)*al,al);}`;
  /* pós: bloom simples e ACES */
  const FS_BRIGHT=HEAD+`in vec2 vQ;out vec4 o;uniform sampler2D uS;void main(){vec3 c=texture(uS,vQ*.5+.5).rgb;o=vec4(max(c-vec3(.9),0.),1.);}`;
  const FS_BLUR=HEAD+`in vec2 vQ;out vec4 o;uniform sampler2D uS;uniform vec2 uDir;void main(){vec2 uv=vQ*.5+.5;vec3 c=vec3(0);float w[5]=float[](.227,.194,.121,.054,.016);
    c+=texture(uS,uv).rgb*w[0];for(int i=1;i<5;i++){c+=texture(uS,uv+uDir*float(i)).rgb*w[i];c+=texture(uS,uv-uDir*float(i)).rgb*w[i];}o=vec4(c,1.);}`;
  const FS_TONE=HEAD+`in vec2 vQ;out vec4 o;uniform sampler2D uS,uB;uniform float uExp;
    vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
    void main(){vec2 uv=vQ*.5+.5;vec3 c=texture(uS,uv).rgb+texture(uB,uv).rgb*.8;c=aces(c*uExp);c=pow(c,vec3(1./2.2));float vg=1.-.25*pow(length(vQ*vec2(.8,1.)),2.);o=vec4(c*vg,1.);}`;

  function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('RIO3D shader: '+gl.getShaderInfoLog(s));return s}
  function prog(vs,fs){const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('RIO3D link: '+gl.getProgramInfoLog(p));
    const U={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const u=gl.getActiveUniform(p,i);U[u.name.replace('[0]','')]=gl.getUniformLocation(p,u.name)}return {p,U}}
  function tex2(img,o={}){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,o.wrap?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,8);return t}
  function fbo(w,h,o={}){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
    let d=null;if(o.depth){d=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,d);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,d)}
    return {f,t,w,h}}
  function buf(data,attrs,prog_,stride){const v=gl.createVertexArray();gl.bindVertexArray(v);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    for(const [name,size,off] of attrs){for(const pr of prog_){const l=gl.getAttribLocation(pr.p,name);if(l<0)continue;gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,stride*4,off*4)}}return v}

  function init(){if(gl||!R)return !!gl;const A=FX.IMG&&FX.IMG['geo:rio_alt.png'],S=FX.IMG&&FX.IMG['geo:rio_sat.jpg'],L=FX.IMG&&FX.IMG['geo:lua.jpg'];if(!A||!S||!L)return false;
    cv=document.createElement('canvas');cv.width=W;cv.height=H;gl=cv.getContext('webgl2',{antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('sem WebGL2');gl.getExtension('EXT_color_buffer_float');
    /* altitudes */const c2=document.createElement('canvas');c2.width=A.width;c2.height=A.height;const x2=c2.getContext('2d');x2.drawImage(A,0,0);const px=x2.getImageData(0,0,A.width,A.height).data;
    HT=new Float32Array(R.nx*R.nz);for(let i=0;i<HT.length;i++)HT[i]=(px[i*4]*256+px[i*4+1])/10-200;
    T.hgt=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,T.hgt);gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,R.nx,R.nz,0,gl.RED,gl.FLOAT,HT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    T.sat=tex2(S);T.lua=tex2(L,{wrap:true});
    P.t=prog(VS_T,FS_T);P.b=prog(VS_B,FS_B);P.s=prog(VS_S,FS_S);P.sky=prog(VS_Q,FS_SKY);P.w=prog(VS_W,FS_W);P.br=prog(VS_Q,FS_BRIGHT);P.bl=prog(VS_Q,FS_BLUR);P.tone=prog(VS_Q,FS_TONE);
    /* malha do relevo */const nx=R.nx,nz=R.nz,V=new Float32Array(nx*nz*3);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=(j*nx+i)*3;V[k]=R.x0+i*R.step;V[k+1]=HT[j*nx+i];V[k+2]=R.z0+j*R.step}
    const I=new Uint32Array((nx-1)*(nz-1)*6);let q=0;for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i;I[q++]=a;I[q++]=a+nx;I[q++]=a+1;I[q++]=a+1;I[q++]=a+nx;I[q++]=a+nx+1}
    B.t=buf(V,[['aP',3,0]],[P.t,P.s],3);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,I,gl.STATIC_DRAW);nTer=I.length;gl.bindVertexArray(null);
    /* prédios: paredes (com coordenada ao longo da fachada para as janelas) e telhado em leque/orelhas */
    const Bv=[];const push=(p,n,w)=>Bv.push(p[0],p[1],p[2],n[0],n[1],n[2],w[0],w[1],w[2]);
    (R.predios||[]).forEach((b,bi)=>{const h=b[0],pts=[];for(let k=1;k<b.length;k+=2)pts.push([b[k],b[k+1]]);if(pts.length<3)return;let y0=1e9;for(const p of pts)y0=Math.min(y0,height(p[0],p[1]));if(y0<-2)return;y0=Math.max(y0,0);const y1=y0+h,seed=(bi*0.618)%1*97;
      let acc=0;for(let k=0;k<pts.length;k++){const a=pts[k],c=pts[(k+1)%pts.length],L2=Math.hypot(c[0]-a[0],c[1]-a[1]);if(L2<.3)continue;let n=[(c[1]-a[1])/L2,0,-(c[0]-a[0])/L2];
        const A0=[a[0],y0,a[1]],A1=[a[0],y1,a[1]],C0=[c[0],y0,c[1]],C1=[c[0],y1,c[1]];push(A0,n,[acc,y0,seed]);push(C0,n,[acc+L2,y0,seed]);push(C1,n,[acc+L2,y0,seed]);push(A0,n,[acc,y0,seed]);push(C1,n,[acc+L2,y0,seed]);push(A1,n,[acc,y0,seed]);acc+=L2}
      const tri=ear(pts);for(const [i0,i1,i2] of tri){for(const i of [i0,i1,i2])push([pts[i][0],y1,pts[i][1]],[0,1,0],[0,y0,seed])}});
    const BV=new Float32Array(Bv);B.b=buf(BV,[['aP',3,0],['aN',3,3],['aW',3,6]],[P.b,P.s],9);nBld=BV.length/9;
    /* mar: quadrado grande (75 km) */const s=75000,WV=new Float32Array([-s,0,-s,s,0,-s,-s,0,s,s,0,-s,s,0,s,-s,0,s]);B.w=buf(WV,[['aP',3,0]],[P.w],3);
    const QV=new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]);B.q=buf(QV,[['aQ',2,0]],[P.sky,P.br,P.bl,P.tone],2);
    SW=W;SH=H;FB.main=fbo(W,H,{depth:true});FB.refl=fbo(W>>1,H>>1,{depth:true});FB.b1=fbo(W>>2,H>>2);FB.b2=fbo(W>>2,H>>2);
    /* mapa de sombra */T.sh=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,T.sh);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT32F,2048,2048,0,gl.DEPTH_COMPONENT,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    FB.sh=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,FB.sh);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,T.sh,0);
    ready=true;return true}
  /* triangulação de polígono simples (orelhas) */
  function ear(p){const n=p.length,idx=[...Array(n).keys()];let ar=0;for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n];ar+=a[0]*b[1]-b[0]*a[1]}if(ar<0)idx.reverse();
    const out=[],cr=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);let guard=0;
    while(idx.length>3&&guard++<500){let cut=false;for(let i=0;i<idx.length;i++){const ia=idx[(i+idx.length-1)%idx.length],ib=idx[i],ic=idx[(i+1)%idx.length],a=p[ia],b=p[ib],c=p[ic];if(cr(a,b,c)<=0)continue;
        let inside=false;for(const j of idx){if(j===ia||j===ib||j===ic)continue;const q=p[j];if(cr(a,b,q)>0&&cr(b,c,q)>0&&cr(c,a,q)>0){inside=true;break}}if(inside)continue;out.push([ia,ib,ic]);idx.splice(i,1);cut=true;break}
      if(!cut)break}if(idx.length===3)out.push([idx[0],idx[1],idx[2]]);return out}

  function common(pr,o,VP,clip){const U=pr.U;gl.useProgram(pr.p);const m=o.moon;
    gl.uniform3fv(U.uEye,o.eye);gl.uniform3fv(U.uMoon,m.dir);gl.uniform3fv(U.uMoonUp,[0,1,0]);if(U.uMoonSun)gl.uniform4fv(U.uMoonSun,m.sun?[...nrm3(m.sun),1]:[0,1,0,0]);gl.uniform1f(U.uMoonAng,m.ang);gl.uniform1f(U.uLevel,o.level||0);gl.uniform1f(U.uT,o.t||0);
    gl.uniform1f(U.uLit,o.lit||0);gl.uniform1f(U.uRed,o.red||0);gl.uniform1f(U.uClip,clip?1:0);gl.uniform1f(U.uMoonI,o.moonI??(.35+.65*(o.lit||0)/.5));
    gl.uniform4fv(U.uBox,[R.x0,R.z0,R.nx*R.step,R.nz*R.step]);gl.uniform2fv(U.uHres,[R.nx,R.nz]);
    if(U.uVP)gl.uniformMatrix4fv(U.uVP,false,VP);if(U.uShadowM)gl.uniformMatrix4fv(U.uShadowM,false,o._SM);
    const bindT=(u,t,unit)=>{if(U[u]==null)return;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(U[u],unit)};
    bindT('uSat',T.sat,0);bindT('uHgt',T.hgt,1);bindT('uLua',T.lua,2);bindT('uShadow',T.sh,3)}
  function drawScene(o,VP,clip){gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    common(P.t,o,VP,clip);gl.bindVertexArray(B.t);gl.drawElements(gl.TRIANGLES,nTer,gl.UNSIGNED_INT,0);
    common(P.b,o,VP,clip);gl.bindVertexArray(B.b);gl.drawArrays(gl.TRIANGLES,0,nBld)}
  function sky(o,VP,mirror,cb){common(P.sky,o,VP,false);gl.uniform3fv(P.sky.U.uCF,cb.f);gl.uniform3fv(P.sky.U.uCR,cb.r);gl.uniform3fv(P.sky.U.uCU,cb.u);gl.uniform2fv(P.sky.U.uTan,cb.tan);gl.uniform1f(P.sky.U.uMirror,mirror?1:0);gl.depthMask(false);gl.bindVertexArray(B.q);gl.drawArrays(gl.TRIANGLES,0,6);gl.depthMask(true)}
  function frame(o){if(!ready&&!init())return null;const eye=o.eye,tg=o.target,fov=(o.fov||60)*Math.PI/180,near=Math.max(.5,(eye[1]-height(eye[0],eye[2]))*.2),far=90000;
    const Pm=M4.persp(fov,W/H,near,far),Vm=M4.look(eye,tg,[0,1,0]),VP=M4.mul(Pm,Vm);cam={VP,eye};
    const basis=(e,c)=>{const f=nrm3(sub3(c,e)),r=nrm3(cr3(f,[0,1,0])),u=cr3(r,f);return {f,r,u,tan:[Math.tan(fov/2)*W/H,Math.tan(fov/2)]}};
    /* sombra: projeção ortográfica vista da Lua cobrindo a área */
    const md=nrm3(o.moon.dir),cen=[(R.x0+R.x0+R.nx*R.step)/2,0,(R.z0+R.z0+R.nz*R.step)/2],ext=Math.max(R.nx,R.nz)*R.step*.62;
    const Sv=M4.look([cen[0]+md[0]*20000,md[1]*20000,cen[2]+md[2]*20000],cen,Math.abs(md[1])>.95?[0,0,1]:[0,1,0]),Sp=M4.ortho(-ext,ext,-ext,ext,1,45000),SM=M4.mul(Sp,Sv);o._SM=SM;
    gl.bindFramebuffer(gl.FRAMEBUFFER,FB.sh);gl.viewport(0,0,2048,2048);gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.colorMask(false,false,false,false);
    gl.useProgram(P.s.p);gl.uniformMatrix4fv(P.s.U.uVP,false,SM);gl.bindVertexArray(B.t);gl.drawElements(gl.TRIANGLES,nTer,gl.UNSIGNED_INT,0);gl.bindVertexArray(B.b);gl.drawArrays(gl.TRIANGLES,0,nBld);gl.colorMask(true,true,true,true);
    /* reflexo: câmera espelhada no plano do mar */
    const L=o.level||0,eyeM=[eye[0],2*L-eye[1],eye[2]],tgM=[tg[0],2*L-tg[1],tg[2]],VPm=M4.mul(Pm,M4.look(eyeM,tgM,[0,1,0]));
    gl.bindFramebuffer(gl.FRAMEBUFFER,FB.refl.f);gl.viewport(0,0,FB.refl.w,FB.refl.h);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    sky({...o,eye:eyeM},VPm,false,basis(eyeM,tgM));drawScene({...o,eye:eyeM},VPm,true);
    /* cena */
    gl.bindFramebuffer(gl.FRAMEBUFFER,FB.main.f);gl.viewport(0,0,W,H);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    sky(o,VP,false,basis(eye,tg));drawScene(o,VP,false);
    common(P.w,o,VP,false);gl.uniform2fv(P.w.U.uRes,[W,H]);gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,FB.refl.t);gl.uniform1i(P.w.U.uRefl,4);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.bindVertexArray(B.w);
    gl.uniform3fv(P.w.U.uOff,[eye[0],L,eye[2]]);gl.drawArrays(gl.TRIANGLES,0,6);gl.depthMask(true);gl.disable(gl.BLEND);
    /* bloom */gl.disable(gl.DEPTH_TEST);const q=(pr,src,dst,setup)=>{gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:W,dst?dst.h:H);gl.useProgram(pr.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,src.t);gl.uniform1i(pr.U.uS,0);if(setup)setup(pr.U);gl.bindVertexArray(B.q);gl.drawArrays(gl.TRIANGLES,0,6)};
    q(P.br,FB.main,FB.b1);for(let k=0;k<2;k++){q(P.bl,FB.b1,FB.b2,U=>gl.uniform2fv(U.uDir,[1.5/FB.b1.w,0]));q(P.bl,FB.b2,FB.b1,U=>gl.uniform2fv(U.uDir,[0,1.5/FB.b1.h]))}
    q(P.tone,FB.main,null,U=>{gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,FB.b1.t);gl.uniform1i(U.uB,1);gl.uniform1f(U.uExp,o.exposure??1.6)});
    return cv}
  function inv4(m){const a=m,o=new Float32Array(16);const b00=a[0]*a[5]-a[1]*a[4],b01=a[0]*a[6]-a[2]*a[4],b02=a[0]*a[7]-a[3]*a[4],b03=a[1]*a[6]-a[2]*a[5],b04=a[1]*a[7]-a[3]*a[5],b05=a[2]*a[7]-a[3]*a[6],
    b06=a[8]*a[13]-a[9]*a[12],b07=a[8]*a[14]-a[10]*a[12],b08=a[8]*a[15]-a[11]*a[12],b09=a[9]*a[14]-a[10]*a[13],b10=a[9]*a[15]-a[11]*a[13],b11=a[10]*a[15]-a[11]*a[14];
    const d=1/(b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06);
    o[0]=(a[5]*b11-a[6]*b10+a[7]*b09)*d;o[1]=(a[2]*b10-a[1]*b11-a[3]*b09)*d;o[2]=(a[13]*b05-a[14]*b04+a[15]*b03)*d;o[3]=(a[10]*b04-a[9]*b05-a[11]*b03)*d;
    o[4]=(a[6]*b08-a[4]*b11-a[7]*b07)*d;o[5]=(a[0]*b11-a[2]*b08+a[3]*b07)*d;o[6]=(a[14]*b02-a[12]*b05-a[15]*b01)*d;o[7]=(a[8]*b05-a[10]*b02+a[11]*b01)*d;
    o[8]=(a[4]*b10-a[5]*b08+a[7]*b06)*d;o[9]=(a[1]*b08-a[0]*b10-a[3]*b06)*d;o[10]=(a[12]*b04-a[13]*b02+a[15]*b00)*d;o[11]=(a[9]*b02-a[8]*b04-a[11]*b00)*d;
    o[12]=(a[5]*b07-a[4]*b09-a[6]*b06)*d;o[13]=(a[0]*b09-a[1]*b07+a[2]*b06)*d;o[14]=(a[13]*b01-a[12]*b03-a[14]*b00)*d;o[15]=(a[8]*b03-a[9]*b01+a[10]*b00)*d;return o}
  function proj(p){if(!cam)return [NaN,NaN,-1];const q=M4.xf(cam.VP,p);if(q[3]<=0)return [NaN,NaN,-1];return [(q[0]*.5+.5)*W,(1-(q[1]*.5+.5))*H,q[3]]}
  /* direção da Lua por azimute (graus, 0 = norte, 90 = leste) e elevação */
  const dirAzEl=(az,el)=>{const a=az*Math.PI/180,e=el*Math.PI/180;return [Math.sin(a)*Math.cos(e),Math.sin(e),-Math.cos(a)*Math.cos(e)]};
  return {frame,proj,height,ll,PLACES,dirAzEl,get canvas(){return cv},get ok(){return !!R}}})();
