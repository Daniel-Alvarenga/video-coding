/* ---------- CHEM: química que se mexe (sempre injetado) ----------
   CHEM.field(key,simT,{w,h,a,b,eps,dx,dt,init,pace})  meio excitável de Barkley (reação-difusão), avançado até o tempo simT e cacheado
       init: 'spiral' | 'pair' | 'none' | (U,V,w,h)=>{}   pace: [{x,y,period,r}] marca-passos que disparam ondas-alvo (círculos)
   CHEM.paint(ctx,F,x,y,W,H,{a,map,clip:'circle'})  pinta o campo com o mapa de cores da ferroína (vermelho ↔ azul)
   CHEM.osc(t,{period})  oscilador (c = cor da ferroína pronta, 0..1) de Oregonator (relaxação) pré-calculado: {x,z} entre 0 e 1, periódico
   CHEM.ferroin(v)  cor da ferroína para v em 0..1 (0 = reduzida/vermelha, 1 = oxidada/azul)
   CHEM.beaker(ctx,x,y,w,h,col,{a,t,bubbles})  béquer com líquido      CHEM.dish(ctx,x,y,r,{a})  placa de Petri (borda)
   CHEM.sheet(ctx,x,y,w,h,{title,lines,stamp,stampAt,t,a,rot})  folha de manuscrito com carimbo opcional */
