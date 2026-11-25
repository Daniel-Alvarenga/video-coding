"""ORBSOM v2: sonificação das órbitas dos planetas (v3.22, 2026-11-08) — exemplo projetos/orbitas-som/
Motor orbital kepleriano + duas formas de som + mixer, tudo periódico (o ciclo de 36 s fecha em loop perfeito).
A mesma tabela e as mesmas fórmulas estão em engine/orbit.js (ORB), para a imagem bater com o som.

Física: elementos J2000 (JPL, "Approximate Positions of the Planets"): a (UA), e, ϖ (long. do periélio), L0 (long. média).
  M(t) = (L0−ϖ) + 2π·N·t/CICLO   (N = voltas por ciclo, compressão artística: Mercúrio 36 … Netuno 3)
  Kepler: E − e·sen E = M → ν, r = a(1 − e·cos E);  ω = dν/dt = n(1 + e·cos ν)²/(1 − e²)^1,5
  ω_ref = n/√(1 − e²) (média geométrica de periélio e afélio);  Δs = 12·log2(ω/ω_ref) semitons

Modo 'onda' (contínuo): cada planeta é uma voz quente (aditiva + coro) com altura f0·2^(Δs/12) deslizando,
  volume ∝ (a/r)² (mais forte perto do Sol, onda real só nos excêntricos) e lado do estéreo = posição x na órbita (todos ondulam L↔R).
Modo 'notas': cada planeta toca uma nota cada vez que ν cruza um múltiplo de 360°/k (k notas por volta, contadas do periélio).
  Perto do Sol as notas ficam mais juntas (Kepler vira ritmo); a altura é a nota-base + Δs arredondado para a escala (C D E G A B).
  k foi escolhido para cada planeta virar uma voz: Netuno pulso 1/s (baixo), Urano 2/s, Saturno e Júpiter 2/s (harmonia),
  Marte 2,5/s (contratempo 5:2), Terra, Vênus e Mercúrio 4/s (melodia e enfeite). Órbitas quase circulares ficam no tempo;
  as excêntricas (Mercúrio, Marte) "balançam" em volta dele.

uso: python orbsom.py SAIDA   → testes dos dois modos (acorde, camadas, mix do roteiro, emenda, gráfico, números)
     from orbsom import composicao; sr, est, info = composicao('notas'|'onda')
"""
import sys, json, numpy as np
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import fftconvolve, butter, sosfilt

SR = 44100; CICLO = 36.0; NS = int(CICLO*SR)
#            nome        a(UA)     e        ϖ(°)      L0(°)    voltas  período      nota  cor        notas/volta timbre
PLANETAS = [('Mercúrio', 0.38710, 0.20563,  77.456, 252.251, 36, '88 DIAS',   'A4', '#c9c2b8',  4, 'glock'),
            ('Vênus',    0.72333, 0.00677, 131.533, 181.980, 24, '225 DIAS',  'G4', '#f1d39a',  6, 'vibra'),
            ('Terra',    1.00000, 0.01671, 102.937, 100.464, 18, '365 DIAS',  'E4', '#5fa8ff',  8, 'kalimba'),
            ('Marte',    1.52368, 0.09340, 336.041, 355.453, 15, '687 DIAS',  'D4', '#ff7a4d',  6, 'pluck'),
            ('Júpiter',  5.20260, 0.04849,  14.753,  34.404, 12, '11,9 ANOS', 'B3', '#e8b77a',  6, 'marimba'),
            ('Saturno',  9.55491, 0.05551,  92.432,  49.944,  9, '29,4 ANOS', 'G3', '#e9d08f',  8, 'marimba2'),
            ('Urano',   19.21845, 0.04630, 170.964, 313.232,  6, '84 ANOS',   'E3', '#8fe3e0', 12, 'baixo'),
            ('Netuno',  30.11039, 0.00899,  44.971, 304.880,  3, '165 ANOS',  'C3', '#4f7dff', 12, 'sino')]
