/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    input/mouse.js — záložný vstup myšou
 * Autor:    Vladyslav Krykun
 * Dátum:    15.11.2026
 * Verzia:   0.2 (V1)
 * Popis:    Cast myšou s rovnakou gramatikou ako rukou (zber → mierenie → uvoľnenie / zrušenie)
 *           a s rovnakými zámermi (intent) ako GestureRecognizer → efekty a terén nevedia,
 *           odkiaľ cast prišiel. Nezávisí od Three.js.
 */

const CHARGE_MS = 400; // ako dlho držať tlačidlo, kým je kúzlo zozbierané (ako päsť pri ruke)
const LEFT = 0;        // MouseEvent.button: ľavé tlačidlo
const RIGHT = 2;       //                    pravé tlačidlo

/**
 * Myš nad plátnom: poloha (aim) a cast.
 *   ľavé tlačidlo stlačiť → 'charge' (power 0 → 1 za CHARGE_MS), držať → 'aim',
 *   pustiť → 'release' (pustiť počas zberu → 'cancel'),
 *   pravé tlačidlo / Esc / myš mimo plátna → 'cancel'.
 * Zámer (this.intent) má rovnaký tvar ako pri GestureRecognizer:
 *   { hand: 'mouse', element, variant, phase, aim: { x, y }, power }; null = necastuje sa.
 */
export class MouseInput {
    /** @param {HTMLElement} element  prvok, nad ktorým sa sleduje myš (plátno renderera) */
    constructor(element) {
        this.aim = null;       // { x, y } v rozsahu 0..1 (y dole); null = myš nie je nad plátnom
        this.intent = null;
        this.pressed = false;  // ľavé tlačidlo je dole (od udalosti, spracuje update)
        this.pressedAt = null; // čas (ms, ako v update) začiatku zberu; null = zber nezačal
        this.cancelRequested = false;

        element.addEventListener('pointermove', (e) => {
            const r = element.getBoundingClientRect();
            this.aim = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
        });
        element.addEventListener('pointerleave', () => {
            this.aim = null;
            this.cancel(); // ako strata ruky z kadru
        });
        element.addEventListener('pointerdown', (e) => {
            if (e.button === LEFT) {
                this.pressed = true;
            } else if (e.button === RIGHT) {
                this.cancel();
            }
        });
        // Pustenie sledujeme na celom okne: tlačidlo sa dá pustiť aj mimo plátna.
        window.addEventListener('pointerup', (e) => {
            if (e.button === LEFT) {
                this.pressed = false;
            }
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancel();
            }
        });
        element.addEventListener('contextmenu', (e) => e.preventDefault()); // pravé tlačidlo = bez menu
    }

    /** Žiadosť o zrušenie castu (spracuje sa v najbližšom update). Vstup/výstup: žiadny. */
    cancel() {
        if (this.pressed || this.intent) {
            this.cancelRequested = true;
        }
        this.pressed = false;
    }

    /** True, kým sa myšou castuje (zber alebo mierenie). */
    get casting() {
        return this.intent?.phase === 'charge' || this.intent?.phase === 'aim';
    }

    /**
     * Jeden krok castu; volá sa v každom snímku vykreslenia.
     * Vstup:  nowMs — čas v ms (ten istý ako pre rozpoznávač gest).
     * Výstup: zámer, ak sa v tomto kroku zmenila fáza, inak null. Aktuálny zámer je v this.intent.
     */
    update(nowMs) {
        const prevPhase = this.intent?.phase ?? null;
        if (prevPhase === 'release' || prevPhase === 'cancel') {
            this.intent = null; // udalosť trvá jeden snímok
        }

        if (this.cancelRequested) {
            this.cancelRequested = false;
            this.finish('cancel');
        } else if (this.pressed && this.aim) {
            this.pressedAt ??= nowMs; // prvý snímok so stlačeným tlačidlom = začiatok zberu
            const power = Math.min(1, (nowMs - this.pressedAt) / CHARGE_MS);
            this.intent = {
                hand: 'mouse', element: 'fire', variant: 'default',
                phase: power < 1 ? 'charge' : 'aim', aim: this.aim, power,
            };
        } else if (this.pressedAt !== null) {
            // Tlačidlo pustené: zozbierané kúzlo vyletí, nedozbierané sa zruší.
            this.finish(this.intent?.phase === 'aim' ? 'release' : 'cancel');
        }

        const phase = this.intent?.phase ?? null;
        return phase !== prevPhase && this.intent ? this.intent : null;
    }

    /**
     * Ukončí cast: zámer dostane fázu 'release' alebo 'cancel' (na jeden snímok).
     * Vstup: phase — 'release' | 'cancel'. Výstup: žiadny.
     */
    finish(phase) {
        if (this.intent) {
            this.intent = { ...this.intent, phase };
        }
        this.pressedAt = null;
    }
}
