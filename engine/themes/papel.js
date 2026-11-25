/* tema papel: papel creme com grão e vinheta, traço de tinta, ocre e azul-petróleo, quase sem brilho */
useTheme({name:'papel',glow:.12,
  C:{ink:'#efe5cf',chalk:'#2b2620',gold:'#b8740c',cyan:'#1f6f80',dim:'rgba(43,38,32,.55)',faint:'rgba(43,38,32,.10)'},
  map:{'#ece6d6':'#2b2620','236,230,214':'43,38,32','#f4b740':'#b8740c','244,183,64':'184,116,12','#62d0ea':'#1f6f80','98,208,234':'31,111,128',
       '#0a0d16':'#efe5cf','10,13,22':'239,229,207','8,11,19':'239,229,207'},
  drawBg(b,W,H){b.fillStyle='#efe5cf';b.fillRect(0,0,W,H);
    const r=rngTheme(7),img=b.getImageData(0,0,W,H),d=img.data;
    for(let i=0;i<d.length;i+=4){const n=(r()-.5)*14;d[i]+=n;d[i+1]+=n;d[i+2]+=n*.9}b.putImageData(img,0,0);
    b.lineWidth=1;for(let k=0;k<420;k++){const x=r()*W,y=r()*H,l=20+r()*60,a=r()*TAU;b.strokeStyle=`rgba(120,95,60,${.03+r()*.04})`;b.beginPath();b.moveTo(x,y);b.quadraticCurveTo(x+Math.cos(a)*l/2+r()*8,y+Math.sin(a)*l/2+r()*8,x+Math.cos(a)*l,y+Math.sin(a)*l);b.stroke()}
    for(let k=0;k<26;k++){const x=r()*W,y=r()*H,s=80+r()*260,g=b.createRadialGradient(x,y,0,x,y,s);g.addColorStop(0,`rgba(150,115,70,${.025+r()*.03})`);g.addColorStop(1,'rgba(150,115,70,0)');b.fillStyle=g;b.fillRect(x-s,y-s,2*s,2*s)}
    const v=b.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*1.05);v.addColorStop(0,'rgba(90,60,25,0)');v.addColorStop(1,'rgba(90,60,25,.30)');b.fillStyle=v;b.fillRect(0,0,W,H)},
  css:':root{--ink:#efe5cf;--ink-2:#e6dbc2;--line:#cfc2a5;--chalk:#2b2620;--chalk-dim:#6b6255;--gold:#b8740c;--cyan:#1f6f80;color-scheme:light}'});
