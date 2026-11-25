"""Assemble PROJECT/page.html from the template + PROJECT/scenes.js + plan.json + meta.json.
meta.json: {"theme":"noite"|"papel"|"lousa" (default noite), "mode":"long"|"short", "format":"landscape"|"vertical","title":..., "eyebrow":..., "h1":..., "lede":..., "dl_en":..., "dl_pt":...}
usage: python3 build.py PROJECT"""
import sys, json, re, subprocess
from pathlib import Path
KIT = Path(__file__).resolve().parent.parent
P = Path(sys.argv[1]).resolve()
meta = json.load(open(P/'meta.json')); plan = json.load(open(P/'plan.json'))
sys.path.insert(0, str(P)); from lines import LINES
_txt = {'en': [L[2] for L in LINES], 'pt': [L[4] for L in LINES]}
tpl = open(KIT/'engine'/f"template_{meta['mode']}.html").read()
sc = open(P/'scenes.js').read().replace('__PLAN__', json.dumps({'dur': plan['dur'], 'caps': plan['caps'], 'sched': plan['sched'], 'txt': _txt}, ensure_ascii=False))
th = meta.get('theme', 'noite'); TH = KIT/'engine'/'themes'
# imagens do projeto (PROJECT/assets/*): embutidas como data URI para não "sujar" o canvas no render
import base64, mimetypes
MIME = {'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif'}
assets = {f.name: f'data:{MIME[f.suffix.lower()]};base64,'+base64.b64encode(f.read_bytes()).decode()
          for f in sorted((P/'assets').glob('*')) if f.suffix.lower() in MIME} if (P/'assets').is_dir() else {}
geo = ''
if meta.get('geo'):  # globo com satélite real + fronteiras (engine/earth.js, dados em KIT/geo)
    GD = KIT/'geo'
    for k in ('terra', 'noite', 'nuvens'):
        assets[f'geo:{k}.jpg'] = 'data:image/jpeg;base64,'+base64.b64encode((GD/f'{k}_web.jpg').read_bytes()).decode()
    if (GD/'lua_web.jpg').exists(): assets['geo:lua.jpg'] = 'data:image/jpeg;base64,'+base64.b64encode((GD/'lua_web.jpg').read_bytes()).decode()
    for k in ('titan', 'encelado'):  # mapas da Cassini (engine/saturn.js)
        if (GD/f'{k}_web.jpg').exists(): assets[f'geo:{k}.jpg'] = 'data:image/jpeg;base64,'+base64.b64encode((GD/f'{k}_web.jpg').read_bytes()).decode()
    if meta.get('planet_maps', True):  # mapas reais dos planetas (geo/planetas/<k>_web.jpg, Solar System Scope CC BY 4.0) -> geo:pl_<k>.jpg (engine/planets.js)
        for f in sorted((GD/'planetas').glob('*_web.jpg')): assets[f"geo:pl_{f.name[:-8]}.jpg"] = 'data:image/jpeg;base64,'+base64.b64encode(f.read_bytes()).decode()
    for k in meta.get('geo_crops', []):  # recortes regionais (tools/geo_crop.py): geo:<k>_sat.jpg, geo:<k>_noite.jpg e limites em __CROPS__
        for suf in ('sat', 'noite'):
            if (GD/f'{k}_{suf}.jpg').exists(): assets[f'geo:{k}_{suf}.jpg'] = 'data:image/jpeg;base64,'+base64.b64encode((GD/f'{k}_{suf}.jpg').read_bytes()).decode()
    crops = {k: json.loads((GD/f'{k}_crop.json').read_text()) for k in meta.get('geo_crops', []) if (GD/f'{k}_crop.json').exists()}
    geo = chr(10)+'const __CROPS__='+json.dumps(crops)+';'+chr(10)+'const __GEO__='+(GD/'paises.json').read_text(encoding='utf-8')+';'+chr(10)+open(KIT/'engine'/'earth.js', encoding='utf-8').read()
# relevo real (meta.json "dem": ["everest"] -> kit/geo/everest.json), lido por IMP.dem(nome) em engine/impact.js
dem = chr(10)+'const __DEM__='+json.dumps({k: json.loads((KIT/'geo'/f'{k}.json').read_text(encoding='utf-8')) for k in meta.get('dem', [])})+';'
data = {f.name: json.loads(f.read_text(encoding='utf-8')) for f in sorted((P/'assets').glob('*.json'))} if (P/'assets').is_dir() else {}
if meta.get('rio3d'):
    RD = KIT/'geo'/'rio'
    assets['geo:rio_alt.png'] = 'data:image/png;base64,'+base64.b64encode((RD/'rio_alt.png').read_bytes()).decode()
    assets['geo:rio_sat.jpg'] = 'data:image/jpeg;base64,'+base64.b64encode((RD/'rio_sat.jpg').read_bytes()).decode()
