# Club applications parity audit (real gap)

## Scope e metodo (no supposizioni)

- Mobile analizzato direttamente nel repo `clubandplayer-mobile` (branch corrente) su:
  - routing e schermate club applications;
  - lista candidati per opportunity;
  - update status candidatura (`accepted/rejected/seen/submitted`) e CTA.
- Web “stato reale” ricostruito **solo** dalla fonte interna già versionata nel repo: `docs/web-to-mobile-pages-spec.md` (che documenta pagine web, endpoint e regole ruoli).
- Limitazione ambiente: nel container non è presente il repo web separato e non è configurato alcun remote git (`git remote -v` vuoto), quindi la validazione web è vincolata alla spec interna.

---

## 1) Mobile reale: cosa esiste oggi

### A. Candidature ricevute lato club
- Schermata dedicata: `app/club/applications.tsx`.
- Caricamento dati: `fetchClubApplicationsReceived({ status, opportunityId })`.
- Filtri disponibili in UI: `pending`, `all`, `accepted`, `rejected`.
- Routing profilo candidato: `/players/[id]`.
- Routing opportunity detail: `/opportunities/[id]`.
- Azioni disponibili: pulsanti diretti `Accetta` / `Rifiuta` con `patchApplicationStatus(appId, "accepted"|"rejected")`.

### B. Lista candidati per singola opportunity
- Schermata dedicata: `app/opportunities/[id]/applications.tsx`.
- Caricamento dati: `fetchOpportunityApplications(id)`.
- Azione stato: pulsante `Cambia stato` con Alert che espone `submitted`, `seen`, `accepted`, `rejected`.
- Routing profilo candidato: `/players/[id]`.

### C. Coerenza routing applicazioni (club vs player)
- Entry role-based: `app/applications/index.tsx`:
  - club -> redirect `/club/applications`
  - player -> redirect `/my/applications`
- Stack route registrate: `app/_layout.tsx` include:
  - `club/applications`
  - `opportunities/[id]/applications`

### D. API/types reali usati dal mobile
- Tipi: `ApplicationStatus`, `ReceivedApplicationItem`, `OpportunityApplicationItem`.
- Endpoint wrapper:
  - `fetchClubApplicationsReceived` -> `GET /api/applications/received`
  - `fetchOpportunityApplications` -> `GET /api/opportunities/[id]/applications`
  - `patchApplicationStatus` -> `PATCH /api/applications/[id]`

---

## 2) Web reale (da spec versionata nel repo)

Dalla `docs/web-to-mobile-pages-spec.md` risultano lato web:

- `/club/applications`:
  - source: `/api/auth/whoami`, `/api/applications/received`, `/api/applications/[id]`
  - parity note esplicita: lista + change status (`accepted/rejected/seen`).
- `/opportunities/[id]/applications`:
  - source: `/api/opportunities/[id]/applications` + `/api/applications/[id]`
  - parity note: lista + status actions.
- `/applications` role-conditional:
  - club usa `/api/applications/received`
  - player usa `/api/applications/me`.
- `/opportunities/new` (club): create opportunity via `POST /api/opportunities`.
- `/my/opportunities` (club): pagina presente in mappa, ma dettagli marcati `NON TROVATO` nella spec.
- `/club/applicants`: pagina presente in mappa, ma dettagli marcati `NON TROVATO` nella spec.

---

## 3) GAP analysis reale (web vs mobile)

