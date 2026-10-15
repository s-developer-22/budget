# Report di implementazione e verifica

Per l’ultima passata esclusivamente UI/UX, vedere `UI_FINISH.md` (33 test e selettore mese unico).

Verifica eseguita il 5 ottobre 2026 e aggiornata dopo la review finale descritta in `FINAL_REVIEW.md`. Il progetto è stato creato da zero: nella cartella iniziale non era presente un repository applicativo.

## Implementato

- React, TypeScript strict e Vite, senza backend, login, analytics o font remoti.
- Schema v1 e validazione di centesimi interi, versioni, riferimenti, identificatori, ruoli, calendario e regole di comportamento.
- Motore puro per checklist cronologica, identificatori deterministici e proiezioni teoriche. Le checkbox non sono un input finanziario.
- Fasi selezionate manualmente per ogni mese; nessun avanzamento automatico o fase dedotta per i mesi non configurati.
- Gate accrediti informativo, senza impedire i trasferimenti. Le quote prive di esecuzione definita restano informative.
- IndexedDB v1 con archivi per configurazione, fasi mensili, checkbox, preferenze e metadati.
- Importazione JSON locale validata; conferma della sostituzione; backup completo versionato; restore transazionale; reset con conferma.
- Vista Mese: checklist, progresso, conti e destinazioni, finalità, dettagli collassabili e riepilogo esplicitamente teorico.
- Vista Piano: conti, valori iniziali, entrate, addebiti, movimenti comuni, scadenze, fasi e debiti informativi.
- Vista Dati: import/export, backup, archivio locale, conservazione dei dati, stato PWA e reset.
- Manifest, icone installabili, service worker e cache della sola shell pubblica. Aggiornamenti applicati con un controllo esplicito.
- Demo interamente fittizia, con banner visibile e dati indipendenti dal pacchetto privato.

## iPad mini portrait — 744 × 1133

Verificato in Chromium e WebKit: margini laterali di 24 px, colonna unica, checklist prima di dettagli e riepilogo, navigazione inferiore, scroll naturale e nessun overflow orizzontale. Le coordinate delle colonne descrizione, importo e checkbox sono coerenti, con scarto inferiore a 1 px tra le righe. I controlli hanno target almeno 44 × 44 px. Screenshot della demo ispezionati e rifiniti, incluse le baseline della prima riga e l’allineamento con le checkbox.

## iPad mini landscape — 1133 × 744

Verificato in Chromium e WebKit: rail di 88 px, split circa 62/38, gutter di 24 px, riepilogo sticky e un solo scroll della pagina. Importi e checkbox condividono colonne stabili. Il riepilogo usa card compatte coerenti e diventa interamente consultabile durante lo scroll. Nessun overflow orizzontale.

È verificato anche il fallback telefono a 390 × 844 in entrambi i motori. La verifica usa viewport browser; non è stata eseguita su un iPad fisico e non costituisce una certificazione completa WCAG.

## Comandi realmente eseguiti sul risultato finale

| Comando | Risultato |
| --- | --- |
| npm install | Passato; audit: zero vulnerabilità |
| npm run typecheck | Passato |
| npm test | Passato: 29 test, 2 suite |
| npm run build | Passato: app, manifest e service worker generati |
| npm run qa | Passato: 6 combinazioni di viewport e motore browser |
| npm run review | Passato: 4 combinazioni iPad; stress delle etichette e safe area, import piano, scadenze, focus e fasi |
| npm run lint | Non presente nel progetto |

I primi tentativi di installazione e caricamento configurazione hanno incontrato limiti del sandbox Windows; cache npm nel workspace e caricamento Vite con runner li hanno risolti. Tutti i comandi richiesti sono stati successivamente rieseguiti con successo. Gli avvisi di annotazione Rollup in Zod e quello npm sugli script di installazione non impediscono typecheck, test o build.

I test coprono money, ricorrenze, ordinamento, ID deterministici, fasi, scadenze annuali, riserva interna, saldo principale e quota operativa, capitale PAC, fondo cumulato, indipendenza dalle checkbox, gate, schema, backup e persistenza tra connessioni IndexedDB. La QA browser verifica anche cambi fase, isolamento mensile, reload, file invalidi, annullamento importazione, conferma restore e backup scaricato.

Il piano privato è stato validato separatamente fuori dal repository: schema, aritmetica rispetto al MASTER, scadenze periodiche e protezioni delle fasi incomplete. Nessun valore personale è riportato in questo report.

## PWA e offline

- Manifest standalone e icone PNG disponibili; registrazione service worker verificata.
- Chromium: reload senza rete, navigazione, aggiornamento checkbox e successivo reload verificati sui tre viewport.
- WebKit Windows: layout, persistenza e interazioni verificati; l’emulazione offline durante reload genera un errore interno del motore. L’offline WebKit/iPadOS non è dichiarato verificato.
- Build e test dedicato su sottopercorso `/budget/`: asset, manifest scope/start URL, service worker e reload offline passati. Compatibilità con base GitHub Pages verificata localmente; nessuna pubblicazione effettuata.
- Cache ispezionata: contiene esclusivamente shell e asset pubblici; nessun piano privato o backup.

## Privacy

- Regole del template applicate al `.gitignore`: cartelle private, configurazioni e backup finanziari esclusi.
- Allegati e script di validazione privata restano in `work/`, fuori dal repository consegnato; `work/` è esclusa anche dal `.gitignore` della cartella di lavoro.
- Verificato `git check-ignore` sui pattern richiesti e `git status`: nessun file finanziario privato incluso; nessun file staged, nessun commit o invio remoto.
- Scansione di sorgenti, public, test, demo, documentazione e build: nessun identificatore o etichetta personale del piano allegato.
- Screenshot esclusivamente della demo; QA esclusa dal versionamento.

## Limiti lasciati espliciti

- Modalità bancaria delle quote extra nelle fasi incomplete: non inventata.
- Cessazione della rata ricorrente a seguito del cambio fase: non dedotta. Il saldo dipendente da questa regola resta non determinabile.
- Allocazione della fase non definita: nessuna operazione di fase inventata.
- Mesi senza fase: proiezioni cumulative dipendenti dalla fase non determinabili; collegamenti ai mesi da configurare.
- Scadenza con mese noto e giorno indefinito: voce senza data inventata; inclusa nella riserva di fine mese.
- Spese prive di qualsiasi calendario: riferimenti informativi, senza sottrazioni automatiche.
- Giorni nominali assenti nel calendario del mese: segnalati senza spostarli autonomamente; proiezioni dipendenti dalla data non determinabili.

## File principali

- `src/domain/schema.ts`: schema, tipi e integrità del piano/backup.
- `src/domain/engine.ts`: checklist e proiezioni pure.
- `src/persistence/store.ts`: IndexedDB e transazioni.
- `src/application/useBudget.ts`: stato applicativo e gestione salvataggi.
- `src/application/backup.ts`: importazione e backup locali.
- `src/ui/App.tsx`, `src/ui/Icon.tsx`, `src/ui/styles.css`: viste, icone e layout.
- `vite.config.ts`: PWA, cache e base di deployment.
- `tests/`, `scripts/qa.mjs`: test e QA ripetibile.
- `docs/IMPLEMENTATION_PLAN.md`: piano iniziale e decisioni conservative.
