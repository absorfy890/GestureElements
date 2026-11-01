/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    main.js — vstupný bod aplikácie
 * Autor:    Vladyslav Krykun
 * Dátum:    31.10.2026
 * Verzia:   0.1 (V0)
 * Popis:    Vytvorí aplikáciu v kontajneri #app a spustí vykresľovaciu slučku.
 */
import { App } from './app.js';
import { startCamera } from './input/camera.js';
import { loadHandLandmarker, HandTracker } from './input/hand.js';
import { HandPreview } from './ui/handPreview.js';

const app = new App(document.getElementById('app'));
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

// Náhľad kamery stačí mať pri kamere (aj bez modelu je vidno, či kamera beží).
if (camera.video) {
    app.preview = new HandPreview(document.body, camera.video);
}

// Sledovanie ruky len vtedy, keď je kamera aj model; inak app.hand ostane null (myš).
if (camera.video && hand.landmarker) {
    app.hand = new HandTracker(hand.landmarker, camera.video);
}

// Prístup z konzoly prehliadača pri ladení (len vo vývojovom režime).
if (import.meta.env.DEV) {
    window.app = app;
}
