/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    ui/lightHint.js — upozornenie „málo svetla“
 * Autor:    Vladyslav Krykun
 * Dátum:    02.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Pri slabom svetle kamera predlžuje expozíciu → dáva menej snímok za sekundu
 *           (namerané: ~16 namiesto 30) a obraz je pri pohybe rozmazaný → ruka sa stráca.
 *           Keď kamera dlhšie dáva málo snímok, zobrazí hore v strede upozornenie.
 *           Nezávisí od Three.js ani od MediaPipe.
 */

const LOW_FPS = 22;   // pod touto hodnotou je kamera „pomalá“ (pri dobrom svetle dáva ~30)
const OK_FPS = 26;    // nad touto hodnotou je znova v poriadku (medzera = hysterézia, bez blikania)
const SHOW_MS = 3000; // ako dlho musí byť kamera pomalá, kým sa upozornenie ukáže
const HIDE_MS = 1000; // ako dlho musí byť v poriadku, kým upozornenie zmizne

export class LightHint {
    /** @param {HTMLElement} container  prvok, do ktorého sa upozornenie vloží */
    constructor(container) {
        this.el = document.createElement('div');
        Object.assign(this.el.style, {
            position: 'fixed', left: '50%', top: '12px', transform: 'translateX(-50%)',
            padding: '6px 12px', borderRadius: '6px',
            background: 'rgba(200,120,0,0.85)', color: '#fff',
            font: '14px/1.4 sans-serif', textAlign: 'center',
            pointerEvents: 'none', display: 'none',
        });
        container.appendChild(this.el);

        this.visible = false;
        this.since = null; // odkedy (ms) trvá stav opačný k zobrazenému; null = netrvá
    }

    /**
     * Rozhodne, či upozornenie zobraziť, podľa toho, koľko snímok za sekundu dáva kamera.
     * Vstup:  cameraFps — snímky kamery za sekundu (0 = ešte nenamerané → nič nerobí);
     *         nowMs     — aktuálny čas v ms.
     * Výstup: žiadny.
     */
    update(cameraFps, nowMs) {
        if (cameraFps <= 0) {
            return;
        }
        // „Opačný stav“: ak je skryté, čakáme na pomalú kameru; ak je zobrazené, na rýchlu.
        const opposite = this.visible ? cameraFps >= OK_FPS : cameraFps < LOW_FPS;
        if (!opposite) {
            this.since = null;
            if (this.visible) {
                this.setText(cameraFps); // číslo sa môže meniť aj počas zobrazenia
            }
            return;
        }
        this.since ??= nowMs;
        if (nowMs - this.since >= (this.visible ? HIDE_MS : SHOW_MS)) {
            this.visible = !this.visible;
            this.since = null;
            this.el.style.display = this.visible ? 'block' : 'none';
            this.setText(cameraFps);
        }
    }

    /** Nastaví text upozornenia. Vstup: cameraFps — snímky kamery za sekundu. */
    setText(cameraFps) {
        this.el.textContent =
            `Málo svetla — kamera dáva ${cameraFps.toFixed(0)} snímok/s. ` +
            'Rozsviet izbu, aby sa gestá rozpoznávali spoľahlivo.';
    }
}
