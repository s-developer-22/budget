# Privacy — Budget v1.0.0

Budget è una PWA **local-first**.

## Dove sono conservati i dati

Il piano importato, le fasi mensili, le checkbox e le preferenze vengono salvati nel browser tramite IndexedDB. Non è previsto alcun backend, account, login, database remoto, analytics o collegamento bancario.

## Repository pubblico

Il repository contiene soltanto applicazione, schema, demo fittizia, test e documentazione tecnica. Il piano personale e i backup non devono essere versionati.

Pattern esclusi da Git:

```gitignore
private/
*.private.json
budget-plan-v1.json
budget-backup-*.json
*.local-finance.json
```

Il workflow GitHub Pages esegue inoltre un controllo prima della build e un secondo audit sulla cartella `dist/` prima del deploy.

## Service worker

Il service worker conserva soltanto application shell e asset pubblici necessari al funzionamento offline. I dati del piano non vengono copiati nella cache del service worker.

## Backup

Il backup JSON viene creato localmente dall'utente e contiene dati privati. Va conservato in un luogo appropriato e non caricato nel repository pubblico.

## Cancellazione dati

La cancellazione dei dati del sito/browser può eliminare IndexedDB. Per questo è consigliabile esportare periodicamente un backup JSON, soprattutto prima di modifiche al browser, al dispositivo o all'origine web dell'app.
