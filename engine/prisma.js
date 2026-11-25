/* ---------- PRISMA: prisma de vidro, feixe de luz e dispersão na GPU (WebGL2) — v3.20, 2026-11-08 — exemplo projetos/luz-prisma/ ----------
   O caminho da luz é calculado de verdade (Snell por comprimento de onda, 12 cores de 400 a 700 nm, reflexão total interna) num
   plano (x,y) em z = 0; o shader desenha: feixes volumétricos com poeira brilhando, prismas de vidro transparentes (Fresnel,
   reflexo de uma luz de estúdio, bordas acesas, interior com o leque), parede que recebe o arco-íris, chão escuro iluminado
   por baixo dos feixes, tudo em HDR com tone mapping e bloom. meta.json "gl": true.
   PRISMA.trace({src,dir,prisms:[[[x,y],[x,y],[x,y]],...],wallX,len,disp,A})  → segmentos [{a,b,c:[r,g,b],w,inGlass}] (por λ)
   PRISMA.draw(ctx,c,{src,dir,width,prisms,depth,wallX,floorY,disp,I,dust,t,exp,bloom,a,res,beamLen})
       c = câmera do W3D. width = raio do feixe; depth = meia espessura dos prismas em z; disp = força da dispersão (1 = vidro
       flint, >1 exagera); beamLen = quanto do feixe já saiu da fonte (anima o feixe entrando); t = tempo (poeira).
   PRISMA.LAMBDA, PRISMA.rgb(λ), PRISMA.n(λ,disp)  dados das 12 cores */
