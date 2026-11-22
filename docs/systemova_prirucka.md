# Systémová príručka

*Katedra počítačov a informatiky, Fakulta elektrotechniky a informatiky, Technická univerzita v Košiciach*
*Predmet: Počítačová grafika · Šk. rok: 2026/2027 · Autor: Vladyslav Krykun · Učiteľ: TODO*

> Pracovná verzia v Markdowne, píše sa priebežne s kódom. Pred odovzdaním sa prevedie do PDF
> (titulná strana podľa pokynov, číslovanie strán). Štýl: 1. osoba množného čísla.

## 1. Obsah
Doplní sa pri prevode do PDF.

## 2. Funkcia programu
TODO (V1): scéna s terénom, živly kúzlené gestami ruky z webkamery, terén reaguje.

## 3. Popis programu

### 3.1 Popis riešenia
TODO: use-case diagram, teoretický základ (heightmap, bunkový automat, častice).

**Vstup rukou.** Obraz z webkamery spracúva model MediaPipe HandLandmarker, ktorý pre ruku
v zábere vráti 21 význačných bodov (kĺby a špičky prstov) v normalizovaných súradniciach
obrazu (0..1). Model beží v prehliadači cez WebAssembly a WebGL (GPU), so zálohou na CPU;
všetky súbory sú lokálne, aplikácia nepotrebuje internet.

### 3.2 Popis algoritmov a údajových štruktúr

**Detekcia len pri novom snímku kamery.** Vykresľovacia slučka beží s frekvenciou monitora
(60–144 Hz), kamera dodáva ~15–30 snímok/s. Nový snímok zisťujeme cez
`video.requestVideoFrameCallback` (prehliadač ho volá pri každom novom snímku videa);
`video.currentTime` sa na to nedá použiť, pri živej kamere plynie spojito.

**Stavy ruky.** Model občas ruku na 1–3 snímky nenájde (rozmazanie, okraj záberu). Aby sa
gestá neprerušovali, stav ruky má tri hodnoty:

| Stav | Kedy | Body (`landmarks`) |
|---|---|---|
| `tracking` | ruka je v naposledy spracovanom snímku | aktuálne |
| `holding` | ruka zmizla pred menej ako `HOLD_MS` = 300 ms | posledné známe |
| `lost` | ruka chýba dlhšie ako 300 ms (aj na začiatku) | `null` |

```
           ruka nájdená                    ruka nenájdená
  lost ─────────────────▶ tracking ─────────────────────▶ holding
   ▲                         ▲                              │
   │                         └──────── ruka nájdená ────────┤
   └──────────────── uplynulo 300 ms bez ruky ──────────────┘
```

Stav sa vyhodnocuje v každom snímku vykreslenia (nielen pri novom snímku kamery), takže ak
kamera prestane posielať obraz, ruka po 300 ms prejde do `lost`.

**Zrkadlenie.** Náhľad kamery zobrazujeme zrkadlovo (CSS `scaleX(-1)`), body ruky prepočítavame
`x → 1 − x`, aby sedeli na zrkadlovom obraze.

**Príznaky ruky** (`input/handFeatures.js`). Gestá nerozpoznávame priamo z 21 bodov, ale
z niekoľkých čísel (príznakov), ktoré nezávisia od vzdialenosti ruky od kamery:

- Body prevedieme do pixelov (x · šírka, y · výška, z · šírka), lebo MediaPipe normuje x a y
  zvlášť a obraz 640 × 480 nie je štvorec.
- **Veľkosť dlane** = 3D vzdialenosť zápästie (bod 0) → základ prostredníka (bod 9). Pri ohýbaní
  prstov sa nemení, slúži ako „pravítko“: ostatné vzdialenosti ňou delíme.
- **Stred dlane** = priemer bodov 0, 5, 9, 17 (bez prstov) → štipka či päsť neposúva mierenie.
- **Otvorenosť** 0..1: pre 4 prsty pomer (zápästie → špička) / veľkosť dlane, lineárne prevedený
  z rozsahu 1,0 (päsť) … 1,7 (vystretý prst) na 0..1 a orezaný (*inverse lerp*); priemer prstov.
