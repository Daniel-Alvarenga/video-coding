# 4. Criando um módulo do kit

O motor cresce um módulo por assunto. Quando um vídeo precisa de algo que o kit não sabe desenhar (uma estrela
que vira gigante vermelha, um buraco negro com lente, um velocímetro), isso vira um arquivo em `engine/`,
reutilizável por qualquer vídeo depois. As cenas de um vídeo só **usam** módulos; não reimplementam.

## Antes de criar

1. Procure em `docs/referencia-api.md` e em `engine/` se já existe algo parecido. Ampliar um módulo com uma
   opção nova costuma ser melhor que criar outro.
2. Liste no roteiro o que falta ("Kit a criar") e desenhe a API: quais funções, quais opções.

## Forma de um módulo

```js
/* ---------- ONDA: ondas na superfície da água (exemplo de módulo) ----------
   ONDA.draw(ctx,x,y,larg,{t,amp,lambda,P,cor,a})  faixa de água com ondas; P = período em s (loop exato)
   ONDA.gota(ctx,x,y,{t,R,a})                      gota caindo e anel de impacto (t em s desde o impacto)
   Determinístico: o estado depende só de t; ruído com semente. */
const ONDA=(()=>{
  const rnd=FX.rng(1234);                               // aleatoriedade sempre com semente
  const fase=[...Array(6)].map(()=>rnd()*TAU);          // sorteada uma vez, igual em todo render
  function draw(ctx,x,y,larg,o={}){
    const t=o.t??0, amp=o.amp??20, lam=o.lambda??180, P=o.P??4, a=o.a??1;   // opções com padrão sensato
    ctx.save(); ctx.globalAlpha*=a; ctx.strokeStyle=o.cor||C.cyan; ctx.lineWidth=4;
    ctx.beginPath();
    for(let i=0;i<=200;i++){const u=i/200,px=x+u*larg;
      const py=y+amp*Math.sin(TAU*(px/lam-t/P)+fase[0]);   // t/P: volta igual depois de P segundos
      i?ctx.lineTo(px,py):ctx.moveTo(px,py)}
    ctx.stroke(); ctx.restore();
  }
  function gota(ctx,x,y,o={}){ /* ... */ }
  return {draw,gota};
})();
```

Regras:
- **Um objeto global em maiúsculas** por arquivo, retornado de uma IIFE (nada vaza para o escopo global).
- **Funções recebem `ctx`**, posição/câmera e um objeto de opções com padrões. Nada de ler variáveis da cena.
- **Determinístico:** `FX.rng(seed)` para ruído e partículas; o desenho depende só de `t` e das opções. Assim o
  render sai igual toda vez e a cena pode voltar no tempo (loop, rebobinar).
- **Loop:** movimento contínuo aceita um período `P` (`ang = TAU*t/P`), para o fim emendar no começo.
- **Cores do tema:** use `C.gold`, `C.cyan`, `C.chalk`... ou as literais que os temas mapeiam
  (`#f4b740`, `#62d0ea`, `#ece6d6`). Outras cores não mudam com o tema.
- **Escala da tela:** trabalhe em pixels relativos a `W`/`H` ou receba o raio/tamanho como parâmetro.
- **Cabeçalho:** documente cada função pública no topo do arquivo.

## Registrar no build

| Caso | Como |
|---|---|
| Módulo usado por poucos vídeos | `meta.json` → `"kits": ["onda"]` (o `build.py` injeta `engine/onda.js`) |
| Módulo de uso geral | acrescente o arquivo à lista de injetados em `tools/build.py` |
| Módulo com dados grandes ou three.js | uma chave própria no `meta.json`, tratada no `build.py` (veja `rocket3d`, `road3d`, `luz3d`) |

Dados (texturas, relevo, contornos) vão em `geo/` ou `assets/` e são embutidos pelo `build.py` como data URI
(`FX.IMG['geo:nome.jpg']`). Registre fonte e licença em `geo/FONTES.txt` ou no `LICENCA.txt` da pasta, e em
`CREDITOS.md`.

## Sons do módulo

Se o módulo tem momentos com som (explosão, encaixe), chame `logEv(chave_unica, 'preset', valor)` no instante
certo. Presets novos vão em `tools/sfxlib.py` (síntese por código, sem amostras externas).

## Módulos com GPU

- **Shaders por pixel** (`"gl": true`): veja `engine/lens.js` e `engine/eclipse.js`. Use quando a luz calculada
  muda o resultado (lente gravitacional, atmosfera, sombra).
- **three.js r147** (`vendor/three-r147/`): veja `engine/luz3d.js` e `engine/rocket3d.js`. Use para malhas,
  vidro físico, modelos GLB.
- Sem GPU dedicada, esses módulos renderizam por software e ficam lentos.

## Depois de criar

1. Teste num projeto: `build.py` + `stills.py` e olhe a folha.
2. Se mudou um módulo existente, rode também um exemplo antigo que o usa e compare um quadro.
3. Documente em `docs/referencia-api.md` (funções, parâmetros e o projeto que usa).

## Exemplo real

`exemplos/vida-estrelas/COMO_FOI_FEITO.md` conta como o módulo `STAR` nasceu para aquele vídeo e como a gigante
vermelha foi refeita até parecer real.
