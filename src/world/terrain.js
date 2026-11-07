/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    world/terrain.js — zem (terén)
 * Autor:    Vladyslav Krykun
 * Dátum:    07.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Vytvorí zem, na ktorú dopadajú živly a na ktorú sa mieri (raycast).
 *           V0: rovná plocha; vo V1 ju nahradí terén z heightmapy (rovnaké rozhranie).
 */
import * as THREE from 'three';

// Strana štvorcovej zeme v jednotkách scény. Zhoduje sa s oblasťou tieňovej kamery
// v sceneSetup.js (±20) → tiene sú na celej zemi.
export const GROUND_SIZE = 40;

/**
 * Vytvorí rovnú zem v rovine XZ so stredom v (0, 0, 0).
 * Vstup:  žiadny.
 * Výstup: THREE.Mesh (meno 'ground'), prijíma tiene.
 */
export function createGround() {
    const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const material = new THREE.MeshStandardMaterial({ color: 0x6b8f4e, roughness: 1 });
    const ground = new THREE.Mesh(geometry, material);
    ground.name = 'ground';
    // PlaneGeometry leží v rovine XY (kolmo na pohľad) → otočiť o −90° okolo X, aby ležala
    // vodorovne a jej predná strana mierila hore (+Y).
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    return ground;
}
