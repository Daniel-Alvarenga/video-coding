"""Trilha original por estilo (um acorde por cena, sincronizada às cenas do plan.json).
meta.json: "music": {"style": "calmo"|"misterioso"|"epico"|"lofi"|"minimal", "gain": [por cena], "end_fade": 4, "seed": 7}
usage: python music.py PROJECT   -> PROJECT/music.wav"""
import sys, json, numpy as np
from pathlib import Path
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile
P = Path(sys.argv[1]).resolve(); meta = json.load(open(P/'meta.json', encoding='utf-8')); M = meta.get('music', {})
STY = M.get('style', 'calmo'); SR = 44100
PLAN = json.load(open(P/'plan.json')); D = PLAN['dur']; S = [sum(D[:i]) for i in range(len(D))]; TOTAL = float(sum(D)); N = int(SR*TOTAL)
t = np.arange(N)/SR; rng = np.random.default_rng(M.get('seed', 7)); dry = np.zeros((N, 2)); wet = np.zeros((N, 2))
mtof = lambda m: 440.0*2**((m-69)/12)
def add(sig, start, g=1.0, pan=0.0, send=.3):
    i0 = int(start*SR)
    if i0 >= N or i0 < 0: return
    sig = sig[:N-i0]; l, r = np.cos((pan+1)*np.pi/4), np.sin((pan+1)*np.pi/4)
    dry[i0:i0+len(sig), 0] += sig*g*l; dry[i0:i0+len(sig), 1] += sig*g*r; wet[i0:i0+len(sig), 0] += sig*g*send*l; wet[i0:i0+len(sig), 1] += sig*g*send*r
def pluck(f, d=2.0, br=5, dec=1.0):
    n = int(d*SR); tt = np.arange(n)/SR; return sum((1/k)*np.sin(2*np.pi*f*k*tt)*np.exp(-tt*(dec+.7*k)) for k in range(1, br+1))*np.minimum(1, tt/.004)*.6
def bell(f, d=3.0):
    tt = np.arange(int(d*SR))/SR; return sum(a*np.sin(2*np.pi*f*r*tt)*np.exp(-tt/dd) for r, a, dd in [(1, 1, 1.5), (2.76, .3, .7), (5.4, .12, .3)])*np.minimum(1, tt/.004)/1.5
PROG = {  # progressões (MIDI) por estilo; o padrão se repete se houver mais cenas
 'calmo':     [[36,48,55,64,71],[33,45,52,60,67],[29,41,48,57,64],[31,43,50,57,64],[28,40,47,55,62],[29,41,48,57,67],[36,48,55,64,71]],
 'misterioso':[[33,45,52,60,64],[29,41,48,55,64],[34,46,53,58,62],[33,45,52,59,64],[31,43,50,58,62],[29,41,48,55,60],[33,45,52,57,64]],
 'epico':     [[33,45,52,57,64],[29,41,48,57,65],[36,48,55,60,67],[31,43,50,59,67],[33,45,52,57,64],[29,41,48,57,65],[31,43,50,55,62]],
 'lofi':      [[38,50,57,60,65],[31,43,50,53,59],[36,48,55,59,64],[33,45,52,55,60],[38,50,57,60,65],[31,43,50,53,59],[36,48,55,59,64]],
 'minimal':   [[36,48,55,67],[36,48,53,65],[33,45,52,64],[35,47,55,67],[36,48,55,67],[33,45,52,64],[36,48,55,67]]}
CFG = {'calmo': dict(bpm=66, pad=.16, arp=.045, lp=1400), 'misterioso': dict(bpm=54, pad=.18, arp=.03, lp=1100, bells=True),
       'epico': dict(bpm=80, pad=.17, arp=.05, lp=2200, pulse=True), 'lofi': dict(bpm=74, pad=.13, arp=.05, lp=1200, drums=True),
       'minimal': dict(bpm=60, pad=.10, arp=.06, lp=1600)}[STY]
