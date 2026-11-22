/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    world/groundState.js — stav zeme (bunkový automat)
 * Autor:    Vladyslav Krykun
 * Dátum:    22.11.2026
 * Verzia:   0.2 (V1)
 * Popis:    Mriežka buniek nad terénom (bunka = vrchol terénu). Každá bunka drží nezávislé
 *           veličiny 0..1 (teplo, vlhkosť, palivo, spálenina); živly ich menia pri dopade,
 *           pravidlá (horenie, vyhasínanie, vysychanie) v update().
 *           Nový živel = nová veličina. Nezávisí od Three.js.
 */

// Dopad podľa živlu: ktorú veličinu mení, polomer (jednotky scény) a koľko pridá v strede.
const HIT = {
    fire: { field: 'heat', radius: 1.5, amount: 1 },
};
// Pravidlá: o koľko veličina klesne za sekundu.
const COOL_RATE = 0.1; // teplo: z 1 na 0 za 10 s
const DRY_RATE = 0.02;  // vlhkosť: z 1 na 0 za 50 s
// Horenie: bunka s palivom sa pri dostatočnom teple zapáli, palivo postupne zhorí na spáleninu;
// kým horí, oheň ju sám udržuje horúcu. Šírenie na susedov je až vo V2.
const IGNITE_HEAT = 0.3; // od tohto tepla bunka s palivom horí
const BURN_TIME = 6;     // s — za koľko zhorí plné palivo
const BURN_HEAT = 0.75;  // teplo horiacej bunky neklesne pod túto hodnotu
// Kúdol (sadze): aj nehoriaca horúca bunka (okraj požiaru, skala) trochu sčernie → spálenina má
// plynulý okraj namiesto skoku 1 → 0 medzi susednými bunkami.
const SCORCH_FROM = 0.1; // od tohto tepla začína černieť
const SCORCH_MAX = 0.5;  // najviac takto (pri teple IGNITE_HEAT a vyššom)

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
     * @param {Float32Array|null} fuel  palivo buniek 0..1 (napr. groundFuel z terénu); null = všade 1
     */
    constructor(width, height, size, fuel = null) {
        this.width = width;
        this.height = height;
        this.size = size;
        const n = width * height;
        this.heat = new Float32Array(n);     // 0 = studené, 1 = rozpálené
        this.moisture = new Float32Array(n); // 0 = suché, 1 = mokré
        this.fuel = fuel ?? new Float32Array(n).fill(1); // čo môže zhorieť (tráva, les); skala 0
        this.burnt = new Float32Array(n);    // 0 = nedotknuté, 1 = úplne spálené (ostáva natrvalo)
        this.burning = new Uint32Array(n);   // indexy horiacich buniek (prvých burningCount platí)
        this.burningCount = 0;
    }

    /**
     * Stred bunky vo svete.
     * Vstup: i — index bunky, out — objekt na výsledok. Výstup: out = { x, z }.
     */
    cellCenter(i, out = { x: 0, z: 0 }) {
        const col = i % this.width;
        const row = (i - col) / this.width;
        out.x = (col / (this.width - 1) - 0.5) * this.size;
        out.z = (row / (this.height - 1) - 0.5) * this.size;
        return out;
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
     * Krok pravidiel automatu: horenie (zapálenie, spotreba paliva, spálenina), kúdol horúcich buniek,
     * vyhasínanie, vysychanie; zároveň zoznam horiacich buniek (burning, burningCount).
     * Vstup: dt — čas od minulého kroku v sekundách. Výstup: žiadny.
     */
    update(dt) {
        const cool = COOL_RATE * dt;
        const dry = DRY_RATE * dt;
        const burn = dt / BURN_TIME;
        const { heat, moisture, fuel, burnt, burning } = this;
        let count = 0;
        for (let i = 0; i < heat.length; i++) {
            heat[i] = Math.max(0, heat[i] - cool);
            if (heat[i] > SCORCH_FROM) {
                burnt[i] = Math.max(burnt[i], SCORCH_MAX * smoothstep(heat[i], SCORCH_FROM, IGNITE_HEAT));
            }
            if (fuel[i] > 0 && heat[i] >= IGNITE_HEAT) {
                const used = Math.min(fuel[i], burn); // palivo → spálenina
                fuel[i] -= used;
                burnt[i] = Math.min(1, burnt[i] + used);
                heat[i] = Math.max(heat[i], BURN_HEAT); // oheň udržuje bunku horúcu
                burning[count++] = i;
            }
            moisture[i] = Math.max(0, moisture[i] - dry);
        }
        this.burningCount = count;
    }
}
