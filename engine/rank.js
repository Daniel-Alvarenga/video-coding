/* ---------- RK: ranking com velocímetro (Shorts de "qual é o mais ...") ----------
   RK.acc(keys)  v(t) por chaves [[t,v],...] (linear entre chaves) -> {v(T), s(T)}: s = integral de v (px andados), para rastros contínuos quando a velocidade muda
   RK.streaks(ctx,T,{s,v,dir,seed,n,a,exp,col,box})  rastros de velocidade na tela: partículas em 3 profundidades andam s·z na direção dir;
       comprimento = v·z·exp (exp = "tempo de exposição", s). v baixo = pontos parados; v alto = riscos longos (sensação de velocidade)
   RK.speedo(ctx,x,y,R,val,{max,step,unit,a,col,hot,label,round})  velocímetro em arco de 240°: escala com traços a cada step, faixa colorida até val,
       ponteiro com brilho, valor digital grande embaixo (pt-BR) e unidade. hot = a partir de que valor a faixa esquenta (ouro -> branco)
   RK.board(ctx,x,y,rows,T,{w,rowH,a,n,cur,mystery,title,out,fs,cols,gap})  (fs = escala das letras; cols = colunas, w = largura de cada coluna, x = centro do conjunto)  ranking empilhado: n posições (#1 em cima), cada linha
       {rank,name,val,col,t} entra pela direita no instante t com flash; cur = rank em destaque (ouro); mystery = rank que mostra "???" pulsando enquanto não tem linha;
       out = instante em que as linhas saem pela direita (0,5 s, de baixo para cima), para o ranking esvaziar no fim do loop
   RK.fmt(v)  número com ponto de milhar (pt-BR)
   RK.pop(T,t0)  escala de "pulo" (1 → 1,25 → 1) para textos que entram na batida */