NOTAS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}; ESCALA = [0, 2, 4, 7, 9, 11]
def midi(n, oit=0): return NOTAS[n[0]]+12*(int(n[1:])+1+oit)
def mhz(m): return 440*2**((m-69)/12)
def quant(m):
    """arredonda para a nota mais próxima da escala C D E G A B"""
    c = np.round(m); best = None
    for d in range(-3, 4):
        x = c+d
        if int(x) % 12 in ESCALA and (best is None or abs(x-m) < abs(best-m)): best = x
    return best

def kepler(M, e):
    E = M.copy()
    for _ in range(30): E = E-(E-e*np.sin(E)-M)/(1-e*np.cos(E))
    return E
def orbita(p, t):
    nome, a, e, w, L0, N = p[:6]; n = 2*np.pi*N/CICLO
    Mu = np.radians(L0-w)+n*t; E = kepler(np.mod(Mu, 2*np.pi), e)
    nu = 2*np.arctan2(np.sqrt(1+e)*np.sin(E/2), np.sqrt(1-e)*np.cos(E/2)); r = a*(1-e*np.cos(E))
    om = n*(1+e*np.cos(nu))**2/(1-e*e)**1.5; ds = 12*np.log2(om/(n/np.sqrt(1-e*e)))
    nu_u = np.mod(nu, 2*np.pi)+2*np.pi*np.floor((Mu-np.mod(Mu, 2*np.pi))/(2*np.pi)+1e-9)   # ν contínuo (cresce sem voltar)
    lon = nu+np.radians(w); return dict(x=r*np.cos(lon), y=r*np.sin(lon), r=r, nu=nu, nu_u=nu_u, om=om, ds=ds)

def eventos(i):
    """instantes (s) e índices das notas do planeta i: ν cruzando múltiplos de 2π/k"""
    p = PLANETAS[i]; t = np.arange(NS)/SR; o = orbita(p, t); k = p[9]
    idx = np.floor(o['nu_u']/(2*np.pi/k)+1e-9); ch = np.nonzero(np.diff(idx))[0]+1
    return ch, o

# ---------- timbres (aditivos, decaimento exponencial; todos da mesma família de percussão afinada) ----------
TIMBRE = {'glock': ([1, 2.76, 5.40, 8.93], [1, .45, .2, .08], [1.4, .6, .3, .15], .002),
          'vibra': ([1, 4.0, 10.0], [1, .28, .07], [2.0, .5, .2], .004),
          'kalimba': ([1, 3.0, 6.2], [1, .22, .07], [1.1, .25, .1], .002),
          'pluck': ([1, 2, 3, 4, 5, 6, 7, 8], [1, .5, .33, .25, .2, .16, .13, .1], [1.3, 1.0, .8, .6, .5, .4, .35, .3], .001),
          'marimba': ([1, 3.93, 9.2], [1, .35, .1], [.9, .15, .06], .003),
          'marimba2': ([1, 3.93, 9.2], [1, .25, .06], [1.4, .2, .07], .004),
          'baixo': ([1, 2, 3], [1, .45, .15], [1.3, .7, .4], .008),
          'sino': None}
def nota(tim, f, vel):
    if tim == 'sino':   # sino grave em FM: aparece no alto-falante do celular pelos harmônicos
        d = 3.0; t = np.arange(int(d*SR))/SR; I = 2.6*np.exp(-t/0.6); env = np.exp(-t/1.1)*np.minimum(1, t/.004)
        return vel*env*np.sin(2*np.pi*f*t+I*np.sin(2*np.pi*1.4*f*t))
    P, A, D, att = TIMBRE[tim]; d = min(3.0, max(D)*4); t = np.arange(int(d*SR))/SR; y = np.zeros_like(t)
    for r, a, dc in zip(P, A, D):
        if r*f < SR/2.2: y += a*np.sin(2*np.pi*r*f*t)*np.exp(-t/dc)
    y *= np.minimum(1, t/att)
    if tim == 'vibra': y *= 1-.18*(1-np.cos(2*np.pi*5.2*t))/2
    return vel*y/np.sum(A)

