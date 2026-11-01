/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    ui/fpsMeter.js — meranie výkonu (FPS) a jeho zobrazenie
 * Autor:    Vladyslav Krykun
 * Dátum:    01.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    RateMeter počíta, koľkokrát za sekundu nastala udalosť (snímok vykreslenia,
 *           detekcia ruky) a priemerné trvanie jednej udalosti. PerfOverlay ukazuje
 *           výsledky v ľavom hornom rohu. Nezávisí od Three.js ani od MediaPipe.
 */

const WINDOW_MS = 1000; // za aký úsek času sa počíta priemer (1 s)

/**
 * Počítadlo udalostí za sekundu. Hodnoty sa prepočítajú raz za WINDOW_MS,
 * aby číslo na obrazovke neskákalo v každom snímku.
 */
export class RateMeter {
    constructor() {
        this.count = 0;           // počet udalostí v aktuálnom okne
        this.durationSum = 0;     // súčet trvaní udalostí v okne (ms)
        this.windowStart = null;  // začiatok aktuálneho okna (ms)

        this.perSecond = 0;       // výsledok: udalostí za sekundu (FPS)
        this.avgDuration = 0;     // výsledok: priemerné trvanie jednej udalosti (ms)
    }

    /**
     * Zaznamená jednu udalosť.
     * Vstup:  nowMs      — aktuálny čas v ms;
     *         durationMs — ako dlho udalosť trvala (nepovinné, napr. čas detekcie).
     * Výstup: žiadny (aktualizuje perSecond / avgDuration po uplynutí okna).
     */
    tick(nowMs, durationMs = 0) {
        this.windowStart ??= nowMs;
        this.count++;
        this.durationSum += durationMs;

        const elapsed = nowMs - this.windowStart;
        if (elapsed >= WINDOW_MS) {
            this.perSecond = this.count * 1000 / elapsed;
            this.avgDuration = this.durationSum / this.count;
            this.count = 0;
            this.durationSum = 0;
            this.windowStart = nowMs;
        }
    }
}

/** Textový panel s meraniami výkonu v ľavom hornom rohu. */
export class PerfOverlay {
    /** @param {HTMLElement} container  prvok, do ktorého sa panel vloží */
    constructor(container) {
        this.el = document.createElement('div');
        Object.assign(this.el.style, {
            position: 'fixed', left: '12px', top: '12px',
            padding: '4px 8px', borderRadius: '4px',
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            font: '12px/1.4 monospace', whiteSpace: 'pre',
            pointerEvents: 'none',
        });
        container.appendChild(this.el);
        this.lastText = '';
    }

    /**
     * Zobrazí riadky textu (DOM sa mení, len keď sa text zmenil).
     * Vstup:  lines — pole reťazcov. Výstup: žiadny.
     */
    show(lines) {
        const text = lines.join('\n');
        if (text !== this.lastText) {
            this.el.textContent = text;
            this.lastText = text;
        }
    }
}
