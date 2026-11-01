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

const app = new App(document.getElementById('app'));
app.start();

// Kamera sa spúšťa až po scéne: scéna beží aj vtedy, keď kamera zlyhá (záložný vstup myšou).
const { video, error } = await startCamera();
if (video) {
    console.log(`Kamera OK: ${video.videoWidth}×${video.videoHeight}`);
} else {
    console.warn(`Kamera nedostupná → myš. ${error}`);
}

// Prístup z konzoly prehliadača pri ladení (len vo vývojovom režime).
if (import.meta.env.DEV) {
    window.app = app;
}
