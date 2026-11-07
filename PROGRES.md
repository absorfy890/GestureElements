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
Krok 3 hotový (02.11.2026): príznaky ruky (`src/input/handFeatures.js`), merania pohybov
(záznamník R), `src/input/gestures.js` — `GestureRecognizer` pre oheň (zber päsťou → mierenie →
úder s otvorením / zrušenie švihom, vyhasnutím, stratou ruky), výstup = zámer (intent); stav
castu v náhľade a konzole. Navyše upozornenie „Málo svetla“ (`src/ui/lightHint.js`).
Krok 4 hotový (07.11.2026): rovná zem (`src/world/terrain.js`) namiesto mriežky, kurzor
(`src/cast/aim.js`: `aimToNdc` — napísal študent, `AimCursor.aimAt` = raycast), myš
(`src/input/mouse.js`); prednosť má ruka počas castu. Overené simulovaným zámerom a udalosťami
myši; **na kamere ešte overí študent.** Rozhodnutie: mierenie = balistika (CLAUDE.md).
Krok 5 hotový (07.11.2026) = **V1/1 statický terén z heightmapy**: `public/terrain/heightmap.png`
(129×129, generuje `scripts/make-heightmap.js`), `loadHeightmap` (2D canvas → výšky 0..1),
`createGround(heightmap)` (1 vrchol na pixel, `MAX_HEIGHT` = 10 — zvolil študent, vrcholové farby
podľa výšky a sklonu, tiene), `createHeightSampler` → `app.heightAt(x, z)` (bilineárne, `null` mimo
terénu); kurzor sa natáča podľa normály svahu. Cyklus posunu vrcholov a prvú verziu `heightAt` písal
študent, Claude prepísal načisto. Overené v paneli myšou (podvrhnutá `app.mouse.aim`).
Ďalej (8. týždeň): náhľad balistickej dráhy + `groundState`.

## Rozsah (minimum → ideál)
- **V0 — spike:** kamera + hand tracking, 21 bodov na obrazovke; rovná zem v Three.js. Poistka.
- **V1 — minimum:** terén (statická heightmap); jedna ruka; oheň a voda; cast (štart → náhľad
  → potvrdenie/zrušenie); terén reaguje (horí, mokne, voda hasí); záložný vstup myšou;
  About; dokumentácia; zip.
  - **Výkon — detekcia ruky mimo hlavného vlákna (voliteľné, ak bude čas — plán 02.11.):** `detectForVideo` beží synchrónne
    ~22 ms (GPU, notebook 144 Hz) a v tom čase sa nekreslí → presunúť HandLandmarker
    do Web Workera (snímok cez `createImageBitmap` / `VideoFrame`, výsledok cez `postMessage`);
    preveriť, koľko z 22 ms je kopírovanie GPU ↔ CPU. Cieľ: render nezávislý od detekcie.
- **V2 — deformácia terénu:** vlny/krátery, šírenie ohňa, stekanie vody.
- **V3 — varianty a druhá ruka:** prúd vs. guľa vody, kus vs. stena kameňa; zem a vzduch;
  druhá ruka; kombá; pohyb klávesnicou.
- **V4 — vízia:** deformovateľný terén ako vo Valheime, horiace stromy/tráva, fyzika častíc.
  Nápad študenta (07.11.): low-poly 3D model ruky v scéne, ktorý opakuje pohyby skutočnej ruky
  (z 21 bodov), nahradí náhľad kamery a je miestom, odkiaľ kúzlo vylieta.
Rozhodnutie: pohyb po scéne v minime nie je (pevná kamera / OrbitControls myšou).

## Plán do konca semestra (dohodnuté 02.11.2026)
Cieľ: **V1 (minimum) 100 % hotové do konca 11. týždňa semestra**; V2–V4 len ak ostane čas.
Študent má veľa iných predmetov → rátame ~2 pracovné relácie týždenne, posledný týždeň = rezerva.
Týždeň 2.–8.11. = 7. týždeň semestra (potvrdil študent) → do konca 11. týždňa (6.12.) ostáva 5 týždňov.

