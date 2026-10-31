/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    world/sceneSetup.js — základ scény
 * Autor:    Vladyslav Krykun
 * Dátum:    31.10.2026
 * Verzia:   0.1 (V0)
 * Popis:    Funkcie na vytvorenie renderera, kamery a scény so svetlami.
 *           Terén a efekty sa pridávajú v ďalších moduloch.
 */
import * as THREE from 'three';

/**
 * Vytvorí WebGL renderer na celé okno.
 * Vstup: žiadny. Výstup: THREE.WebGLRenderer.
 * Pomer pixelov je obmedzený na 2 (neskôr ho nastaví preset kvality).
 */
export function createRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    return renderer;
}

/**
 * Vytvorí perspektívnu kameru, ktorá sa pozerá zhora šikmo na stred scény.
 * Vstup: aspect — pomer strán okna. Výstup: THREE.PerspectiveCamera.
 */
export function createCamera(aspect) {
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    camera.position.set(0, 12, 18);
    camera.lookAt(0, 0, 0);
    return camera;
}

/**
 * Vytvorí scénu s pozadím a svetlami.
 * Vstup: žiadny. Výstup: THREE.Scene.
 *  - HemisphereLight: rozptýlené svetlo oblohy a zeme (aby tiene neboli čierne),
 *  - DirectionalLight: „slnko“ s tieňmi (tiene využije terén vo V1).
 */
export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fc4e0);

    const hemi = new THREE.HemisphereLight(0xdfeeff, 0x4a3f30, 0.8);
    hemi.name = 'hemiLight';
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.name = 'sun';
    sun.position.set(10, 20, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 20; // polovica rozmeru oblasti tieňovej kamery
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 60 });
    scene.add(sun);

    // Pomocná mriežka na orientáciu v prázdnej scéne; nahradí ju terén (úloha V0: rovná zem).
    const grid = new THREE.GridHelper(40, 40, 0x335066, 0x6d8aa0);
    grid.name = 'debugGrid';
    scene.add(grid);

    return scene;
}
