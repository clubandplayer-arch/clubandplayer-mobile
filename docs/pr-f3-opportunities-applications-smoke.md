# PR-F3 — Opportunity workflow reliability & QA instrumentation (mobile)

## Scope
- Solo area **opportunities/applications**.
- Verifiche target:
  - apply da lista opportunità;
  - apply da dettaglio opportunità;
  - apertura schermate candidature (`/my/applications`, `/club/applications`, `/opportunities/[id]/applications`);
  - error messaging apply normalizzata lato UX.

## Checklist QA manuale

### 1) Apply da lista opportunità (player)
- [ ] Aprire tab `Opportunities` come player con almeno una opportunity applicabile.
- [ ] Inserire nota opzionale e premere `Candidati`.
- [ ] Atteso:
  - bottone passa a stato invio (`Invio...`);
  - su successo compare badge `Candidatura inviata`;
  - eventuale errore mostra messaggio UX-friendly (mai testo backend raw).

### 2) Apply da dettaglio opportunità (player)
- [ ] Aprire `/opportunities/[id]` su opportunity non propria.
- [ ] Premere `Candidati`.
- [ ] Atteso:
  - stato UI coerente con lista (invio, applicata, errore);
  - su duplicate apply (HTTP 409) lo stato diventa comunque `Candidatura inviata`.

### 3) Error messaging apply
- [ ] Forzare errori applicativi (es. opportunity non trovata / non autorizzato / rate limit).
- [ ] Atteso:
  - 404 -> "Questa opportunità non è più disponibile."
  - 401/403 -> "Non puoi candidarti a questa opportunità."
  - 409 -> "Hai già inviato la candidatura."
  - fallback -> "Impossibile inviare la candidatura. Riprova."

### 4) Telemetry minima
- [ ] Verificare in dev console gli eventi:
  - `application_submit_attempt`
  - `application_submit`
  - `application_submit_failed`
  - `applications_open`
- [ ] Controllare payload base coerenti (`source`/`screen`, `opportunity_id`, `status` quando presente).

### 5) Dev-only debug apply state
- [ ] In build dev (`__DEV__ = true`) verificare presenza etichetta `apply_state` su lista/dettaglio.
- [ ] In build production verificare assenza dell'etichetta.

## Smoke commands (mobile)
- `npm run lint`
- `npm run typecheck`
