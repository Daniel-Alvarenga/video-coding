"""Place narration over PROJECT/music.wav with ducking + light room reverb -> audio_en.wav / audio_pt.wav
usage: python3 mix.py PROJECT [duck=0.55]   (Shorts: 0.62)
meta.json "voice_fx" ajusta a ressonância suave da voz (room, predelay, decay, tone)."""
import sys, numpy as np, json, soundfile as sf
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import resample_poly, butter, sosfilt, fftconvolve
P = Path(sys.argv[1]).resolve(); DUCK = float(sys.argv[2]) if len(sys.argv) > 2 else .55
plan = json.load(open(P/'plan.json')); META = json.load(open(P/'meta.json', encoding='utf-8')); DUR = plan['dur']; ST = [sum(DUR[:i]) for i in range(len(DUR))]
sr, m = wavfile.read(P/'music.wav'); m = m.astype(np.float64)/32767; N = len(m)
for lang in (sys.argv[3].split(',') if len(sys.argv) > 3 else ('en', 'pt')):
    v = np.zeros(N)
    for i, (sc, s, e) in enumerate(plan['sched'][lang]):
        a, _ = sf.read(P/'voice'/f'{lang}{i:02d}.wav'); a = resample_poly(a, 147, 80); i0 = int((ST[sc]+s)*sr); v[i0:i0+len(a)] += a[:N-i0]
    v = sosfilt(butter(2, 80, 'high', fs=sr, output='sos'), v); v /= np.max(np.abs(v)); v = np.tanh(v*1.6)/np.tanh(1.6)
    k = int(.22*sr); sm = fftconvolve(np.abs(v), np.ones(k)/k, 'same'); duck = np.clip(sm/.05, 0, 1); k2 = int(.4*sr); duck = fftconvolve(duck, np.ones(k2)/k2, 'same')
    # ressonância da voz: meta.json "voice_fx": {"room": nível (0,12 padrão), "predelay": s, "decay": s, "tone": Hz do filtro na cauda}
    VF = META.get('voice_fx', {}); room, pre, dec, tone = VF.get('room', .12), VF.get('predelay', 0), VF.get('decay', .18), VF.get('tone', 0)
    ir_n = int((pre+4*dec)*sr); ti = np.arange(ir_n)/sr; ir = np.random.default_rng(3).standard_normal(ir_n)*np.exp(-np.maximum(0, ti-pre)/dec)*(ti >= pre)
    if tone: ir = sosfilt(butter(2, tone, 'low', fs=sr, output='sos'), ir)
    ir /= np.sqrt((ir**2).sum())
    vv = v+room*fftconvolve(v, ir)[:N]
    mix = m*(1-DUCK*duck)[:, None]*.85+np.stack([vv]*2, 1)*.62; mix /= np.max(np.abs(mix)); mix *= .93
    wavfile.write(P/f'audio_{lang}.wav', sr, (mix*32767).astype(np.int16)); print(lang, 'ok')
