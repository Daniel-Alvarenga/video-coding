#!/usr/bin/env bash
# Short "Qual estrela vive MAIS?" (vertical, só PT, voz clonada do Colab (VoxCPM2), kit engine/star.js, loop exato)
set -e
export PYTHONUTF8=1
P="$(cd "$(dirname "$0")" && pwd)"; KIT="${VIDEO_CODING_KIT:-$P/../..}"
python "$KIT/tools/plan.py" "$P"
python "$KIT/tools/build.py" "$P"
python "$KIT/tools/overlaps.py" "$P" pt 0.5 || true
python "$P/musica.py" "$P"
python "$KIT/tools/mix.py" "$P" 0.6 pt
python "$KIT/tools/render.py" "$P" pt > "$P/log-pt.txt" 2>&1
python "$KIT/tools/sfx2.py" "$P" pt
# volume final: -14 LUFS, pico -1,5 dB, normalização linear em duas passagens
norm(){ J=$(ffmpeg -nostats -i "$1" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p'); v(){ echo "$J" | grep "\"$1\"" | grep -o '\-\?[0-9.]*' | tail -1; }
  echo "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(v input_i):measured_TP=$(v input_tp):measured_LRA=$(v input_lra):measured_thresh=$(v input_thresh):offset=$(v target_offset):linear=true"; }
ffmpeg -y -loglevel error -i "$P/v-pt.mp4" -i "$P/final_pt.wav" -c:v copy -af "$(norm "$P/final_pt.wav")" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "$P/vida-estrelas-v-pt.mp4"
ffmpeg -y -loglevel error -i "$P/vida-estrelas-v-pt.mp4" -c:v libx264 -crf 28 -preset medium -pix_fmt yuv420p -color_range tv -c:a copy -movflags +faststart "$P/vida-estrelas.mp4"
echo done
