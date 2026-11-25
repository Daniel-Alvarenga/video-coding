/* ---------- TRAFFIC3D: trânsito urbano em perspectiva 3D ----------
   Módulo reutilizável: carros com volumes, rodas, vidros e luz; estrada com
   textura, cidade em camadas e câmera que troca de intenção continuamente.
   Coordenadas: x = largura da rua, y = altura, z = profundidade (câmera em z positivo).
*/
const TRAFFIC3D=(()=>{
  const MODELS={hatch:{l:1.8,w:.9,h:.45,roof:.42},sedan:{l:2.05,w:1.0,h:.52,roof:.5},suv:{l:2.2,w:1.05,h:.68,roof:.58},van:{l:2.55,w:1.12,h:.8,roof:.7},taxi:{l:1.95,w:.96,h:.5,roof:.46},bus:{l:4.6,w:1.55,h:1.65,roof:1.35}};
  const PALETTE=['#e94f37','#2d9cdb','#f2c94c','#27ae60','#9b51e0','#f2994a','#eb5757','#56ccf2','#f7f7f2'];
  const hex=c=>{const n=parseInt(c.slice(1,7),16);return [n>>16&255,n>>8&255,n&255]};
  const shade=(c,k)=>{const [r,g,b]=hex(c);return `#${[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v*k))).toString(16).padStart(2,'0')).join('')}`};
  const box=(c,o)=>{const q=W3D.boxFaces(c,o);return q&&q.faces||[]};
  const drawBoxes=(ctx,c,F)=>{if(F.length)W3D.draw(ctx,F,c)};
  function road(ctx,c,o={}){
    const z0=o.z0??-90,z1=o.z1??16,half=o.half??8;
    /* A pista é uma superfície 2.5D estável; os carros continuam em 3D.
       Não usamos um polígono projetado infinito: perto da câmera ele pode
       atravessar o plano e virar uma parede colorida. */
    ctx.save();ctx.fillStyle='#202a36';ctx.beginPath();ctx.moveTo(W*.31,610);ctx.lineTo(W*.69,610);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();ctx.restore();
    const F=[];
    /* As bordas são linhas, não caixas: caixas longas projetam paredes no plano vertical. */
    ctx.save();ctx.strokeStyle='#d7a92e';ctx.lineWidth=4;for(const [x0,x1] of [[W*.31,0],[W*.69,W]]){ctx.beginPath();ctx.moveTo(x0,610);ctx.lineTo(x1,H);ctx.stroke()}ctx.restore();
    const lane=[-5.4,-1.8,1.8,5.4];
    ctx.save();ctx.strokeStyle='rgba(240,240,220,.7)';ctx.lineWidth=2;ctx.setLineDash([1.4,2.3]);
    for(const [x0,x1] of [[W*.42,W*.24],[W*.5,W*.5],[W*.58,W*.76]]){ctx.beginPath();ctx.moveTo(x0,610);ctx.lineTo(x1,H);ctx.stroke()}
    ctx.restore();
    /* textura do asfalto: linhas determinísticas e pequenas manchas, sempre em perspectiva */
    const R=FX.rng(71);ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle='#78818c';ctx.lineWidth=1;
    for(let i=0;i<90;i++){const z=z0+R()*(z1-z0),x=-half+R()*half*2,A=c.P([x,.045,z]),B=c.P([x+(R()-.5)*.35,.045,z+R()*1.8]);if(isFinite(A[0])&&isFinite(B[0])){ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}}
    ctx.restore();return lane;
  }
  function city(ctx,c,o={}){
    const R=FX.rng(o.seed??18),F=[];
    for(let side of [-1,1])for(let i=0;i<18;i++){
      const z=-96+i*4.4+R()*1.8,x=side*(28+R()*8),w=2.2+R()*3.2,h=2.5+R()*8,d=2.5+R()*2.2,col=['#263b55','#344b61','#55445e','#345c5a','#6b5547'][Math.floor(R()*5)];
      F.push(...box(c,{p0:[x-w/2,-.02,z],size:[w,h,d],color:col,edge:'#4d6474',deco:(g,f,cc)=>{if(f.face!==0)return;const n=Math.floor(h/.8);for(let k=0;k<n;k++){const q=cc.P([x-w*.25+((k%2)*w*.5),.5+k*.75,z+d+.01]);if(isFinite(q[0])){g.fillStyle=(k+i)%3?'#f2c94c':'#62d0ea';g.globalAlpha=.45;g.fillRect(q[0]-3,q[1]-3,6,6)}}}}));
    }
    drawBoxes(ctx,c,F);
    for(let side of [-1,1])for(let i=0;i<10;i++){const z=-92+i*6+R()*2,x=side*(25+R()*5),q=c.P([x,.02,z]),top=c.P([x,2.1+R()*1.2,z]);if(!isFinite(q[0])||!isFinite(top[0]))continue;const h=q[1]-top[1],r=Math.max(3,h*.12);ctx.save();ctx.fillStyle='#6a9e57';ctx.beginPath();ctx.arc(q[0],top[1]+h*.28,r,0,TAU);ctx.fill();ctx.fillStyle='#8b5a3c';ctx.fillRect(q[0]-r*.12,top[1]+h*.28,r*.24,h*.72);ctx.restore()}
  }
  function car(ctx,c,s,o={}){
    const m=MODELS[o.model||s.model||'sedan'],col=o.col||s.col||PALETTE[s.seed%PALETTE.length],x=s.x??0,z=s.z??0,y=.05,rot=s.rot||0,F=[];
    const body={p0:[x-m.w/2,y,z-m.l/2],size:[m.w,m.h,m.l],rot,color:col,edge:shade(col,1.35),deco:(g,f,cc)=>{if(f.face!==0)return;const A=cc.P([x-m.w*.34,y+m.h*.55,z+m.l*.5+.01]),B=cc.P([x+m.w*.34,y+m.h*.55,z+m.l*.5+.01]);if(isFinite(A[0])&&isFinite(B[0])){g.strokeStyle='#d9f3ff';g.globalAlpha=.8;g.lineWidth=2;g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.stroke()}}};F.push(...box(c,body));
    const roofH=m.roof,roofW=m.w*.78,roofL=m.l*(m.model==='bus'?.58:.52);F.push(...box(c,{p0:[x-roofW/2,y+m.h,z-roofL/2],size:[roofW,roofH,roofL],rot,color:shade(col,.72),edge:'#d6e6ef'}));
    const glass=shade('#9bd7e8',.62);F.push(...box(c,{p0:[x-roofW*.42,y+m.h+.08,z-roofL*.46],size:[roofW*.84,.035,roofL*.88],rot,color:glass,edge:'#b8f1ff'}));
    for(const sx of [-1,1])for(const zz of [-1,1]){const p=[x+sx*(m.w/2+.02),y+.16,z+zz*(m.l*.29)];const q=c.P(p);if(isFinite(q[0])){ctx.save();ctx.fillStyle='#090b10';ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.beginPath();ctx.ellipse(q[0],q[1],Math.max(5,m.w*2.8),Math.max(8,m.l*1.8),0,0,TAU);ctx.fill();ctx.fillStyle='#dce8ef';ctx.globalAlpha=.65;ctx.beginPath();ctx.ellipse(q[0],q[1],Math.max(1,m.w*.7),Math.max(2,m.l*.55),0,0,TAU);ctx.fill();ctx.restore()}}
    drawBoxes(ctx,c,F);
    /* detalhes de leitura imediata: para-brisa, janelas laterais, faróis e rodas acima da carroceria */
    const quad=(pts,fill,stroke)=>{const Q=pts.map(c.P);if(Q.some(p=>!isFinite(p[0])))return;ctx.save();ctx.fillStyle=fill;ctx.strokeStyle=stroke||fill;ctx.lineWidth=2;ctx.beginPath();Q.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()};
    quad([[x-roofW*.38,y+m.h+.12,z+roofL*.5+.015],[x+roofW*.38,y+m.h+.12,z+roofL*.5+.015],[x+roofW*.3,y+m.h+roofH*.72,z+roofL*.35],[x-roofW*.3,y+m.h+roofH*.72,z+roofL*.35]],'rgba(20,45,62,.88)','#b8f1ff');
    quad([[x+m.w/2+.015,y+m.h*.48,z-roofL*.32],[x+m.w/2+.015,y+m.h*.48,z+roofL*.32],[x+m.w/2+.015,y+m.h*.9,z+roofL*.24],[x+m.w/2+.015,y+m.h*.9,z-roofL*.24]],'rgba(20,45,62,.72)','#8bd8ea');
    for(const zz of [-1,1]){const p=c.P([x,y+.28,z+zz*(m.l*.5+.025)]);if(isFinite(p[0])){ctx.save();ctx.fillStyle=zz>0?'#fff3a6':'#e94f37';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p[0],p[1],Math.max(2,m.w*1.8),0,TAU);ctx.fill();ctx.restore()}}
    return {x,z,col,model:o.model||s.model};
  }
  function fleet(ctx,c,states,o={}){const ordered=states.slice().sort((a,b)=>b.z-a.z);for(const s of ordered)car(ctx,c,s,{model:s.model,col:s.col})}
  function cam(t,o={}){const mode=Math.floor(t/1.55)%6,phase=(t%1.55)/1.55;const base=o.target||[0,.4,-10];const defs=[
    {dist:16,yaw:0,pitch:.25,target:[0,.5,-20]},
    {dist:13,yaw:.22,pitch:.16,target:[0,.45,-22]},
    {dist:15,yaw:-.32,pitch:.3,target:[0,.7,-24]},
    {dist:22,yaw:.08,pitch:.8,target:[0,0,-28]},
    {dist:12,yaw:.38,pitch:.2,target:[0,.55,-23]},
    {dist:15,yaw:-.38,pitch:.26,target:[0,.45,-24]}
  ];const a=defs[mode],b=defs[(mode+1)%defs.length],u=phase*phase*(3-2*phase);return W3D.cam({target:[lerp(a.target[0],b.target[0],u),lerp(a.target[1],b.target[1],u),lerp(a.target[2],b.target[2],u)],dist:lerp(a.dist,b.dist,u),yaw:lerp(a.yaw,b.yaw,u),pitch:lerp(a.pitch,b.pitch,u),fov:.82,cy:920});
  }
  function label(ctx,c,s,o={}){const q=c.P([s.x,o.y??2.4,s.z]);if(!isFinite(q[0])||q[0]<70||q[0]>W-70||q[1]<100||q[1]>H-420)return;txt(ctx,o.text||s.model.toUpperCase(),q[0],q[1],{font:F.mono,size:o.size??24,color:o.color||C.gold,a:o.a??1,align:'center'})}
  return {MODELS,PALETTE,road,city,car,fleet,cam,label};
})();
