# Review finale funzionale e visuale

Questo report descrive la review precedente. Le successive modifiche esclusivamente UI/UX e i risultati aggiornati sono in `UI_FINISH.md`; il calendario duplicato è stato eliminato completamente.

Eseguita il 5 ottobre 2026. Confronto con MASTER_FINANZIARIO_PWA_v1.0.md, CODEX_MASTER_BUDGET_PWA_v1.2.md, APPLE_UI_ALIGNMENT_SPEC.md e riferimento PNG. Il MASTER governa il motore finanziario; l’immagine governa estetica e gerarchia. Gli allegati finanziari rimangono fuori dal repository e dai pacchetti consegnati.

## Problemi trovati e correzioni

| Problema | Correzione effettuata |
| --- | --- |
| Riepilogo landscape troppo denso, icone e testi ridotti | Padding delle metriche a 16 px, contenitori delle icone a 32 px, icone a 20 px, importi a 30 px con line-height 40 px; gerarchia leggibile |
| Altezza delle etichette variabile e importi del riepilogo sfalsati con nomi lunghi | Altezza comune misurata, arrotondata alla griglia di 4 px; baseline degli importi coerenti anche con etichette multilinea |
| Riepilogo sticky più alto della finestra: rischio di contenuto finale irraggiungibile | Posizione sticky adattiva all’altezza effettiva, con un solo scroll della pagina e accesso all’intero riepilogo |
| Righe più alte del necessario; finalità duplicata rispetto alla descrizione | Righe standard circa 72 px, righe estese almeno 96 px; rimosse solo le ripetizioni identiche |
| Giorno, importo e prima riga non uniformi tra orientamenti | Font e struttura della prima riga uniformi; colonne fisse, prima riga e target checkbox da 44 px |
| Contrasto attenuato dopo la spunta | Rimossa la riduzione di opacità; completamento riconoscibile con colore e spunta |
| Navigazione inferiore troppo alta | Altezza a 72 px più inset inferiore, target conservati; contenuto finale protetto dal padding della pagina |
| Cambio vista o mese conservava lo scroll precedente | Ripristino dello scroll all’inizio su cambio vista, mese o piano; spunte e cambio fase non spostano la pagina |
| Ripristino del focus nei dialog incompleto | Cattura del controllo attivo prima dell’apertura, titolo accessibile e ritorno del focus dopo annullamento |
| Errori delle API storage o del download non gestiti | Gestione degli errori e degli ambienti senza API; import disabilitato se lo storage non è disponibile; limite del file controllato prima della lettura |
| Ordinamento a parità di giorno dipendente dagli identificatori | Ordine della configurazione mantenuto, addebiti prima degli accrediti e accantonamento interno dopo i trasferimenti |
| Protezioni delle proiezioni troppo dipendenti dall’etichetta di stato della fase | Guard esplicito ed esecuzione non definita rispettati anche su fasi dichiarate definite |
| Trasferimento con giorno nominale inesistente poteva produrre un contributo numerico | Metriche dipendenti rese non determinabili; nessun giorno alternativo inventato |
| Checklist del backup non limitata all’orizzonte configurabile | Validazione dello stesso orizzonte applicato a mese e fasi |
| Errore ResizeObserver emerso nello stress delle etichette | Misure applicate nel frame successivo e scritture solo quando il valore cambia |
| Due icone calendario nel selettore mese | Conservata l’icona Lucide e nascosta la seconda icona nativa, mantenendo l’area cliccabile del picker |

## Verifica visuale

Schermate Mese, Piano e Dati controllate in Chromium e WebKit Windows, nelle due risoluzioni iPad richieste. Sono stati ispezionati gli screenshot normali e quelli con sezioni aperte ed etichette fittizie molto lunghe. Controllati anche onboarding e dialog durante i flussi di importazione.

Portrait 744 × 1133: margini di 24 px, contenuto largo 696 px, mese dominante, fase sopra il progresso, checklist centrale e riepilogo successivo. Importi, descrizioni e checkbox condividono le rispettive coordinate X con scarto inferiore a 1 px. Navigazione inferiore da 72 px più safe area. Nessun overflow orizzontale.

Landscape 1133 × 744: rail da 88 px, margini da 24 px, checklist larga circa 601,6 px, riepilogo circa 371,4 px, gutter di 24 px. La divisione utile è 61,8% / 38,2%. Le due colonne partono alla stessa Y, con scarto inferiore a 1 px. Il riepilogo rimane consultabile fino alla fine, senza scroll interno.

