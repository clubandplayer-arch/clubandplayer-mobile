# PR-PARITY.OPPORTUNITIES.1 — Audit tecnico WEB ↔ MOBILE

## Contesto e perimetro
- Branch target: `codex/pr-parity-opportunities-1-audit`.
- Scope: **solo audit parity Opportunities** (nessuna implementazione feature).
- Blocchi esclusi esplicitamente: notifiche/mark-read/badge/actor names/deep-link notifiche.
- Source of truth usata:
  - `docs/web-to-mobile-pages-spec.md` (mappa web + API consolidate).
  - codice reale mobile in `app/`, `src/lib/api.ts`, `src/types/opportunity.ts`.

## Verifica iniziale repository
Comandi eseguiti:
- `pwd`
- `git branch --show-current`
- `git status -sb`
- `git remote -v`

Esito operativo:
- repo locale senza remote configurato (`git remote -v` vuoto).
- branch iniziale locale: `work`.
- creato branch: `codex/pr-parity-opportunities-1-audit`.
- nota: non è stato possibile fare `checkout main` locale perché `main` non è presente in questo clone.

---

## 1) Analisi WEB (source of truth)

> Nota metodologica: in questo ambiente non è presente il repository web separato; quindi la verità web è stata ricostruita da `docs/web-to-mobile-pages-spec.md`, che contiene mapping route/file/API già censito dal team.

### 1.1 Route Opportunities/Applications rilevanti lato web
- `/opportunities`
- `/opportunities/new`
- `/opportunities/[id]`
- `/opportunities/[id]/applications`
- `/applications` (role redirect dashboard)
- `/my/applications`
- `/club/applications`
- `/my/opportunities` (**non dettagliata nella spec: NON TROVATO**)
- legacy correlata: `/post` (create opportunity legacy via Supabase diretto + notify endpoint)

### 1.2 API realmente usate dal web (Opportunities scope)
- `GET /api/opportunities` (lista)
- `POST /api/opportunities` (creazione club)
- `GET /api/opportunities/[id]` (dettaglio)
- `PATCH /api/opportunities/[id]` (edit)
- `DELETE /api/opportunities/[id]` (delete)
- `GET /api/opportunities/[id]/applications` (lista candidature owner)
- `POST /api/applications` (apply player)
- `GET /api/applications/me` (my applications)
- `GET /api/applications/mine` (alias usato in parti UI web)
- `GET /api/applications/received` (candidature ricevute club)
- `PATCH /api/applications/[id]` (status candidatura)
- `DELETE /api/applications/[id]` (delete candidatura)
- correlate di contesto pagina:
  - `GET /api/auth/whoami`
  - `GET /api/profiles/me`
  - `GET /api/profiles/public`
- legacy create page:
  - `POST /api/notify-opportunity`
  - + insert Supabase diretto su `opportunities` da `/post`.

### 1.3 Payload reali (da spec)

#### Opportunities list
- Request query: `page`, `pageSize`, `sort`, opzionale `q`.
- Response: `{ data, page, pageSize, total, pageCount, sort }`.
- Select web su `opportunities` (GET):
  - `id,title,description,created_by,created_at,country,region,province,city,sport,role,category,required_category,age_min,age_max,club_name,gender,owner_id,club_id,status`.

#### Opportunity detail
- `GET /api/opportunities/[id]` ritorna `{ data }` con campi:
  - `id,title,description,owner_id,created_at,country,region,province,city,sport,role,category,required_category,age_min,age_max,club_name,gender`.

#### Apply
- `POST /api/applications` body:
  - `opportunity_id`, `note`.
- Logica: dup-check candidatura; insert `applications(opportunity_id, athlete_id, club_id, note, status)`.

#### My applications
- `GET /api/applications/me`:
  - base applications: `id, opportunity_id, status, created_at, note, club_id`.
  - enrich opportunity: `id, title, club_id, club_name, role`.
  - response: `{ data: enriched[] }`.

#### Club received
- `GET /api/applications/received`:
  - opportunities owner set: `id,title,role,city,province,region,country,owner_id,created_by`.
  - applications: `id,opportunity_id,athlete_id,club_id,note,status,created_at,updated_at`.
  - athletes view: `id,user_id,full_name,display_name,role,sport,city,province,region`.
  - response: `{ data: enhanced[] }`.

#### Opportunity applications (owner)
- `GET /api/opportunities/[id]/applications`:
  - ownership check su `opportunities.created_by`.
  - applications select: `id, athlete_id, note, status, created_at, updated_at`.
  - response: `{ data: applications[] }`.

