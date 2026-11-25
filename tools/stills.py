"""Contact sheet of frames to check layout before a full render.
usage: python3 stills.py PROJECT LANG 3,12.5,40 ...  -> PROJECT/sheet.jpg"""
import base64, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent)); from fonts import css, LOADFONTS
P = Path(sys.argv[1]).resolve(); LANG = sys.argv[2]; times = [float(x) for x in sys.argv[3].split(',')]
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--allow-file-access-from-files']+(['--ignore-gpu-blocklist','--use-angle='+__import__('json').load(open(P/'meta.json',encoding='utf-8')).get('angle','d3d11'),'--enable-gpu'] if __import__('json').load(open(P/'meta.json',encoding='utf-8')).get('gl') else [])); pg = b.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.goto((P/'page.html').as_uri(), timeout=900000); pg.add_style_tag(content=css)
    pg.evaluate(LOADFONTS); pg.evaluate('window.__assetsReady||null'); pg.evaluate(f"__film.setLang('{LANG}')"); ims = []
    for T in times:
        d = pg.evaluate("T=>{__film.frame(T,true);return document.getElementById('cv').toDataURL('image/jpeg',.85)}", T)
        p = P/f'_st_{T}.jpg'; p.write_bytes(base64.b64decode(d.split(',', 1)[1])); ims.append(Image.open(p))
    b.close(); print('errors', errs)
w, h = ims[0].size; vert = h > w; tw, th = (270, 480) if vert else (640, 360); cols = 5 if vert else 2
rows = (len(ims)+cols-1)//cols; s = Image.new('RGB', (tw*cols, th*rows))
for i, im in enumerate(ims): s.paste(im.resize((tw, th)), ((i % cols)*tw, (i//cols)*th))
s.save(P/'sheet.jpg', quality=85)
