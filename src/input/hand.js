/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    input/hand.js — sledovanie ruky (MediaPipe HandLandmarker)
 * Autor:    Vladyslav Krykun
 * Dátum:    01.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Načíta model sledovania ruky z lokálnych súborov (public/mediapipe/).
 *           Nezávisí od Three.js — vracia len údaje o ruke.
 */
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Cesty k lokálnym súborom (BASE_URL = koreň aplikácie, aby fungoval aj build v podpriečinku).
const WASM_PATH = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const MODEL_PATH = `${import.meta.env.BASE_URL}mediapipe/hand_landmarker.task`;

/**
 * Načíta model HandLandmarker v režime VIDEO pre jednu ruku.
 * Najprv skúsi výpočet na GPU (rýchlejší); ak zlyhá, použije CPU.
 * Vstup:  žiadny.
 * Výstup: Promise<{ landmarker: HandLandmarker|null, delegate: 'GPU'|'CPU'|null, error: string|null }>
 */
export async function loadHandLandmarker() {
    let fileset;
    try {
        fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    } catch (err) {
        return { landmarker: null, delegate: null, error: `Wasm MediaPipe sa nenačítal (${err.message}).` };
    }

    for (const delegate of ['GPU', 'CPU']) {
        try {
            const landmarker = await HandLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_PATH, delegate },
                runningMode: 'VIDEO', // snímky idú za sebou → model sleduje ruku medzi snímkami
                numHands: 1,          // V1: jedna ruka (druhá až vo V3)
            });
            return { landmarker, delegate, error: null };
        } catch (err) {
            console.warn(`HandLandmarker (${delegate}) zlyhal:`, err);
        }
    }
    return { landmarker: null, delegate: null, error: 'Model ruky sa nepodarilo načítať.' };
}

/**
 * Sledovanie ruky v čase: volá model na každý nový snímok videa a drží posledný výsledok.
 * Použitie: tracker.update(čas) v každom snímku vykresľovania, potom čítať present / landmarks.
 */
export class HandTracker {
    /**
     * @param {HandLandmarker}   landmarker  načítaný model (z loadHandLandmarker)
     * @param {HTMLVideoElement} video       prehrávajúce sa video z kamery (zo startCamera)
     */
    constructor(landmarker, video) {
        this.landmarker = landmarker;
        this.video = video;
        this.lastVideoTime = -1; // čas posledného spracovaného snímku videa (s)

        this.present = false;    // je ruka v zábere?
        this.landmarks = null;   // 21 bodov { x, y, z }, x a y v rozsahu 0..1 obrazu kamery
    }

    /**
     * Ak kamera dodala nový snímok, spustí na ňom detekciu a aktualizuje present / landmarks.
     * Vstup:  timestampMs — čas v ms, ktorý stále rastie (napr. z setAnimationLoop).
     * Výstup: true, ak prebehla nová detekcia; false, ak sa snímok nezmenil.
     */
    update(timestampMs) {
        // Kamera dáva ~30 snímok/s, obrazovka 60+ → ten istý snímok nespracovať dvakrát.
        if (this.video.currentTime === this.lastVideoTime) {
            return false;
        }
        this.lastVideoTime = this.video.currentTime;

        const result = this.landmarker.detectForVideo(this.video, timestampMs);
        this.present = result.landmarks.length > 0;
        this.landmarks = this.present ? result.landmarks[0] : null; // numHands = 1 → prvá ruka
        return true;
    }
}
