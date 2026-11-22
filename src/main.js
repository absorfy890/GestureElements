/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    main.js — vstupný bod aplikácie
 * Autor:    Vladyslav Krykun
 * Dátum:    22.11.2026
 * Verzia:   0.2 (V1)
 * Popis:    Zobrazí okno About, za ním vytvorí aplikáciu v kontajneri #app, spustí vykresľovaciu
 *           slučku a načíta kameru a model ruky; gestá zapne až po zatvorení okna.
 */
import { App } from './app.js';
import { startCamera } from './input/camera.js';
import { loadHandLandmarker, HandTracker } from './input/hand.js';
import { HandPreview } from './ui/handPreview.js';
import { GestureRecognizer } from './input/gestures.js';
import { loadHeightmap, HEIGHTMAP_URL } from './world/terrain.js';
import { AboutDialog } from './ui/about.js';

// Okno About hneď pri štarte; všetko ďalej sa pripravuje za ním.
const about = new AboutDialog(document.body);

// Výšková mapa je malá a lokálna → počkáme na ňu pred vytvorením scény (terén ju potrebuje hneď).
// Pri chybe heightmap = null → rovná zem, aplikácia beží ďalej.
const terrainData = await loadHeightmap(HEIGHTMAP_URL);
if (terrainData.heightmap) {
    console.log(`Výšková mapa OK: ${terrainData.heightmap.width}×${terrainData.heightmap.height}`);
} else {
    console.warn(`${terrainData.error} → rovná zem.`);
}

const app = new App(document.getElementById('app'), terrainData.heightmap);
app.start();

// Kamera a model sa spúšťajú až po scéne: scéna beží aj vtedy, keď zlyhajú (záložný vstup myšou).
// Obe úlohy bežia súčasne (Promise.all) — netreba čakať na jednu, kým začne druhá.
const [camera, hand] = await Promise.all([startCamera(), loadHandLandmarker()]);

if (camera.video) {
    console.log(`Kamera OK: ${camera.video.videoWidth}×${camera.video.videoHeight}`);
} else {
    console.warn(`Kamera nedostupná → myš. ${camera.error}`);
}

if (hand.landmarker) {
    console.log(`HandLandmarker OK (${hand.delegate})`);
} else {
    console.warn(`Model ruky nedostupný → myš. ${hand.error}`);
}

// Stav načítania do okna About.
if (camera.video && hand.landmarker) {
    about.setStatus(`Kamera a model ruky pripravené (${hand.delegate}).`, true);
} else {
    about.setStatus(`${camera.video ? 'Model ruky nedostupný' : 'Kamera nedostupná'} → ovládanie myšou.`, false);
}

// Náhľad kamery stačí mať pri kamere (aj bez modelu je vidno, či kamera beží).
if (camera.video) {
    app.preview = new HandPreview(document.body, camera.video);
}

// Sledovanie ruky len vtedy, keď je kamera aj model; inak app.hand ostane null (myš).
if (camera.video && hand.landmarker) {
    app.hand = new HandTracker(hand.landmarker, camera.video);
    app.handDelegate = hand.delegate;
}

// Sledovanie ruky beží už za oknom About (prvé detekcie sú pomalé — model sa „zahreje“),
// ale gestá až po zatvorení okna, aby ruka nekúzlila, kým používateľ číta.
await about.closed;
if (app.hand) {
    // Rozpoznávač gest pre jednu ruku (V1); pri dvoch rukách by bol na každú ruku jeden.
    app.gestures = new GestureRecognizer('right', camera.video.videoWidth, camera.video.videoHeight);
}

// Prístup z konzoly prehliadača pri ladení (len vo vývojovom režime).
// V produkčnom zostavení je import.meta.env.DEV = false → tento kód aj záznamník vypadnú.
if (import.meta.env.DEV) {
    window.app = app;

    // Záznam príznakov ruky klávesom R (súhrn v konzole) — na určenie prahov gest.
    if (app.hand) {
        const { FeatureRecorder } = await import('./ui/featureRecorder.js');
        app.recorder = new FeatureRecorder();
        window.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                app.recorder.request();
            }
        });
    }
}
