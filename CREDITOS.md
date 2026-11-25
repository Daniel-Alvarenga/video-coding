# Créditos e licenças de terceiros

O código deste repositório está sob MIT (`LICENSE`). Os arquivos abaixo vêm de terceiros e mantêm as licenças
próprias. Quando a licença pede crédito (CC BY), coloque-o no vídeo ou na descrição.

## Mapas e texturas (`geo/`)

| Arquivo | Origem | Licença | Crédito |
|---|---|---|---|
| `terra.jpg`, `terra_web.jpg` | NASA Blue Marble (julho de 2004) | domínio público | opcional: "Imagens da Terra: NASA" |
| `noite.jpg`, `noite_web.jpg` | NASA Black Marble 2016 | domínio público | opcional |
| `nuvens.jpg`, `nuvens_web.jpg` | NASA Blue Marble clouds | domínio público | opcional |
| `lua.jpg`, `lua_web.jpg` | NASA SVS CGI Moon Kit (LROC), svs.gsfc.nasa.gov/4720 | domínio público | opcional |
| `paises50.geojson`, `paises.json` | Natural Earth 1:50m admin 0 | domínio público | opcional |
| `PIA22770.jpg`, `titan_web.jpg` | NASA/JPL-Caltech/Univ. Arizona/Univ. Idaho (Titã) | domínio público | opcional |
| `PIA12564.jpg`, `encelado_web.jpg` | NASA/JPL/Space Science Institute (Encélado) | domínio público | opcional |
| `everest.json` | AWS Terrain Tiles (Mapzen), dados SRTM (NASA/USGS) | domínio público | opcional |
| `brasil_sat.jpg`, `brasil_noite.jpg` | recorte de `terra.jpg` e `noite.jpg` (`tools/geo_crop.py`) | domínio público | opcional |
| `planetas/*_web.jpg`, `planetas/saturno_anel.png` | Solar System Scope (INOVE), baseadas em dados da NASA | **CC BY 4.0** | **obrigatório:** "Texturas dos planetas: Solar System Scope (CC BY 4.0)" |

Detalhes de cada arquivo em `geo/FONTES.txt`.

Os dados do Rio de Janeiro (`engine/rio3d.js`) e de São Paulo (`engine/road3d.js`) não vêm no repositório. Gere-os
com `tools/rio_prep.py` e `tools/sp_prep.py`. Eles usam Sentinel-2 cloudless 2016 da EOX (**CC BY 4.0**, crédito:
"Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)")
e prédios do OpenStreetMap (**ODbL**, crédito: "© colaboradores do OpenStreetMap").

## Modelos 3D e imagens (`assets/`)

| Pasta | Origem | Licença | Crédito |
|---|---|---|---|
| `nasa/` | NASA 3D Resources (Apollo Lunar Module, Saturn V) | sem copyright (NASA); não sugerir endosso nem usar o logo | opcional: "Modelo 3D: NASA 3D Resources" |
| `aviao/` | Innerscene, "Regional jet aircraft" | CC0 1.0 | opcional |
| `carro/` | Khronos glTF-Sample-Assets, "Car Concept" (Darmstadt Graphics Group e Eric Chadwick) | **CC BY 4.0** | **obrigatório:** "Modelo do carro: Car Concept (Darmstadt Graphics Group e Eric Chadwick, CC BY 4.0)" |
| `estrada/` | Poly Haven, "Asphalt 02" | CC0 1.0 | opcional |
| `ceu/` | Poly Haven, "Kloofendal 43d Clear (Pure Sky)" | CC0 1.0 | opcional |
| `quaternius_space/` | Quaternius, "Ultimate Space Kit" | CC0 1.0 | opcional |

Cada pasta tem um `LICENCA.txt` com a fonte e a data do download.

## Código de terceiros

| Pasta | Origem | Licença |
|---|---|---|
| `vendor/three-r147/` | three.js r147 | MIT (ver `vendor/three-r147/LICENSE`) |

## Baixados pelo `setup.sh` (não versionados)

| O quê | Origem | Licença |
|---|---|---|
| Fontes Newsreader, Hanken Grotesk, IBM Plex Mono | @fontsource (npm) | SIL Open Font License 1.1 |
| Modelo de voz Kokoro-82M (ONNX) | thewh1teagle/kokoro-onnx | Apache 2.0 |

## Vozes

- Kokoro-82M: Apache 2.0, uso comercial liberado.
- VoxCPM2 (openbmb), usado no notebook do Colab: Apache 2.0, uso comercial liberado.
- edge-tts usa o serviço online de vozes neurais da Microsoft. Não é um modelo aberto; confira os termos antes de
  usar comercialmente.
- Clonar a voz de alguém exige a autorização dessa pessoa.
