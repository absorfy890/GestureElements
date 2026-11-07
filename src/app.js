/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    app.js — trieda App
 * Autor:    Vladyslav Krykun
 * Dátum:    31.10.2026
 * Verzia:   0.1 (V0)
 * Popis:    Drží renderer, scénu, kameru a ovládanie kamery myšou;
 *           riadi vykresľovaciu slučku a zmenu veľkosti okna.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer, createCamera, createScene } from './world/sceneSetup.js';
import { createGround } from './world/terrain.js';
import { AimCursor } from './cast/aim.js';
import { MouseInput } from './input/mouse.js';
import { RateMeter, PerfOverlay } from './ui/fpsMeter.js';
import { snapshotFeatures, HandMotion } from './input/handFeatures.js';
import { LightHint } from './ui/lightHint.js';

const CAST_RESULT_MS = 1000; // ako dlho ukazovať v náhľade výsledok castu (výstrel / zrušené)
const CAMERA_FRAME_MS = 1000 / 30; // trvanie jedného snímku kamery pri 30 snímkach/s

export class App {
    /**
     * @param {HTMLElement} container  prvok, do ktorého sa vloží plátno (canvas)
     */
    constructor(container) {
        this.container = container;
        this.renderer = createRenderer();
        this.camera = createCamera(window.innerWidth / window.innerHeight);
        this.scene = createScene();
        this.ground = createGround();   // zem: na ňu sa mieri (raycast) a dopadajú na ňu živly
        this.scene.add(this.ground);
        this.aimCursor = new AimCursor(this.scene, this.camera, this.ground); // kurzor na zemi (kam sa mieri)
        this.timer = new THREE.Timer(); // čas medzi snímkami pre animácie (od V1)
        this.hand = null;               // HandTracker; null = bez kamery/modelu → len myš
        this.preview = null;            // HandPreview (náhľad kamery s bodmi); null = bez kamery
        this.lastHandState = null;      // stav ruky v minulom snímku (na výpis zmeny)
        this.handDelegate = null;       // 'GPU' | 'CPU' — kde beží model ruky (na zobrazenie)
        this.handFeatures = null;       // príznaky posledného snímku s rukou (snapshotFeatures); null = bez ruky
        this.handMotion = new HandMotion(); // história pohybu ruky (V1: jedna ruka → jedna inštancia)
        this.recorder = null;           // FeatureRecorder (len vo vývojovom režime, nastaví main.js)
        this.gestures = null;           // GestureRecognizer (nastaví main.js, keď je ruka); null = len myš
        this.castResult = null;         // { phase, until } — posledné uvoľnenie / zrušenie na zobrazenie

        // Meranie výkonu: snímky vykreslenia a detekcie ruky za sekundu (cieľ ≥ 30).
        this.renderMeter = new RateMeter();
        this.detectMeter = new RateMeter();
        this.perf = new PerfOverlay(container);
        this.lightHint = new LightHint(container); // „málo svetla“, keď kamera dáva málo snímok

        container.appendChild(this.renderer.domElement);
        this.mouse = new MouseInput(this.renderer.domElement);

        // Ovládanie kamery myšou (ako na CV5): otáčanie, priblíženie, bez posunu pod zem.
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0, 0);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI * 0.49;
        this.controls.update();

