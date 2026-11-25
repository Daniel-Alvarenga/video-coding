"""Narração com vozes neurais da Microsoft (edge-tts, online, grátis) para um idioma; o outro fica como está.
Grava PROJECT/voice/<lang>NN.wav (24 kHz) e atualiza voice/durs.json. Rode voice.py antes para o outro idioma.
usage: python voice_edge.py PROJECT [lang=pt] [voz=pt-BR-AntonioNeural] [rate=+0%]"""
import sys, json, asyncio, subprocess, numpy as np, soundfile as sf
from pathlib import Path
import edge_tts
P = Path(sys.argv[1]).resolve(); LANG = sys.argv[2] if len(sys.argv) > 2 else 'pt'
VOZ = sys.argv[3] if len(sys.argv) > 3 else ('pt-BR-AntonioNeural' if LANG == 'pt' else 'en-US-AndrewNeural')
RATE = sys.argv[4] if len(sys.argv) > 4 else '+0%'
sys.path.insert(0, str(P)); from lines import LINES
(P/'voice').mkdir(exist_ok=True); dp = P/'voice'/'durs.json'
d = json.load(open(dp)) if dp.exists() else {}
d.setdefault(LANG, [0]*len(LINES)); col = 4 if LANG == 'pt' else 2
async def run(): return await run_from(0)
async def run_from(k):
    for i, L in enumerate(LINES):
        if i < k: continue
        mp3 = P/'voice'/f'_{LANG}{i:02d}.mp3'; wav = P/'voice'/f'{LANG}{i:02d}.wav'
        await edge_tts.Communicate(L[col], VOZ, rate=RATE).save(str(mp3))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp3), '-ac', '1', '-ar', '24000', str(wav)], check=True); mp3.unlink()
        a, sr = sf.read(wav); idx = np.where(np.abs(a) > .01)[0]; a = a[max(0, idx[0]-400):idx[-1]+800]; a *= .9/np.max(np.abs(a))
        sf.write(wav, a, sr); d[LANG][i] = round(len(a)/sr, 2)
        # o serviço às vezes devolve um áudio cortado: se ficou curto demais para o texto, gera de novo (até 3 vezes)
        tries = getattr(run, 'tries', {}); run.tries = tries
        if len(a)/sr < len(L[col])*.035 and tries.get(i, 0) < 3:
            tries[i] = tries.get(i, 0)+1; print('linha', i, 'curta demais, refazendo'); return await run_from(i)
asyncio.run(run()); json.dump(d, open(dp, 'w')); print(d[LANG])
