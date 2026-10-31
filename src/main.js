/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    main.js — vstupný bod aplikácie
 * Autor:    Vladyslav Krykun
 * Dátum:    31.10.2026
 * Verzia:   0.1 (V0)
 * Popis:    Vytvorí aplikáciu v kontajneri #app a spustí vykresľovaciu slučku.
 */
import { App } from './app.js';

const app = new App(document.getElementById('app'));
app.start();

// Prístup z konzoly prehliadača pri ladení (len vo vývojovom režime).
if (import.meta.env.DEV) {
    window.app = app;
}