### 1.4 Stati UI reali web (dalla spec)
- **Loading**: presente per list/detail/applications dashboard.
- **Empty**: previsto per liste senza risultati (`my/applications`, `club/applications`, opportunities list filtrata).
- **Error**: stato errore API con retry nei client.
- **Unauthorized / role mismatch**:
  - create/edit/applications owner con vincoli role e ownership.
  - `/applications` con comportamento diverso club/player.
- **Club vs Player visibility**:
  - player: apply + my applications.
  - club: create/edit + received applications + opportunity applications owner.
- **Applied vs non applied**:
  - web usa `GET /api/applications/mine|me` per marcare CTA già applicata.
- **Status opportunity**:
  - campo `status` supportato in list/create/update.

### 1.5 Dipendenze con area Applications
- Opportunities e Applications sono fortemente accoppiate su:
  - apply (`POST /api/applications`),
  - stato candidatura player (`GET /api/applications/me|mine`),
  - gestione club (`GET /api/applications/received`, `PATCH /api/applications/[id]`),
  - lista candidature su singola opportunity (`GET /api/opportunities/[id]/applications`).

---

## 2) Analisi MOBILE (stato attuale)

### 2.1 Route Expo Router esistenti
- `app/(tabs)/opportunities/index.tsx` → lista opportunities + apply inline player.
- `app/opportunities/[id].tsx` → detail + apply player + CTA lista candidature per club.
- `app/opportunities/[id]/applications.tsx` → lista candidature per singola opportunity + azioni accept/reject.
- `app/applications/index.tsx` → redirect per ruolo.
- `app/my/applications.tsx` → lista candidature inviate player.
- `app/club/applications.tsx` → candidature ricevute club.

### 2.2 API client mobile già pronti
In `src/lib/api.ts` sono presenti wrapper coerenti con API web:
- `fetchOpportunities`
- `fetchOpportunityById`
- `applyToOpportunity`
- `fetchMyApplications`
- `fetchClubApplicationsReceived`
- `fetchOpportunityApplications`
- `patchApplicationStatus`

### 2.3 Tipi TS già pronti
- `src/types/opportunity.ts`:
  - `Opportunity`
  - `OpportunityDetail`
  - `OpportunitiesListResponse`
  - `OpportunityDetailResponse`
  - `FetchOpportunitiesParams`
  - `FetchOpportunitiesResult`
- In `src/lib/api.ts` sono tipizzati anche payload applications (`MyApplicationItem`, `ReceivedApplicationItem`, ecc.).

### 2.4 Comportamenti UI mobili osservati
- **Lista opportunities**:
  - loading iniziale,
  - pull-to-refresh,
  - empty state,
  - errore con retry,
  - apply inline player con nota,
  - badge "Candidatura inviata" se già applicato.
- **Dettaglio opportunity**:
  - loading/errore,
  - apply player,
  - CTA candidature per club.
- **Applications area**:
  - `/applications` fa role redirect (club → `/club/applications`, player → `/my/applications`).
  - club received con filtri status + azioni accept/reject.
  - my applications con elenco stato candidatura.

### 2.5 Punti tecnici importanti mobile
- `app/my/applications.tsx` chiama **direttamente** `/api/applications/mine` via `fetch`, non il wrapper `fetchMyApplications` (che punta a `/api/applications/me`).
- Non esiste al momento una route mobile equivalente a `/opportunities/new` (create opportunity).
- Il tab create (`app/(tabs)/create/index.tsx`) è dedicato alla creazione post feed, non a create opportunity.

---

## 3) GAP ANALYSIS (WEB source of truth vs MOBILE)

