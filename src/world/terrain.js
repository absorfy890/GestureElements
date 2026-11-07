/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    world/terrain.js — zem (terén)
 * Autor:    Vladyslav Krykun
 * Dátum:    07.11.2026
 * Verzia:   0.2 (V1)
 * Popis:    Vytvorí zem, na ktorú dopadajú živly a na ktorú sa mieri (raycast).
 *           V1: terén z výškovej mapy (obrázok v public/); bez mapy rovná plocha.
 */
import * as THREE from 'three';

// Strana štvorcovej zeme v jednotkách scény. Zhoduje sa s oblasťou tieňovej kamery
// v sceneSetup.js (±20) → tiene sú na celej zemi.
export const GROUND_SIZE = 40;
export const MAX_HEIGHT = 10; // výška najsvetlejšieho pixela (biela = 1) v jednotkách scény

// Farby terénu (vrcholové farby): podľa výšky piesok → tráva → les → skala; strmé svahy = skala.
const SAND = new THREE.Color(0xc8b98a);
const GRASS = new THREE.Color(0x6f9a4a);
const FOREST = new THREE.Color(0x3f6b34);
const ROCK = new THREE.Color(0x8a8378);

// Výšková mapa v public/ (BASE_URL = koreň aplikácie, ako pri modeli ruky).
export const HEIGHTMAP_URL = `${import.meta.env.BASE_URL}terrain/heightmap.png`;

/**
 * Načíta výškovú mapu z obrázka: jas pixela (kanál R) → výška 0..1.
 * Vstup:  url — adresa šedotónového obrázka.
 * Výstup: Promise<{ heightmap, error }>; heightmap = { width, height, heights: Float32Array }
 *         (riadok po riadku, riadok 0 = horný okraj obrázka), pri chybe heightmap = null.
 */
export async function loadHeightmap(url) {
    const image = new Image();
    image.src = url;
    try {
        await image.decode(); // počká, kým sa obrázok stiahne a dekóduje
    } catch {
        return { heightmap: null, error: `Výšková mapa sa nenačítala (${url}).` };
    }
    // Pixely obrázka sa dajú čítať len cez 2D canvas (mimo stránky, nikde sa nezobrazí).
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data; // RGBA, 4 bajty na pixel

    const heights = new Float32Array(image.width * image.height);
    for (let i = 0; i < heights.length; i++) {
        heights[i] = pixels[i * 4] / 255; // šedý obrázok → R = G = B, stačí R
    }
    return { heightmap: { width: image.width, height: image.height, heights }, error: null };
}

/**
 * Vytvorí zem v rovine XZ so stredom v (0, 0, 0): terén z výškovej mapy, bez nej rovnú plochu.
 * Vstup:  heightmap — výsledok loadHeightmap ({ width, height, heights }) alebo null.
 * Výstup: THREE.Mesh (meno 'ground'), vrhá aj prijíma tiene.
 */
export function createGround(heightmap = null) {
    // Jeden vrchol mriežky na pixel mapy → počet políčok = pixely − 1; rovná zem = 1 políčko.
    const segmentsX = heightmap ? heightmap.width - 1 : 1;
    const segmentsZ = heightmap ? heightmap.height - 1 : 1;
    const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, segmentsX, segmentsZ);
    // PlaneGeometry leží v rovine XY → otočiť samotnú geometriu o −90° okolo X: vrcholy sú potom
    // priamo v XZ (y = výška) a mesh netreba otáčať.
    geometry.rotateX(-Math.PI / 2);

    if (heightmap) {
        // Poradie vrcholov = poradie pixelov (riadky od z = −20 po z = +20, v riadku zľava doprava).
        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.setY(i, heightmap.heights[i] * MAX_HEIGHT);
        }
        geometry.computeVertexNormals(); // nové normály podľa svahov → správne osvetlenie
    }
    paintGround(geometry);

    // vertexColors: farba sa berie z atribútu 'color' každého vrcholu (medzi vrcholmi sa prelína).
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    const ground = new THREE.Mesh(geometry, material);
    ground.name = 'ground';
    ground.castShadow = true;    // kopec vrhá tieň na údolie za ním
    ground.receiveShadow = true;
    return ground;
}

/**
 * Vypočíta farbu zeme z výšky a sklonu.
 * Vstup:  height — výška 0..1 (0 = najnižšie, 1 = MAX_HEIGHT), normalY — zložka y normály
 *         (1 = rovina, 0 = zvislá stena), out — THREE.Color, do ktorej sa zapíše výsledok.
 * Výstup: out (pre pohodlie).
 */
function groundColor(height, normalY, out) {
    const { smoothstep } = THREE.MathUtils; // 0 pod dolnou hranicou, 1 nad hornou, medzi plynulo
    out.lerpColors(SAND, GRASS, smoothstep(height, 0.04, 0.12));
    out.lerp(FOREST, smoothstep(height, 0.35, 0.6));
    out.lerp(ROCK, smoothstep(height, 0.75, 0.95));
    out.lerp(ROCK, smoothstep(1 - normalY, 0.12, 0.3)); // strmý svah = holá skala
    return out;
}

/**
 * Zafarbí každý vrchol podľa výšky a sklonu (vytvorí atribút 'color').
 * Vstup:  geometry — geometria zeme s pozíciami a normálami (y = výška). Výstup: žiadny.
 */
function paintGround(geometry) {
    const pos = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    const colors = new Float32Array(pos.count * 3); // r, g, b na vrchol
    const color = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
        groundColor(pos.getY(i) / MAX_HEIGHT, normal.getY(i), color);
        color.toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Vytvorí funkciu, ktorá vráti výšku terénu v ľubovoľnom bode (x, z) — bilineárna interpolácia
 * medzi 4 susednými pixelmi mapy (rovnaké výšky ako vrcholy zeme z createGround).
 * Vstup:  heightmap — výsledok loadHeightmap alebo null (rovná zem).
 * Výstup: funkcia (x, z) → výška y v jednotkách scény; null, ak je bod mimo terénu.
 */
export function createHeightSampler(heightmap) {
    // Rovná zem = mapa 2×2 samých núl → ten istý výpočet, vrátane null mimo terénu.
    const { width, height, heights } = heightmap ?? { width: 2, height: 2, heights: new Float32Array(4) };
    const h = (c, r) => heights[r * width + c]; // pixel (stĺpec, riadok) → hodnota 0..1
    const { lerp } = THREE.MathUtils;           // lerp(a, b, t) = a + (b − a) · t

    return (x, z) => {
        // Svet (−20..+20) → mriežka (0..128); desatinné číslo = poloha medzi pixelmi.
        const col = (x / GROUND_SIZE + 0.5) * (width - 1);
        const row = (z / GROUND_SIZE + 0.5) * (height - 1);
        if (col < 0 || row < 0 || col > width - 1 || row > height - 1) {
            return null;
        }
        // Ľavý horný roh políčka (na pravom/dolnom okraji o jedno menej, aby c0 + 1 existoval)
        // a vzdialenosť od neho 0..1.
        const c0 = Math.min(Math.floor(col), width - 2);
        const r0 = Math.min(Math.floor(row), height - 2);
        const tx = col - c0;
        const tz = row - r0;

        const top = lerp(h(c0, r0), h(c0 + 1, r0), tx);
        const bottom = lerp(h(c0, r0 + 1), h(c0 + 1, r0 + 1), tx);
        return lerp(top, bottom, tz) * MAX_HEIGHT;
    };
}
