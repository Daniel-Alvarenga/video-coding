/* ---------- TUNG: barra caindo do espaço — barra metálica, cone de choque, plasma, chão de deserto, montanhas e nuvem de poeira ----------
   Feito para o Short "10 kg de tungstênio do espaço" (projetos/tungstenio, 15/11/2026). Tudo em px (2D por cima de uma Terra 3D do kit).
     TUNG.rod(ctx,x,yTop,yTip,w,{heat,a,tilt,clamp})  barra vertical (cilindro de metal escovado) com ponta cônica embaixo; heat 0..1 acende a ponta
     TUNG.claw(ctx,x,y,w,open)        garra que segura a barra no começo (open 0..1)
     TUNG.shock(ctx,x,yTip,len,{a,ang,t,heat})  cone de choque: duas frentes claras abrindo para cima a partir da ponta + bainha de plasma
     TUNG.streak(ctx,x,y0,y1,{a,w,col}) rastro brilhante (atrás da barra)
     TUNG.sand()  textura de deserto (canvas 512², cache)       TUNG.ground(ctx,y0,{a,tex,scroll}) chão de deserto em perspectiva até o horizonte y0
     TUNG.ridges(ctx,yH,t,{a,seed})  serras ao longe (3 camadas com névoa) sobre o horizonte yH
     TUNG.plume(ctx,x,y,s,t,{a})     nuvem de poeira do impacto (cogumelo baixo, cresce com t em s) + clarão
     TUNG.rings(ctx,x,y,t,{a,sx,sy}) anéis de choque no chão          TUNG.debris(ctx,x,y,t,{n,seed}) pedras em arco balístico
     TUNG.target(ctx,x,y,R,t,{a})    mira vermelha no chão (câmera lenta)
   Determinístico (FX.rng). Sem rosa: plasma branco-laranja, cone ciano claro. */
