/* ---------- METR: metrônomos acoplados numa tábua que rola (sincronização espontânea) ----------
   Feito para o Short "Virar só 4 faz os 100 SINCRONIZAR?" (projetos/metronomos, 15/11/2026).
   Física: cada metrônomo é um oscilador de fase φ (ângulo do pêndulo θ = A·sen φ). A tábua sobre rolos recebe o empurrão de todos e
   devolve a cada um um empurrão proporcional ao movimento médio (modelo de Pantaleone, 2002). Para metrônomos iguais isso vira o modelo
   de Kuramoto: φ' = ω + K·R·sen(Ψ − φ), com R·e^{iΨ} = média de e^{iφ}. 50 contra 50 em oposição: R = 0, ninguém puxa (empate).
   Virar alguns quebra o empate: R cresce até 1 (todos juntos). A tábua anda x ∝ −média(sen θ) (momento conservado).
     const S=METR.sim({N:100,K,w,T:duração,fps,flips:[{t,i}],phase0:(i)=>φ})   simulação pré-calculada (passo 1/240 s)
     S.at(t) → {ph:Float64Array, R, Psi, x (deslocamento da tábua, −1..1), ticks}      S.R(t) parâmetro de ordem
     METR.draw(ctx,cam,st,{cols,rows,col:(i)=>cor,A,board})   tábua de madeira 3D, rolos e a grade de metrônomos (corpo preto com borda
        dourada, haste e peso brilhante na cor do grupo); cam = METR.cam({cx,cy,s,yaw,pitch,D})
   Cores: ouro (#f4b740) e ciano (#62d0ea). */
