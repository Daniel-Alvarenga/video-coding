"""Thumbnail a partir de um quadro do próprio vídeo + título grande por cima.
THUMB_SIZE=180 (variável de ambiente) aumenta o título (útil no horizontal).
usage: python thumb.py PROJECT TEMPO "linha 1 / linha [g|destaque]" [saida.png] [y_do_texto] [lang=pt]
  [g|...] = dourado, [c|...] = ciano. O texto fica numa faixa escurecida; no vertical, por padrão na parte de baixo (y=1480),
  no horizontal, embaixo também (y=860). Usa as mesmas fontes e tema do vídeo."""
import base64, sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent)); from fonts import css, LOADFONTS
P = Path(sys.argv[1]).resolve(); T = float(sys.argv[2]); LINES = [x.strip() for x in sys.argv[3].split(' / ')]
OUT = Path(sys.argv[4]) if len(sys.argv) > 4 else P/'thumb.png'
LANG = sys.argv[6] if len(sys.argv) > 6 else 'pt'
JS = r"""([T,lines,Y,SZ])=>{__film.frame(T,true);const cv=document.getElementById('cv'),c=cv.getContext('2d'),W=cv.width,H=cv.height,V=H>W;
  c.setTransform(1,0,0,1,0,0);let size=SZ||(V?118:104);const fit=ln=>{c.font=`italic 400 ${size}px Newsreader`;return c.measureText(ln.replace(/\[\w\|([^\]]*)\]/g,'$1')).width};while(lines.some(l=>fit(l)>W*.88)&&size>40)size-=4;const lh=size*1.12,y0=(Y??(V?1480:860))-lh*(lines.length-1)/2;
  const g=c.createLinearGradient(0,y0-size*1.6,0,y0+lh*lines.length+size*.6);g.addColorStop(0,'rgba(7,9,15,0)');g.addColorStop(.25,'rgba(7,9,15,.82)');g.addColorStop(.8,'rgba(7,9,15,.82)');g.addColorStop(1,'rgba(7,9,15,0)');
  c.fillStyle=g;c.fillRect(0,y0-size*1.6,W,lh*lines.length+size*2.2);
  const COLS={g:'#f4b740',c:'#62d0ea'};
  lines.forEach((ln,i)=>{const parts=[];ln.replace(/\[(\w)\|([^\]]*)\]|([^\[]+)/g,(m,k,s,p)=>{parts.push(p!=null?[p,'#ece6d6',false]:[s,COLS[k]||'#ece6d6',true]);return m});
    const fnt=it=>`${it?'italic ':''}400 ${size}px Newsreader`;let w=0;parts.forEach(p=>{c.font=fnt(p[2]);w+=c.measureText(p[0]).width});let x=W/2-w/2;const y=y0+i*lh;
    parts.forEach(([s,col,it])=>{c.font=fnt(it);c.fillStyle=col;c.shadowColor=col;c.shadowBlur=size*.18;c.textBaseline='middle';c.fillText(s,x,y);c.shadowBlur=0;c.fillText(s,x,y);x+=c.measureText(s).width})});
  return cv.toDataURL('image/png')}"""
Y = float(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] != '-' else None
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--allow-file-access-from-files']); pg = b.new_page()
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.goto((P/'page.html').as_uri()); pg.add_style_tag(content=css)
    pg.evaluate(LOADFONTS); pg.evaluate('window.__assetsReady||null'); pg.evaluate(f"__film.setLang('{LANG}')")
    d = pg.evaluate(JS, [T, LINES, Y, int(__import__('os').environ.get('THUMB_SIZE', 0)) or None]); b.close()
OUT.write_bytes(base64.b64decode(d.split(',', 1)[1])); print(OUT)
