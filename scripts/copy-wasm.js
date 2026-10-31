/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    scripts/copy-wasm.js — pomocný skript pre npm (nie je súčasťou aplikácie)
 * Autor:    Vladyslav Krykun
 * Dátum:    01.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Skopíruje wasm súbory MediaPipe z node_modules do public/mediapipe/wasm/,
 *           aby ich Vite servíroval lokálne (bez CDN, aplikácia beží offline).
 *           Spúšťa sa automaticky po `npm ci` / `npm install` (postinstall).
 */
import { cpSync, rmSync } from 'node:fs';

const SOURCE = 'node_modules/@mediapipe/tasks-vision/wasm';
const TARGET = 'public/mediapipe/wasm';

// Najprv zmazať starú kópiu, aby po zmene verzie balíka nezostali staré súbory.
rmSync(TARGET, { recursive: true, force: true });
cpSync(SOURCE, TARGET, { recursive: true });

console.log(`MediaPipe wasm: ${SOURCE} -> ${TARGET}`);
