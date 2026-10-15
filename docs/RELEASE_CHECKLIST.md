# Release checklist — Budget v1.0.0

## Automatico in GitHub Actions

- [ ] `npm ci`
- [ ] privacy guard sui file tracciati
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] base path GitHub Pages
- [ ] `npm run build`
- [ ] audit privacy di `dist/`
- [ ] upload artifact Pages
- [ ] deploy Pages

Se uno dei controlli fallisce, il deploy non viene eseguito.

## Dopo il primo deploy

Su iPad mini 6:

- [ ] aprire la URL GitHub Pages in Safari
- [ ] importare il piano privato dal dispositivo
- [ ] verificare ottobre 2026 e la fase scelta
- [ ] controllare portrait 744×1133
- [ ] controllare landscape 1133×744
- [ ] Safari → Condividi → Aggiungi alla schermata Home
- [ ] riaprire dalla Home Screen
- [ ] attivare modalità aereo / offline e riaprire l'app
- [ ] verificare persistenza fase e checkbox
- [ ] esportare un backup JSON

## Nota

Il piano privato non deve essere aggiunto al repository nemmeno per comodità di deploy. Va importato dall'interfaccia dopo l'apertura della PWA.
