/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    input/handFeatures.js — príznaky pohybu ruky
 * Autor:    Vladyslav Krykun
 * Dátum:    02.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Z 21 bodov jednej ruky (MediaPipe) počíta čísla, z ktorých sa rozpoznávajú gestá:
 *           veľkosť a stred dlane, otvorenosť ruky, hĺbku, rýchlosť, smer dlane.
 *           Funkcie pracujú vždy s jednou rukou → pri dvoch rukách sa volajú dvakrát.
 *           Nezávisí od Three.js ani od MediaPipe.
 */

// Indexy bodov ruky (číslovanie MediaPipe HandLandmarker).
export const WRIST = 0;
export const THUMB_TIP = 4;
export const INDEX_MCP = 5;  // MCP = kĺb pri dlani (základ prsta)
export const MIDDLE_MCP = 9;
export const PINKY_MCP = 17;

export const INDEX_TIP = 8;
export const MIDDLE_TIP = 12;
export const RING_TIP = 16;
export const PINKY_TIP = 20;
const FINGER_TIPS = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]; // 4 prsty bez palca

// Pomer vzdialenosti zápästie → špička prsta k veľkosti dlane (podľa meraní 3b, 02.11.2026:
// pri 1,8 dávala vystretá dlaň len ~0,9 → OPEN znížené na 1,7; päsť dávala 0,00–0,03).
const RATIO_CLOSED = 1.0; // zohnutý prst (päsť)
const RATIO_OPEN = 1.7;   // vystretý prst

/**
 * Prevedie bod z MediaPipe do pixelov obrazu kamery.
 * x a y z MediaPipe sú normované zvlášť (x na šírku, y na výšku obrazu) → bez prevodu
 * by vzdialenosti v smere x a y neboli porovnateľné (640 × 480 nie je štvorec).
 * z má podľa MediaPipe približne rovnakú mierku ako x → násobí sa šírkou.
 * Vstup:  p — bod { x, y, z } z MediaPipe; width, height — rozmery videa v px.
 * Výstup: { x, y, z } v px.
 */
export function toPixels(p, width, height) {
    return { x: p.x * width, y: p.y * height, z: p.z * width };
}

/**
 * Vzdialenosť dvoch bodov v priestore (3D).
 * Vstup:  a, b — body { x, y, z } (v px, z toPixels).
 * Výstup: vzdialenosť (číslo ≥ 0).
 */
export function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Veľkosť dlane = vzdialenosť zápästie → základ prostredníka (v 3D).
 * Nemení sa, keď sa ohýbajú prsty → slúži ako „pravítko“: ostatné vzdialenosti sa ňou delia,
 * takže príznaky nezávisia od toho, ako ďaleko je ruka od kamery.
 * Zároveň meria hĺbku: ruka bližšie ku kamere → dlaň väčšia.
 * Vstup:  pts — 21 bodov v px (z toPixels).
 * Výstup: veľkosť dlane v px.
 */
export function palmSize(pts) {
    return distance(pts[WRIST], pts[MIDDLE_MCP]);
}

/**
 * Stred dlane = priemer zápästia a základov ukazováka, prostredníka a malíčka.
 * Prsty do stredu nevstupujú → pohyb prstov (štipka, päsť) neposúva miesto, kam sa mieri.
 * Vstup:  pts — 21 bodov v px (z toPixels).
 * Výstup: { x, y, z } v px.
 */
export function palmCenter(pts) {
    const ids = [WRIST, INDEX_MCP, MIDDLE_MCP, PINKY_MCP];
    const c = { x: 0, y: 0, z: 0 };
    for (const i of ids) {
        c.x += pts[i].x;
        c.y += pts[i].y;
        c.z += pts[i].z;
    }
    c.x /= ids.length;
    c.y /= ids.length;
    c.z /= ids.length;
    return c;
}

/**
 * Otvorenosť ruky: 0 = päsť, 1 = vystretá dlaň, medzi tým plynulo.
 * Pre každý zo 4 prstov (bez palca) sa vzdialenosť zápästie → špička vydelí veľkosťou dlane
 * a lineárne prevedie z rozsahu RATIO_CLOSED..RATIO_OPEN na 0..1 (orezané);
 * výsledok je priemer prstov. Plynulé číslo (nie áno/nie) → gestá môžu sledovať aj
 * priebeh otvárania (napr. päsť sa prudko otvorí pri údere ohňa).
 * Vstup:  pts — 21 bodov v px (z toPixels).
 * Výstup: číslo 0..1.
 */
export function openness(pts) {
    const palm = palmSize(pts);
    let sum = 0;
    for (const i of FINGER_TIPS) {
        const d = distance(pts[WRIST], pts[i]);
        const ratio = d / palm;
        const t = (ratio - RATIO_CLOSED) / (RATIO_OPEN - RATIO_CLOSED);
        sum += Math.min(1, Math.max(0, t));
    }
    return sum / FINGER_TIPS.length;
}

/**
 * Vektorový súčin a × b — vektor kolmý na a aj b (pravidlo pravej ruky).
 * Vstup:  a, b — vektory { x, y, z }.
 * Výstup: { x, y, z }.
 */
function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}

/**
 * Normála dlane = jednotkový vektor, ktorý trčí z vnútornej strany dlane.
 * Dlaň je rovina cez zápästie, základ ukazováka a základ malíčka; normála je vektorový súčin
 * (základ ukazováka − zápästie) × (základ malíčka − zápästie), ako normála trojuholníka vo WebGL.
 * Ľavá ruka je zrkadlová k pravej → rovnaký súčin by mieril na chrbát ruky → pre ľavú sa otočí.
 * Súradnice: x doprava, y dole (ako v obraze), z menšie = bližšie ku kamere (MediaPipe).
 * Vstup:  pts  — 21 bodov v px (z toPixels);
 *         hand — 'right' | 'left' (skutočná ruka používateľa; V1 len jedna ruka → 'right').
 * Výstup: { x, y, z } dĺžky 1, napr. dlaň ku kamere → z ≈ −1, dlaň k zemi → y ≈ +1.
 */
