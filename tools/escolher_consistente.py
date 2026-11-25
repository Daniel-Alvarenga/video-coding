"""Escolhe, entre as N versões de cada fala geradas no Colab (ptNN_vK.wav), a combinação mais UNIFORME e grava PROJECT/voice/ptNN.wav.
Diferente de escolher_falas.py (que só olha cortes e duração): mede em cada versão o tom (F0 mediano, por autocorrelação), o ritmo
(caracteres do texto por segundo de voz, lido de PROJECT/lines.py), a energia (RMS das partes com voz) e o brilho (centroide espectral),
e fica com a versão de cada fala mais perto das medianas de todas (distância robusta em MAD). Penaliza fala cortada no fim, sobra
depois de pausa longa e pausa interna exagerada. Depois iguala o volume: todas as falas com o mesmo RMS de voz (sem normalizar pelo pico).
usage: python escolher_consistente.py PROJECT PASTA_DO_ZIP_EXTRAIDO"""
import sys, glob, json, re
import numpy as np, soundfile as sf
from pathlib import Path
from scipy.signal import resample_poly
P = Path(sys.argv[1]); Z = Path(sys.argv[2]); out = P/'voice'; out.mkdir(exist_ok=True); SR = 24000
src = open(P/'lines.py', encoding='utf-8').read(); m = re.search(r'_L=(\[.*?\n\])', src, re.S); TXT = eval(m.group(1)) if m else []
TXT = [t if isinstance(t, str) else next((x for x in reversed(t[:5]) if isinstance(x, str)), '') for t in TXT]   # _L com tuplas (cena, início, texto, legenda): pega o texto
def frames(a, n, h): return np.lib.stride_tricks.sliding_window_view(a, n)[::h]
def feats(a, txt):
    n, h = int(.04*SR), int(.01*SR); F = frames(a, n, h); rms = np.sqrt((F**2).mean(1)); thr = max(.02, .15*np.percentile(rms, 95)); v = rms > thr
    if v.sum() < 5: return None
    f0 = []
    for fr in F[v][::3]:
        fr = fr-fr.mean(); c = np.correlate(fr, fr, 'full')[n-1:]; lo, hi = int(SR/320), int(SR/70)
        if c[0] <= 0: continue
        k = lo+np.argmax(c[lo:hi]);
        if c[k]/c[0] > .45: f0.append(SR/k)
    spec = np.abs(np.fft.rfft(F[v][::4]*np.hanning(n), axis=1)); fr_ = np.fft.rfftfreq(n, 1/SR); cen = (spec*fr_).sum(1)/(spec.sum(1)+1e-9)
    dv = v.sum()*h/SR
    return dict(f0=float(np.median(f0)) if f0 else 0., rate=len(txt)/max(dv, .3), en=float(20*np.log10(np.median(rms[v]))), cen=float(np.median(cen)), v=v, rms=rms, h=h)
def segs(v, h):
    S = []; s = None
    for i, x in enumerate(v):
        if x and s is None: s = i
        if not x and s is not None: S.append((s*h/SR, i*h/SR)); s = None
    if s is not None: S.append((s*h/SR, len(v)*h/SR))
    return S
cands = {}
for f in sorted(glob.glob(str(Z/'**'/'pt*_v*.wav'), recursive=True)):
    i = int(re.search(r'pt(\d+)_v', f).group(1)); a, sr = sf.read(f); a = a if a.ndim == 1 else a.mean(1); a = resample_poly(a, SR, sr)
    idx = np.where(np.abs(a) > .02*np.max(np.abs(a)))[0]; a = a[max(0, idx[0]-400):idx[-1]+1500]
    fe = feats(a, TXT[i] if i < len(TXT) else 'x'*40)
    if fe is None: continue
    S = segs(fe['v'], fe['h']); pen = 0
    tail = np.sqrt(np.mean(a[-int(.05*SR):]**2))/max(1e-9, np.max(np.abs(a)))
    if tail > .06: pen += 10
    if len(S) > 1 and S[-1][0]-S[-2][1] > .35 and S[-1][1]-S[-1][0] < .5: pen += 5
    gaps = [S[k+1][0]-S[k][1] for k in range(len(S)-1)]
    if gaps and max(gaps) > .8: pen += 3
    cands.setdefault(i, []).append(dict(f=f, a=a, pen=pen, **{k: fe[k] for k in ('f0', 'rate', 'en', 'cen')}, vr=fe['rms'][fe['v']]))
keys = ('f0', 'rate', 'en', 'cen'); allc = [c for L in cands.values() for c in L]
med = {k: np.median([c[k] for c in allc]) for k in keys}; mad = {k: max(1e-6, np.median([abs(c[k]-med[k]) for c in allc])*1.4826) for k in keys}
W = {'f0': 1.4, 'rate': 1.2, 'en': .6, 'cen': .8}
durs = []; target = None
for i in sorted(cands):
    best = min(cands[i], key=lambda c: c['pen']*10+sum(W[k]*abs(c[k]-med[k])/mad[k] for k in keys))
    a = best['a']; vr = np.sqrt(np.mean(best['vr']**2)); g = (.07/vr)                     # todas com o mesmo RMS de voz
    a = a*g; pk = np.max(np.abs(a))
    if pk > .95: a = np.tanh(a/pk*1.6)/np.tanh(1.6)*.95                                       # limitador suave só se passar
    fd = int(.03*SR); a[-fd:] *= np.linspace(1, 0, fd)
    sf.write(out/f'pt{i:02d}.wav', a, SR); durs.append(round(len(a)/SR, 2))
    z = {k: round((best[k]-med[k])/mad[k], 1) for k in keys}
    print(f'fala {i}: {Path(best["f"]).name}  tom {best["f0"]:.0f} Hz  ritmo {best["rate"]:.1f} c/s  energia {best["en"]:.1f} dB  desvios {z}  penal {best["pen"]}')
json.dump({'pt': durs}, open(out/'durs.json', 'w')); print(durs, round(sum(durs), 2))