- **Normála dlane** = vektorový súčin (bod 5 − bod 0) × (bod 17 − bod 0), normovaný na dĺžku 1;
  pre ľavú ruku s opačným znamienkom (ruka je zrkadlová). z ≈ −1 → dlaň ku kamere, y ≈ +1 → dlaň dole.
- **Pohyb v čase** (`HandMotion`): história stredu a veľkosti dlane za 1 s. Rýchlosť počítame
  z úseku ~150 ms (2–3 snímky kamery) podľa skutočného času snímok, v *dlaniach za sekundu*.
  **Hĺbková rýchlosť** = ln(veľkosť_nová / veľkosť_stará) / Δt: > 0 ruka ide ku kamere, < 0 od nej;
  logaritmus dáva rovnako veľké čísla pre priblíženie aj vzdialenie. Pri strate ruky sa história
  maže, aby po návrate nevznikol skok (falošný úder).

**Merania pohybov.** Prahy gest sme neurčili odhadom, ale z meraní (pravá ruka, 3 s na pohyb,
vývojový záznamník `ui/featureRecorder.js`, kláves R):

| Pohyb | Otvorenosť | Rýchlosť max | Hĺbka min / max |
|---|---|---|---|
| pokoj, dlaň ku kamere | 0,89–0,91 | 0,15 | −0,14 / +0,16 |
| pomaly do strán | 0,71–0,87 | 4,0 | −0,43 / +0,46 |
| rýchly švih do strán | 0,78–0,95 | 14,6 | −1,2 / +1,5 |
| päsť ↔ dlaň pomaly (ruka stojí) | 0,00–0,94 | 0,6 | −0,7 / +1,2 |
| pomalý push ku kamere | 0,85–0,92 | 0,6 | −0,8 / +1,0 |
| úder: päsť → ku kamere s otvorením | 0,00–0,94 | 2,4 | −2,6 / +4,2 |

Z meraní: samotná rýchlosť zámer neprezrádza (aj pomalý pohyb má až 4); samotná zmena tvaru
ruky hýbe hĺbkou až do 1,2 → úder treba rozpoznať kombináciou viacerých príznakov.

**Gestá castu** (`input/gestures.js`). Inšpirácia: ohýbanie živlov v seriáli „Avatar: The Last
Airbender“, kde každý živel vychádza z bojového umenia (oheň — severný Shaolin: priame, prudké
údery). Spoločná gramatika castu: **zber → mierenie → uvoľnenie**, alebo zrušenie. Vo V0 je
implementovaný oheň:

| Fáza | Gesto | Podmienka (prahy z meraní) |
|---|---|---|
| zber (štart) | päsť, takmer nehybne | otvorenosť < 0,25 a rýchlosť < 1,5 počas 400 ms |
| mierenie | pohyb päste | cieľ = stred dlane v zrkadlovom obraze, 0..1 |
| uvoľnenie (potvrdenie) | úder ku kamere s otvorením dlane | teraz otvorenosť > 0,6 a v posledných 400 ms bola otvorenosť < 0,3 aj hĺbka > 2,5 |
| zrušenie | švih do strany | \|vx\| > 8 dlaní/s |
| zrušenie | „oheň zhasol“ | dlaň otvorená (> 0,6) dlhšie ako 400 ms bez úderu |
| zrušenie | strata ruky | stav ruky `lost` |

```
         päsť, nehybne               400 ms
  idle ────────────────▶ charging ──────────▶ aiming ──── úder ────▶ (release) ─▶ idle
   ▲                        │                   │
   │                        │ päsť povolená     │ švih / dlaň otvorená 400 ms / strata ruky
   └──── pauza 500 ms ◀──── └──────▶ (cancel) ◀─┘
```