const CHEM=(()=>{
  const FS={};
  function setup(o){const w=o.w||240,h=o.h||135,U=new Float32Array(w*h),V=new Float32Array(w*h);
    if(o.init==='spiral'||o.init==='pair'){const cx=Math.floor(w*(o.init==='pair'?.5:.5)),cy=Math.floor(h/2);
      for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=j*w+i;
        /* frente de onda quebrada: excitado numa faixa, refratário atrás dela; a ponta solta enrola em espiral */
        const half=o.init==='pair'?Math.abs(j-cy)<h*.22:j<cy;if(half&&i>cx-6&&i<cx)U[k]=1;if(half&&i>=cx-14&&i<=cx-6)V[k]=.6}}
    else if(typeof o.init==='function')o.init(U,V,w,h);
    return {w,h,U,V,U2:new Float32Array(w*h),T:0,n:0}}
  function step(S,o){const {w,h,U,V,U2}=S,a=o.a??.75,b=o.b??.06,ie=1/(o.eps??.02),dt=o.dt??.01,k2=1/((o.dx??.4)**2);
    for(let j=0;j<h;j++){const jm=j?j-1:1,jp=j<h-1?j+1:h-2;for(let i=0;i<w;i++){const im=i?i-1:1,ip=i<w-1?i+1:w-2,k=j*w+i,u=U[k],v=V[k];
      const lap=(U[j*w+im]+U[j*w+ip]+U[jm*w+i]+U[jp*w+i]-4*u)*k2,th=(v+b)/a;let un=u+dt*(ie*u*(1-u)*(u-th)+lap);
      U2[k]=un<0?0:un>1?1:un;V[k]=v+dt*(u-v)}}
    S.U=U2;S.U2=U;S.n++;S.T+=dt;
    if(o.pace)for(const p of o.pace){const ph=S.T%p.period;if(ph<dt&&S.T>=(p.t0||0)){const r=p.r||2;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const X=p.x+x,Y=p.y+y;if(X>=0&&X<w&&Y>=0&&Y<h&&S.V[Y*w+X]<.3)S.U[Y*w+X]=1}}}}
  function field(key,simT,o={}){let S=FS[key];if(!S||simT<S.T-1e-9){S=FS[key]=setup(o)}const dt=o.dt??.01;let guard=0;while(S.T+dt<=simT&&guard++<400000)step(S,o);return S}
  /* ferroína: vermelho-alaranjado (reduzida) → azul (oxidada) */
  const R0=[214,74,52],R1=[70,120,235],BGc=[30,12,14];
  function ferroin(v){v=clamp(v);return `rgb(${Math.round(lerp(R0[0],R1[0],v))},${Math.round(lerp(R0[1],R1[1],v))},${Math.round(lerp(R0[2],R1[2],v))})`}
  const cv={};function paint(ctx,S,x,y,Wd,Hd,o={}){const {w,h,U,V}=S;let c=cv[w+'x'+h];if(!c){c=document.createElement('canvas');c.width=w;c.height=h;cv[w+'x'+h]=c}
    const g=c.getContext('2d'),im=g.createImageData(w,h),d=im.data;
    for(let k=0;k<w*h;k++){const u=U[k],v=V[k],m=o.map?o.map(u,v):clamp(u*1.3+v*.25);d[k*4]=lerp(R0[0],R1[0],m);d[k*4+1]=lerp(R0[1],R1[1],m);d[k*4+2]=lerp(R0[2],R1[2],m);d[k*4+3]=255}
    g.putImageData(im,0,0);ctx.save();ctx.globalAlpha*=o.a??1;if(o.clip==='circle'){ctx.beginPath();ctx.ellipse(x+Wd/2,y+Hd/2,Wd/2,Hd/2,0,0,TAU);ctx.clip()}
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(c,x,y,Wd,Hd);
    /* brilho úmido por cima */const gr=ctx.createRadialGradient(x+Wd*.35,y+Hd*.3,10,x+Wd/2,y+Hd/2,Math.max(Wd,Hd)*.7);gr.addColorStop(0,'rgba(255,255,255,.10)');gr.addColorStop(1,'rgba(0,0,0,.25)');ctx.fillStyle=gr;ctx.fillRect(x,y,Wd,Hd);ctx.restore()}
  /* Oregonator de 2 variáveis (Tyson): ε dx/dt = x(1-x) - f z (x-q)/(x+q),  dz/dt = x - z */
  let OS=null;function oscPre(){const eps=.04,q=.002,f=1,dt=2e-5,N=Math.round(40/dt),every=50,out=[];let x=.1,z=.1;
    for(let i=0;i<N;i++){const dx=(x*(1-x)-f*z*(x-q)/(x+q))/eps,dz=x-z;x+=dt*dx;z+=dt*dz;if(i%every===0)out.push([x,z])}
    /* recorta um período estável (após o transiente) */const s=out.slice(Math.floor(out.length/2)),xs=s.map(p=>p[0]),mx=Math.max(...xs),mn=Math.min(...xs),zs=s.map(p=>p[1]),zx=Math.max(...zs),zn=Math.min(...zs);
    const up=[];for(let i=1;i<s.length;i++)if(xs[i-1]<(mx+mn)/2&&xs[i]>=(mx+mn)/2)up.push(i);const per=s.slice(up[0],up[1]);
    OS=per.map(p=>[(p[0]-mn)/(mx-mn),(p[1]-zn)/(zx-zn)])}
  function osc(t,o={}){if(!OS)oscPre();const P=o.period||4,u=((t/P)%1+1)%1,f=u*(OS.length-1),i=Math.floor(f),j=Math.min(OS.length-1,i+1),r=f-i;const z=lerp(OS[i][1],OS[j][1],r);return {x:lerp(OS[i][0],OS[j][0],r),z,c:ease(clamp(z*2.2))}}
  function beaker(ctx,x,y,w,h,col,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;const lv=o.level??.62,ly=y+h*(1-lv);
    ctx.fillStyle=col;ctx.globalAlpha*=.85;ctx.beginPath();ctx.moveTo(x+6,ly);ctx.lineTo(x+w-6,ly);ctx.lineTo(x+w-6,y+h-14);ctx.quadraticCurveTo(x+w-6,y+h-4,x+w-18,y+h-4);ctx.lineTo(x+18,y+h-4);ctx.quadraticCurveTo(x+6,y+h-4,x+6,y+h-14);ctx.closePath();ctx.fill();
    ctx.globalAlpha=a*.25;ctx.fillStyle='#fff';ctx.fillRect(x+16,ly+10,10,h*lv-30);
    if(o.bubbles){ctx.globalAlpha=a*.5;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;for(let i=0;i<10;i++){const r=FX.rng(i+3),u=((o.t||0)*.3+r())%1,bx=x+20+r()*(w-40),by=y+h-10-u*h*lv*.9;ctx.beginPath();ctx.arc(bx,by,2+r()*3,0,TAU);ctx.stroke()}}
    ctx.globalAlpha=a;ctx.strokeStyle=C.chalk;ctx.lineWidth=4;ctx.shadowColor=C.chalk;ctx.shadowBlur=8;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x,y+8);ctx.lineTo(x,y+h-14);ctx.quadraticCurveTo(x,y+h,x+14,y+h);ctx.lineTo(x+w-14,y+h);ctx.quadraticCurveTo(x+w,y+h,x+w,y+h-14);ctx.lineTo(x+w,y+8);ctx.lineTo(x+w+10,y);ctx.stroke();
    ctx.lineWidth=2;ctx.globalAlpha=a*.5;for(let i=1;i<=3;i++){const yy=y+h-i*h*.2;ctx.beginPath();ctx.moveTo(x+w-34,yy);ctx.lineTo(x+w-6,yy);ctx.stroke()}ctx.restore()}
  function dish(ctx,x,y,r,o={}){ctx.save();ctx.globalAlpha*=o.a??1;ctx.strokeStyle=C.chalk;ctx.lineWidth=5;ctx.shadowColor=C.chalk;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.globalAlpha*=.35;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r+12,0,TAU);ctx.stroke();ctx.restore()}
  function sheet(ctx,x,y,w,h,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x+w/2,y+h/2);ctx.rotate(o.rot||0);ctx.translate(-w/2,-h/2);
    ctx.fillStyle='#ece6d6';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=24;ctx.fillRect(0,0,w,h);ctx.shadowBlur=0;
    ctx.fillStyle='#2a2a33';ctx.font=`600 ${Math.round(w*.05)}px ${F.display}`;ctx.textAlign='left';if(o.title)ctx.fillText(o.title,w*.1,h*.12);
    ctx.fillStyle='rgba(42,42,51,.35)';for(let i=0;i<(o.lines||14);i++){const r=FX.rng(i+9);ctx.fillRect(w*.1,h*.2+i*h*.05,w*(.55+r()*.3),h*.012)}
    if(o.stamp){const s=ramp(o.t??99,o.stampAt??0,(o.stampAt??0)+.25);if(s>0){ctx.save();ctx.translate(w*.5,h*.55);ctx.rotate(-.25);ctx.scale(1+(1-s)*.8,1+(1-s)*.8);ctx.globalAlpha=s*.9;ctx.strokeStyle=C.rose;ctx.fillStyle=C.rose;ctx.lineWidth=6;
      ctx.font=`700 ${Math.round(w*.11)}px ${F.sans}`;ctx.textAlign='center';const tw=ctx.measureText(o.stamp).width;ctx.strokeRect(-tw/2-20,-w*.1,tw+40,w*.15);ctx.fillText(o.stamp,0,w*.02);ctx.restore()}}
    ctx.restore()}
  return {field,paint,osc,ferroin,beaker,dish,sheet};
})();