def camada_notas(i, oit=0):
    p = PLANETAS[i]; ch, o = eventos(i); y = np.zeros(NS); m0 = midi(p[7], oit); lst = []
    for c in ch:
        m = quant(m0+o['ds'][c]); vel = .75+.25*np.clip((p[1]/o['r'][c]-1)/(2*p[2]+1e-6)+.5, 0, 1)
        s = nota(p[10], mhz(m), vel); j = (c+np.arange(len(s))) % NS; np.add.at(y, j, s); lst.append((c/SR, int(m)))
    y /= np.sqrt(np.mean(y**2))+1e-12; y *= (262/mhz(m0))**.2
    return y, lst

def camada_onda(i, oit=0):
    p = PLANETAS[i]; t = np.arange(NS)/SR; o = orbita(p, t); f0 = mhz(midi(p[7], oit)); f = f0*2**(o['ds']/12)
    out = np.zeros(NS)
    for det in (-6, 6):   # coro: duas vozes levemente desafinadas (cents)
        ff = f*2**(det/1200); C = ff.sum()/SR; ff *= round(C)/C; ph = 2*np.pi*np.cumsum(ff)/SR; ph -= ph[0]
        out += sum((1/k**1.7)*np.sin(k*ph) for k in range(1, 7) if k*f0*1.6 < SR/2)
    amp = (p[1]/o['r'])**2; amp /= amp.mean(); out *= amp; out /= np.sqrt(np.mean(out**2)); out *= (262/f0)**.25
    pan = np.cos(np.arctan2(o['y'], o['x']))*.7   # lado do estéreo = posição na órbita
    return out, pan

ENT = [2.5, 7.0, 9.5, 12.0, 16.0, 19.0, 22.0, 24.25]
def ganhos(t):
    """mixer do roteiro: acorde (0–2,5), Mercúrio sozinho, entradas progressivas, anteriores a ~−9 dB, acorde inteiro de 26,5 até 36"""
    G = np.zeros((8, len(t))); sm = lambda a, b, x: np.clip((x-a)/(b-a), 0, 1)**2*(3-2*np.clip((x-a)/(b-a), 0, 1))
    full = np.clip(1-sm(2.3, 2.8, t)+sm(25.5, 27.5, t), 0, 1)
    for i in range(8):
        on = sm(ENT[i]-.05, ENT[i]+.35, t) if i else sm(2.3, 2.6, t); nx = ENT[i+1] if i < 7 else 99
        G[i] = np.maximum(full, on*(1-.65*sm(nx, nx+.6, t)))
    return np.minimum(G, 1)

def reverb_circ(x, sec=2.4, mix=.25, seed=5):
    n = int(sec*SR); ti = np.arange(n)/SR; rng = np.random.default_rng(seed); lp = butter(2, 5200, 'low', fs=SR, output='sos'); out = []
    for s in (0, 1):
        ir = sosfilt(lp, rng.standard_normal(n)*np.exp(-ti/(sec/6.9))); ir /= np.sqrt((ir**2).sum())
        xx = np.concatenate([x[:, s]]*3); out.append(fftconvolve(xx, ir)[NS:2*NS])
    return x+mix*np.stack(out, 1)

