"""Envelopes das falas (para desenhar a forma de onda real da narração): PROJECT/assets/ondas.json {pt:[[...]], en:[[...]]}
usage: python wave_env.py PROJECT [pontos_por_segundo=24]"""
import sys, json, numpy as np, soundfile as sf
from pathlib import Path
P = Path(sys.argv[1]).resolve(); pps = int(sys.argv[2]) if len(sys.argv) > 2 else 24; out = {}
for lang in ('pt', 'en'):
    L = []
    for f in sorted((P/'voice').glob(f'{lang}[0-9][0-9].wav')):
        a, sr = sf.read(f); a = np.abs(a if a.ndim == 1 else a.mean(1)); n = max(1, int(len(a)/sr*pps)); k = len(a)//n
        e = np.array([a[i*k:(i+1)*k].max() for i in range(n)]); L.append((e/(e.max()+1e-9)).round(3).tolist())
    out[lang] = L
(P/'assets').mkdir(exist_ok=True); json.dump(out, open(P/'assets'/'ondas.json', 'w')); print({k: len(v) for k, v in out.items()})
