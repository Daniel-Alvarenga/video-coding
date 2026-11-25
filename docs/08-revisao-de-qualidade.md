# 8. Revisão de qualidade

Um render completo é caro. Quase tudo dá para conferir antes, sem gerar vídeo.

## Ferramentas

| Comando | O que faz |
|---|---|
| `python tools/overlaps.py P pt 0.5` | percorre o filme a cada 0,5 s, acha textos e glifos de fórmula que se cruzam ou saem da tela; lista vazia = ok (código de saída 1 se houver conflito) |
| `python tools/stills.py P pt 0.1,3,8,15` | folha de quadros nos instantes pedidos → `P/sheet.jpg` |
| `python tools/frame.py P 15.2 [saida.jpg] [x0,y0,x1,y1]` | um quadro em resolução cheia, com recorte opcional |
| `python tools/quadros.py P P/quadros 1 [extras]` | um quadro por segundo + folha `00_folha.jpg` com o tempo em cada quadro |
| `python tools/render.py P pt 30 8` | render só dos primeiros 8 s |
| `python tools/render_trecho.py P pt t0 t1` | render de um trecho para emendar |

## Checklist

Visual
- [ ] `overlaps.py` sem conflitos.
- [ ] Folha de quadros em 8 a 15 instantes: gancho (0,1 s), cada troca de cena, cada número importante, a
      revelação, o último quadro.
- [ ] Primeiro quadro com o objeto principal grande e a pergunta legível.
- [ ] Textos grandes para celular; poucos elementos ao mesmo tempo.
- [ ] Nenhuma tela parada por mais de cerca de 3 s.
- [ ] Loop: compare `stills` em 0 e em T−1/30.
- [ ] Cores do tema; um destaque por vez.

Som
- [ ] Eventos esperados em `v-pt.mp4.events.json` (o `sfx2.py` avisa eventos desconhecidos).
- [ ] Música abaixa sob a voz; ambientes baixos.
- [ ] -14 LUFS integrado, pico -1,5 dB.

Conteúdo
- [ ] Contas conferidas em Python e anotadas com fonte no `lines.py`.
- [ ] Fala natural (ver [06-voz-e-narracao.md](06-voz-e-narracao.md)).
- [ ] Exagero de escala marcado na tela.

Arquivo
- [ ] Duração do vídeo = duração do áudio (`ffprobe`).
- [ ] H.264 + AAC, `yuv420p`, `+faststart`. Alguns players de celular recusam `yuvj420p`: o `make.sh` de
      `vida-estrelas` força `-pix_fmt yuv420p -color_range tv`.
- [ ] Extraia alguns quadros do MP4 final e olhe (`ffmpeg -ss 12 -i final.mp4 -frames:v 1 q.jpg`).

## Reprodutibilidade

O render é determinístico: o mesmo projeto, com a mesma voz e o mesmo kit, gera o mesmo MP4. Se um módulo
mudou e um vídeo antigo saiu diferente, a mudança quebrou o padrão antigo; acrescente uma opção em vez de mudar
o comportamento padrão.
