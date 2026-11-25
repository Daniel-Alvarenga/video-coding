"""Exporta as falas de PROJECT/lines.py para PROJECT/falas.json, o arquivo que o notebook voz/voxcpm_colab.ipynb lê.
Formato: {"lang": "pt", "falas": [{"id": "pt00", "texto": "..."}, ...]}  (o id vira o nome do WAV: pt00.wav)
Funciona antes da voz existir: se o lines.py ler voice/durs.json e ele ainda não existir, usa durações provisórias.
usage: python exportar_falas.py PROJECT [lang=pt]"""
import sys, json, importlib.util
from pathlib import Path

P = Path(sys.argv[1]).resolve(); LANG = sys.argv[2] if len(sys.argv) > 2 else 'pt'
COL = 4 if LANG == 'pt' else 2                     # (cena, início, EN falado, EN legenda, PT falado, PT legenda)


def carregar():
    spec = importlib.util.spec_from_file_location('lines_proj', P/'lines.py'); m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    if not m.LINES and getattr(m, '_L', None):       # sem voz, alguns lines.py deixam LINES vazio e guardam as frases em _L
        return [(0, 0, t, None, t, None) if isinstance(t, str) else t for t in m._L]
    return m.LINES


dp = P/'voice'/'durs.json'
try:
    LINES = carregar()
except (FileNotFoundError, KeyError, IndexError, ValueError):
    LINES = []
if not LINES and not dp.exists():                 # lines.py depende das durações da voz: usa durações provisórias
    novo = not dp.parent.exists(); dp.parent.mkdir(exist_ok=True)
    dp.write_text(json.dumps({'pt': [2.0]*200, 'en': [2.0]*200}))
    try: LINES = carregar()
    finally:
        dp.unlink()
        if novo: dp.parent.rmdir()

falas = [{'id': f'{LANG}{i:02d}', 'texto': l[COL]} for i, l in enumerate(LINES)]
(P/'falas.json').write_text(json.dumps({'lang': LANG, 'falas': falas}, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'{len(falas)} falas -> {P/"falas.json"}')
