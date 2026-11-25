/* ---------- NEWTON: disco de Newton em 3D com desfoque de movimento de verdade (v3.20, 2026-11-08) — exemplo projetos/luz-prisma/ ----------
   O disco é uma textura redesenhada a cada quadro: cada fatia fina mostra a MÉDIA das cores que passam por ela durante o tempo
   do obturador (ângulo varrido β = 2π·voltas/s·obturador). Com β ≥ 2π tudo vira a média das 7 cores; 'white' (0..1) empurra
   essa média para o branco estourado (exagero pedido no vídeo). Aro dourado, cubo metálico, papel com fibra, brilho fixo
   (não gira), sombra e halo. A textura vai para um plano 3D com GMAP.quad (perspectiva certa em qualquer câmera do W3D).
   NEWTON.draw(ctx,c,{center:[x,y,z],R,ex:[...],ey:[...],ang,rps,shutter,white,a,glow,label})
       ex, ey = eixos do plano do disco (unitários); ang = ângulo atual (rad); rps = voltas por segundo; shutter em s (padrão 1/50)
   NEWTON.CORES  7 fatias (nome, cor, largura relativa — proporções de Newton, Opticks, 1704) */
const NEWTON=(()=>{
  const CORES=[['VERMELHO','#e5322d',45],['LARANJA','#f28a1e',27],['AMARELO','#f6d72a',48],['VERDE','#36b24a',60],['AZUL','#2f7fd8',60],['ANIL','#3b3fb0',40],['VIOLETA','#8a3fc9',80]];
  const TOT=CORES.reduce((s,c)=>s+c[2],0),A=[];let acc=0;CORES.forEach(c=>{A.push(acc/TOT*Math.PI*2);acc+=c[2]});A.push(Math.PI*2);
  const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];const RGB=CORES.map(c=>hex(c[1]));
  /* integral da cor de 0 a φ (para médias rápidas em qualquer arco) */
  function integ(phi){const T=Math.PI*2,k=Math.floor(phi/T);let f=phi-k*T,s=[0,0,0];
    const full=[0,0,0];for(let i=0;i<7;i++)for(let j=0;j<3;j++)full[j]+=RGB[i][j]*(A[i+1]-A[i]);
    for(let i=0;i<7;i++){const a=A[i],b=Math.min(A[i+1],f);if(b<=a)break;for(let j=0;j<3;j++)s[j]+=RGB[i][j]*(b-a)}
    return [s[0]+k*full[0],s[1]+k*full[1],s[2]+k*full[2]]}
  const MEAN=integ(Math.PI*2).map(v=>v/(Math.PI*2));
  const S=1024,TX=document.createElement('canvas');TX.width=TX.height=S;
  const PAPER=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),im=g.createImageData(256,256),R=FX.rng(17);
    for(let i=0;i<256*256;i++){const v=128+(R()-.5)*40;im.data[i*4]=im.data[i*4+1]=im.data[i*4+2]=v;im.data[i*4+3]=255}g.putImageData(im,0,0);return c})();
  function texture(ang,beta,white){const g=TX.getContext('2d'),c=S/2,R=S*.47,N=720;g.clearRect(0,0,S,S);
    for(let k=0;k<N;k++){const a0=k/N*Math.PI*2,a1=(k+1)/N*Math.PI*2;/* cor média vista nesta fatia (fixa na tela) durante o obturador */
      const p=a0-ang,b=Math.max(beta,1e-4),I1=integ(((p%(2*Math.PI))+2*Math.PI)%(2*Math.PI)+20*Math.PI),I0=integ(((p%(2*Math.PI))+2*Math.PI)%(2*Math.PI)+20*Math.PI-b);
      let col=beta<1e-3?RGB[(()=>{const q=((p%(2*Math.PI))+2*Math.PI)%(2*Math.PI);let i=0;while(i<6&&q>=A[i+1])i++;return i})()]:[0,1,2].map(j=>(I1[j]-I0[j])/b);
      col=col.map((v,j)=>v+(255*1.0-v)*white);g.fillStyle=`rgb(${col[0]|0},${col[1]|0},${col[2]|0})`;g.beginPath();g.moveTo(c,c);g.arc(c,c,R,-a1,-a0+.004);g.closePath();g.fill()}
    /* papel (fibra), linhas finas entre fatias quando parado, aro dourado, cubo metálico */
    g.save();g.globalCompositeOperation='multiply';g.globalAlpha=.18*(1-white);g.beginPath();g.arc(c,c,R,0,7);g.clip();for(let y=0;y<S;y+=256)for(let x=0;x<S;x+=256)g.drawImage(PAPER,x,y);g.restore();
    const sharp=Math.max(0,1-beta/.3);if(sharp>0){g.save();g.strokeStyle=`rgba(255,255,255,${.35*sharp})`;g.lineWidth=3;for(let i=0;i<7;i++){const a=A[i]+ang;g.beginPath();g.moveTo(c,c);g.lineTo(c+Math.cos(-a)*R,c+Math.sin(-a)*R);g.stroke()}g.restore()}
    const rim=g.createLinearGradient(0,0,S,S);rim.addColorStop(0,'#fff1c2');rim.addColorStop(.35,'#c99a3a');rim.addColorStop(.6,'#ffe7a1');rim.addColorStop(1,'#8a6420');
    g.strokeStyle=rim;g.lineWidth=S*.028;g.beginPath();g.arc(c,c,R+S*.012,0,7);g.stroke();g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=2;g.beginPath();g.arc(c,c,R,0,7);g.stroke();
    const hub=g.createRadialGradient(c-S*.02,c-S*.025,S*.005,c,c,S*.075);hub.addColorStop(0,'#ffffff');hub.addColorStop(.3,'#d7dbe2');hub.addColorStop(.75,'#6e7682');hub.addColorStop(1,'#2a2f37');
    g.fillStyle=hub;g.beginPath();g.arc(c,c,S*.07,0,7);g.fill();g.fillStyle='#1b1f26';g.beginPath();g.arc(c,c,S*.018,0,7);g.fill();
    /* brilho de verniz fixo (não gira) */const gl=g.createLinearGradient(c-R,c-R,c+R,c+R);gl.addColorStop(.25,'rgba(255,255,255,0)');gl.addColorStop(.38,'rgba(255,255,255,.22)');gl.addColorStop(.46,'rgba(255,255,255,0)');
    g.save();g.beginPath();g.arc(c,c,R,0,7);g.clip();g.fillStyle=gl;g.fillRect(0,0,S,S);g.restore();return TX}
  function draw(ctx,c,o){const a=o.a??1;if(a<=0)return;const C=o.center||[0,0,0],R=o.R||1,ex=o.ex||[1,0,0],ey=o.ey||[0,1,0],beta=Math.PI*2*(o.rps||0)*(o.shutter??1/50),wh=o.white||0;
    const T=texture(o.ang||0,beta,wh),k=R/.94;const P0=[C[0]-ex[0]*k+ey[0]*k,C[1]-ex[1]*k+ey[1]*k,C[2]-ex[2]*k+ey[2]*k],PU=[C[0]+ex[0]*k+ey[0]*k,C[1]+ex[1]*k+ey[1]*k,C[2]+ex[2]*k+ey[2]*k],PV=[C[0]-ex[0]*k-ey[0]*k,C[1]-ex[1]*k-ey[1]*k,C[2]-ex[2]*k-ey[2]*k];
    const q=c.P(C);if(isFinite(q[0])){const Rp=c.f*R/q[2],gw=o.glow??0;/* halo: a cor média (ou o branco) acende em volta */
      if(gw>0){const m=MEAN.map(v=>v+(255-v)*wh);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a*gw;const hg=ctx.createRadialGradient(q[0],q[1],Rp*.7,q[0],q[1],Rp*2.4);hg.addColorStop(0,`rgba(${m[0]|0},${m[1]|0},${m[2]|0},.55)`);hg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=hg;ctx.beginPath();ctx.arc(q[0],q[1],Rp*2.4,0,7);ctx.fill();ctx.restore()}}
    ctx.save();ctx.globalAlpha*=a;GMAP.quad(ctx,c,T,P0,PU,PV,{n:20});ctx.restore();
    if(wh>0&&isFinite(q[0])){/* branco estourado: o miolo do disco passa do branco */const Rp=c.f*R/q[2];ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a*wh*.6;const bg=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],Rp*1.05);bg.addColorStop(0,'rgba(255,255,255,.9)');bg.addColorStop(.85,'rgba(255,255,255,.35)');bg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=bg;ctx.beginPath();ctx.arc(q[0],q[1],Rp*1.1,0,7);ctx.fill();ctx.restore()}}
  return {draw,texture,CORES,MEAN}})();
