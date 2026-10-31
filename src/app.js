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

export class App {
    /**
     * @param {HTMLElement} container  prvok, do ktorého sa vloží plátno (canvas)
     */
    constructor(container) {
        this.container = container;
        this.renderer = createRenderer();
        this.camera = createCamera(window.innerWidth / window.innerHeight);
        this.scene = createScene();
        this.timer = new THREE.Timer(); // čas medzi snímkami pre animácie (od V1)

        container.appendChild(this.renderer.domElement);

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
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /** Prispôsobí pomer strán kamery a veľkosť plátna veľkosti okna. */
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
