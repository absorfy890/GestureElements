/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    input/gestures.js — rozpoznávanie gest castu (stavový automat)
 * Autor:    Vladyslav Krykun
 * Dátum:    02.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Z príznakov jednej ruky (handFeatures.js) rozpoznáva cast kúzla:
 *           zber → mierenie → uvoľnenie, alebo zrušenie. Výstupom je „zámer“ (intent),
 *           nie gesto — efekty a terén nevedia nič o rukách, myš môže dávať tie isté zámery.
 *           Inštancia na ruku (pri dvoch rukách dve inštancie). Nezávisí od Three.js ani MediaPipe.
 *           V0: len oheň (inšpirácia Northern Shaolin z „Avatara“ — priamy prudký úder).
 */

// Prahy podľa meraní 3b (PROGRES.md → Poznámky), s rezervou voči nameranému šumu.
const FIST_OPEN = 0.25;   // otvorenosť pod touto hodnotou = päsť (namerané 0,00–0,03)
const STILL_SPEED = 1.5;  // „takmer nehybne“ pri zbere (dlane/s; pokoj ≤ 0,15, pomalý pohyb až 4)
const CHARGE_MS = 400;    // ako dlho držať päsť, kým je kúzlo zozbierané
const COOLDOWN_MS = 500;  // po uvoľnení / zrušení sa chvíľu nový zber nezačne (ruka ešte doznieva)

// Úder ohňa = v krátkom okne (STRIKE_WINDOW_MS) nastane oboje: dlaň sa otvorí z päste
// a ruka prudko ide ku kamere. Namerané pri údere: hĺbka až +4,2, otvorenosť 0 → 0,94.
// Samotná zmena tvaru ruky hýbe hĺbkou len do ~1,2, pomalý push do ~1,0.
const STRIKE_FIST = 0.3;       // „ešte päsť“ (o niečo voľnejšie ako FIST_OPEN — päsť sa pri údere uvoľňuje)
const STRIKE_OPEN = 0.6;       // „už otvorená dlaň“
const STRIKE_DEPTH = 2.5;      // rast dlane (ln/s) = prudký pohyb ku kamere
const STRIKE_WINDOW_MS = 400;  // obe udalosti musia byť najviac takto ďaleko (≈ 6 snímok pri 16/s)

// Švih do strany = zrušenie („striasť“ kúzlo). Pomalý pohyb do strán dával až 4 dlane/s,
// rýchly švih 10–14 → prah 8 je v strede medzery. Úder ohňa mal do strany najviac 1,7.
const SWIPE_SPEED = 8;

// Vyhasnutie = zrušenie: dlaň počas mierenia otvorená dlhšie ako FADE_MS bez úderu („oheň v pästi
// zhasol“). Nie hneď po otvorení: pri údere sa dlaň niekedy otvorí o snímku-dve skôr, než ruka
// vyrazí ku kamere → FADE_MS = STRIKE_WINDOW_MS, aby sa úder stihol rozpoznať.
const FADE_MS = STRIKE_WINDOW_MS;

/**
 * Stavy automatu (this.state):
 *   'idle'     — nič sa nedeje (aj počas COOLDOWN_MS po konci castu);
 *   'charging' — ruka drží gesto zberu, power rastie 0 → 1;
 *   'aiming'   — kúzlo je pripravené, ruka mieri; čaká sa na uvoľnenie alebo zrušenie.
 * Zámer (this.intent), alebo null v stave 'idle':
 *   { hand, element, variant, phase: 'charge'|'aim'|'release'|'cancel', aim: { x, y }, power }
 *   aim — stred dlane v zrkadlovom obraze 0..1 (ako ho vidí používateľ); power — 0..1.
 *   'release' a 'cancel' trvajú jediný snímok (udalosť), potom sa automat vráti do 'idle'.
 */
export class GestureRecognizer {
    /**
     * @param {'right'|'left'} hand         ktorá ruka (do zámeru; V1 len 'right')
     * @param {number}         frameWidth   šírka obrazu kamery v px (na prepočet aim na 0..1)
     * @param {number}         frameHeight  výška obrazu kamery v px
     */
    constructor(hand, frameWidth, frameHeight) {
        this.hand = hand;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;

        this.state = 'idle';
        this.intent = null;
        this.stateStart = 0;           // kedy (ms) začal aktuálny stav
        this.cooldownUntil = -Infinity; // do kedy (ms) sa nový zber nezačne

        // Pamäť pre úder (len v stave 'aiming'): kedy bola ruka naposledy päsťou
        // a kedy naposledy prudko išla ku kamere.
        this.lastFistMs = -Infinity;
        this.lastPushMs = -Infinity;
        this.openSinceMs = null; // odkedy je dlaň pri mierení otvorená (null = nie je)
    }

    /**
     * Jeden krok automatu; volá sa v každom snímku vykreslenia.
     * Vstup:  nowMs      — čas v ms;
     *         trackState — 'tracking' | 'holding' | 'lost' (HandTracker.state);
     *         features   — príznaky posledného snímku s rukou (snapshotFeatures), alebo null;
     *         motion     — HandMotion tejto ruky (rýchlosť, hĺbka).
     * Výstup: zámer, ak sa v tomto kroku zmenila fáza (na výpis / efekty), inak null.
     *         Aktuálny zámer je vždy v this.intent.
     */
    update(nowMs, trackState, features, motion) {
        const prevPhase = this.intent?.phase ?? null;

        // Udalosti 'release' / 'cancel' trvajú jeden snímok.
        if (prevPhase === 'release' || prevPhase === 'cancel') {
            this.intent = null;
        }

        if (trackState === 'lost' || !features) {
            // Strata ruky vždy ruší rozbehnutý cast (nikdy nevystrelí omylom).
            if (this.state !== 'idle') {
                this.finish(nowMs, 'cancel');
            }
        } else if (trackState === 'tracking') {
            this.step(nowMs, features, motion);
        }
        // 'holding': ruka na chvíľu vypadla (napr. rozmazanie pri údere) → nič nemeníme, čakáme.

        const phase = this.intent?.phase ?? null;
        return phase !== prevPhase && this.intent ? this.intent : null;
    }

