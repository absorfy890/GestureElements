# PROGRES — PG semestrálne zadanie

## Stav (01.11.2026)
V0 krok 1 hotový: Vite + Three.js, prázdna scéna (kamera, HemisphereLight + DirectionalLight
s tieňmi, OrbitControls, pomocná mriežka), `package-lock.json` → funguje `npm ci`.
Krok 2.1 hotový: MediaPipe súbory lokálne, Vite ich servíruje.
Krok 2.2 hotový: `src/input/camera.js` (`startCamera()` → `{ video, error }`), výsledok zatiaľ
len v konzole.
Krok 2.3 hotový: `src/input/hand.js` (`loadHandLandmarker()` → `{ landmarker, delegate, error }`,
GPU → záloha CPU), v `main.js` paralelne s kamerou (`Promise.all`).
Krok 2.4 hotový: trieda `HandTracker` (`update(čas)` → detekcia len pri novom snímku,
`present` + `landmarks`), volá ju `App.updateHand()`; v konzole len zmena stavu ruky.
Krok 2.5 hotový: `src/ui/handPreview.js` (`HandPreview` — panel vpravo dole, zrkadlové video
cez CSS, body cez 2D canvas s x → 1 − x, špička ukazováka červená).
Krok 2.6 hotový: `HandTracker.state` = tracking / holding (posledné body ešte `HOLD_MS` = 300 ms)
/ lost; chyba modelu → varovanie, nie pád; rámik náhľadu zelený / oranžový / červený.
Krok 2.7 hotový → **krok 2 (hand tracking) hotový.** Panel výkonu (`src/ui/fpsMeter.js`),
nový snímok cez `requestVideoFrameCallback`, rozhodnutie o modeli v `CLAUDE.md`, kostra
`docs/` (používateľská + systémová príručka, Markdown).
Ďalej: krok 3 — prvý návrh gest (štart / potvrdiť / zrušiť) z landmarkov, výpis stavu.

## Rozsah (minimum → ideál)
- **V0 — spike:** kamera + hand tracking, 21 bodov na obrazovke; rovná zem v Three.js. Poistka.
- **V1 — minimum:** terén (statická heightmap); jedna ruka; oheň a voda; cast (štart → náhľad
  → potvrdenie/zrušenie); terén reaguje (horí, mokne, voda hasí); záložný vstup myšou;
  About; dokumentácia; zip.
  - **Výkon — detekcia ruky mimo hlavného vlákna:** `detectForVideo` beží synchrónne
    ~22 ms (GPU, notebook 144 Hz) a v tom čase sa nekreslí → presunúť HandLandmarker
    do Web Workera (snímok cez `createImageBitmap` / `VideoFrame`, výsledok cez `postMessage`);
    preveriť, koľko z 22 ms je kopírovanie GPU ↔ CPU. Cieľ: render nezávislý od detekcie.
- **V2 — deformácia terénu:** vlny/krátery, šírenie ohňa, stekanie vody.
- **V3 — varianty a druhá ruka:** prúd vs. guľa vody, kus vs. stena kameňa; zem a vzduch;
  druhá ruka; kombá; pohyb klávesnicou.
- **V4 — vízia:** deformovateľný terén ako vo Valheime, horiace stromy/tráva, fyzika častíc.
Rozhodnutie: pohyb po scéne v minime nie je (pevná kamera / OrbitControls myšou).

## Plán týždňa 27.10–2.11 (V0)
1. ~~`npm ci`, prázdna Three.js scéna na Vite (kostra z cvičenia 5).~~ (31.10.)
2. ~~Model sledovania ruky z lokálnych súborov, 21 bodov na obrazovke~~ (01.11.) (kandidát: MediaPipe
   `@mediapipe/tasks-vision`, HandLandmarker; rozhodnutie zapísať do `CLAUDE.md`):
   - ~~2.1 Lokálne súbory: `npm install` balíka (presná verzia, `npm view`), wasm do
     `public/mediapipe/wasm/`, model `hand_landmarker.task` do `public/mediapipe/`;
     overiť, že ich Vite servíruje (žiadne CDN, musí bežať offline).~~ (01.11.)
   - ~~2.2 Kamera: `getUserMedia` → `<video>`; ošetriť chyby (bez kamery, zamietnutý prístup)
     → záložný vstup myšou.~~ (01.11.)
   - ~~2.3 Načítanie modelu: `HandLandmarker` v režime VIDEO, 1 ruka; modul `src/input/hand.js`
     bez závislosti na Three.js.~~ (01.11.) Výstup „je ruka / nie“ + 21 bodov → presunuté do 2.4.
   - ~~2.4 Detekcia: `detectForVideo` v slučke, len pri novom snímku videa.~~ (01.11.)
   - ~~2.5 21 bodov na obrazovke: 2D canvas nad videom, zrkadlenie x → 1 − x.~~ (01.11.)
   - ~~2.6 Strata ruky z kadru: stav „stratená“, indikátor, bez pádu aplikácie.~~ (01.11.)
   - ~~2.7 Záver: FPS ≥ 30, rozhodnutie do `CLAUDE.md`, kostra `docs/` (vstup ruky), commit.~~ (01.11.)
   Overenie: body na ruke kontroluje študent na vlastnej kamere; Claude screenshotmi len
   štart bez chýb v konzole (alebo nahraté video cez fake webcam).
