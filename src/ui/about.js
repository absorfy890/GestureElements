/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    ui/about.js — úvodné okno „O aplikácii“
 * Autor:    Vladyslav Krykun
 * Dátum:    22.11.2026
 * Verzia:   0.1 (V1)
 * Popis:    Okno pri štarte: autor, katedra/fakulta/univerzita, predmet, školský rok, krátke ovládanie
 *           a stav načítania kamery a modelu ruky. Prekryje scénu (myš nekúzli cez okno);
 *           scéna a model ruky sa medzitým pripravujú v pozadí. Zatvára sa tlačidlom „Pokračovať“.
 */

const INFO = {
    title: 'Gestá a živly',
    subtitle: 'Téma 9: AI a počítačová grafika',
    author: 'Vladyslav Krykun',
    school: [
        'Katedra počítačov a informatiky',
        'Fakulta elektrotechniky a informatiky',
        'Technická univerzita v Košiciach',
    ],
    course: 'Počítačová grafika',
    year: '2026/2027',
};

const CONTROLS = [
    ['Ruka', 'päsť a chvíľu podržať = zber · pohyb päsťou = mierenie · úder ku kamere s otvorením dlane = výstrel · švih do strany / otvorená dlaň / ruka mimo záberu = zrušenie'],
    ['Myš', 'držať ľavé tlačidlo = zber a mierenie · pustiť = výstrel · pravé tlačidlo alebo Esc = zrušenie'],
    ['Kamera', 'ťahanie pravým tlačidlom = otáčanie · koliesko = priblíženie'],
];

/**
 * Vytvorí element so štýlom a textom.
 * Vstup: tag — názov značky, style — objekt CSS, text — obsah (nepovinný). Výstup: HTMLElement.
 */
function el(tag, style, text = '') {
    const e = document.createElement(tag);
    Object.assign(e.style, style);
    e.textContent = text;
    return e;
}

export class AboutDialog {
    /** @param {HTMLElement} parent  kam sa okno pridá (document.body) */
    constructor(parent) {
        this.overlay = el('div', {
            position: 'fixed', inset: '0', zIndex: '1000',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
            background: 'rgba(10, 8, 6, 0.6)', backdropFilter: 'blur(6px)',
            font: '15px/1.45 system-ui, sans-serif', color: '#eee',
        });
        const card = el('div', {
            maxWidth: '560px', width: '100%', maxHeight: '100%', overflowY: 'auto', boxSizing: 'border-box',
            padding: '24px 28px', borderRadius: '10px',
            background: 'rgba(28, 24, 20, 0.95)', border: '1px solid rgba(255, 140, 60, 0.35)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        });

        card.append(
            el('h1', { margin: '0', fontSize: '26px', color: '#ffb066' }, INFO.title),
            el('div', { opacity: '0.75', marginBottom: '16px' }, INFO.subtitle),
            el('div', { fontWeight: '600' }, INFO.author),
            ...INFO.school.map((line) => el('div', {}, line)),
            el('div', { marginTop: '6px', marginBottom: '16px' },
                `Predmet: ${INFO.course} · Školský rok: ${INFO.year}`),
        );

        const table = el('div', {
            display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: '13px', marginBottom: '16px',
        });
        for (const [name, text] of CONTROLS) {
            table.append(el('div', { fontWeight: '600', color: '#ffb066' }, name), el('div', { opacity: '0.85' }, text));
        }
        card.append(table);

        this.status = el('div', { fontSize: '13px', opacity: '0.8', marginBottom: '14px' }, 'Načítavam kameru a model ruky…');
        this.button = el('button', {
            padding: '8px 22px', font: 'inherit', fontWeight: '600', cursor: 'pointer',
            color: '#1c1814', background: '#ffb066', border: 'none', borderRadius: '6px',
        }, 'Pokračovať');
        card.append(this.status, this.button);
        this.overlay.append(card);
        parent.append(this.overlay);
        this.button.focus(); // Enter = Pokračovať

        // Prísľub, ktorý sa splní pri zatvorení okna (main.js naň čaká pred zapnutím gest).
        this.closed = new Promise((resolve) => {
            this.button.addEventListener('click', () => {
                this.overlay.remove();
                resolve();
            }, { once: true });
        });
    }

    /**
     * Zobrazí stav načítania (kamera, model ruky).
     * Vstup: text — správa, ok — true = pripravené (zelená), false = problém (oranžová). Výstup: žiadny.
     */
    setStatus(text, ok) {
        this.status.textContent = text;
        this.status.style.color = ok ? '#8fd18f' : '#ffb066';
    }
}
