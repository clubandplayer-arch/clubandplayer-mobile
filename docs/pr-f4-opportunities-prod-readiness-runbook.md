# PR-F4 — Opportunities production readiness runbook (mobile)

## Pre-merge checks
1. Confermare scope PR limitato a opportunities/applications telemetry + club visibility.
2. Verificare assenza label debug `apply_state:*` nel normale flow QA.
3. Verificare coerenza post status-change in:
   - `/club/applications`
   - `/opportunities/[id]/applications`
4. Eseguire i test automatici sotto.

## Test commands
- `npx tsc --noEmit`
- `pnpm run typecheck` (se script presente)
- `pnpm run smoke:opportunities`
- `pnpm run lint` (se script presente)

## Manual QA steps
1. **Apply success**
   - Player applica da lista e da dettaglio opportunità.
   - Atteso: stato candidatura inviato senza regressioni UX.
2. **Apply failure UX**
   - Forzare 401/403/404/429.
   - Atteso: copy UX dal catalogo, mai raw backend error.
3. **409 idempotent**
   - Ripetere apply sulla stessa opportunità.
   - Atteso: stato coerente già candidati + telemetry outcome `idempotent`.
4. **Club visibility coherence**
   - Club cambia stato candidatura da received e da by-opportunity.
   - Atteso: refresh esplicito e allineamento tra schermate, item non perso subito nel flusso standard.
5. **applications_open telemetry**
   - Aprire superfici: my/club/by-opportunity applications.
   - Atteso: evento `applications_open` con payload canonico (`opportunityId`, `surface`, `outcome`, `timestamp`).

## Rollback notes
- Rollback sicuro via revert singolo commit PR-F4.
- Nessuna migrazione DB/API: rollback non richiede interventi backend.
- Dopo rollback, rieseguire smoke `pnpm run smoke:opportunities` per confermare ritorno allo stato precedente.
