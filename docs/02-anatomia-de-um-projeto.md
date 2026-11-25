# 2. Anatomia de um projeto

Um vídeo é uma pasta. O mínimo são três arquivos de texto; o resto é gerado.

```
meu-video/
├── meta.json      configuração (formato, tema, módulos, música, som, voz)
├── lines.py       roteiro falado e durações das cenas
├── scenes.js      as cenas: funções draw(ctx, t)
├── make.sh        o pipeline deste vídeo (copiado de um exemplo)
├── musica.py      opcional: trilha própria (senão tools/music.py usa o estilo do meta.json)
├── assets/        opcional: imagens (SVG/PNG/JPG) e JSON do projeto, embutidos no build
└── voice/         narração: ptNN.wav + durs.json
```

Gerados pelo pipeline: `plan.json`, `page.html`, `music.wav`, `audio_pt.wav`, `final_pt.wav`, `v-pt.mp4`
(só vídeo), `v-pt.mp4.events.json` (eventos sonoros), `sheet.jpg` (folha de quadros) e os MP4 finais.

## meta.json

```json
{
  "mode": "long",
  "format": "vertical",
  "theme": "noite",
  "geo": true,
  "captions": false,
  "title": "Se o Sol SUMISSE agora, você ia perceber?",
  "music": {"style": "misterioso", "end_fade": 0.6},
  "sound": {"ambient": [{"type": "space", "from": 0, "to": 9999, "level": 0.018, "fade": 0.4}],
            "gain": {"whoosh": 0.2, "stamp": 0.3}},
  "voice_fx": {"room": 0.01, "predelay": 0.01, "decay": 0.16, "tone": 4500}
}
```

| Chave | Valores | Efeito |
|---|---|---|
| `mode` | `long` / `short` | `short` usa o template de Shorts antigo (swipe entre cenas, legenda queimada, barra de progresso); `long` com `format: vertical` é o que os exemplos usam (plano contínuo) |
| `format` | `landscape` (padrão) / `vertical` | 1920×1080 ou 1080×1920 |
| `theme` | `noite` (padrão), `papel`, `lousa` | paleta, fundo, fontes, brilho |
| `geo` | `true` | embute Terra, nuvens, noite, Lua, planetas e fronteiras (`EARTH`, `PL`) |
| `captions` | `true` / `false` | legenda corrida queimada |
| `kits` | `["nome", ...]` | injeta `engine/nome.js` |
| `gl`, `rocket3d`, `road3d`, `luz3d`, `vox3d`, `pers3d`, `rio3d`, `orbit`, `pixrun`, `hist` | `true` | módulos pesados sob demanda |
| `models` | `["pasta/arquivo.glb"]` | modelos 3D de `assets/` |
| `dem` | `["everest"]` | relevo real de `geo/<nome>.json` |
| `geo_crops` | `["brasil"]` | recortes de satélite feitos com `tools/geo_crop.py` |
| `music` | `{style, gain, end_fade, seed}` | trilha por estilo (`tools/music.py`) |
| `sound` | `{ambient, tones, gain}` | efeitos e ambientes (`tools/sfx2.py`) |
| `voice_fx` | `{room, predelay, decay, tone}` | sala na voz (`tools/mix.py`) |
| `outro` | `{dur, mode: card/loop, slow}` | cena final com a marca (`BRAND.outro`) |
| `brand` | `{name, accent}` | nome da marca na saída; `accent` = quantas letras em destaque |

## lines.py

```python
BASE = [34.0]          # duração nominal de cada cena (s)
LINES = [
  # (cena, início na cena, EN falado, EN legenda, PT falado, PT legenda)
  (0, 0.1, "If the Sun vanished...", None, "Se o Sol sumisse agora...", None),
]
```

- O **falado** é o que a voz lê ("cento e sete mil"); a **legenda** é o que aparece ("107.000"). `None` repete o
  falado.
- Vídeo só em PT: repita o PT nas colunas EN.
- `plan.py` empurra uma fala para depois se ela encostar na anterior e estica a cena quando a narração precisa.
- Os exemplos calculam os inícios a partir de `voice/durs.json` (pausa antes de cada fala + duração real), o que
  deixa o ritmo exato depois da voz gerada. Veja `exemplos/sol-sumisse/lines.py`.
- Anote no topo as contas conferidas e as fontes.

## scenes.js

```js
const PLAN=__PLAN__;const DUR=PLAN.dur;
const ST=DUR.map((d,i)=>DUR.slice(0,i).reduce((a,b)=>a+b,0)),TTOT=DUR.reduce((a,b)=>a+b,0);
const ls=i=>ST[PLAN.sched.pt[i][0]]+PLAN.sched.pt[i][1];     // início da fala i (tempo absoluto)
const le=i=>ST[PLAN.sched.pt[i][0]]+PLAN.sched.pt[i][2];     // fim da fala i

function film(ctx,T){ bg(ctx); /* desenha o quadro no tempo absoluto T */ }

const scenes=[{dur:DUR[0], draw(ctx,t){ film(ctx,t) }}];
```

- `__PLAN__` é trocado pelo `build.py` pelas durações reais, o `sched` das falas e os textos.
- Use `W`, `H` e `CX=W/2`, nunca tamanhos fixos.
- Funções globais e módulos disponíveis: `docs/referencia-api.md`.
- Sons: `logEv(chave_unica, 'preset', valor)` num instante vira efeito sonoro; `FX.tone('nome', t, v)` a cada
  quadro vira um tom contínuo.

## make.sh

Copie o de um exemplo. A sequência típica:

```bash
P="$(cd "$(dirname "$0")" && pwd)"; KIT="${VIDEO_CODING_KIT:-$P/../..}"
[ -f "$P/voice/durs.json" ] || python "$KIT/tools/voice_edge.py" "$P" pt pt-BR-AntonioNeural +8%
python "$KIT/tools/plan.py" "$P"
python "$KIT/tools/build.py" "$P"
python "$KIT/tools/overlaps.py" "$P" pt 0.5 || true
python "$KIT/tools/music.py" "$P"
python "$KIT/tools/mix.py" "$P" 0.6 pt
python "$KIT/tools/render.py" "$P" pt > "$P/log-pt.txt" 2>&1
python "$KIT/tools/sfx2.py" "$P" pt
# normalização a -14 LUFS e MP4 final (ver exemplos)
```
