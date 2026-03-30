# PR-F4 — Opportunities/Applications production readiness runbook (mobile)

## Scope
- Solo area `opportunities/applications` su mobile.
- Obiettivi:
  1. hardening telemetry end-to-end;
  2. smoke automation minima per flussi critici;
  3. catalogo error copy UX apply;
  4. checklist release/handoff.

## Pre-merge checks
- [ ] Branch allineato e PR pulita su sole modifiche opportunities/applications + docs/test harness.
- [ ] TypeScript pulito: `npx tsc --noEmit`.
- [ ] Smoke PR-F4 green: `pnpm run smoke:opportunities`.
- [ ] Nessun errore raw backend mostrato in UX apply.
- [ ] Eventi telemetry verificati con payload minimo coerente (`opportunityId`, `surface`, `outcome`, `timestamp`).

## Test commands
- `npx tsc --noEmit`
- `pnpm run typecheck`
- `pnpm run smoke:opportunities`

## Error copy catalog (apply)
| Trigger principale | Messaggio UX |
|---|---|
| `409` o testo simile a `already applied` | `Hai già inviato la candidatura.` |
| `404` o testo simile a `not found` | `Questa opportunità non è più disponibile.` |
| `401/403` o testo simile a `cannot apply to your own opportunity` / `not allowed` | `Non puoi candidarti a questa opportunità.` |
| `429` | `Hai effettuato troppi tentativi. Riprova tra poco.` |
| Fallback | `Impossibile inviare la candidatura. Riprova.` |

## Manual QA steps
1. **Apply success** (player): applica da lista o dettaglio -> stato UI `Candidatura inviata`.
2. **Apply failure**: forza 401/403/404 -> verifica copy UX da catalogo (no testo backend raw).
3. **Apply idempotent (409)**: reinvia candidatura già inviata -> UI resta in stato applicata e telemetry outcome `success_idempotent`.
4. **Applications open telemetry**:
   - `/my/applications` -> `surface=my_applications`
   - `/club/applications` -> `surface=club_applications`
   - `/opportunities/[id]/applications` -> `surface=opportunity_applications`

## Rollback notes
- Rollback a commit precedente PR-F4 ripristina:
  - payload telemetry legacy e assenza consumer hardening;
  - assenza smoke automation PR-F4;
  - assenza catalogo error copy centralizzato.
- Nessuna migration DB o modifica API server-side in questa PR.

## Handoff
- Condividere il doc con QA e prodotto prima del merge.
- Richiedere evidenze smoke (output CLI + breve check manuale dei 4 scenari).
