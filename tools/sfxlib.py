"""Biblioteca de sons sintetizados (sem amostras externas). Cada preset recebe (sr, rng, val) e devolve um array mono.
Presets de evento: tick pop bell chime pent whoosh swoosh riser impact pencil glass pour drop click heartbeat sparkle
thud chord sus res type beep gong bubble zap stamp page kick net roar.
Ambientes (camas contínuas): wind rain ocean night room city space drone fire crowd.
Use em sfx2.py: logEv(chave, 'nome_do_preset', valor) nas cenas."""
import numpy as np
from scipy.signal import butter, sosfilt

def _t(sr, d): return np.arange(int(d*sr))/sr
def _bp(sr, x, lo, hi): return sosfilt(butter(2, [lo, hi], btype='band', fs=sr, output='sos'), x)
def _lp(sr, x, f): return sosfilt(butter(2, f, btype='low', fs=sr, output='sos'), x)
def _hp(sr, x, f): return sosfilt(butter(2, f, btype='high', fs=sr, output='sos'), x)
mtof = lambda m: 440.0*2**((m-69)/12)
PENT = [0, 2, 4, 7, 9]
def pent_note(i, base=72): o, d = divmod(int(i), 5); return base+12*o+PENT[d]

def bellf(sr, f, d=3.0, bright=1.0):
    t = _t(sr, d); o = sum(a*np.sin(2*np.pi*f*r*t)*np.exp(-t/dd) for r, a, dd in [(1, 1, 1.4), (2.76, .35*bright, .7), (5.4, .15*bright, .35), (2.0, .2, 1.0)])
    return o*np.minimum(1, t/.004)/1.6
def tonef(sr, f, d, att=.3, rel=1.0, harm=(1, .3, .1)):
    t = _t(sr, d); o = sum(a*np.sin(2*np.pi*f*(k+1)*t) for k, a in enumerate(harm))
    return o*np.minimum(1, t/att)*np.minimum(1, np.maximum(0, d-t)/rel)

def tick(sr, R, v=0):
    t = _t(sr, .07); return (np.sin(2*np.pi*1900*t)*.6+_bp(sr, R.standard_normal(len(t)), 2500, 6000)*.5)*np.exp(-t*90)
def pop(sr, R, v=0): return bellf(sr, mtof(pent_note(v)), .5)*.9
def bell(sr, R, v=0): return bellf(sr, mtof(84+int(v)*7 % 24))
def chime(sr, R, v=0):
    o = np.zeros(int(2.4*sr))
    for k, m in enumerate([84, 88, 91, 96]): s = bellf(sr, mtof(m+int(v)), 2.0, .6)*.6; i = int(k*.07*sr); o[i:i+len(s)] += s[:len(o)-i]
    return o
def pent(sr, R, v=0): return bellf(sr, mtof(pent_note(v, 67)), 2.6)
def whoosh(sr, R, v=1.6):
    d = max(.3, float(v) or 1.6); n = int(d*sr); x = R.standard_normal(n); out = np.zeros(n); B = 40
    for b in range(B):
        i0, i1 = b*n//B, (b+1)*n//B; fc = 250+2600*np.sin(np.pi*b/B)
        out[i0:i1] = sosfilt(butter(2, [fc*.6, fc*1.6], btype='band', fs=sr, output='sos'), x[max(0, i0-3000):i1])[-(i1-i0):]
    return out*np.sin(np.pi*np.linspace(0, 1, n))**2*.8
def swoosh(sr, R, v=0):
    n = int(.45*sr); x = _bp(sr, R.standard_normal(n), 1500, 6000); return x*np.sin(np.pi*np.linspace(0, 1, n))**2*.6
def riser(sr, R, v=2.0):
    d = max(.5, float(v) or 2.0); t = _t(sr, d); f = 200*2**(3*t/d); ph = 2*np.pi*np.cumsum(f)/sr
    noise = _hp(sr, R.standard_normal(len(t)), 2000)*(t/d)**2*.25
    return (np.sin(ph)*.3+noise)*(t/d)**1.5*np.minimum(1, (d-t)/.05)
def impact(sr, R, v=0):  # boom grave e macio (não estala)
    t = _t(sr, 2.2); f = 70*np.exp(-t*1.5)+38; return np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*2.2)*np.minimum(1, t/.02)+_lp(sr, R.standard_normal(len(t)), 300)*np.exp(-t*8)*.4
