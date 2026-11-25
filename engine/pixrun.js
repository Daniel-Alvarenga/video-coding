/* ---------- PIX: corredor em pixel art 2D com paralaxe (v3.19, 2026-11-08) — exemplo projetos/dino-terra-lua/ ----------
   Desenha numa tela pequena (ex.: 270×240) e amplia sem suavizar: pixel de verdade. meta.json "pixrun": true.
   PIX.low(w,h,key)                 canvas pequeno reaproveitado (um por key)
   PIX.blit(ctx,low,x,y,W,H)        amplia sem suavizar
   PIX.sprite(g,rows,x,y,pal,{outline,flip})  sprite por linhas de texto ('.' = vazio); outline = cor do contorno de 1 px
   PIX.layer(g,{u,P,base,amp,harm,top,bot,edge,y1,step,w})  camada de paralaxe: perfil periódico (período P em px do mundo,
                                    deslocamento u = fator × distância percorrida), topo com aresta clara 'edge', preenchida até y1
   PIX.dither(g,x,y,w,h,c1,c2)       gradiente em faixas com pontilhado (céu pixel)
   PIX.DINO.run[0|1], PIX.DINO.jump  dinossauro próprio (T-rex de pé, 20×19, espinhos dourados), PIX.CACTO (7×9)
   PIX.helmet(g,cx,cy,r)             capacete de astronauta pixel (casco branco atrás, visor de vidro na frente) */
const PIX=(()=>{
const LOW={};function low(w,h,k='a'){let c=LOW[k];if(!c||c.width!==w||c.height!==h){c=document.createElement('canvas');c.width=w;c.height=h;LOW[k]=c}const g=c.getContext('2d');g.imageSmoothingEnabled=false;return c}
function blit(ctx,c,x,y,w,h){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(c,x,y,w,h);ctx.restore()}
function sprite(g,rows,x,y,pal,o={}){const h=rows.length,w=rows[0].length,X=Math.round(x),Y=Math.round(y),at=(r,k)=>o.flip?rows[r][w-1-k]:rows[r][k];
  if(o.outline){g.fillStyle=o.outline;for(let r=0;r<h;r++)for(let k=0;k<w;k++)if(at(r,k)!=='.')g.fillRect(X+k-1,Y+r-1,3,3)}
  for(let r=0;r<h;r++)for(let k=0;k<w;k++){const ch=at(r,k);if(ch==='.')continue;g.fillStyle=pal[ch]||'#f0f';g.fillRect(X+k,Y+r,1,1)}}
function layer(g,o){const W=g.canvas.width,P=o.P,st=o.step||1;g.fillStyle=o.top;
  for(let x=0;x<W;x+=st){const s=((x+o.u)%P+P)%P,a=TAU*s/P;let y=o.base;for(const [k,amp,ph] of o.harm)y-=amp*Math.sin(k*a+ph);y=Math.round(y);
    g.fillStyle=o.top;g.fillRect(x,y,st,o.y1-y);if(o.bot){g.fillStyle=o.bot;g.fillRect(x,y+Math.round((o.y1-y)*.5),st,o.y1-y)}if(o.edge){g.fillStyle=o.edge;g.fillRect(x,y,st,1)}}}
function dither(g,x,y,w,h,cols){const n=cols.length-1;for(let j=0;j<h;j++){const f=j/h*n,i=Math.floor(f),fr=f-i;for(let k=0;k<w;k++){const use=((k+j)%2===0&&fr>.5)||((k%2===0&&j%2===0)&&fr>.25)?cols[Math.min(n,i+1)]:cols[i];g.fillStyle=use;g.fillRect(x+k,y+j,1,1)}}}
const BODY=[
"..........GGGGGGG...",
".........GGGGGGGGG..",
".........GGWKGGGGGG.",
".........GGGGGGGGGG.",
".........GGGGGWWWWW.",
".........GGGGGGG....",
"...Y....YDGGGG......",
"..YGY..YGGGGGG......",
".YGGGYYGGGGGGGGG....",
"GGGGGGGGGBBBGG.GW...",
"GGGGGGGGBBBBBG......",
"G...GGGGBBBBBG......",
".....GGGBBBBG.......",
".....GGGGGGGG......."];
const L0=["......GGG.GGG.......","......GG...GG.......","......GG...GG.......",".....WGG...GGW......"];
const L1=["......GGG.GGG.......","......GG...GGG......","......GG....WW......",".....WGG............"];
const L2=["......GGG.GGG.......",".....GGG....GG......",".....WW.....GG......","...........WGG......"];
const DINO={run:[BODY.concat(L1),BODY.concat(L2)],jump:BODY.concat(L0),w:20,h:18};
const CACTO=["..GG...","..GG..G","G.GG..G","G.GDGGG","GGGD...","..GD...","..GD...","..GD..."];
function helmet(g,cx,cy,r,o={}){const W2=o.shell||'#f4f6f8',S2=o.shade||'#b9c2cc',V=o.visor||'rgba(150,215,255,.45)',E=o.edge||'#39424d';
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const d=Math.hypot(x,y);if(d>r+.4)continue;const ring=d>r-1.3,back=x<-r*.25||y<-r*.55;
    g.fillStyle=ring?E:back?(y>r*.3?S2:W2):V;if(!ring&&!back&&(x+y)%5===0&&x>0&&y<0)g.fillStyle='rgba(255,255,255,.75)';g.fillRect(Math.round(cx+x),Math.round(cy+y),1,1)}}
return {low,blit,sprite,layer,dither,DINO,CACTO,helmet}})();
