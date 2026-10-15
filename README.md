# Budget

Planner mensile React e TypeScript, locale e offline. La checklist è centrale; i calcoli teorici sono indipendenti dalle checkbox. Nessun backend, login, analytics o connessione bancaria.

## Avvio

Richiede Node 22.12+ e npm.

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

Importa una configurazione JSON schema v1 dal tuo dispositivo, oppure apri il piano dimostrativo interamente fittizio. Scegli esplicitamente la fase di ciascun mese. La vista Piano è consultiva.

## Privacy e backup

La configurazione viene conservata in IndexedDB nell’origine del browser. L’importazione non invia file in rete. Backup locali contengono piano, fasi, checkbox e preferenze: conservali privatamente. Cambiare origine, browser o dispositivo crea un archivio distinto. Il browser può rimuovere dati locali; mantieni copie di backup.

I file privati sono esclusi da Git. Non collocare configurazioni o backup in src, public, fixture o asset. Gli allegati di progetto non fanno parte del repository. Il service worker memorizza soltanto la shell pubblica e gli asset generati.

## Proiezioni e limiti

Ogni mese richiede una fase manuale; nessuna fase viene avanzata automaticamente. Fasi mancanti o incomplete producono valori non determinabili dove necessario. Quote prive di modalità operativa rimangono informative. Non vengono inventati saldi finali della carta, ammortamenti, rendimenti, destinazioni o cessazioni di rate.

Spese annuali con mese noto e giorno non definito compaiono separatamente e concorrono al riepilogo di fine mese. Voci completamente prive di calendario restano riferimenti. Giorni nominali assenti nel calendario non vengono spostati automaticamente: la UI segnala il limite.

## Pubblicazione su GitHub Pages

Il repository include `.github/workflows/deploy.yml`. A ogni push su `main` il workflow:

1. installa le dipendenze con `npm ci`;
2. blocca la release se rileva file privati tracciati;
3. esegue typecheck e test;
4. determina automaticamente il base path di GitHub Pages;
5. crea la build production;
6. controlla `dist/` per evitare la pubblicazione accidentale di dati privati;
7. pubblica l'artifact su GitHub Pages.

In GitHub abilita **Settings → Pages → Source: GitHub Actions**. Non pubblicare mai il piano finanziario o i backup. L’offline richiede un primo caricamento completo da HTTPS o localhost.

### Installazione su iPad

Apri la URL GitHub Pages in Safari, quindi **Condividi → Aggiungi alla schermata Home**. Dopo l'installazione importa il piano privato dall'interfaccia. Il piano resta in IndexedDB nell'origine dell'app.

Per una checklist di rilascio completa vedi `docs/RELEASE_CHECKLIST.md`.

## File principali

- src/domain/schema.ts: schema e controlli di integrità
- src/domain/engine.ts: operazioni e proiezioni pure
- src/persistence/store.ts: IndexedDB e transazioni
- src/application/backup.ts: importazione e backup
- src/ui/App.tsx e styles.css: viste e layout tablet
- tests: fixture fittizie e verifiche
- docs/IMPLEMENTATION_PLAN.md: architettura e limiti

Font e icone sono locali; Lucide è l’unica famiglia di icone. Per QA: `npm run qa`, `npm run review` e `node scripts/ui-qa.mjs` con browser Playwright disponibili, dopo aver avviato `npm run preview`. La QA produce solo immagini di dati fittizi. La review aggiunge etichette lunghe, safe area simulate, sezioni aperte, scadenze periodiche e importazione del piano. L’ultima passata UI/UX è descritta in `docs/UI_FINISH.md`.

Riferimenti tecnici: [Vite PWA](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements), [idb](https://github.com/jakearchibald/idb), [Vite base](https://vite.dev/guide/build).