CH = [PROG[STY][i % len(PROG[STY])] for i in range(len(D))]; GAIN = M.get('gain', [1]*len(D))
pad = np.zeros((N, 2))
for si, chord in enumerate(CH):
    s0 = S[si]; s1 = S[si+1] if si+1 < len(S) else TOTAL; a0, a1 = max(0, s0-1.2), min(TOTAL, s1+1.4); i0, i1 = int(a0*SR), int(a1*SR); tt = t[i0:i1]; seg = np.zeros((len(tt), 2))
    for j, m in enumerate(chord):
        f = mtof(m)
        for side, det in ((0, -.12), (1, .12)):
            ph = rng.uniform(0, 2*np.pi); w = np.sin(2*np.pi*(f+det)*tt+ph)+.15*np.sin(4*np.pi*(f+det)*tt+ph)
            seg[:, side] += w*(.75+.25*np.sin(2*np.pi*.05*(j+1)*tt+j))*(1.3 if j == 0 else 1)/len(chord)
    fade = np.ones(len(tt)); fi = int(min(2.4, s0-a0+1.2)*SR); fo = int((a1-s1+1.2)*SR) if si+1 < len(S) else int(2*SR)
    fi = min(fi, len(tt)); fo = min(fo, len(tt))  # cenas curtas (ex.: saída de 1 s): o fade não pode passar do trecho
    fade[:fi] = np.linspace(0, 1, fi)**1.5; fade[-fo:] *= np.linspace(1, 0, fo)**1.5; pad[i0:i1] += seg*fade[:, None]*GAIN[si]
pad = sosfilt(butter(2, CFG['lp'], btype='low', fs=SR, output='sos'), pad, axis=0); dry += pad*CFG['pad']; wet += pad*CFG['pad']*.7
beat = 60/CFG['bpm']
for si, chord in enumerate(CH):
    s0 = S[si]+1.2; s1 = (S[si+1] if si+1 < len(S) else TOTAL)-1.0; k = 0; tb = s0
    while tb < s1:
        m = chord[1+(k % (len(chord)-1))]+12; add(pluck(mtof(m), beat*2, 4), tb, CFG['arp']*GAIN[si], ((k % 4)-1.5)*.25, .5)
        if CFG.get('pulse') and k % 2 == 0: add(pluck(mtof(chord[0]), beat*1.5, 3, 3), tb, .09*GAIN[si], 0, .2)
        if CFG.get('drums'):
            n = int(.25*SR); tt = np.arange(n)/SR
            if k % 4 == 0: add(np.sin(2*np.pi*(55+60*np.exp(-tt*30))*tt)*np.exp(-tt*12), tb, .12*GAIN[si], 0, .05)
            if k % 4 == 2: add(sosfilt(butter(2, [1500, 6000], btype='band', fs=SR, output='sos'), rng.standard_normal(n))*np.exp(-tt*25), tb, .05*GAIN[si], .1, .1)
            add(sosfilt(butter(2, 7000, btype='high', fs=SR, output='sos'), rng.standard_normal(n//4))*np.exp(-tt[:n//4]*80), tb+beat/2, .015, -.2, .05)
        tb += beat; k += 1
    if CFG.get('bells'):
        for q in range(int((s1-s0)/(beat*6))): add(bell(mtof(chord[-1]+12+rng.choice([0, 2, 7]))), s0+q*beat*6+rng.uniform(0, 1), .035, rng.uniform(-.6, .6), .9)
if CFG.get('vinyl'):
    v = sosfilt(butter(2, [800, 6000], btype='band', fs=SR, output='sos'), rng.standard_normal(N))*.004; cr = (rng.random(N) > .9997)*rng.uniform(-.2, .2, N); dry += np.stack([v+cr]*2, 1)
ir_len = int(3.0*SR); ti = np.arange(ir_len)/SR
ir = np.stack([rng.standard_normal(ir_len), rng.standard_normal(ir_len)], 1)*np.exp(-ti/.8)[:, None]
ir = sosfilt(butter(1, 5000, btype='low', fs=SR, output='sos'), ir, axis=0); ir /= np.sqrt((ir**2).sum(0))
rev = np.stack([fftconvolve(wet[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = dry+rev*.9; mix = sosfilt(butter(2, 30, btype='high', fs=SR, output='sos'), mix, axis=0); mix /= np.max(np.abs(mix))+1e-9; mix = np.tanh(mix*1.1)/np.tanh(1.1)*.8
ef = M.get('end_fade', 4); a = int(max(0, TOTAL-ef)*SR); env = np.ones(N); env[a:] = np.linspace(1, 0, N-a)**1.6; mix *= env[:, None]
wavfile.write(P/'music.wav', SR, (mix*32767).astype(np.int16)); print('music', STY, round(TOTAL, 1), 's')
