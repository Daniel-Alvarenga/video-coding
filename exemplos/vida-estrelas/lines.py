# (cena, início, EN falado, EN legenda, PT falado, PT legenda) — Short vertical, só PT, voz clonada gerada no Colab (VoxCPM2); sem legenda corrida.
# Plano contínuo, uma câmera só. Cada frase tem uma âncora na linha do tempo nominal de 47 s (AN); o intervalo real até a
# próxima é o maior entre a fala + pausa e 0,8 × o intervalo nominal. scenes.js deforma o tempo nominal para casar âncora com fala.
# Contas (conferidas 01/11/2026): vida na sequência principal por modelos — 0,1 sol ≈ 6 trilhões de anos (Laughlin, Bodenheimer e
# Adams 1997), Sol ≈ 10 bilhões (idade 4,6 bi; faltam ≈ 5 bi), 20 sóis ≈ 8–9 milhões (Schaller et al. 1992) → "cerca de dez milhões".
# Luminosidade de 20 sóis ≈ 4×10⁴ sóis (dezenas de milhares); anã branca do Sol ≈ 0,012 raio solar ≈ 1,3 raio da Terra.
# Universo 13,8 bilhões de anos (Planck 2018). Próxima Centauri: 0,12 sol, 4,24 anos-luz.
import json as _j, pathlib as _p
_V=_p.Path(__file__).with_name('voice')
try:_D=_j.load(open(_V/'durs.json'))['pt']
except Exception:_D=[]
TN=47
AN=[.1,3.6,9.6,15.6,18.4,23.4,30.4,36.6,41.4,44.4]
_L=[
 "Qual estrela vive mais: a gigante ou a pequenininha?",
 "Começa pelo Sol: ele tem quatro vírgula seis bilhões de anos e ainda vai brilhar por cerca de cinco bilhões.",
 "Depois ele incha, vira uma gigante vermelha e termina como anã branca, do tamanho da Terra.",
 "Agora, uma estrela com vinte vezes a massa do Sol.",
 "Ela tem vinte vezes mais combustível, mas queima dezenas de milhares de vezes mais rápido.",
 "Vive cerca de dez milhões de anos, explode numa supernova e deixa uma estrela de nêutrons ou um buraco negro.",
 "A pequenininha, uma anã vermelha com um décimo da massa do Sol, gasta tão devagar que dura trilhões de anos.",
 "O universo tem treze vírgula oito bilhões de anos, então nenhuma anã vermelha morreu até hoje.",
 "A estrela mais perto de nós, Próxima Centauri, é uma delas.",
 "Quanto maior a estrela, mais cedo ela morre.",
]
if len(_D)==len(_L):
    _AT=[.1]
    for i in range(len(_L)-1):_AT.append(round(_AT[-1]+max(_D[i]+.35,.8*(AN[i+1]-AN[i])),2))
    _END=round(_AT[-1]+max(_D[-1]+.5,.8*(TN-AN[-1])),2)
    BASE=[_END]
    LINES=[(0,_AT[i],t,None,t,None) for i,t in enumerate(_L)]
else:  # ainda sem narração: linha do tempo nominal
    BASE=[TN];LINES=[]
