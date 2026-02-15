# PR17-B — Audit loading/empty/error states (fonte unica)

Fonte unica utilizzata: `docs/web-to-mobile-pages-spec.md`.

> Regola applicata: zero ipotesi. Se il dato non è esplicitato nella fonte, è riportato come `NON TROVATO`.

## Feed

- **Area web:** `/feed`
- **File area (pagina):** `app/(dashboard)/feed/page.tsx`
- **Loading state (file + pattern + testi):** `NON TROVATO` nella fonte.
- **Empty state (file + pattern + testi + CTA):** `NON TROVATO` nella fonte.
- **Error state (file + pattern + testi + retry):** `NON TROVATO` nella fonte.
- **Componenti comuni shared (skeleton/empty/error):** `NON TROVATO` nella fonte.
- **Snippet essenziale (estratto fonte):**
  - `File sorgente: app/(dashboard)/feed/page.tsx`
  - `Parity notes for Mobile: replicare infinite scroll, scope all/following, reactions/comment counts, starter pack, verified badges`.

## Post detail

- **Area web:** `/posts/[id]`
- **File area (pagina):** `app/posts/[id]/page.tsx` + `app/posts/[id]/PostClient.tsx`
- **Loading state (file + pattern + testi):** `NON TROVATO`.
- **Empty state (file + pattern + testi + CTA):** `NON TROVATO`.
- **Error state (file + pattern + testi + retry):** `NON TROVATO`.
- **Componenti comuni shared (skeleton/empty/error):** `NON TROVATO`.
- **Snippet essenziale (estratto fonte):**
  - `Chi può vederla: logged-in (guest vede prompt login)`.
  - `Parity notes for Mobile: replicare gating login, reactions, comment counts e quoted post rendering`.

## Notifications

- **Area web:** `/notifications`
- **File area (pagina):** `app/(dashboard)/notifications/page.tsx` + `NotificationsPageClient`
- **Loading state (file + pattern + testi):** `NON TROVATO`.
- **Empty state (file + pattern + testi + CTA):** `NON TROVATO`.
- **Error state (file + pattern + testi + retry):** `NON TROVATO`.
- **Componenti comuni shared (skeleton/empty/error):** `NON TROVATO`.
- **Snippet essenziale (estratto fonte):**
  - `Dati mostrati: notifiche list, filter unread, mark all read`.
  - `Parity notes for Mobile: replicate filters + mark-all-read and badge count`.

## Messages (inbox + thread)

### Inbox
- **Area web:** `/messages`
- **File area (pagina):** `app/(dashboard)/messages/page.tsx`
- **Loading state:** `NON TROVATO`.
- **Empty state:** `NON TROVATO`.
- **Error state:** `NON TROVATO`.
- **Componenti comuni shared:** `NON TROVATO`.
- **Snippet essenziale:**
  - `Dati mostrati: threads list`.
  - `Parity notes for Mobile: replicate threads + unread indicator logic`.

### Thread
- **Area web:** `/messages/[profileId]`
- **File area (pagina):** `app/(dashboard)/messages/[profileId]/page.tsx`
- **Loading state:** `NON TROVATO`.
- **Empty state:** `NON TROVATO`.
- **Error state:** `NON TROVATO`.
- **Componenti comuni shared:** `NON TROVATO`.
- **Snippet essenziale:**
  - `Dati mostrati: conversation thread + send/mark read`.
  - `Parity notes for Mobile: replicate messaging send/delete + mark-read`.

## Opportunities (list + detail)

### List
- **Area web:** `/opportunities`
- **File area (pagina):** `app/(dashboard)/opportunities/page.tsx` + `OpportunitiesClient`
- **Loading state:** `NON TROVATO`.
- **Empty state:** `NON TROVATO`.
- **Error state:** `NON TROVATO`.
- **Componenti comuni shared:** `NON TROVATO`.
- **Snippet essenziale:**
  - `Dati mostrati: lista opportunities, filtri, apply CTA`.
  - `Parity notes for Mobile: replicate filters, apply CTA, and role-specific actions`.

### Detail
- **Area web:** `/opportunities/[id]`
- **File area (pagina):** `app/(dashboard)/opportunities/[id]/page.tsx` + `OpportunityDetailClient`
- **Loading state:** `NON TROVATO`.
- **Empty state:** `NON TROVATO`.
- **Error state:** `NON TROVATO`.
- **Componenti comuni shared:** `NON TROVATO`.
- **Snippet essenziale:**
  - `Dati mostrati: dettaglio opportunity, apply CTA`.
  - `Parity notes for Mobile: same detail + apply flow`.

## Applications (player-side + club-side)

### Player-side
- **Area web:** `/my/applications` e vista role-based su `/applications`
- **File area (pagina):** `app/(dashboard)/my/applications/page.tsx` e `app/(dashboard)/applications/page.tsx`
- **Loading state:** `NON TROVATO`.
- **Empty state:** `NON TROVATO`.
- **Error state:** `NON TROVATO`.
- **Componenti comuni shared:** `NON TROVATO`.
- **Testi UI esatti:** `NON TROVATO`.
- **Snippet essenziale:**
  - `Dati mostrati: lista candidature inviate`.
  - `Differenze: PLAYER usa /api/applications/me`.

### Club-side
- **Area web:** `/club/applications` e vista role-based su `/applications`
- **File area (pagina):** `app/(dashboard)/club/applications/page.tsx` e `app/(dashboard)/applications/page.tsx`
- **Loading state:** `NON TROVATO`.
- **Empty state:** `NON TROVATO`.
- **Error state:** `NON TROVATO`.
- **Componenti comuni shared:** `NON TROVATO`.
- **Testi UI esatti:** `NON TROVATO`.
- **Snippet essenziale:**
  - `Dati mostrati: applications ricevute per opportunità del club`.
  - `Differenze: CLUB usa /api/applications/received`.

## Componenti comuni usati (richiesta #5)

- Componenti/pagine menzionati esplicitamente nella fonte per queste aree:
  - `PostClient`
  - `NotificationsPageClient`
  - `OpportunitiesClient`
  - `OpportunityDetailClient`
- Shared component di loading/empty/error (skeleton, empty box, error box): **`NON TROVATO`** nella fonte.

## Screenshot o snippet (richiesta #6)

- Screenshot web: **NON DISPONIBILI** dalla fonte unica (documento testuale).
- Snippet essenziali: inclusi sopra come estratti testuali minimi dalla Bibbia.

## Esito complessivo PR17-B (solo da fonte unica)

- La fonte identifica bene **route, file pagina, data source e parity notes**.
- Per **loading/empty/error UI pattern e testi esatti**, la fonte non fornisce evidenza: **`NON TROVATO`** su tutte le aree richieste.
