# PROGRES — PG semestrálne zadanie

## Stav (31.10.2026)
V0 krok 1 hotový: Vite + Three.js, prázdna scéna (kamera, HemisphereLight + DirectionalLight
s tieňmi, OrbitControls, pomocná mriežka), `package-lock.json` → funguje `npm ci`.
Ďalej: model ruky z lokálnych súborov (krok 2).

## Rozsah (minimum → ideál)
- **V0 — spike:** kamera + hand tracking, 21 bodov na obrazovke; rovná zem v Three.js. Poistka.
- **V1 — minimum:** terén (statická heightmap); jedna ruka; oheň a voda; cast (štart → náhľad
  → potvrdenie/zrušenie); terén reaguje (horí, mokne, voda hasí); záložný vstup myšou;
  About; dokumentácia; zip.
- **V2 — deformácia terénu:** vlny/krátery, šírenie ohňa, stekanie vody.
- **V3 — varianty a druhá ruka:** prúd vs. guľa vody, kus vs. stena kameňa; zem a vzduch;
  druhá ruka; kombá; pohyb klávesnicou.
- **V4 — vízia:** deformovateľný terén ako vo Valheime, horiace stromy/tráva, fyzika častíc.
Rozhodnutie: pohyb po scéne v minime nie je (pevná kamera / OrbitControls myšou).

## Plán týždňa 27.10–2.11 (V0)
1. ~~`npm ci`, prázdna Three.js scéna na Vite (kostra z cvičenia 5).~~ (31.10.)
2. Výber a pripojenie modelu sledovania ruky (lokálne súbory), body ruky na obrazovke.
3. Prvý návrh gest (štart / potvrdiť / zrušiť) z landmarkov, výpis stavu.
4. Rovná zem + kurzor ruky ako raycast na zem.
5. Založiť kostru dokumentácie (`docs/`).

## Otvorené otázky na cvičiaceho
Termín ukážky/skúšky; kam odovzdať (GIT?) a limit veľkosti; či stačí Three.js + Vite;
či zápis témy v tabuľke môže dostať drobné spresnenia.

## Poznámky
- three 0.186: `THREE.Clock` je zastaraný → `THREE.Timer`; `PCFSoftShadowMap` odstránený →
  `PCFShadowMap` (inak varovania v konzole).
- `npm run build` hlási veľký chunk (three) — len upozornenie, nie chyba.

## Denník
- 27.10.2026 — založený repozitár, `CLAUDE.md`, `PROGRES.md`; rozsah V0–V4 dohodnutý.
- 31.10.2026 — hranice technológií (CLAUDE.md); V0/1: prázdna scéna, `npm ci` funguje,
  konzola bez chýb (overené screenshotom v Chromiu).
