"""quadros.py PROJECT OUTDIR [passo=1] [extras=34.3,35.6,...]: quadros do início ao fim a cada passo s (mais os extras e o último), grava q_NNN_X,XXs.jpg e 00_folha.jpg com o tempo em cada quadro. Não renderiza vídeo."""
import base64, sys, json
from pathlib import Path
KIT = Path(__file__).resolve().parent; sys.path.insert(0, str(KIT))
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
from fonts import css, LOADFONTS
P = Path(sys.argv[1]).resolve(); O = Path(sys.argv[2]); O.mkdir(parents=True, exist_ok=True)
step = float(sys.argv[3]) if len(sys.argv) > 3 else 1
extra = [float(x) for x in sys.argv[4].split(',')] if len(sys.argv) > 4 else []
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--allow-file-access-from-files']); pg = b.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.goto((P/'page.html').as_uri(), timeout=900000); pg.add_style_tag(content=css)
    pg.evaluate(LOADFONTS); pg.evaluate('window.__assetsReady||null'); pg.evaluate("__film.setLang('pt')")
    tot = pg.evaluate("__film.TOTAL")
    print('total', tot)
    ts = sorted(set([round(i*step, 3) for i in range(int(tot/step)+1)] + extra + [round(tot-0.04, 3)]))
    out = []
    for i, T in enumerate(ts):
        d = pg.evaluate("T=>{__film.frame(T,true);return document.getElementById('cv').toDataURL('image/jpeg',.85)}", T)
        p = O/(f"q_{i:03d}_{T:.2f}".replace('.', ',')+'s.jpg'); p.write_bytes(base64.b64decode(d.split(',', 1)[1])); out.append((T, p))
    b.close(); print('errors', errs)
tw, th, cols = 216, 384, 8; rows = (len(out)+cols-1)//cols; s = Image.new('RGB', (tw*cols, (th+22)*rows), (20, 20, 20)); dr = ImageDraw.Draw(s)
for i, (T, p) in enumerate(out):
    x, y = (i % cols)*tw, (i//cols)*(th+22); s.paste(Image.open(p).resize((tw, th)), (x, y+22)); dr.text((x+4, y+4), f'{T:.2f}s', fill=(255, 220, 120))
s.save(O/'00_folha.jpg', quality=85); print(len(out), 'quadros')
