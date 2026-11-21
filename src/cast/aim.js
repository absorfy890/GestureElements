/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    cast/aim.js — mierenie (balistika)
 * Autor:    Vladyslav Krykun
 * Dátum:    14.11.2026
 * Verzia:   0.3 (V1)
 * Popis:    Z bodu mierenia (aim 0..1) vypočíta hod kúzla, jeho parabolickú dráhu a dopad na terén;
 *           kurzor na zemi ukazuje miesto dopadu. Pozná len zámer, nie ruku ani myš → oba vstupy
 *           používajú ten istý kód.
 */
import * as THREE from 'three';

const CURSOR_RADIUS = 0.3;   // vonkajší polomer krúžku (jednotky scény)
const CURSOR_LIFT = 0.1;    // odsadenie od zeme pozdĺž normály — inak z-fighting a zanáranie do svahu
const UP = new THREE.Vector3(0, 1, 0);

const TRAJECTORY_STEP = 0.02;     // krok času pri hľadaní dopadu (s)
const TRAJECTORY_MAX_TIME = 4;    // dlhší let sa nehľadá (s) → bez dopadu
const IMPACT_REFINE_STEPS = 8;    // delení intervalu na polovicu pri spresnení dopadu (krok / 2^8)

// Kotva ruky: kúzlo vzniká v pevnom bode vpravo dole pred kamerou (pravá ruka), v súradniciach
// kamery (x vpravo, y hore, −z dopredu). Hýbe sa s kamerou, nie s mierením → dráhu vidno trochu
// zboku. Neskôr tu bude model ruky.
const HAND_ANCHOR = new THREE.Vector3(0.6, -0.6, -1.5);
// Uhol hodu od vodorovnej roviny: ruka „do neba“ nesmie hodiť kúzlo pod seba, rovno dole nemá smer.
const MAX_ELEVATION = THREE.MathUtils.degToRad(60);
const MIN_ELEVATION = THREE.MathUtils.degToRad(-80);
// Balistika podľa živlu (intent.element): rýchlosť hodu (jednotky/s), gravitácia (jednotky/s²).
const BALLISTICS = {
    fire: { speed: 18, gravity: 9.8 },
};

/**
 * Prevedie bod mierenia na NDC (normalizované súradnice zariadenia) pre Raycaster.
 * Vstup:  aim — { x, y } v rozsahu 0..1 (y dole).
 * Výstup: THREE.Vector2 v rozsahu −1..+1 (y hore).
 */
export function aimToNdc(aim) {
    return new THREE.Vector2(aim.x * 2 - 1, -(aim.y * 2 - 1));
}

/**
 * Parametre hodu z bodu mierenia: smer = lúč z kamery cez aim (uhol obmedzený), štart = kotva ruky
 * (HAND_ANCHOR), rýchlosť a gravitácia podľa živlu.
 * Vstup:  aim — { x, y } v rozsahu 0..1 (y dole), camera — THREE.PerspectiveCamera,
 *         element — živel ('fire'), určuje rýchlosť a gravitáciu.
 * Výstup: { start, velocity, gravity } — vstup pre computeTrajectory.
 */
export function launchFromAim(aim, camera, element = 'fire') {
    const { speed, gravity } = BALLISTICS[element];

    // Smer lúča: bod obrazovky (NDC, z = 0.5 = niekde v hĺbke) → svet, mínus poloha kamery.
    const ndc = aimToNdc(aim);
    const dir = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
    const start = camera.localToWorld(HAND_ANCHOR.clone()); // súradnice kamery → svet

    // Obmedziť uhol nad/pod vodorovnou rovinou; strana hodu (vodorovný smer) ostáva.
    const elevation = THREE.MathUtils.clamp(Math.asin(dir.y), MIN_ELEVATION, MAX_ELEVATION);
    const horizontal = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    const velocity = horizontal.multiplyScalar(Math.cos(elevation) * speed);
    velocity.y = Math.sin(elevation) * speed;

    return { start, velocity, gravity };
}

/**
 * Balistická dráha kúzla: p(t) = start + velocity·t + ½·(0, −gravity, 0)·t²; dopad = prvé miesto,
 * kde dráha klesne pod terén (kopec v ceste ju zastaví).
 * Vstup:  start — THREE.Vector3 začiatok letu, velocity — THREE.Vector3 počiatočná rýchlosť (jednotky/s),
 *         gravity — zrýchlenie nadol (jednotky/s², kladné číslo),
 *         heightAt — funkcia (x, z) → výška terénu alebo null mimo terénu (createHeightSampler).
 * Výstup: { points, impact } — points = pole THREE.Vector3 pozdĺž dráhy (posledný = dopad, ak je),
 *         impact = THREE.Vector3 miesto dopadu; null, ak kúzlo vyletí z terénu alebo letí dlhšie ako
 *         TRAJECTORY_MAX_TIME.
 */
