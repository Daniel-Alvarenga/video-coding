# AGENTS.md: guia para agentes de IA

Este arquivo é para o agente (Claude, Codex, outro LLM) que vai **produzir um vídeo** com o motor ou **ampliar o
motor**. Leia inteiro antes de começar. A API detalhada está em `docs/referencia-api.md`; os passos para humanos
estão em `docs/`. Aqui fica o que um agente precisa para trabalhar sem quebrar nada.

---

## 1. Regras de trabalho

1. **Não reescreva o motor. Amplie.** Cada visualização nova vira um módulo reutilizável em `engine/` (seção 4).
   Não cole código de visualização genérica dentro de um `scenes.js`.
2. **Não quebre vídeos antigos.** Ao mudar um módulo existente, acrescente opções cujo padrão reproduz o
   comportamento antigo. Depois da mudança, rode `build.py` + `stills.py` num exemplo que use o módulo.
3. **Confira toda conta em Python antes de animar.** Anote as contas e as fontes como comentário no topo do
   `lines.py` (veja qualquer exemplo). Se a fonte da ideia estiver errada, corrija e avise.
4. **Você não ouve áudio.** Confira o que dá para medir (duração de cada fala, volume em LUFS, picos, se vídeo e
   áudio têm a mesma duração) e diga ao usuário que timbre e pronúncia precisam de um ouvido humano.
5. **Você vê o vídeo por quadros.** Use `tools/stills.py` (folha de quadros) e `tools/quadros.py` (um quadro por
   segundo) e **abra as imagens** antes de dizer que um vídeo está pronto.
6. **Determinismo.** Toda aleatoriedade usa semente (`FX.rng(seed)`). O mesmo projeto deve renderizar igual
   toda vez; o estado de uma cena depende só do tempo `t`.
7. **Licenças.** Só ferramentas, modelos e assets com licença que permita o uso pretendido. Asset novo vai com
   fonte e licença em `LICENCA.txt` (em `assets/`) ou `geo/FONTES.txt`, e uma linha em `CREDITOS.md`.
   Não baixe imagens de origem desconhecida; desenhe por código ou use domínio público / CC0 / CC BY.
8. **Uma tarefa pesada por vez.** Render e modelos de voz consomem muita CPU e memória. Rode em prioridade baixa
   e grave log (`> log-pt.txt 2>&1`) para poder retomar.
9. **Não mexa em segredos.** Nada de chaves, tokens ou arquivos `.env` no repositório.

---

## 2. Mapa

```
engine/           módulos JS (um objeto global em maiúsculas por arquivo: FX, COS, PL, STAR, BH, SAT, W3D...)
engine/themes/    _core.js + um arquivo por tema (noite, papel, lousa)
engine/template_short.html, template_long.html   páginas onde as cenas rodam
tools/            pipeline Python (build, plan, render, voz, mix, música, sfx, checagens, miniatura)
tools/make.sh     pipeline genérico (bilíngue, Kokoro); os exemplos têm make.sh próprio
voz/              notebook do Colab (VoxCPM2) + guia
assets/ geo/      modelos 3D e mapas reais (licenças em CREDITOS.md)
vendor/           three.js r147
exemplos/<nome>/  meta.json, lines.py, scenes.js, make.sh, [musica.py], voice/, video.mp4, COMO_FOI_FEITO.md
docs/             documentação; referencia-api.md é a fonte de verdade da API
```

Projetos novos: crie `projetos/<nome>/` na raiz do repositório (ignorado pelo git) ou em qualquer lugar e aponte
`VIDEO_CODING_KIT` para a raiz do repositório.

---

## 3. Fluxo de um vídeo

Cada passo tem uma saída que você consegue conferir.

1. **Ideia e contas.** Escreva as contas num script Python curto. Saída: números confirmados com fonte, anotados
   no topo do `lines.py`.
2. **Roteiro.** Tabela *tempo · o que se vê · fala exata · texto na tela* (num `ROTEIRO.md` do projeto). No fim,
   uma lista **"Kit a criar"**: o que falta no motor para a visualização ficar boa. Mostre ao usuário se o formato
   for novo.