const TUNG=(()=>{
  function rod(ctx,x,y0,y1,w,o={}){const a=o.a??1;if(a<=0)return;const heat=o.heat||0,tipL=w*1.6,yb=y1-tipL;ctx.save();ctx.globalAlpha*=a;
    const g=ctx.createLinearGradient(x-w/2,0,x+w/2,0);g.addColorStop(0,'#3a3d44');g.addColorStop(.18,'#8d929c');g.addColorStop(.32,'#d9dde4');g.addColorStop(.45,'#9aa0aa');g.addColorStop(.8,'#4d525b');g.addColorStop(1,'#25272c');
    ctx.fillStyle=g;ctx.fillRect(x-w/2,y0,w,yb-y0);
    /* anéis de usinagem leves */ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;for(let y=y0+8;y<yb;y+=Math.max(6,w*.35)){ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x+w/2,y);ctx.stroke()}
    /* ponta */ctx.beginPath();ctx.moveTo(x-w/2,yb);ctx.lineTo(x+w/2,yb);ctx.lineTo(x+w*.08,y1);ctx.lineTo(x-w*.08,y1);ctx.closePath();ctx.fill();
    if(heat>0){const hg=ctx.createLinearGradient(0,y1,0,y1-tipL*3.5);const c1=heat>.75?'255,250,235':heat>.45?'255,190,110':'255,120,40';hg.addColorStop(0,`rgba(${c1},${Math.min(1,heat*1.3)})`);hg.addColorStop(1,`rgba(${c1},0)`);
      ctx.globalCompositeOperation='lighter';ctx.fillStyle=hg;ctx.fillRect(x-w/2,y1-tipL*3.5,w,tipL*3.5);const gg=ctx.createRadialGradient(x,y1,0,x,y1,w*2.5*heat+4);gg.addColorStop(0,`rgba(255,240,210,${heat})`);gg.addColorStop(1,'rgba(255,170,80,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(x,y1,w*2.5*heat+4,0,TAU);ctx.fill()}
    ctx.restore()}
  function claw(ctx,x,y,w,open){ctx.save();const o=open*w*.7;ctx.fillStyle='#5b616b';ctx.fillRect(x-w*1.2,y-w*1.6,w*2.4,w*.9);
    [-1,1].forEach(s=>{ctx.save();ctx.translate(x+s*(w*.55+o),y-w*.7);ctx.fillStyle='#7a808a';ctx.fillRect(-w*.18,0,w*.36,w*1.5);ctx.fillStyle='#9aa0aa';ctx.fillRect(s>0?-w*.18:-w*.18,w*1.3,w*.36,w*.2);ctx.restore()});
    ctx.fillStyle='#2a2d33';ctx.fillRect(x-w*.3,y-w*3.4,w*.6,w*1.8);ctx.restore()}
  function shock(ctx,x,yt,len,o={}){const a=o.a??1;if(a<=0)return;const ang=o.ang??.17,t=o.t||0;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=a;
    /* bainha de plasma colada na barra */const sg=ctx.createLinearGradient(0,yt,0,yt-len);sg.addColorStop(0,'rgba(255,225,190,.55)');sg.addColorStop(.3,'rgba(190,215,255,.18)');sg.addColorStop(1,'rgba(190,215,255,0)');
    ctx.fillStyle=sg;ctx.beginPath();ctx.moveTo(x,yt);ctx.lineTo(x-len*Math.tan(ang)*.55,yt-len);ctx.lineTo(x+len*Math.tan(ang)*.55,yt-len);ctx.closePath();ctx.fill();
    /* frentes de choque */[-1,1].forEach(s=>{const g=ctx.createLinearGradient(x,yt,x+s*len*Math.tan(ang),yt-len);g.addColorStop(0,'rgba(235,245,255,.95)');g.addColorStop(1,'rgba(200,225,255,0)');
      ctx.strokeStyle=g;for(let k=0;k<3;k++){ctx.lineWidth=[6,2.5,1.2][k];ctx.globalAlpha=a*[.25,.55,.9][k];ctx.beginPath();ctx.moveTo(x,yt);ctx.lineTo(x+s*len*Math.tan(ang)*(1+.03*Math.sin(t*9+k)),yt-len);ctx.stroke()}});
    ctx.restore()}
  function streak(ctx,x,y0,y1,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createLinearGradient(0,y1,0,y0);g.addColorStop(0,`rgba(${o.col||'255,230,190'},${.9*a})`);g.addColorStop(1,`rgba(${o.col||'255,230,190'},0)`);
    ctx.fillStyle=g;const w=o.w||10;ctx.fillRect(x-w/2,y0,w,y1-y0);ctx.restore()}
  let SAND=null;function sand(){if(SAND)return SAND;const n=512,cv=document.createElement('canvas');cv.width=cv.height=n;const x=cv.getContext('2d'),im=x.createImageData(n,n);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const u=i/n,v=j/n,f=FX.fbm(Math.cos(u*TAU)*2+3,Math.sin(u*TAU)*2+3,v*6,5),dn=Math.sin((u*9+f*2.2)*TAU+v*3)*.5+.5,q=(j*n+i)*4,k=.78+f*.35+dn*.08;
      im.data[q]=clamp(196*k,0,255);im.data[q+1]=clamp(160*k,0,255);im.data[q+2]=clamp(112*k,0,255);im.data[q+3]=255}x.putImageData(im,0,0);SAND=cv;return cv}
  function ground(ctx,y0,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;const T=sand(),rows=60;
    for(let k=0;k<rows;k++){const u0=k/rows,u1=(k+1)/rows,ya=y0+(H-y0)*u0*u0,yb=y0+(H-y0)*u1*u1+1,sc=.15+u0*2.4,sw=512*sc*2.2;
      const off=((o.scroll||0)*sc*60)%sw;ctx.save();ctx.beginPath();ctx.rect(0,ya,W,yb-ya);ctx.clip();for(let x=-sw+off-((W/2)%sw);x<W+sw;x+=sw)ctx.drawImage(T,x,ya-((k*37)%200),sw,sw*.5);ctx.restore()}
    const g=ctx.createLinearGradient(0,y0,0,y0+260);g.addColorStop(0,'rgba(200,210,225,.65)');g.addColorStop(1,'rgba(200,210,225,0)');ctx.fillStyle=g;ctx.fillRect(0,y0,W,260);ctx.restore()}
  function ridges(ctx,yH,t,o={}){const a=o.a??1;if(a<=0)return;const R=FX.rng(o.seed||4);ctx.save();ctx.globalAlpha*=a;
    [[.9,'#8f93a3',140,.25],[.6,'#a7a7b0',95,.5],[.35,'#c2b8a8',60,.75]].forEach(([haze,col,hgt,par],L)=>{ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,yH);
      for(let x=0;x<=W;x+=8){const n=FX.fbm(x*.004+L*10+t*.01*par,L*3,1,4),y=yH-hgt*(.35+n*.9);ctx.lineTo(x,y)}ctx.lineTo(W,yH);ctx.closePath();ctx.fill()});ctx.restore()}
  function plume(ctx,x,y,s,t,o={}){const a=o.a??1;if(a<=0||t<0)return;const R=FX.rng(9),gr=1-Math.exp(-t*1.1),hgt=s*(.4+1.6*gr),wid=s*(.5+1.1*gr);ctx.save();ctx.globalAlpha*=a;
    for(let i=0;i<70;i++){const u=R(),v=R(),r=s*(.12+.28*R())*(.6+gr),px=x+(u-.5)*wid*(1-v*.4)+Math.sin(t*.7+i)*s*.02,py=y-v*hgt-r*.2,sh=.45+.45*R()-v*.15;
      const g=ctx.createRadialGradient(px-r*.3,py-r*.3,r*.1,px,py,r);g.addColorStop(0,`rgba(${150+60*sh|0},${120+45*sh|0},${90+30*sh|0},.85)`);g.addColorStop(1,`rgba(${110+40*sh|0},${85+30*sh|0},${60+20*sh|0},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,r,0,TAU);ctx.fill()}
    if(t<1.2){ctx.globalCompositeOperation='lighter';const f=1-t/1.2,g=ctx.createRadialGradient(x,y-s*.1,0,x,y-s*.1,s*1.2);g.addColorStop(0,`rgba(255,230,170,${f})`);g.addColorStop(.4,`rgba(255,150,60,${.6*f})`);g.addColorStop(1,'rgba(255,120,40,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y-s*.1,s*1.2,0,TAU);ctx.fill()}
    ctx.restore()}
  function rings(ctx,x,y,t,o={}){const a=o.a??1;if(a<=0||t<0)return;ctx.save();ctx.globalAlpha*=a;for(let k=0;k<4;k++){const tt=t-k*.25;if(tt<0)continue;const r=(o.sx||300)*(1-Math.exp(-tt*1.4))*(1+k*.15);
    ctx.strokeStyle=`rgba(255,245,230,${.7*Math.exp(-tt*.6)})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,r,r*(o.sy??.22),0,0,TAU);ctx.stroke()}ctx.restore()}
  function debris(ctx,x,y,t,o={}){if(t<0)return;const R=FX.rng(o.seed||21),n=o.n||70;ctx.save();ctx.fillStyle='#3a2e24';for(let i=0;i<n;i++){const vx=(R()-.5)*900,vy=-(300+R()*700),tt=Math.min(t,3);
    const px=x+vx*tt,py=y+vy*tt+500*tt*tt;if(py>y+40)continue;const r=2+R()*5;ctx.beginPath();ctx.arc(px,py,r,0,TAU);ctx.fill()}ctx.restore()}
  function target(ctx,x,y,R,t,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;
    for(let k=1;k<=3;k++){ctx.beginPath();ctx.arc(x,y,R*k/3,0,TAU);ctx.stroke()}ctx.beginPath();ctx.moveTo(x-R*1.3,y);ctx.lineTo(x+R*1.3,y);ctx.moveTo(x,y-R*1.3);ctx.lineTo(x,y+R*1.3);ctx.stroke();
    const p=.6+.4*Math.sin(t*8);ctx.fillStyle=`rgba(232,90,60,${.85*p})`;ctx.beginPath();ctx.arc(x,y,R*.16,0,TAU);ctx.fill();ctx.restore()}
  return {rod,claw,shock,streak,sand,ground,ridges,plume,rings,debris,target}})();
