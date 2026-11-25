# (cena, início, EN falado, EN legenda, PT falado, PT legenda) — Short vertical, só PT (EN repete o PT); sem legenda corrida
# Números conferidos (NASA NSSDC Planetary Fact Sheet; descoberta de Netuno: Galle, 23/9/1846):
#   período de Netuno 60.182 dias = 164,8 anos; 1ª volta completa desde a descoberta: 12/7/2011 (NASA)
#   30 anos / 164,8 = 0,18 ano netuniano · Mercúrio: 87,97 dias → 30 × 365,25 / 87,97 = 124,6 anos mercurianos
import json as _j, pathlib as _p
_D=_j.load(open(_p.Path(__file__).with_name('voice')/'durs.json'))['pt']
_GAP=[.1,.45,.35,.4,.45,.45,.5]
_AT=[];_t=0
for _g,_d in zip(_GAP,_D):_t+=_g;_AT.append(round(_t,2));_t+=_d
BASE=[round(_t+1.6,1)]  # um plano contínuo; 1,6 s finais: volta a Netuno e ao "0" (loop)
_L=[
 (0,None,"Quantos anos você tem em Netuno? Quase com certeza, zero.",None),
 (0,None,"Netuno, o oitavo planeta e o mais distante do Sol, leva cento e sessenta e cinco anos para dar uma única volta.",None),
 (0,None,"No mesmo tempo, a Terra dá cento e sessenta e cinco voltas.",None),
 (0,None,"Desde que foi descoberto, em mil oitocentos e quarenta e seis, ele completou só uma volta, em julho de dois mil e onze.",None),
 (0,None,"Então quem tem trinta anos aqui tem zero vírgula dezoito lá.",None),
 (0,None,"Já em Mercúrio, que dá a volta em oitenta e oito dias, essa mesma pessoa teria cento e vinte e quatro anos.",None),
 (0,None,"A sua idade é só o número de voltas que o seu planeta deu em volta do Sol.",None),
]
LINES=[(s,_AT[i],pt,cap,pt,cap) for i,(s,a,pt,cap) in enumerate(_L)]
