"""Recorte regional do satélite (geo/terra.jpg 5400 px e geo/noite.jpg) para mapas grandes na tela.
Grava geo/<nome>_sat.jpg e geo/<nome>_noite.jpg (ampliados com Lanczos e um pouco de nitidez) e geo/<nome>_crop.json com os limites.
Use no projeto com meta.json "geo": true e "geo_crops": ["<nome>"]; nas cenas: FX.IMG['geo:<nome>_sat.jpg'] e GMAP.region('<nome>').
usage: python geo_crop.py NOME lon0 lon1 lat_norte lat_sul [escala=2]"""
import sys, json
from pathlib import Path
from PIL import Image, ImageFilter
G = Path(__file__).resolve().parent.parent/'geo'
nome, lo0, lo1, la0, la1 = sys.argv[1], *map(float, sys.argv[2:6]); k = float(sys.argv[6]) if len(sys.argv) > 6 else 2
for src, suf, q in (('terra.jpg', 'sat', 90), ('noite.jpg', 'noite', 88)):
    im = Image.open(G/src).convert('RGB'); W, H = im.size
    box = (round((lo0+180)/360*W), round((90-la0)/180*H), round((lo1+180)/360*W), round((90-la1)/180*H))
    c = im.crop(box); c = c.resize((round(c.width*k), round(c.height*k)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.6, 60, 2))
    c.save(G/f'{nome}_{suf}.jpg', quality=q); print(nome, suf, c.size)
json.dump({'lon': [lo0, lo1], 'lat': [la0, la1]}, open(G/f'{nome}_crop.json', 'w'))