3. **Kit.** Para cada item de "Kit a criar", crie ou amplie um módulo (seção 4) **antes** de escrever as cenas.
4. **Projeto.** Copie o exemplo mais parecido (narrado: `sol-sumisse`, `anos-netuno`, `buraco-negro-mao`;
   narrado com tempo deformado pela voz: `vida-estrelas`; sem narração: `planetas-cabem`). Ajuste `meta.json`.
5. **`lines.py`.** `BASE` = durações nominais das cenas; `LINES` = `(cena, início, EN falado, EN legenda,
   PT falado, PT legenda)`. Vídeo só em PT repete o PT nas colunas EN. Números **por extenso** na fala, algarismos
   na legenda. Sem narração: `LINES=[]` e `voice/durs.json` = `{"pt": []}`.
6. **Voz.** **Pergunte ao usuário qual voz usar** antes de gerar (seção 6). Saída: `voice/ptNN.wav` +
   `voice/durs.json`.
7. **`plan.py`.** Encaixa as falas nas cenas e grava `plan.json` (durações reais e `sched`). Cronometre as
   animações pela fala: `ls(i)` / `le(i)` = início/fim da fala i, `wt(i,'palavra')` = instante de uma palavra.
8. **`scenes.js`.** Use `W`, `H`, `CX=W/2`, nunca 1080/1920 fixos. Nos Shorts, o padrão que funciona é um plano
   contínuo em tempo absoluto com câmera sempre em movimento (veja os exemplos).
9. **Checagens.** `build.py` → `overlaps.py P pt 0.5` (sem conflitos) → `stills.py P pt t1,t2,...` em 8 a 15
   instantes → **olhe o `sheet.jpg`**. Corrija e repita até ficar limpo. Seção 5.
10. **Render.** `bash make.sh` do projeto: música → mix → render → efeitos → normalização → MP4.
11. **Conferência final.** Extraia quadros do MP4 final, confira duração de vídeo = áudio e volume (-14 LUFS).

---

## 4. Criar ou ampliar um módulo do kit

1. **Inventário primeiro.** Leia `docs/referencia-api.md` e procure em `engine/` se já existe algo parecido.
   Exemplos do que há: `FX` (partículas, contadores, câmera, 3D simples, imagens, tons), `EARTH` (globo com
   satélite real, nuvens, noite, fronteiras), `COS` (Sol, Lua, céu, escala real, órbitas de Kepler, rótulos),
   `PL` (planetas 3D com mapas reais), `STAR` (estrelas, gigantes, supernova), `BH` (lente gravitacional), `SAT`
   (Saturno e anéis), `W3D` (3D com câmera e sombra), `LM` (referências de tamanho real), `SC` (zoom de escala),
   `EPI` (epiciclos de Fourier), `RK` (ranking com velocímetro), `ROCKET`/`ROAD3D`/`LUZ3D` (three.js).
2. **Arquivo novo** `engine/<nome>.js` com um objeto global em maiúsculas (`const NOVO=(()=>{...; return {...}})();`).
   Funções recebem `ctx`, câmera e um objeto de opções `{...}` com padrões sensatos.
3. **Cabeçalho documentado** no próprio arquivo: o que o módulo faz e a assinatura de cada função pública.
4. **Registro no build.** Três jeitos, do mais simples ao mais específico:
   - `meta.json` → `"kits": ["nome"]` injeta `engine/nome.js` sem mexer no `build.py` (prefira este);
   - se o módulo deve estar sempre disponível, acrescente-o à lista de arquivos injetados em `tools/build.py`;
   - se precisa de dados grandes ou three.js, crie uma chave própria em `meta.json` e trate no `build.py`
     (veja como `rocket3d`, `road3d` e `luz3d` são tratados).
5. **Dados reais** (texturas, relevo, contornos) em `geo/` ou `assets/`, com fonte e licença (regra 7).
6. **Pensado para loop:** quando houver movimento contínuo, aceite um período `P` para o último quadro emendar
   no primeiro.
7. **Documente** no mesmo dia: nova seção em `docs/referencia-api.md` com funções, parâmetros e o exemplo que usa.

Detalhes e um módulo completo de exemplo: `docs/04-criando-um-modulo-do-kit.md`.