Griglia da 4 px applicata a spacing e dimensioni strutturali; bordi da 1 px e dimensioni tipografiche sono intenzionali. Icone Lucide da 20 px con stroke comune, contenitori da 32 px, checkbox visive da 28 px in target da 44 px. Le verifiche misurano controlli almeno 44 × 44 px. Safe area superiore di 20 px e inferiore di 24 px simulate: contenuto finale raggiungibile e non coperto. Fallback telefono 390 × 844 verificato nei due motori.

Le misure geometriche riguardano il DOM nei motori testati, non una garanzia universale di rasterizzazione identica su hardware diverso. Non è stato utilizzato un iPad fisico.

## Verifica funzionale

- Cambio mese con pulsanti e selettore nativo, stato mensile separato; fase manuale, nessun avanzamento automatico.
- Gate 0/2, 1/2 e 2/2; trasferimenti eseguibili anche prima del gate completo, come specificato.
- Spunte persistenti, fase persistente, refresh e riapertura della pagina con IndexedDB conservato.
- Tutte le metriche teoriche invariate dopo la spunta; il motore non riceve le checkbox.
- Checklist cronologica, stessi ID delle operazioni comuni tra le fasi, quote incomplete informative.
- Riserva interna, mesi con spesa periodica a data nota e con giorno indefinito, saldo teorico principale, PAC e fondo cumulativi verificati.
- Tutte le quattro fasi demo e i guard delle fasi incomplete; valori dipendenti mostrati come “Da definire”.
- Importazione di un piano valido, sostituzione, JSON sintatticamente invalido e schema invalido, annullamento senza sostituzione.
- Export scaricato, contenuto del backup verificato, restore e successiva persistenza.
- Configurazione privata validata separatamente rispetto al MASTER: primo mese, riserva nei mesi periodici e fasi incomplete. Nessun valore personale riportato nei test o nel report.

## Comandi e risultati

| Comando realmente eseguito | Risultato |
| --- | --- |
| npm install | Passato |
| npm run typecheck | Passato |
| npm test | 29 test passati, 2 suite |
| npm run build | Passato, manifest e service worker generati |
| npm run qa | 6 combinazioni passate: Chromium/WebKit × portrait/landscape/telefono |
| npm run review | 4 combinazioni iPad passate con importazione, scadenze, tutte le fasi, etichette lunghe, sezioni aperte, focus e safe area |
| npm run lint | Script non presente |

Gli avvisi Rollup sulle annotazioni della dipendenza Zod e l’avviso npm sugli script di installazione non impediscono i comandi; nessun errore applicativo rilevato nelle sessioni browser finali.

## PWA e offline

Manifest standalone, icone, registrazione e cache della shell verificati. In Chromium: rete disabilitata, risposta del service worker al reload, navigazione, modifica e persistenza checkbox, refresh e riapertura verificati su tutti e tre i viewport. Build e verifica locale del sottopercorso `/budget/` con asset, manifest e reload offline passati.

WebKit Windows passa layout, flussi, refresh e riapertura con dati conservati. Il reload con rete disabilitata causa un errore del motore di emulazione: l’offline su WebKit/iPadOS e il lancio da icona Home su un iPad fisico restano da verificare sul dispositivo. La riapertura testata consiste in una nuova pagina nello stesso profilo browser, non nella terminazione del sistema operativo.

## Privacy

`budget-plan-v1.json` non è in src, public, fixture, demo, test, documentazione, dist o archivi consegnati. Configurazioni e backup privati esclusi da Git con i pattern del template; verifica tramite git check-ignore e inventario dei file tracciati. Nessun commit o file staged; nessun invio remoto.

Scansione del codice pubblico e del bundle confrontata con identificatori, nomi dei conti e descrizioni delle entrate del file privato: nessuna corrispondenza personale. Cache browser priva di configurazioni finanziarie e backup. Screenshot e input dei test browser interamente fittizi. Gli allegati e gli script di controllo privati sono conservati esclusivamente in work, fuori dal progetto.

## Limiti finanziari mantenuti

Esecuzione delle quote extra, cessazione delle rate e allocazioni delle fasi non definite non sono state inventate. Mesi privi di fase lasciano indeterminate le proiezioni dipendenti. Giorni mancanti non vengono dedotti; spese senza calendario restano informative. Nessuna ottimizzazione della strategia, modifica degli importi, stima del saldo residuo della carta o valorizzazione di mercato.

## File della review

Correzioni in src/ui/App.tsx, src/ui/styles.css, src/domain/engine.ts e src/domain/schema.ts. Verifiche aggiunte in tests/domain.test.ts, scripts/qa.mjs e scripts/review.mjs. Report strutturati e screenshot fittizi in qa-results, esclusa dal versionamento e dal pacchetto sorgenti.
