"""Trilha do planetas-cabem (v1, atrasada OFF = 2,5 s para o gancho novo; 34,5 s, sem narração, 120 BPM): gancho calmo (0–3), bumbo em cada batida com os planetas (3–16,5),
impacto no CABEM (16,5), subida para o zoom (18–19,5), meio-tempo com suspense (19,5–24), parada no NÃO CABE (24), volta cheia (26,5–29,5),
varredura de saída (29,5–31) e emenda no quadro 0 (loop).
usage: python musica.py PROJECT  -> PROJECT/music.wav"""
import sys, numpy as np
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve
P = Path(sys.argv[1]).resolve(); SR = 44100; TT = 34.5; OFF = 2.5; N = int(SR*TT); t = np.arange(N)/SR
rng = np.random.default_rng(23); out = np.zeros((N, 2)); rev = np.zeros((N, 2))
mtof = lambda m: 440*2**((m-69)/12)
def put(sig, at, g=1., pan=0., send=.15, off=True):
    at = at+(OFF if off else 0)
    i = int(at*SR) % N; s = sig*g; L, R = np.cos((pan+1)*np.pi/4), np.sin((pan+1)*np.pi/4)
    n = min(len(s), N-i); out[i:i+n, 0] += s[:n]*L; out[i:i+n, 1] += s[:n]*R; rev[i:i+n, 0] += s[:n]*L*send; rev[i:i+n, 1] += s[:n]*R*send
    if n < len(s):  # o que passa do fim volta no começo: loop sem emenda
        m = len(s)-n; out[:m, 0] += s[n:]*L; out[:m, 1] += s[n:]*R; rev[:m, 0] += s[n:]*L*send; rev[:m, 1] += s[n:]*R*send
def filt(x, f, kind='low', o=2): return sosfilt(butter(o, f, kind, fs=SR, output='sos'), x)
def kick(g=1., d=.45):
    n = int(d*SR); tt = np.arange(n)/SR; f = 48+130*np.exp(-tt*28); ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-tt*7)*g+filt(rng.standard_normal(n), 3000, 'high')*np.exp(-tt*120)*.15
def hat(d=.06):
    n = int(d*SR); tt = np.arange(n)/SR; return filt(rng.standard_normal(n), 7000, 'high')*np.exp(-tt*70)
def clap():
    n = int(.25*SR); tt = np.arange(n)/SR; env = sum(np.exp(-np.maximum(0, tt-k*.011)*60)*(tt >= k*.011) for k in range(3))
    return filt(filt(rng.standard_normal(n), 900, 'high'), 4000)*env*.7
def boom(d=2.2):
    n = int(d*SR); tt = np.arange(n)/SR; f = 70*np.exp(-tt*1.4)+28; s = np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*1.6)
    return s+filt(rng.standard_normal(n), 1800)*np.exp(-tt*5)*.5
def saw(f, d, cut=900):
    n = int(d*SR); tt = np.arange(n)/SR; s = sum(((f*k*tt+rng.uniform()) % 1-.5)*2/k for k in (1,)) if False else 2*((f*tt) % 1)-1
    s = s+(2*((f*1.006*tt+.3) % 1)-1)*.7; return filt(s, cut)*np.minimum(1, tt/.01)

# acordes (ré menor → si bemol → fá → dó), um a cada 2 s
CH = [[50, 62, 65, 69], [46, 58, 62, 65], [41, 57, 60, 65], [48, 55, 60, 64]]
def lev(s):
    return .05 if s < 3 else .07 if s < 16.5 else .09
for k in range(16):
    s0 = k*2.0; ch = CH[k % 4]; d = 2.0
    for m in ch[1:]:
        n = int((d+.6)*SR); tt = np.arange(n)/SR; env = np.minimum(1, tt/.3)*np.minimum(1, (d+.6-tt)/.6)
        cut = 900 if s0 < 3 else 1300+1200*min(1, s0/16)
        for det, pan in ((-.1, -.5), (.1, .5)): put(filt(saw(mtof(m)+det, d+.6, cut), 2500)*env*lev(s0), s0, 1, pan, .5)
    # baixo
    n = int(2*SR); tt = np.arange(n)/SR; put(np.sin(2*np.pi*mtof(ch[0]-12)*tt)*np.minimum(1, tt/.02)*np.exp(-tt*.9)*.28, s0)
