/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    fx/fire.js — efekt ohňa
 * Autor:    Vladyslav Krykun
 * Dátum:    22.11.2026
 * Verzia:   0.1 (V1)
 * Popis:    Oheň z častíc (ParticleSystem) s vlastným shaderom: mäkké svietiace body, farba podľa
 *           veku (biela → žltá → oranžová → červená → zhasne), aditívne miešanie.
 *           Oheň v ruke počas zberu a mierenia, ohnivá guľa za letu, záblesk pri dopade,
 *           plamene na horiacej zemi.
 */
import * as THREE from 'three';
import { ParticleSystem } from './particles.js';

const CAPACITY = 3000;  // najviac častíc ohňa naraz (neskôr podľa výkonového presetu)

// Oheň v ruke: počet častíc za sekundu a veľkosť rastú so silou (intent.power 0..1).
const HAND_RATE = { min: 30, max: 160 };   // častíc/s
const HAND_SIZE = { min: 0.05, max: 0.12 }; // jednotky scény (ruka je 1,5 pred kamerou)
const HAND_RADIUS = 0.05;                   // rozptyl miesta vzniku okolo kotvy

// Ohnivá guľa za letu: hustý zhluk krátko žijúcich častíc v mieste gule; staršie zaostávajú → chvost.
const BALL_RATE = 240;    // častíc/s
const BALL_SIZE = 0.45;   // pri sile 1
const BALL_RADIUS = 0.12;

// Záblesk pri dopade: výbuch častíc + krátke bodové svetlo.
const BURST_COUNT = 90;
const BURST_SPEED = { min: 2, max: 6 };     // jednotky/s
const BURST_SIZE = 0.6;
const FLASH_INTENSITY = 120;                // PointLight (fyzikálne jednotky three.js — kandela)
const FLASH_MS = 400;                       // ako dlho svetlo zhasína

// Plamene na horiacej zemi: počet častíc za sekundu podľa počtu horiacich buniek, so stropom
// (veľký požiar nesmie zhodiť FPS — strop neskôr podľa výkonového presetu).
const GROUND_RATE_PER_CELL = 4;   // častíc/s na horiacu bunku
const GROUND_RATE_MAX = 600;      // častíc/s spolu
const GROUND_SIZE = { min: 0.3, max: 0.6 };
const GROUND_JITTER = 0.15;       // rozptyl v rámci bunky (bunka ≈ 0,31 jednotky)

const vertexShader = /* glsl */ `
    attribute float aSize;   // veľkosť častice (jednotky scény)
    attribute float aLife;   // 0 = práve vznikla, 1 = mŕtva
    uniform float uPixelScale;
    varying float vLife;

    void main() {
        vLife = aLife;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        // Plameň počas života trochu narastie; mŕtva častica má veľkosť 0 (nekreslí sa).
        float grow = mix(0.7, 1.4, aLife);
        gl_PointSize = aLife >= 1.0 ? 0.0 : aSize * grow * uPixelScale / -mvPosition.z;
    }
`;

const fragmentShader = /* glsl */ `
    varying float vLife;

    void main() {
        // gl_PointCoord: poloha v rámci štvorca bodu 0..1 → vzdialenosť od stredu 0..1.
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float disc = 1.0 - smoothstep(0.0, 1.0, d); // mäkký kruh: stred 1, okraj 0
        disc *= disc;                                // ešte mäkší okraj (menej „guľôčok“)

        // Farba podľa veku: horúce žlté jadro → oranžová → tmavočervená.
        vec3 color = mix(vec3(1.0, 0.8, 0.4), vec3(1.0, 0.45, 0.1), smoothstep(0.0, 0.35, vLife));
        color = mix(color, vec3(0.6, 0.1, 0.03), smoothstep(0.35, 0.85, vLife));
        // Rýchly nábeh (nevyskočí naraz) a postupné zhasnutie; 0,55 = jas jednej častice
        // (aditívne miešanie sčíta mnoho častíc — pri plnom jase by stred bol biely).
        float alpha = 0.55 * disc * smoothstep(0.0, 0.08, vLife) * (1.0 - smoothstep(0.5, 1.0, vLife));

        // Aditívne miešanie: výsledok sa pripočíta k obrazu → viac častíc = jasnejšie.
        gl_FragColor = vec4(color * alpha, alpha);
    }
`;

/**
 * Materiál ohňa (vlastný shader).
 * Vstup: žiadny. Výstup: THREE.ShaderMaterial.
 */
function createFireMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uPixelScale: { value: 1 } },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,               // častice sa navzájom nezakrývajú štvorcami
        blending: THREE.AdditiveBlending,
    });
}

/**
 * Náhodné číslo v rozsahu.
 * Vstup: a, b — hranice. Výstup: číslo z [a, b).
 */
function rand(a, b) {
    return a + Math.random() * (b - a);
}

