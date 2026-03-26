# PR0 — Decisione scope Admin Mobile (no implementazione feature)

Data audit: 2026-03-26.

## 1) Accesso web

**OK**. Accesso remoto verificato con `git ls-remote` e clone shallow del repository web.

## 2) Comandi eseguiti

```bash
git ls-remote https://github.com/clubandplayer-arch/clubandplayer-app.git | head -n 5
tmpdir=$(mktemp -d)
git clone --depth 1 https://github.com/clubandplayer-arch/clubandplayer-app.git "$tmpdir/clubandplayer-app"
# lettura file admin web richiesti
# lettura route admin ads e file guard/auth correlati
```

## 3) File web letti davvero

Pagine admin richieste:
- `app/admin/users/page.tsx`
- `app/admin/verifications/page.tsx`
- `app/admin/reports/page.tsx`
- `app/admin/ads/page.tsx`

API admin richieste:
- `app/api/admin/users/route.ts`
- `app/api/admin/verifications/route.ts`
- `app/api/admin/reports/route.ts` (**non presente** nel repo)
- `app/api/admin/ads/campaigns/route.ts`
- `app/api/admin/ads/campaigns/[id]/route.ts`
- `app/api/admin/ads/targets/route.ts`
- `app/api/admin/ads/creatives/route.ts`
- `app/api/admin/ads/reports/route.ts`

Correlati (guard/admin role + action route collegate dalle pagine):
- `lib/api/admin.ts`
- `lib/api/auth.ts`
- `middleware.ts`
- `app/api/admin/users/status/route.ts`
- `app/api/admin/verifications/[id]/mark-paid/route.ts`
- `app/api/admin/verifications/[id]/approve/route.ts`
- `app/api/admin/verifications/[id]/reject/route.ts`
- `app/api/admin/verifications/[id]/pdf/route.ts`

## 4) Matrice admin web (cosa esiste)

| Area admin web | Funzioni disponibili (reali) | Impatto se manca su mobile | Rischio (operativo/sicurezza) | Priorità |
|---|---|---|---|---|
| Users (`/admin/users`) | Lista utenti per stato (`pending/active/rejected/orphan`), approvazione/rifiuto via update status | Ritardo moderazione utenti quando team è solo mobile, onboarding bloccato | **Alto operativo** (code pending), sicurezza media (minor presidio) | **Must** |
| Verifications (`/admin/verifications`) | Lista richieste club, filtro stato, apri PDF certificato, mark paid, approve/reject con reason | Verifiche club rallentate; rischio blocco monetizzazione/processo trust | **Alto operativo + compliance/process** | **Must** |
| Reports (`/admin/reports`) | Moderazione segnalazioni con filtri, ricerca, paginazione, toggle open/closed | Gestione abuse solo da desktop; tempi risposta più lunghi | **Medio-Alto sicurezza/community** | Must (fase 2) |
| Ads (`/admin/ads`) | CRUD campagne/target/creative, upload asset, debug slot, report performance | Nessun controllo campagne in mobilità; dipendenza totale da desktop | **Medio operativo/business** | Nice-to-have (fase 2/3) |

## 5) Opzione A (web-only) — pro/contro

### Pro
- Nessun costo UI mobile admin nel breve.
- Minore superficie di attacco lato client mobile.
- Mantiene admin in ambiente desktop più adatto a operazioni complesse (ads/reporting).

### Contro
- Parity mobile formalmente incompleta sul blocco 13.
- Operazioni critiche (approval/verifiche) non eseguibili in mobilità.
- Rischio colli di bottiglia se team operativo usa smartphone-first.

### Impatto parity
- Blocco admin classificato esplicitamente **OUT OF SCOPE mobile**.
- Richiede eccezione documentata nella roadmap parity.

### Condizioni per accettarla
- Policy esplicita: “admin/backoffice web-only by design”.
- SLA operativi coperti da presidio desktop garantito.
- Runbook escalation per attività urgenti fuori orario.

## 6) Opzione B (mobile minimal) — pro/contro

### Pro
- Riduce rischio operativo sulle attività più time-sensitive.
- Copre i casi critici senza replicare tutto il backoffice.
- Migliora resilienza operativa (decisioni/admin in mobilità).

### Contro
- Costo implementativo e QA extra su mobile.
- Necessità hardening permission/admin guard lato API già usata.
- UX da mantenere minimale per evitare complessità da desktop su schermo ridotto.

### Scope minimo consigliato
1. **Users approval minimal**: lista pending + approve/reject.
2. **Verifications minimal**: lista submitted + approve/reject + mark paid + open PDF.
3. Reports e Ads fuori dal primo taglio (fasi successive).

### PR successive necessarie
- **A1**: Admin mobile users approvals (UI minima + wiring API esistenti).
- **A2**: Admin mobile verifications workflow (lista + azioni core + apertura PDF).
- **A3**: Hardening/telemetria + policy rollout (feature flag admin mobile, audit log UI events).

## 7) Raccomandazione finale

**Raccomandata: OPZIONE B (Admin mobile minimal).**

Motivazione: dalle feature web reali, i flussi `users` e `verifications` hanno impatto operativo diretto su attivazione utenti e trust/compliance club; tenerli web-only introduce rischio di backlog e tempi di intervento alti in contesti mobile-first. `reports` e soprattutto `ads` possono invece restare step successivi senza bloccare il core operativo.

## 8) Roadmap conseguente (max 2-3 PR se opzione B)

1. **PR-A1 (must)** — Users approvals mobile minimal.
2. **PR-A2 (must)** — Verifications mobile minimal.
3. **PR-A3 (optional hardening)** — Feature flag + telemetria + audit operativo.

## 9) Conferma

- Nessuna implementazione feature admin in questa PR0.
- Solo decision memo + impatto roadmap.
