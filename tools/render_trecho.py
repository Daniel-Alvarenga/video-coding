"""Renderiza só um trecho (t0..t1, em segundos reais) e grava PROJECT/trecho-LANG.mp4 com o mesmo codec do render.py, para emendar
no v-LANG.mp4 sem refazer o vídeo todo (ex.: corrigir os últimos segundos). Depois: tools/emendar.sh ou ffmpeg concat.
usage: python render_trecho.py PROJECT LANG t0 t1 [fps=30]"""
import base64, subprocess, sys, time, json
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent)); from fonts import css, LOADFONTS
P = Path(sys.argv[1]).resolve(); LANG = sys.argv[2]; T0 = float(sys.argv[3]); T1 = float(sys.argv[4]); FPS = int(sys.argv[5]) if len(sys.argv) > 5 else 30
OUT = str(P/f'trecho-{LANG}.mp4')
_m = json.load(open(P/'meta.json', encoding='utf-8')); NOCAP = 'false' if _m.get('captions', _m.get('format') == 'vertical') else 'true'
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--allow-file-access-from-files']+(['--ignore-gpu-blocklist','--use-angle='+__import__('json').load(open(P/'meta.json',encoding='utf-8')).get('angle','d3d11'),'--enable-gpu'] if _m.get('gl') else [])); pg = b.new_page(viewport={'width': 1280, 'height': 900})
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.goto((P/'page.html').as_uri(), timeout=900000); pg.add_style_tag(content=css)
    pg.evaluate(LOADFONTS); pg.evaluate('window.__assetsReady||null'); pg.evaluate(f"__film.setLang('{LANG}')")
    i0, i1 = round(T0*FPS), round(T1*FPS)
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
    for i in range(i0, i1):
        d = pg.evaluate("T=>{__film.frame(T,"+NOCAP+");return document.getElementById('cv').toDataURL('image/jpeg',.94)}", i/FPS)
        ff.stdin.write(base64.b64decode(d.split(',', 1)[1]))
    ff.stdin.close(); ff.wait(); b.close()
print('trecho', i0, i1, OUT)
