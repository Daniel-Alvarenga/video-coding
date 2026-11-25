from pathlib import Path
KIT = Path(__file__).resolve().parent.parent
FS = KIT / 'fonts' / 'node_modules' / '@fontsource'
faces = [
    ('Newsreader', 'newsreader/files/newsreader-latin-400-normal.woff2', 400, 'normal'),
    ('Newsreader', 'newsreader/files/newsreader-latin-400-italic.woff2', 400, 'italic'),
    ('IBM Plex Mono', 'ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2', 400, 'normal'),
    ('IBM Plex Mono', 'ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2', 500, 'normal'),
    ('Hanken Grotesk', 'hanken-grotesk/files/hanken-grotesk-latin-400-normal.woff2', 400, 'normal'),
    ('Hanken Grotesk', 'hanken-grotesk/files/hanken-grotesk-latin-500-normal.woff2', 500, 'normal'),
    ('Hanken Grotesk', 'hanken-grotesk/files/hanken-grotesk-latin-600-normal.woff2', 600, 'normal'),
]
css = ''.join(f"@font-face{{font-family:'{f}';src:url('{(FS / p).as_uri()}') format('woff2');font-weight:{w};font-style:{s}}}" for f, p, w, s in faces)
LOADFONTS = """async()=>{for(const f of ['400 40px "Newsreader"','italic 400 40px "Newsreader"','400 40px "IBM Plex Mono"','500 40px "IBM Plex Mono"','400 40px "Hanken Grotesk"','500 40px "Hanken Grotesk"','600 40px "Hanken Grotesk"'])await document.fonts.load(f);}"""