---

## 5. Checklist de qualidade (antes de entregar)

Visual
- [ ] Paleta do tema respeitada; uma cor de destaque = o herói (a resposta, o que está sendo medido); uma
      secundária para o resto. Um foco de destaque por momento.
- [ ] Movimento constante: nenhuma tela parada por mais de cerca de 3 s; câmera sempre se movendo.
- [ ] Passos algébricos com `deriv()` (símbolos deslizam), nunca digitados letra a letra.
- [ ] Textos grandes o bastante para celular (rótulo abaixo de ~32 px some); poucos elementos por vez.
- [ ] Vertical: conteúdo entre y≈180 e y≈1300; a parte de baixo (H−380) fica livre para a interface dos apps.
- [ ] `overlaps.py` sem conflitos; `sheet.jpg` conferido.
- [ ] Loop: o último quadro emenda no primeiro (stills em 0 e em T−1/30).
- [ ] Exagero de escala marcado na tela ("FORA DE ESCALA", `COS.stamp`).

Som
- [ ] Eventos sonoros ligados à animação (`logEv`, `FX.tone`) e presentes em `v-pt.mp4.events.json`.
- [ ] Ambientes baixos; nada de chiado ou ruído forte.
- [ ] Música abaixa sob a voz (ducking no `mix.py`).
- [ ] Volume final -14 LUFS integrado, pico -1,5 dB.

Conteúdo
- [ ] Contas conferidas e anotadas no `lines.py`, com fonte.
- [ ] Fala natural: frases curtas, porquê com exemplo concreto, sem bordões de texto gerado por IA ("E tem
      mais", "A boa notícia", "Não é X. É Y.", trios retóricos, exclamações em série).

Arquivo
- [ ] MP4 final H.264 + AAC, `+faststart`, `yuv420p`. Versão leve com crf 28 para enviar pelo celular.

---

## 6. Voz

- **Pergunte ao usuário qual voz usar antes de gerar narração.** Opções em `docs/06-voz-e-narracao.md`:
  Kokoro (local, leve, bom em EN), edge-tts (online, rápido, bom para marcar tempo), VoxCPM2 no Colab (melhor
  qualidade em PT-BR; desenho de voz por descrição ou clone de uma referência).
- **Clone só com autorização** de quem é dono da voz.
- Formato que o motor espera: `voice/<lang>NN.wav` (NN = índice em `LINES`, sem silêncio nas pontas) e
  `voice/durs.json` = `{"pt": [durações em s]}`. `tools/import_voice.py` importa um zip vindo do Colab;
  `tools/escolher_consistente.py` escolhe a tomada mais uniforme quando há várias versões de cada fala.
- Efeito de sala na voz: `meta.json` → `"voice_fx"` (aplicado no `mix.py`).

---

## 7. Armadilhas conhecidas

- **Windows:** não existe `python3`; chame `python` ou crie um atalho. Sempre `export PYTHONUTF8=1`. O pip pode
  recusar `--break-system-packages` (o `setup.sh` tenta sem). Chromium: `python -m playwright install
  chromium-headless-shell`. O ffmpeg instalado pelo WinGet só entra no PATH de terminais abertos depois da
  instalação.
- **PC sem GPU dedicada:** módulos three.js e shaders (`"gl": true`) renderizam por software e ficam lentos.
  Modelos de voz grandes rodam no Colab (GPU T4 grátis), não no PC.
- **Render longo:** um Short leva dezenas de minutos num notebook comum. Rode em segundo plano com log e mande
  notícias curtas ao usuário.
- **Fala muito curta** ("Um.") sai cortada em alguns modelos: gere uma frase maior e recorte.
- **Cor literal em cenas:** use as cores do tema (`C.gold`, `C.cyan`...) ou as literais mapeadas pelo tema; uma
  cor fora do mapa não muda quando o tema muda.
- **Transição entre layouts diferentes:** `tr:'dip'` (passa pelo fundo), não `'fade'`.
- **Saída do vídeo com marca:** `meta.json` → `"outro"` + `"brand": {"name": "...", "accent": N}` (`BRAND.outro`).
