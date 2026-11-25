/* ---------- FX: biblioteca extra de animação (injetada antes das cenas; tudo dentro de FX para não colidir com nomes das cenas) ----------
   Ruído e campos de fluxo · partículas determinísticas · contadores · texto digitado · gráficos de barra/linha ·
   câmera com keyframes · 3D (esfera, toro, caixa, extrusão, linhas) · rastros com brilho · imagens/SVG do projeto. */
const FX=(()=>{
  /* ruído de valor 2D/3D determinístico + fbm */
  const P=new Uint8Array(512);{let s=1337;for(let i=0;i<256;i++)P[i]=i;for(let i=255;i>0;i--){s=(s*1664525+1013904223)>>>0;const j=s%(i+1);[P[i],P[j]]=[P[j],P[i]]}for(let i=0;i<256;i++)P[i+256]=P[i]}
  const fade=t=>t*t*t*(t*(t*6-15)+10),gr=(h,x,y,z)=>{const u=(h&15)<8?x:y,v=(h&15)<4?y:((h&15)===12||(h&15)===14)?x:z;return((h&1)?-u:u)+((h&2)?-v:v)};
  function noise(x,y,z=0){const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);const u=fade(x),v=fade(y),w=fade(z);
    const A=P[X]+Y,AA=P[A]+Z,AB=P[A+1]+Z,B=P[X+1]+Y,BA=P[B]+Z,BB=P[B+1]+Z;
    return lerp(lerp(lerp(gr(P[AA],x,y,z),gr(P[BA],x-1,y,z),u),lerp(gr(P[AB],x,y-1,z),gr(P[BB],x-1,y-1,z),u),v),lerp(lerp(gr(P[AA+1],x,y,z-1),gr(P[BA+1],x-1,y,z-1),u),lerp(gr(P[AB+1],x,y-1,z-1),gr(P[BB+1],x-1,y-1,z-1),u),v),w)}
  const fbm=(x,y,z=0,o=4)=>{let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*noise(x*f,y*f,z*f);a*=.5;f*=2}return s};
  function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const hx=c=>{const n=parseInt(c.slice(1,7),16);return [n>>16&255,n>>8&255,n&255]};
  const rgba=(c,a)=>{if(c.startsWith('rgb'))return c;const A=hx(c);return `rgba(${A[0]},${A[1]},${A[2]},${a})`};

  /* partículas: estado avançado quadro a quadro e guardado em cache (o render vai em ordem; voltar no tempo recalcula) */
  const PS={};
  /* o: {n, seed, area:[x,y,w,h], field:(x,y,t)=>[vx,vy], life:[min,max] s, size, color, trail(0..1), fps} */
  function particles(ctx,key,t,o){const fps=o.fps||30,f=Math.floor(t*fps);let S=PS[key];
    const spawn=(p,R)=>{const a=o.area||[0,0,W,H];p.x=a[0]+R()*a[2];p.y=a[1]+R()*a[3];p.age=0;p.life=(o.life?lerp(o.life[0],o.life[1],R()):4)*fps;p.px=p.x;p.py=p.y};
    if(!S||f<S.f){const R=rng(o.seed||1);S=PS[key]={f:0,R,p:[...Array(o.n)].map(()=>{const p={};spawn(p,R);p.age=R()*p.life;return p})}}
    while(S.f<f){const tt=S.f/fps;for(const p of S.p){p.px=p.x;p.py=p.y;const [vx,vy]=o.field(p.x,p.y,tt);p.x+=vx;p.y+=vy;p.age++;if(p.age>p.life)spawn(p,S.R)}S.f++}
    ctx.save();ctx.lineCap='round';const col=o.color||C.chalk,sz=o.size||2.6;
    for(const p of S.p){const a=Math.sin(Math.PI*clamp(p.age/p.life))*(o.a??1);if(a<=0)continue;ctx.globalAlpha=a;ctx.strokeStyle=col;ctx.lineWidth=sz;
      ctx.beginPath();ctx.moveTo(p.px-(p.x-p.px)*(o.trail??8),p.py-(p.y-p.py)*(o.trail??8));ctx.lineTo(p.x,p.y);ctx.stroke()}
    ctx.restore();return S.p}
  /* campo de fluxo pronto (curl de ruído) */
  const curl=(scale=.004,speed=2,evo=.05)=>(x,y,t)=>{const e=.5,n1=fbm(x*scale,(y+e)*scale,t*evo),n2=fbm(x*scale,(y-e)*scale,t*evo),n3=fbm((x+e)*scale,y*scale,t*evo),n4=fbm((x-e)*scale,y*scale,t*evo);
    return [(n1-n2)/(2*e)*speed/scale*.5,-(n3-n4)/(2*e)*speed/scale*.5]};

  /* número que conta (formato do idioma) */
  function counter(ctx,from,to,t0,dur,t,x,y,o={}){const v=lerp(from,to,(o.ease||easeOut)(clamp((t-t0)/dur))),d=o.dec??0;
    const s=v.toLocaleString(LANG==='pt'?'pt-BR':'en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
    txt(ctx,(o.prefix||'')+s+(o.suffix||''),x,y,{font:o.font||F.mono,size:o.size||48,color:o.color||C.chalk,align:o.align||'center',a:o.a??ramp(t,t0-.3,t0)});return v}
  /* texto (não-equação) digitado com cursor; para fórmulas use deriv/eqIn */
  function typeOn(ctx,s,x,y,t0,t,o={}){const cps=o.cps||28,n=Math.max(0,Math.min(s.length,Math.floor((t-t0)*cps)));if(n<=0)return;
    txt(ctx,s.slice(0,n),x,y,{...o,align:o.align||'left'});if(n<s.length&&Math.floor(t*3)%2===0){ctx.save();ctx.font=`${o.weight||400} ${o.size||40}px ${o.font||F.mono}`;const w=ctx.measureText(s.slice(0,n)).width;ctx.restore();
      ctx.save();ctx.fillStyle=o.color||C.chalk;ctx.globalAlpha=.8;ctx.fillRect(x+w+4,y-(o.size||40)*.75,(o.size||40)*.08,(o.size||40)*.9);ctx.restore()}
    if(n>0&&o.key)logEv(o.key+':'+n,'type',n)}

  /* gráfico de barras animado: data=[{label,value,color?}] */
  function bars(ctx,data,t,o){const [x,y,w,h]=o.box,max=o.max||Math.max(...data.map(d=>d.value)),bw=w/data.length,g=o.gap??.25;
    data.forEach((d,i)=>{const at=(o.t0||0)+i*(o.stagger??.15),p=easeOut(clamp((t-at)/(o.dur||.9))),bh=h*d.value/max*p,X=x+i*bw+bw*g/2,col=d.color||o.color||C.cyan;
      ctx.save();ctx.fillStyle=rgba(col,.35);ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.shadowColor=col;ctx.shadowBlur=8;ctx.beginPath();ctx.roundRect(X,y+h-bh,bw*(1-g),bh,4);ctx.fill();ctx.stroke();ctx.restore();
      if(p>0){txt(ctx,d.label,X+bw*(1-g)/2,y+h+34,{font:F.mono,size:o.labelSize||22,color:C.dim,a:p});if(o.values!==false)txt(ctx,(o.fmt||(v=>String(Math.round(v))))(d.value*p),X+bw*(1-g)/2,y+h-bh-12,{font:F.mono,size:o.valueSize||24,color:col,a:p})}
      if(p>0&&o.key)logEv(o.key+':'+i,'pop',i)})}
  /* linha de dados desenhando-se: pts=[[x,y]...] em coordenadas de dados; o.box,[x0,x1],[y0,y1] */
  function lineChart(ctx,pts,t,o){const [X,Y,Wd,Hd]=o.box,[a0,a1]=o.xr,[b0,b1]=o.yr,P=([u,v])=>[X+(u-a0)/(a1-a0)*Wd,Y+Hd-(v-b0)/(b1-b0)*Hd],p=clamp((t-(o.t0||0))/(o.dur||2));
    ctx.save();ctx.strokeStyle='rgba(236,230,214,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X,Y);ctx.lineTo(X,Y+Hd);ctx.lineTo(X+Wd,Y+Hd);ctx.stroke();ctx.restore();
    const n=Math.max(2,Math.floor(pts.length*p)),Q=pts.slice(0,n).map(P);poly(ctx,Q,Q.length,{color:o.color||C.gold,lw:o.lw||4,glow:o.glow??12});
    if(p>0&&p<1){const q=Q[Q.length-1];ctx.save();ctx.fillStyle=o.color||C.gold;ctx.shadowColor=o.color||C.gold;ctx.shadowBlur=16;ctx.beginPath();ctx.arc(q[0],q[1],7,0,TAU);ctx.fill();ctx.restore()}return Q}

  /* câmera: keys=[{t,x,y,z,rot}] interpoladas com ease; aplica translate/scale/rotate centrado na tela */
  function camAt(t,keys){let a=keys[0],b=keys[keys.length-1];for(let i=0;i<keys.length-1;i++)if(t>=keys[i].t&&t<=keys[i+1].t){a=keys[i];b=keys[i+1];break}
    if(t<=keys[0].t)a=b=keys[0];const u=a===b?0:ease((t-a.t)/(b.t-a.t)),L=(k,d)=>lerp(a[k]??d,b[k]??d,u);return {x:L('x',W/2),y:L('y',H/2),z:L('z',1),rot:L('rot',0)}}
  function cam(ctx,c){ctx.translate(W/2,H/2);ctx.rotate(c.rot||0);ctx.scale(c.z||1,c.z||1);ctx.translate(-(c.x??W/2),-(c.y??H/2))}

  /* 3D */
  function pj(c,x,y,z){const cy=Math.cos(c.yaw),sy=Math.sin(c.yaw);const x1=x*cy-y*sy,y1=x*sy+y*cy;const cp=Math.cos(c.pitch),sp=Math.sin(c.pitch);
    const d=y1*cp-z*sp,up=z*cp+y1*sp;const k=c.dist/(c.dist+d);return [c.cx+x1*c.scale*k,c.cy-up*c.scale*k,d]}
  function faces(ctx,F){F.forEach(f=>{f.P=f.v.map(p=>pj(f.cam,...p));f.d=f.P.reduce((s,p)=>s+p[2],0)/f.P.length+(f.bias||0)});F.sort((a,b)=>b.d-a.d);
    for(const f of F){ctx.save();ctx.globalAlpha*=f.a??1;ctx.beginPath();f.P.forEach(([X,Y],i)=>i?ctx.lineTo(X,Y):ctx.moveTo(X,Y));ctx.closePath();
      if(f.fill){ctx.fillStyle=f.fill;ctx.fill()}if(f.stroke){ctx.strokeStyle=f.stroke;ctx.lineWidth=f.lw||1.2;ctx.lineJoin='round';ctx.stroke()}ctx.restore()}}
  /* luz simples: escurece faces de costas para a luz */
  const shade=(v,col,a,lt=[.4,-.5,.8])=>{const [p,q,r]=v,u=[q[0]-p[0],q[1]-p[1],q[2]-p[2]],w=[r[0]-p[0],r[1]-p[1],r[2]-p[2]],n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n)||1,k=clamp(.35+.65*Math.abs((n[0]*lt[0]+n[1]*lt[1]+n[2]*lt[2])/l));
    const A=hx(col);return `rgba(${Math.round(A[0]*k)},${Math.round(A[1]*k)},${Math.round(A[2]*k)},${a})`};
  function sphere(cam,r,o={}){const la=o.lat||14,lo=o.lon||24,c=o.c||[0,0,0],F=[],col=o.color||C.cyan,P=(i,j)=>{const th=Math.PI*i/la,ph=TAU*j/lo+(o.spin||0);return [c[0]+r*Math.sin(th)*Math.cos(ph),c[1]+r*Math.sin(th)*Math.sin(ph),c[2]+r*Math.cos(th)]};
    for(let i=0;i<la;i++)for(let j=0;j<lo;j++){const v=[P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)];F.push({cam,v,fill:shade(v,col,o.fa??.55),stroke:rgba(col,o.sa??.5),lw:1,a:o.a??1})}return F}
  function torus(cam,R,r,o={}){const nu=o.nu||28,nv=o.nv||14,F=[],col=o.color||C.gold,P=(i,j)=>{const u=TAU*i/nu+(o.spin||0),v=TAU*j/nv;return [(R+r*Math.cos(v))*Math.cos(u),(R+r*Math.cos(v))*Math.sin(u),r*Math.sin(v)]};
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const v=[P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)];F.push({cam,v,fill:shade(v,col,o.fa??.55),stroke:rgba(col,o.sa??.45),lw:1,a:o.a??1})}return F}
  function box(cam,x0,y0,z0,dx,dy,dz,o={}){const col=o.color||C.gold,X=[x0,x0+dx],Y=[y0,y0+dy],Z=[z0,z0+dz],v=(i,j,k)=>[X[i],Y[j],Z[k]];
    return [[v(0,0,1),v(1,0,1),v(1,1,1),v(0,1,1)],[v(0,0,0),v(0,1,0),v(1,1,0),v(1,0,0)],[v(0,0,0),v(1,0,0),v(1,0,1),v(0,0,1)],[v(0,1,0),v(0,1,1),v(1,1,1),v(1,1,0)],[v(0,0,0),v(0,0,1),v(0,1,1),v(0,1,0)],[v(1,0,0),v(1,1,0),v(1,1,1),v(1,0,1)]]
      .map(q=>({cam,v:q,fill:shade(q,col,o.fa??.45),stroke:rgba(col,o.sa??.9),lw:o.lw||1.6,a:o.a??1}))}
  /* extrusão de um polígono 2D (pts no plano xy) até altura h */
  function extrude(cam,pts,h,o={}){const col=o.color||C.cyan,z0=o.z||0,F=[{cam,v:pts.map(([x,y])=>[x,y,z0+h]),fill:shade(pts.slice(0,3).map(([x,y])=>[x,y,z0+h]),col,o.fa??.5),stroke:rgba(col,.9),lw:1.4,a:o.a??1}];
    pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length],v=[[p[0],p[1],z0],[q[0],q[1],z0],[q[0],q[1],z0+h],[p[0],p[1],z0+h]];F.push({cam,v,fill:shade(v,col,o.fa??.5),stroke:rgba(col,.7),lw:1.2,a:o.a??1})});return F}
  function line3(ctx,cam,P3,o={}){const Q=P3.map(p=>pj(cam,...p));poly(ctx,Q,Q.length,{color:o.color||C.gold,lw:o.lw||3,glow:o.glow??10,a:o.a??1});return Q}
  /* rastro com brilho que se apaga na cauda */
  function trail(ctx,pts,o={}){const n=pts.length;if(n<2)return;ctx.save();ctx.lineCap='round';for(let i=1;i<n;i++){ctx.globalAlpha=(o.a??1)*(i/n)**1.5;ctx.strokeStyle=o.color||C.gold;ctx.lineWidth=(o.lw||4)*(.3+.7*i/n);
      if(o.glow){ctx.shadowColor=o.color||C.gold;ctx.shadowBlur=o.glow}ctx.beginPath();ctx.moveTo(pts[i-1][0],pts[i-1][1]);ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke()}ctx.restore()}

  /* imagens do projeto (pasta assets/, embutidas no build como data URI): image(ctx,'nome.svg',x,y,w,h,{a,fit:'contain'|'cover',center}) */
  const IMG={};const ready=Promise.all(Object.entries(typeof __ASSETS__!=='undefined'?__ASSETS__:{}).map(([k,src])=>new Promise(res=>{const im=new Image();im.onload=()=>{IMG[k]=im;res()};im.onerror=()=>{console.warn('asset falhou',k);res()};im.src=src})));
  window.__assetsReady=ready;
  function image(ctx,name,x,y,w,h,o={}){const im=IMG[name];if(!im||(o.a??1)<=0)return;ctx.save();ctx.globalAlpha*=o.a??1;let dw=w,dh=h;
    if(o.fit!=='stretch'){const r=im.width/im.height;if(o.fit==='cover'?w/h<r:w/h>r){dw=h*r}else{dh=w/r}}const X=o.center===false?x:x-dw/2,Y=o.center===false?y:y-dh/2;
    if(o.rot){ctx.translate(x,y);ctx.rotate(o.rot);ctx.translate(-x,-y)}ctx.drawImage(im,X,Y,dw,dh);ctx.restore()}

  /* pulso suave (período >= 1,5 s, regra do ritmo calmo) */
  const pulse=(t,period=2.2,lo=.75,hi=1)=>lo+(hi-lo)*(.5+.5*Math.sin(t*TAU/period));
  /* revelação por máscara circular (íris local) */
  function reveal(ctx,x,y,r,draw){ctx.save();ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,TAU);ctx.clip();draw();ctx.restore()}
  /* emite um som contínuo ligado a um valor 0..1 (o sfx2.py transforma em glissando): FX.tone('nome',t,v) */
  function tone(name,t,v){logEv(name+':'+Math.round(t*30),'tone:'+name,v)}
  function toneA(name,t,v,amp){logEv(name+':'+Math.round(t*30),'tone:'+name,v);logEv(name+':a'+Math.round(t*30),'amp:'+name,amp)}
  return {noise,fbm,rng,rgba,particles,curl,counter,typeOn,bars,lineChart,camAt,cam,pj,faces,shade,sphere,torus,box,extrude,line3,trail,image,IMG,pulse,reveal,tone,toneA};
})();
