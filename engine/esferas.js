/* ---------- ESF: esferas dentro de uma esfera de vidro (encher, empacotar, derreter) ----------
   Feito para o Short "Quantas LUAS cabem dentro da TERRA?" (projetos/luas-na-terra, 15/11/2026). Unidades: raio do recipiente = 1, y para cima.
     const c=ESF.cam({cx,cy,R,D,yaw,pitch})   câmera em perspectiva; R = raio do contorno do recipiente na tela; c.P([x,y,z]) → [sx,sy,escala,z]
     ESF.back(ctx,c,{a})        fundo do vidro (interior escuro, borda de trás) — desenhe antes do conteúdo
     ESF.front(ctx,c,{a,t})     frente do vidro (brilho de borda, reflexo, fresnel) — desenhe depois
     ESF.lava(ctx,c,h,t,{a,glow})  líquido incandescente até a altura h (−1..1), com superfície elíptica em perspectiva
     ESF.frac(h) fração do volume abaixo de y=h;  ESF.levelFor(f) altura que deixa a fração f cheia
     ESF.drop(t,t0,dur,y0,y1)   queda com gravidade e quique curto: devolve {y,land,squash} (land = 0..1 depois de tocar)
     ESF.splash(ctx,c,p,u,{col})  respingo (anel na superfície + gotas) para u 0..1
   Tudo determinístico (sem Math.random). */