export function palmNormal(pts, hand = 'right') {
    const w = pts[WRIST];
    const toIndex = { x: pts[INDEX_MCP].x - w.x, y: pts[INDEX_MCP].y - w.y, z: pts[INDEX_MCP].z - w.z };
    const toPinky = { x: pts[PINKY_MCP].x - w.x, y: pts[PINKY_MCP].y - w.y, z: pts[PINKY_MCP].z - w.z };
    const n = cross(toIndex, toPinky);

    const sign = hand === 'left' ? -1 : 1;
    const len = Math.hypot(n.x, n.y, n.z) || 1; // || 1 → bez delenia nulou pri zdegenerovanej dlani
    return { x: sign * n.x / len, y: sign * n.y / len, z: sign * n.z / len };
}

/**
 * Všetky príznaky jedného snímku naraz (to, čo sa dá zistiť bez histórie).
 * Vstup:  landmarks — 21 bodov z MediaPipe (0..1); width, height — rozmery videa v px;
 *         hand — 'right' | 'left'.
 * Výstup: { center, size, openness, normal } — význam pri palmCenter, palmSize, openness, palmNormal.
 */
export function snapshotFeatures(landmarks, width, height, hand = 'right') {
    const pts = landmarks.map((p) => toPixels(p, width, height));
    return {
        center: palmCenter(pts),
        size: palmSize(pts),
        openness: openness(pts),
        normal: palmNormal(pts, hand),
    };
}

// Ako dlho (ms) sa pamätá história pohybu (na krúženie a pod. stačí ~1 s).
const HISTORY_MS = 1000;
// Z akého úseku (ms) sa počíta rýchlosť. Kamera dáva ~16 snímok/s (≈ 60 ms medzi snímkami)
// → 150 ms = 2–3 snímky: dosť na potlačenie šumu bodov, ešte dosť krátko na prudký úder.
const VELOCITY_MS = 150;

/**
 * Pohyb jednej ruky v čase: pamätá si stred a veľkosť dlane z posledných snímok
 * a počíta z nich rýchlosť. Inštancia na ruku (pri dvoch rukách dve inštancie).
 * Snímky kamery neprichádzajú pravidelne → všetko sa počíta podľa skutočného času snímku,
 * nie „na snímok“.
 * Použitie: pri každom novom snímku s rukou push(...), pri strate ruky reset().
 */
export class HandMotion {
    constructor() {
        this.samples = []; // { t, center, size } od najstaršej po najnovšiu
    }

    /**
     * Pridá meranie z nového snímku a zahodí merania staršie ako HISTORY_MS.
     * Vstup:  timeMs — čas snímku v ms; center — stred dlane v px (palmCenter);
     *         size — veľkosť dlane v px (palmSize).
     * Výstup: žiadny.
     */
    push(timeMs, center, size) {
        this.samples.push({ t: timeMs, center, size });
        while (timeMs - this.samples[0].t > HISTORY_MS) {
            this.samples.shift();
        }
    }

    /** Zabudne históriu (ruka sa stratila — po návrate nesmie vzniknúť „skok“). */
    reset() {
        this.samples.length = 0;
    }

    /**
     * Dvojica meraní na výpočet rýchlosti: najnovšie a najstaršie v úseku VELOCITY_MS.
     * Výstup: { a, b, dt } (a staršie, b novšie, dt v sekundách), alebo null, ak sú menej ako 2 merania.
     */
    velocitySpan() {
        const n = this.samples.length;
        if (n < 2) {
            return null;
        }
        const b = this.samples[n - 1];
        let a = this.samples[n - 2]; // aspoň predošlé meranie, aj keď je staršie ako VELOCITY_MS
        for (let i = n - 3; i >= 0 && b.t - this.samples[i].t <= VELOCITY_MS; i--) {
            a = this.samples[i];
        }
        return { a, b, dt: (b.t - a.t) / 1000 };
    }

    /**
     * Rýchlosť stredu dlane v obraze, v „dlaniach za sekundu“ (posun v px / veľkosť dlane).
     * Delenie veľkosťou dlane → rovnaký pohyb dá rovnaké číslo pri ruke blízko aj ďaleko od kamery.
     * Výstup: { x, y, speed } — x doprava, y dole (v obraze kamery); speed = dĺžka; bez histórie nuly.
     */
    get velocity() {
        const span = this.velocitySpan();
        if (!span || span.dt <= 0) {
            return { x: 0, y: 0, speed: 0 };
        }
        const { a, b, dt } = span;
        const palm = (a.size + b.size) / 2;
        const x = (b.center.x - a.center.x) / palm / dt;
        const y = (b.center.y - a.center.y) / palm / dt;
        return { x, y, speed: Math.hypot(x, y) };
    }

    /**
     * Rýchlosť v hĺbke = ako rýchlo dlaň rastie (> 0, ruka ide ku kamere) alebo sa zmenšuje
     * (< 0, ruka ide od kamery). Logaritmus pomeru → priblíženie aj vzdialenie dávajú
     * rovnako veľké čísla (2× väčšia aj 2× menšia za 1 s = ±0,69).
     * Výstup: číslo za sekundu; bez histórie 0.
     */
    get depthRate() {
        const span = this.velocitySpan();
        if (!span || span.dt <= 0) {
            return 0;
        }
        return Math.log(span.b.size / span.a.size) / span.dt;
    }
}
