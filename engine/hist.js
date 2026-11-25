/* HIST: vídeos de História (meta.json "hist": true). Exemplo: projetos/brasil-colonial/.
   - HIST.bg(ctx,{warm})             fundo de couro/pergaminho escuro com grão e vinheta (cache)
   - HIST.paper(ctx,x,y,w,h,{a,rot}) folha de pergaminho clara com bordas queimadas (cache por tamanho)
   - HIST.kb(ctx,img,box,u,{from,to,a,frame,tone}) pintura com câmera Ken Burns: from/to = {x,y,z} (centro 0..1 na imagem, zoom ≥ 1), u = 0..1;
       devolve proj(nx,ny) → ponto de tela de um ponto da imagem (0..1), para marcar lugares em mapas
   - HIST.plate(ctx,título,sub,x,y,{a,align}) etiqueta de museu (autor, obra, data)
   - HIST.write(ctx,texto,x,y,p,{size,color,font,it,pen,align}) escrita à mão: o texto aparece da esquerda com a pena na ponta
   - HIST.quill(ctx,x,y,{a,rot,s}) pena de escrever
   - HIST.chip(ctx,texto,x,y,p,{col}) cartão de conceito-chave que bate como carimbo
   - HIST.card(ctx,título,linhas,x,y,w,p,{tag}) ficha de reflexão (papel, título, linhas, rótulo FONTE)
   - HIST.engenho(ctx,cam,t,o) maquete digital de um engenho colonial (casa-grande, capela, moenda com roda d'água,
       casa das caldeiras com fumaça, casa de purgar, senzala, canavial, rio, mata e quilombo com paliçada);
       o.hi = 'casa'|'senzala'|'moenda'|'caldeira'|'purgar'|'capela'|'quilombo' destaca uma parte e apaga o resto;
       o.fuga = 0..1 desenha as rotas de fuga até o quilombo; o.warm = 0..1 luz quente focada; o.labels = {nome: alfa};
       devolve {pt(nome)} com a posição em tela de cada parte (para rótulos próprios)
   - HIST.lathe(cam,perfil,{c,col,n,bands,spin,fa}) sólido de revolução (cerâmica, cabaça, cesto, pilão) como faces do FX
   - HIST.table(cam,{w,d,h,col}) mesa de madeira (faces)
   - HIST.route(ctx,pts,p,{col,lw,dash,head}) rota tracejada que se desenha com seta na ponta
   - HIST.arc(ctx,a,b,p,{lift,col,lw}) arco de rota entre dois pontos de tela (tráfico atlântico), com seta
   - HIST.credits(ctx,blocos,u,{top,bot}) rolagem vertical dos créditos (u = 0..1)
   - HIST.sepia(ctx,box,a) véu sépia por cima de algo já desenhado (mapas de satélite com cara de antigo)
   Cores: HIST.K = {ink, paper, ochre, gold, red, green, dark}. */
