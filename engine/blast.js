/* ---------- BLAST: explosão volumétrica na GPU (WebGL2) para choques gigantes (exemplo: projetos/lua-gigante) ----------
   Cada pixel marcha um raio pelo volume e soma emissão e absorção: bola de plasma no contato, lençol de rocha vaporizada que
   abre em anel no plano do choque, respingo que sobe pelo eixo, tudo com turbulência (fbm 3D deformado) que se afasta e esfria
   (cor de corpo negro: branco-azulado → amarelo → laranja → vermelho → fumaça escura). Os corpos (esferas) tapam o volume.
   BLAST.draw(ctx,c,{P (centro do choque), n (eixo: do corpo grande para o pequeno), R (escala), t (s desde o choque),
     bodies:[[x,y,z,r],...], a, res (0,5 = meia resolução), steps})
   c = câmera do W3D (eye, fw, rt, up, f). meta.json "gl": true. */
const BLAST=(()=>{
  let gl=null,cv=null,pr=null,vao=null,U={},CW=0,CH=0;
  const FS=`#version 300 es
precision highp float;in vec2 vQ;out vec4 o;
uniform vec3 uEye,uF,uR,uU,uP,uN;uniform float uFo,uRs,uT,uA,uExp;uniform vec4 uBod[4];uniform int uNB,uSteps;uniform vec2 uRes;
float h3(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n3(p);p=p*2.07+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 bb(float T){/* corpo negro aproximado, T em K */T=clamp(T,600.,12000.);float t=T/100.;vec3 c;
  c.r=t<=66.?1.:clamp(1.293*pow(t-60.,-.1332),0.,1.);c.g=t<=66.?clamp(.39*log(t)-.6318,0.,1.):clamp(1.13*pow(t-60.,-.0755),0.,1.);c.b=t>=66.?1.:(t<=19.?0.:clamp(.543*log(t-10.)-1.196,0.,1.));
  return c*pow(T/6500.,2.)*.9;}
/* densidade e temperatura no ponto p (coordenadas do choque: y = eixo, x/z = plano) */
vec2 field(vec3 w){vec3 q=w-uP;vec3 ex=normalize(cross(uN,abs(uN.y)>.9?vec3(1,0,0):vec3(0,1,0))),ez=cross(uN,ex);
  vec3 l=vec3(dot(q,ex),dot(q,uN),dot(q,ez))/uRs;float s=uT,gr=1.-exp(-s/1.5);
  float rho=length(l.xz),hgt=l.y;
  /* turbulência em três escalas, deformada e arrastada para fora */
  vec3 adv=l/(1.+s*.45);float w1=fbm(adv*1.8+vec3(0,s*.15,0));vec3 wp=adv*4.2+vec3(w1*2.2,-s*.25,w1*1.7);float w2=fbm(wp);float w3=fbm(wp*2.6+3.1);
  float tur=w1*.45+w2*.4+w3*.25;
  /* casca da bola de fogo (oca, achatada contra a Lua) */
  float rb=.3+1.15*gr;vec3 lb=vec3(l.x,(hgt-.1)*1.25,l.z);float sb=length(lb)/rb;float shell=exp(-pow((sb-.82)/.28,2.))+.55*exp(-pow(sb/.5,2.))*exp(-s/1.2);
  /* lençol em anel no plano do choque, cheio de grumos e filamentos radiais */
  float r0=.2+3.1*gr,wd=.14+.3*gr;float ring=exp(-pow((rho-r0*.85)/(wd*1.6),2.)-pow((hgt-.12*gr)/(wd*.55),2.))*smoothstep(r0+.25,r0-.1,rho);
  float an=atan(l.z,l.x);float rad=fbm(vec3(cos(an)*3.,sin(an)*3.,s*.3)+w2);ring*=.2+1.4*smoothstep(.3,.7,rad);
  /* respingo pelo eixo */
  float jh=1.3*gr+.2*s;float jet=exp(-pow(rho/(.2+.35*gr),2.))*smoothstep(-.05,.25,hgt)*smoothstep(jh+.3,jh-.25,hgt);
  float base=shell+ring*1.2+jet*.6;float d=smoothstep(0.,1.,(base*(.5+tur)-.5)*1.8)*2.6*smoothstep(0.,.05,s);
  float hot=pow(clamp(w2*.6+w3*.6,0.,1.),2.2)*2.2;float T=(8000.*exp(-s/2.4)*exp(-length(l)/(.75+1.4*gr))+3000.*exp(-s/4.5))*(.3+hot)+600.;
  return vec2(d,T);}
bool hitBody(vec3 ro,vec3 rd,out float tb){tb=1e9;bool h=false;for(int i=0;i<4;i++){if(i>=uNB)break;vec3 oc=ro-uBod[i].xyz;float b=dot(oc,rd),c=dot(oc,oc)-uBod[i].w*uBod[i].w,dd=b*b-c;if(dd>0.){float t=-b-sqrt(dd);if(t>0.&&t<tb){tb=t;h=true;}}}return h;}
void main(){vec2 sp=(vQ*.5+.5)*uRes;vec3 rd=normalize(uF+(sp.x-uRes.x*.5)/uFo*uR+(sp.y-uRes.y*.5)/uFo*uU);
  /* esfera envolvente do volume */float Rv=uRs*4.6;vec3 oc=uEye-uP;float b=dot(oc,rd),c=dot(oc,oc)-Rv*Rv,dd=b*b-c;if(dd<0.){o=vec4(0);return;}
  float t0=max(0.,-b-sqrt(dd)),t1=-b+sqrt(dd);float tb;if(hitBody(uEye,rd,tb))t1=min(t1,tb);if(t1<=t0){o=vec4(0);return;}
  int N=uSteps;float dt=(t1-t0)/float(N);vec3 acc=vec3(0);float tr=1.;float jit=fract(sin(dot(sp,vec2(12.9898,78.233)))*43758.5453);
  for(int i=0;i<128;i++){if(i>=N||tr<.01)break;float t=t0+(float(i)+jit)*dt;vec3 p=uEye+rd*t;vec2 f=field(p);if(f.x<.001)continue;
    float sig=f.x*6./uRs*dt;vec3 em=bb(f.y)*6.*min(1.,f.x*1.2)*mix(vec3(1.25,.8,.5),vec3(1),smoothstep(3500.,7000.,f.y));vec3 smoke=vec3(.012,.009,.008)*smoothstep(1500.,800.,f.y);
    float att=exp(-sig);acc+=tr*(em+smoke*.6)*(1.-att);tr*=att;}
  float al=1.-tr;vec3 col=1.-exp(-acc*1.3*uExp);o=vec4(col*uA,al*uA);}`;
  const VS=`#version 300 es
in vec2 aQ;out vec2 vQ;void main(){vQ=aQ;gl_Position=vec4(aQ,0.,1.);}`;
  function init(w,h){cv=document.createElement('canvas');cv.width=w;cv.height=h;gl=cv.getContext('webgl2',{premultipliedAlpha:true,alpha:true,preserveDrawingBuffer:true});if(!gl)throw new Error('BLAST: sem WebGL2');
    const mk=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error('BLAST: '+gl.getShaderInfoLog(x));return x};
    pr=gl.createProgram();gl.attachShader(pr,mk(gl.VERTEX_SHADER,VS));gl.attachShader(pr,mk(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
    const n=gl.getProgramParameter(pr,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const u=gl.getActiveUniform(pr,i);U[u.name.replace('[0]','')]=gl.getUniformLocation(pr,u.name)}
    vao=gl.createVertexArray();gl.bindVertexArray(vao);const bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),gl.STATIC_DRAW);
    const l=gl.getAttribLocation(pr,'aQ');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,8,0);CW=w;CH=h}
  function draw(ctx,c,o){const a=o.a??1;if(a<=0||o.t<0)return;const res=o.res||.5,w=Math.round(W*res),h=Math.round(H*res);if(!gl||CW!==w||CH!==h)init(w,h);
    gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(pr);gl.bindVertexArray(vao);
    gl.uniform3fv(U.uEye,c.eye);gl.uniform3fv(U.uF,c.fw);gl.uniform3fv(U.uR,c.rt);gl.uniform3fv(U.uU,c.up);gl.uniform1f(U.uFo,c.f*res);gl.uniform2fv(U.uRes,[w,h]);
    gl.uniform3fv(U.uP,o.P);const nn=Math.hypot(...o.n);gl.uniform3fv(U.uN,o.n.map(v=>v/nn));gl.uniform1f(U.uRs,o.R);gl.uniform1f(U.uT,o.t);gl.uniform1f(U.uA,a);gl.uniform1f(U.uExp,o.exp??1);gl.uniform1i(U.uSteps,o.steps||72);
    const B=(o.bodies||[]).slice(0,4),arr=new Float32Array(16);B.forEach((b,i)=>arr.set(b,i*4));gl.uniform4fv(U.uBod,arr);gl.uniform1i(U.uNB,B.length);
    gl.drawArrays(gl.TRIANGLES,0,6);ctx.save();ctx.imageSmoothingQuality='high';ctx.drawImage(cv,0,0,W,H);
    /* brilho (bloom): a mesma imagem borrada por cima, somando luz */
    ctx.globalCompositeOperation='lighter';ctx.filter=`blur(${Math.round(W*.03)}px)`;ctx.globalAlpha=o.bloom??.75;ctx.drawImage(cv,0,0,W,H);ctx.filter=`blur(${Math.round(W*.09)}px)`;ctx.globalAlpha=(o.bloom??.75)*.6;ctx.drawImage(cv,0,0,W,H);ctx.restore()}
  return {draw}})();
