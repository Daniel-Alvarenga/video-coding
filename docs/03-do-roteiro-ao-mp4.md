# 3. Do roteiro ao MP4

O caminho completo de um vídeo, com o que sai de cada passo.

## 1. Ideia e contas

Escolha algo concreto com um número que surpreende e uma visualização forte ("Se a Terra virasse buraco negro,
caberia na sua mão?"). Antes de qualquer animação, faça as contas num script Python e confira as fontes:

```python
G, c, M = 6.674e-11, 299_792_458, 5.972e24
rs = 2*G*M/c**2          # 0,00887 m → 1,77 cm de diâmetro
```

Anote os resultados e as fontes como comentário no topo do `lines.py`.

## 2. Roteiro

Uma tabela com **tempo · o que se vê · fala exata · texto na tela**. No fim, a lista **Kit a criar**: o que
o motor ainda não sabe desenhar. O que funcionou nos exemplos:

- primeiro quadro já com o objeto principal grande e a pergunta legível;
- frase-gancho falada nos primeiros 2 s;
- uma ideia por frase, com o número dito por extenso;
- a resposta perto do fim;
- loop: o último quadro emenda no primeiro.

## 3. Kit

Crie os módulos da lista "Kit a criar" antes das cenas. Ver [04-criando-um-modulo-do-kit.md](04-criando-um-modulo-do-kit.md).

## 4. Pasta do projeto

Copie o exemplo mais parecido e troque `meta.json`, `lines.py` e `scenes.js`.

| Quero fazer | Copie |
|---|---|
| Short narrado com um plano contínuo | `exemplos/sol-sumisse` ou `exemplos/anos-netuno` |
| Short narrado com transformação de escala (log) | `exemplos/buraco-negro-mao` |
| Short narrado em que a animação segue âncoras e a voz deforma o tempo | `exemplos/vida-estrelas` |
| Short sem narração, só música e texto, no ritmo da batida | `exemplos/planetas-cabem` |

## 5. Voz

Gere `voice/ptNN.wav` + `voice/durs.json` (ver [06-voz-e-narracao.md](06-voz-e-narracao.md)). Sem narração:
`voice/durs.json` = `{"pt": []}`.

## 6. Plano e build

```bash
python tools/plan.py P      # plan.json: durações reais e sched das falas
python tools/build.py P     # page.html: template + tema + módulos + cenas + dados
```

## 7. Revisão antes do render

```bash
python tools/overlaps.py P pt 0.5                 # textos que se cruzam ou saem da tela (lista vazia = ok)
python tools/stills.py P pt 0.1,3,8,15,22,30,33   # folha de quadros em P/sheet.jpg
python tools/frame.py P 15.2                      # um quadro em resolução cheia
python tools/quadros.py P P/quadros 1             # um quadro por segundo + folha 00_folha.jpg
```

Abra as imagens. Corrija e repita. Detalhes em [08-revisao-de-qualidade.md](08-revisao-de-qualidade.md).

## 8. Música, mixagem, render e efeitos

```bash
python tools/music.py P            # ou o musica.py do projeto → music.wav
python tools/mix.py P 0.6 pt       # voz sobre a música, com ducking e sala → audio_pt.wav
python tools/render.py P pt        # quadro a quadro → v-pt.mp4 + v-pt.mp4.events.json
python tools/sfx2.py P pt          # eventos → efeitos + ambientes → final_pt.wav
```

Para refazer só um pedaço: `python tools/render_trecho.py P pt t0 t1`.
Para trocar só o som (sem novo render): edite `meta.json` → `sound` e rode `sfx2.py` + o ffmpeg final.

## 9. MP4 final

Os exemplos normalizam o volume para -14 LUFS (pico -1,5 dB) e gravam duas versões: uma grande e uma leve
(H.264 crf 28, AAC), boa para mandar pelo celular e subir em plataformas de vídeo:

```bash
ffmpeg -i v-pt.mp4 -i final_pt.wav -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 \
       -c:a aac -b:a 192k -shortest -movflags +faststart grande.mp4
ffmpeg -i grande.mp4 -c:v libx264 -crf 28 -preset medium -pix_fmt yuv420p -c:a copy -movflags +faststart leve.mp4
```

`exemplos/vida-estrelas/make.sh` mostra a normalização linear em duas passagens (mais fiel para trilhas
curtas e comprimidas).

## 10. Miniatura

```bash
python tools/thumb.py P 12.5 "Se a Terra virasse / [g|buraco negro]" thumb.png
```

`[g|...]` = destaque dourado, `[c|...]` = ciano. Usa as fontes e o tema do vídeo.
