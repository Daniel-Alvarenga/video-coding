# video-coding

Motor de vídeo por código: animação em canvas (e three.js quando precisa de 3D de verdade), narração sintética,
trilha e efeitos sonoros gerados por código, render quadro a quadro com Chromium e montagem com ffmpeg.
Um vídeo é uma pasta com três arquivos de texto. Tudo roda com ferramentas gratuitas e de código aberto.

Feito para vídeos de ciência e matemática (Shorts 9:16 e vídeos longos 16:9), em português e/ou inglês.

## O que tem aqui

| Pasta | O que é |
|---|---|
| `engine/` | módulos JS de animação (fórmulas que se transformam, câmera 3D, Terra com satélite real, planetas, estrelas, buraco negro, gráficos, partículas...) + temas visuais + templates |
| `tools/` | pipeline Python: plano de tempo das falas, build, checagem de sobreposição, render, voz, mixagem, música, efeitos, miniatura, folhas de quadros |
| `voz/` | notebook do Google Colab para gerar narração com VoxCPM2 (GPU grátis) e guia de vozes |
| `assets/`, `geo/` | modelos 3D e mapas com licença livre (ver `CREDITOS.md`) |
| `vendor/` | three.js r147 (MIT) |
| `exemplos/` | cinco Shorts completos, com a fonte e um `COMO_FOI_FEITO.md` cada |
| `docs/` | documentação para humanos |
| `AGENTS.md` | guia para agentes de IA (Claude, Codex, etc.) que forem produzir vídeos ou ampliar o motor |

## Instalação

Precisa de Python 3.10+, Node 18+, ffmpeg no PATH e Git Bash (no Windows).

```bash
bash setup.sh
```

O `setup.sh` instala as dependências Python, as fontes (npm), o Chromium do Playwright e baixa o modelo de voz
Kokoro (~350 MB). Detalhes e problemas comuns: [docs/01-instalacao.md](docs/01-instalacao.md).

## Primeiro vídeo

```bash
bash exemplos/planetas-cabem/make.sh
```

Esse exemplo não tem narração (só música e texto), então roda sem modelo de voz. O MP4 sai na própria pasta.
Os outros exemplos já trazem a narração em `voice/`.

## Como um vídeo é feito

```
ideia → contas conferidas em Python → roteiro (lines.py) → módulos que faltam no kit (engine/) → cenas (scenes.js)
      → voz → plan.py → build.py → overlaps.py → stills.py (revisão) → música → mix → render → efeitos → MP4
```

Passo a passo em [docs/03-do-roteiro-ao-mp4.md](docs/03-do-roteiro-ao-mp4.md).

## Documentação

1. [Instalação](docs/01-instalacao.md)
2. [Anatomia de um projeto](docs/02-anatomia-de-um-projeto.md)
3. [Do roteiro ao MP4](docs/03-do-roteiro-ao-mp4.md)
4. [Criando um módulo do kit](docs/04-criando-um-modulo-do-kit.md)
5. [Criando um tema e um estilo](docs/05-criando-um-tema-e-estilo.md)
6. [Voz e narração](docs/06-voz-e-narracao.md)
7. [Música e efeitos sonoros](docs/07-musica-e-efeitos.md)
8. [Revisão de qualidade](docs/08-revisao-de-qualidade.md)
9. [Referência da API](docs/referencia-api.md)

## Licença

Código sob MIT (`LICENSE`). Modelos 3D, texturas e mapas de terceiros mantêm as licenças próprias, listadas em
`CREDITOS.md`; algumas (CC BY) pedem crédito no vídeo ou na descrição.
