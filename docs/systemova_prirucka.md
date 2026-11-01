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

### 3.3 Popis modulov a tried

| Modul | Trieda / funkcia | Úloha |
|---|---|---|
| `src/main.js` | — | vstupný bod: vytvorí `App`, spustí kameru a model (paralelne), pripojí ich |
| `src/app.js` | `App` | renderer, scéna, kamera, `OrbitControls`; slučka `renderFrame`, `updateHand`, `updatePerf` |
| `src/world/sceneSetup.js` | `createRenderer`, `createCamera`, `createScene` | základ scény Three.js |
| `src/input/camera.js` | `startCamera(width, height)` | `getUserMedia` → `{ video, error }`; pri chybe `video = null` (záloha myš) |
| `src/input/hand.js` | `loadHandLandmarker()` | načíta wasm a model z `public/mediapipe/` → `{ landmarker, delegate, error }` |
| `src/input/hand.js` | `HandTracker` | `update(čas)`: detekcia pri novom snímku, stavy ruky; `state`, `landmarks`, `present` |
| `src/ui/handPreview.js` | `HandPreview` | panel vpravo dole: zrkadlové video, body ruky (2D canvas), rámik podľa stavu |
| `src/ui/fpsMeter.js` | `RateMeter`, `PerfOverlay` | meranie udalostí/s a trvania; panel výkonu vľavo hore |

Moduly `input/` a `ui/` nezávisia od Three.js; MediaPipe importuje len `input/hand.js`.

Poradie volaní v jednom snímku: `App.renderFrame` → `updateHand` (`HandTracker.update` →
`HandPreview.setState` / `draw`) → `OrbitControls.update` → `renderer.render` → `updatePerf`.

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

## 7. Zoznam použitej literatúry
- Google: *MediaPipe Hand landmarker guide for Web*. https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js (TODO: dátum čítania)
- three.js — dokumentácia. https://threejs.org/docs/ (TODO: dátum čítania)

## 8. Zoznam príloh
Zdrojové texty (samostatný dokument).