Úder sa skladá z dvoch udalostí v rôznych snímkach (ruka ešte päsť; ruka prudko ku kamere),
ktorých poradie sa u ľudí líši. Preto si automat pamätá čas poslednej z nich a uvoľnenie nastane,
keď je dlaň otvorená a obe udalosti sú najviac 400 ms staré. Samotné otvorenie päste ani samotný
pohyb ku kamere úderom nie sú. Vyhasnutie čaká tiež 400 ms, aby úder, pri ktorom sa dlaň otvorí
o snímku skôr, než ruka vyrazí, nebol zrušený. Stav ruky `holding` (krátky výpadok) cast
neprerušuje; `lost` ho vždy zruší — kúzlo nikdy nevystrelí omylom. Po konci castu je 500 ms
pauza, kým sa môže začať nový zber.

**Zámer (intent).** Výstupom rozpoznávača nie je gesto, ale zámer
`{ hand, element, variant, phase, aim, power }` (`phase` = `charge` | `aim` | `release` | `cancel`,
`power` 0..1 počas zberu). Efekty a terén budú poznať len zámer — myš môže vytvárať tie isté
zámery (záložný vstup) a pridanie druhej ruky, ďalších živlov či variantov kúziel nemení zvyšok
programu. Rozpoznávač je trieda s inštanciou na ruku.

**Terén z výškovej mapy** (`world/terrain.js`). Výšková mapa (heightmap) je šedotónový obrázok
`public/terrain/heightmap.png` 129 × 129 px: jas pixela 0..255 → výška 0..1, násobená
`MAX_HEIGHT` (10 jednotiek). Obrázok vytvára pomocný skript `scripts/make-heightmap.js`
(súčet 4 oktáv hodnotového šumu so semienkom, normalizácia, mocnina 1,6 — plochejšie údolia,
strmšie vrcholy; zápis PNG bez knižníc cez `zlib`); dá sa nahradiť aj ručne nakresleným obrázkom
rovnakej veľkosti. Pixely sa čítajú v prehliadači cez 2D canvas (`drawImage` → `getImageData`,
kanál R) — `main.js` počká na mapu pred vytvorením scény; pri chybe je zem rovná.
Zem je `PlaneGeometry` 40 × 40 so 128 × 128 políčkami → 129 × 129 vrcholov = 1 vrchol na pixel,
v rovnakom poradí (riadky od z = −20 po z = +20, v riadku zľava doprava), takže vrchol `i`
dostane výšku `heights[i]` bez prevzorkovania. Geometria sa otočí do roviny XZ už pri vytvorení
(`rotateX`), mesh nie je posunutý ani otočený → súradnice vrcholov = svetové súradnice.
Po posunutí vrcholov `computeVertexNormals` prepočíta normály (osvetlenie svahov); terén
vrhá aj prijíma tiene. Farba je **vrcholová** (atribút `color`, `vertexColors`): podľa výšky
plynulé prechody (`smoothstep` + `lerp`) piesok → tráva → les → skala, strmý svah (malá zložka y
normály) → skala. Rovná zem (bez mapy) má tiež 128 × 128 políčok, aby bunky stavu zeme vždy
zodpovedali vrcholom.

**Stav zeme** (`world/groundState.js`, bunkový automat). Mriežka buniek nad terénom, **bunka =
vrchol terénu** (129 × 129). Každá veličina je samostatné pole `Float32Array` s hodnotami 0..1 —
teraz `heat` (teplo) a `moisture` (vlhkosť); nový živel = nová veličina, vzájomné pôsobenie živlov
= pravidlá v `update(dt)`. Dopad kúzla `hit(živel, x, z, sila)` podľa tabuľky `HIT` (oheň → teplo,
polomer 1,5 — upravil študent z 2,5) pridá veličinu v kruhu: bod sveta → mriežka rovnako ako pri `heightAt`, prechádza sa
len štvorec okolo kruhu (orezaný na okraje) a prírastok klesá od stredu k okraju plynulo
(`1 − smoothstep(d, 0, r)`) → okrúhla škvrna bez ostrých hrán; hodnoty sú zhora obmedzené na 1.
Pravidlá zatiaľ: teplo vyhasína (z 1 na 0 za 10 s — študent skrátil z 20 s), vlhkosť vysychá (za 50 s); krok simulácie je
obmedzený na 0 … 0,1 s (po skrytí karty by stav inak „preskočil“ dlhý čas; záporný krok by
vyhasínanie obrátil na zahrievanie celého terénu — odhalil to test s ručným časom).
Modul nezávisí od Three.js. Overené v Node: stred 1,0 / pol polomeru 0,5 / okraj 0; symetria
v osiach; pri polomere 2,5 193 buniek (πr² ≈ 201); okraj mapy a bod mimo mapy bez chyby; `update` 0,08 ms.

