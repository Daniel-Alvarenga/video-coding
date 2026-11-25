# 7. Música e efeitos sonoros

Todo o som é sintetizado por código: não há amostras de áudio de terceiros.

## Trilha

### Por estilo (`tools/music.py`)

```json
"music": {"style": "misterioso", "gain": [1, 0.8], "end_fade": 0.6, "seed": 7}
```

Estilos: `calmo`, `misterioso`, `epico`, `lofi`, `minimal`. Um acorde por cena, sincronizado às durações do
`plan.json`. `end_fade` = segundos de fade no fim (use pelo menos a duração do `outro` + 1 quando houver saída).

### Própria do projeto (`musica.py`)

Quando a música precisa bater com a animação (bumbo em cada planeta que entra, impacto na revelação), escreva um
`musica.py` no projeto. Ele lê os tempos do `plan.json` e grava `music.wav`. Exemplos:
- `exemplos/planetas-cabem/musica.py`: 120 BPM, batida casada com a entrada de cada planeta, parada no
  "NÃO CABE", emenda no quadro 0;
- `exemplos/vida-estrelas/musica.py`: pads que mudam com cada fase da estrela (Sol, gigante, supernova, anã).

`tools/music_short.py` e `tools/music_long.py` são trilhas genéricas usadas pelo `tools/make.sh`.

## Efeitos sonoros (`tools/sfx2.py` + `tools/sfxlib.py`)

O render grava os eventos chamados nas cenas em `v-pt.mp4.events.json`; o `sfx2.py` transforma cada evento num
som e soma ambientes e tons contínuos.

Nas cenas:

```js
logEv('planeta-'+i, 'pop', 0.8)     // chave única (só toca uma vez), preset, valor (intensidade ou nota)
logEv('impacto', 'impact', 1)
FX.tone('massa', t, v)              // a cada quadro: v em 0..1 vira a altura de um tom contínuo
FX.toneA('zumbido', t, v, amp)      // idem, com volume
```

Presets de evento (`sfxlib.PRESETS`): `tick pop bell chime pent whoosh swoosh riser impact pencil glass pour drop
click heartbeat sparkle thud chord sus res type beep gong bubble zap stamp page kick net roar note supernova
collapse flare swell`. `note` usa o valor como nota MIDI.

Ambientes: `wind rain ocean night room city space drone fire crowd`.

`meta.json`:

```json
"sound": {
  "ambient": [{"type": "space", "from": 0, "to": 9999, "level": 0.018, "fade": 0.4}],
  "tones":   {"massa": {"lo": 110, "hi": 660, "gain": 0.035, "harm": [1, 0.35, 0.12]}},
  "gain":    {"whoosh": 0.2, "stamp": 0.28, "impact": 0.25}
}
```

Preset novo: uma função `(sr, rng, val) -> array mono` em `sfxlib.py`, registrada em `PRESETS`.

## Trocar só o som

O som não exige novo render: ajuste `sound` no `meta.json` (ou edite o `events.json`) e rode `sfx2.py` + o
ffmpeg final do `make.sh`. É assim que se testam ganhos e notas rapidamente.

## Volume

- Ambientes baixos (0,01 a 0,03); nada de chiado ou ruído forte.
- Música abaixa sob a voz: `mix.py P 0.6 pt` (0,55 nos longos).
- Final: **-14 LUFS integrado, pico -1,5 dB** (ver o final dos `make.sh` dos exemplos). Confira com
  `ffmpeg -i final.mp4 -af ebur128 -f null -`.
