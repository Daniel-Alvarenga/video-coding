/* ---------- IRIS: arco-íris físico, céu de tempestade, gota macro e avião, com a luz calculada por pixel na GPU (WebGL2) ----------
   Exemplo: projetos/arco-iris/. Mesmo padrão do ECL (eclipse.js): um shader de cena em HDR (float), subquadros com jitter
   (antisserrilhado, desfoque de movimento e disco do Sol de 0,53°), bloom em 4 níveis, tone mapping ACES, vinheta.
   meta.json "gl": true (o build.py injeta este arquivo junto com lens/eclipse/blast); render com --use-angle=d3d11.
   Três mundos (opts.mode), cada um com a própria escala:
   0 CAMPO (metros, y = cima, chão perto da origem): relevo (fbm) com grama de verdade perto da câmera (lâminas por célula,
     marcha em camada), campo de cultivo ao longe, sombra das nuvens e dos morros; nuvens volumétricas (marcha de raio na
     camada 1.200–3.200 m, luz marchada até o Sol), tempestade no lado antissolar e uma faixa limpa no lado do Sol (luz baixa
     por baixo das nuvens); raios crepusculares e anticrepusculares (névoa marchada com a sombra das nuvens em cada amostra);
     cortina de chuva com colunas e chuva perto da câmera em 3 cilindros de profundidade (riscos com desfoque de movimento);
     relâmpago (flash). O ARCO-ÍRIS sai da física: a chuva iluminada pelo Sol espalha, em cada direção, a luz de 12
     comprimentos de onda conforme o ângulo θ ao ponto antissolar — primário (1 reflexão interna, 40,6° violeta → 42,3°
     vermelho) e secundário invertido (2 reflexões, 50,4° → 53,5°), perfil de Airy (supranumerários fracos dentro do
     primário), brilho branco dentro do primário e fora do secundário, por isso a faixa escura de Alexandre aparece sozinha.
     Cada gota perto da lente cintila com a cor do seu θ (as de cima vermelho, as de baixo violeta).
   1 GOTA (milímetros): esfera de água com reflexão (Fresnel) e refração por canal de cor (n 1,331/1,335/1,341), caminho
     direto e com 1 reflexão interna (o brilho colorido aparece quando a câmera está no ângulo do arco), cáustica em anel no
     fundo da gota (onde os raios do arco batem: a 21° do polo antissolar), fundo desfocado (céu e campo) com gotas em bokeh.
   2 AVIÃO (metros): mar de nuvens (relevo de nuvem iluminado), véu de chuva no ar, jato procedural (SDF: fuselagem, asa com
     enflechamento e winglet, motores, empenagem), janelas acesas, luzes de navegação (vermelha à esquerda, verde à direita),
     estrobos e beacon piscando; sombra do avião nas nuvens; o arco fecha em CÍRCULO inteiro em volta do ponto antissolar.

   IRIS.init(W,H,{scale:.6})          cria o canvas WebGL2 (scale = resolução interna; o pós-processamento sobe para W×H)
   IRIS.frame(camFn,T,opts)           desenha um quadro e devolve o canvas (IRIS.canvas). camFn(t) → {pos,tgt,up?,fov}. opts:
       {mode:0|1|2, sub:6, shutter:.5, exp:1, bloom:1,
        sun:[x,y,z] (direção do Sol; padrão IRIS.sunDir(12,0): 12° de elevação, vindo de +z), sunI:1,
        storm:1 (nuvens e escuridão da tempestade), rain:1 (chuva), bow:1 (força do arco), sup:.35 (supranumerários),
        widen:1 (alargamento artístico da faixa do arco; 7 = a borda vermelha fica no ângulo real),
        sat:1 (saturação das cores do arco; >1 mais vivo), sec:1 (força do arco secundário), bowComp:0 (compressão do brilho do arco; .4 evita o pé do arco estourar em branco), alex:1 (contraste da faixa de Alexandre; <1 mais suave),
        glint:1 (cor nas gotas perto da lente), grass:1, fog:1, flash:0 (relâmpago 0..1), flashP:[x,y,z],
        drop:{c:[x,y,z],r:1} (modo 1, em mm), bokeh:1,
        plane:{p:[x,y,z],f:[frente],u:[cima],s:1} (modo 2 e também visível no modo 0 se dado), deck:0 (altura da base do relevo das nuvens), deckA:1 (altura dos domos),
        layers:[{mode,cam,w,...}] (mistura dois mundos no mesmo quadro: transição por zoom sem corte), tiles:4}
   IRIS.loadModel(nome,{skip:/regex/})  modelo 3D aberto (GLB, glTF 2.0) embutido pelo build (meta.json "models": ["aviao/arquivo.glb"],
                                      arquivos em kit/assets/ com LICENCA.txt); devolve uma promessa e prende window.__assetsReady até as
                                      texturas decodificarem. skip esconde nós pelo nome (ex.: trem de pouso em voo). Malhas agrupadas por
                                      material, textura base com KHR_texture_transform, PBR simples (metal/rugosidade, GGX, reflexo do céu),
                                      vidro com reflexo de Fresnel e luz da cabine (janelas acesas), lentes vermelha/verde acesas.
                                      Uso: opts.plane = {p,f,u,s:1,model:'nome',windows:1,sdf:.47,lights:1 (brilho das luzes; 0 com a câmera colada no avião)}: o modelo é rasterizado por cima do
                                      quadro (com profundidade própria); a sombra nas nuvens e o brilho das luzes continuam no shader (a
                                      sombra usa o jato SDF na escala sdf; as luzes vêm das lentes e das pontas do próprio modelo).
   IRIS.modelLights(nome)             posições locais [vermelha, verde, cauda, beacon cima, beacon baixo] tiradas do modelo
   IRIS.sunDir(el,az)                 direção do Sol: elevação e azimute em graus (az 0 = +z, 90 = +x)
   IRIS.n(λ)                          índice da água (λ em nm): 1,32526 + 2909/λ² (1,3312 a 700 nm; 1,3430 a 405 nm)
   IRIS.ang(λ,k)                      ângulo do arco ao ponto antissolar (graus): k=1 primário, k=2 secundário
   IRIS.COLS                          as 7 cores do placar: {nome,l (nm),css,ang (primário, graus),ang2 (secundário)}
   IRIS.spec(λ)                       cor linear [r,g,b] do comprimento de onda (CIE 1931, sem rosa/magenta no violeta)
   IRIS.trace(b,n,k=1)                raio na gota (círculo unitário, luz andando em +x, parâmetro de impacto b ∈ [-1,1]):
                                      {pts:[entrada, batida(s), saída], dir (saída), th (ângulo ao antissolar, graus), dev}
   IRIS.rays(ctx,cam,o)               desenha os raios traçados como traços de luz (2D por cima do quadro, projetados em 3D):
       {c:[x,y,z] centro da gota, r (raio), u:[dir. da luz], v:[perp. no plano do corte], b:.86 (impacto do raio do arco),
        cols:7 (quantas cores já abriram, fracionário), prog:1 (0..1: até onde o raio branco andou), out:6 (comprimento
        da saída em raios), spread:1 (1 = dispersão real), bundle:[b...] (raios brancos extras, fracos: acúmulo de
        Descartes), w:5 (px), a:1}  → devolve [{nome,ang,x,y,x0,y0}] (ponta e saída da gota de cada cor na tela, para rótulos e lupa)
   IRIS.beam(ctx,cam,A,B,o)           feixe de luz 3D com brilho entre A e B: {w (largura no mundo), px:6 (mín. em px),
                                      prog:1, col:'#fff8ec', a:1, head:1 (ponta brilhante), core:.85 (miolo branco; baixo = cor pura),
                                      near:.15 (recorte perto da lente: o feixe pode passar ao lado e sumir atrás da câmera)}
   IRIS.glowLine(ctx,pts,col,w,a,core) traço 2D com brilho em 4 camadas somando luz (base de rays e beam)
   IRIS.rail(keys,{loop})             câmera em trilho: keys=[{t,pos,tgt,fov,roll?}] → fn(t) {pos,tgt,up,fov}; interpolação
                                      de Hermite com tangentes pelo tempo (C1: sem trancos na velocidade entre trechos)
   IRIS.proj(cam,p)                   projeta um ponto 3D na tela (px), mesma câmera do shader → [x,y,z] ou null
   IRIS.terr(x,z)                     altura do chão (m) no ponto, igual ao shader (para pousar a câmera rente à grama)
   IRIS.V                             vetores (sub, add, mul, dot, crs, len, nrm, lerp)
   Determinístico (sem Math.random). */
const IRIS=(()=>{
const V={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),nrm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},
  lerp:(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u]};
const D2R=Math.PI/180;
/* ---------- física do arco (a mesma conta do shader) ---------- */
const n=l=>1.32526+2909/(l*l);
function ang(l,k=1){const m=n(l),ci=Math.sqrt((m*m-1)/(k*k+2*k)),i=Math.acos(ci),r=Math.asin(Math.sin(i)/m);
  const D=(2*i-2*(k+1)*r)/D2R+k*180;return k%2?180-D:D-180}
/* cor de um comprimento de onda: ajuste analítico do CIE 1931 (Wyman et al. 2013) → sRGB linear; violeta sem vermelho (nada de magenta) */
function spec(l){const g=(x,m,a,b)=>{const t=(x-m)/(x<m?a:b);return Math.exp(-.5*t*t)};
  const X=1.056*g(l,599.8,37.9,31)+.362*g(l,442,16,26.7)-.065*g(l,501.1,20.4,26.2),Y=.821*g(l,568.8,46.9,40.5)+.286*g(l,530.9,16.3,31.1),Z=1.217*g(l,437,11.8,36)+.681*g(l,459,26,13.8);
  let r=3.2406*X-1.5372*Y-.4986*Z,G=-.9689*X+1.8758*Y+.0415*Z,B=.0557*X-.204*Y+1.057*Z;r=Math.max(0,r);G=Math.max(0,G);B=Math.max(0,B);
  if(l<480)r=Math.min(r,(l<455?0:.1)*B);return[r,G,B]}
