"""Trilha do Short das estrelas (loop exato, sem fade-out): lá menor, espacial e baixa por baixo da voz.
Marcos na linha nominal de 47 s (os mesmos de scenes.js), levados ao tempo real pelo mapa das falas (lines.py AN + plan.json):
0 gancho (pad suspenso + sinos), 3,4 Sol (acorde quente e pulso lento), 9,9 gigante vermelha (pad grave que incha),
15,6 estrela de 20 sóis (pulso que acelera e subida até o colapso), 25,6 supernova (a trilha some; o estrondo vem dos efeitos)
e restos (pad frio), 30,4 anã vermelha (arpejo de vidro bem lento: o tempo dela é longo), 41,4 Próxima (sinos),
44,4 resumo que volta ao acorde do começo e emenda no quadro 0. O que passa do fim volta no começo.
usage: python musica.py PROJECT  -> PROJECT/music.wav (44,1 kHz estéreo)"""
import sys, json, numpy as np
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve
P = Path(sys.argv[1]).resolve(); SR = 44100
TT = float(sum(json.load(open(P/'plan.json'))['dur'])); N = int(SR*TT); t = np.arange(N)/SR
rng = np.random.default_rng(45); out = np.zeros((N, 2)); rev = np.zeros((N, 2))
mtof = lambda m: 440*2**((m-69)/12)
PL = json.load(open(P/'plan.json')); sys.path.insert(0, str(P)); from lines import AN, TN
_S = [x[1] for x in PL['sched'].get('pt', [])]; KW = list(zip([0]+_S+[TT], [0]+AN+[TN])) if len(_S) == len(AN) else [(0, 0), (TT, TN)]
def real(n):  # tempo nominal → tempo real (mesmo mapa do scenes.js)
    for (a, x), (b, y) in zip(KW, KW[1:]):
        if n <= y: return a+(b-a)*(n-x)/((y-x) or 1)
    return TT
T_B, T_C, T_D, T_E, T_F, T_G, T_H = (real(x) for x in (4.8, 8.3, 15.2, 20, 28.4, 34.5, 40))
def put(sig, at, g=1., pan=0., send=.2):
    i = int(at*SR) % N; s = sig*g; L, R = np.cos((pan+1)*np.pi/4), np.sin((pan+1)*np.pi/4)
    n = min(len(s), N-i); out[i:i+n, 0] += s[:n]*L; out[i:i+n, 1] += s[:n]*R; rev[i:i+n, 0] += s[:n]*L*send; rev[i:i+n, 1] += s[:n]*R*send
    if n < len(s):  # loop sem emenda
        m = len(s)-n; out[:m, 0] += s[n:]*L; out[:m, 1] += s[n:]*R; rev[:m, 0] += s[n:]*L*send; rev[:m, 1] += s[n:]*R*send
def filt(x, f, kind='low', o=2): return sosfilt(butter(o, f, kind, fs=SR, output='sos'), x)
def env(n, a=.01, r=.3):
    tt = np.arange(n)/SR; d = n/SR; return np.minimum(1, tt/max(a, 1e-4))*np.minimum(1, (d-tt)/max(r, 1e-4))
def noise(d): return rng.standard_normal(int(d*SR))
def kick(g=1., d=.5):
    n = int(d*SR); tt = np.arange(n)/SR; f = 40+110*np.exp(-tt*28); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*6)*g
def saw(f, d, cut=900):
    n = int(d*SR); tt = np.arange(n)/SR; s = 2*((f*tt) % 1)-1+(2*((f*1.007*tt+.3) % 1)-1)*.7; return filt(s, cut)
def bell(m, d=3.):
    n = int(d*SR); tt = np.arange(n)/SR; f = mtof(m); return sum(np.sin(2*np.pi*f*k*tt)*np.exp(-tt*(1.2+k))*a*2.5 for k, a in ((1, 1), (2.76, .3), (5.4, .12)))
def glass(m, d=.5):
    n = int(d*SR); tt = np.arange(n)/SR; f = mtof(m); return (np.sin(2*np.pi*f*tt)+.25*np.sin(2*np.pi*2*f*tt))*np.exp(-tt*5)
def riser(d, f0=300, f1=5000):
    n = int(d*SR); tt = np.arange(n)/SR; x = noise(d); fc = f0*(f1/f0)**(tt/d); y = np.zeros(n)
    for k in range(0, n, 2048): y[k:k+2048] = filt(x[k:k+2048], min(fc[k], SR/2-100), 'low', 1)
    return y*(tt/d)**2
def pad(ms, t0, d, g0, cut=1400, pan=.5, a=.8, r=1.):
    for m in ms:
        for det, pn in ((-.13, -pan), (.13, pan)): s = saw(mtof(m)+det, d, cut); put(s*env(len(s), a, r)*g0*3.2, t0, 1, pn, .6)
