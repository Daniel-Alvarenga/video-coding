"""Add morph swishes / pops / ticks from logged events. usage: python3 sfx.py PROJECT LANG"""
import json,sys,numpy as np
from scipy.io import wavfile
from scipy.signal import butter,sosfilt
from pathlib import Path
P=Path(sys.argv[1]).resolve();lang=sys.argv[2];ev=json.load(open(P/f'v-{lang}.mp4.events.json'))
sr,a=wavfile.read(P/f'audio_{lang}.wav');a=a.astype(np.float64)/32767;N=len(a)
rng=np.random.default_rng(5);fx=np.zeros((N,2))
PENT=[0,2,4,7,9]
def put(sig,t,g,pan):
    i=int(t*sr);
    if i>=N:return
    s=sig[:N-i];l,r=np.cos((pan+1)*np.pi/4),np.sin((pan+1)*np.pi/4);fx[i:i+len(s),0]+=s*g*l;fx[i:i+len(s),1]+=s*g*r
def blip(f,d=.12):
    tt=np.arange(int(d*sr))/sr;return (np.sin(2*np.pi*f*tt)+.25*np.sin(4*np.pi*f*tt))*np.exp(-tt*38)*np.minimum(1,tt/.002)
def swish(d=.55):
    n=int(d*sr);x=rng.standard_normal(n);x=sosfilt(butter(2,[1500,6000],btype='band',fs=sr,output='sos'),x);tt=np.linspace(0,1,n);return x*np.sin(np.pi*tt)**2*.5
last={}
for T,kind,val in ev:
    if kind=='pop':
        o,d=divmod(int(val)%15,5);f=880*2**((12*o+PENT[d])/12)/2;put(blip(f),T,.05,rng.uniform(-.4,.4))
    elif kind=='morph':
        put(swish(),T,.12,0);put(blip(1318.5,.5)*.6,T+.45,.05,.2)
    elif kind=='in':
        put(blip(1760,.06),T+.05,.035,-.2)
mix=a+fx;mix/=max(1,np.max(np.abs(mix))/.97)
wavfile.write(P/f'final_{lang}.wav',sr,(mix*32767).astype(np.int16));print(lang,len(ev),'events')
