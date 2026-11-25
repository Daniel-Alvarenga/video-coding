#!/usr/bin/env bash
# Instalação única: dependências Python, fontes (npm @fontsource), Chromium do Playwright e modelo de voz Kokoro (~350 MB).
# Precisa de: Python 3.10+, Node 18+, ffmpeg no PATH. No Windows, rode no Git Bash.
set -e
KIT="$(cd "$(dirname "$0")" && pwd)"
PY=python3; command -v python3 >/dev/null 2>&1 || PY=python
export PYTHONUTF8=1
DEPS="kokoro-onnx edge-tts soundfile scipy numpy pillow playwright"
$PY -m pip install --break-system-packages -q $DEPS 2>/dev/null || $PY -m pip install -q $DEPS
mkdir -p "$KIT/fonts" "$KIT/models"
( cd "$KIT/fonts" && npm install --silent )
cd "$KIT/models"
[ -f kokoro-v1.0.onnx ] || curl -sSL -o kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
[ -f voices-v1.0.bin ] || curl -sSL -o voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
$PY -m playwright install chromium-headless-shell || $PY -m playwright install chromium
$PY -c "from playwright.sync_api import sync_playwright as s; p=s().start(); p.chromium.launch().close(); p.stop(); print('chromium ok')"
command -v ffmpeg >/dev/null 2>&1 && echo "ffmpeg ok" || echo "AVISO: ffmpeg não está no PATH (ver docs/01-instalacao.md)"
echo "setup ok"
