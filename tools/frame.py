"""Um quadro em resolução cheia (para conferir detalhes que a folha de stills reduz).
usage: python frame.py PROJECT T [saida.jpg] [x0,y0,x1,y1 recorte]"""
import base64, sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent)); from fonts import css, LOADFONTS
P = Path(sys.argv[1]).resolve(); T = float(sys.argv[2]); out = Path(sys.argv[3]) if len(sys.argv) > 3 else P/'_frame.jpg'
gl = json.load(open(P/'meta.json', encoding='utf-8')).get('gl')
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--allow-file-access-from-files']+(['--ignore-gpu-blocklist', '--use-angle='+__import__('json').load(open(P/'meta.json',encoding='utf-8')).get('angle','d3d11'), '--enable-gpu'] if gl else [])); pg = b.new_page()
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.goto((P/'page.html').as_uri(), timeout=900000); pg.add_style_tag(content=css)
    pg.evaluate(LOADFONTS); pg.evaluate('window.__assetsReady||null'); pg.evaluate("__film.setLang('pt')")
    d = pg.evaluate("T=>{__film.frame(T,true);return document.getElementById('cv').toDataURL('image/jpeg',.9)}", T)
    out.write_bytes(base64.b64decode(d.split(',')[1]))
    if len(sys.argv) > 4:
        from PIL import Image; box = tuple(int(v) for v in sys.argv[4].split(',')); Image.open(out).crop(box).save(out)
    print(out)