**Výstrel → let → dopad.** `App.updateAim` si v každom snímku mierenia zapamätá hod (`lastShot`:
štart, rýchlosť, gravitácia, miesto a čas dopadu — `computeTrajectory` vracia aj čas letu `time`
z bisekcie); udalosť `release` príde až v ďalšom snímku (keď sa už nemieri), preto sa použije
zapamätaný hod. Výstrel pridá **letiace kúzlo** do zoznamu `App.projectiles` (môže letieť viac
naraz). `updateProjectiles(dt)` v každom snímku posunie čas letu a polohu vypočíta tým istým
vzorcom ako náhľad (`trajectoryAt`) → guľa letí presne po zobrazenej dráhe. Po uplynutí času letu:
záblesk (`FireFx.burst`) a dopad na zem `groundState.hit(živel, x, z, power)`. Zrušený cast (aj
pustenie počas zberu) nič nevypustí. Overené castom myšou s ručným časom: pri výstrele aj v polovici
letu (0,6 s) je zem studená, po dopade teplo 0,99; tri výstrely za sebou → 1, 2, 2 kúzla vo vzduchu,
po 2 s 0; zrušenie a skoré pustenie → 0; po 10 s od dopadu 0,45 (pri vyhasínaní za 20 s).

**Zobrazenie stavu** (`world/groundView.js`). Dve veličiny dvoma spôsobmi:
- vlhkosť → **farba vrcholov**: mokrá zem je tmavšia (základná farba × (1 − 0,55 · vlhkosť));
  základné farby (výška, sklon) sa pri vytvorení skopírujú a stav sa počíta vždy od nich;
- teplo → **žiarenie** (`emissiveMap`): farba vrcholov ide do difúzneho svetla, takže rozpálené
  miesto by v tieni bolo tmavé; žiarenie od osvetlenia nezávisí. Teplo sa zapíše do textúry
  `DataTexture` 129 × 129 (pixel = bunka; tmavočervená → oranžová → žltkastá), ktorá sa na terén
  mapuje cez jeho UV súradnice (riadok 0 terénu má v = 1 → riadky textúry otočené). Lineárne
  filtrovanie robí medzi bunkami plynulý prechod.
Obe sa prepíšu v každom snímku (~0,4 ms). Overené: kurzor položený na súradnice teplej škvrny stojí
v jej strede (textúra nie je zrkadlená); farba mokrej bunky = základná × 0,56.

**Výška v bode** (`createHeightSampler`). Balistika a bunkový automat potrebujú výšku zeme
v ľubovoľnom bode (x, z) rýchlo, bez raycastu (ten testuje tisíce trojuholníkov). Bod sa prevedie
na súradnice mriežky `col = (x / 40 + 0,5) · 128` (podobne `row` zo z); celá časť určí políčko
(4 susedné pixely), desatinná časť `tx`, `tz` polohu v ňom. Výška = bilineárna interpolácia:
`lerp` na hornom a dolnom okraji políčka podľa `tx`, medzi nimi podľa `tz`. Mimo terénu vracia
`null`; rovná zem = mapa 2 × 2 núl (ten istý výpočet). Overené proti raycastu zvislo nadol
na 1000 náhodných bodoch: priemerný rozdiel 0,001, najviac 0,017 jednotky (zem je
z trojuholníkov, interpolácia bilineárna — líšia sa len vnútri políčka).