3. Prvý návrh gest (štart / potvrdiť / zrušiť) z landmarkov, výpis stavu.
4. Rovná zem + kurzor ruky ako raycast na zem.
5. ~~Založiť kostru dokumentácie (`docs/`).~~ (01.11., spolu s 2.7)

## Otvorené otázky na cvičiaceho
Termín ukážky/skúšky; kam odovzdať (GIT?) a limit veľkosti; či stačí Three.js + Vite;
či zápis témy v tabuľke môže dostať drobné spresnenia.

## Poznámky
- three 0.186: `THREE.Clock` je zastaraný → `THREE.Timer`; `PCFSoftShadowMap` odstránený →
  `PCFShadowMap` (inak varovania v konzole).
- `npm run build` hlási veľký chunk (three) — len upozornenie, nie chyba.
- MediaPipe: `@mediapipe/tasks-vision` 1.1.1 (stabilná; 1.2.0 bola 5 dní stará). Wasm (~40 MB)
  nie je v gite — kopíruje ho `scripts/copy-wasm.js` (postinstall po `npm ci`).
  Model `public/mediapipe/hand_landmarker.task` je v gite (7,8 MB, v npm nie je), zdroj:
  `storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/`,
  SHA-256 `fbc2a300…3607cde1`.
- Chyba CSP „unsafe-eval … chrome-extension://…“ z `content.js` v konzole pochádza z rozšírenia
  prehliadača, nie z nášho kódu (v inkognito nie je).
- Na Windows `TaskStop` zastaví len `npx`, proces Vite (node) beží ďalej → zastaviť podľa PID.
- Test bez kamery: umelé video z canvasu (`canvas.captureStream()`) → `HandPreview` a pod.
  Snímky panela Claude orezávajú pravý dolný roh (artefakt snímky, nie chyba rozloženia).
- Test logiky `HandTracker` bez kamery: podvrhnúť `{ detectForVideo() }` a `{ currentTime }`,
  volať `update(čas)` s ručným časom (postup v denníku 01.11., krok 2.6).
- `video.currentTime` pri živej kamere plynie spojito (nie po snímkach) → nový snímok zisťovať
  cez `requestVideoFrameCallback`. Pozor: v skrytej karte / skrytom paneli Claude sa nevolá.
- Meranie výkonu (notebook študenta, 144 Hz, GPU): bez kamery render 144 FPS; s detekciou
  render ~100 FPS, detekcia ~27 ms/snímok. Kamera notebooku dáva reálne ~16,5 snímok/s
  (aj pri 1280×720 a pri svetle; `getSettings()` hlási 30 — neplatí) → limit kamery, nie kódu.
  Meranie: `metadata.presentedFrames` z `requestVideoFrameCallback` za 3 s.
- Prvá detekcia trvá ~2,4 s (kompilácia GPU shaderov MediaPipe) — pri štarte nevadí;
  ak bude About/úvodná obrazovka, zahriať model za ňou.
- Ak budú gestá „lepkavé“: kratšia expozícia cez `track.applyConstraints`
  (`exposureMode: 'manual'`) — nie všetky kamery to vedia. Do používateľskej príručky:
  hrať pri dobrom osvetlení.

## Denník
- 27.10.2026 — založený repozitár, `CLAUDE.md`, `PROGRES.md`; rozsah V0–V4 dohodnutý.
- 31.10.2026 — hranice technológií (CLAUDE.md); V0/1: prázdna scéna, `npm ci` funguje,
  konzola bez chýb (overené screenshotom v Chromiu).
- 01.11.2026 — krok 2 rozdelený na podkroky 2.1–2.7 (MediaPipe HandLandmarker ako kandidát;
  verziu balíka a odkaz na model overiť v 2.1).
- 01.11.2026 — 2.1 hotový: balík 1.1.1, wasm cez postinstall, model v `public/mediapipe/`;
  dev server vracia model aj wasm (200, správne veľkosti, `application/wasm`).
- 01.11.2026 — 2.2 hotový: kamera 640×480 OK (overil študent v Chrome), zamietnutý prístup →
  varovanie, scéna beží ďalej (overené aj v paneli prehliadača Claude).
- 01.11.2026 — 2.3 hotový: `HandLandmarker OK (GPU)` u študenta v Chrome aj v paneli Claude;
  sieť: wasm (SIMD) aj model len z localhost, žiadne CDN.
- 01.11.2026 — 2.4 hotový: študent overil „Ruka v zábere“ / „Ruka stratená“ a 21 bodov
  v `app.hand.landmarks`; bez kamery `app.hand === null`, bez chýb.
- 01.11.2026 — 2.5 hotový: body sedia na ruke (overil študent); zrkadlenie overené aj
  v paneli Claude na umelom videu (canvas → `captureStream`).
- 01.11.2026 — 2.6 hotový: test s podvrhnutým modelom (ruka / bez ruky / výnimka, ručný čas)
  odhalil blikanie tracking ↔ holding medzi snímkami kamery (60 Hz vs 30 Hz) → opravené
  (`lastFrameHadHand`); študent overil rámik a stavy na vlastnej kamere.
- 01.11.2026 — 2.7 hotový: meranie odhalilo, že detekcia bežala v každom snímku renderu
  (`currentTime` pri kamere plynie spojito) → `requestVideoFrameCallback`; render 45 → ~100 FPS.
  Kamera reálne ~16,5 snímok/s (overené cez `presentedFrames`, aj 1280×720). Model zapísaný
  do `CLAUDE.md`; `docs/` — kostry oboch príručiek podľa osnovy z pokynov.
