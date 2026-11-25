# Como foi feito: "Quantos anos você tem em NETUNO?"

Short vertical narrado, 36,4 s, um plano contínuo, loop exato. Órbitas fora de escala (marcado na tela).

## Ideia e contas

| Dado | Valor |
|---|---|
| Período de Netuno (NASA NSSDC) | 60.182 dias = 164,8 anos |
| Descoberta | 23/9/1846 (Galle) |
| 1ª volta completa desde a descoberta | 12/7/2011 (NASA) |
| 30 anos terrestres em Netuno | 30 / 164,8 = 0,18 |
| Mercúrio (87,97 dias) | 30 × 365,25 / 87,97 = 124,6 anos mercurianos |

## Kit usado

- `PL.planet` e `PL.orbit` (planetas 3D e órbitas), `PL.wedge` (cunha do ângulo percorrido).
- Netuno com textura procedural no estilo das fotos da Voyager 2, criada para este vídeo em `engine/planets.js`.
- `COS.sun`, `COS.sky`, `COS.trail` (rastro que some), `COS.tag`, `COS.flag` (bandeira na órbita marcando a
  descoberta), `COS.spline`.
- `W3D.cam` com chaves de câmera (alvo, distância, guinada, inclinação) interpoladas.

## Como o tempo funciona

Um **ano simulado** `Y(T)` fica parado em 1846, corre (acelera e freia) até julho de 2011 enquanto a Terra dá 165
voltas e Netuno dá uma, e para na bandeira da descoberta. Depois, `MY(T)` conta os anos de Mercúrio de 0 a 124,6.
Os instantes vêm das palavras da narração (`wt(0,'zero')`, `wt(3,'julho')`).

A câmera começa perto de Netuno, do lado do Sol (Netuno iluminado), recua para mostrar o sistema e volta a Netuno
e ao "0" no fim (loop).

## Voz e som

VoxCPM2 no Colab, sala quase seca. `music.style = "misterioso"`, ambiente `space`.

## Lições

- Abrir com a resposta absurda ("quase com certeza, zero") e explicar depois funciona como gancho.
- Uma data real (a volta completada em 2011) dá um marco visual melhor que um número solto.