| Týždeň | Termín | Úlohy | Hotovo, keď |
|---|---|---|---|
| 7 | 2.–8.11. | V0 krok 4: rovná zem + kurzor ruky (raycast z `intent.aim`); statický terén z heightmapy | kurzor sleduje ruku po teréne |
| 8 | 9.–15.11. | náhľad trajektórie (parabola ako granát) pri mierení; myš dáva tie isté zámery; `groundState` (bunky: teplo, vlhkosť) + zobrazenie na teréne | cast myšou aj rukou ukáže trajektóriu a dopad zmení bunky |
| 9 | 16.–22.11. | `fx/fire` (vlastné častice/shader); terén horí; About pri štarte | výstrel ohňa zapáli miesto dopadu |
| 10 | 23.–29.11. | voda: gesto (kruh → push, prahy už namerané), `fx/water`, terén mokne, voda hasí | celý V1 funguje |
| 11 | 30.11.–6.12. | **rezerva**; dokumentácia do PDF, zdrojové texty, zip, test na inom PC (CPU), výkonové presety | odovzdateľný zip |

Ak meškáme (v tomto poradí škrtáme): Web Worker pre detekciu (len ak bude čas) → jednoduchšie gesto
vody (push bez kruhu) → jednoduchšie častice. Čo nie je v tabuľke, je ideál (V2–V4).

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
3. ~~Prvý návrh gest (štart / potvrdiť / zrušiť) z landmarkov, výpis stavu.~~ (02.11.)
   Rozhodnutie 02.11.: krok 3 = jeden úplný cyklus pre **oheň** (zber = päsť ≥ 0,4 s;
   uvoľnenie = úder ku kamere s otvorením dlane; zrušenie = švih do strany / strata ruky).
   **Voda presunutá do V1** (s `fx/water`): zber = kruh otvorenou dlaňou ku kamere (súčet
   uhla otočenia smeru pohybu ≥ ~300° za ≤ 2 s pri rýchlosti > 0,8), uvoľnenie = push
   (dlaň ≥ 20 % väčšia ako na začiatku mierenia, ~0,2 s). Merania sú v Poznámkach.
   Zem (V3): dlaň dole (ny > 0,5), zdvihnúť → prudko dole (vy > 8).
   - ~~3a Príznaky ruky (`src/input/handFeatures.js`) + výpis v náhľade~~ (02.11.)
   - ~~3b Merania pohybov (záznamník R, `src/ui/featureRecorder.js`)~~ (02.11.)
   - ~~3c `src/input/gestures.js` — stavový automat castu (oheň), výpis stavu.~~ (02.11.)
4. ~~Rovná zem + kurzor ruky ako raycast na zem.~~ (07.11.)
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
- Raycast na terén 128×128 (~33 tis. trojuholníkov) trvá ~2 ms (panel Claude) — 1× za snímok OK;
  pri balistike nehľadať dopad raycastom po krokoch, ale `heightAt` (porovnať y dráhy s výškou).
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
- 02.11.2026 potvrdené: príčina ~16,5 snímok/s je automatická expozícia (málo svetla) —
  pri jasnej lampe kamera dáva 30 snímok/s. Dlhá expozícia = aj rozmazanie → pri prudkých
  pohyboch sa ruka stráca.