# 0–3: pulso leve (só um bumbo baixo na cabeça de cada 1 s)
for s0 in (0, 1, 2): put(kick(.45), s0, 1, 0, .1)
# 3–16,5: bumbo em toda batida, chimbal crescendo
for k in range(27):
    s0 = 3+k*.5; put(kick(.9), s0, 1, 0, .06)
    for j in range(2 if s0 < 8 else 4): put(hat(), s0+j*(.25 if s0 < 8 else .125), .05+.08*(s0-3)/13, rng.uniform(-.3, .3), .05)
    if s0 >= 8 and k % 2: put(clap(), s0, .5, 0, .3)
# subida antes do CABEM (14,5–16,5)
n = int(2*SR); tt = np.arange(n)/SR; put(filt(rng.standard_normal(n), 2500, 'high')*(tt/2)**2*.3, 14.5, 1, 0, .4)
put(boom(), 16.5, 1.1, 0, .6)
# 16,5–18: batida cheia com arpejo
for k in range(3):
    s0 = 16.5+k*.5; put(kick(1.), s0, 1, 0, .06); put(clap(), s0+.25, .4, 0, .3)
# 18–19,5: subida para o zoom (ruído + tom subindo)
n = int(1.5*SR); tt = np.arange(n)/SR; r = filt(rng.standard_normal(n), 2000, 'high')*(tt/1.5)**2*.35+np.sin(2*np.pi*np.cumsum(220+880*(tt/1.5)**2)/SR)*(tt/1.5)**2*.1
put(r, 18, 1, 0, .4)
# 19,5–24: meio-tempo com suspense (bumbo a cada 1 s, tique de relógio)
for k in range(9):
    s0 = 19.5+k*.5
    if k % 2 == 0: put(kick(.85), s0, 1, 0, .1)
    m = int(.05*SR); tt = np.arange(m)/SR; put(np.sin(2*np.pi*1800*tt)*np.exp(-tt*90)*.12, s0+.25, 1, (-.4, .4)[k % 2], .2)
# 24: parada seca (NÃO CABE) e volta em 25
put(boom(1.2), 24, .7, 0, .5)
# 25–29,5: batida cheia de novo
for k in range(9):
    s0 = 25+k*.5; put(kick(.95), s0, 1, 0, .06)
    if k % 2: put(clap(), s0, .5, 0, .3)
    for j in range(4): put(hat(), s0+j*.125, .12, rng.uniform(-.4, .4), .05)
# 29,5–31: varredura de saída
n = int(1.5*SR); tt = np.arange(n)/SR; fc = 5000*np.exp(-tt*1.8)+200; noise = rng.standard_normal(n); sweep = np.zeros(n)
for a in range(0, n, 2048):
    b = min(n, a+2048); sweep[a:b] = filt(noise[a:b], [max(80, fc[a]*.6), min(SR/2-100, fc[a]*1.4)], 'band', 2)
put(sweep*np.minimum(1, tt/.1)*np.minimum(1, (1.5-tt)/.3)*.5, 29.5, 1, 0, .4)
put(kick(.45), 31, 1, 0, .1)
# 0–2,5 (sem atraso): gancho novo, a Terra e a Lua se afastando: colchão, subida e impacto na escala
for m in CH[0][1:]:
    n = int(3.0*SR); tt = np.arange(n)/SR; e = np.minimum(1, tt/.4)*np.minimum(1, (3.0-tt)/.6)
    for det, pan in ((-.1, -.5), (.1, .5)): put(filt(saw(mtof(m)+det, 3.0, 900), 2500)*e*.05, 0, 1, pan, .5, off=False)
n = int(1.4*SR); tt = np.arange(n)/SR; put(filt(rng.standard_normal(n), 2500, 'high')*(tt/1.4)**2*.3+np.sin(2*np.pi*np.cumsum(220+900*(tt/1.4)**2)/SR)*(tt/1.4)**2*.1, 1.0, 1, 0, .4, off=False)
put(boom(1.6), 2.4, .8, 0, .5, off=False)
ir_n = int(1.6*SR); ti = np.arange(ir_n)/SR; ir = rng.standard_normal(ir_n)*np.exp(-ti/.45); ir /= np.sqrt((ir**2).sum())
for c in range(2):
    w = fftconvolve(np.concatenate([rev[:, c], rev[:, c]]), ir)[:2*N]; out[:, c] += (w[:N]+w[N:2*N])*.35
out[:, 0] = filt(out[:, 0], 30, 'high'); out[:, 1] = filt(out[:, 1], 30, 'high')
out = np.tanh(out*1.3)/np.tanh(1.3); out /= np.max(np.abs(out)); out *= .93
wavfile.write(P/'music.wav', SR, (out*32767).astype(np.int16)); print('music planetas', TT, 's')
