/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    cast/aim.js — mierenie na zem
 * Autor:    Vladyslav Krykun
 * Dátum:    07.11.2026
 * Verzia:   0.2 (V1)
 * Popis:    Kurzor na zemi = miesto, kam sa mieri. Pozná len zámer (aim 0..1), nie ruku
 *           ani myš → oba vstupy používajú ten istý kód. Neskôr (V1) aj náhľad trajektórie.
 */
import * as THREE from 'three';

const CURSOR_RADIUS = 0.3;   // vonkajší polomer krúžku (jednotky scény)
const CURSOR_LIFT = 0.1;    // odsadenie od zeme pozdĺž normály — inak z-fighting a zanáranie do svahu
const UP = new THREE.Vector3(0, 1, 0);

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
        geometry.rotateX(-Math.PI / 2); // RingGeometry leží v XY → položiť do XZ (lícom hore, +Y), ako zem
        // MeshBasicMaterial nereaguje na svetlo → kurzor je rovnako jasný v tieni aj na slnku.
        const material = new THREE.MeshBasicMaterial({ color: 0xff7020, transparent: true, opacity: 0.9 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = 'aimCursor';
        this.mesh.visible = false; // kým sa nemieri, kurzor nie je vidno
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
        const { point, face } = hits[0]; // najbližší zásah; face = zasiahnutý trojuholník
        // face.normal je v súradniciach objektu; zem nie je posunutá ani otočená → platí aj vo svete.
        this.moveTo(point, face.normal);
        return point;
    }

    /**
     * Presunie kurzor na bod zeme, natočí ho podľa svahu a zobrazí ho.
     * Vstup:  point — THREE.Vector3 na zemi (napr. výsledok raycastu),
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