- Merania 3b (02.11.2026, pravá ruka, záznam R, 3 s; rýchlosť v dlaniach/s, hĺbka = ln-rast dlane/s):
  | pohyb | open | speed max | depth min/max | iné |
  |---|---|---|---|---|
  | pokoj, dlaň ku kamere | 0,89–0,91 | 0,15 | −0,14/+0,16 | nz −0,99 |
  | pomaly do strán | 0,71–0,87 | 4,0 | −0,43/+0,46 | |
  | rýchly švih do strán | 0,78–0,95 | 14,6 | −1,2/+1,5 | 3 snímky bez ruky; nz preskočí až na +0,96 (rozmazanie) |
  | voda: push ku kamere | 0,85–0,92 | 0,6 | −0,8/+1,0 | |
  | voda: kruh dlaňou | 0,85–0,92 | 3,4 | −1,0/+1,0 | |
  | oheň: päsť → úder s otvorením | 0,00–0,94 | 2,4 | −2,6/+4,2 | bez straty ruky; päsť má ny až 0,9 |
  | zem: dlaň dole, hore → prudko dole | 0,03–1,00 | 19,0 | −3,5/+2,9 | vy až 18,5; ny 0,35–0,99; 1 snímka bez ruky |
  | päsť ↔ dlaň pomaly | 0,00–0,94 | 0,6 | −0,7/+1,2 | zmena tvaru ruky sama hýbe hĺbkou do ~1,2 |
  Prvé 3 merania ~17 snímok/s, ďalšie 24–30 (svetlo).
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
- 02.11.2026 — krok 3: inšpirácia „Avatar“ (živly = bojové umenia; gramatika zber → mierenie →
  uvoľnenie), rozhodnutia o rozšíriteľnosti (2 ruky, varianty, kombá) zapísané do `CLAUDE.md`.
  3a príznaky ruky (študent napísal `openness`), overené 8 testami na kamere. Príčina ~16 snímok/s
  = automatická expozícia (pri lampe 30) → upozornenie „Málo svetla“. 3b merania 8 pohybov
  záznamníkom R → prahy. Rozsah zúžený na oheň (voda → V1). 3c `GestureRecognizer`: 12 testov
  na podvrhnutých príznakoch + simulácia cez `App`; študent overil celý cyklus na kamere
  (úder, švih, strata ruky, vyhasnutie po pomalom povolení päste — pridané na jeho podnet).
  Dokumentácia: systémová 3.2/3.3 (príznaky, merania, automat, zámer), používateľská 4.2 (gestá).
- 02.11.2026 — plán do konca semestra: V1 do konca 11. týždňa (6.12.), ~2 relácie/týždeň,
  11. týždeň = rezerva; úlohy rozpísané vo FlowSavvy (zoznam TUKE) s termínmi na koniec týždňa.
  Titulná strana dokumentácie → úloha 11. týždňa (dokumentácia do PDF). Krok 3 zatiaľ
  necommitnutý — commituje študent sám.
- 07.11.2026 — krok 3 medzitým commitnutý (`1a44060`). Prehliadka kódu so študentom (bez zmien
  v kóde): zhora nadol, po toku dát kamera → `hand` → `handFeatures` → `gestures` → zámer, potom
  `main`/`app`, `ui/` (prehľad), `sceneSetup` (podrobne, vrátane tieňovej kamery). Študent odpovedal
  na kontrolné otázky; ťažšie miesta: časové stavy `HandTracker` (bez nových snímok tracking → lost,
  holding nie), znamienka normály dlane, x v nezrkadlenom obraze (pohyb doprava → vx < 0).
  Drobnosť na neskôr (môže urobiť študent): `1000 / 30` v `app.js` → pomenovaná konštanta.
  Ďalej: krok 4 (rovná zem + kurzor ruky) — prepočet `intent.aim` → NDC pre `Raycaster` si študent
  premyslí pri úlohe.
- 07.11.2026 — V1/1 terén z heightmapy (úloha FlowSavvy, termín 8.11.): rozhodnutia — heightmap ako
  PNG v `public/` generovaný skriptom (Node + zlib, bez knižníc), 129 px = 128 políčok → vrchol =
  pixel; vrcholové farby namiesto textúry (rovnaký mechanizmus neskôr pre `groundState`); výška
  v bode cez `createHeightSampler` (fabrika/uzáver, nie trieda; `App.ground` ostal Mesh).
  Študent napísal cyklus posunu vrcholov (opravy: veľkosť vs. počet segmentov, chýbajúca mierka,
  tiene, duplicitný kód) a pokus o `heightAt` (čiarka v indexe `[row, col]`, `round` namiesto
  `floor` + zlomku, `lerp` na číslach) → Claude prepísal; vysvetlené `lerp`/`smoothstep` na
  príkladoch. `heightAt` overené proti raycastu (1000 bodov, max. rozdiel 0,017). Dokumentácia:
  systémová 3.2 (terén, výška v bode, kurzor na svahu), 3.3; používateľská 4.2 (veta o teréne).
  Necommitnuté — commituje študent.

