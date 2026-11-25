# Referência da API do motor

Copiada do README interno do kit, seção por versão. Onde aparece "exemplo `projetos/...`", o projeto citado não faz parte deste repositório; os exemplos públicos estão em `exemplos/`.

Engine: canvas animation + algebraic morphs + 3D, narrated in EN and PT,
with an original score, sound effects and frame-accurate MP4 rendering.

## Setup (once per session)
```bash
bash setup.sh          # pip deps, fonts (npm @fontsource), Kokoro voice model (~350 MB from GitHub)
```
Needs: Python 3, Node, ffmpeg, Chromium for Playwright.

## A project = one folder
```
myvideo/
  meta.json   {"mode":"long"|"short", "title", "eyebrow", "h1", "lede", "dl_en", "dl_pt"}
  lines.py    BASE = [nominal scene durations]; LINES = [(scene, start, EN spoken, EN caption|None, PT spoken, PT caption|None), ...]
  scenes.js   const PLAN=__PLAN__; ... const scenes=[{dur:DUR[i], ...}]
  music.py    optional; otherwise tools/music_long.py or tools/music_short.py is used
```
Then:
```bash
bash tools/make.sh myvideo         # voice → plan → build → music → mix → render EN+PT → sfx → final-en.mp4 / final-pt.mp4
python3 tools/stills.py myvideo en 5,20,47   # contact sheet (sheet.jpg) to check layout BEFORE the full render
python3 tools/quadros.py myvideo myvideo/quadros 1 34.3,35.6   # um quadro por segundo (+ extras) em quadros/, com folha 00_folha.jpg
```
Step by step: `voice.py`, `plan.py`, `build.py`, then music, `mix.py`, `render.py`, `sfx.py` (see make.sh).

## Writing lines.py
- Spoken text is what the voice reads (numbers as words: "twenty three"), caption is what is burned/subtitled ("23").
- Each line has a nominal start inside its scene; plan.py pushes lines later if they would overlap and grows scenes when narration needs it. Read the printed scene durations and time animations to the lines (plan.json → sched).
- Shorts: speak in short punchy sentences; voice speed 1.08–1.12 (make.sh does this).

## scenes.js — long (16:9, 1920×1080, template_long.html)
Each scene: `{name, nameEn, dur:DUR[i], tr:'iris'|'wipe'|'fade'|null, caps:PLAN.caps.pt[i], en:PLAN.caps.en[i], draw(ctx,t){...}}`
`t` is the time inside the scene. The template adds the player page, transitions between scenes, captions (page only), PT/EN toggle and MP4 download.
## scenes.js — short (9:16, 1080×1920, template_short.html)
Each scene: `{dur:DUR[i], draw(ctx,t){...}}`. The template adds the vertical swipe between scenes, burned captions (y≈1390, keep that band free), and the progress bar.

## Engine API (available in scenes.js)
- Palette `C.ink C.chalk C.gold C.cyan C.dim`; fonts `F.display` (Newsreader, math/titles), `F.sans` (Hanken Grotesk), `F.mono` (IBM Plex Mono). `L(pt,en)` picks language.
- Easing `clamp ease easeOut ramp(t,a,b) lerp`; `bg(ctx)`; `txt(ctx,s,x,y,{font,size,color,a,align,it,ls,weight})`; `poly(ctx,pts,n,{color,lw,glow,a,dash,close,fill})`.
- **Equations**: string mini-language `x^{2}` sup, `_{..}` sub, `[g|..]` gold, `[c|..]` cyan, `[d|..]` dim, `[h|..]` highlight box, `{{Σ|top|bottom}}` / `{{∫|x|0}}` / `{{lim||h→0}}` big operators, `<id|..>` force glyph identity for matching.
  - `deriv(ctx,[{at,s,size?,x?,y?},...],t,{x,y,size,key})` — **the signature move**: each step morphs into the next (matching glyphs glide, removed ones fade up, new ones fade in). Use it for every algebraic manipulation.
  - `eqIn(ctx,s,x,y,size,elapsed,{align,a,color,key})` — one-shot cascade entrance.
- Sound hooks: `logEv(uniqueKey,'morph'|'pop'|'in',val)`, `popLog(key,i,every)` — render.py records them and sfx.py turns them into swishes/pops.
- 3D (see examples/long_derivatives): `pj(cam,x,y,z)`, `drawFaces`, `boxFaces`, `surface`, lens effect.
- **Nível 2 (GPU, meta.json `"gl": true`)**: `engine/lens.js` (LENS, buraco negro com lente gravitacional; exemplo projetos/buraco-negro-lente) e `engine/eclipse.js` (ECL, Sol/Terra/Lua com coroa, atmosfera e sombra da Lua calculadas por pixel; precisa também de `"geo": true`; exemplo projetos/eclipse-ultimo). Instruções no cabeçalho de cada arquivo.

## Examples
Os exemplos públicos ficam em `exemplos/` (cinco Shorts verticais, cada um com `COMO_FOI_FEITO.md`). Referências a `examples/...` e `projetos/...` abaixo apontam para projetos que não estão neste repositório.