**Cast myšou** (`input/mouse.js`) — záložný vstup, ktorý dáva **tie isté zámery** ako
`GestureRecognizer` (`hand: 'mouse'`), takže zvyšok programu nevie, odkiaľ cast prišiel.
Stlačenie ľavého tlačidla = `charge` (power 0 → 1 za 0,4 s, ako päsť), držanie = `aim`, pustenie =
`release`; pustenie počas zberu, pravé tlačidlo, Esc a odchod kurzora z plátna (obdoba straty ruky)
= `cancel`. Udalosti DOM len nastavia príznaky; automat krokuje v `update(čas)` s časom slučky
vykresľovania (rovnaká časová os ako ruka). `release`/`cancel` trvá jeden snímok. Ľavé tlačidlo
patrí castu → `OrbitControls` otáča pravým tlačidlom; počas castu je vypnuté (pravé tlačidlo vtedy
len ruší). Overené 6 scenármi s ručným časom (celý cast, skoré pustenie, pravé tlačidlo, Esc,
odchod z plátna, Esc/pravé bez castu) a v scéne: dráha je vidno len počas castu.

**Mierenie = balistika** (`cast/aim.js`). Ruka (`intent.aim`) aj myš dávajú bod v rovnakom tvare:
`{ x, y }` v rozsahu 0..1, y dole. Náhľad sa ukazuje len počas castu (`App.castIntent`: fáza
`charge` alebo `aim`; prednosť má ruka, potom myš). Bod mierenia neurčuje miesto dopadu, ale **smer
hodu** (`launchFromAim`): bod sa prevedie na NDC (−1..+1, y hore, `aimToNdc`) a cez
`Vector3.unproject` na smer lúča z kamery. Kúzlo vzniká v **kotve ruky** — pevnom bode vpravo dole
pred kamerou (`HAND_ANCHOR` = (0,6; −0,6; −1,5) v súradniciach kamery, do sveta cez
`camera.localToWorld`). Kotva sa hýbe s kamerou, nie s mierením: mierenie len „otáča prstami“.
Štart je tak mimo lúča pohľadu a dráhu vidno trochu zboku (pri štarte na lúči by sa javila ako
čiara). Do kotvy sa neskôr postaví model ruky. Uhol hodu od vodorovnej roviny je obmedzený na −80° … +60° (ruka „do
neba“ nesmie hodiť kúzlo pod seba), vodorovný smer ostáva. Rýchlosť a gravitácia závisia od živlu
(tabuľka `BALLISTICS`; oheň: 18 jednotiek/s, 9,8 jednotiek/s²).

Dráha (`computeTrajectory`) je rovnomerne zrýchlený pohyb po každej osi zvlášť:
`p(t) = štart + v·t + ½·(0, −g, 0)·t²` — vodorovne rovnomerne, zvislo s gravitáciou → parabola.
Poloha sa počíta presne zo vzorca (nie krokovaním rýchlosti — to by hromadilo chybu). Dráha sa
prechádza po 0,02 s a v každom bode sa porovná výška dráhy s `heightAt`; prvý bod pod terénom
znamená dopad medzi ním a predchádzajúcim bodom. Presné miesto nájde **bisekcia** (8× delenie
intervalu na polovicu podľa toho, či je stred nad terénom) → presnosť 0,02 / 2⁸ s. Tak dopad
zastaví aj kopec v ceste, nielen zem pod cieľom; rovnicu `y(t) = heightAt(x(t), z(t))` vzorcom
vyriešiť nejde. Bez dopadu (kúzlo vyletí z terénu alebo letí dlhšie ako 4 s) je `impact = null`.
Overené: rovná zem, štart (0, 0, 0), v = (5, 10, 0), g = 10 → dopad x = 10,001 (presne 10);
300 náhodných hodov na terén — žiadny bod dráhy pred dopadom nie je pod terénom.

