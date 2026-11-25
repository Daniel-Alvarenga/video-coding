# (cena, início, EN falado, EN legenda, PT falado, PT legenda) — Short vertical, só PT (EN repete o PT); sem legenda corrida
# Números conferidos: raio do horizonte Rs = 2GM/c² (G = 6,674e-11, c = 299.792.458 m/s)
#   Terra (5,972e24 kg): Rs = 8,87 mm → 17,7 mm de diâmetro (bolinha de gude: 16–25 mm)
#   Sol (1,989e30 kg): Rs = 2,95 km → 5,9 km de diâmetro · a gravidade a uma distância fixa só depende da massa → a Lua seguiria igual
import json as _j, pathlib as _p
_D=_j.load(open(_p.Path(__file__).with_name('voice')/'durs.json'))['pt']
_GAP=[.1,.45,.4,.3,.45,.45,.45,.5]
_AT=[];_t=0
for _g,_d in zip(_GAP,_D):_t+=_g;_AT.append(round(_t,2));_t+=_d
BASE=[round(_t+1.5,1)]  # 1,5 s finais: a bolinha volta a crescer até a Terra do quadro 0 (loop)
_L=[
 (0,None,"Se a Terra virasse um buraco negro, ela caberia na sua mão?",None),
 (0,None,"Para isso, toda a massa do planeta teria que ser espremida, sem perder nada.",None),
 (0,None,"A relatividade dá o tamanho final: um centímetro e oito milímetros de largura.",None),
 (0,None,"Uma bolinha de gude.",None),
 (0,None,"A Lua continuaria girando em volta dela, na mesma órbita, porque a massa seria a mesma.",None),
 (0,None,"De perto, a luz das estrelas atrás dela se curvaria e formaria um anel.",None),
 (0,None,"Já o Sol, espremido do mesmo jeito, teria só seis quilômetros de largura.",None),
 (0,None,"Qualquer coisa vira buraco negro, se for apertada o bastante.",None),
]
LINES=[(s,_AT[i],pt,cap,pt,cap) for i,(s,a,pt,cap) in enumerate(_L)]
