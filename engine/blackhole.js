/* ---------- BH: buraco negro em espaço de tela (lente gravitacional sobre o que já foi desenhado) ----------
   BH.lens(ctx,x,y,rs,{rE,a,ring,glow,box})  deforma os pixels já desenhados em volta de (x,y) como uma lente pontual:
       cada pixel a uma distância r mostra o que estava em r − rE²/r (β = θ − θE²/θ). Quando r − rE²/r < 0, pega do lado
       oposto: é a 2ª imagem invertida, e o anel de Einstein aparece sozinho em r = rE. Dentro da sombra (2,6·rs) fica preto,
       com um anel de fótons fino e brilhante na borda. rs = raio do horizonte em px na tela; rE padrão = 3,4·rs;
       a = intensidade (0..1, para entrar suave); box = raio da região afetada (padrão 5·rE), com borda que se funde.
   BH.shadow(rs) = raio da sombra vista de longe (√27/2 ≈ 2,6 vezes o raio do horizonte)
   Exemplo: exemplos/buraco-negro-mao/ */
const BH=(()=>{
  const SH=Math.sqrt(27)/2;
  function lens(ctx,x,y,rs,o={}){const a=o.a??1;if(a<=0||rs<.3)return;const m=ctx.getTransform(),s=Math.hypot(m.a,m.b)||1,cv=ctx.canvas;
    const X=m.a*x+m.c*y+m.e,Y=m.b*x+m.d*y+m.f,RS=rs*s,RE=(o.rE??3.4*rs)*s,SHD=SH*RS,BOX=Math.min(Math.max(cv.width,cv.height),(o.box??5*(o.rE??3.4*rs))*s);
    const x0=Math.max(0,Math.floor(X-BOX)),y0=Math.max(0,Math.floor(Y-BOX)),x1=Math.min(cv.width,Math.ceil(X+BOX)),y1=Math.min(cv.height,Math.ceil(Y+BOX)),w=x1-x0,h=y1-y0;if(w<2||h<2)return;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);
    const src=ctx.getImageData(x0,y0,w,h),sd=src.data,out=ctx.createImageData(w,h),od=out.data,RE2=RE*RE,cx=X-x0,cy=Y-y0;
    for(let j=0;j<h;j++){const dy=j+.5-cy;for(let i=0;i<w;i++){const dx=i+.5-cx,r=Math.hypot(dx,dy),q=(j*w+i)*4;
      const fade=1-Math.min(1,Math.max(0,(r/BOX-.72)/.28));const f=fade*fade*(3-2*fade)*a;
      if(r<SHD){/* sombra: preto com borda suave */const k=Math.min(1,Math.max(0,(SHD-r)/1.5))*a;od[q]=sd[q]*(1-k);od[q+1]=sd[q+1]*(1-k);od[q+2]=sd[q+2]*(1-k);od[q+3]=255;continue}
      if(f<=0){od[q]=sd[q];od[q+1]=sd[q+1];od[q+2]=sd[q+2];od[q+3]=255;continue}
      const rr=r-RE2/r,k=rr/r;let sx=Math.round(cx+dx*k),sy=Math.round(cy+dy*k);
      let R=sd[q],G=sd[q+1],B=sd[q+2];
      if(sx>=0&&sy>=0&&sx<w&&sy<h){const p=(sy*w+sx)*4,mag=Math.min(3,Math.abs(1/(1-(RE2*RE2)/(r*r*r*r))));R=Math.min(255,sd[p]*mag);G=Math.min(255,sd[p+1]*mag);B=Math.min(255,sd[p+2]*mag)}
      od[q]=sd[q]+(R-sd[q])*f;od[q+1]=sd[q+1]+(G-sd[q+1])*f;od[q+2]=sd[q+2]+(B-sd[q+2])*f;od[q+3]=255}}
    ctx.putImageData(out,x0,y0);
    /* anel de fótons */
    if(o.ring!==false){ctx.globalCompositeOperation='lighter';const col=o.glow||'255,226,170';for(const [lw,al] of [[Math.min(18,RS*.5),.08],[Math.min(7,RS*.18),.22],[Math.max(1,Math.min(2.5,RS*.05)),.8]]){ctx.strokeStyle=`rgba(${col},${al*a})`;ctx.lineWidth=lw;ctx.beginPath();ctx.arc(X,Y,SHD*1.01,0,Math.PI*2);ctx.stroke()}}
    ctx.restore()}
  return {lens,shadow:rs=>SH*rs,SH}})();