def pencil(sr, R, v=0):
    t = _t(sr, .65); x = _bp(sr, R.standard_normal(len(t)), 2500, 7500)
    return x*(.55+.45*np.abs(np.sin(2*np.pi*23*t+3*np.sin(2*np.pi*5*t))))*np.minimum(1, t/.03)*np.minimum(1, (t[-1]-t)/.08)
def glass(sr, R, v=0):
    t = _t(sr, 1.4); thud = _lp(sr, R.standard_normal(len(t)), 220)*np.exp(-t*30)*3+np.sin(2*np.pi*95*t)*np.exp(-t*22)
    ring = sum(a*np.sin(2*np.pi*f*t)*np.exp(-t/d) for f, a, d in [(2140, .5, .35), (3310, .3, .25), (4720, .18, .15), (1530, .2, .4)])
    return thud*.7+ring*.35
def pour(sr, R, v=1.0):
    n = int(max(.3, float(v) or 1)*sr); x = _bp(sr, R.standard_normal(n), 300, 1800)*(.55+.45*np.abs(np.sin(2*np.pi*9*np.arange(n)/sr+R.uniform(0, 6))))
    return x*np.sin(np.pi*np.linspace(0, 1, n))**.7
def drop(sr, R, v=0):  # gota d'água: "plic" com glissando pra cima
    t = _t(sr, .35); f = 900+1400*(1-np.exp(-t*25)); return np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*18)*np.minimum(1, t/.002)
def click(sr, R, v=0): t = _t(sr, .03); return _hp(sr, R.standard_normal(len(t)), 3000)*np.exp(-t*300)
def heartbeat(sr, R, v=0):
    o = np.zeros(int(.9*sr))
    for k, (dt, g) in enumerate([(0, 1), (.22, .7)]):
        t = _t(sr, .25); s = np.sin(2*np.pi*55*t)*np.exp(-t*18)*g; i = int(dt*sr); o[i:i+len(s)] += s
    return o
def sparkle(sr, R, v=0):
    o = np.zeros(int(1.6*sr))
    for k in range(9):
        s = bellf(sr, mtof(96+PENT[R.integers(5)]+12*R.integers(2)), .6, .3)*.35; i = int(R.uniform(0, 1.0)*sr); o[i:i+len(s)] += s[:len(o)-i]
    return o
def thud(sr, R, v=0): t = _t(sr, .4); return np.sin(2*np.pi*90*t)*np.exp(-t*20)+_lp(sr, R.standard_normal(len(t)), 400)*np.exp(-t*40)*.5
def chord(sr, R, v=0):  # acorde maior grave e macio
    root = 48+int(v); return sum(tonef(sr, mtof(m), 5, .35, 3.5, (1, .3, .1, .05))*g for m, g in [(root-12, .5), (root, .4), (root+4, .3), (root+7, .3), (root+12, .2)])
def sus(sr, R, v=3.0): d = max(1, float(v) or 3); return sum(tonef(sr, mtof(m), d, .9, 1.0)*g for m, g in [(65, .6), (72, .35), (67, .3)])
def res(sr, R, v=0): return chord(sr, R, 0)
def type_(sr, R, v=0): t = _t(sr, .05); return _bp(sr, R.standard_normal(len(t)), 1500, 5000)*np.exp(-t*120)*.6
def beep(sr, R, v=0): return tonef(sr, 1046.5, .18, .005, .05, (1, .1))
def gong(sr, R, v=0):
    t = _t(sr, 5); f = mtof(43+int(v)); return sum(a*np.sin(2*np.pi*f*r*t+np.sin(2*np.pi*.7*t)*r*.3)*np.exp(-t/d) for r, a, d in [(1, 1, 2.5), (1.48, .5, 1.6), (2.31, .35, 1.0), (3.1, .2, .6)])*np.minimum(1, t/.01)*.6