const ESF=(()=>{
  function cam(o){const yaw=o.yaw||0,pit=o.pitch||0,D=o.D||4,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pit),sp=Math.sin(pit);
    const f=o.R*Math.sqrt(D*D-1);   /* contorno da esfera unitária vista de D com raio R na tela */
    const P=p=>{let [x,y,z]=p;const x1=x*cy+z*sy,z1=-x*sy+z*cy;const y2=y*cp-z1*sp,z2=y*sp+z1*cp;const s=f/(D-z2);return [o.cx+x1*s,o.cy-y2*s,s,z2]};
    return {P,f,D,R:o.R,cx:o.cx,cy:o.cy,yaw,pitch:pit}}
  function back(ctx,c,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha=a;const g=ctx.createRadialGradient(c.cx,c.cy-c.R*.2,c.R*.1,c.cx,c.cy,c.R);
    g.addColorStop(0,'rgba(20,40,70,.55)');g.addColorStop(.8,'rgba(10,22,44,.65)');g.addColorStop(1,'rgba(60,120,200,.5)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.cx,c.cy,c.R,0,TAU);ctx.fill();ctx.restore()}
  function front(ctx,c,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha=a;ctx.globalCompositeOperation='lighter';
    /* fresnel: borda clara */const g=ctx.createRadialGradient(c.cx,c.cy,c.R*.78,c.cx,c.cy,c.R*1.02);g.addColorStop(0,'rgba(120,190,255,0)');g.addColorStop(.85,'rgba(140,200,255,.28)');g.addColorStop(1,'rgba(200,235,255,.0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.cx,c.cy,c.R*1.02,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(170,220,255,.75)';ctx.lineWidth=3;ctx.shadowColor='#7cc4ff';ctx.shadowBlur=30;ctx.beginPath();ctx.arc(c.cx,c.cy,c.R,0,TAU);ctx.stroke();ctx.shadowBlur=0;
    /* reflexo da janela (curvo, no alto à esquerda) */const sx=c.cx-c.R*.42,sy=c.cy-c.R*.5,rg=ctx.createRadialGradient(sx,sy,0,sx,sy,c.R*.42);rg.addColorStop(0,'rgba(255,255,255,.22)');rg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=rg;ctx.beginPath();ctx.ellipse(sx,sy,c.R*.36,c.R*.2,-.7,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=c.R*.025;ctx.lineCap='round';ctx.beginPath();ctx.arc(c.cx,c.cy,c.R*.9,Math.PI*1.08,Math.PI*1.32);ctx.stroke();ctx.restore()}
  /* volume abaixo do plano y=h numa esfera unitária */
  const frac=h=>{h=clamp(h,-1,1);const d=h+1;return d*d*(3-d)/4};
  const levelFor=f=>{let lo=-1,hi=1;for(let i=0;i<40;i++){const m=(lo+hi)/2;frac(m)<f?lo=m:hi=m}return (lo+hi)/2};
  /* textura de lava (cache) */
  let TEX=null;function tex(){if(TEX)return TEX;const n=256,cv=document.createElement('canvas');cv.width=cv.height=n;const x=cv.getContext('2d'),im=x.createImageData(n,n);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const u=i/n,v=j/n,a=FX.fbm(Math.cos(u*TAU)*1.6+5,Math.sin(u*TAU)*1.6+5,v*5,5),b=Math.abs(FX.noise(u*14,v*14,3));
      const k=clamp(.55+a*1.4),vein=clamp(1-b*7);const r=255*clamp(.55+k*.5+vein*.3),g=255*clamp(.12+k*.45+vein*.35),bb=255*clamp(.02+k*.1+vein*.25),q=(j*n+i)*4;
      im.data[q]=r;im.data[q+1]=g;im.data[q+2]=bb;im.data[q+3]=255}x.putImageData(im,0,0);TEX=cv;return cv}
  function lava(ctx,c,h,t,o={}){const a=o.a??1;if(a<=0||h<=-1)return;const yS=c.P([0,h,0]),rr=Math.sqrt(Math.max(0,1-h*h)),ry=Math.abs(Math.sin(c.pitch))*rr*c.R,rx=rr*c.R;
    ctx.save();ctx.globalAlpha=a;ctx.beginPath();ctx.arc(c.cx,c.cy,c.R-1,0,TAU);ctx.clip();
    /* corpo: abaixo da elipse da superfície */ctx.beginPath();ctx.rect(c.cx-c.R*2,yS[1],c.R*4,c.R*4);
    if(h>=.999){ctx.beginPath();ctx.arc(c.cx,c.cy,c.R,0,TAU)}
    ctx.save();ctx.clip();const T=tex(),sz=c.R*1.3,ox=(t*18)%sz,oy=(t*7)%sz;for(let i=-2;i<3;i++)for(let j=-2;j<3;j++)ctx.drawImage(T,c.cx-sz*1.5+i*sz+ox,c.cy-sz*1.5+j*sz+oy,sz,sz);
    const sh=ctx.createRadialGradient(c.cx,c.cy-c.R*.3,c.R*.2,c.cx,c.cy,c.R);sh.addColorStop(0,'rgba(255,190,90,.1)');sh.addColorStop(1,'rgba(60,8,0,.55)');ctx.fillStyle=sh;ctx.fillRect(c.cx-c.R,c.cy-c.R,c.R*2,c.R*2);ctx.restore();
    /* superfície: elipse mais clara com brilho */if(h<.995&&ry>.5){ctx.save();ctx.beginPath();ctx.ellipse(c.cx,yS[1],rx,ry,0,0,TAU);ctx.clip();const T=tex(),sz=c.R*.8,ox=(t*30)%sz;
      for(let i=-2;i<3;i++)for(let j=-1;j<2;j++)ctx.drawImage(T,c.cx-sz*1.5+i*sz+ox,yS[1]-sz/2+j*sz,sz,sz);ctx.fillStyle='rgba(255,230,150,.35)';ctx.fillRect(c.cx-rx,yS[1]-ry,rx*2,ry*2);ctx.restore();
      ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(255,220,140,.8)';ctx.lineWidth=3;ctx.shadowColor='#ffb347';ctx.shadowBlur=24;ctx.beginPath();ctx.ellipse(c.cx,yS[1],rx,ry,0,0,TAU);ctx.stroke()}
    ctx.restore();
    if(o.glow!==false){ctx.save();ctx.globalCompositeOperation='lighter';const gg=ctx.createRadialGradient(c.cx,c.cy,c.R*.6,c.cx,c.cy,c.R*1.5);gg.addColorStop(0,`rgba(255,140,40,${.0})`);gg.addColorStop(.5,`rgba(255,120,30,${.18*a*frac(h)})`);gg.addColorStop(1,'rgba(255,100,20,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(c.cx,c.cy,c.R*1.5,0,TAU);ctx.fill();ctx.restore()}}
  function drop(t,t0,dur,y0,y1){if(t<t0)return {y:y0,land:0,squash:0,on:false};const u=(t-t0)/dur;if(u<1)return {y:y0+(y1-y0)*u*u,land:0,squash:0,on:true};
    const v=t-t0-dur,b=.05*Math.exp(-v*9)*Math.abs(Math.sin(v*18));return {y:y1+b,land:clamp(v/.3),squash:.12*Math.exp(-v*14),on:true}}
  function splash(ctx,c,p,u,o={}){if(u<=0||u>=1)return;const q=c.P(p),col=o.col||'255,200,110';ctx.save();ctx.globalCompositeOperation='lighter';
    const rr=q[2]*(.08+.3*u),ry=rr*Math.abs(Math.sin(c.pitch));ctx.strokeStyle=`rgba(${col},${.9*(1-u)})`;ctx.lineWidth=4*(1-u)+1;ctx.beginPath();ctx.ellipse(q[0],q[1],rr,ry,0,0,TAU);ctx.stroke();
    for(let i=0;i<9;i++){const an=i/9*TAU+p[0]*7,d=q[2]*.22*u,hh=q[2]*.35*u*(1-u)*4*(.6+.4*Math.sin(i*3.1));ctx.fillStyle=`rgba(${col},${1-u})`;ctx.beginPath();ctx.arc(q[0]+Math.cos(an)*d,q[1]+Math.sin(an)*d*.3-hh,Math.max(1.5,q[2]*.012*(1-u)),0,TAU);ctx.fill()}ctx.restore()}
  return {cam,back,front,lava,frac,levelFor,drop,splash}})();
