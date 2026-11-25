/* ---------- SPACE: céu, Sol, planetas e órbitas (sempre injetado) ----------
   SPACE.P  dados dos 8 planetas (a em UA, período em anos, cor, raio de desenho, nomes PT/EN)
   SPACE.stars(ctx,t,{n,seed,a})  céu estrelado com cintilação lenta (cacheado)
   SPACE.sun(ctx,x,y,r,t)  Sol com brilho      SPACE.planet(ctx,x,y,r,cor,{glow,ring,a})
   SPACE.pos(k,anos,{scale,cx,cy,map})  posição na tela (órbita circular, fase inicial fixa)
   SPACE.orbit(ctx,raioPx,{cx,cy,color,a,dash})  SPACE.au2km = 149.6 (milhões de km por UA) */
const SPACE=(()=>{
  const P=[{k:'mercurio',a:.387,c:'#a8a39a',r:6,n:['Mercúrio','Mercury']},{k:'venus',a:.723,c:'#e9cf8f',r:10,n:['Vênus','Venus']},{k:'terra',a:1,c:'#62d0ea',r:10,n:['Terra','Earth']},
    {k:'marte',a:1.524,c:'#c98a52',r:8,n:['Marte','Mars']},{k:'jupiter',a:5.203,c:'#d8b98a',r:20,n:['Júpiter','Jupiter']},{k:'saturno',a:9.537,c:'#e3cf9a',r:17,n:['Saturno','Saturn'],ring:true},
    {k:'urano',a:19.19,c:'#9fd6dd',r:13,n:['Urano','Uranus']},{k:'netuno',a:30.07,c:'#6f9fd8',r:13,n:['Netuno','Neptune']}];
  P.forEach((p,i)=>{p.T=Math.pow(p.a,1.5);p.ph=i*1.1});
  const get=k=>typeof k==='number'?P[k]:P.find(p=>p.k===k);
  const pos=(k,yr,o={})=>{const p=get(k),sc=o.scale||300,r=(o.map?o.map(p.a):p.a)*sc,th=TAU*yr/p.T+p.ph;return [(o.cx??W/2)+Math.cos(th)*r,(o.cy??H/2)-Math.sin(th)*r]};
  const auPos=(k,yr)=>{const p=get(k),th=TAU*yr/p.T+p.ph;return [Math.cos(th)*p.a,Math.sin(th)*p.a]};
  const dist=(a,b,yr)=>{const p=auPos(a,yr),q=auPos(b,yr);return Math.hypot(p[0]-q[0],p[1]-q[1])};
  let sky=null;function stars(ctx,t,o={}){if(!sky){sky=[];const R=FX.rng(o.seed||11);for(let i=0;i<(o.n||420);i++)sky.push([R()*W,R()*H,R()*1.4+.3,R()*TAU,.2+R()*.6])}
    ctx.save();ctx.globalAlpha*=o.a??1;for(const [x,y,r,ph,b] of sky){ctx.globalAlpha=(o.a??1)*b*(.75+.25*Math.sin(t*.8+ph));ctx.fillStyle=C.chalk;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()}ctx.restore()}
  function sun(ctx,x,y,r,t=0){ctx.save();const g=ctx.createRadialGradient(x,y,r*.2,x,y,r*4);g.addColorStop(0,'rgba(255,230,160,.9)');g.addColorStop(.25,'rgba(244,183,64,.35)');g.addColorStop(1,'rgba(244,183,64,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*4*(1+.02*Math.sin(t*1.3)),0,TAU);ctx.fill();ctx.fillStyle='#ffe7a8';ctx.shadowColor=C.gold;ctx.shadowBlur=30;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore()}
  function planet(ctx,x,y,r,col,o={}){if((o.a??1)<=0)return;ctx.save();ctx.globalAlpha*=o.a??1;if(o.ring){ctx.strokeStyle=FX.rgba(col,.7);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,r*2,r*.6,-.3,0,TAU);ctx.stroke()}
    const g=ctx.createRadialGradient(x-r*.35,y-r*.35,r*.1,x,y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.25,col);g.addColorStop(1,FX.rgba(col,.55));ctx.fillStyle=g;ctx.shadowColor=col;ctx.shadowBlur=o.glow??14;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore()}
  function orbit(ctx,R,o={}){ctx.save();ctx.globalAlpha*=o.a??1;ctx.strokeStyle=o.color||'rgba(236,230,214,.22)';ctx.lineWidth=o.lw||1.5;if(o.dash)ctx.setLineDash(o.dash);ctx.beginPath();ctx.arc(o.cx??W/2,o.cy??H/2,R,0,TAU);ctx.stroke();ctx.restore()}
  return {P,get,pos,auPos,dist,stars,sun,planet,orbit,au2km:149.6};
})();
