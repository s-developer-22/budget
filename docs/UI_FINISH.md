# Ultima passata UI/UX

## Modifiche applicate

- Eliminato completamente il calendario duplicato: rimane un solo controllo mese con titolo e frecce.
- Fase in pill larga quanto il contenuto, alta 40 px, padding orizzontale 16 px e chevron Lucide. Selettore nativo accessibile sovrapposto con target da 44 px; focus visibile.
- Colonna data con soli numeri o intervalli: nessuna etichetta DATA, GIORNI o DOPO.
- Unica utility UI formatMoney: simbolo euro prima dell’importo, separatori italiani, due decimali, segno delle entrate prima del simbolo. Centesimi preservati senza conversione in virgola mobile; numeri tabulari in tutta la UI.
- Gate integrato nella checklist, testo sulla stessa X dei titoli, superficie verde tenue, radius 8 px, nessuna ombra. Nel caso standard, altezza 56 px.
- CTA “Conserva i dati sul dispositivo”.
- “Applica aggiornamento” visibile solo con segnalazione di aggiornamento e un service worker realmente installato in attesa. Nello stato normale: “App aggiornata”.
- Importi del riepilogo su una sola riga; tipografia landscape a 28 px per il nuovo formato. Colonne, baseline, padding e spacing controllati nei due orientamenti.
- Nessuna nuova card e nessuna modifica ai colori principali. Domain engine, demo, schema finanziario, stato applicativo e persistenza conservati byte per byte, verificati tramite SHA-256.

## Test

- npm run typecheck: passato.
- npm test: 33 test passati in 3 suite, inclusi 4 test esclusivamente di presentazione monetaria.
- npm run qa: passate le 6 combinazioni browser/viewport già previste.
- npm run review: passate le 4 combinazioni iPad con etichette lunghe, sezioni aperte e safe area simulate.
- node scripts/ui-qa.mjs: passati Chromium e WebKit a 744 × 1133 e 1133 × 744. Screenshot Mese, Piano e Dati ispezionati; nessun overflow orizzontale, coordinate X e baseline delle righe con scarto inferiore a 1 px, controlli almeno 44 × 44 px.
- Aggiornamento PWA reale verificato in Chromium su origine di test: primo caricamento senza pulsante, nuovo worker installato in attesa con pulsante visibile, attivazione e ritorno a “App aggiornata”. Nessuna modifica al service worker di produzione durante il test.

## Build

npm run build passato. App, manifest e service worker generati. Anteprima locale e archivi sorgenti/build aggiornati al risultato finale.

## Limiti residui

Verifica browser con viewport iPad, senza dispositivo fisico. L’offline iPadOS resta non verificato per il limite WebKit Windows già documentato. Nessuna modifica alle regole o ai limiti finanziari preesistenti.