def bubble(sr, R, v=0): t = _t(sr, .12); f = 400+1600*t/.12; return np.sin(2*np.pi*np.cumsum(f)/sr)*np.sin(np.pi*t/.12)
def zap(sr, R, v=0): t = _t(sr, .3); f = 2400*np.exp(-t*12)+200; return np.sign(np.sin(2*np.pi*np.cumsum(f)/sr))*np.exp(-t*10)*.25
def stamp(sr, R, v=0): a = thud(sr, R); c = click(sr, R); a[:len(c)] += c*.5; return a
def page(sr, R, v=0): n = int(.35*sr); return _bp(sr, R.standard_normal(n), 800, 5000)*np.sin(np.pi*np.linspace(0, 1, n))**3*.5

def kick(sr, R, val=0):
    """chute na bola: batida grave curta + estalo de couro"""
    t = _t(sr, .35); body = np.sin(2*np.pi*(70+90*np.exp(-t*30))*t)*np.exp(-t*14)
    snap = _bp(sr, R.standard_normal(len(t)), 900, 5000)*np.exp(-t*90)*.6; return (body+snap)/1.3
def net(sr, R, val=0):
    """bola na rede: chiado que balança"""
    t = _t(sr, .9); x = _bp(sr, R.standard_normal(len(t)), 1500, 7000)*np.exp(-t*4)*(1+.5*np.sin(2*np.pi*11*t)); return x/np.max(np.abs(x))
def roar(sr, R, val=0):
    """torcida explodindo (gol): ruído de multidão que cresce e cai"""
    t = _t(sr, 4.5); env = np.minimum(1, t/.35)*np.exp(-np.maximum(0, t-1.2)/1.4)
    x = sum(_bp(sr, R.standard_normal(len(t)), lo, hi)*g for lo, hi, g in [(250, 900, 1), (900, 2500, .6), (120, 300, .5)])
    x *= (1+.25*np.sin(2*np.pi*3.1*t)+.2*np.sin(2*np.pi*4.7*t)); x = x*env; return x/np.max(np.abs(x))

def note(sr, R, v=60):  # nota afinada (v = nota MIDI): sino curto e limpo
    return bellf(sr, mtof(float(v)), 1.1, .5)*.9
def supernova(sr, R, v=0):  # explosão de estrela: estalo grave, estrondo longo e cauda que rola (sem distorcer)
    t = _t(sr, 6.0); f = 55*np.exp(-t*.9)+26; boom = np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*.75)*np.minimum(1, t/.015)
    rum = _lp(sr, R.standard_normal(len(t)), 180); rum = rum/np.max(np.abs(rum))*np.exp(-t*.5)*(1-np.exp(-t*6))*.8
    crk = _bp(sr, R.standard_normal(len(t)), 500, 4000)*np.exp(-t*7)*.35; x = boom+rum+crk; return x/np.max(np.abs(x))
def collapse(sr, R, v=1.2):  # implosão: som "sugado" que sobe e corta seco (antes da supernova)
    d = max(.3, float(v) or 1.2); t = _t(sr, d); f = 60*2**(4*(t/d)**2); ph = 2*np.pi*np.cumsum(f)/sr
    nz = _bp(sr, R.standard_normal(len(t)), 300, 3000)*(t/d)**3*.5; x = (np.sin(ph)*.6+nz)*(t/d)**2*np.minimum(1, (d-t)/.01); return x/np.max(np.abs(x)+1e-9)
def flare(sr, R, v=0):  # estalido de plasma (proeminência/clarão): chiado curto e quente
    t = _t(sr, .7); x = _bp(sr, R.standard_normal(len(t)), 900, 5000)*np.exp(-t*7)*(1+np.sin(2*np.pi*13*t)*.4); return x*.5
def swell(sr, R, v=2.0):  # inchar: grave que cresce e abre (gigante vermelha)
    d = max(.5, float(v) or 2.0); t = _t(sr, d); f = 48+30*(t/d); ph = 2*np.pi*np.cumsum(f)/sr
    x = (np.sin(ph)+.4*np.sin(2*ph)+.15*np.sin(3*ph))*np.sin(np.pi*t/d)**1.5+_lp(sr, R.standard_normal(len(t)), 250)*.3*(t/d)*np.sin(np.pi*t/d); return x/np.max(np.abs(x))*.8
