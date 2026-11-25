/* ---------- STUDIO: ferramentas de "bastidores" (sempre injetado) ----------
   STUDIO.layers(ctx,[{draw:g=>…,label,code}],{spread:0..1,gap:px,yaw,pitch,cx,cy,a,frame})  quadro separado em camadas 3D
   STUDIO.code(ctx,linhas,x,y,t0,t,{size,lh,dt,title,w})  painel de código com destaque de sintaxe, linha a linha
   STUDIO.wave(ctx,env,x,y,w,h,{color,a,prog})  forma de onda a partir de um envelope (0..1)
   STUDIO.wires(ctx,deS,paraS,x,y,size,p,{color,a})  fios ligando cada glifo de uma fórmula à sua posição no passo seguinte */
const STUDIO=(()=>{
  const bufs=[];const buf=i=>{if(!bufs[i]){const c=document.createElement('canvas');c.width=W;c.height=H;bufs[i]=c}return bufs[i]};
  function layers(ctx,Ls,o){const n=Ls.length,s=o.spread??0,th=(o.tilt??1.05)*s,cam={yaw:o.yaw??-.38*s,pitch:0,scale:o.scale??1,cx:o.cx??W/2,cy:o.cy??H/2,dist:o.dist??3200},out=[];
    /* camadas giram de "de frente" (s=0) para "deitadas" (s=1) e se empilham na vertical, como uma vista explodida */
    const Pw=(x,yc,off)=>FX.pj(cam,x,-yc*Math.sin(th),yc*Math.cos(th)+off);
    Ls.forEach((ly,i)=>{const c=buf(i),g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);const keep=window.__boxes;window.__boxes=null;ly.draw(g);window.__boxes=keep;
      const off=(i-(n-1)/2)*(o.gap??260)*s,P0=Pw(-W/2,H/2,off),P1=Pw(W/2,H/2,off),P2=Pw(-W/2,-H/2,off),P3=Pw(W/2,-H/2,off);out.push({c,P0,P1,P2,P3,ly,i,off})});
    const m=ctx.getTransform();
    [...out].sort((a,b)=>a.off-b.off).forEach(r=>{const {P0,P1,P2}=r;ctx.save();
      ctx.setTransform(m.multiply(new DOMMatrix([(P1[0]-P0[0])/W,(P1[1]-P0[1])/W,(P2[0]-P0[0])/H,(P2[1]-P0[1])/H,P0[0],P0[1]])));ctx.globalAlpha*=(o.a??1)*(r.ly.a??1);ctx.drawImage(r.c,0,0);
      if(s>.02&&o.frame!==false){ctx.globalAlpha=Math.min(1,s*1.4)*(o.a??1);ctx.strokeStyle=r.ly.color||'rgba(236,230,214,.55)';ctx.lineWidth=4;ctx.strokeRect(0,0,W,H)}ctx.restore()});
    return out}
  const KW=/\b(const|let|function|return|for|if|else|import|from|def|print|in|new)\b/;
  function tok(line){const out=[];let rest=line;const re=/(#.*$|\/\/.*$|\/\*.*?\*\/)|('[^']*'|"[^"]*")|(\b\d[\d.,e\-]*\b)|(\b[a-zA-Z_][\w.]*\b)|(\s+)|(.)/g;let m;
    while((m=re.exec(line))){if(m[1])out.push([m[1],C.dim]);else if(m[2])out.push([m[2],C.cyan]);else if(m[3])out.push([m[3],C.cyan]);else if(m[4])out.push([m[4],KW.test(m[4])?C.gold:C.chalk]);else out.push([m[0],C.chalk])}return out}
  function code(ctx,lines,x,y,t0,t,o={}){const size=o.size||30,lh=o.lh||size*1.45,dt=o.dt??.35,w=o.w||820,h=lines.length*lh+(o.title?70:40),a=o.a??ramp(t,t0-.4,t0);if(a<=0)return;
    ctx.save();ctx.globalAlpha*=a;ctx.fillStyle='rgba(8,11,19,.88)';ctx.strokeStyle='rgba(236,230,214,.25)';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fill();ctx.stroke();ctx.restore();
    if(o.title)txt(ctx,o.title,x+24,y+38,{font:F.mono,size:20,ls:4,color:C.dim,a,align:'left'});
    lines.forEach((ln,i)=>{const at=t0+i*dt,la=ramp(t,at,at+.3)*a;if(la<=0)return;if(o.key&&t>=at)logEv(o.key+':'+i,'tick',1);let cx=x+28;const yy=y+(o.title?70:40)+i*lh+size*.35;
      ctx.save();ctx.font=`400 ${size}px ${F.mono}`;for(const [s,c] of tok(ln)){const wd=ctx.measureText(s).width;if(s.trim())txt(ctx,s,cx,yy,{font:F.mono,size,color:c,a:la,align:'left'});cx+=wd}ctx.restore()});
    return {w,h}}
  function wave(ctx,env,x,y,w,h,o={}){const n=env.length,p=o.prog??1;ctx.save();ctx.globalAlpha*=o.a??1;ctx.fillStyle=o.color||C.cyan;ctx.shadowColor=o.color||C.cyan;ctx.shadowBlur=6;
    for(let i=0;i<n*p;i++){const v=Math.max(.04,env[i]),bw=w/n;ctx.fillRect(x+i*bw,y-v*h/2,Math.max(1,bw*.7),v*h)}ctx.restore()}
  function wires(ctx,sA,sB,x,y,size,p,o={}){const A=lay(ctx,sA,x,y,size),B=lay(ctx,sB,x,y,size),{ma}=lcs(A,B);ctx.save();ctx.globalAlpha*=o.a??1;ctx.strokeStyle=o.color||C.cyan;ctx.lineWidth=1.6;ctx.setLineDash([5,6]);
    A.forEach((g,i)=>{const j=ma[i];if(j<0)return;const h=B[j],x0=g.x+g.w/2,y0=g.y-g.fs*.3,x1=h.x+h.w/2,y1=h.y-h.fs*.3;if(Math.hypot(x1-x0,y1-y0)<3)return;const mx=(x0+x1)/2,my=Math.min(y0,y1)-60;
      ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(mx,my,lerp(x0,x1,p),lerp(y0,y1,p)-(1-Math.abs(1-2*p))*0);ctx.stroke()});ctx.restore()}
  return {layers,code,wave,wires};
})();