export function computeTrajectory(start, velocity, gravity, heightAt) {
    const at = (t) => new THREE.Vector3(
        start.x + velocity.x * t,
        start.y + velocity.y * t - 0.5 * gravity * t * t,
        start.z + velocity.z * t,
    );
    // Výška nad terénom; null mimo terénu.
    const clearance = (p) => {
        const ground = heightAt(p.x, p.z);
        return ground === null ? null : p.y - ground;
    };

    const points = [start.clone()];
    for (let t = TRAJECTORY_STEP; t <= TRAJECTORY_MAX_TIME; t += TRAJECTORY_STEP) {
        const p = at(t);
        const c = clearance(p);
        if (c === null) {
            return { points, impact: null }; // vyletelo z terénu
        }
        if (c <= 0) {
            // Dopad je medzi t − krok (nad zemou) a t (pod zemou) → spresniť delením na polovicu.
            // V rovine XZ je dráha priamka → stred intervalu leží tiež nad terénom (clearance ≠ null).
            let above = t - TRAJECTORY_STEP;
            let below = t;
            for (let i = 0; i < IMPACT_REFINE_STEPS; i++) {
                const mid = (above + below) / 2;
                if (clearance(at(mid)) > 0) {
                    above = mid;
                } else {
                    below = mid;
                }
            }
            const impact = at(below);
            impact.y = heightAt(impact.x, impact.z); // presne na povrch
            points.push(impact);
            return { points, impact };
        }
        points.push(p);
    }
    return { points, impact: null }; // letí príliš dlho
}

/** Krúžok na zemi, ktorý ukazuje miesto dopadu kúzla. */
export class AimCursor {
    /** @param {THREE.Scene} scene  scéna, do ktorej sa kurzor pridá */
    constructor(scene) {
        const geometry = new THREE.RingGeometry(CURSOR_RADIUS * 0.7, CURSOR_RADIUS, 32);
        geometry.rotateX(-Math.PI / 2); // RingGeometry leží v XY → položiť do XZ (lícom hore, +Y), ako zem
        // MeshBasicMaterial nereaguje na svetlo → kurzor je rovnako jasný v tieni aj na slnku.
        const material = new THREE.MeshBasicMaterial({ color: 0xff7020, transparent: true, opacity: 0.9 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = 'aimCursor';
        this.mesh.visible = false; // kým sa nemieri, kurzor nie je vidno
        scene.add(this.mesh);
    }

    /**
     * Presunie kurzor na bod zeme, natočí ho podľa svahu a zobrazí ho.
     * Vstup:  point — THREE.Vector3 na zemi (napr. miesto dopadu),
     *         normal — jednotkový THREE.Vector3 kolmý na zem v tom bode (predvolene hore).
     * Výstup: žiadny.
     */
    moveTo(point, normal = UP) {
        // Otočenie, ktoré prevedie „hore“ (+Y) na normálu → krúžok leží rovnobežne so svahom.
        this.mesh.quaternion.setFromUnitVectors(UP, normal);
        // Odsadiť pozdĺž normály (nie len v y): na strmom svahu by posun hore krúžok nevzdialil od zeme.
        this.mesh.position.copy(point).addScaledVector(normal, CURSOR_LIFT);
        this.mesh.visible = true;
    }

    /** Skryje kurzor (nemieri sa). Vstup/výstup: žiadny. */
    hide() {
        this.mesh.visible = false;
    }
}

/** Náhľad dráhy kúzla: čiara cez body z computeTrajectory. */
export class TrajectoryLine {
    /** @param {THREE.Scene} scene  scéna, do ktorej sa čiara pridá */
    constructor(scene) {
        // Buffer na najdlhšiu dráhu sa vytvorí raz; v každom snímku sa len prepíšu súradnice
        // a nastaví, koľko bodov kresliť (nová geometria v každom snímku = zbytočná práca a odpad).
        const maxPoints = Math.ceil(TRAJECTORY_MAX_TIME / TRAJECTORY_STEP) + 2;
        this.positions = new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3);
        this.positions.setUsage(THREE.DynamicDrawUsage); // nápoveda pre GPU: údaje sa často menia
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', this.positions);
        const material = new THREE.LineBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.85 });
        this.line = new THREE.Line(geometry, material);
        this.line.name = 'trajectory';
        this.line.frustumCulled = false; // obálka geometrie sa neprepočítava → inak by čiara mohla zmiznúť
        this.line.visible = false;
        scene.add(this.line);
    }

    /**
     * Zobrazí dráhu.
     * Vstup:  points — pole THREE.Vector3 (computeTrajectory().points). Výstup: žiadny.
     */
    show(points) {
        points.forEach((p, i) => this.positions.setXYZ(i, p.x, p.y, p.z));
        this.positions.needsUpdate = true; // poslať zmenené súradnice na GPU
        this.line.geometry.setDrawRange(0, points.length);
        this.line.visible = true;
    }

    /** Skryje dráhu. Vstup/výstup: žiadny. */
    hide() {
        this.line.visible = false;
    }
}