PAN = [-.3, .3, -.15, .2, -.35, .35, -.2, .1]
def composicao(modo='notas', oit=0, ganho=None, camadas=None):
    t = np.arange(NS)/SR; G = ganhos(t) if ganho is None else ganho(t); st = np.zeros((NS, 2)); info = []
    for i, p in enumerate(PLANETAS):
        if camadas is not None and i not in camadas: continue
        if modo == 'notas': y, lst = camada_notas(i, oit); pan = np.full(NS, PAN[i]); info.append(lst); g = G[i]*.17
        else: y, pan = camada_onda(i, oit); info.append(None); g = G[i]*.15
        st[:, 0] += y*g*np.sqrt((1-pan)/2); st[:, 1] += y*g*np.sqrt((1+pan)/2)
    if modo == 'notas':   # pad muito baixo com o acorde (dá corpo; não muda com o roteiro)
        pad = sum(np.sin(2*np.pi*(round(mhz(midi(p[7], oit-1))*CICLO)/CICLO)*t) for p in PLANETAS[4:]); pad *= .010*(1+.3*np.sin(2*np.pi*t/CICLO*3))
        if camadas is None: st += pad[:, None]
    hp = butter(2, 60, 'high', fs=SR, output='sos')
    for c in (0, 1): st[:, c] = sosfilt(hp, np.concatenate([st[:, c]]*3))[NS:2*NS]
    out = reverb_circ(st, mix=.28 if modo == 'notas' else .22)
    pk = np.max(np.abs(out)); out = out/pk*.89
    return SR, out, info

def wav(path, x): wavfile.write(str(path), SR, (np.clip(x, -1, 1)*32767).astype(np.int16))

if __name__ == '__main__':
    S = Path(sys.argv[1]); S.mkdir(parents=True, exist_ok=True); NUM = {}; tudo = lambda t: np.ones((8, len(t)))
    for modo, oit in (('notas', 0), ('onda', 0)):
        D = S/f'audio_{modo}'; D.mkdir(exist_ok=True)
        _, mix, info = composicao(modo, oit); wav(D/'mix_roteiro_36s.wav', mix)
        _, ac, _ = composicao(modo, oit, ganho=tudo); wav(D/'acorde_completo_36s.wav', ac)
        for i, p in enumerate(PLANETAS):
            _, so, _ = composicao(modo, oit, ganho=tudo, camadas=[i]); dur = max(6.0, CICLO/p[5]*3)
            wav(D/f'{i+1}_{p[0].lower()}.wav', so[:int(dur*SR)])
        wav(D/'teste_emenda_loop.wav', np.concatenate([mix[-3*SR:], mix[:3*SR]]))
        d = np.abs(np.diff(mix[:, 0])); NUM[modo] = dict(salto_emenda=float(abs(mix[0, 0]-mix[-1, 0])), maior_passo=float(d.max()))
        if modo == 'notas':
            NUM['notas_por_planeta'] = [dict(planeta=p[0], voltas=p[5], notas_por_volta=p[9], notas_no_video=len(l), por_segundo=round(len(l)/CICLO, 2),
                                             notas_usadas=sorted(set(m for _, m in l)), intervalo_min_s=round(float(np.min(np.diff([x for x, _ in l]))), 3),
                                             intervalo_max_s=round(float(np.max(np.diff([x for x, _ in l]))), 3)) for p, l in zip(PLANETAS, info)]
            json.dump({p[0]: [round(x, 4) for x, _ in l] for p, l in zip(PLANETAS, info)}, open(S/'eventos_notas.json', 'w', encoding='utf-8'), ensure_ascii=False)
    t = np.arange(NS)/SR; T2 = np.array([0, CICLO]); orb = []
    for p in PLANETAS:
        o = orbita(p, t); oe = orbita(p, T2)
        orb.append(dict(planeta=p[0], voltas=p[5], variacao_semitons=round(float(o['ds'].max()-o['ds'].min()), 2), teorico=round(24*np.log2((1+p[2])/(1-p[2])), 2),
                        erro_posicao_loop_UA=float(np.hypot(oe['x'][1]-oe['x'][0], oe['y'][1]-oe['y'][0]))))
    NUM['orbitas'] = orb; json.dump(NUM, open(S/'numeros.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in NUM.items() if k != 'orbitas'}, ensure_ascii=False, indent=0)[:4000])