const METR=(()=>{
  function sim(o){const N=o.N||100,K=o.K??1.1,w=o.w??TAU,fps=o.fps||30,Tn=o.T||20,dt=1/240,flips=(o.flips||[]).slice().sort((a,b)=>a.t-b.t);
    let ph=new Float64Array(N);for(let i=0;i<N;i++)ph[i]=o.phase0?o.phase0(i):0;const frames=[],nf=Math.ceil(Tn*fps)+2;let t=0,fi=0;
    const snap=()=>{let c=0,s=0;for(let i=0;i<N;i++){c+=Math.cos(ph[i]);s+=Math.sin(ph[i])}c/=N;s/=N;let m=0;for(let i=0;i<N;i++)m+=Math.sin(ph[i]);return {ph:Float64Array.from(ph),R:Math.hypot(c,s),Psi:Math.atan2(s,c),x:-m/N}};
    for(let f=0;f<nf;f++){const tf=f/fps;while(t<tf-1e-9){while(fi<flips.length&&flips[fi].t<=t){ph[flips[fi].i]+=Math.PI;fi++}
        let c=0,s=0;for(let i=0;i<N;i++){c+=Math.cos(ph[i]);s+=Math.sin(ph[i])}c/=N;s/=N;const R=Math.hypot(c,s),Ps=Math.atan2(s,c);
        for(let i=0;i<N;i++)ph[i]+=dt*(w+K*R*Math.sin(Ps-ph[i]));t+=dt}frames.push(snap())}
    const at=tt=>{const k=clamp(Math.round(tt*fps),0,frames.length-1);return frames[k]};return {at,R:tt=>at(tt).R,N,fps,frames}}
  function cam(o){const yaw=o.yaw||0,pit=o.pitch??.5,D=o.D||6,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pit),sp=Math.sin(pit);
    const P=p=>{let [x,y,z]=p;const x1=x*cy+z*sy,z1=-x*sy+z*cy;const y2=y*cp-z1*sp,z2=y*sp+z1*cp;const k=D/(D-z2);return [o.cx+x1*o.s*k,o.cy-y2*o.s*k,o.s*k,z2]};
    return {P,o,eye:[Math.sin(yaw)*D*cp,D*sp,Math.cos(yaw)*D*cp]}}
  const poly=(ctx,q,fill,stroke,lw=1)=>{ctx.beginPath();q.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}};
  /* tábua de madeira com veios (textura gerada uma vez) */
  let WOOD=null;function wood(){if(WOOD)return WOOD;const cv=document.createElement('canvas');cv.width=512;cv.height=256;const x=cv.getContext('2d'),im=x.createImageData(512,256);
    for(let j=0;j<256;j++)for(let i=0;i<512;i++){const v=FX.noise(i*.01,j*.08,1)*1.2+FX.noise(i*.002,j*.3,4)*.6,g=.5+.5*Math.sin(j*.25+v*6),q=(j*512+i)*4;
      im.data[q]=120+60*g;im.data[q+1]=72+38*g;im.data[q+2]=38+20*g;im.data[q+3]=255}x.putImageData(im,0,0);WOOD=cv;return cv}
  function quadImg(ctx,img,q){/* desenha a imagem num quadrilátero por 2 triângulos afins */const w=img.width,h=img.height;
    const tri=(p0,p1,p2,u0,u1,u2)=>{ctx.save();ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);ctx.closePath();ctx.clip();
      const [x0,y0]=u0,[x1,y1]=u1,[x2,y2]=u2,det=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0),a=((p1[0]-p0[0])*(y2-y0)-(p2[0]-p0[0])*(y1-y0))/det,b=((p2[0]-p0[0])*(x1-x0)-(p1[0]-p0[0])*(x2-x0))/det,
      c=((p1[1]-p0[1])*(y2-y0)-(p2[1]-p0[1])*(y1-y0))/det,d=((p2[1]-p0[1])*(x1-x0)-(p1[1]-p0[1])*(x2-x0))/det;ctx.transform(a,c,b,d,p0[0]-a*x0-b*y0,p0[1]-c*x0-d*y0);ctx.drawImage(img,0,0);ctx.restore()};
    tri(q[0],q[1],q[2],[0,0],[w,0],[w,h]);tri(q[0],q[2],q[3],[0,0],[w,h],[0,h])}
  function draw(ctx,c,st,o={}){const cols=o.cols||10,rows=o.rows||10,A=o.A??.5,bx=st.x*(o.board??.35),BW=2.6,BD=2.2,BH=.12,Y=0;
    /* rolos */[-.8,.8].forEach(zr=>{for(let k=0;k<2;k++){}const r=.12,x0=-BW*.62,x1=BW*.62,n=14;const q=[];
      for(let i=0;i<=n;i++){const a=Math.PI*i/n;q.push(c.P([x0,Y-r+r*Math.cos(a),zr*BD*.5+r*Math.sin(a)*0]))}
      const a1=c.P([x0,Y-2*r,zr*BD*.5]),a2=c.P([x1,Y-2*r,zr*BD*.5]),b1=c.P([x0,Y,zr*BD*.5]),b2=c.P([x1,Y,zr*BD*.5]);
      const g=ctx.createLinearGradient(0,b1[1],0,a1[1]);g.addColorStop(0,'#c9ced8');g.addColorStop(.5,'#6b7280');g.addColorStop(1,'#2a2e36');poly(ctx,[b1,b2,a2,a1],g)});
    /* tábua: tampo (textura), frente e lateral */
    const cn=(sx,sz,yy)=>c.P([bx+sx*BW/2,yy,sz*BD/2]);const T=[cn(-1,-1,Y+BH),cn(1,-1,Y+BH),cn(1,1,Y+BH),cn(-1,1,Y+BH)];
    quadImg(ctx,wood(),T);poly(ctx,T,'rgba(40,20,5,.12)','rgba(255,220,170,.35)',1.5);
    poly(ctx,[cn(-1,1,Y+BH),cn(1,1,Y+BH),cn(1,1,Y),cn(-1,1,Y)],'#5a3416');
    if(c.eye[0]>0)poly(ctx,[cn(1,-1,Y+BH),cn(1,1,Y+BH),cn(1,1,Y),cn(1,-1,Y)],'#46280f');else poly(ctx,[cn(-1,-1,Y+BH),cn(-1,1,Y+BH),cn(-1,1,Y),cn(-1,-1,Y)],'#46280f');
    /* metrônomos, de trás para frente */
    const L=[];for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){const i=r*cols+k,px=bx+(k-(cols-1)/2)*BW/cols*.92,pz=(r-(rows-1)/2)*BD/rows*.9;L.push({i,px,pz,z:c.P([px,Y,pz])[3]})}
    L.sort((a,b)=>a.z-b.z);
    for(const m of L){const th=A*Math.sin(st.ph[m.i]),col=o.col?o.col(m.i):'#f4b740',h=.34,wb=.085,wt=.03,y0=Y+BH;
      const p=(x,y,z)=>c.P([m.px+x,y0+y,m.pz+z]);
      /* corpo: pirâmide truncada (frente e lados) */poly(ctx,[p(-wb,0,wb),p(wb,0,wb),p(wt,h,wt*.6),p(-wt,h,wt*.6)],'#15161b','rgba(244,183,64,.35)',1);
      poly(ctx,[p(wb,0,-wb),p(wb,0,wb),p(wt,h,wt*.6),p(wt,h,-wt*.6)],'#0c0d11');
      /* haste com peso (gira no plano x-y em volta do pé) */const pv=p(0,.03,wb*.95),tip=[m.px+Math.sin(th)*h*1.05,y0+.03+Math.cos(th)*h*1.05,m.pz+wb*.95],qt=c.P(tip),
        wm=[m.px+Math.sin(th)*h*.72,y0+.03+Math.cos(th)*h*.72,m.pz+wb*.95],qw=c.P(wm);
      ctx.strokeStyle='rgba(225,228,236,.85)';ctx.lineWidth=Math.max(1,qt[2]*.008);ctx.beginPath();ctx.moveTo(pv[0],pv[1]);ctx.lineTo(qt[0],qt[1]);ctx.stroke();
      const rw=Math.max(2,qw[2]*.022);ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(qw[0],qw[1],0,qw[0],qw[1],rw*3.2);g.addColorStop(0,col);g.addColorStop(.35,FX.rgba(col,.45));g.addColorStop(1,FX.rgba(col,0));
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(qw[0],qw[1],rw*3.2,0,TAU);ctx.fill();ctx.restore();ctx.fillStyle=col;ctx.beginPath();ctx.arc(qw[0],qw[1],rw,0,TAU);ctx.fill()}}
  return {sim,cam,draw}})();
