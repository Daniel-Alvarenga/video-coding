"""Fit narration into scenes. Lines start at their nominal time (or 0.35 s after the previous line);
a scene grows when narration needs it. Writes PROJECT/plan.json with dur, sched, caps.
usage: python3 plan.py PROJECT"""
import sys, json
from pathlib import Path
P = Path(sys.argv[1]).resolve(); sys.path.insert(0, str(P))
from lines import LINES, BASE
d = json.load(open(P/'voice'/'durs.json'))
for a, b in (('en', 'pt'), ('pt', 'en')):  # vídeo de um idioma só: o outro usa os mesmos tempos
    if a not in d and b in d: d[a] = d[b]
dur = list(BASE); sched = {'en': [], 'pt': []}
for lang in ('en', 'pt'):
    prev = {}
    for i, L in enumerate(LINES):
        sc, at = L[0], L[1]; s = max(at, prev.get(sc, -9)+0.35); e = s+d[lang][i]; prev[sc] = e
        sched[lang].append([sc, round(s, 2), round(e, 2)]); dur[sc] = max(dur[sc], round(e+1.0, 1))
caps = {'en': [[] for _ in BASE], 'pt': [[] for _ in BASE]}
for lang, ci, si in (('en', 3, 2), ('pt', 5, 4)):
    for i, L in enumerate(LINES):
        sc, s, e = sched[lang][i]; caps[lang][sc].append([s, L[ci] or L[si]])
meta = json.load(open(P/'meta.json', encoding='utf-8'))
if meta.get('outro'):  # saída suave: a cena final vem do kit (BRAND.outro), sem fala
    dur.append(float(meta['outro'].get('dur', 3.2)))
json.dump({'dur': dur, 'sched': sched, 'caps': caps, 'bits': []}, open(P/'plan.json', 'w'), ensure_ascii=False)
ST = [sum(dur[:i]) for i in range(len(dur))]
print('scene durations', dur, 'total', round(sum(dur), 1))
print('chapters', [f"{int(x//60)}:{int(x%60):02d}" for x in ST])
