/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    world/groundView.js — zobrazenie stavu zeme na teréne
 * Autor:    Vladyslav Krykun
 * Dátum:    21.11.2026
 * Verzia:   0.1 (V1)
 * Popis:    Prenáša GroundState na terén: spálenina zafarbí vrcholy k uhliu, vlhkosť ich stmaví
 *           (mokrá zem je tmavšia), teplo svieti cez emissiveMap (žiari aj v tieni).
 *           Bunka i = vrchol i terénu.
 */
import * as THREE from 'three';

const WET_DARKEN = 0.55;     // o koľko stmavne úplne mokrá zem (0..1); 0,45 bolo na tmavom lese málo vidno
const HEAT_INTENSITY = 1.5;  // sila žiarenia rozpálenej zeme
const CHAR = [0.06, 0.05, 0.045]; // farba spáleniny (uhoľ, lineárne RGB ako atribút color)
const CHAR_MAX = 0.9;             // úplne spálená bunka: 90 % uhoľ, 10 % pôvodnej farby

/**
 * Farba žiarenia podľa tepla: tmavočervená → oranžová → žltkastá; zapíše RGBA (0..255) do poľa.
 * Vstup: h — teplo 0..1, out — Uint8Array pixelov, p — index prvého bajtu pixela. Výstup: žiadny.
 * (Bez vytvárania poľa pre každý pixel — 16 641 pixelov v každom snímku.)
 */
function writeHeatColor(h, out, p) {
    const { smoothstep } = THREE.MathUtils; // smoothstep(x, min, max)
    out[p] = smoothstep(h, 0.05, 0.5) * 255;
    out[p + 1] = smoothstep(h, 0.35, 0.9) * 0.55 * 255;
    out[p + 2] = smoothstep(h, 0.8, 1.0) * 0.2 * 255;
    out[p + 3] = 255;
}

export class GroundView {
    /**
     * @param {THREE.Mesh}  ground  terén (createGround) — vrcholy v rovnakom poradí ako bunky stavu
     * @param {GroundState} state   stav zeme (rovnaký počet buniek ako vrcholov)
     */
    constructor(ground, state) {
        this.state = state;
        this.colors = ground.geometry.attributes.color;
        this.baseColors = this.colors.array.slice(); // pôvodné farby (výška, sklon) — stav sa počíta od nich

        // Teplo → textúra bunka = pixel; mapuje sa cez UV terénu (PlaneGeometry: u = stĺpec, v = 1 − riadok).
        const { width, height } = state;
        this.heatPixels = new Uint8Array(width * height * 4); // RGBA
        this.heatTexture = new THREE.DataTexture(this.heatPixels, width, height);
        this.heatTexture.colorSpace = THREE.SRGBColorSpace;
        // Lineárne filtrovanie: medzi bunkami plynulý prechod (DataTexture má predvolene Nearest = štvorčeky).
        this.heatTexture.magFilter = THREE.LinearFilter;
        this.heatTexture.minFilter = THREE.LinearFilter;
        this.heatTexture.generateMipmaps = false;

        const material = ground.material;
        material.emissive = new THREE.Color(0xffffff); // farbu žiarenia určí textúra
        material.emissiveMap = this.heatTexture;
        material.emissiveIntensity = HEAT_INTENSITY;
        material.needsUpdate = true; // nová textúra → shader sa musí znova zostaviť
    }

    /** Prenesie aktuálny stav na terén (volá sa v každom snímku). Vstup/výstup: žiadny. */
    update() {
        const { width, height, heat, moisture, burnt } = this.state;
        const colors = this.colors.array;
        const base = this.baseColors;
        const px = this.heatPixels;

        for (let row = 0; row < height; row++) {
            // Riadok 0 terénu je pri z = −20 a má v = 1; riadok 0 textúry je v = 0 → otočiť.
            const texRow = height - 1 - row;
            for (let col = 0; col < width; col++) {
                const i = row * width + col;

                // Spálenina: prechod k uhliu; potom vlhkosť stmaví výsledok.
                const c = CHAR_MAX * burnt[i];
                const k = 1 - WET_DARKEN * moisture[i];
                for (let ch = 0; ch < 3; ch++) {
                    colors[i * 3 + ch] = (base[i * 3 + ch] + (CHAR[ch] - base[i * 3 + ch]) * c) * k;
                }

                writeHeatColor(heat[i], px, (texRow * width + col) * 4);
            }
        }
        this.colors.needsUpdate = true;
        this.heatTexture.needsUpdate = true;
    }
}
