#!/usr/bin/env bash
# Short "Se o Sol SUMISSE agora" (vertical, só PT, sem legenda corrida)
set -e
export PYTHONUTF8=1
P="$(cd "$(dirname "$0")" && pwd)"; KIT="${VIDEO_CODING_KIT:-$P/../..}"
[ -f "$P/voice/durs.json" ] || python "$KIT/tools/voice_edge.py" "$P" pt pt-BR-AntonioNeural +8%
python "$KIT/tools/plan.py" "$P"
python "$KIT/tools/build.py" "$P"
python "$KIT/tools/overlaps.py" "$P" pt 0.5 || true
python "$KIT/tools/music.py" "$P"
python "$KIT/tools/mix.py" "$P" 0.6 pt
python "$KIT/tools/render.py" "$P" pt > "$P/log-pt.txt" 2>&1
python "$KIT/tools/sfx2.py" "$P" pt
# volume final: -14 LUFS integrado, pico real -1,5 dB
ffmpeg -y -loglevel error -i "$P/v-pt.mp4" -i "$P/final_pt.wav" -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "$P/sol-v-pt.mp4"
ffmpeg -y -loglevel error -i "$P/sol-v-pt.mp4" -c:v libx264 -crf 28 -preset medium -c:a copy -movflags +faststart "$P/sol-sumisse.mp4"
echo done