const PRISMA=(()=>{
  const LAMBDA=[];for(let i=0;i<12;i++)LAMBDA.push(400+i*300/11);
  /* cor de cada λ (aproximação CIE suave), normalizada para a soma das 12 dar branco */
  function rgb0(l){let r=0,g=0,b=0;if(l<440){r=-(l-440)/60;b=1}else if(l<490){g=(l-440)/50;b=1}else if(l<510){g=1;b=-(l-510)/20}else if(l<580){r=(l-510)/70;g=1}else if(l<645){r=1;g=-(l-645)/65}else{r=1}
    const f=l<420?.3+.7*(l-380)/40:l>680?.3+.7*(700-l)/20+.0:1;return [Math.pow(r*f,.8),Math.pow(g*f,.8),Math.pow(b*f,.8)]}
  const RAW=LAMBDA.map(rgb0),SUM=RAW.reduce((s,c)=>[s[0]+c[0],s[1]+c[1],s[2]+c[2]],[0,0,0]),COL=RAW.map(c=>[c[0]/SUM[0],c[1]/SUM[1],c[2]/SUM[2]]);
  const rgb=l=>COL[Math.max(0,Math.min(11,Math.round((l-400)/300*11)))];
  const n=(l,d=1)=>1.52+d*.0105/Math.pow(l/1000,2)*.9;           /* Cauchy (vidro flint), d exagera a dispersão */
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1],nrm=a=>{const L=Math.hypot(a[0],a[1])||1;return [a[0]/L,a[1]/L]};
  function inside(P,tri){let s=0;for(let i=0;i<3;i++){const A=tri[i],B=tri[(i+1)%3],c=(B[0]-A[0])*(P[1]-A[1])-(B[1]-A[1])*(P[0]-A[0]);if(c===0)continue;if(s===0)s=Math.sign(c);else if(Math.sign(c)!==s)return false}return true}
  function hit(o,d,tris){let best=null;tris.forEach((tri,ti)=>{for(let i=0;i<3;i++){const A=tri[i],B=tri[(i+1)%3],e=sub(B,A),den=d[0]*e[1]-d[1]*e[0];if(Math.abs(den)<1e-9)continue;
      const w=sub(A,o),t=(w[0]*e[1]-w[1]*e[0])/den,u=(w[0]*d[1]-w[1]*d[0])/den;if(t>1e-6&&u>=0&&u<=1&&(!best||t<best.t)){let nn=nrm([e[1],-e[0]]);best={t,nn,ti}}}});return best}
  function trace(o){const tris=o.prisms||[],L=o.len||40,out=[];
    const first=hit(o.src,nrm(o.dir),tris);const P1=first?[o.src[0]+o.dir[0]*first.t,o.src[1]+o.dir[1]*first.t]:[o.src[0]+o.dir[0]*L,o.src[1]+o.dir[1]*L];
    out.push({a:o.src,b:P1,c:[1,1,1],white:true});if(!first)return out;
    LAMBDA.forEach((l,li)=>{let p=P1,d=nrm(o.dir),h=first,inG=false,nx=0;const nl=n(l,o.disp??1);
      for(let k=0;k<10&&h;k++){/* na fronteira h: entra ou sai do vidro */let nn=h.nn;if(dot(nn,d)>0)nn=[-nn[0],-nn[1]];const n1=inG?nl:1,n2=inG?1:nl,eta=n1/n2,ci=-dot(nn,d),k2=1-eta*eta*(1-ci*ci);
        if(k2<0){d=nrm([d[0]+2*ci*nn[0],d[1]+2*ci*nn[1]])}else{d=nrm([eta*d[0]+(eta*ci-Math.sqrt(k2))*nn[0],eta*d[1]+(eta*ci-Math.sqrt(k2))*nn[1]]);if(inG)nx++;inG=!inG}
        const q=[p[0]+d[0]*1e-4,p[1]+d[1]*1e-4],h2=hit(q,d,tris);let end;
        if(h2)end=[q[0]+d[0]*h2.t,q[1]+d[1]*h2.t];else{let t=L;if(o.wallX!=null&&d[0]>1e-6)t=Math.min(t,(o.wallX-q[0])/d[0]);end=[q[0]+d[0]*t,q[1]+d[1]*t]}
        out.push({a:p,b:end,c:COL[li],inGlass:inG,li,nx,wall:!h2&&o.wallX!=null&&d[0]>1e-6});p=end;h=h2}});
    return out}
  /* ---------- shader ---------- */
  const NS=64;
  const FS=`#version 300 es
precision highp float;out vec4 o;
uniform vec3 uEye,uF,uR,uU;uniform float uFo,uT,uExp,uA,uDepth,uWall,uFloor,uDust,uI;uniform vec2 uRes;
uniform vec4 uSA[${NS}],uSB[${NS}];uniform vec3 uSC[${NS}];uniform int uNS;uniform vec2 uPr[6];uniform int uNP;uniform vec3 uBx[16];uniform vec3 uBc[8];uniform int uNB;
float h3(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
/* estúdio escuro com 3 luzes de recorte (painel em cima e duas faixas laterais): é o que o vidro reflete e refrata */
vec3 env2(vec3 d,float LI);
vec3 env(vec3 d){return env2(d,1.);}
vec3 env2(vec3 d,float LI){float up=d.y*.5+.5;vec3 c=mix(vec3(.003,.004,.007),vec3(.010,.013,.022),up);
  float box=smoothstep(.90,.95,d.y)*smoothstep(.6,.25,abs(d.x))*smoothstep(.6,.25,abs(d.z));c+=vec3(2.4,2.5,2.8)*box*LI;
  float sL=smoothstep(.06,.02,abs(d.x+.82))*smoothstep(.6,.3,abs(d.y-.1))*step(d.z,.2);c+=vec3(1.1,1.25,1.6)*sL*LI;      /* faixa fria à esquerda */
  float sR=smoothstep(.05,.015,abs(d.x-.78))*smoothstep(.5,.2,abs(d.y-.05))*step(-.6,d.z);c+=vec3(1.6,1.3,.9)*sR*LI;      /* faixa quente à direita */
  c+=vec3(.010,.013,.022)*pow(max(0.,1.-abs(d.y)),6.);return c;}
/* chão escuro envernizado: reflexo borrado das luzes + brilho dos feixes por cima */
vec3 floorCol(vec3 p,vec3 rd){vec3 r=reflect(rd,vec3(0,1,0));float F=.03+.97*pow(1.-max(0.,-rd.y),5.);vec3 c=vec3(.006,.007,.010)+env(normalize(r+vec3(0,.04,0)))*F*.22;
  float g=n3(p*2.5)*.5+n3(p*9.)*.25;c*=.85+.3*g;return c;}
/* prisma k: triângulo (uPr[3k..3k+2]) extrudado em z ∈ [-uDepth,uDepth]; devolve t de entrada/saída e normal de entrada */
/* de dentro do prisma k: distância até a saída e a normal (para fora) */
float exitP(int k,vec3 p,vec3 d,out vec3 nf){vec2 A=uPr[3*k],B=uPr[3*k+1],C=uPr[3*k+2];vec2 cen=(A+B+C)/3.;vec2 V[3];V[0]=A;V[1]=B;V[2]=C;float tf=1e9;nf=vec3(0,1,0);
  for(int i=0;i<3;i++){vec2 a=V[i],b=V[(i+1)%3],e=b-a;vec2 m=normalize(vec2(e.y,-e.x));if(dot(m,cen-a)>0.)m=-m;vec3 N=vec3(m,0.);float dn=dot(N,d);if(dn<=1e-6)continue;float t=dot(N,vec3(a,0.)-p)/dn;if(t<tf){tf=t;nf=N;}}
  for(int s=-1;s<=1;s+=2){vec3 N=vec3(0,0,float(s));float dn=dot(N,d);if(dn<=1e-6)continue;float t=(float(s)*uDepth-dot(N,p))/dn;if(t<tf){tf=t;nf=N;}}return max(tf,0.);}
bool prism(int k,vec3 ro,vec3 rd,out float tn,out float tf,out vec3 nn,out float edge){tn=-1e9;tf=1e9;nn=vec3(0);
  vec2 A=uPr[3*k],B=uPr[3*k+1],C=uPr[3*k+2];vec2 cen=(A+B+C)/3.;vec2 V[3];V[0]=A;V[1]=B;V[2]=C;
  for(int i=0;i<3;i++){vec2 a=V[i],b=V[(i+1)%3],e=b-a;vec2 m=normalize(vec2(e.y,-e.x));if(dot(m,cen-a)>0.)m=-m;vec3 N=vec3(m,0.);float dn=dot(N,rd),dist=dot(N,vec3(a,0.)-ro);
    if(abs(dn)<1e-6){if(dist<0.)return false;continue;}float t=dist/dn;if(dn<0.){if(t>tn){tn=t;nn=N;}}else tf=min(tf,t);}
  for(int s=-1;s<=1;s+=2){vec3 N=vec3(0,0,float(s));float dn=dot(N,rd),dist=float(s)*uDepth-dot(N,ro);if(abs(dn)<1e-6){if(dist<0.)return false;continue;}float t=dist/dn;if(dn<0.){if(t>tn){tn=t;nn=N;}}else tf=min(tf,t);}
  if(tn>tf||tf<0.)return false;
  /* proximidade das arestas no ponto de entrada (para acender as bordas) */
  vec3 p=ro+rd*max(tn,0.);float e=1e9;for(int i=0;i<3;i++){vec2 a=V[i],b=V[(i+1)%3],ab=b-a;float h=clamp(dot(p.xy-a,ab)/dot(ab,ab),0.,1.);float dd=length(p.xy-a-ab*h);e=min(e,dd);}
  float dz=uDepth-abs(p.z);float onCap=step(abs(nn.z),.5);e=onCap>0.5?min(e,dz):e;edge=e;return true;}
/* distância entre o raio da câmera (ro,rd, até tmax) e o segmento [a,b]: devolve (dist, parâmetro no segmento, t no raio) */
vec3 segDist(vec3 ro,vec3 rd,float tmax,vec3 a,vec3 b){vec3 u=b-a;float L=length(u);if(L<1e-5)return vec3(1e9,0,0);u/=L;vec3 w=ro-a;float bb=dot(rd,u),d=dot(rd,w),e=dot(u,w),den=1.-bb*bb;
  float tr,s;if(den<1e-5){tr=0.;s=e;}else{tr=(bb*e-d)/den;s=(e-bb*d)/den;}tr=clamp(tr,0.,tmax);s=clamp(s,0.,L);vec3 pr=ro+rd*tr,ps=a+u*s;return vec3(length(pr-ps),s,tr);}
vec3 beams(vec3 ro,vec3 rd,float tmax){vec3 acc=vec3(0);for(int i=0;i<${NS};i++){if(i>=uNS)break;vec4 A=uSA[i],B=uSB[i];vec3 sd=segDist(ro,rd,tmax,A.xyz,B.xyz);float w=A.w;
    float g=exp(-sd.x*sd.x/(w*w));if(g<.002)continue;vec3 p=A.xyz+normalize(B.xyz-A.xyz)*sd.y;
    float dust=.7+.6*n3(p*7.+vec3(uT*.15,uT*.05,0.));float sp=pow(n3(p*38.+vec3(0,uT*.3,0)),24.)*6.*uDust;
    acc+=uSC[i]*(g*(.55*dust)+g*g*1.6+sp*g)*(B.w);}
  return acc*uI;}
vec3 backdrop(vec3 ro,vec3 rd,out float th){th=1e4;vec3 c=env(rd);if(rd.y<0.&&uFloor>-100.){float tf=(uFloor-ro.y)/rd.y;if(tf>0.){th=tf;vec3 p=ro+rd*tf;c=floorCol(p,rd);}}return c;}
void main(){vec2 sp=gl_FragCoord.xy-uRes*.5;vec3 rd=normalize(uF*uFo+uR*sp.x+uU*sp.y),ro=uEye;
  float tmax=1e4;vec3 col=env2(rd,0.);
  /* peças opacas (bancada, hastes, lanterna): caixas de metal escovado */
  for(int i=0;i<8;i++){if(i>=uNB)break;vec3 b0=uBx[2*i],b1=uBx[2*i+1];vec3 iv=1./rd,t0=(b0-ro)*iv,t1=(b1-ro)*iv,tl=min(t0,t1),th=max(t0,t1);float tn=max(max(tl.x,tl.y),tl.z),tf=min(min(th.x,th.y),th.z);
    if(tn<tf&&tn>0.&&tn<tmax){tmax=tn;vec3 p=ro+rd*tn,c=(b0+b1)*.5,h=(b1-b0)*.5,q=(p-c)/h;vec3 n=abs(q.x)>abs(q.y)&&abs(q.x)>abs(q.z)?vec3(sign(q.x),0,0):abs(q.y)>abs(q.z)?vec3(0,sign(q.y),0):vec3(0,0,sign(q.z));
      vec3 rf=reflect(rd,n);float F=.25+.75*pow(1.-max(0.,dot(-rd,n)),3.);col=uBc[i]*(.08+.1*max(0.,dot(n,normalize(vec3(-.4,.8,.5)))))+env(rf)*F*.35*uBc[i];}}
  /* chão e parede */
  if(rd.y<0.&&uFloor>-100.){float tf=(uFloor-ro.y)/rd.y;if(tf>0.&&tf<tmax){tmax=tf;vec3 p=ro+rd*tf;vec3 l=vec3(0);
      for(int i=0;i<${NS};i++){if(i>=uNS)break;vec3 sd=segDist(p,vec3(0,1,0),.0001,uSA[i].xyz,uSB[i].xyz);l+=uSC[i]*exp(-sd.x*sd.x*.9)*uSB[i].w;}
      col=floorCol(p,rd)+l*.06*uI;}}
  if(rd.x>0.&&uWall<900.){float tw=(uWall-ro.x)/rd.x;if(tw>0.&&tw<tmax){vec3 p=ro+rd*tw;if(p.y>uFloor){tmax=tw;vec3 l=vec3(0);
      for(int i=0;i<${NS};i++){if(i>=uNS)break;vec4 B=uSB[i];if(abs(B.x-uWall)>.05)continue;float d=length(p-B.xyz);l+=uSC[i]*exp(-d*d/(uSA[i].w*uSA[i].w*1.8))*B.w;}
      col=vec3(.02,.021,.025)+l*2.8*uI;}}}
  /* prismas: vidro transparente */
  float tg=1e4;
  for(int k=0;k<2;k++){if(k>=uNP)break;float tn,tf,ed;vec3 nn;if(!prism(k,ro,rd,tn,tf,nn,ed))continue;if(tn>tmax||tn<0.)continue;tg=min(tg,tn);
    float c=clamp(1.+dot(rd,nn),0.,1.),F=.04+.96*pow(c,5.);vec3 rf=reflect(rd,nn);vec3 pe=ro+rd*tn;
    /* entra (Snell, n = 1,52), atravessa, sai (ou reflete por dentro): o fundo aparece deslocado e torto pelo vidro */
    vec3 d2=refract(rd,nn,1./1.52);vec3 nf;float L=exitP(k,pe+d2*1e-3,d2,nf);vec3 px=pe+d2*(L+1e-3);vec3 d3=refract(d2,-nf,1.52);float tir=0.;
    if(dot(d3,d3)<.01){d3=reflect(d2,-nf);tir=1.;vec3 nf2;float L2=exitP(k,px+d3*1e-3,d3,nf2);px=px+d3*(L2+1e-3);vec3 d4=refract(d3,-nf2,1.52);d3=dot(d4,d4)<.01?reflect(d3,-nf2):d4;L+=L2;}
    float th;vec3 bg=backdrop(px,d3,th)+(k==0?beams(px,d3,th)*.9:vec3(0));
    vec3 absorb=exp(-L*vec3(.16,.05,.035));                      /* vidro óptico: tom ciano-esverdeado nas partes grossas */
    vec3 inner=beams(pe,d2,L)*.35;                               /* o feixe acende o vidro por dentro */
    col=mix(bg*absorb*(1.+tir*.4)+inner+vec3(.012,.026,.03)*L,env(rf)*1.15+floorCol(pe,rf)*step(rf.y,0.)*.4,F);
    /* arestas chanfradas: brilho fino e forte, mais forte do lado das luzes */
    float eg=smoothstep(.03,.0,ed),eg2=smoothstep(.10,.0,ed);col+=vec3(1.6,1.7,1.9)*eg*(.45+.55*F)+env(rf)*eg2*.35;
    col+=vec3(.010,.016,.020)*smoothstep(.3,0.,ed);}
  col+=beams(ro,rd,min(tmax,tg));
  vec3 m=1.-exp(-col*uExp);o=vec4(pow(m,vec3(1./1.0))*uA,uA);}`;
  const VS=`#version 300 es
in vec2 aQ;void main(){gl_Position=vec4(aQ,0.,1.);}`;
  let gl=null,cv=null,pr=null,vao=null,U={},CW=0,CH=0;
  function init(w,h){cv=document.createElement('canvas');cv.width=w;cv.height=h;gl=cv.getContext('webgl2',{premultipliedAlpha:true,alpha:true,preserveDrawingBuffer:true});if(!gl)throw new Error('PRISMA: sem WebGL2');
    const mk=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error('PRISMA: '+gl.getShaderInfoLog(x));return x};
    pr=gl.createProgram();gl.attachShader(pr,mk(gl.VERTEX_SHADER,VS));gl.attachShader(pr,mk(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error('PRISMA link: '+gl.getProgramInfoLog(pr));
    const nu=gl.getProgramParameter(pr,gl.ACTIVE_UNIFORMS);for(let i=0;i<nu;i++){const u=gl.getActiveUniform(pr,i);U[u.name.replace('[0]','')]=gl.getUniformLocation(pr,u.name)}
    vao=gl.createVertexArray();gl.bindVertexArray(vao);const bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),gl.STATIC_DRAW);
    const l=gl.getAttribLocation(pr,'aQ');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,8,0);CW=w;CH=h}
  function draw(ctx,c,o){const a=o.a??1;if(a<=0)return [];const res=o.res||.6,w=Math.round(W*res),h=Math.round(H*res);if(!gl||CW!==w||CH!==h)init(w,h);
    let segs=trace(o);
    /* feixe entrando: corta o caminho no comprimento beamLen (soma das distâncias a partir da fonte) */
    if(o.beamLen!=null){const out=[];const byL={};segs.forEach(s=>{const k=s.white?'w':s.li;(byL[k]=byL[k]||[]).push(s)});
      const Lw=Math.hypot(segs[0].b[0]-segs[0].a[0],segs[0].b[1]-segs[0].a[1]);
      for(const k in byL){let acc=k==='w'?0:Lw;for(const s of byL[k]){const L=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]);if(acc>=o.beamLen)break;const f=Math.min(1,(o.beamLen-acc)/L);out.push({...s,b:[s.a[0]+(s.b[0]-s.a[0])*f,s.a[1]+(s.b[1]-s.a[1])*f],wall:s.wall&&f>=1});acc+=L}}segs=out}
    gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(pr);gl.bindVertexArray(vao);
    gl.uniform3fv(U.uEye,c.eye);gl.uniform3fv(U.uF,c.fw);gl.uniform3fv(U.uR,c.rt);gl.uniform3fv(U.uU,c.up);gl.uniform1f(U.uFo,c.f*res);gl.uniform2fv(U.uRes,[w,h]);
    const SA=new Float32Array(NS*4),SB=new Float32Array(NS*4),SC=new Float32Array(NS*3),wd=o.width||.08;let k=0;
    for(const s of segs){if(k>=NS)break;const ww=s.white?wd:s.nx>=2?wd*(o.recW??1):wd*(s.inGlass?.55:.75)*(o.fan??1);SA.set([s.a[0],s.a[1],0,ww],k*4);SB.set([s.b[0],s.b[1],0,s.white?1:(o.colI??1)],k*4);SC.set(s.white?[1,1,1].map(v=>v*(o.whiteI??1)):s.c.map(v=>v*12*(o.satI??1)/12),k*3);k++}
    gl.uniform4fv(U.uSA,SA);gl.uniform4fv(U.uSB,SB);gl.uniform3fv(U.uSC,SC);gl.uniform1i(U.uNS,k);
    const P=new Float32Array(12);(o.prisms||[]).slice(0,2).forEach((t,i)=>t.forEach((v,j)=>P.set(v,(i*3+j)*2)));gl.uniform2fv(U.uPr,P);gl.uniform1i(U.uNP,Math.min(2,(o.prisms||[]).length));
    {const B=(o.boxes||[]).slice(0,8),bx=new Float32Array(48),bc=new Float32Array(24);B.forEach((b,i)=>{bx.set(b.min,i*6);bx.set(b.max,i*6+3);bc.set(b.col||[.6,.62,.66],i*3)});gl.uniform3fv(U.uBx,bx);gl.uniform3fv(U.uBc,bc);gl.uniform1i(U.uNB,B.length)}
    gl.uniform1f(U.uDepth,o.depth||.6);gl.uniform1f(U.uWall,o.wallX??999);gl.uniform1f(U.uFloor,o.floorY??-1.2);gl.uniform1f(U.uDust,o.dust??1);gl.uniform1f(U.uI,o.I??1);gl.uniform1f(U.uT,o.t||0);gl.uniform1f(U.uExp,o.exp??1);gl.uniform1f(U.uA,a);
    gl.drawArrays(gl.TRIANGLES,0,6);ctx.save();ctx.imageSmoothingQuality='high';ctx.drawImage(cv,0,0,W,H);
    ctx.globalCompositeOperation='lighter';ctx.filter=`blur(${Math.round(W*.02)}px)`;ctx.globalAlpha=o.bloom??.8;ctx.drawImage(cv,0,0,W,H);ctx.filter=`blur(${Math.round(W*.07)}px)`;ctx.globalAlpha=(o.bloom??.8)*.6;ctx.drawImage(cv,0,0,W,H);ctx.restore();
    return segs}
  return {trace,draw,LAMBDA,rgb,n,COL}})();