        this.onResize = this.onResize.bind(this);
        this.renderFrame = this.renderFrame.bind(this);
        window.addEventListener('resize', this.onResize);
    }

    /** Spustí vykresľovaciu slučku. Vstup: žiadny. Výstup: žiadny. */
    start() {
        this.renderer.setAnimationLoop(this.renderFrame);
    }

    // ====================================================================
    // Slučka a udalosti
    // ====================================================================

    /**
     * Jeden snímok: aktualizácia stavu a vykreslenie scény.
     * Vstup: timestamp — čas snímku v ms (dodáva setAnimationLoop).
     */
    renderFrame(timestamp) {
        this.timer.update(timestamp);
        this.updateHand(timestamp);
        this.controls.update();
        this.updateAim();
        this.renderer.render(this.scene, this.camera);

        this.renderMeter.tick(timestamp);
        this.updatePerf();
    }

    /**
     * Kurzor na zemi: prednosť má ruka počas castu (charge / aim), inak poloha myši;
     * bez oboch skrytý. Vstup/výstup: žiadny.
     */
    updateAim() {
        const intent = this.gestures?.intent;
        if (intent && (intent.phase === 'charge' || intent.phase === 'aim')) {
            this.aimCursor.aimAt(intent.aim);
        } else if (this.mouse.aim) {
            this.aimCursor.aimAt(this.mouse.aim);
        } else {
            this.aimCursor.hide();
        }
    }

    /** Zobrazí aktuálne merania výkonu v PerfOverlay. Vstup/výstup: žiadny. */
    updatePerf() {
        const lines = [`Render ${this.renderMeter.perSecond.toFixed(0)} FPS`];
        if (this.hand) {
            const d = this.detectMeter;
            lines.push(`Ruka   ${d.perSecond.toFixed(0)} FPS, ${d.avgDuration.toFixed(1)} ms (${this.handDelegate})`);
        } else {
            lines.push('Ruka   — (myš)');
        }
        this.perf.show(lines);
    }

    /**
     * Spustí detekciu ruky (ak je kamera aj model), prekreslí náhľad (stav + body)
     * a vypíše do konzoly zmenu stavu ruky.
     * Vstup: timestamp — čas snímku v ms. Výstup: žiadny.
     */
    updateHand(timestamp) {
        if (!this.hand) {
            return; // bez kamery/modelu → len myš
        }
        const changed = this.hand.update(timestamp);
        if (this.hand.ranDetection) {
            this.detectMeter.tick(timestamp, this.hand.detectDuration);
        }
        // Detekcia beží na každom novom snímku kamery → jej frekvencia = snímky kamery za sekundu.
        // Výnimka: pomalá detekcia (napr. CPU, > 33 ms) sama preskakuje snímky → vtedy frekvencia
        // nehovorí nič o svetle a upozornenie sa nemení (0 = „nevieme“).
        const d = this.detectMeter;
        this.lightHint.update(d.avgDuration > CAMERA_FRAME_MS ? 0 : d.perSecond, timestamp);
        this.updateHandFeatures(timestamp);
        this.updateGestures(timestamp);
        // Text sa skladá v každom snímku (mení sa aj bez nového snímku kamery: odpočet merania,
        // zobrazenie výsledku castu); HandPreview mení DOM len pri zmene textu.
        this.preview?.showInfo([this.castLine(timestamp), ...this.handFeatureLines()]);
        if (!changed) {
            return; // nezmenili sa body ani stav → body netreba prekresľovať
        }
        this.preview?.setState(this.hand.state);
        this.preview?.draw(this.hand.landmarks, this.hand.connections);

        if (this.hand.state !== this.lastHandState) {
            console.log(`Ruka: ${this.hand.state}`);
            this.lastHandState = this.hand.state;
        }
    }

    /**
     * Prepočíta príznaky ruky: pri novom snímku s rukou snímok príznakov + história pohybu;
     * pri strate ruky história preč (po návrate ruky nesmie vzniknúť „skok“ = falošný úder).
     * Pri 'holding' sa nič nemení — nové údaje nie sú.
     * Vstup: timestamp — čas snímku v ms. Výstup: žiadny.
     */
    updateHandFeatures(timestamp) {
        if (this.hand.state === 'lost') {
            this.handFeatures = null;
            this.handMotion.reset();
        } else if (this.hand.ranDetection && this.hand.state === 'tracking') {
            const { videoWidth, videoHeight } = this.hand.video;
            this.handFeatures = snapshotFeatures(this.hand.landmarks, videoWidth, videoHeight);
            this.handMotion.push(timestamp, this.handFeatures.center, this.handFeatures.size);
        }
        this.recorder?.update(timestamp, this.hand.ranDetection ? this.recorderSample() : null);
    }

    /**
     * Krok rozpoznávača gest; zmenu fázy castu vypíše do konzoly a zapamätá si koniec castu
     * (uvoľnenie / zrušenie trvá jediný snímok → v náhľade sa ukazuje ešte CAST_RESULT_MS).
     * Vstup: timestamp — čas snímku v ms. Výstup: žiadny.
     */
    updateGestures(timestamp) {
        if (!this.gestures) {
            return;
        }
        const event = this.gestures.update(timestamp, this.hand.state, this.handFeatures, this.handMotion);
        if (!event) {
            return;
        }
        console.log(`Cast: ${event.phase} (${event.element})`);
        if (event.phase === 'release' || event.phase === 'cancel') {
            this.castResult = { phase: event.phase, until: timestamp + CAST_RESULT_MS };
        }
    }

    /**
     * Riadok so stavom castu do náhľadu kamery.
     * Vstup: timestamp — čas snímku v ms. Výstup: reťazec.
     */
    castLine(timestamp) {
        const intent = this.gestures?.intent;
        if (intent?.phase === 'charge') {
            const bars = Math.round(intent.power * 5);
            return `cast  🔥 zber ${'█'.repeat(bars)}${'░'.repeat(5 - bars)}`;
        }
        if (intent?.phase === 'aim') {
            return `cast  🔥 mieri x${intent.aim.x.toFixed(2)} y${intent.aim.y.toFixed(2)}`;
        }
        if (this.castResult && timestamp < this.castResult.until) {
            return this.castResult.phase === 'release' ? 'cast  🔥 VÝSTREL!' : 'cast  ✖ zrušené';
        }
        return 'cast  —';
    }

    /**
     * Príznaky aktuálneho snímku kamery pre FeatureRecorder (ploché čísla, ľahko sa porovnávajú).
     * Výstup: { state, open, speed, vx, vy, depth, nx, ny, nz }; bez ruky len { state }.
     */
    recorderSample() {
        const f = this.handFeatures;
        if (this.hand.state !== 'tracking' || !f) {
            return { state: this.hand.state };
        }
        const v = this.handMotion.velocity;
        return {
            state: 'tracking', open: f.openness, speed: v.speed, vx: v.x, vy: v.y,
            depth: this.handMotion.depthRate, nx: f.normal.x, ny: f.normal.y, nz: f.normal.z,
        };
    }

    /**
     * Príznaky ruky ako riadky textu na ladenie (zobrazuje HandPreview).
     * Výstup: pole reťazcov; bez ruky jeden riadok „ruka: —“.
     */
    handFeatureLines() {
        const status = this.recorder?.statusLine;
        const lines = status ? [status] : [];
        const f = this.handFeatures;
        if (!f) {
            return [...lines, 'ruka: —'];
        }
        const v = this.handMotion.velocity;
        const n = f.normal;
        const fmt = (x) => (x >= 0 ? '+' : '') + x.toFixed(2); // so znamienkom, rovnaká šírka
        return [
            ...lines,
            `open  ${f.openness.toFixed(2)}   dlaň ${f.size.toFixed(0)} px`,
            `norm  x${fmt(n.x)} y${fmt(n.y)} z${fmt(n.z)}`,
            `rýchl x${fmt(v.x)} y${fmt(v.y)} |${v.speed.toFixed(1)}|`,
            `hĺbka ${fmt(this.handMotion.depthRate)} /s`,
        ];
    }

    /** Prispôsobí pomer strán kamery a veľkosť plátna veľkosti okna. */
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