T_SOL, T_GIG, T_BIG, T_FUEL, T_SN, T_DW, T_UNI, T_PX, T_END = (real(x) for x in (3.4, 9.9, 15.6, 18.4, 25.6, 30.4, 36.6, 41.4, 44.4))
# drone contínuo (lá grave), cíclico para o loop
for f, g in ((55.0, .035), (82.4, .014), (110, .008)):
    fq = round(f*TT)/TT; put(np.sin(2*np.pi*fq*t)*(.8+.2*np.sin(2*np.pi*t/TT))*g, 0, 1, 0, .1)
# gancho: pad suspenso (Asus2) e sinos; o mesmo acorde volta no fim
pad([45, 52, 57, 59, 64], 0, T_SOL+.3, .016, 1100)
for k, m in enumerate((76, 81, 83)): put(bell(m, 3.), .15+k*.95, .07, (-.4, .4, 0)[k], .7)
# Sol: acorde quente (F maior com 9ª) e pulso lento
pad([41, 48, 53, 57, 60, 67], T_SOL, T_GIG-T_SOL+.4, .015, 1600, .6)
BT = (T_GIG-T_SOL)/12
for k in range(12): put(kick(.4 if k % 2 == 0 else .22), T_SOL+k*BT, 1, 0, .05); put(glass((69, 72, 76, 79)[k % 4], .8), T_SOL+k*BT+BT*.5, .035, (-.5, .5)[k % 2], .6)
# gigante vermelha: pad grave que abre o filtro (incha)
for k in range(8):
    tk = T_GIG+k*(T_BIG-T_GIG)/8; pad([38, 45, 50, 53], tk, (T_BIG-T_GIG)/8+.6, .014, 500+260*k, .6, .4, .5)
put(riser(1.4, 300, 4000)[::-1], T_BIG-.9, .1, 0, .3)
for k, m in enumerate((74, 79, 83)): put(bell(m, 2.5), T_GIG+3.0+k*.7, .05, (-.4, .4, 0)[k], .7)
# estrela de 20 sóis: pulso que acelera, arpejo que sobe e subida até o colapso
tk = T_BIG; k = 0
while tk < T_SN-.9:
    u = (tk-T_BIG)/(T_SN-T_BIG); put(kick(.5+.3*u), tk, 1, 0, .05); put(glass((57, 64, 69, 72, 76, 81)[k % 6]+12*(u > .6), .5), tk+.04, .03+.03*u, (-.5, .5)[k % 2], .6)
    tk += .5*(1-u)**1.2+.13; k += 1
pad([45, 52, 57, 60, 64], T_BIG, T_SN-T_BIG-.6, .015, 2200, .7, 1., .3)
put(riser(T_SN-T_FUEL-.6, 200, 9000), T_FUEL, .16, 0, .3)
# supernova: a trilha some (o estrondo é dos efeitos); restos com pad frio
pad([40, 47, 52, 55, 59], T_SN+1.6, T_DW-T_SN-1.4, .014, 1200, .8, 1.2, .8)
for k, m in enumerate((83, 86, 88)): put(bell(m, 3.), T_SN+2.2+k*1.1, .05, (.4, -.4, 0)[k], .8)
# anã vermelha: arpejo bem lento, sem pressa (vida longa)
pad([45, 48, 52, 55, 60], T_DW, T_PX-T_DW+.5, .015, 900, .6, 1.2, 1.)
for k in range(int((T_PX-T_DW)/1.6)): put(glass((64, 67, 72, 71, 67, 64)[k % 6], 1.6), T_DW+.4+k*1.6, .045, (-.4, .4)[k % 2], .8)
put(bell(76, 3.5), T_UNI+.1, .05, 0, .8)
# Próxima: sinos claros; resumo volta ao acorde do começo (emenda)
for k, m in enumerate((79, 83, 88)): put(bell(m, 3.), T_PX+.3+k*.6, .055, (-.4, .4, 0)[k], .8)
pad([41, 48, 53, 57], T_PX, T_END-T_PX+.4, .015, 1400, .6)
pad([45, 52, 57, 59, 64], T_END, TT-T_END+.3, .016, 1100, .5, .8, .2)
put(riser(1.2, 300, 6000)[::-1], T_END-.3, .12, 0, .3)
# reverb (resposta ao impulso sintética, cíclica)
ir = noise(2.8)*np.exp(-np.arange(int(2.8*SR))/SR*2.2); ir = filt(ir, 5000); ir /= np.sqrt((ir**2).sum())*1.2
for c in (0, 1):
    w = fftconvolve(np.concatenate([rev[:, c], rev[:, c]]), ir)[:2*N]; out[:, c] += w[N:2*N]*.9
out = np.tanh(out*1.1); out /= max(1e-9, np.abs(out).max())/0.7
wavfile.write(P/'music.wav', SR, (out*32767).astype(np.int16)); print('music.wav', round(TT, 2), 's')