Náhľad (`TrajectoryLine`): `THREE.Line` s bufferom na najdlhšiu dráhu vytvoreným raz; v každom
snímku sa prepíšu súradnice a `setDrawRange` určí počet kreslených bodov. Kurzor (krúžok) stojí
v mieste dopadu, natočený podľa normály terénu (`normalAt` — z rozdielov výšok `heightAt` v smere
x a z, `quaternion.setFromUnitVectors(hore, normála)`) a odsadený pozdĺž normály o `CURSOR_LIFT`
— inak by sa časť krúžku zanorila do svahu. Bez dopadu sa kurzor skryje.

**Častice** (`fx/particles.js`, `ParticleSystem`) — spoločný základ efektov ohňa (a neskôr vody).
Všetky častice jednej sústavy sú jeden `THREE.Points` (jedno vykreslenie). Pevná kapacita, buffre
vytvorené raz; `emit` zapíše časticu do ďalšieho slotu dokola (pri plnej sústave sa prepíše
najstaršia). Pohyb na CPU v `update(dt)`: vek → `aLife` 0..1 (1 = mŕtva), poloha += rýchlosť · dt,
„vztlak“ (buoyancy) ťahá nahor (horúci vzduch), odpor (drag) brzdí. Vzhľad určuje materiál efektu.

**Oheň** (`fx/fire.js`, `FireFx`) — vlastný shader (`ShaderMaterial`, GLSL):
- vrcholový: veľkosť bodu v pixeloch = veľkosť · mierka / vzdialenosť (mierka = výška plátna /
  (2 · tg(fov/2))) → vzdialené častice sú menšie; počas života mierne narastie; mŕtva = 0 px;
- fragmentový: mäkký kruh z `gl_PointCoord` (`1 − smoothstep`, umocnené), farba podľa veku
  žltá → oranžová → tmavočervená, nábeh a zhasnutie priehľadnosťou;
- aditívne miešanie (viac častíc = jasnejšie), `depthWrite` vypnutý (častice sa navzájom
  nezakrývajú štvorcami, ale terén ich zakryje). Jas jednej častice 0,55 — pri plnom jase sa stred
  plameňa zlial do bielej škvrny.

Oheň v ruke: počas zberu a mierenia ohňa vznikajú častice okolo kotvy ruky (`handAnchor`, tá istá
ako štart dráhy), 30 → 160 za sekundu a väčšie podľa sily (`intent.power`), stúpajú nahor.
Ohnivá guľa (`fireball`): v mieste letiacej gule vzniká 240 krátko žijúcich (0,15–0,35 s) častíc
za sekundu; nové tvoria jasné jadro, staršie zaostávajú a zhasínajú → chvost vznikne sám pohybom.
Záblesk (`burst`): 90 častíc do hornej pologule rýchlosťou 2–6 a jediné bodové svetlo
(`PointLight`, presunie sa na miesto dopadu, zhasne kvadraticky za 0,4 s) — osvetlí svah okolo
dopadu. Svetlo je v scéne stále (s intenzitou 0): pridanie svetla počas behu by vynútilo nové
zostavenie shaderov. Počet častíc za sekundu nezávisí od FPS (zvyšok `rate · dt` sa prenáša do
ďalšieho snímku). Snímok s ohňom v ruke ~1,6 ms, s tromi guľami a zábleskami ~6,6 ms (panel Claude).

**Upozornenie „Málo svetla“** (`ui/lightHint.js`). Pri slabom svetle kamera predlžuje expozíciu,
dáva menej snímok (namerané ~16 namiesto 30 snímok/s) a obraz pri pohybe rozmazáva. Frekvenciu
kamery poznáme z frekvencie detekcie (beží na každom novom snímku). Ak je dlhšie ako 3 s pod 22,
zobrazí sa upozornenie; zmizne po 1 s nad 26 (hysterézia proti blikaniu). Ak detekcia sama trvá
dlhšie ako 33 ms (napr. CPU), frekvencia o svetle nič nehovorí a upozornenie sa nemení.