    /**
     * Prechody automatu pri ruke v zábere.
     * Vstup: nowMs, features, motion — ako pri update(). Výstup: žiadny.
     */
    step(nowMs, features, motion) {
        switch (this.state) {
            case 'idle':
                if (nowMs >= this.cooldownUntil && this.isChargeGesture(features, motion)) {
                    this.enter(nowMs, 'charging');
                }
                break;

            case 'charging':
                if (!this.isChargeGesture(features, motion)) {
                    this.finish(nowMs, 'cancel'); // päsť povolená skôr, než sa kúzlo zozbieralo
                } else if (nowMs - this.stateStart >= CHARGE_MS) {
                    this.enter(nowMs, 'aiming');
                    this.lastFistMs = nowMs; // mierenie začína v päsť
                    this.lastPushMs = -Infinity;
                    this.openSinceMs = null;
                }
                break;

            case 'aiming':
                this.rememberStrikeParts(nowMs, features, motion);
                if (this.isCancelGesture(motion)) {
                    this.finish(nowMs, 'cancel');
                } else if (this.isReleaseGesture(nowMs, features)) {
                    this.finish(nowMs, 'release');
                } else if (this.isFaded(nowMs)) {
                    this.finish(nowMs, 'cancel'); // päsť sa pomaly povolila → oheň zhasol
                }
                break;
        }
        if (this.state !== 'idle') {
            this.updateIntent(nowMs, features);
        }
    }

    /** Prejde do stavu state (začína sa mu merať čas). */
    enter(nowMs, state) {
        this.state = state;
        this.stateStart = nowMs;
    }

    /**
     * Ukončí cast: zámer dostane fázu 'release' alebo 'cancel' (na jeden snímok),
     * automat sa vráti do 'idle' a chvíľu nezačne nový zber.
     */
    finish(nowMs, phase) {
        if (this.intent) {
            this.intent = { ...this.intent, phase };
        }
        this.enter(nowMs, 'idle');
        this.cooldownUntil = nowMs + COOLDOWN_MS;
    }

    /**
     * Zámer podľa aktuálneho stavu: fáza, kam sa mieri, sila.
     * Vstup: nowMs; features — príznaky snímku. Výstup: žiadny (nastaví this.intent).
     */
    updateIntent(nowMs, features) {
        const charging = this.state === 'charging';
        this.intent = {
            hand: this.hand,
            element: 'fire',
            variant: 'default',
            phase: charging ? 'charge' : 'aim',
            // Zrkadlenie x → 1 − x: používateľ vidí seba ako v zrkadle, ruka doprava = mieri doprava.
            aim: { x: 1 - features.center.x / this.frameWidth, y: features.center.y / this.frameHeight },
            power: charging ? Math.min(1, (nowMs - this.stateStart) / CHARGE_MS) : 1,
        };
    }

    // ----------------------------------------------------------------
    // Detektory gest (vstup: príznaky; výstup: true / false)
    // ----------------------------------------------------------------

    /** Zber ohňa: päsť, takmer nehybne. */
    isChargeGesture(features, motion) {
        return features.openness < FIST_OPEN && motion.velocity.speed < STILL_SPEED;
    }

    /**
     * Zapamätá si časti úderu z aktuálneho snímku: či je ruka ešte päsť a či prudko ide ku kamere.
     * Obe časti nastávajú v rôznych snímkach (poradie sa líši podľa človeka) → pamätá sa čas každej.
     * Vstup: nowMs, features, motion. Výstup: žiadny.
     */
    rememberStrikeParts(nowMs, features, motion) {
        if (features.openness < STRIKE_FIST) {
            this.lastFistMs = nowMs;
        }
        if (motion.depthRate > STRIKE_DEPTH) {
            this.lastPushMs = nowMs;
        }
        // Otvorená dlaň: zapamätať začiatok (??= nastaví len prvýkrát); inak vynulovať.
        if (features.openness > STRIKE_OPEN) {
            this.openSinceMs ??= nowMs;
        } else {
            this.openSinceMs = null;
        }
    }

    /** Vyhasnutie: dlaň je pri mierení otvorená dlhšie ako FADE_MS (a úder neprišiel). */
    isFaded(nowMs) {
        return this.openSinceMs !== null && nowMs - this.openSinceMs > FADE_MS;
    }

    /**
     * Uvoľnenie ohňa: dlaň je teraz otvorená a v posledných STRIKE_WINDOW_MS bola ruka
     * ešte päsťou aj prudko išla ku kamere. Samotné otvorenie (bez pohybu) ani samotný
     * pohyb ku kamere (bez päste, napr. push vody) úder nie sú.
     */
    isReleaseGesture(nowMs, features) {
        return features.openness > STRIKE_OPEN
            && nowMs - this.lastFistMs <= STRIKE_WINDOW_MS
            && nowMs - this.lastPushMs <= STRIKE_WINDOW_MS;
    }

    /** Zrušenie: prudký švih do strany (doľava aj doprava). */
    isCancelGesture(motion) {
        return Math.abs(motion.velocity.x) > SWIPE_SPEED;
    }
}
