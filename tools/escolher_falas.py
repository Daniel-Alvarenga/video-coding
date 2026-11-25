"""Escolhe a melhor versão de cada fala gerada no Colab (pt00_v0.wav, pt00_v1.wav, ...) e grava em PROJECT/voice/ptNN.wav (24 kHz).
Critérios (não dá para ouvir, então são medidas): termina limpo (sem fala cortada no fim), sem "sobra" (pedaço curto de som depois
de uma pausa longa no fim), sem pausa interna exagerada; entre as boas, a de duração mais perto da mediana.
usage: python escolher_falas.py PROJECT PASTA_DO_ZIP_EXTRAIDO"""
import sys, glob, json, re, numpy as np, soundfile as sf
from pathlib import Path
from scipy.signal import resample_poly
P = Path(sys.argv[1]); Z = Path(sys.argv[2]); out = P/'voice'; out.mkdir(exist_ok=True)
def segs(a, sr, thr=.05, win=.05):
    n = int(win*sr); on = [np.sqrt(np.mean(a[k:k+n]**2)) > thr for k in range(0, len(a)-n, n)]; S = []; s = None
    for i, v in enumerate(on):
        if v and s is None: s = i
        if not v and s is not None: S.append((s*win, i*win)); s = None
    if s is not None: S.append((s*win, len(on)*win))
    return S
falas = sorted({int(re.search(r'pt(\d+)_v', f).group(1)) for f in glob.glob(str(Z/'**'/'pt*_v*.wav'), recursive=True)})
durs = []
for i in falas:
    cands = []
    for f in sorted(glob.glob(str(Z/'**'/f'pt{i:02d}_v*.wav'), recursive=True)):
        a, sr = sf.read(f); a = a if a.ndim == 1 else a.mean(1); a = a/max(1e-9, np.max(np.abs(a))); S = segs(a, sr)
        if not S: continue
        n = int(.05*sr); tail = np.sqrt(np.mean(a[-n:]**2)); pen = 0
        if tail > .06: pen += 10                                    # terminou falando: provavelmente cortada
        if len(S) > 1 and S[-1][0]-S[-2][1] > .35 and S[-1][1]-S[-1][0] < .5: pen += 5   # sobra curta depois de pausa longa
        gaps = [S[k+1][0]-S[k][1] for k in range(len(S)-1)]
        if gaps and max(gaps) > .8: pen += 3                         # pausa interna exagerada
        cands.append((pen, len(a)/sr, f, a, sr, S))
    med = float(np.median([c[1] for c in cands]))
    pen, d, f, a, sr, S = sorted(cands, key=lambda c: (c[0], abs(c[1]-med)))[0]
    if pen >= 5 and len(S) > 1 and S[-1][0]-S[-2][1] > .35 and S[-1][1]-S[-1][0] < .5: a = a[:int((S[-2][1]+.1)*sr)]   # corta a sobra
    a = resample_poly(a, 24000, sr); idx = np.where(np.abs(a) > .02*np.max(np.abs(a)))[0]; a = a[max(0, idx[0]-400):idx[-1]+1500]
    fd = int(.03*24000); a[-fd:] *= np.linspace(1, 0, fd); a *= .9/np.max(np.abs(a))
    sf.write(out/f'pt{i:02d}.wav', a, 24000); durs.append(round(len(a)/24000, 2))
    print(f'fala {i}: {Path(f).name} (penalidade {pen}, {d:.2f} s de {len(cands)} versões)')
json.dump({'pt': durs}, open(out/'durs.json', 'w')); print(durs)
