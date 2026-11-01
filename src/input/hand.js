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

// Ako dlho (ms) po poslednom videní ruky ešte držať jej posledné body, kým ju vyhlásime za stratenú.
// Prekryje krátke výpadky detekcie (rozmazanie, okraj záberu) — gestá sa kvôli nim nesmú prerušiť.
const HOLD_MS = 300;

/**
 * Sledovanie ruky v čase: volá model na každý nový snímok videa a drží posledný výsledok.
 * Stavy (this.state):
 *   'tracking' — ruka je v aktuálnom snímku;
 *   'holding'  — ruka práve zmizla, posledné body sa držia ešte HOLD_MS;
 *   'lost'     — ruka nie je (aj na začiatku), landmarks = null.
 * Použitie: tracker.update(čas) v každom snímku vykresľovania, potom čítať state / landmarks.
 */
export class HandTracker {
    /**
     * @param {HandLandmarker}   landmarker  načítaný model (z loadHandLandmarker)
     * @param {HTMLVideoElement} video       prehrávajúce sa video z kamery (zo startCamera)
     */
    constructor(landmarker, video) {
        this.landmarker = landmarker;
        this.video = video;
        this.lastVideoTime = -1; // čas posledného spracovaného snímku videa (s) — len záložný spôsob

        // Nový snímok kamery: prehliadač zavolá callback presne pri každom novom snímku videa.
        // (video.currentTime pri živej kamere plynie stále, nie po snímkach → nedá sa podľa neho.)
        this.newFrame = false;
        this.useFrameCallback = typeof video.requestVideoFrameCallback === 'function';
        if (this.useFrameCallback) {
            const onFrame = () => {
                this.newFrame = true;
                video.requestVideoFrameCallback(onFrame); // callback platí len raz → znova sa prihlásiť
            };
            video.requestVideoFrameCallback(onFrame);
        }
        this.lastSeenMs = -Infinity; // kedy bola ruka naposledy detegovaná (ms)
        this.lastFrameHadHand = false; // bola ruka v naposledy spracovanom snímku?

        // Na meranie výkonu: bežal model v poslednom update() a ako dlho (ms)?
        this.ranDetection = false;
        this.detectDuration = 0;

        this.state = 'lost';
        this.landmarks = null;   // 21 bodov { x, y, z }, x a y v rozsahu 0..1 obrazu kamery

        // „Kosti“ ruky — dvojice indexov bodov { start, end }; na kreslenie (bez importu MediaPipe inde).
        this.connections = HandLandmarker.HAND_CONNECTIONS;
    }

    /** Dá sa ruka použiť (je v zábere alebo len na chvíľu vypadla)? */
    get present() {
        return this.state !== 'lost';
    }

    /**
     * Ak kamera dodala nový snímok, spustí na ňom detekciu; potom podľa času určí stav ruky.
     * Vstup:  timestampMs — čas v ms, ktorý stále rastie (napr. z setAnimationLoop).
     * Výstup: true, ak sa zmenili body alebo stav (treba prekresliť); inak false.
     */
    update(timestampMs) {
        const prevState = this.state;
        let detected = false;

        // Kamera dáva ~30 snímok/s, obrazovka 60+ → ten istý snímok nespracovať dvakrát.
        this.ranDetection = this.useFrameCallback
            ? this.newFrame
            : this.video.currentTime !== this.lastVideoTime; // záloha pre staré prehliadače
        if (this.ranDetection) {
            this.newFrame = false;
            this.lastVideoTime = this.video.currentTime;
            const start = performance.now();
            detected = this.detect(timestampMs);
            this.detectDuration = performance.now() - start;
            this.lastFrameHadHand = detected;
        }

        // Stav sa vyhodnocuje v každom volaní, nielen pri novom snímku:
        // ak kamera prestane posielať snímky (odpojená), ruka aj tak po HOLD_MS „vyprší“.
        // Medzi dvoma snímkami kamery sa riadi posledným spracovaným snímkom (nie „detected“),
        // inak by stav pri 60 Hz obrazovke a 30 Hz kamere blikal tracking ↔ holding.
        const fresh = timestampMs - this.lastSeenMs < HOLD_MS;
        if (this.lastFrameHadHand && fresh) {
            this.state = 'tracking';
        } else if (fresh) {
            this.state = 'holding'; // landmarks ostávajú posledné známe
        } else {
            this.state = 'lost';
            this.landmarks = null;
        }
        return detected || this.state !== prevState;
    }

    /**
     * Spustí model na aktuálnom snímku videa. Chybu modelu zachytí (aplikácia nespadne).
     * Vstup:  timestampMs — čas snímku v ms.
     * Výstup: true, ak bola ruka nájdená (vtedy aktualizuje landmarks a lastSeenMs).
     */
    detect(timestampMs) {
        let result;
        try {
            result = this.landmarker.detectForVideo(this.video, timestampMs);
        } catch (err) {
            console.warn('Detekcia ruky zlyhala:', err);
            return false;
        }
        if (result.landmarks.length === 0) {
            return false;
        }
        this.landmarks = result.landmarks[0]; // numHands = 1 → prvá ruka
        this.lastSeenMs = timestampMs;
        return true;
    }
}
