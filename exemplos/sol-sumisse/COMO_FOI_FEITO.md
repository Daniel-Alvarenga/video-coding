# Como foi feito: "Se o Sol SUMISSE agora, você ia perceber?"

Short vertical narrado, 34,5 s, um plano contínuo, loop exato. Fora de escala (marcado na tela).

## Ideia e contas

| Dado | Valor |
|---|---|
| 1 UA (distância média Terra–Sol) | 149.597.871 km |
| Velocidade da luz | 299.792,458 km/s |
| Tempo da luz até a Terra | 499 s = 8 min 19 s (falado: "oito minutos e vinte segundos") |
| A gravidade se propaga à velocidade da luz | GW170817 + GRB 170817A (2017): 1,7 s de diferença depois de 130 milhões de anos |
| Sem o Sol, a Terra sai pela tangente | 29,8 km/s |

Fontes: IAU (UA); Abbott et al. 2017. Contas no topo do `lines.py`.

## Kit usado

- `COS.sun` (Sol com granulação, coroa e brilho), `COS.sky` (céu com Via Láctea), `COS.tag` (rótulo NOME · valor),
  `COS.arrow`, `COS.lookCam` (câmera olhando para um alvo), `COS.spline` (curva suave no tempo).
- `PL.planet` com a Terra real (`"geo": true`: dia, noite com as luzes das cidades, nuvens).

## Como o tempo funciona

O vídeo tem um **tempo simulado** `S` (segundos desde que o Sol sumiu), guiado pela narração por um `COS.spline`
com pontos presos ao início e ao fim de cada fala (`ls(i)`, `le(i)`, `wt(i,'palavra')`). Assim a frente da
"última luz" sai do lugar do Sol à velocidade da luz e chega à Terra exatamente quando a voz diz "noite".
Os fótons já emitidos continuam viajando; dentro da frente não há mais luz. Depois, a Terra escurece e sai em linha
reta (velocidade exagerada para a reta aparecer). No fim, tudo rebobina até o quadro 0.

## Voz

VoxCPM2 no Colab (clone de uma voz criada por descrição), `voice_fx` com sala quase seca (room 0,01).
A narração está em `voice/`; para gerar outra, veja `docs/06-voz-e-narracao.md`. Sem `voice/`, o `make.sh`
usa edge-tts como voz provisória.

## Som

`music.style = "misterioso"`, ambiente `space` baixo, `whoosh` e `stamp` com ganho reduzido.

## Reprodutibilidade

Rodar `bash exemplos/sol-sumisse/make.sh` com este repositório gera um `sol-sumisse.mp4` idêntico, byte a byte,
ao `video.mp4` desta pasta.

## Lições

- Um só plano contínuo, com o tempo simulado preso à fala, dá ritmo sem cortes.
- A resposta ("você não ia perceber") entra no gancho como provocação; a explicação do porquê segura até o fim.
