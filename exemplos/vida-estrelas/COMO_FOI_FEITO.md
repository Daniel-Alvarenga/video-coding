# Como foi feito: "Qual estrela vive MAIS?"

Short vertical narrado, 50,8 s, um plano contínuo, uma câmera só, loop exato.

## Ideia e contas

| Estrela | Vida na sequência principal | Fonte |
|---|---|---|
| 0,1 massa solar (anã vermelha) | cerca de 6 trilhões de anos | Laughlin, Bodenheimer e Adams 1997 |
| Sol | cerca de 10 bilhões (idade 4,6; faltam cerca de 5) | NASA |
| 20 massas solares | cerca de 8 a 9 milhões (falado: "cerca de dez milhões") | Schaller et al. 1992 |

O universo tem 13,8 bilhões de anos (Planck 2018), então nenhuma anã vermelha morreu ainda. Próxima Centauri:
0,12 massa solar, 4,24 anos-luz.

## Kit criado para este vídeo

**`STAR` (`engine/star.js`)**: estrelas desenhadas por pixel.
- `STAR.draw`: granulação (células de convecção por ruído de Worley), escurecimento do limbo que avermelha a
  borda, manchas, bloom na cor da estrela (corpo negro pela temperatura, `STAR.bb`), vento, espículas;
- `STAR.ms(m)`: dados de uma estrela de `m` massas solares (temperatura, raio, vida, luminosidade);
- `STAR.shell` (nebulosa planetária e remanescente), `STAR.supernova`, `STAR.pulsar`, `STAR.hole` (usa a lente
  do `BH`), `STAR.sky` (céu com cores reais), `STAR.slider` (régua de massa), `STAR.lifebar` (barra de vida em log).
- Sons novos em `tools/sfxlib.py`: `supernova`, `collapse`, `flare`, `swell`.

## O tempo deformado pela voz

O `lines.py` define 10 âncoras numa linha do tempo nominal de 47 s (`AN`). Com a voz pronta, cada âncora é presa
ao início real da fala correspondente, e o `scenes.js` deforma o tempo nominal (`nom(T)`) para casar animação e
fala. Sem voz, o vídeo roda no tempo nominal, o que permite montar as cenas antes da narração existir.

## Roteiro visual

Gigante azul e anã vermelha (gancho) → Sol (idade e o que falta) → incha até gigante vermelha → casca de gás e
anã branca do tamanho da Terra → a régua de massa sobe até 20 sóis: estrela azul com vento → vida de 10 milhões
de anos → colapso e supernova → estrela de nêutrons ou buraco negro → a régua desce até 0,1: anã vermelha com
proeminências → a barra de vida passa da idade do universo → recua: Próxima Centauri no céu → resumo com as duas
estrelas do começo, igual ao quadro 0.

## Revisões

- A gigante vermelha da 1ª versão "não parecia real". Recolorir o Sol pronto também não funcionou (parecia só o
  Sol com outra cor). A solução foi uma opção nova, `STAR.draw(..., {giant: 1})`: ruído de Worley em duas escalas
  com borda macia, manchas, limbo forte e borda difusa, com transição cruzada do Sol para a gigante.

## Voz e som

VoxCPM2 no Colab (várias versões de cada fala, escolhidas com `tools/escolher_consistente.py`), sala quase seca.
`musica.py` próprio, com pads que mudam a cada fase da estrela, e um tom contínuo `massa` ligado à régua de massa
(`FX.tone`). O `make.sh` normaliza o volume em duas passagens e força `yuv420p`.

## Lições

- Melhorar um módulo com uma opção (`giant`) em vez de criar outro mantém os vídeos antigos iguais.
- Separar o tempo nominal do tempo real da voz permite trabalhar nas cenas antes da narração.
