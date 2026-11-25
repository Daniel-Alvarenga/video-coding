/* ---------- glyph layout + algebraic morphs ---------- */
window.__ev=window.__ev||[];const __seen=new Set();
function logEv(key,kind,val){if(window.__T==null||__seen.has(key))return;__seen.add(key);window.__ev.push([window.__T,kind,val||0])}
/* <id|...> gives glyphs an explicit identity for matching */
function layoutEq(ctx,str,x,y,size,align){
  const toks=[];let i=0,color=null,hl=false,id=null,stack=[],buf='';
  const push=(s,kind)=>{if(!s)return;toks.push({s,kind,color,hl,id})};
  while(i<str.length){const ch=str[i];
    if(ch==='{'&&str[i+1]==='{'){push(buf,'n');buf='';const j=str.indexOf('}}',i);const [op,top,bot]=str.slice(i+2,j).split('|');toks.push({s:op,kind:'op',top,bot,color,hl,id});i=j+2;continue}
    if((ch==='^'||ch==='_')&&str[i+1]==='{'){push(buf,'n');buf='';const j=str.indexOf('}',i);push(str.slice(i+2,j),ch==='^'?'sup':'sub');i=j+1;continue}
    if(ch==='['&&str[i+2]==='|'){push(buf,'n');buf='';stack.push([color,hl,id]);const k=str[i+1];if(k==='h')hl=true;else color=COL[k];i+=3;continue}
    if(ch==='<'){const j=str.indexOf('|',i);push(buf,'n');buf='';stack.push([color,hl,id]);id=str.slice(i+1,j);i=j+1;continue}
    if((ch===']'||ch==='>')&&stack.length){push(buf,'n');buf='';[color,hl,id]=stack.pop();i++;continue}
    buf+=ch;i++}
  push(buf,'n');
  const fontOf=(kind,fs)=>kind==='op'?`400 ${fs*1.25}px ${F.display}`:`italic 400 ${fs}px ${F.display}`;
  const G=[];ctx.save();
  for(const t of toks){
    if(t.kind==='op'){ctx.font=fontOf('op',size);let w=ctx.measureText(t.s).width+size*.18;ctx.font=`italic 400 ${size*.4}px ${F.display}`;w=Math.max(w,ctx.measureText(t.top||'').width+8,ctx.measureText(t.bot||'').width+8);
      G.push({s:t.s,kind:'op',top:t.top,bot:t.bot,fs:size,w,color:t.color,hl:t.hl,key:t.id?'#'+t.id+t.s:t.s});continue}
    const fs=t.kind==='n'?size:size*.58;ctx.font=fontOf(t.kind,fs);
    let prev=0;const chars=[...t.s];let idn=0;
    chars.forEach((c,k)=>{const wpre=ctx.measureText(chars.slice(0,k+1).join('')).width;
      G.push({s:c,kind:t.kind,fs,dx:prev,w:wpre-prev,color:t.color,hl:t.hl,key:(t.id?'#'+t.id+':'+(idn++)+':':'')+c,tok:t});prev=wpre});
  }
  ctx.restore();
  // positions
  let cx=0;let curTok=null,tokX=0;
  for(const g of G){if(g.kind==='op'){g.x=cx;cx+=g.w;curTok=null;continue}
    if(g.tok!==curTok){curTok=g.tok;tokX=cx}g.x=tokX+g.dx;cx=Math.max(cx,g.x+g.w)}
  const w=cx,off=align==='left'?x:x-w/2;
  for(const g of G){g.x+=off;g.y=y+(g.kind==='sup'?-size*.42:g.kind==='sub'?size*.2:0);g.base=y;g.size=size}
  G.w=w;G.x0=off;return G;
}
const _lay=new Map();
function lay(ctx,str,x,y,size,align){const k=str+'|'+x+'|'+y+'|'+size+'|'+align+'|'+LANG;if(!_lay.has(k))_lay.set(k,layoutEq(ctx,str,x,y,size,align));return _lay.get(k)}
function drawGlyph(ctx,g,x,y,fs,alpha,color,glow){
  if(alpha<=0.003)return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;
  if(glow){ctx.shadowColor=color;ctx.shadowBlur=glow}
  if(g.kind==='op'){const cxo=x+g.w/2;ctx.font=`400 ${fs*1.25}px ${F.display}`;ctx.textAlign='center';ctx.fillText(g.s,cxo,y+fs*.12);
    ctx.font=`italic 400 ${fs*.4}px ${F.display}`;
    if(g.s==='∫'){if(g.top)ctx.fillText(g.top,cxo+fs*.3,y-fs*.9);if(g.bot)ctx.fillText(g.bot,cxo-fs*.26,y+fs*.66)}else{if(g.top)ctx.fillText(g.top,cxo,y-fs*.9);if(g.bot)ctx.fillText(g.bot,cxo,y+fs*.56)}}
  else{ctx.font=`italic 400 ${fs}px ${F.display}`;ctx.textAlign='left';ctx.fillText(g.s,x,y)}
  ctx.restore();
}
function hlRuns(G){const runs=[];let cur=null;for(const g of G){if(g.hl){if(!cur){cur={x0:g.x,x1:g.x+g.w,y:g.base,s:g.size};runs.push(cur)}cur.x1=g.x+g.w}else cur=null}return runs}
function drawHl(ctx,G,a){if(a<=0)return;ctx.save();ctx.globalAlpha=a;ctx.fillStyle='rgba(244,183,64,.15)';ctx.strokeStyle='rgba(244,183,64,.75)';ctx.lineWidth=2;
  for(const r of hlRuns(G)){const x0=r.x0-8,x1=r.x1+8;ctx.beginPath();ctx.roundRect(x0,r.y-r.s*.84,x1-x0,r.s*1.1,10);ctx.fill();ctx.stroke()}ctx.restore()}
