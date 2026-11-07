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

V hornej časti náhľadu sú riadky textu: prvý (`cast`) ukazuje stav kúzla (pozri 4.2),
ďalšie sú pomocné čísla o ruke (otvorenosť, smer dlane, rýchlosť) na ladenie.

Vľavo hore je panel výkonu: snímky vykreslenia za sekundu a frekvencia a trvanie detekcie ruky.

Pre spoľahlivé sledovanie ruky odporúčame dobré osvetlenie (svetlo dopadá na ruku, nie
spoza nej ani priamo do kamery) a ruku celú v zábere. Pri slabom svetle kamera predlžuje expozíciu: dáva menej
snímok za sekundu (napr. 16 namiesto 30) a obraz pri pohybe rozmazáva, takže sa ruka pri
rýchlych pohyboch stráca. Ak kamera dlhšie ako 3 s dáva menej ako 22 snímok/s, hore
v strede sa zobrazí oranžové upozornenie „Málo svetla“; po rozsvietení samo zmizne.

### 4.2 Kúzlenie gestami (oheň)
Kúzlo sa kúzli pravou rukou v troch krokoch — inšpirované ohýbaním ohňa zo seriálu
„Avatar: The Last Airbender“ (priame, prudké údery):

1. **Zber:** zovri ruku v päsť a podrž ju chvíľu nehybne. V náhľade kamery sa v riadku `cast`
   plní pásik `🔥 zber █████` (asi 0,4 s).
2. **Mierenie:** keď sa ukáže `🔥 mieri`, pohybuj päsťou — kúzlo mieri tam, kam ruka
   (ako v zrkadle: ruka doprava = cieľ doprava). Cieľ ukazuje oranžový krúžok na zemi
   (zobrazí sa už počas zberu).
3. **Výstrel:** prudko udri päsťou smerom ku kamere a pri tom otvor dlaň. Zobrazí sa `🔥 VÝSTREL!`.

Kúzlo **zrušíš** (zobrazí sa `✖ zrušené`) ktorýmkoľvek z týchto spôsobov:
- rýchly švih rukou do strany („striasť“ kúzlo);
- pomaly povolíš päsť a necháš dlaň otvorenú (oheň zhasne);
- dáš ruku preč zo záberu kamery.

Po výstrele alebo zrušení môžeš o pol sekundy začať nový zber. Samotné otvorenie dlane ani
pomalý pohyb ku kamere nevystrelí — výstrel potrebuje päsť, prudký pohyb a otvorenie naraz.
Úder rob tak, aby ruka ostala v zábere (nie príliš blízko ku kamere).

Bez kamery (alebo keď sa nekúzli rukou) ukazuje krúžok na zemi miesto pod kurzorom myši.
Zem je kopcovitý terén; krúžok leží na svahu tak, ako je svah naklonený.
Scénu otáčaš ťahaním myšou, približuješ kolieskom.

## 5. Popis vstupných a výstupných súborov
Program nečíta ani nezapisuje súbory používateľa.

## 6. Obmedzenia programu
TODO. Frekvenciu sledovania ruky obmedzuje kamera; pri slabom svetle kamery notebookov dávajú
~15 snímok/s namiesto 30 (pozri 4.1).

## 7. Chybové hlásenia

| Hlásenie (konzola prehliadača) | Príčina | Riešenie |
|---|---|---|
| Kamera nedostupná → myš. Prístup ku kamere bol zamietnutý. | prístup ku kamere zamietnutý | povoliť kameru pri ikone v paneli adresy, obnoviť stránku |
| … Kamera nebola nájdená. | počítač nemá kameru | ovládať myšou |
| … Kameru používa iný program. | kameru drží iná aplikácia | zatvoriť ju, obnoviť stránku |
| Model ruky nedostupný → myš. | wasm alebo model sa nenačítal | spustiť `npm ci` (skopíruje wasm), obnoviť stránku |
| Málo svetla — kamera dáva N snímok/s. (v aplikácii) | slabé osvetlenie → dlhá expozícia kamery | rozsvietiť izbu, svetlo na ruku |

TODO: zobraziť hlásenia aj v aplikácii, nielen v konzole.

## 8. Príklad použitia
TODO: snímky obrazovky.
