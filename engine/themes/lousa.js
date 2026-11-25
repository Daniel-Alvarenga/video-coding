/* tema lousa: quadro verde-escuro com pó de giz, giz branco, amarelo e azul, sem brilho de neon */
useTheme({name:'lousa',glow:.22,
  C:{ink:'#1d2924',chalk:'#eeebe2',gold:'#f1c95a',cyan:'#93d3e3',dim:'rgba(238,235,226,.55)',faint:'rgba(238,235,226,.10)'},
  map:{'#f4b740':'#f1c95a','244,183,64':'241,201,90','#62d0ea':'#93d3e3','98,208,234':'147,211,227','#0a0d16':'#1d2924','10,13,22':'29,41,36','8,11,19':'29,41,36'},
  drawBg(b,W,H){const g=b.createRadialGradient(W/2,H/2,100,W/2,H/2,1150);g.addColorStop(0,'#24332d');g.addColorStop(1,'#141d19');b.fillStyle=g;b.fillRect(0,0,W,H);
    const r=rngTheme(3),img=b.getImageData(0,0,W,H),d=img.data;for(let i=0;i<d.length;i+=4){const n=(r()-.5)*10;d[i]+=n;d[i+1]+=n;d[i+2]+=n}b.putImageData(img,0,0);
    for(let k=0;k<18;k++){const x=r()*W,y=r()*H,w=200+r()*500,h=40+r()*120;b.save();b.translate(x,y);b.rotate((r()-.5)*.5);const s=b.createRadialGradient(0,0,0,0,0,w/2);s.addColorStop(0,`rgba(230,235,225,${.025+r()*.03})`);s.addColorStop(1,'rgba(230,235,225,0)');b.fillStyle=s;b.scale(1,h/w);b.beginPath();b.arc(0,0,w/2,0,TAU);b.fill();b.restore()}},
  css:':root{--ink:#141d19;--ink-2:#1d2924;--line:#2f3f38;--gold:#f1c95a;--cyan:#93d3e3}'});
