/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    ui/featureRecorder.js — záznam príznakov ruky na ladenie (len vývojový režim)
 * Autor:    Vladyslav Krykun
 * Dátum:    02.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Po stlačení klávesu R odpočíta chvíľu na prípravu, potom niekoľko sekúnd
 *           zaznamenáva príznaky ruky z každého snímku kamery a vypíše do konzoly súhrn
 *           (min / max) — z neho sa určujú prahy gest. Rýchly úder trvá 2–3 snímky,
 *           očami sa z prebiehajúcich čísel nedá prečítať → treba záznam.
 *           Do produkčného zostavenia sa nedostane (main.js ho načíta len pri import.meta.env.DEV).
 */

const PREPARE_MS = 1500; // čas na prípravu ruky po stlačení R
const RECORD_MS = 3000;  // dĺžka záznamu

export class FeatureRecorder {
    constructor() {
        this.phase = 'idle'; // 'idle' | 'prepare' | 'record'
        this.requested = false; // stlačené R, začne sa v najbližšom snímku (vtedy poznáme jeho čas)
        this.phaseStart = 0;
        this.samples = [];   // záznamy aktuálneho merania
        this.last = [];      // záznamy posledného dokončeného merania (v konzole: copy(app.recorder.last))
        this.count = 0;      // poradové číslo merania (na orientáciu v konzole)
    }

    /** Požiada o nové meranie (volá sa pri stlačení R). Vstup/výstup: žiadny. */
    request() {
        if (this.phase === 'idle') {
            this.requested = true;
        }
    }

    /**
     * Volá sa v každom snímku vykreslenia: posúva fázy a pri zázname ukladá vzorky.
     * Vstup:  nowMs  — čas snímku v ms;
     *         sample — príznaky z nového snímku kamery { state, open, speed, vx, vy, depth, nx, ny, nz },
     *                  alebo null, ak kamera v tomto snímku nič nové nedodala.
     * Výstup: žiadny.
     */
    update(nowMs, sample) {
        if (this.requested) {
            this.requested = false;
            this.phase = 'prepare';
            this.phaseStart = nowMs;
            this.count++;
            console.log(`Meranie #${this.count}: priprav sa…`);
        }
        const elapsed = nowMs - this.phaseStart;
        if (this.phase === 'prepare' && elapsed >= PREPARE_MS) {
            this.phase = 'record';
            this.phaseStart = nowMs;
            this.samples = [];
            console.log(`Meranie #${this.count}: ZÁZNAM (${RECORD_MS / 1000} s)`);
        } else if (this.phase === 'record') {
            if (sample) {
                this.samples.push({ t: Math.round(elapsed), ...sample });
            }
            if (elapsed >= RECORD_MS) {
                this.phase = 'idle';
                this.last = this.samples;
                this.printSummary();
            }
        }
    }

    /**
     * Riadok stavu do náhľadu kamery (odpočítavanie / záznam).
     * Výstup: reťazec, alebo null, keď sa nemeria.
     */
    get statusLine() {
        if (this.phase === 'prepare') return `meranie #${this.count}: priprav sa…`;
        if (this.phase === 'record') return `● ZÁZNAM #${this.count}`;
        return null;
    }

    /** Vypíše do konzoly súhrn posledného merania (min / max každého príznaku). */
    printSummary() {
        const all = this.samples;
        const tracked = all.filter((s) => s.state === 'tracking');
        const lines = [`Meranie #${this.count}: snímok ${all.length}, ruka v ${tracked.length}, ` +
            `bez ruky ${all.length - tracked.length}`];
        for (const key of ['open', 'speed', 'vx', 'vy', 'depth', 'nx', 'ny', 'nz']) {
            const values = tracked.map((s) => s[key]);
            if (values.length === 0) {
                break;
            }
            const min = Math.min(...values).toFixed(2).padStart(6);
            const max = Math.max(...values).toFixed(2).padStart(6);
            lines.push(`  ${key.padEnd(5)} min ${min}  max ${max}`);
        }
        console.log(lines.join('\n'));
    }
}
