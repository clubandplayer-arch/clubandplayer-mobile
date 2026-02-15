# PRE-PR17 audit completo (fonte unica: `docs/web-to-mobile-pages-spec.md`)

> Metodo: analisi **solo** della Bibbia indicata. Nessuna ispezione extra-code. Dove la Bibbia non riporta il dato in modo esplicito, è marcato come `NON TROVATO` o `NON ESISTE`.

## 1) Error handling / crash boundaries

- ErrorBoundary nel web: `NON TROVATO` nella Bibbia.
- `error.tsx` layout-level in App Router: `NON TROVATO` nella Bibbia.
- Pagine con fallback UI custom: `NON TROVATO` nella Bibbia.
- Feed / Post detail / Notifications / Messages con try/catch o fallback dedicati:
  - `/feed`: `NON TROVATO`
  - `/posts/[id]`: `NON TROVATO`
  - `/notifications`: `NON TROVATO`
  - `/messages`: `NON TROVATO`
- Pattern documentato: la Bibbia descrive data source, tabelle e gating ruolo/auth; non documenta boundary/fallback/error component.

## 2) Loading / empty states

Pagine richieste:

- `/feed` (`app/(dashboard)/feed/page.tsx`)
- `/posts/[id]` (`app/posts/[id]/page.tsx` + `PostClient`)
- `/notifications` (`app/(dashboard)/notifications/page.tsx` + `NotificationsPageClient`)
- `/messages` (`app/(dashboard)/messages/page.tsx`)
- `/opportunities` (`app/(dashboard)/opportunities/page.tsx` + `OpportunitiesClient`)
- `/applications` (`app/(dashboard)/applications/page.tsx`)
- `/club/applications` (`app/(dashboard)/club/applications/page.tsx`)
- `/my/applications` (`app/(dashboard)/my/applications/page.tsx`)

Per tutte le pagine sopra, nella Bibbia:
- Spinner vs skeleton: `NON TROVATO`
- Empty state UI: `NON TROVATO`
- Testi UI reali (stringhe): `NON TROVATO`

Esito pattern uniforme loading/empty: `NON TROVATO`.

## 3) Performance pattern

- Feed infinite scroll:
  - Confermato come requisito parity (`replicare infinite scroll`).
  - `/api/feed/posts` indicato come paginato con scope `all/following`.
  - Response include `{ items, nextPage, _debug? }`.
  - Parametri esatti richiesti (page size, cursor, formula nextPage): `NON TROVATO`.
- `next/image` o wrapper custom immagini: `NON TROVATO`.
- Lazy loading immagini: `NON TROVATO`.
- Prefetch/caching specifico: `NON TROVATO`.

## 4) Debug code (da non portare in release)

### Route debug documentate
- `/debug/client-error` → `app/debug/client-error/page.tsx`
- `/debug/env` → `app/debug/env/page.tsx`

### Flag/dev output documentati
- `_debug?` nel response di `/api/feed/posts`.
- `debug?` nel response di `/api/follows/suggestions`.

### Console log lasciati intenzionalmente
- `NON TROVATO`.

### Componenti solo dev
- `NON TROVATO`.

### Lista file da considerare dev-only (in base alla Bibbia)
- `app/debug/client-error/page.tsx`
- `app/debug/env/page.tsx`

## 5) Tabelle Supabase realmente usate (dal WEB, per quanto esplicitato)

> Nota: la Bibbia contiene vari endpoint `NON TROVATO` (route non ispezionate), quindi il perimetro seguente è **definitivo solo rispetto alla fonte**.

