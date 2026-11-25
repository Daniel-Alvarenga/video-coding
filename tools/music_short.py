"""Generic Shorts score: 112 bpm soft kick/hat, bass pulse, pad per scene, whoosh on each swipe.
Run inside PROJECT (reads plan.json, writes music.wav)."""
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile

SR = 44100
import json
PLAN=json.load(open('plan.json'))
DURS = PLAN['dur']
STARTS = [sum(DURS[:i]) for i in range(len(DURS))]
TOTAL = float(sum(DURS))
N = int(SR * TOTAL)
t = np.arange(N) / SR
rng = np.random.default_rng(7)

dry = np.zeros((N, 2))
wet = np.zeros((N, 2))  # vai para a reverb


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r, sustain_len):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, int(sustain_len * SR))
    e = np.concatenate([
        np.linspace(0, 1, a_n, endpoint=False),
        np.linspace(1, s, d_n, endpoint=False),
        np.full(s_n, s),
        np.linspace(s, 0, r_n),
    ])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))


def add(sig, start, gain=1.0, pan=0.0, send=0.3):
    i0 = int(start * SR)
    if i0 >= N:
        return
    sig = sig[: N - i0]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dry[i0:i0 + len(sig), 0] += sig * gain * l
    dry[i0:i0 + len(sig), 1] += sig * gain * r
    wet[i0:i0 + len(sig), 0] += sig * gain * send * l
    wet[i0:i0 + len(sig), 1] += sig * gain * send * r


def bell(freq, dur=3.5):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 1.6), (2.76, .45, .9), (5.4, .25, .5), (8.93, .12, .3), (2.0, .2, 1.2)]:
        out += amp * np.sin(2 * np.pi * freq * ratio * tt) * np.exp(-tt / dec)
    out *= np.minimum(1, tt / .004)
    return out / 1.8


def pluck(freq, dur=2.2, bright=10):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, bright + 1):
        out += (1 / k) * np.sin(2 * np.pi * freq * k * tt) * np.exp(-tt * (1.2 + .6 * k))
    return out * np.minimum(1, tt / .003) * .6


def whoosh(dur=1.6, rise=True):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    tt = np.linspace(0, 1, n)
    out = np.zeros(n)
    # filtro passa-banda que sobe: processado em blocos
    blocks = 32
    for b in range(blocks):
        a, z = b * n // blocks, (b + 1) * n // blocks
        fc = 300 + 5000 * (b / blocks if rise else 1 - b / blocks)
        sos = butter(2, [fc * .6, min(fc * 1.6, 20000)], btype='band', fs=SR, output='sos')
        out[a:z] = sosfilt(sos, noise[max(0, a - 2000):z])[-(z - a):]
    shape = np.sin(np.pi * tt) ** 2
    return out * shape * .5



from scipy.signal import fftconvolve as fconv
BITS=PLAN['bits']
def pop(b,n=12): return sum((b>>i)&1 for i in range(n))
PENTA=[0,2,4,7,9]
def note_for(idx):  # idx em -12..12 -> pentatônica de Lá menor-ish
    o,d=divmod(idx+15,5); return 57+12*(o-3)+PENTA[d]


BPM=112;beat=60/BPM
PAL=[[45,57,64,69,72],[41,53,60,65,69],[48,55,64,67,72],[43,55,62,67,71],[46,53,62,65,69],[45,57,64,69,76]]
CH=[PAL[i%len(PAL)] for i in range(len(STARTS))]
pad=np.zeros((N,2))
for si,chord in enumerate(CH):
    s0=STARTS[si];s1=STARTS[si+1] if si+1<len(STARTS) else TOTAL;i0,i1=int(max(0,s0-.3)*SR),int(min(TOTAL,s1+.5)*SR);tt=t[i0:i1]
    for j,m in enumerate(chord):
        f=mtof(m)
        for side,det in ((0,-.2),(1,.2)):pad[i0:i1,side]+=np.sin(2*np.pi*(f+det)*tt+j)*(1.2 if j==0 else 1)/len(chord)
    fade=np.ones(i1-i0);k=int(.3*SR);fade[:k]=np.linspace(0,1,k);fade[-int(.5*SR):]*=np.linspace(1,0,int(.5*SR));pad[i0:i1]*=fade[:,None]
pad=sosfilt(butter(2,1400,btype='low',fs=SR,output='sos'),pad,axis=0);dry+=pad*.13;wet+=pad*.08
def kick():
    tt=np.arange(int(.35*SR))/SR;return np.sin(2*np.pi*(48+90*np.exp(-tt*30))*tt)*np.exp(-tt*9)
def hat():
    n=int(.06*SR);x=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*70);return sosfilt(butter(2,7000,btype='high',fs=SR,output='sos'),x)
tb=0.;k=0
while tb<TOTAL-2.5:
    intro=tb<STARTS[1]-.5
    if not intro or tb>2.6:
        if k%2==0: add(kick(),tb,.42,0,.05)
        add(hat(),tb+beat/2,.12,.3,.1)
        if k%4==2: add(hat(),tb,.08,-.3,.1)
    si=max(i for i in range(len(STARTS)) if STARTS[i]<=tb);root=CH[si][0]
    add(pluck(mtof(root+12),beat*1.2,3),tb,.18 if not intro else .1,0,.15)
    if k%2==1: add(pluck(mtof(CH[si][2+(k//2)%3]+12),beat,5),tb,.07,(k%3-1)*.4,.4)
    tb+=beat;k+=1
for si in range(1,len(STARTS)): add(whoosh(.8),STARTS[si]-.4,.22,0,.4);add(bell(mtof(CH[si][3]+12)),STARTS[si],.16,0,.5)
add(bell(mtof(81)),0,.25,0,.6);add(bell(mtof(88)),.1,.15,.2,.7)
# ---- add punch cues for big reveals here, e.g. bells at STARTS[k]+t
# ---------- master ----------
ir_len=int(3.2*SR);ti=np.arange(ir_len)/SR
ir=np.stack([rng.standard_normal(ir_len),rng.standard_normal(ir_len)],1)*np.exp(-ti/.75)[:,None]
ir=sosfilt(butter(1,6000,btype='low',fs=SR,output='sos'),ir,axis=0);ir/=np.sqrt((ir**2).sum(0))
rev=np.stack([fftconvolve(wet[:,c],ir[:,c])[:N] for c in range(2)],1)
mix=dry+rev*.9;mix=sosfilt(butter(2,30,btype='high',fs=SR,output='sos'),mix,axis=0)
fo=int(2.5*SR);mix[-fo:]*=np.linspace(1,0,fo)[:,None]**2
mix/=np.max(np.abs(mix))+1e-9;mix=np.tanh(mix*1.4)/np.tanh(1.4)*.89
wavfile.write('music.wav',SR,(mix*32767).astype(np.int16))
for a,b in zip(STARTS,STARTS[1:]+[TOTAL]):
    seg=mix[int(a*SR):int(b*SR)];print(a,'rms %.3f'%np.sqrt((seg**2).mean()))
