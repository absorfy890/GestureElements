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
