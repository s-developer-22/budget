# Release audit — Budget v1.0.0

Data audit: 2026-10-09.

## Source package

- Nessun `budget-plan-v1.json` incluso.
- Nessun `budget-backup-*.json` incluso.
- Nessun file `*.private.json` o `*.local-finance.json` incluso.
- Nessuna cartella `private/`, `.git/`, `dist/` o `node_modules/` prevista nel pacchetto release.
- Ricerca statica dei dati identificativi del piano privato: nessuna corrispondenza nei sorgenti pubblici.
- Demo e test restano fittizi.

## Release infrastructure

Aggiunto `.github/workflows/deploy.yml` con gate obbligatori prima del deploy:

1. `npm ci`
2. privacy guard sui file tracciati
3. `npm run typecheck`
4. `npm test`
5. risoluzione automatica del base path GitHub Pages
6. `npm run build`
7. audit dei file privati in `dist/`
8. deploy tramite GitHub Pages Actions

Il deploy non viene eseguito se uno dei controlli fallisce.

## Controlli eseguiti in questo ambiente

- parsing YAML del workflow: PASS
- controllo sintattico TypeScript/TSX tramite transpile TypeScript: PASS
- audit statico privacy del pacchetto sorgente: PASS

## Limite dell'ambiente di audit

Il registry npm non è raggiungibile correttamente da questo ambiente, quindi non è stato possibile completare qui una nuova installazione delle dipendenze e rieseguire `typecheck`, test e build production.

Questi controlli sono pertanto obbligatori nel workflow GitHub Actions prima di qualsiasi deploy pubblico. Una build che non supera i gate non viene pubblicata.