| Tabella | Colonne lette (fonte) | Colonne scritte (fonte) | API route coinvolte |
|---|---|---|---|
| `profiles` | `account_type,type,status`; profili pubblici e autore; in `/api/profiles/me` anche `*` | upsert/update in `/api/auth/whoami`; PATCH campi profilo in `/api/profiles/me` | `/api/auth/whoami`, `/api/profiles/me`, `/api/profiles/public`, `/api/feed/posts`, `/api/feed/comments`, `/api/share-links/[token]`, `/api/follows*`, `/api/notifications`, `/api/opportunities`, `/api/applications/[id]`, `/api/direct-messages/threads` |
| `posts` | dettagli post, validazioni id, `*` in share fetch admin | insert post, update content, delete | `/api/feed/posts`, `/api/feed/posts/[id]`, `/api/share-links`, `/api/share-links/[token]` |
| `post_media` | media attach/select | insert media | `/api/feed/posts`, `/api/feed/posts/[id]`, `/api/share-links/[token]` |
| `post_reactions` | `post_id,reaction,user_id` | insert/update/delete toggle | `/api/feed/reactions` |
| `post_comments` | `post_id` (counts), comment list fields | insert comment | `/api/feed/comments`, `/api/feed/comments/counts` |
| `follows` | relazioni follower/following | insert/delete follow toggle | `/api/feed/posts`, `/api/follows`, `/api/follows/toggle`, `/api/follows/list`, `/api/follows/suggestions` |
| `club_verification_requests` | stato verifica e date | `NON TROVATO` | `/api/feed/posts`, `/api/feed/comments`, `/api/follows/list`, `/api/follows/suggestions` |
| `club_verification_requests_view` | `is_verified` | `NON TROVATO` | `/api/profiles/me` |
| `opportunities` | liste/dettaglio/opportunity ownership checks | insert/update/delete | `/api/feed/starter-pack`, `/api/opportunities`, `/api/opportunities/[id]`, `/api/opportunities/[id]/applications`, `/api/applications`, `/api/applications/me`, `/api/applications/received`, `/api/auth/whoami` |
| `applications` | candidature inviate/ricevute e per opportunity | insert/update/delete | `/api/applications`, `/api/applications/me`, `/api/applications/received`, `/api/applications/[id]`, `/api/opportunities/[id]/applications` |
| `notifications` | notifiche + unread count | update read flags; insert notif status-change | `/api/notifications`, `/api/notifications/unread-count`, `/api/notifications/mark-all-read`, `/api/applications/[id]` |
| `share_links` | token/resource/expiry/revoke fields | insert/revoke | `/api/share-links`, `/api/share-links/[token]` |
| `profile_skill_endorsements` | counts e viewer endorsements | insert/delete endorse | `/api/profiles/public`, `/api/profiles/[id]/skills/endorse` |
| `athletes_view` | dati atleta in list/suggestions/messages/notifications contexts | `NON TROVATO` | `/api/follows/list`, `/api/follows/suggestions`, `/api/notifications`, `/api/applications/received`, `/api/direct-messages/threads` |
| `clubs_view` | `id,display_name` | `NON TROVATO` | `/api/notifications` |
| `direct_messages` | thread fields (`sender/recipient/content/created_at/deleted_at`) | `NON TROVATO` in fonte per write su endpoint dettaglio | `/api/direct-messages/threads` (+ altri DM endpoint non ispezionati) |
| `direct_message_hidden_threads` | `other_profile_id,hidden_at` | `NON TROVATO` | `/api/direct-messages/threads` |
| `direct_message_read_state` | `other_profile_id,last_read_at` | `NON TROVATO` | `/api/direct-messages/threads` |
| `preapproved_emails` | `role_hint` | `NON TROVATO` | `/api/auth/whoami` |
| `regions` | `name` | `NON TROVATO` | `/api/profiles/me` |
| `provinces` | `name` | `NON TROVATO` | `/api/profiles/me` |
| `municipalities` | `name` | `NON TROVATO` | `/api/profiles/me` |

## 6) Verifica coerenza con Bibbia

Discrepanze/alert già esplicitate nella Bibbia:

1. Endpoint presente ma non usato direttamente dalla UI:
   - `/api/opportunities/recommended` → marcato `NON TROVATO` come uso diretto UI.

2. Copertura incompleta (non auditabile 1:1 da questa sola fonte):
   - Molti endpoint e pagine sono marcati `NON TROVATO` (route non ispezionate), quindi non esiste evidenza completa per loading/error/performance e per alcune tabelle/colonne.

3. Endpoint non più usati (evidenza esplicita):
   - Solo quanto sopra: `/api/opportunities/recommended` senza uso diretto UI trovato.

4. Tabelle presenti in spec ma non referenziate con query dettagliate:
   - Tutte quelle legate a endpoint `NON TROVATO` restano non verificabili dalla Bibbia.

## Conclusione operativa (solo analisi)

- In base alla fonte unica, il parity matrix è robusto su routing, data sources principali e ruoli.
- Per PR17 “release hardening” mancano nella fonte dettagli verificabili su: error boundaries, loading/empty UI testuali, e alcune route API (DM/club verification/admin/search ecc.) marcate `NON TROVATO`.
