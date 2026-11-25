"""Importa narração gerada fora (ex.: Colab com voz clonada): zip com <lang>NN.wav -> PROJECT/voice, 24 kHz mono,
silêncio aparado, volume normalizado, voice/durs.json atualizado para esse idioma. Depois rode plan.py.
usage: python import_voice.py PROJECT ZIP [lang=pt]"""
import sys, json, zipfile, io, numpy as np, soundfile as sf
from pathlib import Path
from scipy.signal import resample_poly
from math import gcd
P = Path(sys.argv[1]).resolve(); Z = sys.argv[2]; LANG = sys.argv[3] if len(sys.argv) > 3 else 'pt'
sys.path.insert(0, str(P)); from lines import LINES
dp = P/'voice'/'durs.json'; (P/'voice').mkdir(exist_ok=True)
d = json.load(open(dp)) if dp.exists() else {}
d.setdefault(LANG, [0]*len(LINES)); d.setdefault('en' if LANG == 'pt' else 'pt', [0]*len(LINES))
with zipfile.ZipFile(Z) as z:
    for i in range(len(LINES)):
        a, sr = sf.read(io.BytesIO(z.read(f'{LANG}{i:02d}.wav')))
        if a.ndim > 1: a = a.mean(1)
        if sr != 24000: g = gcd(24000, sr); a = resample_poly(a, 24000//g, sr//g)
        idx = np.where(np.abs(a) > .01*np.max(np.abs(a))*4)[0]; a = a[max(0, idx[0]-400):idx[-1]+800]; a *= .9/np.max(np.abs(a))
        sf.write(P/'voice'/f'{LANG}{i:02d}.wav', a, 24000); d[LANG][i] = round(len(a)/24000, 2)
json.dump(d, open(dp, 'w')); print(d[LANG])