| Area | Stato web reale | Stato mobile reale | Gap reale | Bloccante | Priorità | Micro-PR consigliata |
|---|---|---|---|---|---|---|
| Candidature ricevute club (`/club/applications`) | Presente con source `/api/applications/received` + update `/api/applications/[id]`; status change include `seen/accepted/rejected` | Presente (`app/club/applications.tsx`) con filtri e update status; CTA rapide solo `accepted/rejected` | **Parziale**: manca azione esplicita `seen` in questa schermata (disponibile invece nella schermata per-opportunity) | No | Media | PR-CLUB-APP-01 add azione/status `seen` anche in `/club/applications` |
| Candidati per opportunity (`/opportunities/[id]/applications`) | Presente con list + status actions | Presente con `Cambia stato` su 4 stati (`submitted/seen/accepted/rejected`) | Nessun gap funzionale evidente | No | Bassa | Nessuna (solo hardening UI/test) |
| Stati candidatura (fonte verità API) | Stati documentati: `submitted/seen/accepted/rejected` | Tipi e API mobile allineati agli stessi 4 stati | Nessun gap su modello dati/API | No | Bassa | Nessuna |
| Accept/Reject actions | Disponibili via update status su `/api/applications/[id]` | Disponibili in entrambe le schermate club analizzate | Nessun gap funzionale | No | Bassa | Nessuna |
| Routing/detail coerenza | `/applications` role-based + pagine dedicate club | `app/applications/index.tsx` role redirect coerente + route stack presenti | Nessun gap sostanziale sul routing core applications | No | Bassa | Nessuna |
| Create opportunity club (`/opportunities/new`) | Presente lato web (club-only, `POST /api/opportunities`) | **Assente**: su mobile non esiste route/form create opportunity; tab create è per post | Gap totale su create/manage opportunities lato club | **Sì** | Alta | PR-CLUB-APP-02 create opportunity screen + POST `/api/opportunities` |
| Manage opportunities club (`/my/opportunities`, edit) | Pagina mappata; dettaglio operativo in spec parziale/`NON TROVATO` | Assenti route equivalenti dedicate per lista/manage opportunity club | Gap probabile alto ma parzialmente non verificabile dalla spec | Sì (per parity completa create/manage) | Alta | PR-CLUB-APP-03 audit+implement my opportunities/manage parity |
| `/club/applicants` | Route web presente ma dettagli `NON TROVATO` nella spec | Route mobile assente | Gap non qualificabile funzionalmente senza fonte aggiuntiva | No (finché non chiarita semantica) | Media | PR-CLUB-APP-04 chiarimento funzionale + eventuale mapping route |

---

## 4) Obiettivo chiave (risposta secca)

### Già parity e **non da toccare** (in questo kickoff)
- Lista candidati per singola opportunity con cambio stato (`/opportunities/[id]/applications`) è già coperta lato mobile.
- Flusso role-based `/applications` -> club/player è già coperto.
- Infrastruttura API/tipi per status candidature è già allineata ai 4 stati reali.
- Accept/reject lato club è già presente e funzionale a livello codice su mobile.

### Parziale
- `/club/applications` è funzionale, ma offre CTA rapide solo `accepted/rejected`; lo stato `seen` non è azionabile direttamente da questa lista.

### Mancante del tutto
- Create opportunity club (`/opportunities/new`) su mobile.
- Manage/list opportunity club equivalente a `/my/opportunities` (e relativo percorso edit/manage dedicato).

### Accept/Reject su mobile
- **Sì, presente e funzionale** in:
  - `app/club/applications.tsx` (bottoni Accetta/Rifiuta)
  - `app/opportunities/[id]/applications.tsx` (via `Cambia stato`)

### Create/Manage opportunity lato club
- **Manca** il create flow parity web su mobile.
- **Manca/parziale** il manage flow (`/my/opportunities`) lato mobile.

---

## 5) Micro-PR consigliate (ordine operativo)

1. **PR-CLUB-APP-01 — status parity su `/club/applications`**
   - [ ] Aggiungere azione `Segna come visualizzata (seen)` nella lista candidature ricevute club.
   - [ ] Uniformare UX status-change tra lista globale club e lista per-opportunity.
   - [ ] Verifica regressioni su accepted/rejected già esistenti.

2. **PR-CLUB-APP-02 — create opportunity club parity**
   - [ ] Nuova screen mobile equivalente a `/opportunities/new`.
   - [ ] POST su `/api/opportunities` con payload allineato alla spec.
   - [ ] Guard role club-only e gestione stati loading/error.

3. **PR-CLUB-APP-03 — my opportunities/manage parity**
   - [ ] Censire nel web i requisiti reali di `/my/opportunities` (spec attuale incompleta).
   - [ ] Implementare lista opportunità del club e accesso edit/manage coerente.

4. **PR-CLUB-APP-04 — chiarimento `/club/applicants`**
   - [ ] Verificare semantica reale pagina web (`/club/applicants`) e differenza rispetto a `/club/applications`.
   - [ ] Decidere se è route alias, legacy o funzione distinta; implementare solo se confermata.

---

## 6) Checklist operativa di chiusura parity club applications

- [x] Verificata presenza mobile di `/club/applications`.
- [x] Verificata presenza mobile di `/opportunities/[id]/applications`.
- [x] Verificato update status candidature via `PATCH /api/applications/[id]`.
- [x] Verificata presenza accept/reject mobile reale.
- [x] Verificata coerenza routing role-based `/applications`.
- [x] Verificato gap create opportunity (`/opportunities/new`) assente su mobile.
- [ ] Verificare in repo web sorgente reale (non solo spec) il comportamento finale di `/club/applicants` e `/my/opportunities`.

