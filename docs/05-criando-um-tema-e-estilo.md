# 5. Criando um tema e um estilo

## Tema visual

O tema troca fundo, paleta, fontes e brilho **sem mexer nas cenas**. Escolha em `meta.json` → `"theme"`.

| Tema | Fundo | Cores |
|---|---|---|
| `noite` (padrão) | azul-marinho radial com grade de pontos | giz `#ece6d6`, ouro `#f4b740`, ciano `#62d0ea`, brilho de neon |
| `papel` | papel creme com grão, fibras e vinheta | tinta `#2b2620`, ocre `#b8740c`, azul-petróleo `#1f6f80`, quase sem brilho |
| `lousa` | quadro verde-escuro com pó de giz | giz, amarelo, azul; brilho baixo |

### Como funciona

`engine/themes/_core.js` define `useTheme({name, C, F, glow, map, drawBg, css})`:
- `C` substitui a paleta (`C.ink`, `C.chalk`, `C.gold`, `C.cyan`, `C.dim`, `C.faint`);
- `F` substitui as fontes (`F.display`, `F.sans`, `F.mono`);
- `glow` multiplica todo `shadowBlur` (1 = neon, 0,1 = quase nada);
- `map` troca cores literais escritas nas cenas (hex ou `"r,g,b"`) em `fillStyle`, `strokeStyle`, `shadowColor`
  e gradientes. É isso que faz o mesmo `scenes.js` funcionar em qualquer tema;
- `drawBg(b, W, H)` desenha o fundo uma vez num canvas separado;
- `css` ajusta a página do player.

### Tema novo

Crie `engine/themes/<nome>.js` (copie `papel.js`):

```js
useTheme({name:'sepia',glow:.3,
  C:{ink:'#f3e9d8',chalk:'#3a2f25',gold:'#a0522d',cyan:'#2f6f6f',dim:'rgba(58,47,37,.55)',faint:'rgba(58,47,37,.10)'},
  map:{'#ece6d6':'#3a2f25','236,230,214':'58,47,37','#f4b740':'#a0522d','244,183,64':'160,82,45',
       '#62d0ea':'#2f6f6f','98,208,234':'47,111,111'},
  drawBg(b,W,H){b.fillStyle='#f3e9d8';b.fillRect(0,0,W,H)},
  css:':root{--ink:#f3e9d8;--chalk:#3a2f25;--gold:#a0522d;--cyan:#2f6f6f;color-scheme:light}'});
```

e use `"theme": "sepia"`. Rode `stills.py` em alguns instantes de um exemplo para conferir contraste.

## Estilo: regras que valem em qualquer tema

São as decisões de direção de arte dos exemplos. Ajuste ao seu projeto, mas defina as suas por escrito antes de
começar, para todas as cenas seguirem o mesmo padrão.

**Cor tem função.**
- A cor de destaque (ouro no `noite`) é o **herói**: a resposta, o resultado, o que está sendo medido.
- A secundária (ciano) é para passos, auxiliares, contadores.
- Um foco de destaque por momento. Rosa e magenta ficaram fora da paleta.

**Tipografia tem função.**
- Newsreader (itálico) para matemática e títulos.
- Hanken Grotesk 600 para o gancho e textos grandes.
- IBM Plex Mono para rótulos, contadores, HUD técnico colado nos objetos.

**Movimento.**
- Câmera sempre se movendo (segue o fluxo, orbita, aproxima); nenhuma tela parada por mais de cerca de 3 s.
- Fórmulas se transformam com `deriv()` (símbolos iguais deslizam entre os passos), nunca digitadas letra a letra.
- Todo passo algébrico tem um parceiro visual (blocos, grade, 3D, gráfico, ponto andando).
- Transição entre layouts diferentes com `tr:'dip'`.

**Realismo onde ajuda.**
- Terra, Lua e planetas com mapas reais (`"geo": true`), nunca globo de polígonos.
- Escala real sempre que der; quando exagerar, marque "FORA DE ESCALA" na tela (`COS.stamp`).
- Personagens só se forem bem acabados; na dúvida, visual abstrato.

**Leitura no celular.**
- Poucos elementos grandes, alto contraste. Rótulo abaixo de ~32 px some.
- No vertical, conteúdo entre y≈180 e y≈1300; a faixa de baixo (H−380) fica livre para a interface dos apps.
- Vídeo sem narração: cada texto fica tempo suficiente para ser lido duas vezes.

**Loop.** Nos vídeos curtos, o último quadro emenda no primeiro (o estado volta ao do quadro 0, ou a duração é
o período exato do fenômeno). Todos os exemplos fazem isso.

## Marca na saída

`meta.json`:

```json
"outro": {"dur": 3.2, "mode": "card", "slow": 0.35},
"brand": {"name": "meucanal", "accent": 3, "spiral": false}
```

`BRAND.outro` continua o último plano em câmera lenta, desenha o nome (as `accent` primeiras letras em destaque;
com `"spiral": true`, também uma espiral dourada antes) e some em fade (`card`) ou volta ao começo (`loop`). Sem `outro`, o vídeo termina sem marca.