export class FireFx {
    /** @param {THREE.Scene} scene  scéna, do ktorej sa oheň pridá */
    constructor(scene) {
        this.particles = new ParticleSystem(scene, createFireMaterial(), CAPACITY, { buoyancy: 1.5, drag: 2 });
        this.handDebt = 0; // „dlh“ častíc z minulých snímok (rate · dt nie je celé číslo)
        this.ballDebt = 0;
        this.groundDebt = 0;

        // Jedno svetlo záblesku na celý efekt (nové svetlo = nový shader, drahé) — pri dopade sa presunie.
        this.flash = new THREE.PointLight(0xff7a2a, 0, 14, 2);
        this.flashLeft = 0; // zostávajúci čas záblesku (s)
        scene.add(this.flash);
    }

    /**
     * Ohnivá guľa za letu: zhluk častíc v mieste gule (chvost vznikne pohybom).
     * Vstup: position — THREE.Vector3 poloha gule, power — sila 0..1, dt — krok času (s). Výstup: žiadny.
     */
    fireball(position, power, dt) {
        this.ballDebt += BALL_RATE * dt;
        const size = BALL_SIZE * (0.6 + 0.4 * power);
        const p = new THREE.Vector3();
        while (this.ballDebt >= 1) {
            this.ballDebt -= 1;
            p.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(BALL_RADIUS).add(position);
            const v = { x: rand(-0.3, 0.3), y: rand(0, 0.5), z: rand(-0.3, 0.3) };
            this.particles.emit(p, v, rand(0.15, 0.35), size * rand(0.7, 1.2));
        }
    }

    /**
     * Záblesk pri dopade: častice na všetky strany (viac nahor) a krátke svetlo.
     * Vstup: point — THREE.Vector3 miesto dopadu, power — sila 0..1. Výstup: žiadny.
     */
    burst(point, power) {
        const dir = new THREE.Vector3();
        for (let i = 0; i < BURST_COUNT; i++) {
            // Náhodný smer v hornej pologuli (od zeme nahor, nie do terénu).
            dir.set(rand(-1, 1), rand(0.2, 1), rand(-1, 1)).normalize()
                .multiplyScalar(rand(BURST_SPEED.min, BURST_SPEED.max) * (0.5 + 0.5 * power));
            this.particles.emit(point, dir, rand(0.4, 0.9), BURST_SIZE * rand(0.6, 1.3));
        }
        this.flash.position.copy(point).y += 1; // svetlo nad zemou → osvetlí okolie, nie len bod
        this.flashLeft = FLASH_MS / 1000;
    }

    /**
     * Oheň v ruke: vypúšťa častice okolo kotvy ruky, viac a väčšie podľa sily.
     * Vstup: anchor — THREE.Vector3 kotva ruky (svet), power — 0..1, dt — krok času (s).
     * Výstup: žiadny.
     */
    handFlame(anchor, power, dt) {
        const { lerp } = THREE.MathUtils;
        this.handDebt += lerp(HAND_RATE.min, HAND_RATE.max, power) * dt;
        const size = lerp(HAND_SIZE.min, HAND_SIZE.max, power);
        const p = new THREE.Vector3();
        while (this.handDebt >= 1) {
            this.handDebt -= 1;
            p.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(HAND_RADIUS).add(anchor);
            const v = { x: rand(-0.08, 0.08), y: rand(0.2, 0.45), z: rand(-0.08, 0.08) }; // plameň stúpa
            this.particles.emit(p, v, rand(0.35, 0.7), size * rand(0.7, 1.3));
        }
    }

    /**
     * Plamene na horiacej zemi: častice z náhodných horiacich buniek stavu zeme.
     * Vstup: state — GroundState (burning, burningCount, cellCenter), heightAt — výška terénu (x, z),
     *        dt — krok času (s). Výstup: žiadny.
     */
    groundFlames(state, heightAt, dt) {
        const count = state.burningCount;
        if (count === 0) {
            this.groundDebt = 0;
            return;
        }
        this.groundDebt += Math.min(GROUND_RATE_MAX, count * GROUND_RATE_PER_CELL) * dt;
        const cell = { x: 0, z: 0 };
        const p = new THREE.Vector3();
        while (this.groundDebt >= 1) {
            this.groundDebt -= 1;
            state.cellCenter(state.burning[Math.floor(Math.random() * count)], cell);
            p.x = cell.x + rand(-GROUND_JITTER, GROUND_JITTER);
            p.z = cell.z + rand(-GROUND_JITTER, GROUND_JITTER);
            p.y = (heightAt(p.x, p.z) ?? 0) + 0.05;
            const v = { x: rand(-0.15, 0.15), y: rand(0.6, 1.4), z: rand(-0.15, 0.15) };
            this.particles.emit(p, v, rand(0.5, 1.0), rand(GROUND_SIZE.min, GROUND_SIZE.max));
        }
    }

    /**
     * Krok efektu (pohyb častíc).
     * Vstup: dt — krok času (s), camera — kamera scény, viewportHeight — výška plátna (px). Výstup: žiadny.
     */
    update(dt, camera, viewportHeight) {
        this.particles.update(dt, camera, viewportHeight);
        // Záblesk zhasína kvadraticky (rýchly začiatok, mäkký koniec).
        this.flashLeft = Math.max(0, this.flashLeft - dt);
        const k = this.flashLeft / (FLASH_MS / 1000);
        this.flash.intensity = FLASH_INTENSITY * k * k;
    }
}
