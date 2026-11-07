/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    cast/aim.js — mierenie na zem
 * Autor:    Vladyslav Krykun
 * Dátum:    07.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Kurzor na zemi = miesto, kam sa mieri. Pozná len zámer (aim 0..1), nie ruku
 *           ani myš → oba vstupy používajú ten istý kód. Neskôr (V1) aj náhľad trajektórie.
 */
import * as THREE from 'three';

const CURSOR_RADIUS = 0.6;   // vonkajší polomer krúžku (jednotky scény)
const CURSOR_LIFT = 0.02;    // výška nad zemou — inak by sa krúžok „bil“ so zemou (z-fighting)

/**
 * Prevedie bod mierenia na NDC (normalizované súradnice zariadenia) pre Raycaster.
 * Vstup:  aim — { x, y } v rozsahu 0..1 (y dole).
 * Výstup: THREE.Vector2 v rozsahu −1..+1 (y hore).
 */
export function aimToNdc(aim) {
    return new THREE.Vector2(aim.x * 2 - 1, -(aim.y * 2 - 1));
}

/** Krúžok na zemi, ktorý ukazuje, kam sa mieri (raycast z kamery cez bod aim). */
export class AimCursor {
    /**
     * @param {THREE.Scene}  scene   scéna, do ktorej sa kurzor pridá
     * @param {THREE.Camera} camera  kamera, z ktorej sa mieri (tá, ktorou sa scéna vykresľuje)
     * @param {THREE.Object3D} ground  zem, na ktorú sa mieri (createGround)
     */
    constructor(scene, camera, ground) {
        this.camera = camera;
        this.ground = ground;
        this.raycaster = new THREE.Raycaster(); // jeden na celý čas — nevytvárať v každom snímku

        const geometry = new THREE.RingGeometry(CURSOR_RADIUS * 0.7, CURSOR_RADIUS, 32);
        // MeshBasicMaterial nereaguje na svetlo → kurzor je rovnako jasný v tieni aj na slnku.
        const material = new THREE.MeshBasicMaterial({ color: 0xff7020, transparent: true, opacity: 0.9 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = 'aimCursor';
        this.mesh.rotation.x = -Math.PI / 2; // RingGeometry leží v XY ako PlaneGeometry → položiť na zem
        this.mesh.position.y = CURSOR_LIFT;  // aj pred prvým moveTo nad zemou (inak z-fighting)
        scene.add(this.mesh);
    }

    /**
     * Zamieri: lúč z kamery cez bod aim na obrazovke; kde pretne zem, tam sa presunie kurzor.
     * Vstup:  aim — { x, y } v rozsahu 0..1 (y dole), napr. intent.aim alebo poloha myši.
     * Výstup: THREE.Vector3 — bod na zemi; null, ak lúč zem nepretne (mieri sa na oblohu) → kurzor sa skryje.
     */
    aimAt(aim) {
        this.raycaster.setFromCamera(aimToNdc(aim), this.camera);
        const hits = this.raycaster.intersectObject(this.ground);
        if (hits.length === 0) {
            this.hide();
            return null;
        }
        const point = hits[0].point; // najbližší zásah
        this.moveTo(point);
        return point;
    }

    /**
     * Presunie kurzor na bod zeme a zobrazí ho.
     * Vstup:  point — THREE.Vector3 na zemi (napr. výsledok raycastu). Výstup: žiadny.
     */
    moveTo(point) {
        this.mesh.position.set(point.x, point.y + CURSOR_LIFT, point.z);
        this.mesh.visible = true;
    }

    /** Skryje kurzor (nemieri sa). Vstup/výstup: žiadny. */
    hide() {
        this.mesh.visible = false;
    }
}
