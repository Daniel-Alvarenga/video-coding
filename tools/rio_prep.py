"""Prepara os dados do Rio em 3D (engine/rio3d.js) a partir dos downloads em kit/geo/rio/:
  dem/13_x_y.png   blocos de relevo terrarium (AWS Open Data / SRTM + GEBCO, domínio público): altitude = R·256 + G + B/256 − 32768
  s2/14_x_y.jpg    Sentinel-2 cloudless 2016 (EOX, CC BY 4.0: "Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH
                   (Contains modified Copernicus Sentinel data 2016)")
  osm_predios.json prédios do OpenStreetMap (Overpass; © colaboradores do OpenStreetMap, ODbL)
Saída (kit/geo/rio/): rio_alt.png (altitude em 16 bits nos canais R e G: v = (h+200)·10), rio_sat.jpg, rio_predios.json, rio.json (limites e escala).
Coordenadas locais em metros: x para leste, z para o sul, origem em LAT0/LON0 (meio da Urca/Botafogo).
usage: python rio_prep.py"""
import json, math, glob, re
import numpy as np
from pathlib import Path
from PIL import Image
D = Path(__file__).resolve().parent.parent/'geo'/'rio'
W_, E_, S_, N_ = -43.300, -43.150, -23.000, -22.915
LAT0, LON0 = -22.9575, -43.225
MX = math.cos(math.radians(LAT0))*111320; MZ = 110574
def merc(lon, lat, z):
    n = 2**z; la = np.radians(lat); return (lon+180)/360*n, (1-np.log(np.tan(la)+1/np.cos(la))/np.pi)/2*n
def mosaic(folder, z, ext, dec):
    fs = glob.glob(str(D/folder/f'{z}_*_*.{ext}')); xs = sorted({int(re.findall(r'_(\d+)_', f)[0]) for f in fs}); ys = sorted({int(Path(f).stem.split('_')[2]) for f in fs})
    t0 = Image.open(fs[0]); ts = t0.size[0]; A = None
    for f in fs:
        _, x, y = Path(f).stem.split('_')
        try: im = dec(Image.open(f))
        except Exception: print('bloco ilegível (ainda baixando?)', f); continue
        if A is None: A = np.zeros(((ys[-1]-ys[0]+1)*ts, (xs[-1]-xs[0]+1)*ts)+im.shape[2:], im.dtype)
        A[(int(y)-ys[0])*ts:(int(y)-ys[0]+1)*ts, (int(x)-xs[0])*ts:(int(x)-xs[0]+1)*ts] = im
    return A, xs[0], ys[0], ts
def sample(A, x0, y0, ts, z, lon, lat):
    """amostra bilinear do mosaico em (lon, lat) (grades numpy)"""
    fx, fy = merc(lon, lat, z); px = (fx-x0)*ts-.5; py = (fy-y0)*ts-.5
    i = np.clip(np.floor(px).astype(int), 0, A.shape[1]-2); j = np.clip(np.floor(py).astype(int), 0, A.shape[0]-2); u = np.clip(px-i, 0, 1); v = np.clip(py-j, 0, 1)
    if A.ndim == 3: u = u[..., None]; v = v[..., None]
    return A[j, i]*(1-u)*(1-v)+A[j, i+1]*u*(1-v)+A[j+1, i]*(1-u)*v+A[j+1, i+1]*u*v
# limites em metros
xw, xe = (W_-LON0)*MX, (E_-LON0)*MX; zn, zs = -(N_-LAT0)*MZ, -(S_-LAT0)*MZ
# relevo: grade de 12 m
STEP = 12.; nx = int((xe-xw)/STEP)+1; nz = int((zs-zn)/STEP)+1
gx, gz = np.meshgrid(xw+np.arange(nx)*STEP, zn+np.arange(nz)*STEP)
lon = LON0+gx/MX; lat = LAT0-gz/MZ
dem, x0, y0, ts = mosaic('dem', 13, 'png', lambda im: (lambda a: a[..., 0]*256.+a[..., 1]+a[..., 2]/256.-32768)(np.asarray(im.convert('RGB'), np.float64)))
H = sample(dem, x0, y0, ts, 13, lon, lat)
# o relevo de 30 m mistura prédios e borra a costa (rampa falsa mar adentro): corrige com a imagem de satélite
from scipy import ndimage
s2m, sx0, sy0, sts = mosaic('s2', 14, 'jpg', lambda im: np.asarray(im.convert('RGB'), np.float32))
C = sample(s2m, sx0, sy0, sts, 14, lon, lat); r, g, b = C[..., 0], C[..., 1], C[..., 2]; lum = (r+g+b)/3
water = (b > r+3) & (b > g-6) & (lum < 140) & (lum > 1) & (H < 25)   # mar e lagoa: azul (a mata é verde e alta)
water = ndimage.binary_opening(water, iterations=1); water = ndimage.binary_closing(water, iterations=2)
lab, nl = ndimage.label(water); sizes = ndimage.sum(water, lab, range(1, nl+1)); water = np.isin(lab, 1+np.flatnonzero(sizes > 400))  # só corpos d'água grandes
dsea = ndimage.distance_transform_edt(water)*STEP; dland = ndimage.distance_transform_edt(~water)*STEP
Hg = ndimage.gaussian_filter(ndimage.grey_opening(H, size=(35, 35)), 3)   # chão sem prédios (janela de 420 m)
bump = H-Hg; kb = np.clip((bump-25)/35, 0, 1); kb = kb*kb*(3-2*kb)
Hl = Hg+bump*kb                                                            # o que sobe mais de ~40 m é morro, não prédio
flat = np.clip((55-Hl)/25, 0, 1); dl2 = ndimage.distance_transform_edt(~water)*STEP
Hl = Hl*(1-flat)+np.minimum(Hl, 2.5+dl2*.008)*flat                        # bairros planos (Copacabana, Ipanema, Botafogo): chão de verdade, 2 a 10 m
# o SRTM de 30 m achata os cumes estreitos: devolve a altitude oficial de cada pico com um morro gaussiano no topo
for la, lo, real, sg in ((-22.9493, -43.1546, 396, 85), (-22.9512, -43.1630, 220, 110), (-22.9519, -43.2105, 710, 120), (-22.9395, -43.2856, 1021, 160), (-22.9975, -43.2846, 844, 140)):
    x = (lo-LON0)*MX; z = -(la-LAT0)*MZ; ci = int((x-xw)/STEP); cj = int((z-zn)/STEP); r = 34
    w = Hl[cj-r:cj+r, ci-r:ci+r]; jj, ii = np.unravel_index(w.argmax(), w.shape); J, I = cj-r+jj, ci-r+ii; dfc = real-Hl[J, I]
    if dfc > 0: yy, xx = np.mgrid[0:nz, 0:nx]; Hl += dfc*np.exp(-((yy-J)**2+(xx-I)**2)*STEP*STEP/(2*sg*sg))
