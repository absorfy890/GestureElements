# CLAUDE.md — PG semestrálne zadanie (téma 9: AI a počítačová grafika)

## Na začiatku práce
Prečítaj `PROGRES.md`. Na konci relácie ho aktualizuj.

## Zadanie (skrátene)
Three.js scéna: terén (heightmap), ktorý reaguje na živly. Živly sa „kúzlia“ gestami ruky
z webkamery (hand tracking). Grafický výsledok je podstatou, vstup rukou je sekundárny.
Cast: štart gestom → náhľad trajektórie (ako granát) → potvrdenie gestom / zrušenie gestom.
Terén reaguje (horí, mokne, hasne, pokrytý kameňom). Bez terčov.

## Hodnotenie (podľa P00) — z toho vychádza priorita práce
Zápočet (15 b): funkčnosť 6, vzhľad 3, dodržanie témy 3, doplnky/originalita 3.
Skúška, písomná časť (25 b): funkčnosť 6, kód 6, vzhľad 4, téma 3, doplnky 3, dokumentácia 3.
Odovzdanie: zip `Priezvisko_PG1_2026_2027.zip` bez hesla, bez `node_modules`/`dist`;
dokumentácia = používateľská príručka + systémová príručka + zdrojové texty (osnova:
`lessons_material/PG/materials/Pokyny_na_vypracovanie_semestralnych_zadani.pdf`).
Aplikácia má pri štarte sekciu About (mená, katedra/fakulta/univerzita, predmet, školský rok);
nevratné akcie potvrdzovať. Úložisko a limit veľkosti určuje cvičiaci (zatiaľ neznáme).

## Technológie (pevné verzie)
Node 24 LTS, npm 11, Vite 8.3.4, three 0.186.1 (WebGL 2). Model sledovania ruky: zatiaľ
nevybraný (kandidát MediaPipe Tasks Vision HandLandmarker); vyberie sa podľa pohodlia.
Modely a wasm držať lokálne v `public/` — žiadne CDN, aplikácia musí bežať offline.

## Hranice technológií (dohodnuté 31.10.2026)
- Základ = techniky z cvičení: Three.js tak, ako na CV5–11 (scéna, svetlá, tiene, hmla,
  textúry, raycast, GUI). Témy, ktoré ešte neboli, robiť v štýle cvičení.
- Mimo cvičení len: MediaPipe (vyžaduje téma), vlastné shadery (`ShaderMaterial`, GLSL —
  nadväznosť na WebGL cvičenia 2–4), doplnky samotného Three.js (`OrbitControls`, post-processing).
- Nepoužívať: hotové VFX knižnice (efekty ohňa/vody robíme sami), iný engine či obal
  (Babylon, React Three Fiber), TypeScript, CDN. Fyzikálna knižnica — rozhodne sa po CV12.
- Cvičiaci nemá námietky proti AI pri písaní kódu.

## Architektúra (moduly v `src/`)
main (vstup), app (slučka, resize), world/sceneSetup (renderer, kamera, svetlá),
input/hand, input/gestures (state machine), world/terrain, world/groundState (bunkový
automat), fx/fire, fx/water, cast/aim, ui. Kód komentovať podľa pokynov (hlavičky
súborov: autor, dátum, verzia; funkcie: popis vstupov/výstupov).

## Pravidlá
- Vrstvy rozsahu V0–V4 sú v `PROGRES.md`; najprv minimum (V1), až potom ďalšie.
- Vždy zachovať záložný vstup myšou a ochranu pri strate ruky z kadru.
- Výkonnostné presety (rozlíšenie, počet častíc, FPS cieľ ≥ 30) — súčasť návrhu.
- Dokumentáciu písať priebežne popri kóde (`docs/`), nie na konci.
- WebGL výstup Claude nevidí: overovať screenshotmi (Playwright); gestá overuje používateľ
  na vlastnej kamere (alebo nahraté video cez fake webcam v Chromiu).
- Jazyk chatu: ukrajinsky; dokumentácia a komentáre v kóde: slovensky (predpoklad).