### 3.3 Popis modulov a tried

| Modul | Trieda / funkcia | Úloha |
|---|---|---|
| `src/main.js` | — | vstupný bod: načíta výškovú mapu, vytvorí `App`, spustí kameru a model (paralelne), pripojí ich |
| `src/app.js` | `App` | renderer, scéna, kamera, `OrbitControls`, zem (`ground`) a výška zeme (`heightAt`); slučka `renderFrame`, `updateHand`, `updateAim`, `updatePerf` |
| `src/world/sceneSetup.js` | `createRenderer`, `createCamera`, `createScene` | základ scény Three.js |
| `src/world/terrain.js` | `loadHeightmap(url)`, `createGround(heightmap)`, `createHeightSampler(heightmap)`, `normalAt(heightAt, x, z)`; `GROUND_SIZE`, `MAX_HEIGHT` | výšková mapa z obrázka → `{ heightmap, error }`; terén 40 × 40 s vrcholovými farbami a tieňmi (bez mapy rovný); funkcia (x, z) → výška alebo `null`; normála terénu v bode |
| `src/fx/particles.js` | `ParticleSystem` | sústava častíc (jeden `THREE.Points`): `emit(poloha, rýchlosť, život, veľkosť)`, `update(dt, kamera, výška plátna)` |
| `src/fx/fire.js` | `FireFx` | oheň z častíc (vlastný shader): `handFlame(kotva, sila, dt)`, `fireball(poloha, sila, dt)`, `burst(bod, sila)` (+ svetlo záblesku), `update` |
| `src/world/groundState.js` | `GroundState` | stav zeme (bunkový automat): `heat`, `moisture`; `toGrid(x, z)`, `addAround(pole, x, z, polomer, prírastok)`, `hit(živel, x, z, sila)`, `update(dt)` |
| `src/world/groundView.js` | `GroundView` | zobrazenie stavu na teréne: vlhkosť → farba vrcholov, teplo → `emissiveMap`; `update()` |
| `scripts/make-heightmap.js` | — | pomocný nástroj (nie súčasť aplikácie): vygeneruje `public/terrain/heightmap.png` |
| `src/cast/aim.js` | `aimToNdc(aim)`, `handAnchor(kamera)`, `launchFromAim(aim, kamera, živel)`, `trajectoryAt(štart, rýchlosť, g, t)`, `computeTrajectory(štart, rýchlosť, g, heightAt)` | bod mierenia → NDC; kotva ruky vo svete; parametre hodu `{ start, velocity, gravity }`; poloha na dráhe v čase t; parabolická dráha → `{ points, impact, time }` (`impact`, `time` = `null` bez dopadu) |
| `src/cast/aim.js` | `AimCursor`, `TrajectoryLine` | kurzor v mieste dopadu: `moveTo(bod, normála)`, `hide`; čiara dráhy: `show(points)`, `hide` |
| `src/input/mouse.js` | `MouseInput` | záložný vstup: poloha myši `aim` (0..1, `null` mimo plátna) a cast myšou s rovnakými zámermi ako ruka — `update(čas)` → zámer pri zmene fázy; `intent`, `casting` |
| `src/input/camera.js` | `startCamera(width, height)` | `getUserMedia` → `{ video, error }`; pri chybe `video = null` (záloha myš) |
| `src/input/hand.js` | `loadHandLandmarker()` | načíta wasm a model z `public/mediapipe/` → `{ landmarker, delegate, error }` |
| `src/input/hand.js` | `HandTracker` | `update(čas)`: detekcia pri novom snímku, stavy ruky; `state`, `landmarks`, `present` |
| `src/ui/handPreview.js` | `HandPreview` | panel vpravo dole: zrkadlové video, body ruky (2D canvas), rámik podľa stavu |
| `src/ui/fpsMeter.js` | `RateMeter`, `PerfOverlay` | meranie udalostí/s a trvania; panel výkonu vľavo hore |
| `src/input/handFeatures.js` | `toPixels`, `distance`, `palmSize`, `palmCenter`, `openness`, `palmNormal`, `snapshotFeatures` | príznaky jedného snímku ruky (čisté funkcie, jedna ruka) |
| `src/input/handFeatures.js` | `HandMotion` | história pohybu ruky (1 s): `push`, `reset`, `velocity`, `depthRate` |
| `src/input/gestures.js` | `GestureRecognizer` | stavový automat castu (`idle` / `charging` / `aiming`): `update(čas, stav ruky, príznaky, pohyb)` → zámer pri zmene fázy; `state`, `intent` |
| `src/ui/lightHint.js` | `LightHint` | upozornenie „Málo svetla“ podľa snímok kamery za sekundu |
| `src/ui/featureRecorder.js` | `FeatureRecorder` | len vývojový režim: kláves R → záznam príznakov 3 s, súhrn min/max v konzole |