const NL=12,LAMS=[...Array(NL)].map((_,i)=>405+(700-405)*i/(NL-1));
const LC=(()=>{const c=LAMS.map(spec),s=[0,0,0];c.forEach(v=>v.forEach((x,j)=>s[j]+=x));return c.map(v=>v.map((x,j)=>x*NL/s[j]/1.0))})();
const COLS=[['VERMELHO',700,'#ff4a3d'],['LARANJA',620,'#ff9a2e'],['AMARELO',580,'#ffe14d'],['VERDE',530,'#4fe06a'],['AZUL',470,'#3d8bff'],['ANIL',445,'#4b5cff'],['VIOLETA',405,'#7a5cff']]
  .map(([nome,l,css])=>({nome,l,css,ang:ang(l,1),ang2:ang(l,2)}));
/* raio na gota (2D, círculo unitário, luz em +x), k reflexões internas */
function refr(I,N,eta){const c=I[0]*N[0]+I[1]*N[1],k=1-eta*eta*(1-c*c);if(k<0)return null;const s=eta*c+Math.sqrt(k);return[eta*I[0]-s*N[0],eta*I[1]-s*N[1]]}
function trace(b,m,k=1){const e=[-Math.sqrt(Math.max(0,1-b*b)),b];let d=refr([1,0],e,1/m);const pts=[e];let p=e;
  for(let j=0;j<=k;j++){const L=-2*(p[0]*d[0]+p[1]*d[1]);p=[p[0]+d[0]*L,p[1]+d[1]*L];pts.push(p);
    if(j<k){const c=d[0]*p[0]+d[1]*p[1];d=[d[0]-2*c*p[0],d[1]-2*c*p[1]]}}
  const out=refr(d,[-p[0],-p[1]],m)||d;const th=Math.acos(Math.max(-1,Math.min(1,-out[0])))/D2R;
  return{pts,dir:out,th,dev:180-th}}
function sunDir(el,az=0){const e=el*D2R,a=az*D2R;return V.nrm([Math.cos(e)*Math.sin(a),Math.sin(e),Math.cos(e)*Math.cos(a)])}
/* altura do chão (m), igual ao shader */
function h21(x,y){let a=(x*.1031)%1,b=(y*.1031)%1,c=(x*.1031)%1;a=a<0?a+1:a;b=b<0?b+1:b;c=c<0?c+1:c;
  const d=a*(b+33.33)+b*(c+33.33)+c*(a+33.33);a+=d;b+=d;c+=d;const r=((a+b)*c)%1;return r<0?r+1:r}
