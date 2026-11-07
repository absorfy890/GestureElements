/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    ui/handPreview.js — náhľad kamery s bodmi ruky
 * Autor:    Vladyslav Krykun
 * Dátum:    01.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Malý panel v rohu obrazovky: zrkadlové video z kamery a nad ním
 *           2D plátno (canvas), do ktorého sa kreslia body ruky.
 *           Nezávisí od Three.js ani od MediaPipe.
 */

const PREVIEW_WIDTH = 240; // šírka panelu v px; výška podľa pomeru strán kamery
const INDEX_TIP = 8;       // index bodu: špička ukazováka (ním sa neskôr mieri)

// Farba rámika podľa stavu ruky (HandTracker.state).
const STATE_COLORS = {
    tracking: '#30d070', // ruka je v zábere
    holding:  '#ffa020', // ruka na chvíľu vypadla, body sa držia
    lost:     '#ff4040', // ruka nie je
};

export class HandPreview {
    /**
     * Vytvorí panel a vloží ho do stránky.
     * @param {HTMLElement}      container  prvok, do ktorého sa panel vloží (napr. document.body)
     * @param {HTMLVideoElement} video      prehrávajúce sa video z kamery (zo startCamera)
     */
    constructor(container, video) {
        const height = Math.round(PREVIEW_WIDTH * video.videoHeight / video.videoWidth);

        // Obal: pevne v pravom dolnom rohu, nad scénou Three.js.
        this.root = document.createElement('div');
        Object.assign(this.root.style, {
            position: 'fixed', right: '12px', bottom: '12px',
            width: `${PREVIEW_WIDTH}px`, height: `${height}px`,
            border: '3px solid rgba(255,255,255,0.6)', borderRadius: '6px', // farba podľa stavu (setState)
            overflow: 'hidden', background: '#000',
            pointerEvents: 'none', // panel nesmie zachytávať myš (OrbitControls pod ním)
        });

        // Video: zrkadlené cez CSS, aby sa používateľ videl ako v zrkadle.
        this.video = video;
        Object.assign(video.style, {
            position: 'absolute', inset: '0', width: '100%', height: '100%',
            transform: 'scaleX(-1)',
        });

        // Plátno na body ruky: rovnaká veľkosť ako panel, leží nad videom.
        this.canvas = document.createElement('canvas');
        this.canvas.width = PREVIEW_WIDTH;
        this.canvas.height = height;
        Object.assign(this.canvas.style, { position: 'absolute', inset: '0' });
        this.ctx = this.canvas.getContext('2d');

        // Text na ladenie (príznaky ruky, neskôr gesto): v hornej časti panelu nad videom.
        this.info = document.createElement('pre');
        Object.assign(this.info.style, {
            position: 'absolute', left: '0', top: '0', right: '0', margin: '0', padding: '3px 5px',
            font: '11px/1.3 monospace', color: '#fff', background: 'rgba(0,0,0,0.55)',
        });

        this.root.append(video, this.canvas, this.info);
        container.appendChild(this.root);

        this.state = null;
        this.setState('lost');
    }

    /**
     * Zobrazí stav ruky farbou rámika (zelená / oranžová / červená).
     * Vstup:  state — 'tracking' | 'holding' | 'lost' (z HandTracker.state).
     * Výstup: žiadny.
     */
    setState(state) {
        if (state === this.state) {
            return; // štýl meniť len pri zmene (nie v každom snímku)
        }
        this.state = state;
        this.root.style.borderColor = STATE_COLORS[state];
    }

    /**
     * Zobrazí riadky textu nad videom (na ladenie: príznaky ruky, stav gesta).
     * Vstup:  lines — pole reťazcov. Výstup: žiadny.
     */
    showInfo(lines) {
        const text = lines.join('\n');
        if (text !== this.info.textContent) { // DOM meniť len pri zmene (volá sa v každom snímku)
            this.info.textContent = text;
        }
    }

    /**
     * Prekreslí body ruky. Pri landmarks = null len vyčistí plátno (ruka nie je v zábere).
     * Vstup:  landmarks   — 21 bodov { x, y } v rozsahu 0..1 (nezrkadlené, z MediaPipe), alebo null;
     *         connections — dvojice indexov { start, end } = „kosti“ ruky (HandLandmarker.HAND_CONNECTIONS).
     * Výstup: žiadny.
     */
    draw(landmarks, connections) {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!landmarks) {
            return;
        }

        // 0..1 → pixely plátna; x zrkadlíme (1 − x), aby body sedeli na zrkadlovom videu.
        const px = (p) => (1 - p.x) * canvas.width;
        const py = (p) => p.y * canvas.height;

        // Pri 'holding' sú body staré (zamrznuté) → kresliť ich bledšie.
        ctx.globalAlpha = this.state === 'holding' ? 0.4 : 1;

        // Kosti: čiary medzi kĺbmi.
        ctx.strokeStyle = 'rgba(0, 255, 160, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const { start, end } of connections) {
            ctx.moveTo(px(landmarks[start]), py(landmarks[start]));
            ctx.lineTo(px(landmarks[end]), py(landmarks[end]));
        }
        ctx.stroke();

        // Kĺby: krúžky; špička ukazováka väčšia a inou farbou.
        landmarks.forEach((p, i) => {
            const isTip = i === INDEX_TIP;
            ctx.fillStyle = isTip ? '#ff4040' : '#ffffff';
            ctx.beginPath();
            ctx.arc(px(p), py(p), isTip ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
