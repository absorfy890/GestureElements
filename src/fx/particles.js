/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    fx/particles.js — sústava častíc
 * Autor:    Vladyslav Krykun
 * Dátum:    22.11.2026
 * Verzia:   0.1 (V1)
 * Popis:    Spoločný základ efektov (oheň, neskôr voda): pevný počet častíc v jednom THREE.Points,
 *           pohyb sa počíta na CPU, vzhľad určuje materiál (vlastný shader) efektu.
 */
import * as THREE from 'three';

export class ParticleSystem {
    /**
     * @param {THREE.Scene}          scene     scéna, do ktorej sa častice pridajú
     * @param {THREE.ShaderMaterial} material  vzhľad (uniform uPixelScale, atribúty aSize, aLife)
     * @param {number}               capacity  najviac častíc naraz (pri plnej sústave sa prepíše najstaršia)
     * @param {object}               motion    { buoyancy — zrýchlenie nahor (jednotky/s²),
     *                                          drag — brzdenie (1/s) }
     */
    constructor(scene, material, capacity, { buoyancy = 0, drag = 0 } = {}) {
        this.capacity = capacity;
        this.buoyancy = buoyancy;
        this.drag = drag;
        this.next = 0; // slot pre ďalšiu časticu (dokola)

        // Údaje pre GPU (atribúty) — vytvorené raz, v každom snímku sa len prepisujú.
        this.positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
        this.sizes = new THREE.BufferAttribute(new Float32Array(capacity), 1);
        this.lives = new THREE.BufferAttribute(new Float32Array(capacity).fill(1), 1); // 1 = mŕtva
        for (const a of [this.positions, this.sizes, this.lives]) {
            a.setUsage(THREE.DynamicDrawUsage);
        }
        // Len na CPU: rýchlosť, vek a dĺžka života.
        this.velocities = new Float32Array(capacity * 3);
        this.ages = new Float32Array(capacity);
        this.lifetimes = new Float32Array(capacity).fill(1);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', this.positions);
        geometry.setAttribute('aSize', this.sizes);
        geometry.setAttribute('aLife', this.lives);
        this.points = new THREE.Points(geometry, material);
        this.points.frustumCulled = false; // obálka sa neprepočítava → inak by častice mohli zmiznúť
        scene.add(this.points);
    }

    /**
     * Vypustí jednu časticu.
     * Vstup: position — THREE.Vector3 (alebo {x,y,z}), velocity — {x,y,z} (jednotky/s),
     *        lifetime — dĺžka života (s), size — veľkosť (jednotky scény). Výstup: žiadny.
     */
    emit(position, velocity, lifetime, size) {
        const i = this.next;
        this.next = (i + 1) % this.capacity;
        this.positions.setXYZ(i, position.x, position.y, position.z);
        this.velocities[i * 3] = velocity.x;
        this.velocities[i * 3 + 1] = velocity.y;
        this.velocities[i * 3 + 2] = velocity.z;
        this.ages[i] = 0;
        this.lifetimes[i] = lifetime;
        this.sizes.setX(i, size);
        this.lives.setX(i, 0);
    }

    /**
     * Pohne živými časticami a zostarne ich; mierka bodov podľa kamery.
     * Vstup: dt — krok času (s), camera — THREE.PerspectiveCamera,
     *        viewportHeight — výška plátna v pixeloch zariadenia. Výstup: žiadny.
     */
    update(dt, camera, viewportHeight) {
        // Veľkosť bodu v pixeloch = veľkosť · mierka / vzdialenosť; mierka = výška / (2 · tg(fov/2)).
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        this.points.material.uniforms.uPixelScale.value = viewportHeight / (2 * Math.tan(halfFov));

        const pos = this.positions.array;
        const vel = this.velocities;
        const life = this.lives.array;
        const damping = Math.max(0, 1 - this.drag * dt);
        for (let i = 0; i < this.capacity; i++) {
            if (life[i] >= 1) {
                continue; // mŕtva
            }
            this.ages[i] += dt;
            life[i] = Math.min(1, this.ages[i] / this.lifetimes[i]);
            const k = i * 3;
            vel[k] *= damping;
            vel[k + 1] = vel[k + 1] * damping + this.buoyancy * dt;
            vel[k + 2] *= damping;
            pos[k] += vel[k] * dt;
            pos[k + 1] += vel[k + 1] * dt;
            pos[k + 2] += vel[k + 2] * dt;
        }
        this.positions.needsUpdate = true;
        this.lives.needsUpdate = true;
        this.sizes.needsUpdate = true;
    }
}
