#!/usr/bin/env bash
# Full pipeline for one project folder.
# usage: tools/make.sh PROJECT   (PROJECT has lines.py, scenes.js, meta.json; optional music.py)
set -e
KIT="$(cd "$(dirname "$0")/.." && pwd)"; P="$(cd "$1" && pwd)"
MODE=$(python3 -c "import json;print(json.load(open('$P/meta.json'))['mode'])")
if [ "$MODE" = short ]; then SPEED=1.08; DUCK=0.62; else SPEED=1.0; DUCK=0.55; fi
python3 "$KIT/tools/voice.py" "$P" $SPEED
python3 "$KIT/tools/plan.py" "$P"
python3 "$KIT/tools/build.py" "$P"
( cd "$P" && if [ -f music.py ]; then python3 music.py; else python3 "$KIT/tools/music_$MODE.py"; fi )
python3 "$KIT/tools/mix.py" "$P" $DUCK
python3 "$KIT/tools/render.py" "$P" pt > "$P/log-pt.txt" 2>&1 &
python3 "$KIT/tools/render.py" "$P" en > "$P/log-en.txt" 2>&1
wait
for L in en pt; do
  python3 "$KIT/tools/sfx.py" "$P" $L
  ffmpeg -y -loglevel error -i "$P/v-$L.mp4" -i "$P/final_$L.wav" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$P/final-$L.mp4"
  ffmpeg -y -loglevel error -i "$P/audio_$L.wav" -c:a libmp3lame -b:a 160k "$P/audio-$L.mp3"
done
echo "done: $P/final-en.mp4  $P/final-pt.mp4"
