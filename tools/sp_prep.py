"""Satélite de São Paulo e da Baixada Santista para engine/road3d.js (ROAD3D).
Baixa blocos Sentinel-2 cloudless 2016 (EOX, CC BY 4.0: "Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH
(Contains modified Copernicus Sentinel data 2016)") e monta dois recortes em kit/geo/sp/:
  sp_perto.jpg   z14 (~9,5 m/px), planalto de SP em volta da Imigrantes (cena do drone e do chão)
  sp_regiao.jpg  z12 (~38 m/px), de SP até o litoral (vista de cima e mapa SP–Santos)
  sp.json        limites (lon/lat) de cada recorte em Web Mercator, para o road3d colar a imagem na esfera da Terra
usage: python sp_prep.py"""
import json, math, urllib.request, io
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
D = Path(__file__).resolve().parent.parent/'geo'/'sp'; (D/'s2').mkdir(parents=True, exist_ok=True)
URL = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'
REC = {'sp_perto': (14, -46.70, -46.50, -23.82, -23.60), 'sp_regiao': (12, -47.00, -45.95, -24.15, -23.35)}
def tile(lon, lat, z):
    n = 2**z; la = math.radians(lat); return (lon+180)/360*n, (1-math.log(math.tan(la)+1/math.cos(la))/math.pi)/2*n
def lonlat(x, y, z):
    n = 2**z; return x/n*360-180, math.degrees(math.atan(math.sinh(math.pi*(1-2*y/n))))
def get(a):
    z, x, y = a; f = D/'s2'/f'{z}_{x}_{y}.jpg'
    if not f.exists() or f.stat().st_size < 2000:
        f.write_bytes(urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=60).read())
    return f
info = {}
for nome, (z, w, e, s, n) in REC.items():
    x0, y0 = tile(w, n, z); x1, y1 = tile(e, s, z); X = range(int(x0), int(x1)+1); Y = range(int(y0), int(y1)+1)
    with ThreadPoolExecutor(8) as ex: fs = list(ex.map(get, [(z, x, y) for y in Y for x in X]))
    ts = 256; im = Image.new('RGB', (len(X)*ts, len(Y)*ts))
    for f in fs:
        _, x, y = f.stem.split('_'); im.paste(Image.open(f).convert('RGB'), ((int(x)-X[0])*ts, (int(y)-Y[0])*ts))
    im.save(D/f'{nome}.jpg', quality=90)
    lw, ln = lonlat(X[0], Y[0], z); le, ls = lonlat(X[-1]+1, Y[-1]+1, z)
    info[nome] = {'z': z, 'w': lw, 'e': le, 'n': ln, 's': ls, 'px': im.size}
    print(nome, im.size, info[nome])
info['credito'] = 'Satélite: Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016), CC BY 4.0.'
(D/'sp.json').write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding='utf-8')