function n2(x,y){const i=Math.floor(x),j=Math.floor(y);let u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);
  const a=h21(i,j),b=h21(i+1,j),c=h21(i,j+1),d=h21(i+1,j+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm2(x,y,o=5){let s=0,a=.5;for(let i=0;i<o;i++){s+=a*n2(x,y);x=x*2.03+1.7;y=y*2.03+9.2;a*=.5}return s}
function terr(x,z){const r=Math.hypot(x,z);let h=120*(fbm2(x*.0006+3.1,z*.0006+7.7)-.42)+9*(n2(x*.006,z*.006)-.5);
  {const u=Math.min(1,Math.max(0,(r-150)/1350));h*=.12+.88*u*u*(3-2*u)}
  const sm=(a,b,v)=>{const u=Math.min(1,Math.max(0,(v-a)/(b-a)));return u*u*(3-2*u)};
  h+=sm(1800,4200,r)*570*Math.pow(fbm2(x*.00055+11,z*.00055+5,5),1.6);h+=1440*Math.pow(sm(6000,16000,r),1.3)*Math.pow(fbm2(x*.00022,z*.00022,5),1.4);return h+.6*(n2(x*.15,z*.15)-.5)}
let gl,cv,W,H,RW,RH,progs={},fb={},quad;
const VS=`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0,1);}`;
const SCENE=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;
uniform vec3 ro,cf,cr,cu,S,flashP,dropC,plP,plF,plU;uniform float tf,asp,T,sunI,storm,rainK,bowK,supK,glintK,grassK,fogK,flash,dropR,bokehK,plK,plS,deck;
uniform int mode;uniform float widen,bowSat,alex,secK,deckA,lightK,bowComp;uniform int useLW;uniform vec3 uLW[5];uniform vec2 jit,res;uniform float P1[12],P2[12],KA[12];uniform vec3 LC[12];
const float PI=3.14159265,CB=1200.,CT=3200.;
float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float h31(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm2(vec2 p,int oc){float s=0.,a=.5;for(int i=0;i<6;i++){if(i>=oc)break;s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p,int oc){float s=0.,a=.5;for(int i=0;i<5;i++){if(i>=oc)break;s+=a*n3(p);p=p*2.07+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 SC(){return vec3(1.,.78,.56)*sunI*3.2;}                 /* luz do Sol baixo (quente) */
/* ---------- arco-íris: luz que a chuva iluminada manda para a direção de ângulo th (graus) ao ponto antissolar ---------- */
float aiz(float z){/* Ai(-z): assintótica para z>1, polinômio perto de 0, decaimento para z<0 */
  if(z>1.){return sin(.6667*pow(z,1.5)+.7854)/(1.77245*pow(z,.25));}
  if(z>0.)return .355+.259*z-.079*z*z;float s=-z;if(s<1.)return .355-.259*s+.04*s*s;return exp(-.6667*pow(s,1.5))/(3.5449*pow(s,.25));}
float lobe(float z){float a=aiz(z);float I=a*a/.287;if(z>1.5){float avg=.6/(2.*PI*sqrt(z))/.287*exp(-max(0.,z-2.)*1.1);I=mix(avg,I,mix(1.,supK,smoothstep(1.5,4.5,z))*exp(-max(0.,z-3.)*.15));}return I;}
vec3 bow(float th){vec3 c=vec3(0);
  /* alargamento artístico (widen): a borda vermelha de cada arco fica no lugar real (42,3° e 50,4°), a faixa abre para
     dentro no primário e para fora no secundário; a faixa escura de Alexandre entre as duas bordas continua a real */
  th=th<42.34?42.34-(42.34-th)/widen:th>50.42?50.42+(th-50.42)/widen:th;for(int k=-1;k<=1;k++){float t=th+float(k)*.17;
    for(int i=0;i<12;i++){c+=LC[i]*(lobe((P1[i]-t)*KA[i]+1.02)+.42*secK*lobe((t-P2[i])*KA[i]*.85+1.02));}}
  c/=36.;
  /* cores vivas: saturação acima da física, sem passar de zero */
  float lu=dot(c,vec3(.2126,.7152,.0722));c=max(lu+(c-lu)*bowSat,0.);
  /* trava contra rosa/magenta: onde o azul passa o verde, o vermelho não passa do verde */
  if(c.b>c.g)c.r=min(c.r,c.g*.9);if(c.r>c.g&&c.b>c.g)c.b=c.g;c.g=max(c.g,c.r*.3);c.b=min(c.b,max(c.g*1.6,c.b*step(c.r,c.b)));  /* vermelho puxa para o laranja: vermelho fraco sobre céu cinza não vira rosa */
  /* luz branca da chuva: base igual em todos os ângulos (céu contínuo por trás do arco duplo); dentro do primário um pouco
     mais clara e fora do secundário um pouco mais; a faixa de Alexandre fica só levemente mais escura (alex) */
  float w=.035+alex*(mix(.06,.015,step(1.5,widen))*smoothstep(42.6,40.4-(widen-1.)*.4,th)+.025*smoothstep(50.,53.5,th)*smoothstep(80.,60.,th));
  return c*.9+vec3(.85,.92,1.)*w;}
/* ---------- campo ---------- */
float terr(vec2 p){float r=length(p);float h=120.*(fbm2(p*.0006+vec2(3.1,7.7),5)-.42)+9.*(n2(p*.006)-.5);
  h*=.12+.88*smoothstep(150.,1500.,r);
  /* serra a 2–6 km e montanhas ao longe: aparecem atrás da chuva, cada vez mais claras pela névoa */
  h+=smoothstep(1800.,4200.,r)*570.*pow(fbm2(p*.00055+vec2(11.,5.),5),1.6);h+=1440.*pow(smoothstep(6000.,16000.,r),1.3)*pow(fbm2(p*.00022,5),1.4);
  return h+.6*(n2(p*.15)-.5);}
vec3 tnorm(vec2 p,float e){return normalize(vec3(terr(p-vec2(e,0))-terr(p+vec2(e,0)),2.*e,terr(p-vec2(0,e))-terr(p+vec2(0,e))));}
vec2 AH(){return -normalize(S.xz);}                          /* direção antissolar no chão */
float cov(vec2 p){float a=dot(p,AH());return clamp(.12+.62*smoothstep(-6800.,-2200.,a)*storm+.28*smoothstep(-17000.,-25000.,a)+.1*(1.-storm),0.,1.);}
float cden(vec3 p){float h=(p.y-CB)/(CT-CB);if(h<0.||h>1.)return 0.;float c=cov(p.xz);
  vec3 q=p*.00042+vec3(T*.003,0.,T*.0015);float nn=fbm3(q,4)+.25*(n3(q*9.)-.5);
  float sh=smoothstep(0.,.07,h)*smoothstep(1.,.35+.4*c,h);return max(0.,nn*sh-(1.-c)*.62-.12)*3.2;}
/* transmitância das nuvens até o Sol a partir de p (amostra única no meio da camada: barato e suave) */
float sunVis(vec3 p){if(S.y<=0.)return 0.;float t=(2000.-p.y)/S.y;if(t<0.)return 1.;vec2 q=(p+S*t).xz;float c=cov(q);
  float d=max(0.,fbm2(q*.00042+vec2(T*.003,T*.0015),4)+.12-(1.-c)*.62-.12);return exp(-d*9.);}
float rainDen(vec3 p){float a=dot(p.xz,AH()),b=dot(p.xz,vec2(-AH().y,AH().x));
  float cur=smoothstep(350.,1300.,a)*smoothstep(11000.,6000.,a);
  float col=smoothstep(.38,.72,fbm2(vec2(b*.0011,a*.0005)+vec2(0.,T*.01),4));
  float str=.65+.35*n3(vec3(b*.03,p.y*.0012+T*.6,a*.03));
  float top=smoothstep(CB+60.,CB-350.,p.y);float near=.10*smoothstep(400.,30.,length(p.xz));
  return rainK*storm*(cur*col*str*top*.9+near*.6);}
vec3 skyc(vec3 d){float y=max(d.y,0.);vec3 zen=mix(vec3(.11,.19,.36),vec3(.06,.09,.16),storm*.6),hor=vec3(.42,.44,.48);
  vec3 c=mix(hor,zen,pow(y,.45));float sd=max(dot(d,S),0.);c+=vec3(1.,.55,.25)*(pow(sd,5.)*.7+pow(sd,60.)*1.8)*sunI;
  c+=vec3(1.,.93,.8)*sunI*smoothstep(.99988,.99996,sd)*600.;
  vec2 hd=normalize(d.xz+vec2(1e-5));float cf=cov(hd*35000.)*storm;c=mix(c,vec3(.085,.10,.14)+vec3(.25,.18,.12)*pow(sd,8.)*sunI,cf*smoothstep(.12,.0,d.y)*.9);return c*.9;}
/* grama: lâminas inclinadas (segmento com largura que afina), 2 por célula de 3,5 cm; percorre as células do chão
   ao longo do raio (DDA) até 9 m; o chão perto da câmera é tratado como um plano inclinado (barato) */
bool grass(vec3 ro,vec3 rd,float tmax,out float tg,out vec3 gc,out float gh){tg=0.;if(grassK<=0.)return false;
  float g0=terr(ro.xz);vec2 gd=vec2(terr(ro.xz+vec2(.5,0))-g0,terr(ro.xz+vec2(0,.5))-g0)*2.;if(ro.y-g0>8.)return false;
  const float cs=.035;vec2 d=rd.xz;vec2 cell=floor(ro.xz/cs);vec2 st=sign(d);vec2 inv=1./max(abs(d),vec2(1e-5));
  vec2 tM=((cell+max(st,0.))*cs-ro.xz)/(d+sign(d)*1e-6+vec2(equal(d,vec2(0)))*1e-6);tM=abs(tM)*step(0.,tM)+step(tM,vec2(0.))*abs(tM);
  vec2 tD=cs*inv;float tc=0.;float best=1e9;vec3 bc;float bh=0.;
  for(int i=0;i<420;i++){if(tc>min(tmax,15.))break;
    float gy=g0+dot(gd,ro.xz+d*tc-ro.xz);vec3 pc=ro+rd*tc;if(pc.y<gy){tg=tc;gh=0.;gc=vec3(.035,.04,.02);return true;}
    if(pc.y-gy>.75&&rd.y>0.)break;
    for(int k=0;k<3;k++){vec2 cc=cell*3.1+vec2(float(k)*1.37,float(k)*.71);float r=h21(cc+float(k)*5.3);
      vec2 bx=(cell+vec2(h21(cc+1.7),h21(cc+5.1)))*cs;float by=g0+dot(gd,bx-ro.xz);
      float tuf=n2(bx*.55+3.)*.65+n2(bx*2.1)*.35;
      float Hb=(.10+.30*r*r+.32*tuf*tuf)*grassK*(k==2?.6:1.);
      vec2 lean=vec2(cos(r*40.),sin(r*40.))*(.02+.07*h21(cc+2.2))+(vec2(n2(bx*.7),n2(bx*.7+7.))-.5)*.16;
      float gust=n2(vec2(dot(bx,vec2(.8,.35))*.55-T*1.3,.5))+.25*sin(T*2.4+bx.x*2.1+bx.y*1.3);
      vec2 bend=lean+vec2(.13,.04)*gust*Hb;
      vec3 B1=vec3(bx.x,by,bx.y),v=vec3(bend.x,Hb,bend.y),w0=ro-B1;float bb=dot(rd,v),c=dot(v,v),dd=dot(rd,w0),e=dot(v,w0);
      float den=c-bb*bb;float sc=(bb*e-c*dd)/max(den,1e-7);float tt=clamp((e-bb*dd)/max(den,1e-7),0.,1.);sc=dot(B1+v*tt-ro,rd);
      float dist=length(ro+rd*sc-(B1+v*tt));float wd=(.0035+.003*h21(cc+4.4))*(1.-pow(tt,1.4))+.0005;
      if(sc>.02&&dist<wd&&sc<best){best=sc;bh=tt;float vv=h21(cc+9.),dry=smoothstep(.5,.78,n2(bx*.32+9.))*.85+.12*step(.9,vv);
        vec3 tip=mix(mix(vec3(.17,.30,.05),vec3(.10,.21,.035),vv),vec3(.44,.39,.15),dry);bc=mix(vec3(.025,.045,.015),tip,pow(tt,.7))*(.8+.4*h21(cc+6.6));}}
    if(best<1e8&&best<tc+.25){tg=best;gh=bh;gc=bc;return true;}
    if(tM.x<tM.y){tc=tM.x;tM.x+=tD.x;cell.x+=st.x;}else{tc=tM.y;tM.y+=tD.y;cell.y+=st.y;}}
  if(best<1e8){tg=best;gh=bh;gc=bc;return true;}return false;}
float tmarch(vec3 ro,vec3 rd,float tmax){float t=1.,lt=0.,ld=ro.y-terr(ro.xz);for(int i=0;i<170;i++){vec3 p=ro+rd*t;float d=p.y-terr(p.xz);
    if(d<0.){return lt+(t-lt)*ld/(ld-d);}lt=t;ld=d;t+=max(.45*d,.02*t+.1);if(t>tmax)break;}return -1.;}
float tshadow(vec3 p){float t=2.,s=1.;for(int i=0;i<22;i++){vec3 q=p+S*t;float d=q.y-terr(q.xz);s=min(s,10.*d/t);if(s<0.)return 0.;t+=max(8.,t*.25);if(t>6000.)break;}return clamp(s,0.,1.);}
/* gotas perto da lente: riscos em 3 cilindros em volta da câmera, com a cor do arco no ângulo da gota */
vec3 streaks(vec3 ro,vec3 rd,float th,float thit,vec3 amb){vec3 acc=vec3(0);float l=length(rd.xz);if(l<1e-3||rainK*storm<=0.)return acc;
  vec3 bw=bow(th)*glintK;for(int k=0;k<3;k++){float R=k==0?1.6:k==1?5.:14.;float t=R/l;if(t>thit)continue;vec3 p=ro+rd*t;
    float an=atan(p.z-ro.z,p.x-ro.x);vec2 g=vec2(an*R,p.y);g.x+=g.y*.12;g.y+=T*8.5+float(k)*13.;vec2 cs=vec2(.06,.55)*(1.+float(k)*.6);
    vec2 c=floor(g/cs),f=fract(g/cs);float h=h21(c+float(k)*17.1);if(h>(k==0?.12:k==1?.16:.10)*rainK)continue;
    float x0=.15+.7*h21(c+3.1),y0=h21(c+7.7)*.6;float wpx=max(.0011,1.6*t/(res.y*.5/tf));
    float dx=(f.x-x0)*cs.x,dy=(f.y-y0)*cs.y;float L=.16+.1*h;float m=exp(-dx*dx/(wpx*wpx))*smoothstep(0.,.03,dy)*smoothstep(L,L-.05,dy);
    float sv=sunVis(p);acc+=m*(amb*.5+bw*SC()*sv*.8+SC()*sv*.02)*(k==0?.55:k==1?.4:.28);}
  return acc;}
vec3 fieldShade(vec3 ro,vec3 rd,out float dep){
  float th=degrees(acos(clamp(dot(rd,-S),-1.,1.)));
  float tT=tmarch(ro,rd,40000.);float tg;vec3 gc;float gh;bool gr=grass(ro,rd,tT<0.?1e9:tT,tg,gc,gh);
  float tHit=gr?tg:tT;vec3 amb=mix(vec3(.28,.34,.46),vec3(.085,.115,.19),storm)*.55;vec3 col;
  if(tHit>0.){vec3 p=ro+rd*tHit;float sv=sunVis(p);
    if(gr){float sh=sv*(.35+.65*gh);float back=pow(max(0.,dot(rd,S)),3.);col=gc*(SC()*sh*(.45+.9*back)+amb*(.4+.6*gh));}
    else{vec3 nn=tnorm(p.xz,max(.15,tHit*.004));float dif=max(0.,dot(nn,S));float ts=tHit<9000.?tshadow(p+nn*.5):1.;
      float fld=n2(p.xz*vec2(.004,.0025)+vec2(n2(p.xz*.001)*3.));vec2 pr=p.xz*.011;vec2 pc=floor(pr+vec2(n2(p.xz*.0011)*.8));float hh=h21(pc);vec3 alb=hh<.45?vec3(.09,.15,.035):hh<.7?vec3(.12,.18,.045):hh<.85?vec3(.16,.19,.06):vec3(.075,.12,.035);alb=mix(alb,vec3(.10,.16,.04),.45*smoothstep(150.,40.,length(p.xz-ro.xz))*0.+.25);alb=mix(alb,vec3(.10,.16,.035),.35*fld);float tre=smoothstep(.06,.0,min(min(fract(pr.x+n2(p.xz*.0011)*.8),1.-fract(pr.x+n2(p.xz*.0011)*.8)),min(fract(pr.y+n2(p.xz*.0011)*.8),1.-fract(pr.y+n2(p.xz*.0011)*.8))))*step(.5,h21(pc+.5));alb=mix(alb,vec3(.025,.05,.02),tre*.8*smoothstep(15.,60.,tHit));alb*=.75+.5*fbm2(p.xz*.05,4);alb=mix(alb,vec3(.09,.14,.04),.5*smoothstep(80.,10.,tHit));
      alb=mix(alb,vec3(.16,.14,.06),smoothstep(.62,.7,n2(p.xz*.0012+9.)));alb*=.8+.4*n2(p.xz*.08);
      col=alb*(SC()*dif*sv*ts*1.1+amb*(.5+.5*nn.y));
      vec3 hz=mix(vec3(.13,.16,.23),vec3(.20,.24,.31),1.-storm*.5)+SC()*pow(max(0.,dot(rd,S)),4.)*.12+SC()*sv*.025;col=mix(col,hz,(1.-exp(-tHit/6500.))*.88);}
  }else col=vec3(0);
  /* nuvens */
  vec3 cc=vec3(0);float ctr=1.;
  if(rd.y>0.&&tHit<0.){float t0=max(0.,(CB-ro.y)/rd.y),t1=min((CT-ro.y)/rd.y,40000.);if(t1>t0){float dt=(t1-t0)/40.;float jt=h21(gl_FragCoord.xy+fract(T*7.)*91.);
      float mu=dot(rd,S),ph=mix(.08,1.,pow(.5+.5*mu,6.))*1.2+.25;
      for(int i=0;i<40;i++){float t=t0+(float(i)+jt)*dt;vec3 p=ro+rd*t;float d=cden(p);if(d<=.001)continue;
        float ld=0.;for(int j=1;j<=4;j++)ld+=cden(p+S*float(j*j)*90.);float tl=exp(-ld*1.1)*(1.-exp(-d*2.));
        float hh=(p.y-CB)/(CT-CB);vec3 l=SC()*tl*ph*.9+amb*(.25+.9*hh)*(1.-.5*storm);
        float fl=flash*exp(-length(p-flashP)/1800.)*6.;l+=vec3(.75,.82,1.)*fl;
        float sg=d*dt*.0035;float a=exp(-sg);cc+=ctr*l*(1.-a);ctr*=a;if(ctr<.02)break;}}}
  if(tHit<0.)col=skyc(rd)*ctr+cc;
  /* névoa, raios crepusculares, chuva e arco (marcha única pela atmosfera baixa) */
  float tE=tHit>0.?tHit:(rd.y>0.?min((CB-ro.y)/max(rd.y,1e-3),30000.):30000.);
  vec3 bw=bow(th);vec3 ins=vec3(0),insB=vec3(0);float tr=1.;float mu=dot(rd,S);float pm=.3*(1.-.6*.6)/pow(1.+.36-1.2*mu,1.5)+.05;
  float jt=h21(gl_FragCoord.yx+fract(T*13.)*57.);const int NH=28;
  for(int i=0;i<NH;i++){float u=(float(i)+jt)/float(NH);float t=tE*u*u;float dt=tE*2.*u/float(NH);vec3 p=ro+rd*t;
    float sv=sunVis(p);float dh=exp(-max(p.y,0.)/700.)*.00004*fogK;float dr=rainDen(p)*.0011;
    vec3 Ls=SC()*sv;ins+=tr*(Ls*(dh*pm*.7+dr*.006)+amb*(dh*.8+dr*.45))*dt;insB+=tr*Ls*dr*bw*bowK*1.9*dt;tr*=exp(-(dh*.8+dr*.18)*dt);}
  /* luz do arco comprimida: cores fortes sem estourar em branco onde a chuva iluminada é muito espessa (pé do arco) */
  insB/=1.+dot(insB,vec3(.3333))*bowComp;col=col*tr+ins+insB;
  col+=streaks(ro,rd,th,tHit>0.?tHit:1e9,amb);
  dep=tHit;return col;}
/* ---------- gota macro (mm) ---------- */
vec3 envD(vec3 d){float y=d.y;vec3 sky=mix(vec3(.34,.33,.33),vec3(.07,.08,.11),smoothstep(-.02,.6,y));float sd=max(dot(d,S),0.);
  sky+=vec3(1.,.6,.3)*(pow(sd,4.)*.6+pow(sd,40.)*1.4)*sunI;vec3 gr=mix(vec3(.16,.2,.05),vec3(.03,.045,.02),smoothstep(0.,-.5,y));
  vec3 c=mix(gr,sky,smoothstep(-.03,.03,y));c+=vec3(1.,.9,.75)*sunI*smoothstep(.9996,.99985,sd)*120.;return c;}
float fres(float c,float m){float r0=(m-1.)/(m+1.);r0*=r0;return r0+(1.-r0)*pow(1.-clamp(c,0.,1.),5.);}
vec3 bokeh(vec3 rd){vec3 acc=vec3(0);vec2 q0=vec2(atan(rd.x,-rd.z),asin(clamp(rd.y,-1.,1.)));
  for(int k=0;k<4;k++){float s=k==0?3.2:k==1?5.7:k==2?9.5:16.;vec2 q=q0*s+vec2(float(k)*.37,T*(.6+float(k)*.5)+float(k)*.71);vec2 c=floor(q),f=fract(q)-.5;
    float h=h21(c+float(k)*7.);if(h>(k==0?.16:k==1?.22:.28))continue;
    float r=.07+.36*pow(h21(c+8.8),2.);vec2 off=(vec2(h21(c+1.3),h21(c+4.1))-.5)*(1.-2.*r);vec2 u=f-off;
    float an=h21(c+3.3)*1.05;u=mat2(cos(an),-sin(an),sin(an),cos(an))*u;vec2 a=abs(u);
    float hx=max(a.x*.866+a.y*.5,a.y);float d=mix(length(u),hx,.45);float ro2=mix(length(u*1.012),hx*1.012,.45);
    float disc=smoothstep(r,r-.015-.02*h,d)*(.75+.25*n2(u*30./r));float rim=exp(-pow((d-r*.93)/(.012+.02*h21(c+2.)),2.));float rimR=exp(-pow((ro2-r*.93)/.02,2.));
    vec3 e=envD(normalize(rd+vec3(0,.25,0)));float th=degrees(acos(clamp(dot(rd,-S),-1.,1.)));float br=.35+1.3*h21(c+5.5);
    vec3 cr=vec3(rimR,rim,rim*1.05);acc+=br*(disc*.16+cr*.24)*(e*1.4+bow(th)*SC()*.15)*(k==0?.7:1.);}
  return acc*bokehK;}
vec3 dropShade(vec3 ro,vec3 rd,out float dep){vec3 oc=ro-dropC;float b=dot(oc,rd),c=dot(oc,oc)-dropR*dropR,D=b*b-c;
  vec3 bg=envD(rd)*.8+bokeh(rd);dep=-1.;if(D<0.)return bg;float t=-b-sqrt(D);if(t<0.)return bg;dep=t;
  vec3 p=ro+rd*t,nn=normalize(p-dropC);float F=fres(dot(-rd,nn),1.335);vec3 col=F*envD(reflect(rd,nn));
  col+=SC()*40.*pow(max(0.,dot(reflect(rd,nn),S)),900.);
  vec3 NC=vec3(1.331,1.335,1.341);
  for(int ch=0;ch<3;ch++){float m=NC[ch];vec3 d1=refract(rd,nn,1./m);vec3 p1=p+d1*(-2.*dot(p-dropC,d1));vec3 n1=normalize(p1-dropC);
    vec3 d2=refract(d1,-n1,m);float F1=fres(dot(d1,n1),m);vec3 e1=dot(d2,d2)>0.?envD(d2)*(1.-F1):vec3(0);
    vec3 d3=reflect(d1,n1);vec3 p2=p1+d3*(-2.*dot(p1-dropC,d3));vec3 n2=normalize(p2-dropC);vec3 d4=refract(d3,-n2,m);
    vec3 e2=dot(d4,d4)>0.?envD(d4)*F1*(1.-fres(dot(d3,n2),m))*2.5:vec3(0);
    /* cáustica: anel no fundo da gota a ~21° do polo antissolar (onde batem os raios do arco) */
    float a=degrees(acos(clamp(dot(n1,-S),-1.,1.)));float ring=exp(-pow((a-(21.+float(ch)*.55))/1.6,2.))*1.6+exp(-a*a/90.)*.5;
    float cs=ring*(1.-F)*max(0.,dot(-S,n1));vec3 sc=SC();col[ch]+=(1.-F)*(e1[ch]+e2[ch])+sc[ch]*cs*.5;}
  col+=vec3(.6,.75,.85)*.06*pow(1.-max(0.,dot(-rd,nn)),3.);return col;}
/* ---------- avião (SDF em metros, eixo x = frente, y = cima, z = direita) ---------- */
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float wing(vec3 p,float span,float c0,float c1,float sw,float th){float z=clamp(abs(p.z)/span,0.,1.);vec3 q=p;q.x+=abs(p.z)*sw;float ch=mix(c0,c1,z);
  q.x+=ch*.5-c0*.5;return sdBox(vec3(q.x,q.y-abs(p.z)*.06,abs(p.z)-span*.5),vec3(ch*.5,th*(1.-.5*z),span*.5))-.08;}
float jet(vec3 p,out int mat){mat=0;float r=3.;float fx=p.x;float rad=r*(1.-smoothstep(22.,31.,fx)*.85)*(1.-smoothstep(-24.,-32.,fx)*.55);
  float fus=length(vec2(p.y-smoothstep(-22.,-32.,fx)*1.4,p.z))-rad;fus=max(fus,abs(fx-.5)-31.5);float d=fus;
  float wg=wing(p-vec3(4.,-1.6,0.),31.,9.,2.2,.5,.55);d=min(d,wg);
  vec3 wt=vec3(p.x+11.5,p.y-.2,abs(p.z)-31.);float wl=sdBox(vec3(wt.x+wt.y*.4,wt.y-1.2,wt.z),vec3(1.,1.6,.12));d=min(d,wl);
  float hs=wing(p-vec3(-27.,.8,0.),10.,4.,1.5,.6,.3);d=min(d,hs);
  vec3 fp=p-vec3(-27.,2.,0.);float vs=sdBox(vec3(fp.x+fp.y*.6,fp.y-4.5,fp.z),vec3(2.6-fp.y*.18,4.6,.25));d=min(d,vs);
  vec3 ep=vec3(p.x-2.,p.y+3.4,abs(p.z)-10.5);float en=sdCap(ep,vec3(-3.,0,0),vec3(3.,0,0),1.45);if(en<d){d=en;mat=1;}
  return d;}
float jetW(vec3 w,out int mat){vec3 q=w-plP;vec3 rz=normalize(cross(plF,plU)),ry=cross(rz,plF);return jet(vec3(dot(q,plF),dot(q,ry),dot(q,rz))/plS,mat)*plS;}
vec3 jetL(vec3 w){vec3 q=w-plP;vec3 rz=normalize(cross(plF,plU)),ry=cross(rz,plF);return vec3(dot(q,plF),dot(q,ry),dot(q,rz))/plS;}
vec3 toW(vec3 l){vec3 rz=normalize(cross(plF,plU)),ry=cross(rz,plF);return plP+(plF*l.x+ry*l.y+rz*l.z)*plS;}
float jetHit(vec3 ro,vec3 rd,float tmax,out int mat){mat=0;vec3 oc=ro-plP;float R=36.*plS;float b=dot(oc,rd),c=dot(oc,oc)-R*R,D=b*b-c;if(D<0.)return -1.;
  float t=max(0.,-b-sqrt(D)),t1=min(tmax,-b+sqrt(D));for(int i=0;i<110;i++){if(t>t1)break;float d=jetW(ro+rd*t,mat);if(d<.01*plS)return t;t+=d*.9;}return -1.;}
float jetShadow(vec3 p){vec3 oc=p-plP;float b=dot(oc,S);vec3 cl=oc-S*b;if(b>0.||length(cl)>40.*plS)return 1.;
  float t=max(0.,-b-40.*plS),s=1.;int m;for(int i=0;i<40;i++){float d=jetW(p+S*t,m);s=min(s,d/(t*.0047+.25));if(s<.02)return 0.;t+=max(d,.5*plS);if(t>-b+40.*plS)break;}return clamp(s,0.,1.);}
vec3 lightsGlow(vec3 ro,vec3 rd,float tlim){vec3 acc=vec3(0);
  vec3 L[5]=vec3[](vec3(-11.,-.2,-31.4),vec3(-11.,-.2,31.4),vec3(-31.5,1.6,0.),vec3(2.,3.3,0.),vec3(2.,-3.3,0.));
  vec3 C[5]=vec3[](vec3(1.,.08,.04),vec3(.1,1.,.3),vec3(1.),vec3(1.,.15,.05),vec3(1.,.15,.05));
  float bl=step(.86,fract(T*1.1)),bc=step(.5,fract(T*1.1+.5))*step(fract(T*1.1+.5),.6);
  for(int i=0;i<5;i++){vec3 pw=useLW==1?uLW[i]:toW(L[i]);vec3 v=pw-ro;float t=dot(v,rd);if(t<0.||t>tlim+2.*plS)continue;float dd=length(v-rd*t);float k=i<2?1.:i==2?bl*.8:bc*1.2;
    float px=t*tf/(res.y*.5);acc+=lightK*C[i]*k*(exp(-pow(dd/(max(.25*plS,2.5*px)),2.))*30.+exp(-dd/(max(1.5*plS,14.*px)))*1.2);}
  return acc;}
vec3 jetShade(vec3 ro,vec3 rd,float t,int mat){vec3 p=ro+rd*t;int m;float e=.02*plS;
  vec3 nn=normalize(vec3(jetW(p+vec3(e,0,0),m)-jetW(p-vec3(e,0,0),m),jetW(p+vec3(0,e,0),m)-jetW(p-vec3(0,e,0),m),jetW(p+vec3(0,0,e),m)-jetW(p-vec3(0,0,e),m)));
  vec3 l=jetL(p);vec3 alb=mat==1?vec3(.18,.19,.21):vec3(.78,.8,.83);if(mat==0&&l.y<-1.2&&abs(l.z)<4.)alb=vec3(.42,.45,.5);
  if(mat==0&&abs(l.x-1.)<30.&&abs(l.z)<1.8&&l.y>-1.)alb=mix(alb,vec3(.12,.2,.42),smoothstep(.3,.6,l.y)*0.);
  float dif=max(0.,dot(nn,S));vec3 sky=vec3(.25,.30,.40);vec3 col=alb*(SC()*dif*.42+sky*(.35+.3*nn.y));
  vec3 h=normalize(S-rd);col+=SC()*.6*pow(max(0.,dot(nn,h)),80.)*(mat==1?.5:1.);col+=sky*.25*pow(1.-max(0.,dot(nn,-rd)),4.);
  /* janelas acesas: duas faixas nos lados da fuselagem */
  float side=abs(l.z)>1.2?1.:0.;float wy=abs(l.y-.55);float wx=fract((l.x+.25)/.95);
  if(mat==0&&side>0.&&l.x>-22.&&l.x<24.&&wy<.22&&abs(wx-.5)<.18&&abs(l.z)<3.1)col=vec3(1.,.72,.38)*2.2;
  return col;}
/* mar de nuvens visto do alto (topo em y = deck) */
/* topo das nuvens: cúmulos em domos (duas escalas de células) sobre uma ondulação larga */
float domes(vec2 p,float cs,float k){vec2 c=floor(p/cs);float h=0.;for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){vec2 cc=c+vec2(i,j);vec2 ctr=(cc+vec2(h21(cc),h21(cc+3.7)))*cs;
    float r=cs*(.55+.5*h21(cc+7.1));float d=length(p-ctr);h=max(h,sqrt(max(0.,r*r-d*d))*k*(.6+.6*h21(cc+1.9)));}return h;}
float deckH(vec2 p){float b=fbm2(p*.0007,4);return deck+deckA*(150.*b*b+domes(p,140.,.55)+domes(p+vec2(37.,91.),45.,.45))+6.*n2(p*.05);}
float deckSh(vec3 p){float s=1.;float t=6.;for(int i=0;i<14;i++){vec3 q=p+S*t;float d=q.y-deckH(q.xz);s=min(s,d/(t*.12));if(s<0.)return 0.;t*=1.45;}return clamp(s,0.,1.);}
vec3 planeShade(vec3 ro,vec3 rd,out float dep){float th=degrees(acos(clamp(dot(rd,-S),-1.,1.)));vec3 col;float tD=-1.;
  if(rd.y<0.){float t=max(0.,(ro.y-deck-120.)/-rd.y);for(int i=0;i<120;i++){vec3 p=ro+rd*t;float d=p.y-deckH(p.xz);if(d<.5){tD=t;break;}t+=max(d*.6,1.);if(t>60000.)break;}}
  if(tD>0.){vec3 p=ro+rd*tD;float e=4.;vec3 nn=normalize(vec3(deckH(p.xz-vec2(e,0))-deckH(p.xz+vec2(e,0)),2.*e,deckH(p.xz-vec2(0,e))-deckH(p.xz+vec2(0,e))));
    float dif=max(0.,dot(nn,S)*.75+.25);float js=plK>0.?jetShadow(p):1.;float ss=deckSh(p+nn*2.);float ao=smoothstep(deck-10.,deck+150.,p.y);
    vec3 amb=vec3(.30,.37,.50);float rim=pow(1.-max(0.,dot(nn,-rd)),3.);
    col=vec3(.80,.79,.78)*(SC()*dif*ss*js*.40+amb*(.12+.40*ao)*(.6+.4*nn.y)*mix(.35,1.,js))+SC()*.05*rim*ss*js;
    float hz=1.-exp(-tD/9000.);col=mix(col,vec3(.36,.40,.48)+SC()*pow(max(0.,dot(rd,S)),6.)*.1,hz*.75);}
  else col=skyc(rd)*vec3(.9,.97,1.08);
  /* véu de chuva no ar: o arco inteiro (círculo) em volta do ponto antissolar */
  float tv=tD>0.?min(tD,5000.):5000.;float veil=(1.-exp(-tv/900.))*rainK;col=col*(1.-.12*veil)+bow(th)*SC()*bowK*veil*.30;
  dep=tD;if(plK>0.){int mat;float tj=plK<1.5?jetHit(ro,rd,tD>0.?tD:1e9,mat):-1.;if(tj>0.){col=jetShade(ro,rd,tj,mat);dep=tj;}col+=lightsGlow(ro,rd,dep>0.?dep:1e9);}
  return col;}
void main(){vec2 q=(gl_FragCoord.xy+jit)/res*2.-1.;q.x*=asp;vec3 rd=normalize(cf+q.x*tf*cr+q.y*tf*cu);float dep;vec3 col;
  if(mode==1)col=dropShade(ro,rd,dep);else if(mode==2)col=planeShade(ro,rd,dep);else{col=fieldShade(ro,rd,dep);
    if(plK>0.){int mat;float tj=plK<1.5?jetHit(ro,rd,dep>0.?dep:1e9,mat):-1.;if(tj>0.)col=jetShade(ro,rd,tj,mat);col+=lightsGlow(ro,rd,tj>0.?tj:1e9);}}
  o=vec4(max(col,vec3(0)),1.);}`;
/* pós-processamento (o mesmo do ECL: acumula subquadros, bloom em 4 níveis, ACES) */
const ACC=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s;uniform float k;void main(){o=min(texture(s,uv)*k,vec4(6e4));}`;
const BRIGHT=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s;uniform vec2 px;void main(){
  vec3 c=vec3(0);for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)c+=min(texture(s,uv+vec2(i,j)*px).rgb,vec3(60.));c/=9.;
  float l=max(c.r,max(c.g,c.b));o=vec4(c*smoothstep(.8,3.,l),1.);}`;
const BLUR=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s;uniform vec2 dir;void main(){
  float w[5]=float[](.227027,.1945946,.1216216,.054054,.016216);vec3 c=texture(s,uv).rgb*w[0];
  for(int i=1;i<5;i++){c+=texture(s,uv+dir*float(i)).rgb*w[i];c+=texture(s,uv-dir*float(i)).rgb*w[i];}o=vec4(c,1.);}`;
const FINAL=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D s,b0,b1,b2,b3;uniform float bloom,ex,asp;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 c=texture(s,uv).rgb;vec3 bl=texture(b0,uv).rgb*.5+texture(b1,uv).rgb*.6+texture(b2,uv).rgb*.8+texture(b3,uv).rgb*1.;
  c=(c+bl*bloom*.35)*ex;vec2 q=uv-.5;q.x*=asp;c*=1.-.32*smoothstep(.35,.95,length(q));
  c=aces(c*1.1);c=pow(c,vec3(1./2.2));
  float d=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)/255.;o=vec4(c+d,1.);}`;
function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('IRIS: '+gl.getShaderInfoLog(s));return s}
function prog(fs){const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('IRIS: '+gl.getProgramInfoLog(p));const U={};const k=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<k;i++){const a=gl.getActiveUniform(p,i);U[a.name.replace('[0]','')]=gl.getUniformLocation(p,a.name)}return{p,U}}
function target(w,h){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);return{t,f,w,h}}
function use(P,tgt){gl.useProgram(P.p);if(tgt){gl.bindFramebuffer(gl.FRAMEBUFFER,tgt.f);gl.viewport(0,0,tgt.w,tgt.h)}else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H)}}
function draw(){gl.bindVertexArray(quad);gl.drawArrays(gl.TRIANGLES,0,6)}
function tex(P,name,unit,t){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t.t||t);gl.uniform1i(P.U[name],unit)}
function init(w,h,o={}){W=w;H=h;const sc=o.scale||.6;RW=Math.round(w*sc);RH=Math.round(h*sc);
  cv=document.createElement('canvas');cv.width=W;cv.height=H;gl=cv.getContext('webgl2',{preserveDrawingBuffer:true,antialias:false});
  if(!gl)throw new Error('IRIS: WebGL2 indisponível');gl.getExtension('EXT_color_buffer_float');gl.getExtension('OES_texture_float_linear');
  quad=gl.createVertexArray();gl.bindVertexArray(quad);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  progs={sc:prog(SCENE),acc:prog(ACC),br:prog(BRIGHT),bl:prog(BLUR),fin:prog(FINAL)};
  {const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,MVS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,MFS));gl.bindAttribLocation(p,0,'aP');gl.bindAttribLocation(p,1,'aN');gl.bindAttribLocation(p,2,'aT');gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('IRIS malha: '+gl.getProgramInfoLog(p));const U={};const k=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<k;i++){const a=gl.getActiveUniform(p,i);U[a.name]=gl.getUniformLocation(p,a.name)}progs.mesh={p,U}}
  whiteT=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,whiteT);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
  fb.one=target(RW,RH);{const rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,RW,RH);gl.bindFramebuffer(gl.FRAMEBUFFER,fb.one.f);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb)}fb.acc=target(RW,RH);fb.mip=[];let mw=RW>>1,mh=RH>>1;for(let i=0;i<4;i++){fb.mip.push([target(mw,mh),target(mw,mh)]);mw=Math.max(8,mw>>1);mh=Math.max(8,mh>>1)}
  IRIS.canvas=cv;return cv}
function camBasis(c){const f=V.nrm(V.sub(c.tgt,c.pos));let up=c.up||[0,1,0];const r=V.nrm(V.crs(f,up));const u=V.crs(r,f);return{f,r,u,k:Math.tan((c.fov||40)*Math.PI/360)}}
/* um subquadro de um mundo, somado no acumulador com peso w */
function pass(c,ti,o,w,i,n){const P=progs.sc,U=P.U,B=camBasis(c);use(P,fb.one);
  /* disco do Sol (0,53°): cada subquadro olha de um ponto do disco */
  const S0=o.sun||sunDir(12,0),e1=V.nrm(V.crs(S0,[0,1,0])),e2=V.crs(e1,S0),hal=(k,b)=>{let f=1,r=0;while(k>0){f/=b;r+=f*(k%b);k=Math.floor(k/b)}return r};
  const ra=.265*D2R*Math.sqrt(hal(i+1,5)),ph=2*Math.PI*hal(i+1,7),S=V.nrm(V.add(S0,V.add(V.mul(e1,ra*Math.cos(ph)),V.mul(e2,ra*Math.sin(ph)))));
  gl.uniform3fv(U.ro,c.pos);gl.uniform3fv(U.cf,B.f);gl.uniform3fv(U.cr,B.r);gl.uniform3fv(U.cu,B.u);gl.uniform1f(U.tf,B.k);gl.uniform1f(U.asp,RW/RH);
  gl.uniform1f(U.T,ti);gl.uniform1i(U.mode,o.mode|0);gl.uniform3fv(U.S,S);gl.uniform1f(U.sunI,o.sunI??1);gl.uniform1f(U.storm,o.storm??1);gl.uniform1f(U.rainK,o.rain??1);
  gl.uniform1f(U.bowK,o.bow??1);gl.uniform1f(U.widen,o.widen??1);gl.uniform1f(U.bowSat,o.sat??1);gl.uniform1f(U.alex,o.alex??1);gl.uniform1f(U.secK,o.sec??1);gl.uniform1f(U.deckA,o.deckA??1);gl.uniform1f(U.bowComp,o.bowComp??0);gl.uniform1f(U.lightK,o.plane?(o.plane.lights??1):1);gl.uniform1f(U.supK,o.sup??.35);gl.uniform1f(U.glintK,o.glint??1);gl.uniform1f(U.grassK,o.grass??1);gl.uniform1f(U.fogK,o.fog??1);
  gl.uniform1f(U.flash,o.flash||0);gl.uniform3fv(U.flashP,o.flashP||[0,2000,-6000]);
  const d=o.drop||{};gl.uniform3fv(U.dropC,d.c||[0,0,0]);gl.uniform1f(U.dropR,d.r||1);gl.uniform1f(U.bokehK,o.bokeh??1);
  const pl=o.plane;gl.uniform1f(U.plK,pl?(pl.model?2:1):0);gl.uniform3fv(U.plP,pl?pl.p:[0,-1e5,0]);gl.uniform3fv(U.plF,pl?V.nrm(pl.f):[1,0,0]);gl.uniform3fv(U.plU,pl?V.nrm(pl.u||[0,1,0]):[0,1,0]);gl.uniform1f(U.plS,pl?(pl.model?(pl.sdf??.47)*(pl.s||1):pl.s||1):1);{const LL=pl&&pl.model?modelLights(pl.model):null;gl.uniform1i(U.useLW,LL?1:0);if(LL){const f=V.nrm(pl.f),u0=V.nrm(pl.u||[0,1,0]),z=V.nrm(V.crs(f,u0)),y=V.crs(z,f),Wp=q=>V.add(pl.p,V.mul(V.add(V.add(V.mul(f,q[0]),V.mul(y,q[1])),V.mul(z,q[2])),pl.s||1));gl.uniform3fv(U.uLW,new Float32Array(LL.map(Wp).flat()))}}gl.uniform1f(U.deck,o.deck||0);
  gl.uniform1fv(U.P1,P1A);gl.uniform1fv(U.P2,P2A);gl.uniform1fv(U.KA,KAA);gl.uniform3fv(U.LC,LCA);
  gl.uniform2f(U.jit,hal(i+1,2)-.5,hal(i+1,3)-.5);gl.uniform2f(U.res,RW,RH);
  /* em faixas, com flush entre elas: evita o "TDR" do Windows (GPU integrada parando num desenho longo) */
  const nt=o.tiles||4;gl.enable(gl.SCISSOR_TEST);for(let k=0;k<nt;k++){const y0=Math.floor(RH*k/nt),y1=Math.floor(RH*(k+1)/nt);gl.scissor(0,y0,RW,y1-y0);draw();gl.flush()}gl.disable(gl.SCISSOR_TEST);
  if(pl&&pl.model)drawModel(c,B,S,o,pl,hal(i+1,2)-.5,hal(i+1,3)-.5);
  use(progs.acc,fb.acc);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);tex(progs.acc,'s',0,fb.one);gl.uniform1f(progs.acc.U.k,w/n);draw();gl.disable(gl.BLEND)}
const P1A=new Float32Array(LAMS.map(l=>ang(l,1))),P2A=new Float32Array(LAMS.map(l=>ang(l,2))),KAA=new Float32Array(LAMS.map(l=>2.6*Math.pow(550/l,2/3))),LCA=new Float32Array(LC.flat());
function frame(camFn,T,o={}){const n=o.sub||6,shu=(o.shutter??.5)/30,ex=o.exp??1;
  const L=o.layers||[{mode:o.mode|0,cam:camFn,w:1}];
  use(progs.acc,fb.acc);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
  for(let i=0;i<n;i++){const ti=T+((i+.5)/n-.5)*shu;for(const ly of L){if(!(ly.w>0))continue;const oo=Object.assign({},o,ly);pass((ly.cam||camFn)(ti),ti,oo,ly.w*(ly.exp??ex),i,n)}}
  let src=fb.acc;fb.mip.forEach(m=>{use(progs.br,m[0]);tex(progs.br,'s',0,src);gl.uniform2f(progs.br.U.px,1/src.w,1/src.h);draw();
    for(let k=0;k<2;k++){use(progs.bl,m[1]);tex(progs.bl,'s',0,m[0]);gl.uniform2f(progs.bl.U.dir,1.5/m[0].w,0);draw();use(progs.bl,m[0]);tex(progs.bl,'s',0,m[1]);gl.uniform2f(progs.bl.U.dir,0,1.5/m[0].h);draw()}
    src=m[0]});
  use(progs.fin,null);tex(progs.fin,'s',0,fb.acc);fb.mip.forEach((m,i)=>tex(progs.fin,'b'+i,i+1,m[0]));gl.uniform1f(progs.fin.U.bloom,o.bloom??1);gl.uniform1f(progs.fin.U.ex,1);gl.uniform1f(progs.fin.U.asp,W/H);draw();
  return cv}
function proj(c,p){const B=camBasis(c),d=V.sub(p,c.pos),z=V.dot(d,B.f);if(z<=1e-9)return null;const x=V.dot(d,B.r)/(z*B.k),y=V.dot(d,B.u)/(z*B.k);
  return[W/2+x*H/2,H/2-y*H/2,z]}
/* ---------- traços de luz (2D, com brilho) ---------- */
function glowLine(ctx,pts,col,w,a,core=.85){if(pts.length<2)return;ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
  for(const [k,al] of [[7,.06],[3.2,.16],[1.6,.45],[.8,1]]){ctx.strokeStyle=col;ctx.globalAlpha=a*al;ctx.lineWidth=w*k;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke()}
  ctx.globalAlpha=a;ctx.strokeStyle='rgba(255,255,255,'+core+')';ctx.lineWidth=Math.max(1,w*.3);ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke();ctx.restore()}
function dot3(ctx,x,y,r,col,a){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,'+a+')');g.addColorStop(.25,col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=a;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fill();ctx.restore()}
/* recorta um caminho polilinha até a fração u do comprimento */
function cut(P,u){if(u>=1)return P;const L=[0];for(let i=1;i<P.length;i++)L.push(L[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));const tot=L[L.length-1]*Math.max(0,u),out=[P[0]];
  for(let i=1;i<P.length;i++){if(L[i]<=tot){out.push(P[i]);continue}const k=(tot-L[i-1])/((L[i]-L[i-1])||1);out.push([P[i-1][0]+(P[i][0]-P[i-1][0])*k,P[i-1][1]+(P[i][1]-P[i-1][1])*k]);break}return out}
function rays(ctx,cam,o){const C=o.c||[0,0,0],R=o.r||1,u=V.nrm(o.u||[1,0,0]),v=V.nrm(o.v||[0,1,0]),sp=o.spread??1,w=o.w||5,a=o.a??1,out=o.out||6,pin=o.inLen||5;
  const W3=(x,y)=>V.add(C,V.add(V.mul(u,x*R),V.mul(v,y*R))),P=(x,y)=>{const q=proj(cam,W3(x,y));return q?[q[0],q[1]]:null};
  const prog=o.prog??1,b=o.b??.861,res=[];
  /* raios brancos extras (fracos): acúmulo perto de 42° */
  for(const bb of o.bundle||[]){const r=trace(bb,n(560));const p=[[-pin,bb],...r.pts,[r.pts[r.pts.length-1][0]+r.dir[0]*out,r.pts[r.pts.length-1][1]+r.dir[1]*out]].map(q=>P(q[0],q[1]));
    if(p.every(Boolean))glowLine(ctx,cut(p,prog),'rgba(255,246,228,.9)',w*.3,a*(o.bundleA??.35),.3)}
  /* o raio do arco: branco até entrar, depois cada cor com o seu índice (dispersão real × spread) */
  const rr=COLS.map(cc=>{const m=1.3339+(n(cc.l)-1.3339)*sp;return trace(b,m)});const e=rr[0].pts[0];
  const inc=[P(-pin,b),P(e[0],e[1])];const Lin=(pin+e[0])/(pin+e[0]+5.2+out),u1=Math.min(1,prog/Lin);
  if(inc.every(Boolean))glowLine(ctx,cut(inc,u1),'#fff6e6',w*1.15,a);
  if(prog<Lin){if(!inc.every(Boolean))return res;const p=cut(inc,u1);const q=p[p.length-1];if(o.head!==0)dot3(ctx,q[0],q[1],w*5,'rgba(255,240,215,.7)',a);return res}
  const u2=(prog-Lin)/(1-Lin);
  rr.forEach((r,k)=>{const cc=COLS[k];const lp=r.pts[r.pts.length-1];const ins=r.pts.map(q=>P(q[0],q[1])),ex=[ins[ins.length-1],P(lp[0]+r.dir[0]*out,lp[1]+r.dir[1]*out)];
    if(!ins.every(Boolean)||!ex[1])return;const reveal=Math.max(0,Math.min(1,(o.cols??7)-k));
    const Li=r.pts.reduce((s,q,i)=>i?s+Math.hypot(q[0]-r.pts[i-1][0],q[1]-r.pts[i-1][1]):0,0),fi=Li/(Li+out);
    glowLine(ctx,cut(ins,Math.min(1,u2/fi)),cc.css,w*.5,a*.6,0);
    if(u2>fi&&reveal>0){const ue=Math.min(1,(u2-fi)/(1-fi))*Math.min(1,reveal*1.6);const pe=cut(ex,ue);glowLine(ctx,pe,cc.css,w*.8,a*Math.min(1,reveal*1.4),0);
      const q=pe[pe.length-1];if(o.head!==0&&ue<1)dot3(ctx,q[0],q[1],w*3.5,cc.css,a);res.push({nome:cc.nome,ang:r.th,x:q[0],y:q[1],x0:ex[0][0],y0:ex[0][1],css:cc.css,k})}});
  return res}
function beam(ctx,cam,A,B,o={}){const pr=o.prog??1;let a0=A,E=V.lerp(A,B,pr);
  /* recorta no plano perto da câmera (feixe que passa ao lado da lente e some atrás dela) */
  const Bf=camBasis(cam),zf=q=>V.dot(V.sub(q,cam.pos),Bf.f),zn=o.near??.15,za=zf(a0),ze=zf(E);if(za<zn&&ze<zn)return;
  if(za<zn)a0=V.lerp(a0,E,(zn-za)/(ze-za));if(ze<zn)E=V.lerp(a0,E,(zn-za)/(ze-za));const pa=proj(cam,a0),pe=proj(cam,E);if(!pa||!pe)return;const w=o.px||6;
  glowLine(ctx,[[pa[0],pa[1]],[pe[0],pe[1]]],o.col||'#fff6e6',Math.max(w,(o.w||0)*(H/2/camBasis(cam).k)/(pe[2]||1)),o.a??1,o.core??.85);if(o.head!==0&&pr<1)dot3(ctx,pe[0],pe[1],w*6,'rgba(255,240,215,.75)',o.a??1)}
/* ---------- câmera em trilho (Hermite com tangentes pelo tempo: velocidade contínua) ---------- */
function rail(keys,opt={}){const K=keys.slice().sort((a,b)=>a.t-b.t),N=K.length,lp=!!opt.loop,TL=lp?(opt.period||K[N-1].t-K[0].t):0;
  const f=(k,key)=>Array.isArray(K[0][key])?K[k][key]:[K[k][key]??0];
  const tan=(i,key)=>{if(N<2)return f(0,key).map(()=>0);let a=i-1,b=i+1,ta,tb;
    if(lp){ta=a<0?K[N-2].t-TL:K[a].t;tb=b>=N?K[1].t+TL:K[b].t;a=(a+N-1)%(N-1);b=b%(N-1)}else{if(a<0||b>=N)return f(i,key).map(()=>0);ta=K[a].t;tb=K[b].t}
    const A=f(a,key),B=f(b,key);return A.map((x,j)=>(B[j]-x)/(tb-ta))};
  const herm=(i,key,t)=>{const t0=K[i].t,t1=K[i+1].t,h=t1-t0,s=(t-t0)/h,s2=s*s,s3=s2*s,p0=f(i,key),p1=f(i+1,key),m0=tan(i,key),m1=tan(i+1,key);
    return p0.map((x,j)=>(2*s3-3*s2+1)*x+(s3-2*s2+s)*h*m0[j]+(-2*s3+3*s2)*p1[j]+(s3-s2)*h*m1[j])};
  return t=>{if(lp)t=K[0].t+(((t-K[0].t)%TL)+TL)%TL;t=Math.max(K[0].t,Math.min(K[N-1].t,t));let i=0;while(i<N-2&&t>K[i+1].t)i++;
    const pos=herm(i,'pos',t),tgt=herm(i,'tgt',t),fov=herm(i,'fov',t)[0]||50,roll=(herm(i,'roll',t)[0]||0)*D2R;
    const fw=V.nrm(V.sub(tgt,pos)),rt=V.nrm(V.crs(fw,[0,1,0])),up0=V.crs(rt,fw),up=V.add(V.mul(up0,Math.cos(roll)),V.mul(rt,Math.sin(roll)));return{pos,tgt,up,fov}}}

/* ---------- modelos 3D (GLB) rasterizados no mesmo alvo HDR do subquadro ---------- */
const MVS=`#version 300 es
in vec3 aP;in vec3 aN;in vec2 aT;out vec3 vW,vN;out vec2 vT;
uniform vec3 ro,cf,cr,cu,mP,mF,mU;uniform float tf,asp,mS;uniform vec2 jit,res;
void main(){vec3 mz=normalize(cross(mF,mU)),my=cross(mz,mF);vec3 w=mP+(mF*aP.x+my*aP.y+mz*aP.z)*mS;vW=w;vN=normalize(mF*aN.x+my*aN.y+mz*aN.z);vT=aT;
  vec3 d=w-ro;float x=dot(d,cr),y=dot(d,cu),z=dot(d,cf);float n=.05*mS,F=20000.;
  gl_Position=vec4(x/(tf*asp)-2.*jit.x/res.x*z,y/tf-2.*jit.y/res.y*z,z*(F+n)/(F-n)-2.*F*n/(F-n),z);}`;
const MFS=`#version 300 es
precision highp float;in vec3 vW,vN;in vec2 vT;out vec4 o;
uniform vec3 ro,S,sunC,bc,em;uniform float met,rough,glass;uniform vec4 tt;uniform sampler2D tex;uniform int hasT;
vec3 env(vec3 d){float y=d.y;vec3 sky=mix(vec3(.30,.36,.46),vec3(.10,.15,.28),clamp(y,0.,1.));float sd=max(dot(d,S),0.);sky+=vec3(1.,.6,.3)*pow(sd,6.)*.8;
  vec3 dk=vec3(.55,.56,.6)*(.4+.6*max(0.,S.y));return mix(dk,sky,smoothstep(-.06,.03,y));}
void main(){vec3 n=normalize(vN);vec3 v=normalize(ro-vW);if(dot(n,v)<0.)n=-n;
  vec3 b=bc;if(hasT==1)b*=pow(texture(tex,vT*tt.xy+tt.zw).rgb,vec3(2.2));
  float dif=max(0.,dot(n,S));vec3 h=normalize(S+v);float a=max(rough*rough,.003);float nh=max(0.,dot(n,h));
  float D=a*a/(3.14159*pow(nh*nh*(a*a-1.)+1.,2.));float F0=mix(.04,1.,met);vec3 Fc=mix(vec3(F0),b,met);
  float fv=pow(1.-max(0.,dot(n,v)),5.);vec3 Fr=Fc+(1.-Fc)*fv;
  vec3 spec=Fr*D*.25*dif;vec3 diff=b*(1.-met)*dif/3.14159*3.;
  vec3 amb=b*(1.-met)*env(n)*.55;vec3 refl=env(reflect(-v,n))*Fr*mix(1.,.35,rough);
  vec3 col=sunC*(diff+spec)+amb+refl*(met>.5?1.:.35);
  if(glass>.5){col=env(reflect(-v,n))*(.04+.96*fv)*.8+em;}else col+=em;
  o=vec4(col,1.);}`;
const MODELS={};
/* GLB → malhas agrupadas por material (posições, normais, uv, índices em Uint32), texturas decodificadas (assíncrono) */
function loadModel(name,o={}){if(MODELS[name])return MODELS[name].ready;const b64=(typeof __MODELS__!=='undefined'&&__MODELS__[name])||null;if(!b64)throw new Error('IRIS: modelo '+name+' não está no build (meta.json "models")');
  const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer,dv=new DataView(bin);const jl=dv.getUint32(12,true);const J=JSON.parse(new TextDecoder().decode(new Uint8Array(bin,20,jl)));
  const bo=20+jl+8;const BV=i=>{const v=J.bufferViews[i];return{off:bo+(v.byteOffset||0),len:v.byteLength}};
  const acc=(i)=>{const a=J.accessors[i],v=BV(a.bufferView),nc={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],off=v.off+(a.byteOffset||0);
    if(a.componentType===5126)return new Float32Array(bin.slice(off,off+a.count*nc*4));if(a.componentType===5123)return new Uint16Array(bin.slice(off,off+a.count*nc*2));return new Uint32Array(bin.slice(off,off+a.count*nc*4))};
  const skip=o.skip||null,G={};
  J.nodes.forEach(nd=>{if(nd.mesh===undefined)return;if(skip&&skip.test(nd.name||''))return;J.meshes[nd.mesh].primitives.forEach(pr=>{const m=pr.material??-1;const g=G[m]||(G[m]={P:[],N:[],T:[],I:[],nv:0});
    const P=acc(pr.attributes.POSITION),N=acc(pr.attributes.NORMAL),T=pr.attributes.TEXCOORD_0!==undefined?acc(pr.attributes.TEXCOORD_0):new Float32Array(P.length/3*2),I=acc(pr.indices);
    g.P.push(P);g.N.push(N);g.T.push(T);g.I.push(Uint32Array.from(I,x=>x+g.nv));g.nv+=P.length/3})});
  const cat=(A,T)=>{const n=A.reduce((s,a)=>s+a.length,0),r=new T(n);let k=0;A.forEach(a=>{r.set(a,k);k+=a.length});return r};
  const groups=Object.entries(G).map(([m,g])=>({m:+m,P:cat(g.P,Float32Array),N:cat(g.N,Float32Array),T:cat(g.T,Float32Array),I:cat(g.I,Uint32Array)}));
  /* centro de cada material (para luzes de navegação, por exemplo) */
  const centers={};groups.forEach(g=>{const c=[0,0,0];for(let i=0;i<g.P.length;i+=3){c[0]+=g.P[i];c[1]+=g.P[i+1];c[2]+=g.P[i+2]}const k=g.P.length/3||1;centers[(J.materials[g.m]||{}).name||'?']=c.map(x=>x/k)});
  const M={J,groups,centers,imgs:[],gl:null};MODELS[name]=M;
  M.ready=Promise.all((J.images||[]).map((im,i)=>{const v=BV(im.bufferView);return createImageBitmap(new Blob([new Uint8Array(bin,v.off,v.len)],{type:im.mimeType})).then(bm=>{M.imgs[i]=bm})}));
  if(typeof window!=='undefined'){const prev=window.__assetsReady||Promise.resolve();window.__assetsReady=Promise.all([prev,M.ready])}
  return M.ready}
function upModel(M){const mats=M.J.materials||[];M.gl=M.groups.map(g=>{const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    const vb=(arr,loc,n)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,0,0)};
    vb(g.P,0,3);vb(g.N,1,3);vb(g.T,2,2);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,g.I,gl.STATIC_DRAW);gl.bindVertexArray(null);
    const mt=mats[g.m]||{},pb=mt.pbrMetallicRoughness||{},bt=pb.baseColorTexture;let t=null,tt=[1,1,0,0];
    if(bt){const im=M.imgs[M.J.textures[bt.index].source];if(im){t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT)}
      const x=(bt.extensions||{}).KHR_texture_transform;if(x)tt=[(x.scale||[1,1])[0],(x.scale||[1,1])[1],(x.offset||[0,0])[0],(x.offset||[0,0])[1]]}
    const nm=(mt.name||'').toLowerCase();return{vao,n:g.I.length,t,tt,bc:(pb.baseColorFactor||[1,1,1]).slice(0,3),met:pb.metallicFactor??1,rough:pb.roughnessFactor??1,
      glass:/glaz|glass|vidro/.test(nm)?1:0,red:/red/.test(nm)&&/lens/.test(nm),green:/green/.test(nm)&&/lens/.test(nm),name:mt.name}})}
let whiteT=null;
function drawModel(c,B,S,o,pl,jx,jy){const M=MODELS[pl.model];if(!M)return;if(!M.gl)upModel(M);const P=progs.mesh,U=P.U;gl.useProgram(P.p);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.uniform3fv(U.ro,c.pos);gl.uniform3fv(U.cf,B.f);gl.uniform3fv(U.cr,B.r);gl.uniform3fv(U.cu,B.u);gl.uniform1f(U.tf,B.k);gl.uniform1f(U.asp,RW/RH);gl.uniform2f(U.jit,jx,jy);gl.uniform2f(U.res,RW,RH);
  gl.uniform3fv(U.mP,pl.p);gl.uniform3fv(U.mF,V.nrm(pl.f));gl.uniform3fv(U.mU,V.nrm(pl.u||[0,1,0]));gl.uniform1f(U.mS,pl.s||1);gl.uniform3fv(U.S,S);
  const si=o.sunI??1;gl.uniform3fv(U.sunC,[3.2*si,3.2*.78*si,3.2*.56*si]);
  const win=pl.windows??1;
  for(const g of M.gl){gl.bindVertexArray(g.vao);gl.uniform3fv(U.bc,g.bc);gl.uniform1f(U.met,g.met);gl.uniform1f(U.rough,g.rough);gl.uniform1f(U.glass,g.glass);gl.uniform4fv(U.tt,g.tt);
    gl.uniform3fv(U.em,g.red?[8,.4,.2]:g.green?[.3,8,1]:g.glass?[1.8*win,1.2*win,.6*win]:[0,0,0]);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,g.t||whiteT);gl.uniform1i(U.tex,0);gl.uniform1i(U.hasT,g.t?1:0);gl.drawElements(gl.TRIANGLES,g.n,gl.UNSIGNED_INT,0)}
  gl.bindVertexArray(null);gl.disable(gl.DEPTH_TEST)}
/* luzes de navegação do modelo em coordenadas locais: vermelha, verde, estrobo da cauda, beacon em cima e embaixo */
function modelLights(name){const M=MODELS[name];if(!M)return null;if(M.lights)return M.lights;const c=M.centers,find=re=>{const k=Object.keys(c).find(x=>re.test(x));return k?c[k]:null};
  let mx=[1e9,0,0],top=-1e9,bot=1e9;M.groups.forEach(g=>{for(let i=0;i<g.P.length;i+=3){if(g.P[i]<mx[0])mx=[g.P[i],g.P[i+1],g.P[i+2]];if(Math.abs(g.P[i+2])<.3&&Math.abs(g.P[i])<2){top=Math.max(top,g.P[i+1]);bot=Math.min(bot,g.P[i+1])}}});
  return M.lights=[find(/red.*lens/i)||[0,0,-10],find(/green.*lens/i)||[0,0,10],mx,[0,top+.1,0],[0,bot-.1,0]]}
const projF=(c,p)=>proj(c,p);
return{init,frame,loadModel,modelLights,MODELS,proj:projF,camBasis,rail,rays,beam,glowLine,trace,sunDir,terr,n,ang,spec,COLS,LAMS,V,get W(){return W},get H(){return H}}})();
