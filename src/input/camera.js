/*
 * Program:  PG semestrálne zadanie — téma 9: AI a počítačová grafika
 * Modul:    input/camera.js — prístup k webkamere
 * Autor:    Vladyslav Krykun
 * Dátum:    01.11.2026
 * Verzia:   0.1 (V0)
 * Popis:    Spustí webkameru a vráti prvok <video> so živým obrazom.
 *           Nezávisí od Three.js. Pri chybe nevyhadzuje výnimku, ale vráti null
 *           → aplikácia prejde na záložný vstup myšou.
 */

/**
 * Spustí webkameru.
 * Vstup:  width, height — želané rozlíšenie (prehliadač ho môže upraviť).
 * Výstup: Promise<{ video: HTMLVideoElement|null, error: string|null }>
 *         video — prehrávajúci sa prvok <video> (nie je vložený do stránky), alebo null;
 *         error — dôvod zlyhania pre používateľa, alebo null pri úspechu.
 */
export async function startCamera(width = 640, height = 480) {
    // Kamera funguje len v bezpečnom kontexte (https alebo localhost).
    if (!navigator.mediaDevices?.getUserMedia) {
        return { video: null, error: 'Prehliadač nepodporuje prístup ku kamere.' };
    }

    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: width }, height: { ideal: height }, facingMode: 'user' },
            audio: false,
        });
    } catch (err) {
        return { video: null, error: describeCameraError(err) };
    }

    const video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true; // bez prepnutia na celú obrazovku (mobilné prehliadače)
    video.muted = true;       // bez zvuku sa video smie spustiť automaticky
    await video.play();       // po play() sú známe rozmery snímku (videoWidth/videoHeight)

    return { video, error: null };
}

/**
 * Preloží chybu z getUserMedia na zrozumiteľnú správu.
 * Vstup:  err — výnimka (DOMException) z getUserMedia.
 * Výstup: text správy (string).
 */
function describeCameraError(err) {
    switch (err.name) {
        case 'NotAllowedError':  return 'Prístup ku kamere bol zamietnutý.';
        case 'NotFoundError':    return 'Kamera nebola nájdená.';
        case 'NotReadableError': return 'Kameru používa iný program.';
        default:                 return `Kameru sa nepodarilo spustiť (${err.name}).`;
    }
}