PRESETS = {k: f for k, f in dict(supernova=supernova, collapse=collapse, flare=flare, swell=swell, note=note, tick=tick, pop=pop, bell=bell, chime=chime, pent=pent, whoosh=whoosh, swoosh=swoosh, riser=riser, impact=impact,
    pencil=pencil, glass=glass, pour=pour, drop=drop, click=click, heartbeat=heartbeat, sparkle=sparkle, thud=thud, chord=chord, sus=sus, res=res,
    type=type_, beep=beep, gong=gong, bubble=bubble, zap=zap, stamp=stamp, page=page, kick=kick, net=net, roar=roar).items()}
GAIN = dict(supernova=.45, collapse=.18, flare=.05, swell=.22, note=.06, tick=.05, pop=.05, bell=.09, chime=.07, pent=.10, whoosh=.28, swoosh=.15, riser=.12, impact=.22, pencil=.16, glass=.35, pour=.10, drop=.12,
    click=.06, heartbeat=.30, sparkle=.08, thud=.18, chord=.05, sus=.05, res=.05, type=.05, beep=.04, gong=.10, bubble=.06, zap=.05, stamp=.12, page=.12, kick=.30, net=.10, roar=.16)

# ---------- ambientes (camas contínuas) ----------
def amb(kind, sr, N, R):
    t = np.arange(N)/sr
    def nz(): return R.standard_normal(N)
    if kind == 'wind':
        w = _lp(sr, np.cumsum(nz())*.02, 500); w -= _lp(sr, w, 40); return w/np.max(np.abs(w))*(.6+.4*np.sin(2*np.pi*t/9)**2)
    if kind == 'rain':
        x = _bp(sr, nz(), 800, 8000)*.4; drops = np.zeros(N); idx = R.integers(0, N, int(N/sr*60))
        for i in idx: s = drop(sr, R)*.15; drops[i:i+len(s)] += s[:N-i]
        return x+drops
    if kind == 'ocean':
        x = _lp(sr, nz(), 900); env = .25+.75*(.5+.5*np.sin(2*np.pi*t/7.5))**3; return x*env/np.max(np.abs(x*env))
    if kind == 'night':  # grilos + brisa
        cr = np.zeros(N)
        for f0, rate, ph in [(4300, 15, 0), (4700, 13, 1.3), (3900, 17, 2.1)]:
            gate = (np.sin(2*np.pi*rate*t+ph) > .3)*(np.sin(2*np.pi*.6*t+ph) > -.2); cr += np.sin(2*np.pi*f0*t)*gate*.25
        return _lp(sr, cr, 6000)+_lp(sr, nz(), 400)*.15
    if kind == 'room':
        rt = _lp(sr, np.cumsum(nz())*.02, 700); rt -= _lp(sr, rt, 60); rt /= np.max(np.abs(rt))+1e-9
        mur = _bp(sr, nz(), 250, 1100)*(.6+.4*np.sin(2*np.pi*.13*t)**2); mur /= np.max(np.abs(mur)); return rt*.5+mur*.5
    if kind == 'city':
        x = _lp(sr, nz(), 300); x /= np.max(np.abs(x)); hum = np.sin(2*np.pi*60*t)*.05; return x*.8+hum
    if kind == 'space':
        return sum(np.sin(2*np.pi*f*t+np.sin(2*np.pi*.05*k*t)*2)*a for k, (f, a) in enumerate([(55, .5), (82.4, .3), (110, .2), (164.8, .1)]))*(.7+.3*np.sin(2*np.pi*t/13))
    if kind == 'drone':
        return sum(np.sin(2*np.pi*f*t)*a for f, a in [(65.4, .5), (98, .3), (130.8, .2)])*(.8+.2*np.sin(2*np.pi*t/11))
    if kind == 'crowd':  # estádio: murmúrio largo com ondas lentas de canto
        x = _bp(sr, nz(), 200, 1400)+_bp(sr, nz(), 1400, 3200)*.3; x /= np.max(np.abs(x))
        return x*(.65+.2*np.sin(2*np.pi*t/6.5)+.15*np.sin(2*np.pi*t/2.3))
    if kind == 'fire':
        cr = np.zeros(N); idx = R.integers(0, N, int(N/sr*25))
        for i in idx: s = click(sr, R)*R.uniform(.2, 1); cr[i:i+len(s)] += s[:N-i]
        return _lp(sr, nz(), 600)*.4+cr
    raise ValueError(kind)
