# (cena, início, EN falado, EN legenda, PT falado, PT legenda) — Short vertical, só PT (EN repete o PT); sem legenda corrida (meta "captions": false)
# Números conferidos:
#   distância média Terra–Sol 1 UA = 149.597.871 km; c = 299.792,458 km/s → 499,0 s = 8 min 19 s (arredondado: 8 min 20 s)
#   a gravidade se propaga à velocidade da luz: GW170817 + GRB 170817A (2017) chegaram com 1,7 s de diferença depois de 130 milhões de anos → |v_g − c|/c < 10⁻¹⁵
#   sem o Sol, a Terra seguiria pela tangente da órbita a 29,8 km/s (107 mil km/h)
import json as _j, pathlib as _p
_D=_j.load(open(_p.Path(__file__).with_name('voice')/'durs.json'))['pt']
_GAP=[.15,.75,.4,.45,.45,.45,.55]   # pausa antes de cada fala (a 1ª deixa o Sol sumir; a 2ª deixa o susto assentar)
_AT=[];_t=0
for _g,_d in zip(_GAP,_D):_t+=_g;_AT.append(round(_t,2));_t+=_d
BASE=[round(_t+2.6,1)]  # um plano contínuo; 2,6 s finais: rebobina até o quadro 0 (loop)
_L=[
 (0,None,"Se o Sol sumisse agora, você não ia perceber.",None),
 (0,None,"A luz que ilumina você saiu dele há oito minutos e vinte segundos.",None),
 (0,None,"Ela corre a trezentos mil quilômetros por segundo, mas o Sol está a cento e cinquenta milhões de quilômetros.",None),
 (0,None,"Então, durante oito minutos, o céu continuaria igual.",None),
 (0,None,"E a Terra seguiria na mesma órbita, porque a gravidade do Sol também viaja na velocidade da luz.",None),
 (0,None,"Só depois desse tempo o dia viraria noite, e a Terra sairia em linha reta pelo espaço.",None),
 (0,None,"Por isso, quando você olha para o Sol, está vendo como ele era oito minutos atrás.",None),
]
LINES=[(s,_AT[i],pt,cap,pt,cap) for i,(s,a,pt,cap) in enumerate(_L)]
