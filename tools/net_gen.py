"""Gera uma rede social sintética (Barabási-Albert) com layout por forças e estatísticas, para vídeos com grafos.
Grava PROJECT/assets/<nome>.json, lido nas cenas com NET.load('<nome>.json').
usage: python net_gen.py PROJECT [n=70] [m=2] [seed=4] [nome=rede]"""
import sys, json, numpy as np
from pathlib import Path
P = Path(sys.argv[1]).resolve(); n = int(sys.argv[2]) if len(sys.argv) > 2 else 70; m = int(sys.argv[3]) if len(sys.argv) > 3 else 2
seed = int(sys.argv[4]) if len(sys.argv) > 4 else 4; name = sys.argv[5] if len(sys.argv) > 5 else 'rede'
rng = np.random.default_rng(seed)
E = set((i, j) for i in range(m+1) for j in range(i+1, m+1)); deg = [m]*(m+1)
for v in range(m+1, n):
    tg = set()
    while len(tg) < m:
        tg.add(int(rng.choice(len(deg), p=np.array(deg)/sum(deg))))
    deg.append(0)
    for u in tg: E.add((u, v)); deg[u] += 1; deg[v] += 1
E = sorted(E); adj = [[] for _ in range(n)]
for a, b in E: adj[a].append(b); adj[b].append(a)
# layout de Fruchterman-Reingold determinístico, em [0,1]^2
pos = rng.random((n, 2)); k = 1/np.sqrt(n); T = .1
for it in range(600):
    d = pos[:, None, :]-pos[None, :, :]; dist = np.linalg.norm(d, axis=2)+1e-9
    rep = (d/dist[..., None]*(k*k/dist)[..., None]).sum(1)
    att = np.zeros_like(pos)
    for a, b in E:
        dv = pos[a]-pos[b]; dd = np.linalg.norm(dv)+1e-9; f = dv/dd*dd*dd/k; att[a] -= f; att[b] += f
    disp = rep+att; ln = np.linalg.norm(disp, axis=1)+1e-9; pos += disp/ln[:, None]*np.minimum(ln, T)[:, None]; pos += (.5-pos)*.01; T *= .993
pos = (pos-pos.min(0))/(pos.max(0)-pos.min(0))
deg = np.array([len(a) for a in adj]); fav = np.array([deg[a].mean() for a in adj])
st = {'n': n, 'edges': len(E), 'media_amigos': float(deg.mean()), 'media_dos_amigos': float((deg**2).sum()/deg.sum()),
      'frac_menos_que_amigos': float((deg < fav).mean()), 'qtd_menos_que_amigos': int((deg < fav).sum()), 'max': int(deg.max())}
json.dump({'pos': pos.round(4).tolist(), 'edges': E, 'deg': deg.tolist(), 'fav': fav.round(3).tolist(), 'stats': st}, open(P/'assets'/f'{name}.json', 'w'))
print(json.dumps(st, indent=1))
# sugestões de pessoa para o exemplo: grau baixo, média dos amigos alta
cand = sorted(range(n), key=lambda i: (deg[i], -fav[i]))[:6]; print('exemplos', [(i, int(deg[i]), round(float(fav[i]), 2), [int(deg[j]) for j in adj[i]]) for i in cand])