| Area | Web source of truth | Mobile stato attuale | Gap | Bloccante | Micro-PR proposta |
|---|---|---|---|---|---|
| Opportunities list parity | `/opportunities` con filtri completi e apply-state da applications | Lista + apply presenti | Verificare allineamento 1:1 filtri web (query/filter matrix, ordinamenti, eventuali filtri avanzati) | Sì | PR-PARITY.OPPORTUNITIES.2-LIST-PARITY |
| Opportunity detail parity | `/opportunities/[id]` con stessi campi e regole role | Detail presente + apply + CTA club | Validare rendering di **tutti** i campi spec (category/required_category/gender/status/ownership nuances) | Sì | PR-PARITY.OPPORTUNITIES.3-DETAIL-PARITY |
| Apply parity | `POST /api/applications` + stato applicato da `/api/applications/me|mine` | Apply presente in list e detail | Uniformare fonte apply-state (evitare divergenza `mine` vs `me` in diversi punti) e messaggistica errori allineata web | Sì | PR-PARITY.OPPORTUNITIES.4-APPLY-PARITY |
| Club applications by opportunity | `/opportunities/[id]/applications` owner-only + patch status | Presente route dedicata + patch status | Hardening ownership/unauthorized UX e coerenza label/status con web | No (medio) | PR-PARITY.OPPORTUNITIES.5-OPP-APPLICATIONS-PARITY |
| Applications dashboard parity | `/applications` role-conditional; `/my/applications`; `/club/applications` | Presente redirect + due viste | Disallineamento endpoint (`/mine` diretto vs wrapper `/me`), normalizzazione unica payload | No (medio) | PR-PARITY.OPPORTUNITIES.6-APPLICATIONS-ENDPOINT-ALIGN |
| Create opportunity parity | `/opportunities/new` (club) + `POST /api/opportunities` | **Assente** su mobile | Manca intero flusso create opportunity 1:1 | Sì | PR-PARITY.OPPORTUNITIES.7-CREATE-PARITY |
| Edit/Delete opportunity parity (club) | `/api/opportunities/[id]` PATCH/DELETE (+ pagina edit web) | Nessuna UI mobile esplicita | Manca gestione edit/delete lato mobile | No (dipende da scope parity concordato) | PR-PARITY.OPPORTUNITIES.8-MANAGE-PARITY |
| Legacy `/post` create-opportunity | pagina legacy web usa Supabase diretto + `/api/notify-opportunity` | mobile non ha flow equivalente | Da decidere: coprire parity sul flusso moderno `/opportunities/new`; legacy solo se ancora business-critical | No (decisionale) | PR-PARITY.OPPORTUNITIES.9-LEGACY-DECISION |

---

## 4) Sequenza esecutiva micro-PR consigliata

1. **PR-PARITY.OPPORTUNITIES.2-LIST-PARITY**
   - allineamento filtri/sorting/list states a web.
2. **PR-PARITY.OPPORTUNITIES.3-DETAIL-PARITY**
   - allineamento campi detail + role/visibility.
3. **PR-PARITY.OPPORTUNITIES.4-APPLY-PARITY**
   - apply UX + stato applied uniforme (`me/mine`) + error model.
4. **PR-PARITY.OPPORTUNITIES.5-OPP-APPLICATIONS-PARITY**
   - ownership UX + status actions + stati loading/empty/error.
5. **PR-PARITY.OPPORTUNITIES.6-APPLICATIONS-ENDPOINT-ALIGN**
   - consolidamento endpoint usage e parser payload.
6. **PR-PARITY.OPPORTUNITIES.7-CREATE-PARITY**
   - implementazione `/opportunities/new` mobile club-only con `POST /api/opportunities`.
7. **PR-PARITY.OPPORTUNITIES.8-MANAGE-PARITY**
   - edit/delete opportunity owner flow.
8. **PR-PARITY.OPPORTUNITIES.9-LEGACY-DECISION**
   - decisione esplicita su eventuale parity `/post` legacy e `/api/notify-opportunity`.

---

## 5) Checklist operativa (flaggabile)

### Audit completezza
- [x] Mappate route web opportunities/applications da spec.
- [x] Mappate route mobile opportunities/applications reali.
- [x] Mappati endpoint API realmente usati nel perimetro.
- [x] Estratti payload principali request/response.
- [x] Classificati stati UI (loading/empty/error/role/applied).
- [x] Redatta gap analysis con priorità e bloccanti.
- [x] Definita sequenza micro-PR progressiva.

### Pre-requisiti fase implementativa successiva
- [ ] Confermare se `/my/opportunities` web va incluso in parity phase 2 opportunities.
- [ ] Confermare se includere parity del flusso legacy `/post` + `/api/notify-opportunity`.
- [ ] Confermare policy endpoint unica tra `/api/applications/me` e `/api/applications/mine`.

---

## 6) Note rischi
- **Rischio 1 — source incompleta su web repo**: non avendo il repo web montato in questo environment, alcuni dettagli sono dipendenti dalla correttezza della spec consolidata.
- **Rischio 2 — endpoint alias `me/mine`**: possibile drift comportamentale tra schermate mobile.
- **Rischio 3 — scope creep**: create/edit/delete potrebbero sconfinare in area applications/profiles se non tenuti in micro-PR separati.

