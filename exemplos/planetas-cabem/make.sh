#!/usr/bin/env bash
# Short sem narração: "Todos os planetas cabem entre a Terra e a Lua?" (vertical, 32 s, só música + texto, loop exato)
set -e
export PYTHONUTF8=1
P="$(cd "$(dirname "$0")" && pwd)"; KIT="${VIDEO_CODING_KIT:-$P/../..}"
python "$KIT/tools/plan.py" "$P"
python "$KIT/tools/build.py" "$P"
python "$KIT/tools/overlaps.py" "$P" pt 0.5 || true
python "$P/musica.py" "$P"
cp "$P/music.wav" "$P/audio_pt.wav"
python "$KIT/tools/render.py" "$P" pt > "$P/log-pt.txt" 2>&1
python "$KIT/tools/sfx2.py" "$P" pt
# volume final: -14 LUFS integrado, pico real -1,5 dB
# trilha curta e comprimida: normalização linear (ganho único) até -14 LUFS, em vez do loudnorm dinâmico
G=$(ffmpeg -nostats -i "$P/final_pt.wav" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print -14-$2}')
ffmpeg -y -loglevel error -i "$P/v-pt.mp4" -i "$P/final_pt.wav" -c:v copy -af "volume=${G}dB,alimiter=limit=0.84:level=false" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "$P/planetas-v-pt.mp4"
ffmpeg -y -loglevel error -i "$P/planetas-v-pt.mp4" -c:v libx264 -crf 28 -preset medium -c:a copy -movflags +faststart "$P/planetas-cabem.mp4"
# versão sem música (só efeitos), para testar outra trilha por cima
(cd "$P" && python -c "import numpy as np;from scipy.io import wavfile;sr,a=wavfile.read('music.wav');wavfile.write('audio_sm.wav',sr,np.zeros_like(a))")
cp "$P/v-pt.mp4.events.json" "$P/v-sm.mp4.events.json"
python "$KIT/tools/sfx2.py" "$P" sm
G2=$(ffmpeg -nostats -i "$P/final_sm.wav" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print -18-$2}')
ffmpeg -y -loglevel error -i "$P/v-pt.mp4" -i "$P/final_sm.wav" -af "volume=${G2}dB,alimiter=limit=0.84:level=false" -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 160k -ar 48000 -shortest -movflags +faststart "$P/planetas-cabem-sem-musica.mp4"
echo done
