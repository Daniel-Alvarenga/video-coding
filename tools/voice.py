"""Generate narration for every line in PROJECT/lines.py (EN: am_michael, PT: pm_alex).
usage: python3 voice.py PROJECT [speed]   (long videos 1.0, Shorts 1.08–1.12)"""
import sys, json, numpy as np, soundfile as sf
from pathlib import Path
KIT = Path(__file__).resolve().parent.parent
P = Path(sys.argv[1]).resolve(); speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
sys.path.insert(0, str(P)); from lines import LINES
from kokoro_onnx import Kokoro
k = Kokoro(str(KIT/'models'/'kokoro-v1.0.onnx'), str(KIT/'models'/'voices-v1.0.bin'))
(P/'voice').mkdir(exist_ok=True); d = {'en': [], 'pt': []}
for i, L in enumerate(LINES):
    for lang, txt, voice, code in (('en', L[2], 'am_michael', 'en-us'), ('pt', L[4], 'pm_alex', 'pt-br')):
        a, sr = k.create(txt, voice=voice, speed=speed, lang=code)
        idx = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, idx[0]-400):idx[-1]+800]
        sf.write(P/'voice'/f'{lang}{i:02d}.wav', a, sr); d[lang].append(round(len(a)/sr, 2))
json.dump(d, open(P/'voice'/'durs.json', 'w')); print(d)