function lcs(A,B){const n=A.length,m=B.length,D=Array.from({length:n+1},()=>new Int16Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)D[i][j]=A[i].key===B[j].key?D[i+1][j+1]+1:Math.max(D[i+1][j],D[i][j+1]);
  const ma=new Int16Array(n).fill(-1),mb=new Int16Array(m).fill(-1);let i=0,j=0;
  while(i<n&&j<m){if(A[i].key===B[j].key){ma[i]=j;mb[j]=i;i++;j++}else if(D[i+1][j]>=D[i][j+1])i++;else j++}
  return {ma,mb};
}
const _lcs=new Map();
/* static glyphs appearing with a quick left-to-right cascade */
function eqIn(ctx,str,x,y,size,el,o={}){
  const G=lay(ctx,str,x,y,size,o.align);const a=o.a??1,n=G.length,span=Math.min(.7,n*.03);
  if(el<1.2&&o.key)logEv(o.key,'in',n);
  G.forEach((g,i)=>{const v=easeOut(clamp((el-i/n*span)/.28));drawGlyph(ctx,g,g.x,g.y+(1-v)*size*.25,g.fs,a*v,g.color||o.color||C.chalk,0)});
  drawHl(ctx,G,a*clamp((el-span-.2)/.3)*(o.hl??1));return G;
}
/* a derivation: steps=[{at,s,x?,y?,size?}], morphing glyphs between consecutive steps */
function deriv(ctx,steps,t,o={}){
  const D=o.dur??1.0,a=o.a??1;
  let k=-1;for(let i=0;i<steps.length;i++)if(t>=steps[i].at)k=i;if(k<0)return null;
  const S=i=>{const s=steps[i];return lay(ctx,s.s,s.x??o.x,s.y??o.y,s.size??o.size,s.align??o.align)};
  const B=S(k);const p=ease(clamp((t-steps[k].at)/D));
  if(k===0){if(o.key)logEv(o.key+':0','in',B.length);
    const el=t-steps[0].at,n=B.length,span=Math.min(.7,n*.03);
    B.forEach((g,i)=>{const v=easeOut(clamp((el-i/n*span)/.28));drawGlyph(ctx,g,g.x,g.y+(1-v)*g.size*.25,g.fs,a*v,g.color||C.chalk,0)});
    drawHl(ctx,B,a*clamp((el-span-.2)/.3));return B}
  const A=S(k-1);
  if(p>=1){B.forEach(g=>drawGlyph(ctx,g,g.x,g.y,g.fs,a,g.color||C.chalk,0));drawHl(ctx,B,a*clamp((t-steps[k].at-D)/.3));return B}
  if(o.key)logEv(o.key+':'+k,'morph',0);
  const ck=steps[k-1].s+'⟶'+steps[k].s+(steps[k-1].x??'')+(steps[k].x??'');if(!_lcs.has(ck))_lcs.set(ck,lcs(A,B));const {ma,mb}=_lcs.get(ck);
  drawHl(ctx,A,a*(1-clamp(p*3)));
  A.forEach((g,i)=>{if(ma[i]>=0)return;const f=clamp(p/.45);drawGlyph(ctx,g,g.x,g.y-f*g.size*.35,g.fs*(1-.25*f),a*(1-f),g.color||C.chalk,0)});
  let nu=0;B.forEach(g=>{if(mb[B.indexOf(g)]<0)nu++});let ni=0;
  B.forEach((g,j)=>{const i=mb[j];
    if(i>=0){const s=A[i];const dist=Math.hypot(g.x-s.x,g.y-s.y);const arc=Math.sin(Math.PI*p)*Math.min(dist*.18,s.size*.6);
      const col=p<.5?(s.color||C.chalk):(g.color||C.chalk);const moving=dist>2;
      drawGlyph(ctx,g,lerp(s.x,g.x,p),lerp(s.y,g.y,p)-arc,lerp(s.fs,g.fs,p),a,col,moving?Math.sin(Math.PI*p)*14:0)}
    else{const d=(ni++/Math.max(1,nu))*.25;const f=easeOut(clamp((p-.35-d)/.45));drawGlyph(ctx,g,g.x,g.y+(1-f)*g.size*.35,g.fs,a*f,g.color||C.chalk,f<1?10:0)}});
  return B;
}
function popLog(key,i,every=1){if(i%every===0)logEv(key+':'+i,'pop',i)}
