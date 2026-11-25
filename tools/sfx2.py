"""Sonificação genérica: eventos do render -> sons da sfxlib + ambientes + tons contínuos. Substitui sfx.py.
Nas cenas: logEv(chave_unica, 'preset', valor)  (presets em sfxlib.PRESETS; 'morph'/'in' do deriv viram tique suave)
           FX.tone('nome', t, v)                  (v em 0..1 a cada quadro -> glissando; configure em meta.json)
meta.json (opcional):
  "sound": {"ambient": [{"type": "wind", "from": 0, "to": 9999, "level": 0.03, "fade": 2}],   # tempos absolutos em s
            "tones": {"nome": {"lo": 196, "hi": 784, "gain": 0.04, "harm": [1, .2]}},
            "gain": {"pop": 0.06}}                                                          # ganhos por preset
FX.toneA('nome', t, v, amp) também grava o volume (0..1) a cada quadro.
usage: python sfx2.py PROJECT LANG   (lê audio_LANG.wav, v-LANG.mp4.events.json; grava final_LANG.wav)"""
import sys, json, numpy as np
from pathlib import Path
from scipy.io import wavfile
sys.path.insert(0, str(Path(__file__).resolve().parent)); import sfxlib as L
P = Path(sys.argv[1]).resolve(); lang = sys.argv[2]
meta = json.load(open(P/'meta.json', encoding='utf-8')); snd = meta.get('sound', {})
ev = json.load(open(P/f'v-{lang}.mp4.events.json'))
sr, a = wavfile.read(P/f'audio_{lang}.wav'); a = a.astype(np.float64)/32767; N = len(a); TOTAL = N/sr
R = np.random.default_rng(5); fx = np.zeros((N, 2)); gains = {**L.GAIN, **snd.get('gain', {})}
def put(sig, T, g, pan=0.0):
    i = int(T*sr)
    if i >= N or i < 0: return
    s = sig[:N-i]; l, r = np.cos((pan+1)*np.pi/4), np.sin((pan+1)*np.pi/4); fx[i:i+len(s), 0] += s*g*l; fx[i:i+len(s), 1] += s*g*r
tones = {}; amps = {}; unknown = set()
for T, kind, val in ev:
    if kind.startswith('tone:'): tones.setdefault(kind[5:], []).append((T, val)); continue
    if kind.startswith('amp:'): amps.setdefault(kind[4:], []).append((T, val)); continue
    if kind in ('morph', 'in'): kind = 'tick'; val = 1
    f = L.PRESETS.get(kind)
    if not f: unknown.add(kind); continue
    n = int(val) if kind == 'tick' else 1
    for j in range(max(1, min(6, n))): put(f(sr, R, val), T+(j*.11 if kind == 'tick' else 0), gains.get(kind, .08), R.uniform(-.35, .35))
for name, pts in tones.items():
    cfg = snd.get('tones', {}).get(name, {}); pts.sort(); T0, T1 = pts[0][0], pts[-1][0]
    if T1-T0 < .2: continue
    i0, i1 = int(T0*sr), min(N, int(T1*sr)); tt = np.arange(i0, i1)/sr; v = np.interp(tt, [p[0] for p in pts], [p[1] for p in pts])
    lo, hi = cfg.get('lo', 196), cfg.get('hi', 784); f = lo*(hi/lo)**np.clip(v, 0, 1); ph = 2*np.pi*np.cumsum(f)/sr
    s = sum(h*np.sin((k+1)*ph) for k, h in enumerate(cfg.get('harm', [1, .2])))*np.minimum(1, (tt-T0)/.5)*np.minimum(1, (T1-tt)/.8)*cfg.get('gain', .04)
    if name in amps: ap = sorted(amps[name]); s = s*np.interp(tt, [p[0] for p in ap], [p[1] for p in ap])
    fx[i0:i1, 0] += s; fx[i0:i1, 1] += s
for A in snd.get('ambient', []):
    bed = L.amb(A['type'], sr, N, R); bed = bed/(np.max(np.abs(bed))+1e-9); t = np.arange(N)/sr
    t0, t1, fd = A.get('from', 0), min(A.get('to', TOTAL), TOTAL), A.get('fade', 2)
    env = np.clip((t-t0)/fd, 0, 1)*np.clip((t1-t)/fd, 0, 1)*A.get('level', .03)
    fx[:, 0] += bed*env; fx[:, 1] += np.roll(bed, 431)*env
mix = a+fx; mix /= max(1, np.max(np.abs(mix))/.97)
wavfile.write(P/f'final_{lang}.wav', sr, (mix*32767).astype(np.int16))
print(lang, len(ev), 'eventos', 'desconhecidos:', sorted(unknown) or '-')
