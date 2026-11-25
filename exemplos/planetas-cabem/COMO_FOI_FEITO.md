# Como foi feito: "TODOS os planetas cabem entre a Terra e a Lua?"

Short vertical **sem narração** (só música e texto), 34,5 s, loop exato.

## Ideia e contas

A afirmação circula na internet; a conta mostra que ela só vale com a Lua no ponto mais longe da órbita (apogeu).

| Dado | Valor |
|---|---|
| Diâmetros no equador (NASA NSSDC) | Mercúrio 4.879, Vênus 12.104, Marte 6.779, Júpiter 139.820, Saturno 116.460, Urano 50.724, Netuno 49.244 km |
| Soma dos 7 | 380.010 km |
| Vão Terra–Lua no apogeu (405.500 km de centro a centro, menos os raios) | 397.392 km |
| Sobra | 17.382 km: cabe mais uma Terra (sobram 4.640 km), e Mercúrio fica de fora por 239 km |
| Na distância média (384.400 km) | não cabem (faltam cerca de 3.700 km) |

As contas estão no topo do `lines.py`.

## Kit usado

- `SC` (zoom de escala): `SC.sphere` desenha cada planeta com o mapa real (`"geo": true` embute as texturas de
  `geo/planetas/`), `SC.type` faz o texto entrar letra a letra, `SC.beat` dá flash e tremor na batida.
- `COS.stamp` (carimbos "CABEM" e "NÃO CABE") e `COS.ring`.
- Escala real fixa: 1 px = 309 km. A câmera é 2D (zoom em volta do vão que sobra).

## Roteiro visual

1. Gancho: Terra e Lua coladas, "como nos desenhos", se afastam até a escala real; os planetas giram numa ciranda
   com a pergunta.
2. Os 7 planetas entram um por um, na batida, e se empilham a partir da superfície da Terra.
3. "CABEM" com impacto; a câmera aproxima o vão que sobra.
4. Cabe mais uma Terra; Mercúrio tenta e fica de fora por 239 km.
5. Saída: volta ao quadro 0 (loop).

## Música e som

`musica.py` próprio, 120 BPM: gancho calmo, bumbo em cada planeta, impacto no "CABEM", subida para o zoom,
meio-tempo de suspense, parada no "NÃO CABE", volta cheia e emenda no começo. Cada planeta que encaixa toca uma
nota de uma escala pentatônica subindo (eventos `note` no `sfx2.py`). O `make.sh` também grava uma versão sem
música, só com os efeitos.

## Revisões

- v1: os planetas entravam direto, sem gancho.
- v2: entrou o gancho Terra–Lua com a ciranda, e toda a sequência da v1 foi atrasada 2,5 s (`D0` no `scenes.js`).
  A música nova da v2 foi trocada de volta pela da v1, atrasada os mesmos 2,5 s.
- As notas por planeta foram trocadas só no áudio (editando os eventos e rodando `sfx2.py` de novo), sem refazer
  o render.

## Lições

- Vídeo sem voz precisa de texto que fique na tela tempo suficiente para ser lido duas vezes.
- Uma conta que "quase não fecha" (sobram 239 km) dá um final melhor que uma resposta folgada.
