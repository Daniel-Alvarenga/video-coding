# 6. Voz e narração

## O que o motor espera

```
voice/pt00.wav, pt01.wav, ...   uma fala por arquivo (NN = índice em LINES), sem silêncio nas pontas
voice/durs.json                 {"pt": [2.41, 3.05, ...]}  (e "en" se houver)
```

Depois da voz, rode `plan.py`. Todas as ferramentas abaixo gravam nesse formato.

## Opções

| Ferramenta | Onde roda | Licença | Bom para |
|---|---|---|---|
| Kokoro-82M (`tools/voice.py`) | local, CPU leve | Apache 2.0 | inglês (`am_michael`); PT (`pm_alex`) é fraco |
| edge-tts (`tools/voice_edge.py`) | online (serviço Microsoft) | serviço, não é modelo aberto | marcar o tempo rápido; vozes PT-BR como `pt-BR-AntonioNeural` |
| VoxCPM2 (`voz/voxcpm_colab.ipynb`) | Google Colab, GPU T4 grátis | Apache 2.0 | melhor qualidade em PT-BR; desenho de voz e clone |
| Chatterbox multilíngue (`tools/voice_clone.py`) | GPU (Colab) | MIT | clone; em PT pode puxar sotaque de Portugal |

Licenças "não comercial" (XTTS-v2, F5-TTS, várias vozes de estúdio) foram deixadas de fora.

### Kokoro

```bash
python tools/voice.py P 1.08      # velocidade: 1,0 nos longos, 1,08 a 1,12 nos Shorts
```

### edge-tts

```bash
python tools/voice_edge.py P pt pt-BR-AntonioNeural +8%
```

Refaz sozinho (até 3 vezes) uma fala que volte cortada.

### VoxCPM2 no Colab

1. Gere a lista de falas: `python tools/exportar_falas.py P` → `P/falas.json`.
2. Abra `voz/voxcpm_colab.ipynb` no Google Colab, troque o ambiente para **GPU T4** e execute tudo.
   O notebook pede `falas.json` (e, se for clonar, um áudio de referência) e no fim baixa `falas.zip`.
3. Importe: `python tools/import_voice.py P falas.zip pt` (converte para 24 kHz mono, apara silêncio, normaliza e
   grava `durs.json`).
4. Se gerou várias versões de cada fala (`ptNN_vK.wav`), escolha a combinação mais uniforme:
   `python tools/escolher_consistente.py P` (tom, ritmo, energia e brilho mais próximos da mediana).

Três modos (guia completo em `voz/GUIA_VOXCPM2.md`):
- **desenho de voz:** uma descrição entre parênteses antes do texto, ex.
  `(Homem brasileiro de uns trinta anos, voz média e clara, fala articulada, tom didático)`; muda um pouco a cada geração;
- **clone:** áudio de referência de 10 a 30 s (de preferência com o texto lido nele); sai igual em todas as falas;
- **clone com estilo:** referência + descrição.

Para uma voz consistente em vários vídeos: gere uma frase com o desenho de voz, escolha a melhor e use esse
áudio como referência de clone dali em diante.

**Clonar a voz de uma pessoa exige a autorização dela.**

## Sala e mixagem

`meta.json` → `"voice_fx": {"room": 0.01, "predelay": 0.01, "decay": 0.16, "tone": 4500}` dá à voz uma sala
pequena (filtro passa-alta, leve saturação, cauda curta). `room` perto de 0 = voz seca.

```bash
python tools/mix.py P 0.6 pt     # 0,6 = quanto a música abaixa sob a voz (ducking)
```

## Escrever para ser falado

- Números **por extenso** na fala ("cento e sete mil quilômetros por hora"), algarismos na legenda.
- Frases curtas, uma ideia por frase, ligadas por "então", "por isso", "quando".
- Explique o porquê com um exemplo concreto e os números do próprio vídeo.
- Evite bordões de texto gerado por IA: "E tem mais", "A boa notícia", "Pois é", "Vamos mergulhar",
  "Não é X. É Y.", trios retóricos, frases de efeito de uma palavra, exclamações.
- Para aproximar, "cerca de", "quase", "aproximadamente" soam melhor que "uns/umas".
- Fala muito curta ("Um.") sai cortada em alguns modelos: gere uma frase maior e recorte.
- Leia em voz alta. Se soar como anúncio, reescreva.

## Conferir sem ouvir

Um agente de IA não ouve o áudio. Ele confere: duração de cada fala (`durs.json`), ritmo (sílabas por segundo),
cortes no fim, volume (LUFS) e se vídeo e áudio têm a mesma duração. Timbre e pronúncia precisam de alguém
ouvindo.
