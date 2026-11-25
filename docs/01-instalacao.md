# 1. Instalação

## Requisitos

| Ferramenta | Para quê | Como conferir |
|---|---|---|
| Python 3.10+ | pipeline (`tools/`) | `python --version` |
| Node 18+ e npm | baixar as fontes (@fontsource) | `node --version` |
| ffmpeg (com ffprobe) | montar vídeo e áudio, medir volume | `ffmpeg -version` |
| Chromium do Playwright | renderizar as cenas quadro a quadro | instalado pelo `setup.sh` |
| Bash | rodar os `make.sh` | no Windows, Git Bash |

## Passo a passo

```bash
git clone <url-do-repositorio> video-coding
cd video-coding
bash setup.sh
```

O `setup.sh`:
1. instala `kokoro-onnx edge-tts soundfile scipy numpy pillow playwright`;
2. roda `npm install` em `fonts/` (Newsreader, Hanken Grotesk, IBM Plex Mono);
3. baixa o modelo de voz Kokoro para `models/` (~350 MB, ignorado pelo git);
4. instala o Chromium headless do Playwright e testa se ele abre;
5. avisa se o ffmpeg não estiver no PATH.

Teste com o exemplo sem narração:

```bash
bash exemplos/planetas-cabem/make.sh
```

## Windows

- Use o **Git Bash**. Não existe `python3`: os `make.sh` dos exemplos chamam `python`; o `tools/make.sh` genérico
  chama `python3`, então crie um atalho em `~/bin/python3`:
  ```bash
  mkdir -p ~/bin && printf '#!/bin/sh\nexec python "$@"\n' > ~/bin/python3 && chmod +x ~/bin/python3
  ```
- Sempre `export PYTHONUTF8=1` (os scripts leem e escrevem acentos).
- ffmpeg pelo WinGet: `winget install Gyan.FFmpeg.Essentials`. Ele só entra no PATH de terminais abertos **depois**
  da instalação: feche e abra o terminal.
- Se o pip recusar `--break-system-packages`, o `setup.sh` tenta de novo sem a opção.

## Máquina fraca

- O render é por CPU. Um Short de 30 a 50 s leva dezenas de minutos num notebook comum; módulos com three.js
  ou shaders (`"gl": true`) são bem mais lentos sem GPU.
- Rode em prioridade baixa e um render por vez:
  - Linux/macOS: `nice -n 19 bash make.sh`
  - Windows (Git Bash): `cmd //c start "" //low //b //wait bash make.sh`
- Modelos de voz grandes (VoxCPM2, Chatterbox) rodam no Google Colab com GPU T4 grátis. Ver
  [06-voz-e-narracao.md](06-voz-e-narracao.md).

## Onde o projeto acha o motor

Cada `make.sh` usa `KIT="${VIDEO_CODING_KIT:-$P/../..}"`: sem a variável, o motor é a pasta dois níveis acima do
projeto (a raiz do repositório para `exemplos/<nome>/`). Para um projeto fora do repositório:

```bash
VIDEO_CODING_KIT=/caminho/para/video-coding bash /outro/lugar/meu-video/make.sh
```