Moduly `input/` a `ui/` nezávisia od Three.js; MediaPipe importuje len `input/hand.js`.

Poradie volaní v jednom snímku: `App.renderFrame` → `updateHand` (`HandTracker.update` →
`LightHint.update` → `updateHandFeatures` (`snapshotFeatures`, `HandMotion.push`) →
`updateGestures` (`GestureRecognizer.update`) → `HandPreview.showInfo` / `setState` / `draw`)
→ `updateMouse` (`MouseInput.update`) → `controls.enabled = !castIntent()` →
`OrbitControls.update` → `updateAim` (`castIntent` → `launchFromAim` → `computeTrajectory` →
`TrajectoryLine.show`, `AimCursor.moveTo`) → `updateFx(dt)` (`FireFx.handFlame` →
`updateProjectiles`: `trajectoryAt`, `FireFx.fireball` / pri dopade `burst` + `GroundState.hit` →
`FireFx.update`) → `GroundState.update(dt)` → `GroundView.update` → `renderer.render` → `updatePerf`.

## 4. Preklad programu

### 4.1 Zoznam zdrojových textov
Pozri tabuľku v 3.3; výpisy v prílohe (Zdrojové texty).

### 4.2 Požiadavky na technické prostriedky
Počítač s webkamerou a grafickou kartou s podporou WebGL 2.

### 4.3 Požiadavky na programové prostriedky
Node.js 24 LTS, npm 11; prehliadač Chrome/Edge (aktuálna verzia).
Knižnice (presné verzie v `package.json`): three 0.186.1, @mediapipe/tasks-vision 1.1.1, Vite 8.3.4.

### 4.4 Vlastný preklad
```
npm ci          # inštalácia knižníc; postinstall skopíruje wasm MediaPipe do public/mediapipe/wasm/
npm run dev     # vývojový server (http://localhost:5173)
npm run build   # produkčný build do dist/
```

## 5. Nadväznosť na iné programové produkty
Webové technológie: WebGL 2 (Three.js), WebAssembly (MediaPipe), `getUserMedia` (kamera).

## 6. Zhodnotenie riešenia
TODO. Známe obmedzenia (V0): detekcia beží v hlavnom vlákne (~27 ms na snímok, pri nej
klesá plynulosť) — plánovaný presun do Web Workera; frekvenciu detekcie obmedzuje kamera.
Gestá vo V0: len oheň; voda (zber krúžením dlane, uvoľnenie pushom) je navrhnutá z meraní
a príde vo V1 spolu s efektom vody. Prahy sú namerané na jednej ruke a jednej kamere.

## 7. Zoznam použitej literatúry
- Google: *MediaPipe Hand landmarker guide for Web*. https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js (TODO: dátum čítania)
- three.js — dokumentácia. https://threejs.org/docs/ (TODO: dátum čítania)
- Netflix Tudum: *What Is Bending?* — bojové umenia za štýlmi ohýbania živlov.
  https://www.netflix.com/tudum/articles/what-is-bending-avatar-last-airbender (čítané 02.11.2026)

## 8. Zoznam príloh
Zdrojové texty (samostatný dokument).
