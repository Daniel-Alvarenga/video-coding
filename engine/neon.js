/* ---------- NEON: objetos de referência de escala em contorno neon (2D), com altura real ----------
   Feito para o Short "42 dobras até a Lua" (projetos/dobras-lua, 15/11/2026). Cada ícone é desenhado em px a partir da base:
     NEON.draw(ctx,k,x,yBase,hPx,{col,a,lw,fill,t})   k = 'dado'|'caneca'|'gato'|'pessoa'|'casa'|'cristo'|'eiffel'|'burj'|'everest'|'iss'|'aviao'
     NEON.H[k]  altura real em metros;  NEON.ASP[k] largura/altura do desenho
     NEON.label(ctx,x,y,nome,valor,{a,align,col})  rótulo pequeno (nome em Hanken + valor em mono) com tracinho até o objeto
     NEON.line(ctx,pts,{col,a,lw,close,fill})  traço neon genérico (pts em px)
     NEON.fmt(m)  metros em texto PT-BR com o número cheio ("2,6 cm", "1,6 m", "439.805 km", "4,3 milhões de km", "103 bilhões de anos-luz")
   Cores padrão: ciano (#62d0ea) para referências, ouro (#f4b740) para o herói. Sem rosa. */
const NEON=(()=>{
  const H={dado:.016,caneca:.095,gato:.30,pessoa:1.75,casa:7,cristo:38,eiffel:330,burj:828,everest:8849,iss:420000,aviao:10000};
  const ASP={dado:1,caneca:1.25,gato:.85,pessoa:.42,casa:1.05,cristo:.74,eiffel:.38,burj:.16,everest:2.6,iss:2.2,aviao:1.2};
  /* contornos em unidades: x ∈ [−asp/2, asp/2], y ∈ [0,1] (0 = chão). Cada ícone devolve listas de polilinhas {p,close,fill} */
  const circ=(cx,cy,r,n=28,a0=0,a1=TAU)=>Array.from({length:n+1},(_,i)=>{const t=a0+(a1-a0)*i/n;return [cx+r*Math.cos(t),cy+r*Math.sin(t)]});
  const ICON={
    dado:()=>{const s=.5,L=[{p:[[-s,0],[s,0],[s,1],[-s,1]],close:1,fill:1}];[[-.25,.75],[.25,.75],[0,.5],[-.25,.25],[.25,.25]].forEach(([x,y])=>L.push({p:circ(x,y,.075,14),close:1,dot:1}));return L},
    caneca:()=>[{p:[[-.5,1],[-.46,.08],[-.4,0],[.3,0],[.36,.08],[.4,1]],fill:1},{p:circ(.48,.55,.2,18,-Math.PI/2,Math.PI/2)},
      {p:[[-.2,1.08],[-.26,1.18],[-.18,1.3],[-.24,1.42]],steam:1},{p:[[.05,1.08],[-.01,1.18],[.07,1.3],[.01,1.42]],steam:1}],
    gato:()=>{const b=[...circ(0,.3,.33,24,Math.PI*.95,Math.PI*2.05)].map(([x,y])=>[x*1.05,Math.max(0,y)]);
      return [{p:b,fill:1},{p:[[-.22,.62],[-.24,.98],[-.08,.84],[.08,.84],[.24,.98],[.22,.62]]},{p:circ(0,.68,.23,22,Math.PI*.15,Math.PI*.85).map(([x,y])=>[x,y])},
        {p:[[.32,.08],[.5,.12],[.56,.32],[.46,.5]]},{p:circ(-.08,.72,.025,8),close:1,dot:1},{p:circ(.08,.72,.025,8),close:1,dot:1}]},
    pessoa:()=>[{p:circ(0,.9,.09,20),close:1},{p:[[0,.8],[0,.42]]},{p:[[-.2,.48],[-.12,.62],[0,.74],[.12,.62],[.2,.48]]},{p:[[-.12,0],[0,.42],[.12,0]]}],
    casa:()=>[{p:[[-.45,0],[-.45,.58],[.45,.58],[.45,0]],fill:1},{p:[[-.55,.55],[0,1],[.55,.55]]},{p:[[-.1,0],[-.1,.3],[.1,.3],[.1,0]]},
      {p:[[-.36,.33],[-.2,.33],[-.2,.47],[-.36,.47]],close:1,win:1},{p:[[.2,.33],[.36,.33],[.36,.47],[.2,.47]],close:1,win:1}],
    cristo:()=>[{p:[[-.16,0],[-.16,.2],[.16,.2],[.16,0]],fill:1},{p:[[-.1,.2],[-.06,.74],[.06,.74],[.1,.2]],fill:1},
      {p:[[-.5,.74],[-.06,.76],[-.04,.8],[.04,.8],[.06,.76],[.5,.74],[.5,.71],[.06,.7],[-.06,.7],[-.5,.71]],close:1,fill:1},{p:circ(0,.86,.05,16),close:1,fill:1}],
    eiffel:()=>{const L=[{p:[[-.5,0],[-.3,.22],[-.12,.55],[-.04,.88],[0,1],[.04,.88],[.12,.55],[.3,.22],[.5,0]]},{p:[[-.3,.22],[.3,.22]]},{p:[[-.13,.55],[.13,.55]]},
        {p:circ(0,0,.24,18,Math.PI*1.05,Math.PI*1.95).map(([x,y])=>[x,-y*.55+.0])}];for(let i=1;i<6;i++){const y=.22+i*.055,w=.3-i*.034;L.push({p:[[-w,y],[w-.06,y+.055]],thin:1});L.push({p:[[w,y],[-w+.06,y+.055]],thin:1})}return L},
    burj:()=>{const st=[[.5,0],[.5,.18],[.38,.18],[.38,.34],[.28,.34],[.28,.5],[.2,.5],[.2,.64],[.13,.64],[.13,.76],[.07,.76],[.07,.86],[.025,.86],[0,1]];
      return [{p:[...st.map(([x,y])=>[-x,y]),...st.slice().reverse().map(([x,y])=>[x,y])],fill:1}]},
    everest:()=>[{p:[[-.5,0],[-.38,.22],[-.3,.18],[-.18,.5],[-.12,.44],[-.02,.86],[.03,1],[.1,.82],[.16,.88],[.26,.52],[.34,.58],[.5,0]],fill:1},
      {p:[[-.02,.86],[.03,1],[.1,.82],[.06,.78],[.0,.84]],snow:1,close:1}],
    iss:()=>[{p:[[-.5,.35],[-.5,.65],[-.12,.65],[-.12,.35]],close:1,fill:1},{p:[[.12,.35],[.12,.65],[.5,.65],[.5,.35]],close:1,fill:1},{p:[[-.12,.5],[.12,.5]]},
      {p:[[-.06,.38],[.06,.38],[.06,.62],[-.06,.62]],close:1,fill:1}],
    aviao:()=>[{p:[[-.5,.5],[.4,.5],[.5,.55],[.4,.6],[-.5,.6]],close:1,fill:1},{p:[[-.05,.55],[-.2,.95],[-.1,.95],[.1,.55]]},{p:[[-.05,.55],[-.2,.15],[-.1,.15],[.1,.55]]},{p:[[-.42,.55],[-.5,.8],[-.44,.8],[-.36,.55]]}]
  };
  const hex=c=>{const n=parseInt(c.slice(1,7),16);return [n>>16&255,n>>8&255,n&255]};
  const rgba=(c,a)=>{const [r,g,b]=hex(c);return `rgba(${r},${g},${b},${a})`};
  function line(ctx,pts,o={}){if(pts.length<2)return;const col=o.col||'#62d0ea',a=o.a??1,lw=o.lw||3;ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    const path=()=>{ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));if(o.close)ctx.closePath()};
    if(o.fill){path();ctx.fillStyle=rgba(col,.08*a);ctx.fill()}
    ctx.globalCompositeOperation='lighter';path();ctx.strokeStyle=rgba(col,.16*a);ctx.lineWidth=lw*5;ctx.stroke();ctx.strokeStyle=rgba(col,.35*a);ctx.lineWidth=lw*2.2;ctx.stroke();
    ctx.strokeStyle=rgba('#ffffff',.85*a);ctx.lineWidth=Math.max(1,lw*.7);ctx.stroke();ctx.restore()}
  function draw(ctx,k,x,yb,hPx,o={}){const a=o.a??1;if(a<=.004||hPx<1.5)return;const asp=ASP[k]||1,s=hPx,col=o.col||'#62d0ea',lw=o.lw||clamp(hPx*.02,1.6,4.5);
    for(const L of ICON[k]()){const P=L.p.map(([u,v])=>[x+u*s*(asp/(k==='dado'?1:1)),yb-v*s]);
      if(L.dot){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=rgba('#ffffff',.9*a);ctx.beginPath();P.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.fill();ctx.restore();continue}
      if(L.snow){ctx.save();ctx.fillStyle=rgba('#ffffff',.55*a);ctx.beginPath();P.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.fill();ctx.restore();continue}
      if(L.win){ctx.save();ctx.fillStyle=rgba('#f4b740',.45*a);ctx.beginPath();P.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.fill();ctx.restore()}
      const ph=L.steam?Math.sin((o.t||0)*3)*s*.02:0;
      line(ctx,ph?P.map(q=>[q[0]+ph,q[1]]):P,{col,a:a*(L.steam?.6:1)*(L.thin?.7:1),lw:L.thin?lw*.6:lw,close:L.close,fill:L.fill&&o.fill!==false})}}
  function label(ctx,x,y,nome,valor,o={}){const a=o.a??1;if(a<=.01)return;const al=o.align||'left',col=o.col||'#62d0ea';
    txt(ctx,nome,x,y,{font:F.sans,weight:600,size:o.size||34,color:'#ece6d6',align:al,a});if(valor)txt(ctx,valor,x,y+(o.size||34)*1.05,{font:F.mono,size:(o.size||34)*.78,color:col,align:al,a})}
  const milhar=n=>Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  const dec=(v,d=1)=>v.toFixed(d).replace('.',',').replace(/,0+$/,'');
  function fmt(m){const LY=9.4607e15;
    if(m<.01)return dec(m*1000,1)+' mm';if(m<1)return dec(m*100,m<.1?1:0)+' cm';if(m<1000)return dec(m,m<10?2:0)+' m';
    const km=m/1000;if(km<1e6)return milhar(km)+' km';
    if(m<LY*.05){const v=km/1e6;return v<1000?dec(v,v<10?1:0)+(v<2?' milhão':' milhões')+' de km':dec(v/1000,v<1e4?1:0)+(v<2e3?' bilhão':' bilhões')+' de km'}
    const ly=m/LY;if(ly<1000)return dec(ly,ly<10?1:0)+' anos-luz';if(ly<1e6)return milhar(ly/1000)+' mil anos-luz';if(ly<1e9)return dec(ly/1e6,ly<1e7?1:0)+(ly<2e6?' milhão':' milhões')+' de anos-luz';
    return dec(ly/1e9,0)+' bilhões de anos-luz'}
  return {draw,label,line,fmt,H,ASP,ICON}})();
