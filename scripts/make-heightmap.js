/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    scripts/make-heightmap.js — generátor výškovej mapy (pomocný nástroj, nie súčasť aplikácie)
 * Autor:    Vladyslav Krykun
 * Dátum:    07.11.2026
 * Verzia:   0.1 (V1)
 * Popis:    Vytvorí public/terrain/heightmap.png — šedotónový PNG 129×129 (svetlé = vysoko).
 *           Spustenie: node scripts/make-heightmap.js. Obrázok sa dá nahradiť aj ručne nakresleným.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

const SIZE = 129;        // pixelov na stranu = 128 políčok terénu + 1 (pixel = vrchol mriežky)
const SEED = 7;          // iné číslo → iný (ale vždy rovnaký) terén
const OCTAVES = 4;       // počet vrstiev šumu: hrubé kopce + jemnejšie nerovnosti
const OUT = 'public/terrain/heightmap.png';

/**
 * Generátor pseudonáhodných čísel so semienkom (mulberry32) — pri rovnakom semienku rovnaké čísla.
 * Vstup: seed — celé číslo. Výstup: funkcia, ktorá vracia číslo 0..1.
 */
function makeRandom(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), a | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Hodnotový šum: náhodné hodnoty v uzloch mriežky cells×cells, medzi nimi plynulý prechod.
 * Vstup: cells — počet políčok na stranu, random — generátor 0..1.
 * Výstup: funkcia (u, v) → 0..1 pre u, v v rozsahu 0..1.
 */
function makeValueNoise(cells, random) {
    const n = cells + 1;
    const grid = Array.from({ length: n * n }, random);
    const smooth = (t) => t * t * (3 - 2 * t); // smoothstep — bez „zlomov“ na hranách políčok
    return (u, v) => {
        const x = u * cells, y = v * cells;
        const x0 = Math.min(Math.floor(x), cells - 1), y0 = Math.min(Math.floor(y), cells - 1);
        const tx = smooth(x - x0), ty = smooth(y - y0);
        const g = (i, j) => grid[(y0 + j) * n + (x0 + i)];
        const top = g(0, 0) + (g(1, 0) - g(0, 0)) * tx;
        const bottom = g(0, 1) + (g(1, 1) - g(0, 1)) * tx;
        return top + (bottom - top) * ty;
    };
}

/**
 * Výšky terénu: súčet oktáv šumu (každá 2× jemnejšia a 2× slabšia), normalizované na 0..1.
 * Vstup: žiadny. Výstup: Float32Array SIZE×SIZE (riadok po riadku, riadok 0 = horný okraj obrázka).
 */
function makeHeights() {
    const random = makeRandom(SEED);
    const octaves = [];
    for (let o = 0; o < OCTAVES; o++) {
        octaves.push({ noise: makeValueNoise(2 << o, random), amp: 1 / (1 << o) });
    }
    const heights = new Float32Array(SIZE * SIZE);
    let min = Infinity, max = -Infinity;
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const u = col / (SIZE - 1), v = row / (SIZE - 1);
            let h = 0;
            for (const { noise, amp } of octaves) h += noise(u, v) * amp;
            heights[row * SIZE + col] = h;
            min = Math.min(min, h);
            max = Math.max(max, h);
        }
    }
    // Normalizácia na 0..1 a mocnina 1,6: údolia plochejšie, vrcholy strmšie.
    return heights.map((h) => ((h - min) / (max - min)) ** 1.6);
}

/**
 * Zapíše šedotónový 8-bitový PNG (bez knižníc: hlavička IHDR, dáta IDAT cez zlib, koniec IEND).
 * Vstup: path — cesta, heights — hodnoty 0..1 (SIZE×SIZE). Výstup: žiadny (súbor na disku).
 */
function writePng(path, heights) {
    const chunk = (type, data) => {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(body));
        return Buffer.concat([len, body, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(SIZE, 0);  // šírka
    ihdr.writeUInt32BE(SIZE, 4);  // výška
    ihdr[8] = 8;                  // 8 bitov na pixel
    ihdr[9] = 0;                  // typ farby 0 = odtiene šedej
    // Každý riadok začína bajtom filtra (0 = bez filtra), potom SIZE bajtov jasu.
    const raw = Buffer.alloc(SIZE * (SIZE + 1));
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            raw[row * (SIZE + 1) + 1 + col] = Math.round(heights[row * SIZE + col] * 255);
        }
    }
    const png = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // podpis PNG
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
    mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
    writeFileSync(path, png);
}

writePng(OUT, makeHeights());
console.log(`Výšková mapa: ${OUT} (${SIZE}×${SIZE})`);
