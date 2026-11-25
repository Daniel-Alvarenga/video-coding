"""Prepara os dados geográficos do kit (uma vez): texturas NASA reduzidas e fronteiras Natural Earth compactas.
Fontes (domínio público): NASA Blue Marble (terra.jpg, julho 2004), NASA Black Marble 2016 (noite.jpg), Blue Marble clouds (nuvens.jpg),
Natural Earth 1:50m admin 0 countries (paises50.geojson), NASA SVS CGI Moon Kit (lua.jpg, LROC, svs.gsfc.nasa.gov/4720).  usage: python geo_prep.py  -> geo/paises.json, geo/*_web.jpg"""
import json
from pathlib import Path
from PIL import Image
G = Path(__file__).resolve().parent.parent/'geo'
for src, dst, w in (('terra.jpg', 'terra_web.jpg', 4096), ('noite.jpg', 'noite_web.jpg', 3600), ('nuvens.jpg', 'nuvens_web.jpg', 2048), ('lua.jpg', 'lua_web.jpg', 2048)):
    im = Image.open(G/src).convert('RGB'); im = im.resize((w, w//2), Image.LANCZOS); im.save(G/dst, quality=88); print(dst, (G/dst).stat().st_size)
d = json.load(open(G/'paises50.geojson', encoding='utf-8')); out = []
for f in d['features']:
    p = f['properties']; g = f['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    rings = []
    for poly in polys:
        for ring in poly[:1]:  # só o contorno externo
            r = []; last = None
            for lon, lat in ring:
                q = (round(lon, 2), round(lat, 2))
                if q != last: r.append(q); last = q
            if len(r) > 3: rings.append(r)
    out.append({'n': p.get('NAME_PT') or p.get('NAME'), 'e': p.get('NAME_EN') or p.get('NAME'), 'iso': p.get('ADM0_A3'), 'lx': p.get('LABEL_X'), 'ly': p.get('LABEL_Y'), 'r': rings})
json.dump(out, open(G/'paises.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); print('paises.json', (G/'paises.json').stat().st_size, len(out))