const RK=(()=>{
  const fmt=v=>Math.round(v).toLocaleString('pt-BR');
  const pop=(T,t0,k=.25)=>T<t0?1:1+k*Math.exp(-(T-t0)*9)*Math.cos((T-t0)*14);
  function acc(keys){const K=keys.slice().sort((a,b)=>a[0]-b[0]),S=[0];for(let i=1;i<K.length;i++)S[i]=S[i-1]+(K[i][0]-K[i-1][0])*(K[i][1]+K[i-1][1])/2;
    const v=T=>{if(T<=K[0][0])return K[0][1];for(let i=1;i<K.length;i++)if(T<K[i][0]){const u=(T-K[i-1][0])/(K[i][0]-K[i-1][0]);return lerp(K[i-1][1],K[i][1],u)}return K[K.length-1][1]};
    const s=T=>{if(T<=K[0][0])return (T-K[0][0])*K[0][1];for(let i=1;i<K.length;i++)if(T<K[i][0]){const dt=T-K[i-1][0];return S[i-1]+dt*(K[i-1][1]+v(T))/2}return S[K.length-1]+(T-K[K.length-1][0])*K[K.length-1][1]};
    return {v,s}}
  const SP={};
  function streaks(ctx,T,o={}){const n=o.n||220,seed=o.seed||7,key=seed+':'+n;if(!SP[key]){const R=FX.rng(seed),a=[];for(let i=0;i<n;i++)a.push([R(),R(),[.25,.55,1][i%3]*(.7+.3*R()),R()]);SP[key]=a}
    const s=o.s||0,v=Math.abs(o.v||0),d=o.dir||[-1,0],dl=Math.hypot(d[0],d[1])||1,dx=d[0]/dl,dy=d[1]/dl,ex=o.exp??.05,A=o.a??1,col=o.col||'235,240,255',[bx,by,bw,bh]=o.box||[0,0,W,H];if(A<=0)return;
    ctx.save();ctx.lineCap='round';const PAD=400;
    for(const [x0,y0,z,ph] of SP[key]){const L=v*z*ex,ww=bw+2*PAD,hh=bh+2*PAD;let x=((x0*ww+s*z*dx)%ww+ww)%ww-PAD+bx,y=((y0*hh+s*z*dy)%hh+hh)%hh-PAD+by;
      const al=A*(.25+.6*z)*(.75+.25*Math.sin(ph*TAU+T*2)),w=(.8+1.8*z)*(L>6?1:1.25);ctx.strokeStyle=`rgba(${col},${al})`;ctx.lineWidth=w;
      if(L<1.5){ctx.fillStyle=`rgba(${col},${al})`;ctx.beginPath();ctx.arc(x,y,w*.8,0,TAU);ctx.fill();continue}
      const g=ctx.createLinearGradient(x,y,x-dx*L,y-dy*L);g.addColorStop(0,`rgba(${col},${al})`);g.addColorStop(1,`rgba(${col},0)`);ctx.strokeStyle=g;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-dx*L,y-dy*L);ctx.stroke()}
    ctx.restore()}
  function speedo(ctx,x,y,R,val,o={}){const a=o.a??1;if(a<=0)return;const mx=o.max||180000,st=o.step||20000,A0=Math.PI*.8333,A1=Math.PI*2.1667,ang=v=>lerp(A0,A1,clamp(v/mx)),hot=o.hot??mx*.75;
    ctx.save();ctx.globalAlpha*=a;ctx.lineCap='round';
    /* fundo do arco */ctx.strokeStyle='rgba(236,230,214,.12)';ctx.lineWidth=R*.11;ctx.beginPath();ctx.arc(x,y,R,A0,A1);ctx.stroke();
    /* faixa até o valor: ciano -> ouro -> branco quente */const f=clamp(val/mx),g=ctx.createConicGradient?ctx.createConicGradient(A0,x,y):null;
    if(g){g.addColorStop(0,'#62d0ea');g.addColorStop(.35*(A1-A0)/TAU,'#f4b740');g.addColorStop(.62*(A1-A0)/TAU,'#ff8a3c');g.addColorStop((A1-A0)/TAU,'#fff3e0');g.addColorStop(1,'#62d0ea')}
    ctx.strokeStyle=g||C.gold;ctx.shadowColor=val>hot?'#ffb36b':C.gold;ctx.shadowBlur=18+22*clamp((val-hot)/(mx-hot));ctx.lineWidth=R*.11;ctx.beginPath();ctx.arc(x,y,R,A0,ang(val));ctx.stroke();ctx.shadowBlur=0;
    /* traços */for(let v=0;v<=mx+1;v+=st/2){const an=ang(v),big=Math.abs(v/st-Math.round(v/st))<.01,r0=R*(big?.8:.86),r1=R*.92;ctx.strokeStyle=v<=val?'rgba(255,240,210,.9)':'rgba(236,230,214,.35)';ctx.lineWidth=big?4:2;
      ctx.beginPath();ctx.moveTo(x+Math.cos(an)*r0,y+Math.sin(an)*r0);ctx.lineTo(x+Math.cos(an)*r1,y+Math.sin(an)*r1);ctx.stroke();
      if(big&&o.labels!==false&&v%(st*2)===0){txt(ctx,v>=1000?Math.round(v/1000)+'k':String(v),x+Math.cos(an)*R*.64,y+Math.sin(an)*R*.64+R*.05,{font:F.mono,size:Math.round(R*.12),color:v<=val?'rgba(255,240,210,.85)':'rgba(236,230,214,.4)'})}}
    /* ponteiro */const an=ang(val),tip=[x+Math.cos(an)*R*.9,y+Math.sin(an)*R*.9];ctx.strokeStyle='#fff6e6';ctx.shadowColor=C.gold;ctx.shadowBlur=16;ctx.lineWidth=R*.035;ctx.beginPath();ctx.moveTo(x-Math.cos(an)*R*.12,y-Math.sin(an)*R*.12);ctx.lineTo(tip[0],tip[1]);ctx.stroke();
    ctx.fillStyle='#fff6e6';ctx.beginPath();ctx.arc(x,y,R*.06,0,TAU);ctx.fill();ctx.shadowBlur=0;
    /* valor digital (o.round arredonda o mostrador, ex.: 100) */const vr=o.round?Math.round(val/o.round)*o.round:val;txt(ctx,fmt(vr),x,y+R*.62,{font:F.mono,weight:600,size:Math.round(R*.3),color:val>hot?'#fff3e0':C.gold});
    txt(ctx,o.unit||'km/h',x,y+R*.86,{font:F.mono,size:Math.round(R*.17),ls:3,color:'rgba(236,230,214,.75)'});
    if(o.label)txt(ctx,o.label,x,y-R*.2,{font:F.mono,size:Math.round(R*.11),ls:3,color:'rgba(236,230,214,.6)'});
    ctx.restore()}
  function board(ctx,x,y,rows,T,o={}){const a=o.a??1;if(a<=0)return;const n=o.n||8,w=o.w||700,rh=o.rowH||64,cur=o.cur,mys=o.mystery,fs=o.fs||1,cols=o.cols||1,gap=o.gap??20,per=Math.ceil(n/cols),TW=cols*w+(cols-1)*gap;ctx.save();ctx.globalAlpha*=a;
    if(o.title)txt(ctx,o.title,x,y-rh*.55,{font:F.mono,size:Math.round(rh*.42),ls:5,color:'rgba(236,230,214,.6)'});
    for(let k=1;k<=n;k++){const ci=Math.floor((k-1)/per),yy=y+((k-1)%per)*rh,row=rows.find(r=>r.rank===k),x0=x-TW/2+ci*(w+gap),xc=x0+w/2,rx=x0+18,dX=rx+rh*.42*fs*1.45+rh*.12,nX=dX+rh*.26;
      /* placa da linha */ctx.fillStyle=k===cur?'rgba(244,183,64,.16)':'rgba(10,14,26,.55)';ctx.strokeStyle=k===cur?'rgba(244,183,64,.7)':'rgba(236,230,214,.10)';ctx.lineWidth=2;
      ctx.beginPath();ctx.roundRect?ctx.roundRect(x0,yy,w,rh-8,12):ctx.rect(x0,yy,w,rh-8);ctx.fill();ctx.stroke();
      const cy=yy+(rh-8)/2+rh*.15,rkCol=k===1?C.gold:'rgba(236,230,214,.75)';txt(ctx,'#'+k,rx,cy,{font:F.mono,weight:600,size:Math.round(rh*.42*fs),color:rkCol,align:'left'});
      const to=o.out!=null&&T>=o.out?clamp((T-o.out-(n-k)*.05)/.45):0,shown=row&&T>=row.t&&to<1;
      if(shown){const u=clamp((T-row.t)/.35)*(1-to),e=1-Math.pow(1-clamp((T-row.t)/.35),3),dx=(1-e)*w*.6+to*to*w*.7;ctx.save();ctx.globalAlpha*=u;ctx.translate(dx,0);
        ctx.fillStyle=row.col||C.chalk;ctx.shadowColor=row.col||C.chalk;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(dX,cy-rh*.13*fs,rh*.11,0,TAU);ctx.fill();ctx.shadowBlur=0;
        txt(ctx,row.name,nX,cy,{font:F.sans,weight:600,size:Math.round(rh*.44*fs),ls:1,color:k===cur?C.gold:C.chalk,align:'left'});
        txt(ctx,fmt(row.val),x0+w-18,cy,{font:F.mono,weight:600,size:Math.round(rh*.42*fs),color:k===cur?C.gold:'#9fd3e0',align:'right'});ctx.restore();
        const fl=Math.exp(-Math.max(0,T-row.t)*5)*(1-to);if(fl>.02){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,236,200,${fl*.35})`;ctx.beginPath();ctx.roundRect?ctx.roundRect(x0,yy,w,rh-8,12):ctx.rect(x0,yy,w,rh-8);ctx.fill();ctx.restore()}}
      else if(k===mys){const pl=.55+.45*Math.sin(T*9);txt(ctx,'???',xc,cy,{font:F.sans,weight:600,size:Math.round(rh*.5),ls:8,color:`rgba(244,183,64,${pl})`})}
      else txt(ctx,'—',xc+20,cy,{font:F.mono,size:Math.round(rh*.4),color:'rgba(236,230,214,.25)'})}
    ctx.restore()}
  return {acc,streaks,speedo,board,fmt,pop}})();
