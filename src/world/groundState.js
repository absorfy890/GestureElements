/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    world/groundState.js — stav zeme (bunkový automat)
 * Autor:    Vladyslav Krykun
 * Dátum:    21.11.2026
 * Verzia:   0.1 (V1)
 * Popis:    Mriežka buniek nad terénom (bunka = vrchol terénu). Každá bunka drží nezávislé
 *           veličiny 0..1 (teplo, vlhkosť); živly ich menia pri dopade, pravidlá v update().
 *           Nový živel = nová veličina. Nezávisí od Three.js.
 */

// Dopad podľa živlu: ktorú veličinu mení, polomer (jednotky scény) a koľko pridá v strede.
const HIT = {
    fire: { field: 'heat', radius: 2.5, amount: 1 },
};
// Pravidlá (zatiaľ len vyhasínanie): o koľko veličina klesne za sekundu.
const COOL_RATE = 0.05; // teplo: z 1 na 0 za 20 s
const DRY_RATE = 0.02;  // vlhkosť: z 1 na 0 za 50 s

/**
 * Plynulý prechod 0 → 1 medzi hranicami edge0 a edge1 (ako GLSL smoothstep).
 * Vstup: x, edge0, edge1 — čísla. Výstup: 0..1.
 */
function smoothstep(x, edge0, edge1) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

export class GroundState {
    /**
     * @param {number} width   počet buniek v smere x (= vrcholov terénu v riadku)
     * @param {number} height  počet buniek v smere z
     * @param {number} size    strana terénu v jednotkách scény (stred v 0, 0)
     */
    constructor(width, height, size) {
        this.width = width;
        this.height = height;
        this.size = size;
        this.heat = new Float32Array(width * height);     // 0 = studené, 1 = rozpálené
        this.moisture = new Float32Array(width * height); // 0 = suché, 1 = mokré
    }

    /**
     * Stĺpec a riadok bunky (desatinné) pre bod sveta; rovnaký prepočet ako createHeightSampler.
     * Vstup: x, z — bod sveta. Výstup: { col, row } (môže byť mimo mriežky).
     */
    toGrid(x, z) {
        return {
            col: (x / this.size + 0.5) * (this.width - 1),
            row: (z / this.size + 0.5) * (this.height - 1),
        };
    }

    /**
     * Pridá hodnotu do veličiny v kruhu okolo bodu; v strede amount, k okraju plynulo klesá na 0.
     * Vstup: field — Float32Array veličiny (napr. this.heat), x, z — stred (svet),
     *        radius — polomer (jednotky scény), amount — prírastok v strede. Výstup: žiadny.
     */
    addAround(field, x, z, radius, amount) {
        const { col, row } = this.toGrid(x, z);
        const cellSize = this.size / (this.width - 1);
        const r = radius / cellSize; // polomer v bunkách
        // Prechádzať len štvorec okolo kruhu (nie celú mriežku), orezaný na okraje.
        const c0 = Math.max(0, Math.ceil(col - r));
        const c1 = Math.min(this.width - 1, Math.floor(col + r));
        const r0 = Math.max(0, Math.ceil(row - r));
        const r1 = Math.min(this.height - 1, Math.floor(row + r));
        for (let rr = r0; rr <= r1; rr++) {
            for (let cc = c0; cc <= c1; cc++) {
                const d = Math.hypot(cc - col, rr - row);
                const weight = 1 - smoothstep(d, 0, r); // stred 1, okraj 0
                if (weight > 0) {
                    const i = rr * this.width + cc;
                    field[i] = Math.min(1, field[i] + amount * weight);
                }
            }
        }
    }

    /**
     * Dopad kúzla na zem.
     * Vstup: element — živel ('fire'), x, z — miesto dopadu (svet),
     *        power — sila kúzla 0..1 (intent.power). Výstup: žiadny.
     */
    hit(element, x, z, power = 1) {
        const rule = HIT[element];
        if (rule) {
            this.addAround(this[rule.field], x, z, rule.radius, rule.amount * power);
        }
    }

    /**
     * Krok pravidiel automatu: teplo vyhasína, vlhkosť vysychá.
     * Vstup: dt — čas od minulého kroku v sekundách. Výstup: žiadny.
     */
    update(dt) {
        const cool = COOL_RATE * dt;
        const dry = DRY_RATE * dt;
        for (let i = 0; i < this.heat.length; i++) {
            this.heat[i] = Math.max(0, this.heat[i] - cool);
            this.moisture[i] = Math.max(0, this.moisture[i] - dry);
        }
    }
}
