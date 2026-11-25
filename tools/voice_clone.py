"""Narração com voz clonada (Chatterbox multilíngue, licença MIT, roda local em CPU).
Gera PROJECT/voice/<lang>NN.wav a partir de lines.py usando uma amostra de referência (10-15 s de fala limpa)
e atualiza voice/durs.json só para esse idioma (rode voice.py antes para o outro idioma).
usage (com o python do venv que tem chatterbox-tts):
  python voice_clone.py PROJECT REF.wav [lang=pt] [exaggeration=0.45] [cfg=0.5] [only=3,7]"""
import sys, json, time, numpy as np, soundfile as sf
from pathlib import Path
P = Path(sys.argv[1]).resolve(); REF = str(Path(sys.argv[2]).resolve())
LANG = sys.argv[3] if len(sys.argv) > 3 else 'pt'; EXA = float(sys.argv[4]) if len(sys.argv) > 4 else .45
CFG = float(sys.argv[5]) if len(sys.argv) > 5 else .5; ONLY = {int(x) for x in sys.argv[6].split(',')} if len(sys.argv) > 6 else None
sys.path.insert(0, str(P)); from lines import LINES
import torch; torch.manual_seed(7)
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
m = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
(P/'voice').mkdir(exist_ok=True); dp = P/'voice'/'durs.json'
d = json.load(open(dp)) if dp.exists() else {'en': [0]*len(LINES), 'pt': [0]*len(LINES)}
d.setdefault(LANG, [0]*len(LINES))
col = 4 if LANG == 'pt' else 2
for i, L in enumerate(LINES):
    if ONLY and i not in ONLY: continue
    t0 = time.time()
    w = m.generate(L[col], language_id=LANG, audio_prompt_path=REF, exaggeration=EXA, cfg_weight=CFG)
    a = w.squeeze(0).cpu().numpy().astype(np.float64); sr = m.sr
    if sr != 24000:
        from scipy.signal import resample_poly; a = resample_poly(a, 24000, sr); sr = 24000
    idx = np.where(np.abs(a) > .01)[0]; a = a[max(0, idx[0]-400):idx[-1]+800]; a *= .9/np.max(np.abs(a))
    sf.write(P/'voice'/f'{LANG}{i:02d}.wav', a, sr); d[LANG][i] = round(len(a)/sr, 2)
    json.dump(d, open(dp, 'w')); print(i, d[LANG][i], 's', round(time.time()-t0), 's de CPU', flush=True)
print(d[LANG])
