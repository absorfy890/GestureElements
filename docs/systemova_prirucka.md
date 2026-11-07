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

**Mierenie na zem** (`cast/aim.js`). Ruka (`intent.aim`) aj myš (`MouseInput.aim`) dávajú bod
v rovnakom tvare: `{ x, y }` v rozsahu 0..1, y dole. Bod sa prevedie na NDC (−1..+1, y hore,
`aimToNdc`), `Raycaster.setFromCamera` z neho vytvorí lúč z polohy kamery cez daný bod obrazovky
a `intersectObject` nájde jeho priesečník so zemou; tam sa presunie kurzor (krúžok). Lúč, ktorý
zem nepretne (mieri sa na oblohu), kurzor skryje. Prednosť má ruka počas castu (fáza `charge`
alebo `aim`), inak myš nad plátnom. Vo V1 sa lúč použije len ako smer hodu a miesto dopadu
určí balistická dráha (parabola) a jej priesečník s terénom.

**Upozornenie „Málo svetla“** (`ui/lightHint.js`). Pri slabom svetle kamera predlžuje expozíciu,
dáva menej snímok (namerané ~16 namiesto 30 snímok/s) a obraz pri pohybe rozmazáva. Frekvenciu
kamery poznáme z frekvencie detekcie (beží na každom novom snímku). Ak je dlhšie ako 3 s pod 22,
zobrazí sa upozornenie; zmizne po 1 s nad 26 (hysterézia proti blikaniu). Ak detekcia sama trvá
dlhšie ako 33 ms (napr. CPU), frekvencia o svetle nič nehovorí a upozornenie sa nemení.

### 3.3 Popis modulov a tried

| Modul | Trieda / funkcia | Úloha |
|---|---|---|
| `src/main.js` | — | vstupný bod: vytvorí `App`, spustí kameru a model (paralelne), pripojí ich |
| `src/app.js` | `App` | renderer, scéna, kamera, `OrbitControls`; slučka `renderFrame`, `updateHand`, `updateAim`, `updatePerf` |
| `src/world/sceneSetup.js` | `createRenderer`, `createCamera`, `createScene` | základ scény Three.js |
| `src/world/terrain.js` | `createGround()`, `GROUND_SIZE` | zem 40 × 40 (V0 rovná), prijíma tiene |
| `src/cast/aim.js` | `aimToNdc(aim)`, `AimCursor` | prevod bodu mierenia na NDC; kurzor na zemi: `aimAt(aim)` → bod alebo `null`, `moveTo`, `hide` |
| `src/input/mouse.js` | `MouseInput` | poloha myši nad plátnom ako `aim` (0..1); `null` mimo plátna |
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
→ `OrbitControls.update` → `updateAim` (`AimCursor.aimAt`) → `renderer.render` → `updatePerf`.

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