const HIST=(()=>{
  const K={ink:'#2b1d10',paper:'#eadcbc',ochre:'#c08a3e',gold:'#e8b04e',red:'#9a4426',green:'#5d6b38',dark:'#140d07',cream:'#f3e7cc'};
  const hx=c=>{const n=parseInt(c.slice(1),16);return [n>>16&255,n>>8&255,n&255]};
  const rgba=(c,a)=>{const A=hx(c);return `rgba(${A[0]},${A[1]},${A[2]},${a})`};
  const mix=(a,b,u)=>{const A=hx(a),B=hx(b);return '#'+A.map((v,i)=>Math.round(lerp(v,B[i],u)).toString(16).padStart(2,'0')).join('')};
  const R=s=>{let x=s>>>0||1;return()=>(x=(x*1664525+1013904223)>>>0)/4294967296};

  /* ---------- fundos ---------- */
  let _bg=null;
  function bgCanvas(){if(_bg)return _bg;const c=document.createElement('canvas');c.width=W;c.height=H;const b=c.getContext('2d');
    const g=b.createRadialGradient(W*.5,H*.45,H*.1,W*.5,H*.5,W*.75);g.addColorStop(0,'#3a2716');g.addColorStop(.6,'#22160c');g.addColorStop(1,'#0c0804');
    b.fillStyle=g;b.fillRect(0,0,W,H);const r=R(11),im=b.getImageData(0,0,W,H),d=im.data;
    for(let i=0;i<d.length;i+=4){const n=(r()-.5)*16;d[i]+=n;d[i+1]+=n*.85;d[i+2]+=n*.6}b.putImageData(im,0,0);
    for(let k=0;k<60;k++){const x=r()*W,y=r()*H,s=60+r()*260,gg=b.createRadialGradient(x,y,0,x,y,s);gg.addColorStop(0,`rgba(110,70,30,${.03+r()*.05})`);gg.addColorStop(1,'rgba(110,70,30,0)');b.fillStyle=gg;b.fillRect(x-s,y-s,2*s,2*s)}
    return _bg=c}
  function bg(ctx,o={}){ctx.drawImage(bgCanvas(),0,0);if(o.warm){const g=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,W*.6);g.addColorStop(0,`rgba(255,170,80,${.10*o.warm})`);g.addColorStop(1,'rgba(255,170,80,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}}
  const _pap=new Map();
  function paperCanvas(w,h,seed=3){const k=w+'x'+h+'|'+seed;if(_pap.has(k))return _pap.get(k);const c=document.createElement('canvas');c.width=w;c.height=h;const b=c.getContext('2d'),r=R(seed);
    b.fillStyle=K.paper;b.fillRect(0,0,w,h);const im=b.getImageData(0,0,w,h),d=im.data;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,n=(r()-.5)*18,e=Math.min(x,y,w-1-x,h-1-y)/Math.min(w,h),bu=clamp(1-e*9);
      const sh=FX.fbm(x*.012,y*.012,seed)*26;d[i]+=n-sh-bu*95;d[i+1]+=n-sh*1.1-bu*110;d[i+2]+=n*.8-sh*1.3-bu*120}
    b.putImageData(im,0,0);for(let q=0;q<14;q++){const x=r()*w,y=r()*h,s=20+r()*90,g=b.createRadialGradient(x,y,0,x,y,s);g.addColorStop(0,`rgba(120,80,35,${.05+r()*.07})`);g.addColorStop(1,'rgba(120,80,35,0)');b.fillStyle=g;b.fillRect(x-s,y-s,2*s,2*s)}
    _pap.set(k,c);return c}
  function paper(ctx,x,y,w,h,o={}){if((o.a??1)<=0)return;const c=paperCanvas(Math.round(w),Math.round(h),o.seed||3);ctx.save();ctx.globalAlpha*=o.a??1;
    if(o.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(o.rot);ctx.translate(-x-w/2,-y-h/2)}ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=30;ctx.shadowOffsetY=10;ctx.drawImage(c,x,y);ctx.restore()}
  function sepia(ctx,box,a=.5){const [x,y,w,h]=box;ctx.save();ctx.globalAlpha=a;ctx.globalCompositeOperation='multiply';ctx.fillStyle='#c9a16a';ctx.fillRect(x,y,w,h);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a*.35;ctx.fillStyle='#4a2e12';ctx.fillRect(x,y,w,h);ctx.restore()}

  /* ---------- pinturas ---------- */
  function kb(ctx,name,box,u,o={}){const im=FX.IMG[name],a=o.a??1;if(!im||a<=0)return ()=>[-999,-999];const [bx,by,bw,bh]=box,f=o.from||{x:.5,y:.5,z:1},t=o.to||f,e=ease(clamp(u));
    const z=Math.exp(lerp(Math.log(f.z||1),Math.log(t.z||1),e)),cxn=lerp(f.x??.5,t.x??.5,e),cyn=lerp(f.y??.5,t.y??.5,e);
    const r=im.width/im.height,base=bw/bh>r?bw/im.width:bh/im.height,s=base*z;   // cover
    const vw=bw/s,vh=bh/s;let sx=cxn*im.width-vw/2,sy=cyn*im.height-vh/2;sx=clamp(sx,0,im.width-vw);sy=clamp(sy,0,im.height-vh);
    ctx.save();ctx.globalAlpha*=a;if(o.frame!==false){ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=40;ctx.shadowOffsetY=12;ctx.fillStyle='#000';ctx.fillRect(bx,by,bw,bh);ctx.shadowColor='transparent'}
    ctx.beginPath();ctx.rect(bx,by,bw,bh);ctx.clip();ctx.drawImage(im,Math.max(0,sx),Math.max(0,sy),Math.min(vw,im.width),Math.min(vh,im.height),bx,by,bw,bh);
    if(o.tone!==0){ctx.globalAlpha=a*(o.tone??.14);ctx.fillStyle='#5a3510';ctx.globalCompositeOperation='multiply';ctx.fillRect(bx,by,bw,bh);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a}
    const v=ctx.createRadialGradient(bx+bw/2,by+bh/2,Math.min(bw,bh)*.35,bx+bw/2,by+bh/2,Math.hypot(bw,bh)*.6);v.addColorStop(0,'rgba(10,6,2,0)');v.addColorStop(1,`rgba(10,6,2,${o.vig??.45})`);ctx.fillStyle=v;ctx.fillRect(bx,by,bw,bh);
    ctx.restore();if(o.frame!==false){ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=rgba(K.ochre,.8);ctx.lineWidth=2;ctx.strokeRect(bx-7,by-7,bw+14,bh+14);ctx.strokeStyle=rgba(K.ochre,.35);ctx.lineWidth=1;ctx.strokeRect(bx-13,by-13,bw+26,bh+26);ctx.restore()}
    return (nx,ny)=>[bx+(nx*im.width-sx)*s,by+(ny*im.height-sy)*s]}
  function plate(ctx,title,sub,x,y,o={}){const a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.font=`italic 400 34px ${F.display}`;const w1=ctx.measureText(title).width;ctx.font=`500 19px ${F.mono}`;const w2=ctx.measureText(sub).width;
    const w=Math.max(w1,w2)+56,h=96,X=o.align==='right'?x-w:o.align==='center'?x-w/2:x;ctx.fillStyle='rgba(20,13,7,.82)';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=20;ctx.fillRect(X,y,w,h);ctx.shadowColor='transparent';
    ctx.fillStyle=K.gold;ctx.fillRect(X,y,5,h);txt(ctx,title,X+28,y+44,{font:F.display,it:1,size:34,color:K.cream,align:'left'});txt(ctx,sub,X+28,y+76,{font:F.mono,size:19,color:rgba(K.gold,.9),ls:1,align:'left'});ctx.restore()}

  /* ---------- escrita ---------- */
  function quill(ctx,x,y,o={}){const s=o.s||1,a=o.a??1;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);ctx.rotate(o.rot??-.75);ctx.scale(s,s);
    ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=14;ctx.shadowOffsetY=8;
    ctx.fillStyle='#efe6d2';ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-18,-60,-10,-170,26,-250);ctx.bezierCurveTo(30,-170,36,-80,6,-4);ctx.closePath();ctx.fill();ctx.shadowColor='transparent';
    ctx.strokeStyle='rgba(120,100,70,.6)';ctx.lineWidth=1.2;for(let k=0;k<16;k++){const v=-30-k*13;ctx.beginPath();ctx.moveTo(3+k*.9,v);ctx.lineTo(-10-k*.2+(k%2)*3,v-16);ctx.stroke();ctx.beginPath();ctx.moveTo(4+k*1.1,v);ctx.lineTo(18+k*.9,v-12);ctx.stroke()}
    ctx.strokeStyle='#8f7a55';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(10,-120,26,-250);ctx.stroke();ctx.fillStyle=K.ink;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(-3,-14);ctx.lineTo(5,-14);ctx.closePath();ctx.fill();ctx.restore()}
  function write(ctx,s,x,y,p,o={}){if(p<=0)return;const size=o.size||64,font=o.font||F.display;ctx.save();ctx.font=`${o.it?'italic ':''}${o.weight||400} ${size}px ${font}`;const w=ctx.measureText(s).width,X=o.align==='center'?x-w/2:o.align==='right'?x-w:x;
    const pe=clamp(p),cut=X+w*pe;ctx.save();ctx.beginPath();ctx.rect(X-10,y-size*1.2,cut-X+10,size*1.7);ctx.clip();txt(ctx,s,X,y,{font,size,color:o.color||K.ink,it:o.it,weight:o.weight,a:o.a??1,align:'left'});ctx.restore();
    if(o.pen!==false&&pe<1)quill(ctx,cut,y-size*.15+Math.sin(p*90)*size*.06,{s:size/110,a:(o.a??1)*clamp((1-pe)*12)});ctx.restore();return cut}

  /* ---------- cartões ---------- */
  function chip(ctx,s,x,y,p,o={}){if(p<=0)return;const e=easeOut(clamp(p*1.6)),sc=lerp(1.5,1,e),a=clamp(p*3)*(o.a??1),col=o.col||K.gold;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);ctx.scale(sc,sc);ctx.rotate((o.rot??-.02)*(1-e*.4));
    ctx.font=`600 30px ${F.sans}`;const w=ctx.measureText(s.toUpperCase()).width+30*s.length*.06+60;ctx.fillStyle='rgba(20,13,7,.86)';ctx.fillRect(-w/2,-34,w,68);ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.strokeRect(-w/2+6,-28,w-12,56);
    txt(ctx,s.toUpperCase(),0,11,{font:F.sans,weight:600,size:30,color:col,align:'center',ls:3});ctx.restore()}
  function card(ctx,title,lines,x,y,w,p,o={}){if(p<=0)return;const e=easeOut(clamp(p)),h=o.h||(120+lines.length*40);ctx.save();ctx.globalAlpha*=clamp(p*2.5)*(o.a??1);ctx.translate(x,y+(1-e)*40);ctx.rotate(o.rot||0);
    paper(ctx,-w/2,-h/2,w,h,{seed:o.seed||5});if(o.tag)txt(ctx,o.tag,-w/2+34,-h/2+44,{font:F.mono,size:18,color:K.red,ls:2,align:'left'});
    txt(ctx,title,-w/2+34,-h/2+(o.tag?92:60),{font:F.display,it:1,size:38,color:K.ink,align:'left'});lines.forEach((l,i)=>txt(ctx,l,-w/2+34,-h/2+(o.tag?140:108)+i*40,{font:F.sans,size:26,color:rgba(K.ink,.85),align:'left'}));ctx.restore()}

  /* ---------- 3D: maquete ---------- */
  const tri=(cam,v,col,o={})=>({cam,v,fill:FX.shade(v,col,o.fa??1),stroke:o.stroke??rgba(mix(col,'#000000',.45),.8),lw:o.lw||1,a:o.a??1,bias:o.bias||0});
  function solid(cam,x0,y0,z0,dx,dy,dz,col,o={}){return FX.box(cam,x0,y0,z0,dx,dy,dz,{color:col,fa:o.fa??1,sa:.55,lw:1,a:o.a??1}).map(f=>(f.stroke=rgba(mix(col,'#000000',.5),.7),f))}
  /* casa com telhado de duas águas (cumeeira ao longo de x quando w>=d) */
  function house(cam,x,y,w,d,h,rh,col,roof,o={}){const F=solid(cam,x,y,0,w,d,h,col,o),a=o.a??1,ov=o.ov??.25;const X0=x-ov,X1=x+w+ov,Y0=y-ov,Y1=y+d+ov,Z=h,ym=y+d/2,xm=x+w/2;
    if(w>=d){F.push(tri(cam,[[X0,Y0,Z],[X1,Y0,Z],[X1,ym,Z+rh],[X0,ym,Z+rh]],roof,{a}),tri(cam,[[X0,Y1,Z],[X0,ym,Z+rh],[X1,ym,Z+rh],[X1,Y1,Z]],roof,{a}),tri(cam,[[x,y,Z],[x,y+d,Z],[x,ym,Z+rh]],col,{a}),tri(cam,[[x+w,y,Z],[x+w,ym,Z+rh],[x+w,y+d,Z]],col,{a}))}
    else{F.push(tri(cam,[[X0,Y0,Z],[xm,Y0,Z+rh],[xm,Y1,Z+rh],[X0,Y1,Z]],roof,{a}),tri(cam,[[X1,Y0,Z],[X1,Y1,Z],[xm,Y1,Z+rh],[xm,Y0,Z+rh]],roof,{a}),tri(cam,[[x,y,Z],[xm,y,Z+rh],[x+w,y,Z]],col,{a}),tri(cam,[[x,y+d,Z],[x+w,y+d,Z],[xm,y+d,Z+rh]],col,{a}))}
    // janelas e portas na fachada y=y (frente)
    (o.win||[]).forEach(([u,zb,ww,wh])=>F.push(tri(cam,[[x+u,y-.03,zb],[x+u+ww,y-.03,zb],[x+u+ww,y-.03,zb+wh],[x+u,y-.03,zb+wh]],o.winCol||'#2a1a0e',{a,bias:-.05,stroke:'rgba(0,0,0,0)'})));return F}
  function tree(cam,x,y,s,col,a=1,seed=1){const r=R(seed*7+3),F=solid(cam,x-.08*s,y-.08*s,0,.16*s,.16*s,.9*s,'#5a3a1e',{a});const c=[x,y,1.5*s],rr=.75*s*(0.85+r()*.3);
    const P=[[0,0,1],[1,0,0],[0,1,0],[-1,0,0],[0,-1,0],[0,0,-.7]].map(([u,v,w])=>[c[0]+u*rr,c[1]+v*rr,c[2]+w*rr*1.2]);
    [[0,1,2],[0,2,3],[0,3,4],[0,4,1],[5,2,1],[5,3,2],[5,4,3],[5,1,4]].forEach(q=>F.push(tri(cam,q.map(i=>P[i]),mix(col,'#203010',r()*.3),{a})));return F}
  function palm(cam,x,y,s,a=1){const F=solid(cam,x-.05*s,y-.05*s,0,.1*s,.1*s,2.2*s,'#6b4a2a',{a});for(let k=0;k<6;k++){const an=k/6*TAU,dx=Math.cos(an),dy=Math.sin(an);
      F.push(tri(cam,[[x,y,2.2*s],[x+dx*1.0*s-dy*.18*s,y+dy*1.0*s+dx*.18*s,1.85*s],[x+dx*1.2*s,y+dy*1.2*s,1.6*s],[x+dx*1.0*s+dy*.18*s,y+dy*1.0*s-dx*.18*s,1.85*s]],'#4f6b2a',{a}))}return F}
  /* layout da maquete (unidades ~ 10 m; x leste, y norte, z para cima) */
  const L0={casa:[-6,2],capela:[-10.5,2.5],moenda:[1,-2],caldeira:[4.4,-2],purgar:[8,-2.2],senzala:[-2,-7],quilombo:[15,13],porto:[13,-11]};
  function engenho(ctx,cam,t,o={}){const hi=o.hi,A=k=>hi?(hi===k?1:.28):1,FA=k=>hi&&hi!==k?.55:1;const F=[];const a0=o.a??1;if(a0<=0)return{pt:()=>[0,0]};
    ctx.save();ctx.globalAlpha*=a0;
    // chão: tabuleiro da maquete com borda de madeira
    const G=[[-16,-14],[18,-14],[18,17],[-16,17]],base=[...G].map(([x,y])=>[x,y,0]);
    const gq=(pts,col,al=1,b=60)=>({cam,v:pts,fill:col,stroke:'rgba(0,0,0,0)',a:al,bias:b});
    FX.faces(ctx,[...solid(cam,-16.6,-14.6,-1.2,35.2,32.2,1.2,'#6a4524'),gq(base,'#7c6a3c',1,80)]);
    // terra batida em volta das construções, canavial em faixas, mata no nordeste, rio a oeste
    const GR=[];GR.push(gq([[-13,-9.5,0],[11,-9.5,0],[11,5,0],[-13,5,0]],'#9a8052',1,70));
    for(let k=0;k<9;k++){const y0=-13.5+k*1.0;GR.push(gq([[-15.5,y0,0],[-5,y0,0],[-5,y0+.55,0],[-15.5,y0+.55,0]].map(([x,y,z],i)=>[x,y,z]),'#7f8f3a',A('cana')*.95,69))}
    for(let k=0;k<11;k++){const x0=-15.5+k*1.0;GR.push(gq([[x0,6.5,0],[x0+.55,6.5,0],[x0+.55,16.5,0],[x0,16.5,0]],'#8a9a42',A('cana')*.95,69))}
    GR.push(gq([[10,6,0],[18,6,0],[18,17,0],[10,17,0]],'#3f5226',1,69));
    // canal que traz a água até a roda da moenda
    GR.push(gq([[1.8,-14,0],[3.4,-14,0],[3.4,-3.4,0],[1.8,-3.4,0]],'#3d6a7a',1,68));
    FX.faces(ctx,GR);
    // caminho até o porto
    route(ctx,[[8,-6],[10,-8],[12,-10],[13,-11]].map(([x,y])=>FX.pj(cam,x,y,.02)),1,{col:'rgba(70,50,25,.7)',lw:5*cam.scale/60,dash:[1,0],head:false});
    // construções
    const C1='#e8dcc0',C2='#d6c3a0',TEL='#a0502c',PAL='#9c8a55';
    F.push(...house(cam,L0.casa[0],L0.casa[1],5,3.2,2.6,1.3,C1,TEL,{a:A('casa'),fa:FA('casa'),win:[[.5,1.5,.5,.6],[1.4,1.5,.5,.6],[2.3,0,.6,1.2],[3.3,1.5,.5,.6],[4.1,1.5,.5,.6],[.5,.3,.5,.6],[1.4,.3,.5,.6],[3.3,.3,.5,.6],[4.1,.3,.5,.6]]}));
    F.push(...solid(cam,L0.casa[0]-.4,L0.casa[1]-1.4,0,5.8,1.4,.25,'#b9a681',{a:A('casa')}));                     // alpendre/escadaria
    F.push(...house(cam,L0.capela[0],L0.capela[1],2,3,2.4,1,C1,TEL,{a:A('capela'),fa:FA('capela'),win:[[.65,0,.7,1.3]]}));
    F.push(...solid(cam,L0.capela[0]+.6,L0.capela[1]-.1,2.4,.8,.8,1.6,C1,{a:A('capela')}));
    F.push(...solid(cam,L0.capela[0]+.95,L0.capela[1]+.25,4,.1,.1,.7,'#3a2a18',{a:A('capela')}),...solid(cam,L0.capela[0]+.75,L0.capela[1]+.25,4.4,.5,.1,.1,'#3a2a18',{a:A('capela')}));
    // moenda: galpão aberto (pilares + telhado) e roda d'água girando
    const mx=L0.moenda[0],my=L0.moenda[1],am=A('moenda');
    [[0,0],[2.6,0],[0,2.4],[2.6,2.4]].forEach(([u,v])=>F.push(...solid(cam,mx+u,my+v,0,.2,.2,2,'#7a5530',{a:am})));
    F.push(tri(cam,[[mx-.3,my-.3,2],[mx+3.1,my-.3,2],[mx+3.1,my+1.3,2.9],[mx-.3,my+1.3,2.9]],TEL,{a:am}),tri(cam,[[mx-.3,my+2.9,2],[mx-.3,my+1.3,2.9],[mx+3.1,my+1.3,2.9],[mx+3.1,my+2.9,2]],TEL,{a:am}));
    // três cilindros verticais da moenda (giram) e a roda d'água ao lado, no canal
    const ang=t*1.1;[-.55,0,.55].forEach((u,k)=>F.push(...lathe(cam,[[0,0],[.28,0],[.28,1.2],[0,1.2]],{c:[mx+1.3+u,my+1.2,0],col:'#8b6a3c',n:10,spin:ang*(k%2?-1:1),fa:FA('moenda'),a:am})));
    const wx=2.6,wy=my-.9,wz=1.5,wr=1.4;for(let k=0;k<12;k++){const a1=ang+k/12*TAU,a2=a1+TAU/12;
      F.push(tri(cam,[[wx-.3,wy+Math.cos(a1)*wr,wz+Math.sin(a1)*wr],[wx+.3,wy+Math.cos(a1)*wr,wz+Math.sin(a1)*wr],[wx+.3,wy+Math.cos(a2)*wr,wz+Math.sin(a2)*wr],[wx-.3,wy+Math.cos(a2)*wr,wz+Math.sin(a2)*wr]],'#7a5530',{a:am}),
        tri(cam,[[wx-.05,wy,wz],[wx+.05,wy,wz],[wx+.05,wy+Math.cos(a1)*wr,wz+Math.sin(a1)*wr],[wx-.05,wy+Math.cos(a1)*wr,wz+Math.sin(a1)*wr]],'#5e4226',{a:am}))}
    // casa das caldeiras com chaminé e casa de purgar
    F.push(...house(cam,L0.caldeira[0],L0.caldeira[1],3,2.6,2,.9,C2,TEL,{a:A('caldeira'),fa:FA('caldeira'),win:[[1.1,0,.8,1.1]]}),...solid(cam,L0.caldeira[0]+2.2,L0.caldeira[1]+1.6,0,.6,.6,4.2,'#8a6a4a',{a:A('caldeira')}));
    F.push(...house(cam,L0.purgar[0],L0.purgar[1],3.6,2.4,1.9,.9,C2,TEL,{a:A('purgar'),fa:FA('purgar'),win:[[.4,.8,.4,.5],[1.2,0,.7,1.1],[2.6,.8,.4,.5]]}));
    // senzala: fileira longa e baixa, sem janelas, portas pequenas
    const sz=L0.senzala;F.push(...house(cam,sz[0],sz[1],9,1.8,1.3,.7,'#b7a27e',PAL,{a:A('senzala'),fa:FA('senzala'),win:[0,1,2,3,4,5,6,7].map(k=>[.4+k*1.1,0,.45,.9])}));
    // mata, coqueiros e quilombo com paliçada e casas de palha
    const r=R(5);for(let k=0;k<26;k++){const x=10.6+r()*7,y=6.6+r()*10;if(Math.hypot(x-L0.quilombo[0],y-L0.quilombo[1])<2.6)continue;F.push(...tree(cam,x,y,.9+r()*.5,'#4d6a2c',A('mata')*.95,k))}
    [[-12,-11],[6,4],[9,-6],[-14,5.5],[12,-12.5]].forEach(([x,y])=>F.push(...palm(cam,x,y,1)));
    const qx=L0.quilombo[0],qy=L0.quilombo[1],aq=A('quilombo');for(let k=0;k<28;k++){const an=k/28*TAU;F.push(...solid(cam,qx+Math.cos(an)*2.3-.07,qy+Math.sin(an)*2.3-.07,0,.14,.14,.9+(k%3)*.12,'#7a5a32',{a:aq}))}
    [[-.9,-.6],[.8,-.4],[0,.9]].forEach(([u,v],k)=>{F.push(...lathe(cam,[[0,0],[.55,0],[.55,.55],[.62,.6],[0,1.4]],{c:[qx+u,qy+v,0],col:'#a28a50',n:10,a:aq,fa:1}))});
    FX.faces(ctx,F);
    // fumaça da chaminé e luz quente
    const ch=FX.pj(cam,L0.caldeira[0]+2.5,L0.caldeira[1]+1.9,4.3);ctx.save();for(let k=0;k<14;k++){const u=((t*.25+k/14)%1),x=ch[0]+Math.sin(u*5+k)*18*u+u*60,y=ch[1]-u*170;ctx.globalAlpha=(1-u)*.22*A('caldeira');ctx.fillStyle='#d8d0c4';ctx.beginPath();ctx.arc(x,y,8+u*40,0,TAU);ctx.fill()}ctx.restore();
    if(o.fuga>0){const s0=FX.pj(cam,sz[0]+9,sz[1]+1.8,.05),paths=[[[sz[0]+9.3,sz[1]+1],[3,3],[7.5,6.5],[11,9.5],[qx-1.6,qy-1.3]],[[sz[0]+4,sz[1]+2],[-2,6.5],[4,10.5],[9,12.5],[qx-2,qy+.3]]];
      paths.forEach((pp,j)=>route(ctx,pp.map(([x,y])=>FX.pj(cam,x,y,.05)),clamp(o.fuga*1.2-j*.2),{col:K.gold,lw:5,dash:[16,12],glow:14}))}
    if(o.warm>0){const q=FX.pj(cam,qx,qy,1);const g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],520);g.addColorStop(0,`rgba(255,170,70,${.32*o.warm})`);g.addColorStop(1,'rgba(255,170,70,0)');ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over'}
    ctx.restore();
    const P3={casa:[L0.casa[0]+2.5,L0.casa[1]+1.6,4.6],capela:[L0.capela[0]+1,L0.capela[1]+1.5,5.4],moenda:[mx+1.3,my+1,3.5],caldeira:[L0.caldeira[0]+1.5,L0.caldeira[1]+1.3,3.4],purgar:[L0.purgar[0]+1.8,L0.purgar[1]+1.2,3.3],senzala:[sz[0]+4.5,sz[1]+.9,2.6],quilombo:[qx,qy,2.4],porto:[13,-11,.2],cana:[-10,-9,.3],mata:[14,9,2.5]};
    return {pt:k=>FX.pj(cam,...P3[k])}}

  function lathe(cam,prof,o={}){const n=o.n||28,c=o.c||[0,0,0],col=o.col||K.ochre,F=[],sp=o.spin||0;const P=(i,j)=>{const an=TAU*j/n+sp,[r,z]=prof[i];return [c[0]+r*Math.cos(an),c[1]+r*Math.sin(an),c[2]+z]};
    for(let i=0;i<prof.length-1;i++){const band=o.bands?o.bands(i,prof):null;for(let j=0;j<n;j++){const v=[P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)];const cc=band?(typeof band==='function'?band(j):band):col;
      F.push({cam,v,fill:FX.shade(v,cc,o.fa??1),stroke:o.edge??rgba(mix(cc,'#000000',.4),.35),lw:.8,a:o.a??1,bias:o.bias||0})}}return F}
  function table(cam,o={}){const w=o.w||8,d=o.d||5,h=o.h||3,col=o.col||'#6b4426',F=solid(cam,-w/2,-d/2,h-.35,w,d,.35,col);[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([u,v])=>F.push(...solid(cam,u*(w/2-.5)-.2,v*(d/2-.5)-.2,0,.4,.4,h-.35,mix(col,'#000000',.15))));return F}

  /* ---------- rotas ---------- */
  function route(ctx,pts,p,o={}){if(p<=0||pts.length<2)return;const seg=[];let L=0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(l);L+=l}
    let left=L*clamp(p);ctx.save();ctx.strokeStyle=o.col||K.gold;ctx.lineWidth=o.lw||4;ctx.lineCap='round';ctx.lineJoin='round';if(o.dash)ctx.setLineDash(o.dash);if(o.glow){ctx.shadowColor=o.col||K.gold;ctx.shadowBlur=o.glow}
    ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);let tip=pts[0],dir=[1,0];for(let i=1;i<pts.length&&left>0;i++){const l=seg[i-1],u=Math.min(1,left/l);tip=[lerp(pts[i-1][0],pts[i][0],u),lerp(pts[i-1][1],pts[i][1],u)];dir=[pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]];ctx.lineTo(tip[0],tip[1]);left-=l}
    ctx.stroke();ctx.setLineDash([]);if(o.head!==false&&p<1.2){const an=Math.atan2(dir[1],dir[0]),s=(o.lw||4)*3.2;ctx.fillStyle=o.col||K.gold;ctx.beginPath();ctx.moveTo(tip[0]+Math.cos(an)*s,tip[1]+Math.sin(an)*s);ctx.lineTo(tip[0]+Math.cos(an+2.5)*s,tip[1]+Math.sin(an+2.5)*s);ctx.lineTo(tip[0]+Math.cos(an-2.5)*s,tip[1]+Math.sin(an-2.5)*s);ctx.closePath();ctx.fill()}ctx.restore()}
  function arc(ctx,a,b,p,o={}){const lift=o.lift??.25,mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),cx=mx+dy/L*L*lift,cy=my-dx/L*L*lift;
    const pts=[];for(let k=0;k<=40;k++){const u=k/40;pts.push([(1-u)**2*a[0]+2*u*(1-u)*cx+u*u*b[0],(1-u)**2*a[1]+2*u*(1-u)*cy+u*u*b[1]])}route(ctx,pts,p,{col:o.col||K.gold,lw:o.lw||4,glow:o.glow??12,dash:o.dash})}

  /* ---------- créditos ---------- */
  function credits(ctx,blocks,u,o={}){const top=o.top??120,bot=o.bot??H-120;let tot=0;const lay=blocks.map(b=>{const h=b.h||(b.t==='title'?110:b.t==='head'?90:b.t==='gap'?60:b.t==='line'?50:46);const y=tot;tot+=h;return [b,y]});
    const off=lerp(bot,top-tot,u);ctx.save();ctx.beginPath();ctx.rect(0,top-60,W,bot-top+120);ctx.clip();
    for(const [b,y] of lay){const Y=off+y;if(Y<top-80||Y>bot+80)continue;const fa=clamp((Y-(top-60))/120)*clamp(((bot+60)-Y)/120);
      if(b.t==='title')txt(ctx,b.s,W/2,Y,{font:F.display,it:1,size:64,color:K.cream,align:'center',a:fa});
      else if(b.t==='head')txt(ctx,b.s,W/2,Y,{font:F.mono,size:24,color:K.gold,align:'center',ls:4,a:fa});
      else if(b.t==='line'){ctx.save();ctx.globalAlpha=fa*.6;ctx.strokeStyle=K.ochre;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W/2-260,Y-12);ctx.lineTo(W/2+260,Y-12);ctx.stroke();ctx.restore()}
      else if(b.t!=='gap')txt(ctx,b.s,W/2,Y,{font:b.it?F.display:F.sans,it:b.it,size:b.size||30,color:rgba(K.cream,.92),align:'center',a:fa})}ctx.restore();return tot}
  return {K,bg,paper,sepia,kb,plate,quill,write,chip,card,engenho,lathe,table,route,arc,credits,house,tree,palm,solid,mix,rgba};
})();