if meta.get('road3d'):  # estrada que vira para cima (engine/road3d.js = ROAD3D): carro, asfalto, céu e satélite de SP (tools/sp_prep.py)
    AD = KIT/'assets'
    meta['models'] = list(dict.fromkeys(['carro/CarConcept.glb']+meta.get('models', [])))
    for k in ('diff', 'nor', 'rough'): assets[f'road:asfalto_{k}.jpg'] = 'data:image/jpeg;base64,'+base64.b64encode((AD/'estrada'/f'asfalto_{k}.jpg').read_bytes()).decode()
    assets['road:ceu.jpg'] = 'data:image/jpeg;base64,'+base64.b64encode((AD/'ceu'/'ceu_web.jpg').read_bytes()).decode()
    for k in ('sp_perto', 'sp_regiao'):
        assets[f'sp:{k}.jpg'] = 'data:image/jpeg;base64,'+base64.b64encode((KIT/'geo'/'sp'/f'{k}.jpg').read_bytes()).decode()
        assets[f'sp:{k}_rough.png'] = 'data:image/png;base64,'+base64.b64encode((KIT/'geo'/'sp'/f'{k}_rough.png').read_bytes()).decode()  # água lisa (máscara do sp_prep)
pre = ('const __BRAND__='+json.dumps(meta.get('brand', {}))+';'+chr(10)+'const __ASSETS__='+json.dumps(assets)+';'+chr(10)+'const __DATA__='+json.dumps(data)+';'+chr(10)
       +open(KIT/'engine'/'fx.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'net.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'studio.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'space.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'walk.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'chem.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'phys.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'bio.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'flow.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'world3d.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'landmarks.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'atom.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'planets.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'cosmos.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'galmap.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'galmove.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'blackhole.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'star.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'rank.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'probe.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'mesh.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'scope.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'saturn.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'scale.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'epi.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'solids.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'hyper.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'brand.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'traffic3d.js', encoding='utf-8').read()+dem+chr(10)+open(KIT/'engine'/'impact.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'mare.js', encoding='utf-8').read()+geo)
if meta.get('rio3d'):  # Rio em 3D (engine/rio3d.js; dados de tools/rio_prep.py em KIT/geo/rio)
    RD = KIT/'geo'/'rio'
    _rio = json.loads((RD/'rio.json').read_text(encoding='utf-8')); _rio['predios'] = json.loads((RD/'rio_predios.json').read_text())
    pre += chr(10)+'const __RIO__='+json.dumps(_rio, separators=(',', ':'))+';'+chr(10)+open(KIT/'engine'/'rio3d.js', encoding='utf-8').read()
if meta.get('models'):  # modelos 3D abertos (kit/assets/<pasta>/<arquivo>.glb, ver LICENCA.txt), lidos por IRIS.loadModel(nome do arquivo)
    pre += chr(10)+'const __MODELS__='+json.dumps({Path(m).name: base64.b64encode((KIT/'assets'/m).read_bytes()).decode() for m in meta['models']})+';'
if meta.get('rocket3d'):  # Saturno V e missão Apollo em 3D (three.js r147 local em kit/vendor, engine/rocket3d.js = ROCKET)
    VD = KIT/'vendor'/'three-r147'
    pre += chr(10)+chr(10).join(open(VD/f, encoding='utf-8').read() for f in ('three.min.js', 'CopyShader.js', 'LuminosityHighPassShader.js', 'Pass.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js', 'GLTFLoader.js'))+chr(10)+open(KIT/'engine'/'rocket3d.js', encoding='utf-8').read()
if meta.get('road3d'):
    VD = KIT/'vendor'/'three-r147'
    if not meta.get('rocket3d'): pre += chr(10)+chr(10).join(open(VD/f, encoding='utf-8').read() for f in ('three.min.js', 'CopyShader.js', 'LuminosityHighPassShader.js', 'Pass.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js', 'GLTFLoader.js'))
    pre += chr(10)+'const __SP__='+(KIT/'geo'/'sp'/'sp.json').read_text(encoding='utf-8')+';'+chr(10)+open(KIT/'engine'/'road3d.js', encoding='utf-8').read()
if meta.get('vox3d'):  # mundo de voxels 3D (engine/vox3d.js = VOX, three.js r147): corredor Terra x Lua
    VD = KIT/'vendor'/'three-r147'
    if not (meta.get('rocket3d') or meta.get('road3d')): pre += chr(10)+chr(10).join(open(VD/f, encoding='utf-8').read() for f in ('three.min.js', 'CopyShader.js', 'LuminosityHighPassShader.js', 'Pass.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js', 'GLTFLoader.js'))
    pre += chr(10)+open(KIT/'engine'/'vox3d.js', encoding='utf-8').read()
if meta.get('pixrun'): pre += chr(10)+open(KIT/'engine'/'pixrun.js', encoding='utf-8').read()  # pixel art 2D com paralaxe (PIX)
if meta.get('orbit'): pre += chr(10)+open(KIT/'engine'/'orbit.js', encoding='utf-8').read()  # órbitas keplerianas + gráfico de altura do som (ORB)
if meta.get('luz3d'):  # estúdio de óptica em three.js (engine/luz3d.js = LUZ3D): vidro físico, feixes, disco de Newton com base de metal
    VD = KIT/'vendor'/'three-r147'
    if not (meta.get('rocket3d') or meta.get('road3d') or meta.get('vox3d')): pre += chr(10)+chr(10).join(open(VD/f, encoding='utf-8').read() for f in ('three.min.js', 'CopyShader.js', 'LuminosityHighPassShader.js', 'Pass.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js', 'GLTFLoader.js'))
    pre += chr(10)+open(KIT/'engine'/'luz3d.js', encoding='utf-8').read()
if meta.get('pers3d'):  # personagem 3D animado (engine/pers3d.js = PERS, three.js r147)
    VD = KIT/'vendor'/'three-r147'
    if not (meta.get('rocket3d') or meta.get('road3d') or meta.get('vox3d') or meta.get('luz3d')): pre += chr(10)+chr(10).join(open(VD/f, encoding='utf-8').read() for f in ('three.min.js', 'CopyShader.js', 'LuminosityHighPassShader.js', 'Pass.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js', 'GLTFLoader.js'))
    pre += chr(10)+open(KIT/'engine'/'pers3d.js', encoding='utf-8').read()
if meta.get('hist'): pre += chr(10)+open(KIT/'engine'/'hist.js', encoding='utf-8').read()  # vídeos de História (HIST: pinturas, maquete, créditos)
if meta.get('gl'): pre += chr(10)+open(KIT/'engine'/'lens.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'eclipse.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'blast.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'iris.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'prisma.js', encoding='utf-8').read()+chr(10)+open(KIT/'engine'/'newton.js', encoding='utf-8').read()  # nível 2: shaders na GPU (LENS, ECL, BLAST, IRIS)
for _k in meta.get('kits', []): pre += chr(10)+open(KIT/'engine'/f'{_k}.js', encoding='utf-8').read()  # kits novos por nome (meta.json "kits": ["neon", ...])
sc = 'const CAPTIONS_ENABLED='+str(meta.get('captions', True)).lower()+';'+chr(10)+chr(10).join(open(TH/f, encoding='utf-8').read() for f in ('_core.js', f'{th}.js'))+chr(10)+pre+chr(10)+sc
# saída suave (meta.json "outro"): cena final acrescentada depois das cenas do projeto
if meta.get('outro'):
    O = meta['outro']; sc += chr(10)+'scenes.push({name:"Fim",nameEn:"End",dur:'+str(plan['dur'][-1])+',tr:null,caps:[],en:[],draw(ctx,t){BRAND.outro(ctx,t,this.dur,{mode:'+json.dumps(O.get('mode','card'))+',slow:'+str(O.get('slow',.35))+(',y:'+str(O['y']) if 'y' in O else '')+',prev:scenes[scenes.length-2]})}});'
out = tpl.replace('/*__SCENES__*/', sc)
# formato: "landscape" (1920x1080, padrão) ou "vertical" (1080x1920, Shorts/Reels/TikTok; legenda acima da zona da interface)
VERT = meta.get('format') == 'vertical'
for k, v in (('W', '1080' if VERT else '1920'), ('H', '1920' if VERT else '1080'), ('AR', '9/16' if VERT else '16/9'), ('ARX', '9 / 16' if VERT else '16 / 9')):
    out = out.replace('{{'+k+'}}', v)
for k in ('title', 'eyebrow', 'h1', 'lede', 'dl_en', 'dl_pt'):
    out = out.replace('{{'+k.upper()+'}}', meta.get(k, ''))
open(P/'page.html', 'w').write(out)
js = re.search(r'<script>(.*)</script>', out, re.S).group(1); open(P/'_check.js', 'w').write(js)
r = subprocess.run(['node', '--check', str(P/'_check.js')], capture_output=True, text=True)
print('page.html written' if r.returncode == 0 else r.stderr)
