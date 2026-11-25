"""Checagem automática de sobreposição de textos/números/fórmulas e de texto saindo da tela.
Renderiza o filme a cada STEP s (sem gravar vídeo), coleta a caixa de cada texto (txt) e de cada glifo de fórmula
(eqIn/deriv) e acusa pares de elementos diferentes que se cruzam. Ignora o 1,3 s de transição no início das cenas.
usage: python overlaps.py PROJECT [LANG=pt] [STEP=0.25]   -> lista de conflitos (vazia = ok); código de saída 1 se houver"""
import sys, re
norm = lambda s: re.sub(r'\d', '#', s)
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent)); from fonts import css, LOADFONTS
P = Path(sys.argv[1]).resolve(); LANG = sys.argv[2] if len(sys.argv) > 2 else 'pt'; STEP = float(sys.argv[3]) if len(sys.argv) > 3 else .25
def inter(a, b):
    w = min(a[2], b[2])-max(a[0], b[0]); h = min(a[3], b[3])-max(a[1], b[1]); return w*h if w > 0 and h > 0 else 0
hits = {}
with sync_playwright() as pw:
    br = pw.chromium.launch(args=['--allow-file-access-from-files']); pg = br.new_page()
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.goto(P.joinpath('page.html').as_uri()); pg.add_style_tag(content=css)
    pg.evaluate(LOADFONTS); pg.evaluate('window.__assetsReady||null'); pg.evaluate(f"__film.setLang('{LANG}')")
    total = pg.evaluate('__film.TOTAL'); starts = pg.evaluate('__film.starts||[]')
    W, H = pg.evaluate("[document.getElementById('cv').width||1920,document.getElementById('cv').height||1080]")
    T = 0.0
    while T < total:
        if not any(0 < s <= T < s+1.3 for s in starts):
            B = pg.evaluate("T=>{window.__boxes=[];__film.frame(T,true);const b=window.__boxes;window.__boxes=null;return b}", T)
            W, H = pg.evaluate("[document.getElementById('cv').width,document.getElementById('cv').height]")
            for i, a in enumerate(B):
                if a[0] < 8 or a[2] > W-8 or a[1] < 4 or a[3] > H-4:
                    l = hits.setdefault(('fora da tela', norm(a[4]), ''), [])
                    if not l or l[-1] != T: l.append(T)
                for b in B[i+1:]:
                    if a[4] == b[4]: continue
                    ar = min((a[2]-a[0])*(a[3]-a[1]), (b[2]-b[0])*(b[3]-b[1]))
                    if ar > 0 and inter(a, b) > max(30, .12*ar):
                        k = tuple(sorted((norm(a[4]), norm(b[4])))); l = hits.setdefault(('sobreposição',)+k, [])
                        if not l or l[-1] != T: l.append(T)
        T = round(T+STEP, 3)
    br.close()
for k, ts in sorted(hits.items(), key=lambda kv: kv[1][0]):
    rng = []; s = p = ts[0]
    for t in ts[1:]+[None]:
        if t is None or t-p > STEP*1.5: rng.append(f'{s:.2f}-{p:.2f}s' if p > s else f'{s:.2f}s'); s = t
        p = t if t is not None else p
    print(f"{k[0]}: {k[1][:40]!r} x {k[2][:40]!r} em {', '.join(rng)}")
print('ok, nenhuma sobreposição' if not hits else f'{len(hits)} conflito(s)')
sys.exit(1 if hits else 0)