## v2 additions
### Themes (`meta.json` → `"theme"`)
`noite` (default, navy/neon), `papel` (cream paper, ink, ochre/teal), `lousa` (chalkboard). A theme is `engine/themes/<name>.js`
calling `useTheme({name, C, F, glow, map, drawBg(b,W,H), css})`: it redraws the background, overrides the palette, scales every
`shadowBlur` by `glow`, and remaps literal colours used in scenes (`map`: `'#f4b740'→...`, `'236,230,214'→...`), so one `scenes.js`
renders in any theme. `build.py` prepends `themes/_core.js` + the chosen theme to the scenes.
### Stacked math
`\frac{num}{den}` (nested, colours/exponents inside), `\sqrt{x}`, and parentheses around a fraction grow automatically
(exponent after them is raised). Morphs work between inline `h / H` and the stacked fraction. Write `\` in JS strings.
Fonts lack ⅓ ⅛ ⁴⁄₅: use `\frac`.
### Timing helpers
`build.py` also passes `PLAN.sched` and the spoken texts (`PLAN.txt`), so scenes can use the line start/end and the approximate
time of a word (see `examples/long_taca`: `ls(i)`, `le(i)`, `wt(i,'palavra','word')`).
### Event sonification
Scenes call `logEv(key, kind, value)`; a project `sfx_*.py` turns the rendered events into sound (ticks per moving term, bells,
a glissando tied to a variable, suspended note + resolution, pencil, whoosh, room tone). See `examples/long_taca`.
### Windows
No `python3`: add a shim or call `python`; run with `PYTHONUTF8=1`; Playwright: `python -m playwright install chromium-headless-shell`.

## v3 additions
### FX library (`engine/fx.js`, always injected; everything under `FX.`)
- `FX.noise(x,y,z)`, `FX.fbm`, `FX.rng(seed)`; `FX.particles(ctx,key,t,{n,seed,field,life,color,size,trail,a})` with `FX.curl(scale,speed)` flow fields.
- `FX.counter(ctx,from,to,t0,dur,t,x,y,{suffix,dec})`, `FX.typeOn(ctx,text,x,y,t0,t,{key})` (labels only; equations use deriv).
- `FX.bars(ctx,data,t,{box,t0,key})`, `FX.lineChart(ctx,pts,t,{box,xr,yr})`.
- Camera: `FX.cam(ctx, FX.camAt(t,[{t,x,y,z,rot},...]))`.
- 3D with simple lighting: `FX.faces(ctx,[...FX.sphere(cam,r), ...FX.torus(cam,R,r), ...FX.box(cam,...), ...FX.extrude(cam,pts,h)])`, `FX.line3`, `FX.pj`.
- `FX.trail(ctx,pts,{color,glow})`, `FX.reveal(ctx,x,y,r,draw)`, `FX.pulse(t)`.
- Images: put `.svg/.png/.jpg/.webp` in `PROJECT/assets/`; they are embedded as data URIs at build time; draw with `FX.image(ctx,'name.svg',x,y,w,h,{a,rot,fit})`.
- `FX.tone('name',t,v)` logs a continuous 0..1 value per frame -> glissando in sfx2.
### Sound library (`tools/sfxlib.py`, `tools/sfx2.py`)
Event presets: tick pop bell chime pent whoosh swoosh riser impact pencil glass pour drop click heartbeat sparkle thud chord sus res type beep gong bubble zap stamp page.
Ambient beds: wind rain ocean night room city space drone fire. Configure in meta.json `"sound": {"ambient": [...], "tones": {...}, "gain": {...}}`.
`python tools/sfx2.py P LANG` replaces sfx.py. Listen to everything: `biblioteca_sons.mp3`.
### Music styles (`tools/music.py`)
meta.json `"music": {"style": "calmo"|"misterioso"|"epico"|"lofi"|"minimal", "end_fade": 4}` -> `python tools/music.py P`.
### Voices
`tools/voice.py` (Kokoro EN/PT), `tools/voice_edge.py` (Microsoft neural, online), `tools/voice_clone.py` (Chatterbox, needs GPU: use Colab), `tools/import_voice.py` (zip of wavs from Colab).
### Pipeline (v3)
voice -> plan -> build -> `overlaps.py P pt` and `en` -> music.py -> `mix.py P 0.55 en,pt` -> render.py per language -> sfx2.py -> ffmpeg mux.

## v3.1: real Earth (`"geo": true` in meta.json)
`engine/earth.js` + `geo/` (NASA Blue Marble July 2004, Black Marble 2016 night lights, Blue Marble clouds; Natural Earth 1:50m countries — all public domain;
regenerate the web-sized files with `tools/geo_prep.py`). In scenes:
`const v={cx,cy,R,lat0,lon0,sun:[lat,lon],sx,sy}; EARTH.globe(ctx,{...v,clouds:t*1.5}); EARTH.borders(ctx,v,{a:.4,hi:{iso:'CHL',fill:'rgba(244,183,64,.2)'}});`
`EARTH.circle(ctx,v,lat,lon,deg)`, `EARTH.dot`, `EARTH.label`, `EARTH.proj(v)(lat,lon)`, `EARTH.flat(ctx,[x,y,w,h],{lon:[a,b],lat:[c,d],hi})` (satellite map, returns projector).
`sx/sy` stretch the globe (deformation modes). Per-pixel render: R≈300-380 px costs a few tens of ms per frame.

## v3.2: networks (`engine/net.js`, always injected) and JSON data
- Any `PROJECT/assets/*.json` is embedded as `__DATA__['name.json']`.
- `python tools/net_gen.py P [n] [m] [seed] [name]` -> Barabási-Albert social network with force layout + stats (assets/rede.json); prints example nodes for the script.
- In scenes: `const G=NET.load('rede.json'); NET.draw(ctx,G,{box,t,grow,col:i=>..,edgeCol:(a,b)=>..,nodeA,hi})`, `NET.adj(G)`, `NET.xy(G,box,i)`; or build in JS with `NET.layout(NET.ba(n,m,seed))`.

## v3.3: cosmos (`engine/cosmos.js`, always injected) — Terra, Lua, Sol, escala real, hélices, galáxia
Exemplo completo: `projetos/terra-lua-sol/sistema/` (um plano contínuo; `film(ctx,T)` em tempo absoluto, cenas só marcam a narração).
- **Lua real**: `geo/lua.jpg` (NASA SVS CGI Moon Kit, LROC, domínio público, svs.gsfc.nasa.gov/4720, reduzida a 2k; `build.py` embute
  `geo/lua_web.jpg` quando `"geo": true`). `PL.moon(ctx,c,pos,r,{sun,spin})`: terminador, luz cinérea (amb), `spin:-ânguloDaÓrbita+π` = face fixa para a Terra.
- **Terra**: `PL.planet(ctx,c,'terra',pos,r,{axis,clouds,cloudA,rimCol,spin})` — eixo próprio (23,4°), nuvens reais que somem perto dos polos,
  atmosfera colorida na borda, luzes das cidades no lado noturno. Texturas que ainda não carregaram não ficam em cache; calotas suavizadas (sem "raios" no polo).
- `COS.sun(ctx,c,pos,r,t,{loop,spin,glow,minPx})`: granulação em células (mais fina quando o Sol é grande), escurecimento do limbo, manchas,
  fáculas, coroa com filamentos suaves, bloom que continua visível quando o Sol vira um ponto. `loop=P`: granulação e coroa repetem a cada P s (Shorts em loop).
- `COS.sky(ctx,c,{a,band,pole,par})`: estrelas em direções fixas (giram certo com a câmera), Via Láctea (nuvens + poeira + núcleo) num grande
  círculo de polo `pole`, camada próxima que anda com `par=[px,py]` (paralaxe). `COS.dof(ctx,px,fn)` desfoca uma camada (foco leve).
- `COS.trail(ctx,c,fn,t0,t1,{n,color,lw,a,pow})`: rastro 3D que some (ex.: últimos 2 s da Terra: `fn=tt=>posTerra(tt)`, `t0=T-2`, `t1=T`).
- `COS.tag(ctx,T,seq,{y})`: rótulo fixo NOME · velocidade (Hanken 600 + IBM Plex Mono, valor em ouro, linha de apoio em mono);
  `seq=[{t,name,val,sub}]`, troca em sequência (sai, depois entra), sombra suave atrás; `{t,name:''}` esconde.
- `COS.camPath(T,keys)`: câmera com keyframes `{t,target,dist,yaw,pitch,fov,cx,cy}` (campos podem ser funções de T, ex. alvo seguindo a Terra);
  distância em log (dolly/recuo logarítmico), ease suave. Devolve `W3D.cam`.
- `COS.SCALE` (Sol = 109,1 Terras, Terra–Sol = 11.740 diâmetros, Lua 0,273 Terra a 60,3 raios, velocidades em km/h, ano galáctico) e
  `COS.scaleMix(u1,u2,toy)`: do desenho fora de escala para a escala real (u1 tamanhos, u2 distâncias, em log; o Sol nunca engole a Terra).
  `COS.ring(ctx,q,{r,t})`: anel dourado com pulso para marcar um corpo que virou ponto.
- `COS.helixPos(i,th,cfg)` / `COS.helix(ctx,c,cfg,th,{len,col,lw,al})`: o Sol anda (padrão `COS.HDIR`: 30° do eixo das órbitas, ou seja,
  plano orbital a ~60° do plano da galáxia) e cada planeta desenha uma hélice inclinada; nada do "vórtice" falso da internet.
- `COS.galaxy(ctx,cx,cy,R,rot,{a,tilt})`: Via Láctea vista de cima (gerada por pixel: barra, bojo, 2 braços principais e 2 menores com
  aglomerados e poeira, giro horário com braços arrastados); devolve `proj(rf,ang)`; `COS.SUN_RF=.52` (Sol a ~26 mil anos-luz do centro).
- `COS.stamp(ctx,texto,x,y,t,{rot,size})`: carimbo que bate (ex.: FORA DE ESCALA).
- `BRAND.outro` modo `loop`: o zoom volta a 1 no fim; com `"slow": 1` o último quadro emenda no primeiro. `"y"` posiciona a marca.
- `build.py`: `meta.json` → `"outro": {"y": 1400}`; Lua embutida com `"geo": true`.
- Lua (exemplo: `projetos/terra-lua-sol/lua/`): `PL.surf(pos,r,lat,lon,{axis,spin})` ponto preso à superfície no mesmo mapa da textura;
  `COS.pin(ctx,c,PL.surf(...),{r,stem})` marcador dourado que some do lado de trás; `PL.moon(...,{stretch:{ang,k}})` deformação de maré exagerada;
  `COS.libration(fase)` balanço real (±7,9° em longitude, ±6,7° em latitude); `COS.laser(ctx,qa,qb,t,{period})` pulso de laser ida e volta;
  `COS.arrow(ctx,x0,y0,x1,y1,{col,lw})`; `COS.lookCam(eye,alvo,{fov,cy})`. Face visível da Lua para a Terra: `spin = −ânguloDaÓrbita` (lon 0 = centro da face visível).
- `music.py`: cenas curtas (saída de ~1 s) não quebram mais o fade.

## v3.4: estações do ano (`cosmos.js` + `planets.js`) — exemplo `projetos/terra-lua-sol/terra/`
- **Órbita por data**: `const ORB=COS.kepler({a:7.5,e:.3,peri:3})` — tempo real (Kepler com a excentricidade real 0,0167: datas certas),
  forma exagerada (`e` visual). `ORB.pos(dia)` (Sol na origem), `ORB.lon(dia)`, `ORB.km(dia)` (distância real: 147,1 mi km em 3/1, 152,1 em 4/7),
  `ORB.draw(ctx,c,{a,col,ticks:[{d:3,label:'3 JAN · PERTO',col}],tickOut,labGap})`. `COS.AXIS(23.44)`: eixo fixo da Terra nesse referencial
  (Sul virado para o Sol em dezembro). `COS.dateStr(dia)` → '3 JAN'.
- **Curvas suaves**: `COS.spline([[t,v,inclinação?],...])` (Hermite monótono: nunca volta) — use para a data e para o giro da Terra;
  com a mesma inclinação na primeira e na última chave o vídeo emenda em loop.
- **Giro pela hora local**: `PL.faceSpin(eixo, lon, direçãoDoSol)` deixa a longitude `lon` ao meio-dia (ponto sob o Sol).
- **Globo 3D com mapa**: `PL.borders(ctx,c,pos,r,{axis,spin,hi:{iso:'BRA',color,fill}})` (fronteiras só no lado visível),
  `PL.geoPt(pos,r,{axis,spin})(lat,lon)` → `{P,n}` para rótulos presos, `PL.parallel(ctx,c,pos,r,lat,{axis,spin,sun})` paralelo com o trecho
  de dia em ouro e de noite apagado; devolve a fração de dia (×24 = horas de Sol; luz paralela, como no sombreamento).
- **Neve sazonal**: `PL.planet(...,{snow:{lat:38,k,hemi:1}})` embranquece a terra firme acima da latitude (o mar continua azul).
- **Faixa de luz**: `COS.beam(ctx,c,{p,r,n,L,w,len,col,a})` feixe paralelo de raio `w` batendo no globo no ponto de normal `n`;
  pinta o feixe e a área iluminada e devolve `k` = área/seção do feixe (1/cos do ângulo: "de frente" × "inclinada").
- **Poste com sombra**: `COS.sunDir(lat,decl,H)` (H = ângulo horário, 0 = meio-dia) e `COS.gnomon(ctx,c,{h,sun,R})` — chão local,
  poste, sombra e o raio de Sol que passa pelo topo; devolve `len` (São Paulo: 21/12 ≈ 0; 21/06 = 1,07 × a altura).
- Câmera sem roll: Sol e Terra quase cheia no mesmo quadro só com a câmera atrás e abaixo do Sol (gancho do vídeo `terra/`).

## v3.5: calendário (`cosmos.js`) — exemplo `projetos/terra-lua-sol/bissexto/`
- `COS.finish(ctx,c,r,an,{w,label})` linha de chegada quadriculada atravessando uma órbita circular (plano y=0, ângulo como `PL.pos`).
- `COS.orbitArc(ctx,c,r,a0,a1,{band,col})` trecho da órbita em destaque (o pedaço que falta, estações, acúmulo de anos).
- `COS.flag(ctx,c,P,{label,t})` bandeirinha num ponto 3D (onde o calendário vira o ano).
- `COS.calPage(ctx,x,y,s,{day,mon,sub,flip})` folha de calendário; `flip` 0..1 arranca a folha.
- `COS.dayDial(ctx,x,y,r,{slices:[{a0,a1,col}],hand})` mostrador de 24 h com fatias em horas (¼ de dia, 5h49...).
- `COS.chip(ctx,x,y,s,{text,state:'ok'|'x',strike,sub})` ficha de ano: ouro (vale) ou riscada em ciano com traço animado.
- Vertical: para um movimento "andar até a linha", câmera de cima olhando no sentido do movimento (a Terra embaixo, a linha em cima).

## v3.6: zoom de escala e Shorts sem narração (`engine/scale.js`, sempre injetado) — exemplo `projetos/zoom-escala/`
- Escala: `z = log10(largura da tela em metros)`; tudo concêntrico; cada objeto com uma janela de z (aparece/some) e raio em px `R = W·r/10^z`.
- `SC.atom`, `SC.dna`, `SC.cell`, `SC.iris`, `SC.burj`, `SC.web` (teia cósmica); `SC.sphere(ctx,'terra'|'lua'|'sol',x,y,R,o)` desenha as esferas do kit direto em px.
- `COS.sun(...,{red:0..1})`: supergigante vermelha (Betelgeuse, Stephenson 2-18). São Paulo à noite em qualquer escala: `EARTH.night` com `mpp = 10^z/W`.
- Camadas do formato sem voz: `SC.ruler` (régua log lateral 10^lo…10^hi, números borrados ao correr), `SC.type` (texto letra a letra), `SC.beat` (flash, tremor e tranco a cada batida).
- Sem narração: `lines.py` com `LINES=[]` e `BASE=[30]`, `voice/durs.json` = `{"pt": []}`, trilha própria (`musica.py`) copiada para `audio_pt.wav` (sem mix.py); sem "outro" para o loop fechar no tempo exato.

## v3.7 — Saturno (`SAT`, engine/saturn.js; exemplo `projetos/saturno/`)
- `SAT.draw(ctx,c,{R,sun,t,P,spin,ringA,q})`: planeta + anéis por traçado de raios (perfil radial real, sombras mútuas, lado escuro, rotação kepleriana com loop em `P`); `q` = orçamento de pixels.
- `SAT.ice` (blocos de gelo 3D), `SAT.rain` (chuva dos anéis pelas linhas de campo), `SAT.geyser` (jatos de Encélado), `SAT.haze` (halo de Titã), `SAT.edge` (fio dos anéis de lado), `SAT.hidden`, `SAT.MOONS`, `SAT.ringV(r)` em km/h.
- `PL.addTex(k,fn)`: texturas procedurais novas para `PL.sphere`: 'tita', 'encelado', 'gelo', 'japeto'.

## v3.7: onda de pêndulos (`PEND`, em `engine/scale.js`) — exemplo `projetos/pendulos/`
- `const P=PEND.make({n:15,G:30,K:20,A:.36,dx:.045})`: o pêndulo i faz K+i vaivéns em G s (T = G/(K+i), L = gT²/4π²), todos saem
  juntos e se realinham em t = G (vídeo de G segundos = loop exato). `P.pos(i,t)`, `P.theta(i,t)`, `P.swings(i,t)`, `P.rows(t)` (filas em G/k).
- `PEND.draw(ctx,c,P,t,{trail,rb})`: suporte, fios, bolas neon que acendem no ponto mais baixo e rastros; devolve as bolas na tela
  (`{i,q,R,glow}`) para HUD preso às bolas e faíscas.

## v3.8 — trânsito urbano 3D (`TRAFFIC3D`, `engine/traffic3d.js`)

- `TRAFFIC3D.road(ctx,c,{z0,z1,half})`: pista vertical com faixas, acostamento dourado e textura determinística.
- `TRAFFIC3D.car(ctx,c,state,{model,col})`: seis volumes de carro (`hatch`, `sedan`, `suv`, `van`, `taxi`, `bus`) com carroceria, cabine, vidro, rodas, luz e sombra.
- `TRAFFIC3D.fleet(ctx,c,states)`: desenha a frota ordenada por profundidade.
- `TRAFFIC3D.city(ctx,c,{seed})`: cidade em camadas para cenas que precisarem de geometria urbana; o exemplo `transito-v2` usa skyline controlado para preservar legibilidade no vertical.
- `TRAFFIC3D.cam(t)`: câmera com mudança de intenção a cada 1,55 s; use para garantir que nenhum plano fique fixo por mais de dois segundos.

## v3.8: epiciclos de Fourier (`engine/epi.js`, sempre injetado) — exemplo `projetos/fourier-brasil/`
- Entrada: `EPI.geo('BRA')` (contorno de qualquer país do Natural Earth, com cos da latitude), `EPI.svg(d,{step})` (caminho SVG: M L H V C S Q Z),
  `EPI.pts(lista)`. `E=EPI.make(pontos,{M:1024,keep:420})` reamostra por comprimento de arco, faz a DFT e ordena os termos por raio
  (normalizado para raio 1; `E.c0`/`E.scale` desfazem a normalização).
- `EPI.chain(E,u,N)` juntas da cadeia (u = 0..1 é uma volta; N fracionário: o termo k entra com peso clamp(N−k), sem saltos) e `EPI.tip`.
- `EPI.view(cx,cy,s,fx,fy)` câmera 2D (seguir a ponta = fx,fy na ponta; zoom = s). Close de 30× mostra dezenas de círculos aninhados.
- `EPI.circles` (aro brilhante, raio-vetor, preenchimento sutil, espessura pelo raio na tela, some abaixo de minPx), `EPI.ink` (traço de luz:
  espessura pela velocidade, gradiente de cor, cauda viva e tinta fraca persistente; amostras {p,sp,age,u}), `EPI.spark` (faíscas na ponta).
- Loop exato: a caneta dá um número inteiro de voltas no vídeo e N volta ao valor inicial.

## v3.9: 4D (`engine/hyper.js`, sempre injetado)
- `HY.cube(n)` n-cubo (0–4D) de lado 2; `HY.build(n,e)` o (n−1)-cubo puxado no eixo n−1 (e 0..1, centrado, emenda entre etapas); `HY.counts(n)` {V,E,F,C}.
- `HY.rot(p,{xy,xz,xw,yz,yw,zw})` rotação 4D por planos; `HY.proj(p,{d,p4})` x' = x·d/(d−w); `HY.cam({cx,cy,s,yaw,pitch,roll,dist,f})` câmera 3D.
- `HY.draw(ctx,cam,G,{rot,d,lw,a,faceA,dots,glow,colAxis,cols,alphaOf})` traço com brilho; cor e espessura pela profundidade em w (dourado perto, ciano longe).
- `HY.net(n,f)` planificação em cruz (n=3: 6 quadrados; n=4: 8 cubos, cruz de Dalí) com dobra por célula (0 aberta, 1 dobrada = `HY.cube(n)`).
- `HY.keys(K,T)` keyframes suaves para câmera. Exemplo: `projetos/hipercubo/`.

## v3.10: impacto de asteroide e relevo real (`engine/impact.js` = `IMP`, sempre injetado) — exemplo `projetos/asteroide-everest/`
- `IMP.rock({seed,sub})` asteroide procedural (icosfera, fbm, crateras com borda, albedo variado); `IMP.drawRock(ctx,c,rk,{pos,rot,s,sun,heat,vel})`
  com `heat` 0..1 acendendo em brasa a face da frente (entrada na atmosfera).
- Relevo real: `meta.json` `"dem": ["everest"]` injeta `kit/geo/everest.json` (AWS Terrain Tiles/SRTM, 202 m por ponto, pico = 8.849 m);
  `IMP.dem('everest')`, `IMP.terrain(D,{step})`, `IMP.drawTerrain(ctx,c,tr,{sun,haze,hazeK,edge,warm,cloud:{y,col}})` (neve, gelo, rocha;
  `cloud` = mar de nuvens até a altitude y); `IMP.profile(D)` + `IMP.ghost(ctx,c,perfil,{pos,u,col})` silhueta "fantasma" em escala.
  Para outro lugar: baixar os tiles terrarium (`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/z/x/y.png`, altitude = R·256+G+B/256−32768),
  recortar e gravar no mesmo formato JSON (`{cel_m,nx,ny,pico,h}`); fonte em `geo/FONTES.txt`.
- Fogo e impacto (em px): `IMP.fireball` (cauda de plasma + faíscas) e `IMP.bow` (choque na frente, depois da pedra), `IMP.dome` (bola de fogo),
  `IMP.curtain` (cortina de detritos), `IMP.circle3` (círculo 3D, ex.: onda no mar), `IMP.shake(T,t0)` (tremor).
- Globo: `IMP.ejecta(ctx,c,E,R,n,t)` detritos balísticos em arco; `IMP.shockGlobe(ctx,c,E,R,n,ang)` anel da onda de choque.
- `IMP.planeIcon` ícone de avião para marcar 10 km. Junto: `PL.sphere`/`PL.planet` aceitam `maxR` (buffer maior, menos borrado em close) e `clip`
  (só calcula os pixels na tela).

## v3.11 — GMAP: galáxia sobre um mapa real (engine/galmap.js)
Exemplo: `projetos/via-lactea-brasil/` ("Se a Via Láctea fosse o BRASIL"). Mundo em km no plano y = 0 (x leste, z sul), mesma câmera do W3D/COS.
- `tools/geo_crop.py NOME lon0 lon1 lat_norte lat_sul [escala]` recorta o satélite (terra.jpg 5400 px) e as luzes (noite.jpg) → `geo/NOME_sat.jpg`, `_noite.jpg`, `_crop.json`; no projeto: `"geo": true, "geo_crops": ["NOME"]`.
- `GMAP.frame(lat0,lon0)` projeção local (km); `GMAP.map(ctx,c,fr,'brasil',{day,night})` mapa com bordas suaves; `GMAP.border(ctx,c,fr,'BRA',{...})` fronteira.
- `GMAP.galaxy({R,center,sunAt,h,n,seed})` Via Láctea de estrelas (barra 27°, 4 braços de passo 12°, esporão de Órion com o Sol a 0,52 R, poeira, espessura real); `G.draw(ctx,c,{a,glow,dust,stars,tw})`; de lado ganha volume (camadas). `G.sun` = posição do Sol.
- `GMAP.quad(ctx,c,img,P0,PU,PV,{n,op})` imagem num paralelogramo 3D (triângulos afins, sem costura mesmo em 'lighter').
- `GMAP.circle/line/ruler/disc` peças 3D; `GMAP.person(ctx,c,P,h,{hand,rim})` pessoa de costas com o braço indo até um ponto 3D.
- `tools/frame.py PROJECT T [saida.jpg] [x0,y0,x1,y1]` um quadro em resolução cheia (a folha de stills reduz demais).

## v3.12 — planetas com mapas reais e ranking com velocímetro (exemplo `projetos/planeta-rapido/`)
- **Mapas reais** em `geo/planetas/<k>_web.jpg` (Mercúrio, Vênus, Marte, Júpiter e Saturno em 4K; Urano e Netuno em 2K; Solar System Scope, CC BY 4.0:
  pôr o crédito na descrição). `build.py` embute como `geo:pl_<k>.jpg` quando `"geo": true` (`"planet_maps": false` desliga) e `PL.sphere`/`PL.planet`/`SC.sphere`
  passam a usá-los sozinhos. Mipmaps automáticos quando o planeta é pequeno (sem cintilar) e filtro bilinear em close.
- `PL.planet(ctx,c,'saturno',p,r,{hq:true,t,P,axis})`: Saturno pelo `SAT.draw` (anéis com perfil real, sombras); para ver os anéis abertos, incline o eixo para a câmera.
- `RK` (engine/rank.js, sempre injetado): `RK.speedo` (velocímetro em arco com faixa ciano→ouro→branco, ponteiro e mostrador, `round`),
  `RK.board` (ranking #1…#n com linhas que entram na batida, `cur` em ouro, `mystery` "???" pulsando, `out` para esvaziar no fim do loop, `fs` letras),
  `RK.streaks` (estrelas que viram riscos conforme a velocidade; use `RK.acc(chaves)` para a integral da velocidade, e corrija `s` escondido para o loop fechar),
  `RK.pop`, `RK.fmt`.
- Padrão "palco por item": cada planeta com raio 1 na origem e câmera própria (`W3D.cam` com dist = f/raio desejado em px); a troca é um mergulho
  (o anterior com dist ×e^-2,4 saindo pelo lado, o próximo vindo de dist ×e^3,4). A órbita tracejada que anda e o rastro de luz mostram a velocidade.

## v3.13 — SCOPE: telescópio, ocular e fases da Lua (engine/scope.js, sempre injetado) — exemplo `projetos/fases-lua/`
- `SCOPE.draw(ctx,c,{pos,dir,sun,amb,a,s})` refrator de 102 mm num tripé (MESH): tubo branco com anéis dourados, para-sol, buscadora,
  focalizador e ocular; o tubo aponta para `dir` (azimute e altura), o tripé fica no chão em `pos`; sombra de contato. Unidades em metros.
  Com o RIO3D, use `COS.lookCam(eye,alvo,{fov:graus*π/180})` (mesma projeção) e alvo a poucos metros do olho (o plano near do W3D é 2% da distância).
- `SCOPE.eyepiece(pos,dir)` → `{eye,back,up,right,head}`: posição da lente da ocular para a câmera mergulhar nela.
- `SCOPE.moon(ctx,x,y,R,{sun,earth,pa,rim,glow,bump})` Lua NASA com fase física: `sun` = direção do Sol na vista ([x dir., y cima, z para quem olha]);
  Lommel–Seeliger (a cheia fica "chapada" como a real), terminador nítido com relevo das crateras só perto dele, luz cinzenta da Terra no
  lado escuro, `rim` contorno dourado só na borda acesa. `SCOPE.sunView(elong,{south:true})` dá o `sun` para quem olha da Terra
  (hemisfério sul: crescente acesa à esquerda). `SCOPE.phase(idade)` → elongação, fração acesa, nome do calendário (NOVA/CRESCENTE/CHEIA/MINGUANTE,
  cada um 1/4 do ciclo a partir do seu dia) e nome fino; `SCOPE.SYN` = 29,530589 d.
- `SCOPE.ocular(ctx,{x,y,r})` máscara do campo da ocular (borda difusa, franja de cor, reflexo); `SCOPE.stars(ctx,c,{t,horizon,avoid})`
  estrelas que cintilam (mais perto do horizonte) por cima do `COS.sky`; `SCOPE.halfRim` arco dourado na metade acesa vista de fora;
  `SCOPE.cone(ctx,c,E,R,toSun,len)` cone de sombra de um planeta.
- RIO3D: `moon:{dir,ang,sun}` — com `sun` a Lua do céu sai em fase (terminador nítido, luz cinzenta); sem `sun`, cheia como antes.

## v3.14 — IRIS: arco-íris físico, tempestade, gota macro e avião na GPU (2026-11-03)
Arquivo `engine/iris.js` (WebGL2, `meta.json` `"gl": true`; render com `--use-angle=d3d11`). Exemplo: `projetos/arco-iris/`.
A documentação completa das funções está no cabeçalho do `iris.js`. Resumo:
- `IRIS.init(W,H,{scale:.6})`, `IRIS.frame(camFn,T,{mode:0 campo | 1 gota (mm) | 2 avião, sun, widen, sat, alex, sup, glint, rain, storm, drop, plane, layers})`
  → canvas em `IRIS.canvas`. Arco calculado por pixel com 12 comprimentos de onda (n da água 1,32526 + 2909/λ²: primário 40,65°–42,34°,
  secundário 50,42°–53,48°). `widen:7` alarga a faixa , `sat` satura, `alex` suaviza a faixa de Alexandre.
- `IRIS.rays` (raios traçados com Snell na gota, leque cor por cor), `IRIS.beam` (feixe 3D com brilho, recorte perto da lente),
  `IRIS.rail` (câmera em trilho C1), `IRIS.trace`, `IRIS.ang`, `IRIS.COLS`, `IRIS.terr`.
- Modelos 3D abertos: `meta.json` `"models": ["aviao/regional-jet-aircraft.glb"]` (arquivos em `kit/assets/`, com `LICENCA.txt`) e
  `IRIS.loadModel(nome,{skip})`; `opts.plane={p,f,u,model}` desenha o modelo com PBR simples, janelas acesas e luzes de navegação.
- O `build.py` injeta `iris.js` em todo projeto `gl` e `__MODELS__` quando há `"models"`. Compilar o shader leva ~75 s na Vega 8.

## v3.15 — ROCKET: Saturno V e a missão Apollo em 3D de verdade (three.js na GPU, 2026-11-03)
Arquivo `engine/rocket3d.js` (objeto `ROCKET`), three.js r147 local em `kit/vendor/three-r147/` (MIT, ver `FONTE.txt`).
`meta.json`: `"rocket3d": true` (o `build.py` injeta three + GLTFLoader + EffectComposer/bloom + rocket3d), `"gl": true` (GPU, `--use-angle=d3d11`),
`"geo": true` (Terra, nuvens e Lua NASA) e, para o módulo lunar, `"models": ["nasa/Apollo_Lunar_Module_sem_draco.glb"]`.
Exemplo: `projetos/apollo-11/`. A API completa está no cabeçalho do arquivo. Resumo:
- `ROCKET.init(W,H)`; `ROCKET.frame(stFn,T,{sub:3,shutter:.5})` → canvas (média de subquadros = desfoque de movimento). `stFn(t)` devolve o
  estado: `cam{pos,tgt,fov,shake}`, `stack{p,r}`, `parts{nome:{p,r,vis,open}}` (peças soltas no mundo; `open` abre os painéis do SLA),
  `flames[{at,k,vac,len,wide}]`, `env{sky,stars,sun,clouds,pad,mast,earth,moon,moonGround,ocean,exp}`, `smoke[]`, `sparks[]`, `rings[]`,
  `plasma`, `chutes`, `lm`. Tudo depende só de t (fumaça analítica por semente), então o filme pode rebobinar.
- Saturno V por código com as medidas reais (S-IC 42,1 m, S-II 24,8, S-IVB 17,9, IU 0,9, SLA 8,5, SM, cápsula 3,2, torre de escape 10,1; total 110,6 m),
  pintura da Apollo 11 (padrão de rolagem, "UNITED STATES", "USA"). Peças: `ROCKET.PARTS`. Plataforma 39A com a torre umbilical vermelha e o lançador.
- Chamas físicas: F-1 com colar escuro na saída de cada sino, jatos que se fundem numa coluna amarelo-alaranjada com
  turbulência e fuligem; no vácuo a pluma abre em sino translúcido. J-2 azul-pálida quase invisível; SPS/LM hipergólico; motor sólido (torre, retros).
  Mistura pré-multiplicada (a chama cobre o fundo, a cor não estoura em branco sobre céu claro). Comparação: `projetos/apollo-11/_teste_chama/`.
- Pós: HDR em meia precisão, bloom (`bloom`, `bloomT`), passe final com exposição (`env.exp`), ACES, saturação (`env.sat`) e vinheta; reflexo
  dos metais por PMREM de um céu em gradiente (`env.envI`).
- `ROCKET.proj(cam,p)` projeta um ponto 3D na tela (rótulos 2D); `ROCKET.world(stack,nome)`, `ROCKET.local(nome)`.
- Casamento com vídeo real: o projeto apollo-11 mede câmera/FOV sobre um quadro do filme de 70 mm (CAM0) e esconde o corte num clarão.
- Modelo da NASA do Saturno V (`kit/assets/nasa/Saturn_V.glb`) foi testado e não serve (pintura errada, peças fundidas); o do LM serve
  (a compressão Draco foi desfeita com gltf-transform para não precisar do decodificador).

## v3.16 — ROAD3D: estrada que dobra para cima, carro realista e subida até o espaço (three.js na GPU, 2026-11-04)
Arquivo `engine/road3d.js` (objeto `ROAD3D`). Exemplo: `projetos/espaco-de-carro/`. `meta.json`: `"road3d": true` (o `build.py` injeta three r147,
o carro `assets/carro/CarConcept.glb`, asfalto e céu do Poly Haven e o satélite de SP de `geo/sp`), `"gl": true`, `"geo": true`, `"dem": ["everest"]`,
`"models": ["aviao/regional-jet-aircraft.glb"]` para o avião. Licenças em `assets/LICENCA_estrada_ceu.txt` (carro CC BY 4.0: crédito na descrição).
- Mundo em metros, x leste, y cima, z sul, origem no início da dobra; Terra com centro em (0, −RE, 0). `ROAD3D.geo(lon,lat,h)` → mundo.
- Pista num referencial próprio girado pelo rumo (`init({head, lat0, lon0, R})`): reta → quarto de círculo de raio R → vertical até onde quiser.
  `ROAD3D.path(s)` {p,T,N,B}, `alt(s)`, `sOf(h)`, `rf([x,y,z])` (referencial da pista → mundo). Malha refeita em volta do carro a cada subquadro
  (passo fino perto, largo longe): asfalto PBR com faixas pintadas (padrão DNIT), acostamento, guard-rail com postes, tabuleiro de concreto e aterro.
  `road:{far,top,w,glow}` desenha a pista inteira de longe (fita que engorda com a distância).
- Carro: o GLB é orientado sozinho (frente = capô), rodas com pivô e giro por `s`, painel repintado em PT marcando 100 km/h.
  `ROAD3D.carPose(car)`, `ROAD3D.carCam(car,{eye,look,fov})` (vista do motorista: eye [0,1,12,.02]; o volante é central).
- Chão: recortes Sentinel-2 colados na esfera (`tools/sp_prep.py`: sp_perto z14 e sp_regiao z12, máscara de água → roughness, água lisa reflete o céu),
  detalhe de ruído perto da câmera; Terra NASA com atmosfera; céu = foto 360° do Poly Haven no chão, gradiente e preto com 26 mil estrelas e Via Láctea.
- Estado por subquadro: `env{sky,stars,milky,sun,skyRot,sunI,hemi,cabin,exp,sat,vig,clouds,moon:{dir,ang},near,reg,earth}`,
  `marks{everest:{p},plane:{p,yaw},balloon:{p,k,burst},sign:{s,x},sats:[{k:'sat'|'flat'|'iss',p,r,s}],karman:{a}}`.
- Armadilhas: câmera com `up` paralelo à direção de visão gira a imagem sozinha (nas câmeras que olham ao longo da pista vertical, use
  up = normal da pista com um pouco do lado); no formato vertical o campo horizontal é estreito (~±13° com fov 46), mire o que precisa aparecer.

## v3.17 — GMOV: o Sistema Solar se movendo pela galáxia (engine/galmove.js, sempre injetado, 2026-11-07) — exemplo `projetos/sistema-solar-espiral/`
- `GMOV.well(ctx,c,{center,R,depth,soft,sink,rings,t,ringCol})` grade de espaço-tempo que afunda (poço de Plummer) com anéis de gravidade saindo do centro.
- `GMOV.galaxy3D(ctx,c,{center,R,rot,up,bulge})` textura da Via Láctea do COS (`COS.galaxyTex()`, agora exportada) presa a um disco 3D com perspectiva real; de lado ganha bojo e disco fino.
- `GMOV.chevrons(ctx,c,{center,R,n,rot,size,dir})` anel de setas girando no plano do disco (sentido da rotação).
- `GMOV.sunPath(th,{v,dir,pole,amp,P})` avanço + sobe e desce pelo disco; serve de `s0` para hélices próprias (no exemplo, plano das órbitas a 60° do disco).
- `GMOV.updown` (setas ^^ / vv), `GMOV.lock` (cadeado vetorial), `GMOV.speedRibbons` (fitas largas atrás de um corpo em movimento).
