# Como foi feito: "Se a Terra virasse buraco negro, caberia na sua MÃO?"

Short vertical narrado, 33,6 s, loop exato.

## Ideia e contas

Raio do horizonte (Schwarzschild): `Rs = 2GM/c²`, com G = 6,674e-11 e c = 299.792.458 m/s.

| Corpo | Massa | Rs | Diâmetro |
|---|---|---|---|
| Terra | 5,972e24 kg | 8,87 mm | 17,7 mm (bolinha de gude: 16 a 25 mm) |
| Sol | 1,989e30 kg | 2,95 km | 5,9 km |

A gravidade a uma distância fixa só depende da massa, então a Lua seguiria na mesma órbita.

## Kit criado para este vídeo

**`BH` (`engine/blackhole.js`)**: lente gravitacional em espaço de tela. `BH.lens` desvia a luz do céu atrás do
buraco negro e forma o anel de Einstein. Foi registrado no `tools/build.py` e reaproveitado depois (o
`STAR.hole` do exemplo `vida-estrelas` usa o mesmo módulo).

Também usados: `SC.sphere` (Terra com satélite real, `"geo": true`), `PL.moon` e `PL.orbit`, `COS.sky`,
`COS.galaxy`, `COS.trail`, `COS.tag`, `COS.arrow` e uma camada extra de 1.700 estrelas com semente fixa.

## Roteiro visual

1. Gancho: a Terra inteira e a pergunta.
2. A Terra é espremida sem perder massa: o diâmetro cai em escala logarítmica de 12.742 km para 1,8 cm, com o
   número correndo na tela.
3. Vira buraco negro, com lente de verdade sobre o céu.
4. Cabe numa mão, ao lado de uma bolinha de gude.
5. A Lua segue na mesma órbita; de perto, o anel de Einstein.
6. O Sol espremido: 5,9 km, sobre uma cidade vista à noite.
7. Fim: a bolinha cresce de volta até a Terra do quadro 0 (loop).

## Voz e som

VoxCPM2 no Colab, sala quase seca. `music.style = "misterioso"`, ambiente `space`.

## Lições

- Um efeito físico calculado (a lente) vale mais que um desenho genérico de "buraco negro".
- O encolhimento em escala logarítmica mostra todas as ordens de grandeza (km, m, cm) no mesmo movimento.
