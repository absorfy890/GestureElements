/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    input/mouse.js — záložný vstup myšou
 * Autor:    Vladyslav Krykun
 * Dátum:    07.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Poloha myši nad plátnom v rovnakom tvare ako intent.aim (0..1, y dole).
 *           Nezávisí od Three.js.
 */

export class MouseInput {
    /** @param {HTMLElement} element  prvok, nad ktorým sa sleduje myš (plátno renderera) */
    constructor(element) {
        this.aim = null; // { x, y } v rozsahu 0..1; null = myš nie je nad plátnom

        element.addEventListener('pointermove', (e) => {
            const r = element.getBoundingClientRect();
            this.aim = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
        });
        element.addEventListener('pointerleave', () => {
            this.aim = null;
        });
    }
}
