"""Render PROJECT/page.html frame by frame (video only) + log sound events.
usage: python3 render.py PROJECT LANG [fps] [limit_seconds]   -> PROJECT/v-LANG.mp4 (+ .events.json)"""
import base64, subprocess, sys, time, json
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent)); from fonts import css, LOADFONTS
P = Path(sys.argv[1]).resolve(); LANG = sys.argv[2]
FPS = int(sys.argv[3]) if len(sys.argv) > 3 else 30; LIMIT = float(sys.argv[4]) if len(sys.argv) > 4 else None
OUT = str(P/f'v-{LANG}.mp4')
# legendas queimadas no vídeo: padrão nos verticais (Shorts/Reels/TikTok, muita gente assiste sem som); meta "captions": true/false força
_m = json.load(open(P/'meta.json', encoding='utf-8')); NOCAP = 'false' if _m.get('captions', _m.get('format') == 'vertical') else 'true'
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--allow-file-access-from-files']+(['--ignore-gpu-blocklist','--use-angle='+__import__('json').load(open(P/'meta.json',encoding='utf-8')).get('angle','d3d11'),'--enable-gpu'] if __import__('json').load(open(P/'meta.json',encoding='utf-8')).get('gl') else [])); pg = b.new_page(viewport={'width': 1280, 'height': 900})
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.goto((P/'page.html').as_uri(), timeout=900000); pg.add_style_tag(content=css)
    pg.evaluate(LOADFONTS); pg.evaluate('window.__assetsReady||null'); pg.evaluate(f"__film.setLang('{LANG}')")
    total = pg.evaluate('__film.TOTAL'); end = min(total, LIMIT) if LIMIT else total; n = int(end*FPS)
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-', '-t', str(end),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
    t0 = time.time()
    for i in range(n):
        d = pg.evaluate("T=>{__film.frame(T,"+NOCAP+");return document.getElementById('cv').toDataURL('image/jpeg',.94)}", i/FPS)
        ff.stdin.write(base64.b64decode(d.split(',', 1)[1]))
        if i % 300 == 0: print(f'{i}/{n} {time.time()-t0:.0f}s', flush=True)
    ff.stdin.close(); ff.wait(); json.dump(pg.evaluate('window.__ev||[]'), open(OUT+'.events.json', 'w')); b.close()
print('done', round(time.time()-t0))
