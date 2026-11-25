# Guia do VoxCPM2

Modelo: VoxCPM2 (openbmb), licença Apache 2.0, uso comercial liberado. Roda no Google Colab com GPU T4 grátis
(`voz/voxcpm_colab.ipynb`). Velocidade medida: cerca de 2 s de GPU por 1 s de áudio,
mais uns 3 min para carregar o modelo quando a sessão do Colab começa do zero.

## Três jeitos de escolher a voz

| Modo | O que você passa | Resultado |
|---|---|---|
| **Desenho de voz** | só o texto, com uma descrição entre parênteses no começo | voz inventada a partir da descrição; muda um pouco a cada geração |
| **Clone** | um áudio de referência (e, de preferência, o texto que foi lido nele) | copia o timbre de quem gravou; sai igual em todas as falas |
| **Clone com estilo** | áudio de referência + descrição entre parênteses | o timbre vem do áudio e o jeito de falar (emoção, ritmo) vem da descrição |

## Como escrever a descrição

Formato: `(descrição)Texto que vai ser falado.` A descrição não é lida em voz alta, só orienta o modelo.

O que o modelo entende bem (segundo a documentação):
- **gênero e idade**: homem, mulher, moça, senhor, uns trinta anos
- **altura da voz**: grave, média, aguda
- **ritmo**: fala devagar, com pausas, rápida
- **emoção ou tom**: calmo, confiante, entusiasmado, misterioso, sério
- **textura**: encorpada, rouca, suave, aveludada, clara, sussurrada
- **papel**: narrador de documentário, locutor de rádio, professor, contador de histórias

Pode ser tão específica quanto quiser, numa frase. Os exemplos oficiais são em inglês; os nossos testes em português
funcionaram, mas vale testar a mesma descrição nas duas línguas e comparar.

Modelo para você preencher:
```
(Homem/Mulher brasileiro(a), [idade], voz [altura] e [textura], fala [ritmo], tom [emoção], [papel])
```
Exemplos:
- `(Locutor de rádio brasileiro, voz encorpada, dicção perfeita, tom confiante)`
- `(Homem brasileiro de uns trinta anos, voz média e clara, fala rápida mas articulada, tom animado e didático)`

## Parâmetros da geração

| Parâmetro | Padrão | O que faz |
|---|---|---|
| `text` | (obrigatório) | o que vai ser falado, com a descrição entre parênteses no começo se quiser |
| `cfg_value` | 2.0 | o quanto obedece ao texto e à descrição. Mais alto (2,5 a 3): voz mais fiel e marcada, pode soar forçada. Mais baixo (1,5): mais natural e solta |
| `inference_timesteps` | 10 | passos de refinamento do áudio. Mais passos (15 a 20): um pouco mais limpo e mais lento |
| `reference_wav_path` | nenhum | áudio para clonar o timbre |
| `prompt_wav_path` + `prompt_text` | nenhum | o mesmo áudio junto com o texto exato que foi lido nele; deixa o clone mais fiel (usados juntos, um sem o outro dá erro) |
| `denoise` | desligado | limpa ruído do áudio de referência antes de clonar (precisa carregar o modelo com o filtro de ruído) |
| `normalize` | desligado | converte números e siglas em palavras antes de falar ("107" vira "cento e sete") |
| `retry_badcase` | ligado | se o áudio sair com tamanho estranho para o texto, gera de novo (até 3 vezes) |
| `min_len` / `max_len` | 2 / 4096 | limites de tamanho da geração; não precisa mexer |

Saída: áudio a 48 kHz (o `import_voice.py` converte para 24 kHz). A sala na voz é aplicada depois, no `mix.py`, pelo
`voice_fx` do `meta.json` (ex.: room 0,01 a 0,10, predelay 0,01 s, decay 0,16 s, tom 4500 Hz).

## Voz consistente entre vídeos

O desenho de voz muda um pouco a cada geração. Para manter a mesma voz em vários vídeos: gere uma frase longa
com a descrição, escolha a melhor tomada e use esse áudio (com o texto lido nele) como referência de clone dali em
diante. Gere 2 a 4 versões de cada fala e deixe o `tools/escolher_consistente.py` escolher a combinação mais
uniforme (tom, ritmo, energia e brilho).

Clonar a voz de uma pessoa exige a autorização dela.
