# Používateľská príručka

*Katedra počítačov a informatiky, Fakulta elektrotechniky a informatiky, Technická univerzita v Košiciach*
*Predmet: Počítačová grafika · Šk. rok: 2026/2027 · Autor: Vladyslav Krykun · Učiteľ: TODO*

> Pracovná verzia v Markdowne, píše sa priebežne s kódom. Pred odovzdaním sa prevedie do PDF
> (titulná strana podľa pokynov, číslovanie strán). Štýl: 1. osoba množného čísla.

## 1. Obsah
Doplní sa pri prevode do PDF.

## 2. Funkcia programu
TODO (V1).

## 3. Inštalácia programu

### 3.1 Súpis obsahu dodávky
TODO: obsah zip balíka.

### 3.2 Požiadavky na technické prostriedky
- webkamera (bez nej program funguje len s myšou);
- grafická karta s podporou WebGL 2.

### 3.3 Požiadavky na programové prostriedky
- prehliadač Chrome alebo Edge (aktuálna verzia);
- Node.js 24 LTS (na spustenie lokálneho servera).

### 3.4 Vlastná inštalácia
TODO: `npm ci`, `npm run dev`, povolenie prístupu ku kamere v prehliadači.

## 4. Použitie programu

### 4.1 Náhľad kamery a stav ruky
Vpravo dole je náhľad kamery (zrkadlový obraz). Keď je ruka v zábere, kreslí sa na ňu
21 bodov; špička ukazováka je červená. Farba rámika ukazuje stav sledovania ruky:

| Rámik | Význam |
|---|---|
| zelený | ruka je v zábere |
| oranžový | ruka na chvíľu vypadla (body sú bledšie), program ešte čaká |
| červený | ruka nie je v zábere |

Vľavo hore je panel výkonu: snímky vykreslenia za sekundu a frekvencia a trvanie detekcie ruky.

Pre spoľahlivé sledovanie ruky odporúčame dobré osvetlenie a ruku celú v zábere.

## 5. Popis vstupných a výstupných súborov
Program nečíta ani nezapisuje súbory používateľa.

## 6. Obmedzenia programu
TODO. Frekvenciu sledovania ruky obmedzuje kamera (niektoré kamery notebookov dávajú ~15 snímok/s).

## 7. Chybové hlásenia

| Hlásenie (konzola prehliadača) | Príčina | Riešenie |
|---|---|---|
| Kamera nedostupná → myš. Prístup ku kamere bol zamietnutý. | prístup ku kamere zamietnutý | povoliť kameru pri ikone v paneli adresy, obnoviť stránku |
| … Kamera nebola nájdená. | počítač nemá kameru | ovládať myšou |
| … Kameru používa iný program. | kameru drží iná aplikácia | zatvoriť ju, obnoviť stránku |
| Model ruky nedostupný → myš. | wasm alebo model sa nenačítal | spustiť `npm ci` (skopíruje wasm), obnoviť stránku |

TODO: zobraziť hlásenia aj v aplikácii, nielen v konzole.

## 8. Príklad použitia
TODO: snímky obrazovky.