Hl = np.where(dland < 140, np.minimum(Hl, .4+dland*.022), Hl)   # areia subindo da água até o calçadão
depth = -(.3+np.minimum(dsea*.03, 6)+np.maximum(0, dsea-200)*.012)  # fundo: 1:33 perto da praia, depois mais suave
H = np.where(water, np.minimum(depth, np.where(H < -1, H, 0)), np.maximum(Hl, .4))
Hs = ndimage.gaussian_filter(H, 1.6); H = np.where(np.abs(H) < 8, Hs, H)   # costa sem degraus da grade
v = np.clip(np.round((H+200)*10), 0, 65535).astype(np.uint32)
Image.fromarray(np.dstack([(v >> 8).astype(np.uint8), (v & 255).astype(np.uint8), np.zeros_like(v, np.uint8)])).save(D/'rio_alt.png')
print('relevo', nx, 'x', nz, 'min', round(float(H.min())), 'max', round(float(H.max())))
# satélite: 4 m por pixel na tela final (o Sentinel tem ~10 m)
SS = 4.; sx = int((xe-xw)/SS); sz = int((zs-zn)/SS)
gx, gz = np.meshgrid(xw+(np.arange(sx)+.5)*SS, zn+(np.arange(sz)+.5)*SS)
s2, x0, y0, ts = mosaic('s2', 14, 'jpg', lambda im: np.asarray(im.convert('RGB'), np.float32))
I = sample(s2, x0, y0, ts, 14, LON0+gx/MX, LAT0-gz/MZ)
Image.fromarray(np.clip(I, 0, 255).astype(np.uint8)).save(D/'rio_sat.jpg', quality=90)
print('satélite', sx, 'x', sz)
# prédios: polígono em metros + altura (andares × 3,1 m, altura do OSM ou estimativa pela área e pela distância da orla)
osm = json.load(open(D/'osm_predios.json', encoding='utf-8'))['elements']; rng = np.random.default_rng(3); out = []
def shore_dist(x, z):  # orla de Copacabana/Leme aproximada por segmentos (lon, lat)
    P = [(-43.1890, -22.9870), (-43.1830, -22.9790), (-43.1770, -22.9710), (-43.1710, -22.9650), (-43.1655, -22.9625)]
    Q = [((a-LON0)*MX, -(b-LAT0)*MZ) for a, b in P]; best = 1e9
    for (ax, az), (bx, bz) in zip(Q, Q[1:]):
        dx, dz = bx-ax, bz-az; t = max(0, min(1, ((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz))); best = min(best, math.hypot(x-ax-t*dx, z-az-t*dz))
    return best
for e in osm:
    g = e.get('geometry'); tg = e.get('tags', {})
    if not g or len(g) < 4: continue
    pts = [((p['lon']-LON0)*MX, -(p['lat']-LAT0)*MZ) for p in g]; xs = [p[0] for p in pts]; zs_ = [p[1] for p in pts]
    area = abs(sum(pts[i][0]*pts[i+1][1]-pts[i+1][0]*pts[i][1] for i in range(len(pts)-1)))/2
    if area < 12: continue
    h = None
    try:
        if 'height' in tg: h = float(re.findall(r'[\d.]+', tg['height'])[0])
        elif 'building:levels' in tg: h = float(re.findall(r'[\d.]+', tg['building:levels'])[0])*3.1+1
    except Exception: h = None
    if h is None:
        cx, cz = sum(xs)/len(xs), sum(zs_)/len(zs_); sd = shore_dist(cx, cz)
        if area > 250 and sd < 160: h = 30+rng.random()*18        # primeira quadra da praia: 10 a 15 andares
        elif area > 300 and sd < 900: h = 18+rng.random()*20
        elif area > 120: h = 7+rng.random()*10
        else: h = 3.5+rng.random()*3                               # casas e morros
    out.append([round(h, 1)]+[round(c, 1) for p in pts[:-1] for c in p])
json.dump(out, open(D/'rio_predios.json', 'w'), separators=(',', ':'))
json.dump({'lat0': LAT0, 'lon0': LON0, 'mx': MX, 'mz': MZ, 'x0': xw, 'x1': xe, 'z0': zn, 'z1': zs, 'step': STEP, 'nx': nx, 'nz': nz, 'sat': [sx, sz, SS],
           'credito': 'Relevo: AWS Terrain Tiles (SRTM, GEBCO). Satélite: Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016), CC BY 4.0. Prédios: © colaboradores do OpenStreetMap (ODbL).'},
          open(D/'rio.json', 'w'), ensure_ascii=False, indent=1)
print('prédios', len(out))
