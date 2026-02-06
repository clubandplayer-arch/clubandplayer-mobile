# Web → Mobile parity spec (Club vs Player)

> Scope: App Router pages under `app/` plus the API routes actually used by those pages. This document is analysis-only (no fixes). If any detail is missing, it is explicitly marked as **NON TROVATO** with the file(s) checked.

---

## Inventario routes (App Router)

### UI pages
- `/` → `app/page.tsx` (redirect)
- `/feed` → `app/(dashboard)/feed/page.tsx`
- `/posts/[id]` → `app/posts/[id]/page.tsx`
- `/post` → `app/post/page.tsx`
- `/profile` → `app/(dashboard)/profile/page.tsx` (redirect)
- `/player/profile` → `app/(dashboard)/player/profile/page.tsx`
- `/club/profile` → `app/(dashboard)/club/profile/page.tsx`
- `/u/[id]` → `app/u/[id]/page.tsx` (public athlete/player)
- `/c/[id]` → `app/c/[id]/page.tsx` (alias of `/clubs/[id]`)
- `/clubs` → `app/(dashboard)/clubs/page.tsx`
- `/clubs/[id]` → `app/(dashboard)/clubs/[id]/page.tsx`
- `/club/roster` → `app/(dashboard)/club/roster/page.tsx`
- `/club/verification` → `app/(dashboard)/club/verification/page.tsx`
- `/club/applications` → `app/(dashboard)/club/applications/page.tsx`
- `/club/applicants` → `app/(dashboard)/club/applicants/page.tsx`
- `/club/post` → `app/(dashboard)/club/post/page.tsx`
- `/club/post/edit/[id]` → `app/(dashboard)/club/post/edit/[id]/page.tsx`
- `/my/applications` → `app/(dashboard)/my/applications/page.tsx`
- `/applications` → `app/(dashboard)/applications/page.tsx`
- `/opportunities` → `app/(dashboard)/opportunities/page.tsx`
- `/opportunities/new` → `app/(dashboard)/opportunities/new/page.tsx`
- `/opportunities/[id]` → `app/(dashboard)/opportunities/[id]/page.tsx`
- `/opportunities/[id]/applications` → `app/(dashboard)/opportunities/[id]/applications/page.tsx`
- `/my/opportunities` → `app/my/opportunities/page.tsx`
- `/following` → `app/(dashboard)/following/page.tsx`
- `/discover` → `app/(dashboard)/discover/page.tsx`
- `/who-to-follow` → `app/(dashboard)/who-to-follow/page.tsx`
- `/network` → `app/(dashboard)/network/page.tsx`
- `/notifications` → `app/(dashboard)/notifications/page.tsx`
- `/messages` → `app/(dashboard)/messages/page.tsx`
- `/messages/[profileId]` → `app/(dashboard)/messages/[profileId]/page.tsx`
- `/messages/legacy` → `app/(dashboard)/messages/legacy/page.tsx`
- `/mymedia` → `app/(dashboard)/mymedia/page.tsx`
- `/search` → `app/search/page.tsx`
- `/search/club` → `app/search/club/page.tsx`
- `/search/athletes` → `app/search/athletes/page.tsx`
- `/search-map` → `app/(dashboard)/search-map/page.tsx`
- `/favorites` → `app/favorites/page.tsx`
- `/athletes/[id]` → `app/athletes/[id]/page.tsx`
- `/settings` → `app/settings/page.tsx`
- `/profile/location-settings` → `app/profile/location-settings/page.tsx`
- `/alerts` → `app/alerts/page.tsx`
- `/reports` → `app/reports/page.tsx`
- `/admin/users` → `app/admin/users/page.tsx`
- `/admin/reports` → `app/admin/reports/page.tsx`
- `/admin/ads` → `app/admin/ads/page.tsx`
- `/admin/ads/leads` → `app/admin/ads/leads/page.tsx`
- `/admin/verifications` → `app/admin/verifications/page.tsx`
- `/debug/client-error` → `app/debug/client-error/page.tsx`
- `/debug/env` → `app/debug/env/page.tsx`
- `/blocked` → `app/blocked/page.tsx`
- `/alerts` → `app/alerts/page.tsx`
- `/onboarding` → `app/(dashboard)/onboarding/page.tsx`
- `/onboarding/choose-role` → `app/onboarding/choose-role/page.tsx`
- `/login` → `app/login/page.tsx`
- `/logout` → `app/logout/page.tsx`
- `/signup` → `app/signup/page.tsx`
- `/reset-password` → `app/reset-password/page.tsx`
- `/update-password` → `app/update-password/page.tsx`
- `/legal/terms` → `app/legal/terms/page.tsx`
- `/legal/privacy` → `app/legal/privacy/page.tsx`
- `/legal/beta` → `app/legal/beta/page.tsx`
- `/s/[token]` → `app/s/[token]/page.tsx`
- `/sponsor` → `app/sponsor/page.tsx`
- `/api/applications/sent` → `app/api/applications/sent/page.tsx` (UI page placed under api)

### API routes (used by UI pages)
- `/api/auth/session` (POST)
- `/api/auth/whoami` (GET)
- `/api/profiles/me` (GET/PATCH)
- `/api/profiles` (POST/PUT)
- `/api/profiles/[id]` (GET/DELETE?)
- `/api/profiles/public` (GET)
- `/api/profiles/avatar` (POST)
- `/api/profiles/[id]/skills/endorse` (POST)
- `/api/feed/posts` (GET/POST)
- `/api/feed/posts/[id]` (PATCH/DELETE)
- `/api/feed/reactions` (GET/POST)
- `/api/feed/comments` (GET/POST)
- `/api/feed/comments/counts` (GET)
- `/api/feed/comments/[id]` (PATCH/DELETE)
- `/api/feed/starter-pack` (GET)
- `/api/feed/highlights` (GET)
- `/api/link-preview` (POST)
- `/api/share-links` (POST)
- `/api/share-links/[token]` (GET/POST revoke)
- `/api/follows` (GET)
- `/api/follows/toggle` (POST)
- `/api/follows/state` (GET)
- `/api/follows/list` (GET)
- `/api/follows/followers` (GET)
- `/api/follows/suggestions` (GET)
- `/api/notifications` (GET/PATCH)
- `/api/notifications/unread-count` (GET)
- `/api/notifications/mark-all-read` (POST)
- `/api/clubs` (GET/POST)
- `/api/clubs/[id]` (DELETE/PATCH)
- `/api/clubs/me/roster` (GET/POST)
- `/api/clubs/[id]/roster` (GET)
- `/api/club/logo` (POST)
- `/api/club/verification/status` (GET)
- `/api/club/verification/upload` (POST)
- `/api/club/verification/submit` (POST)
- `/api/applications` (POST)
- `/api/applications/mine` (GET → alias)
- `/api/applications/me` (GET)
- `/api/applications/received` (GET)
- `/api/applications/[id]` (PATCH/DELETE)
- `/api/opportunities` (GET/POST)
- `/api/opportunities/[id]` (GET/PATCH/DELETE)
- `/api/opportunities/[id]/applications` (GET)
- `/api/opportunities/recommended` (GET) **NON TROVATO** (endpoint exists but no direct usage found in UI fetch calls; searched `app/` + `components/` + `hooks/`.)
- `/api/search` (GET)
- `/api/search/clubs-in-bounds` (GET)
- `/api/search/map` (GET)
- `/api/italy-locations` (GET)
- `/api/onboarding/dismiss` (POST)
- `/api/direct-messages/threads` (GET)
- `/api/direct-messages/[profileId]` (GET/POST)
- `/api/direct-messages/[profileId]/mark-read` (POST)
- `/api/direct-messages/message/[messageId]` (DELETE)
- `/api/direct-messages/conversation/[profileId]` (DELETE)
- `/api/direct-messages/unread-count` (GET)
- `/api/ads/leads` (POST)
- `/api/ads/serve` (GET)
- `/api/admin/users` (GET)
- `/api/admin/users/status` (POST)
- `/api/admin/ads/campaigns` (GET/POST)
- `/api/admin/ads/campaigns/[id]` (PATCH/DELETE)
- `/api/admin/ads/targets` (GET/POST)
- `/api/admin/ads/targets/[id]` (DELETE)
- `/api/admin/ads/creatives` (GET/POST)
- `/api/admin/ads/creatives/[id]` (PATCH/DELETE)
- `/api/admin/ads/creatives/upload` (POST)
- `/api/admin/ads/leads` (GET)
- `/api/admin/ads/leads/[id]` (GET)
- `/api/admin/verifications` (GET)
- `/api/admin/verifications/[id]/pdf` (GET)
- `/api/admin/verifications/[id]/mark-paid` (POST)
- `/api/admin/verifications/[id]/approve` (POST)
- `/api/admin/verifications/[id]/reject` (POST)
- `/api/notify-opportunity` (POST)

---

## UI pages (dettaglio per route)

> Nota: quando la pagina usa componenti che a loro volta fetchano dati, il data source è indicato con il relativo endpoint API. Se la pagina è solo redirect/static, i campi dati sono indicati come “N/A”.

### `/` (landing redirect)
- **File sorgente:** `app/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** N/A (redirect a `/signup`)
- **Data source:** N/A
- **Tabelle coinvolte:** N/A
- **Colonne lette:** N/A
- **Colonne scritte:** N/A
- **Regole/derivazioni importanti:** redirect immediato a `/signup`
- **Parity notes for Mobile:** replicare redirect automatico.

### `/feed`
- **File sorgente:** `app/(dashboard)/feed/page.tsx`
- **Chi può vederla:** logged-in (guest vede UI ma con limitazioni; check via `/api/auth/whoami`)
- **Dati mostrati:** lista feed, commenti count, reazioni, starter pack (opportunità + profili), mini profilo, ads.
- **Data source:**
  - `/api/feed/posts` (GET, paginato; scope=all/following)
  - `/api/feed/reactions` (GET + POST)
  - `/api/feed/comments/counts` (GET)
  - `/api/feed/starter-pack` (GET)
  - `/api/auth/whoami` (GET)
  - `/api/profiles/me` (GET)
- **Tabelle coinvolte:**
  - `posts`, `post_media`, `profiles`, `follows`, `club_verification_requests` (via `/api/feed/posts`)
  - `post_reactions` (via `/api/feed/reactions`)
  - `post_comments` (via `/api/feed/comments/counts`)
  - `profiles`, `opportunities` (via `/api/feed/starter-pack`)
- **Colonne lette:**
  - `posts`: `id, author_id, content, created_at, media_url, media_type, media_aspect, kind, event_payload, quoted_post_id, link_url, link_title, link_description, link_image`.
  - `post_media`: `id, post_id, media_type, url, poster_url, width, height, position`.
  - `profiles`: `id, user_id, full_name, display_name, avatar_url, account_type, type` (author lookup); also `id, account_type, status, country, city, interest_country, interest_city, display_name, full_name, sport` (starter pack).
  - `follows`: `target_profile_id` (per following scope).
  - `club_verification_requests`: `club_id, status, payment_status, verified_until, created_at` (badge verified).
  - `post_reactions`: `post_id, reaction, user_id` (counts + mine).
  - `post_comments`: `post_id` (counts).
  - `opportunities`: `id,title,description,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name,gender,club_id,owner_id,created_by,status`.
- **Colonne scritte:**
  - `post_reactions`: insert `post_id, user_id, reaction`; update `reaction`; delete by `id` (toggle).
- **Regole/derivazioni importanti:**
  - Feed scope `following` filtra per profili seguiti (da `follows`) → tradotto in `author_id` via `profiles.user_id`.
  - Auto-include `selfId` in scope `all`.
  - `starter-pack` per club mostra ultime opportunità del club; per player mostra suggerimenti filtered per sport/geo.
  - `is_verified` calcolato da `club_verification_requests` con status approved + payment paid/waived + verified_until futura.
- **Parity notes for Mobile:** replicare infinite scroll, scope all/following, reactions/comment counts, starter pack, verified badges; usare gli stessi endpoint.

#### Differenze CLUB vs PLAYER (Feed)
- **CLUB:** starter-pack opportunità = ultime opportunità del club; starter-pack profili = suggerimenti player.
- **PLAYER:** starter-pack opportunità = matching per sport/geo; starter-pack profili = suggerimenti club.

### `/posts/[id]` (post detail)
- **File sorgente:** `app/posts/[id]/page.tsx` + `app/posts/[id]/PostClient.tsx`
- **Chi può vederla:** logged-in (guest vede prompt login)
- **Dati mostrati:** dettaglio post, autore, quoted post, reactions + comment counts.
- **Data source:**
  - Supabase server in page: `posts` (select dettagli), `profiles` (autore), `posts` (quoted), `posts` (admin precheck).
  - `/api/feed/reactions` (GET/POST)
  - `/api/feed/comments/counts` (GET)
- **Tabelle coinvolte:** `posts`, `profiles`, `post_reactions`, `post_comments`.
- **Colonne lette:**
  - `posts`: `id, content, created_at, author_id, media_url, media_type, media_aspect, link_url, link_title, link_description, link_image, kind, event_payload, quoted_post_id`.
  - `profiles`: `full_name, avatar_url, account_type, type`.
  - `post_reactions`: `post_id, reaction, user_id`.
  - `post_comments`: `post_id`.
- **Colonne scritte:**
  - `post_reactions`: insert/update/delete (toggle).
- **Regole/derivazioni importanti:**
  - Se non autenticato → messaggio login.
  - Accesso post validato anche via admin client (RLS bypass per verifica esistenza).
  - `normalizePost` applica mapping `author_display_name`, `author_avatar_url`.
- **Parity notes for Mobile:** replicare gating login, reactions, comment counts e quoted post rendering.

### `/post` (create opportunity legacy)
- **File sorgente:** `app/post/page.tsx`
- **Chi può vederla:** logged-in club only (client-side check)
- **Dati mostrati:** form creazione annuncio (opportunity)
- **Data source:** Supabase client direttamente (no API route) + `/api/notify-opportunity` (POST)
- **Tabelle coinvolte:** `profiles`, `opportunities`
- **Colonne lette:** `profiles.account_type` (select via `profiles` by `id` = user.id)
- **Colonne scritte:**
  - `opportunities`: insert `owner_id, title, sport, role, region, province, city, description, club_name`
- **Regole/derivazioni importanti:**
  - Solo club: check `profiles.account_type === 'club'`.
  - `club_name` da `user_metadata.club_name` fallback `'Club'`.
- **Parity notes for Mobile:** replicare validazione (sport/role mapping) e submit; inviare notifica via `/api/notify-opportunity`.

### `/player/profile`
- **File sorgente:** `app/(dashboard)/player/profile/page.tsx`
- **Chi può vederla:** logged-in player; club viene reindirizzato a `/club/profile`
- **Dati mostrati:** form profilo (ProfileEditForm)
- **Data source:**
  - `/api/auth/whoami` (ruolo)
  - `/api/profiles/me` (GET/PATCH)
  - `/api/profiles` (POST/PUT) **NON TROVATO** in questa pagina, ma usato da `ProfileForm`/`ProfileEditForm` components.
  - `/api/profiles/avatar` (POST)
  - `/api/italy-locations` (GET) per selettori location (hook)
- **Tabelle coinvolte:** `profiles`, `club_verification_requests_view`, `regions`, `provinces`, `municipalities` (via `/api/profiles/me`), `storage` (avatar upload), `profile_skill_endorsements` (skills summary via `public` endpoint, se usato)
- **Colonne lette:**
  - `profiles`: `*` (GET `/api/profiles/me`).
  - `club_verification_requests_view`: `is_verified`.
  - `regions/provinces/municipalities`: `name` (resolve labels in PATCH).
- **Colonne scritte:**
  - `profiles`: multiple fields in `/api/profiles/me` PATCH (see API section).
- **Regole/derivazioni importanti:**
  - Club redirect da whoami (role=club).
  - `interest_*` labels resolved when IDs provided.
- **Parity notes for Mobile:** replicare edit form e update tramite `/api/profiles/me`; stesso gating role.

### `/club/profile`
- **File sorgente:** `app/(dashboard)/club/profile/page.tsx`
- **Chi può vederla:** logged-in club
- **Dati mostrati:** form profilo club (ProfileEditForm)
- **Data source:** same as `/player/profile` (ProfileEditForm)
- **Tabelle coinvolte / colonne:** vedi `/player/profile`.
- **Parity notes for Mobile:** stessa UI/fields, con club-only context.

### `/profile` (legacy redirect)
- **File sorgente:** `app/(dashboard)/profile/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** N/A (redirect)
- **Data source:** N/A
- **Parity notes for Mobile:** redirect a `/player/profile`.

### `/u/[id]` (public athlete/player profile)
- **File sorgente:** `app/u/[id]/page.tsx`
- **Chi può vederla:** public (Supabase RLS permettendo select)
- **Dati mostrati:** profilo player, skills + endorsement counts, latest applications (max 5) con opportunity data.
- **Data source:** Supabase client directly (no API), plus `/api/profiles/[id]/skills/endorse` for endorsement toggle.
- **Tabelle coinvolte:** `profiles`, `profile_skill_endorsements`, `applications`, `opportunities`.
- **Colonne lette:**
  - `profiles`: `id, user_id, display_name, full_name, headline, bio, sport, role, country, region, province, city, avatar_url, skills, account_type, type`.
  - `profile_skill_endorsements`: `skill_name`, `profile_id`, `endorser_profile_id`.
  - `applications`: `id, created_at, status, opportunity_id, athlete_id`.
  - `opportunities`: `id, title, club_name, city`.
- **Colonne scritte:**
  - `profile_skill_endorsements` via `/api/profiles/[id]/skills/endorse` (endorse/remove).
- **Regole/derivazioni importanti:**
  - Endorsements count computed by counting rows per skill.
  - `endorsedByMe` computed by query filtered on `endorser_profile_id`.
- **Parity notes for Mobile:** replicare endorsements e applications list; usare endpoint `/api/profiles/[id]/skills/endorse` per toggle.

### `/clubs/[id]` (public club profile)
- **File sorgente:** `app/(dashboard)/clubs/[id]/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** header profilo club, dati club, bio, open opportunities (latest), roster public, feed autore.
- **Data source:**
  - Supabase server in page: `profiles` (club), `club_verification_requests` (verified status)
  - `getLatestOpenOpportunitiesByClub` (Supabase `opportunities`, `profiles`)
  - `PublicClubRosterSection` component → `/api/clubs/[id]/roster`
  - `PublicAuthorFeed` component → `/api/feed/posts` + reactions/comments counts
- **Tabelle coinvolte:** `profiles`, `club_verification_requests`, `opportunities`, `post_media`, `posts`, `profiles` (authors), `follows` (for feed), `post_reactions`, `post_comments`.
- **Colonne lette:**
  - `profiles`: `id, user_id, display_name, full_name, headline, bio, country, region, province, city, avatar_url, sport, club_league_category, club_foundation_year, club_stadium, club_stadium_address, club_motto, status, account_type, type`.
  - `club_verification_requests`: `status, payment_status, verified_until, created_at`.
  - `opportunities`: `id,title,city,province,region,country,created_at,status,club_id,owner_id,created_by,club_name`.
  - `profiles` (club names in opportunities repo): `id, user_id, display_name, full_name`.
- **Colonne scritte:** N/A
- **Regole/derivazioni importanti:**
  - Club access requires `account_type`/`type` = club and `status` = active.
  - Verified badge computed as in feed (approved + paid/waived + not expired).
  - `getLatestOpenOpportunitiesByClub` filters out closed/archived/draft statuses.
- **Parity notes for Mobile:** replicate club profile data, verified badge, latest opportunities, roster and feed sections.

### `/c/[id]`
- **File sorgente:** `app/c/[id]/page.tsx` (re-export)
- **Chi può vederla:** public
- **Dati mostrati / Data source:** stesso di `/clubs/[id]`.
- **Parity notes for Mobile:** route alias.

### `/clubs`
- **File sorgente:** `app/(dashboard)/clubs/page.tsx` + `ClubsClient`
- **Chi può vederla:** logged-in (admin for edit)
- **Dati mostrati:** lista clubs, search/pagination, admin CRUD.
- **Data source:**
  - `/api/auth/whoami` (per admin permissions)
  - `/api/clubs` (GET list)
  - `/api/clubs/[id]` (DELETE)
  - `/api/clubs` (POST/PUT) **via ClubsEditingModals**
- **Tabelle coinvolte:** `clubs`? (data handled by API route), `profiles`? **NON TROVATO** (API route not reviewed here; see API section).
- **Colonne lette/scritte:** **NON TROVATO** (checked `app/(dashboard)/clubs/ClubsClient.tsx`; actual columns defined in `/api/clubs` route).
- **Parity notes for Mobile:** replicate list + pagination + admin actions if applicable.

### `/club/roster`
- **File sorgente:** `app/(dashboard)/club/roster/page.tsx`
- **Chi può vederla:** logged-in club
- **Dati mostrati:** roster list, toggle in/out
- **Data source:** `/api/clubs/me/roster` (GET/POST)
- **Tabelle coinvolte:** `club_roster` (assumed), `profiles`/`athletes_view` **NON TROVATO** (see API route)
- **Colonne lette/scritte:** **NON TROVATO** (checked `app/(dashboard)/club/roster/page.tsx`; see API section)
- **Parity notes for Mobile:** replicare roster management e add/remove.

### `/club/verification`
- **File sorgente:** `app/(dashboard)/club/verification/page.tsx` + `VerificationClient`
- **Chi può vederla:** logged-in club
- **Dati mostrati:** stato verifica + upload documenti + submit.
- **Data source:** `/api/club/verification/status`, `/api/club/verification/upload`, `/api/club/verification/submit`
- **Tabelle coinvolte/colonne:** **NON TROVATO** (checked `VerificationClient.tsx`; see API section)
- **Parity notes for Mobile:** stessa UX per status e upload.

### `/club/applications`
- **File sorgente:** `app/(dashboard)/club/applications/page.tsx`
- **Chi può vederla:** logged-in club
- **Dati mostrati:** applications ricevute per opportunità del club
- **Data source:** `/api/auth/whoami`, `/api/applications/received`, `/api/applications/[id]` (update status)
- **Tabelle coinvolte:** `applications`, `opportunities`, `athletes_view`, `notifications` (status change), `profiles` (lookup)
- **Colonne lette/scritte:** vedi API `/api/applications/received` + `/api/applications/[id]`.
- **Parity notes for Mobile:** replicare lista + change status (accepted/rejected/seen).

### `/club/applicants`
- **File sorgente:** `app/(dashboard)/club/applicants/page.tsx`
- **Chi può vederla:** logged-in club
- **Dati mostrati:** **NON TROVATO** (file non letto; pagina esiste ma non ispezionata qui)
- **Data source/tables/columns:** **NON TROVATO** (need inspect `app/(dashboard)/club/applicants/page.tsx`).
- **Parity notes for Mobile:** replicare quando disponibili dettagli.

### `/club/post`
- **File sorgente:** `app/(dashboard)/club/post/page.tsx`
- **Chi può vederla:** logged-in club
- **Dati mostrati:** **NON TROVATO** (file non letto; likely legacy page)
- **Data source:** **NON TROVATO**
- **Parity notes for Mobile:** TBD.

### `/club/post/edit/[id]`
- **File sorgente:** `app/(dashboard)/club/post/edit/[id]/page.tsx` + `EditForm`
- **Chi può vederla:** logged-in club
- **Dati mostrati:** edit opportunity form
- **Data source:** `/api/opportunities/[id]` (GET/PATCH)
- **Tabelle coinvolte:** `opportunities`
- **Colonne lette:** `id,title,description,owner_id,created_at,country,region,province,city,sport,role,category,required_category,age_min,age_max,club_name,gender`
- **Colonne scritte:** update `opportunities` fields listed in PATCH (see API `/api/opportunities/[id]`).
- **Parity notes for Mobile:** edit opportunity for club only.

### `/my/applications`
- **File sorgente:** `app/(dashboard)/my/applications/page.tsx`
- **Chi può vederla:** logged-in player
- **Dati mostrati:** lista candidature inviate
- **Data source:** `/api/applications/mine` (GET → alias `/api/applications/me`)
- **Tabelle coinvolte:** `applications`, `opportunities`
- **Colonne lette:** `applications.id, opportunity_id, status, created_at, note, club_id`; `opportunities.id, title, club_id, club_name, role`.
- **Colonne scritte:** N/A
- **Parity notes for Mobile:** replicare filtri status e lista con opportunity detail.

### `/applications`
- **File sorgente:** `app/(dashboard)/applications/page.tsx`
- **Chi può vederla:** logged-in (role-conditional)
- **Dati mostrati:** dashboard candidature (received or mine)
- **Data source:** `/api/auth/whoami`, `/api/applications/me` (player), `/api/applications/received` (club)
- **Tabelle coinvolte:** `applications`, `opportunities`, `athletes_view` (see APIs)
- **Parity notes for Mobile:** mostra vista in base al ruolo.

#### Differenze CLUB vs PLAYER (Applications)
- **CLUB:** usa `/api/applications/received` e mostra candidati.
- **PLAYER:** usa `/api/applications/me` per candidature inviate.

### `/opportunities`
- **File sorgente:** `app/(dashboard)/opportunities/page.tsx` + `OpportunitiesClient`
- **Chi può vederla:** logged-in (list per tutti)
- **Dati mostrati:** lista opportunities, filtri, apply CTA
- **Data source:**
  - `/api/auth/whoami` (role)
  - `/api/profiles/me` (profile info)
  - `/api/opportunities` (GET list)
  - `/api/applications` (POST apply)
  - `/api/applications/mine` (GET for apply state)
  - `/api/profiles/public` (GET for applicant profile lookups)
- **Tabelle coinvolte:** `opportunities`, `profiles`, `applications`, `profile_skill_endorsements` (via public profiles), `post_reactions` **N/A**.
- **Colonne lette:**
  - `opportunities`: see `/api/opportunities` select.
  - `profiles`: for club names in opportunities.
  - `applications`: `id, opportunity_id, status, created_at, note, club_id`.
  - `profiles` (public): see `/api/profiles/public`.
- **Colonne scritte:**
  - `applications`: insert in `/api/applications`.
- **Parity notes for Mobile:** replicate filters, apply CTA, and role-specific actions.

### `/opportunities/new`
- **File sorgente:** `app/(dashboard)/opportunities/new/page.tsx`
- **Chi può vederla:** logged-in club
- **Dati mostrati:** create opportunity form
- **Data source:** `/api/opportunities` (POST)
- **Tabelle coinvolte:** `profiles` (club profile), `opportunities`
- **Colonne scritte:** insert `title, description, country, region, province, city, sport, role, required_category, age_min, age_max, gender, owner_id, created_by, club_id, club_name, status` (see API)
- **Parity notes for Mobile:** replicate create flow for club.

### `/opportunities/[id]`
- **File sorgente:** `app/(dashboard)/opportunities/[id]/page.tsx` + `OpportunityDetailClient`
- **Chi può vederla:** logged-in (public view may vary)
- **Dati mostrati:** dettaglio opportunity, apply CTA
- **Data source:** `/api/auth/whoami`, `/api/opportunities/[id]`, `/api/applications/mine`, `/api/applications` (apply)
- **Tabelle coinvolte:** `opportunities`, `applications`
- **Colonne lette:** `opportunities` SELECT fields in `/api/opportunities/[id]`.
- **Colonne scritte:** `applications` insert when applying.
- **Parity notes for Mobile:** same detail + apply flow.

### `/opportunities/[id]/applications`
- **File sorgente:** `app/(dashboard)/opportunities/[id]/applications/page.tsx`
- **Chi può vederla:** logged-in club (owner)
- **Dati mostrati:** lista candidature per opportunità
- **Data source:** `/api/opportunities/[id]/applications`, `/api/applications/[id]` (status update)
- **Tabelle coinvolte:** `applications`, `opportunities`, `profiles` (public lookup)
- **Colonne lette/scritte:** vedi API `/api/opportunities/[id]/applications` + `/api/applications/[id]`.
- **Parity notes for Mobile:** replicare list + status actions.

### `/my/opportunities`
- **File sorgente:** `app/my/opportunities/page.tsx`
- **Chi può vederla:** logged-in club
- **Dati mostrati:** **NON TROVATO** (file non letto; likely list of club opportunities)
- **Data source/tables/columns:** **NON TROVATO**.

### `/following`
- **File sorgente:** `app/(dashboard)/following/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** lista profili seguiti; per club toggle roster
- **Data source:** `/api/follows/list`, `/api/clubs/me/roster` (GET/POST), `/api/follows/toggle` via FollowButton
- **Tabelle coinvolte:** `follows`, `profiles`, `club_verification_requests`, `athletes_view`, `club_roster` (assumed), `profiles` (for roster)
- **Colonne lette:**
  - `follows`: `target_profile_id`, `follower_profile_id`.
  - `profiles`: `id, full_name, display_name, account_type, type, avatar_url, city, country, sport, role`.
  - `club_verification_requests`: `club_id, status, payment_status, verified_until, created_at`.
  - `athletes_view`: `id, user_id, full_name, display_name, avatar_url`.
- **Colonne scritte:**
  - `follows` insert/delete via `/api/follows/toggle`.
  - `club_roster` via `/api/clubs/me/roster` (see API section).
- **Parity notes for Mobile:** replicare follow list + roster toggle per club.

### `/discover`
- **File sorgente:** `app/(dashboard)/discover/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** suggerimenti profili da seguire
- **Data source:** `/api/follows/suggestions`
- **Tabelle coinvolte:** `profiles`, `follows`, `athletes_view`, `club_verification_requests`
- **Colonne lette:** see `/api/follows/suggestions`.
- **Parity notes for Mobile:** replicare suggerimenti con badge verified.

### `/who-to-follow`
- **File sorgente:** `app/(dashboard)/who-to-follow/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** suggested follows (component WhoToFollow)
- **Data source:** `/api/follows/suggestions`
- **Tabelle coinvolte/colonne:** vedi `/api/follows/suggestions`.
- **Parity notes for Mobile:** same suggestions.

### `/network`
- **File sorgente:** `app/(dashboard)/network/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** network overview (suggestions, following, followers)
- **Data source:** `/api/follows/suggestions`, `/api/follows/list`, `/api/follows/followers`
- **Tabelle coinvolte:** `follows`, `profiles`, `athletes_view`, `club_verification_requests` (see API)
- **Parity notes for Mobile:** replicate list + suggestions.

### `/notifications`
- **File sorgente:** `app/(dashboard)/notifications/page.tsx` + `NotificationsPageClient`
- **Chi può vederla:** logged-in
- **Dati mostrati:** notifiche list, filter unread, mark all read.
- **Data source:** `/api/notifications` (GET), `/api/notifications/mark-all-read` (POST), `/api/notifications/unread-count` (for badge, hooks)
- **Tabelle coinvolte:** `notifications`, `profiles`, `athletes_view`, `clubs_view`
- **Colonne lette:**
  - `notifications`: `id, kind, payload, created_at, updated_at, read_at, read, actor_profile_id, recipient_profile_id, user_id`
  - `profiles`: `id, display_name, full_name, avatar_url, account_type`
  - `athletes_view`: `id, display_name, full_name`
  - `clubs_view`: `id, display_name`
- **Colonne scritte:** `notifications.read_at, notifications.read` via mark-all-read and PATCH in `/api/notifications`.
- **Parity notes for Mobile:** replicate filters + mark-all-read and badge count.

### `/messages`
- **File sorgente:** `app/(dashboard)/messages/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** threads list
- **Data source:** `/api/direct-messages/threads`, `/api/direct-messages/unread-count`
- **Tabelle coinvolte:** `direct_messages`, `profiles`, `athletes_view`, `direct_message_hidden_threads`, `direct_message_read_state`
- **Colonne lette:**
  - `direct_messages`: `sender_profile_id, recipient_profile_id, content, created_at, deleted_at`
  - `profiles`: `id, display_name, full_name, avatar_url, status, account_type`
  - `athletes_view`: `id, user_id, full_name, display_name, avatar_url`
  - `direct_message_hidden_threads`: `other_profile_id, hidden_at`.
  - `direct_message_read_state`: `other_profile_id, last_read_at`.
- **Colonne scritte:** none here (reads only).
- **Parity notes for Mobile:** replicate threads + unread indicator logic.

### `/messages/[profileId]`
- **File sorgente:** `app/(dashboard)/messages/[profileId]/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** conversation thread + send/mark read.
- **Data source:** `/api/direct-messages/[profileId]` (GET/POST), `/api/direct-messages/[profileId]/mark-read` (POST), `/api/direct-messages/message/[messageId]` (DELETE)
- **Tabelle coinvolte:** `direct_messages`, `direct_message_read_state`, `profiles`, `athletes_view` (see API)
- **Colonne:** see API section.
- **Parity notes for Mobile:** replicate messaging send/delete + mark-read.

### `/messages/legacy`
- **File sorgente:** `app/(dashboard)/messages/legacy/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** **NON TROVATO** (file non letto)
- **Data source:** **NON TROVATO**.

### `/mymedia`
- **File sorgente:** `app/(dashboard)/mymedia/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** media posts by author
- **Data source:** `/api/feed/posts?authorId=...` (GET)
- **Tabelle coinvolte:** `posts`, `post_media`, `profiles` (see feed API)
- **Colonne lette:** same as `/api/feed/posts` SELECT fields.
- **Parity notes for Mobile:** replicate list of my posts/media.

### `/search`
- **File sorgente:** `app/search/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** search results (clubs/athletes?)
- **Data source:** `/api/search` (GET)
- **Tabelle coinvolte/colonne:** **NON TROVATO** (API route not inspected here; see API section)
- **Parity notes for Mobile:** replicate query + results.

### `/search/club`
- **File sorgente:** `app/search/club/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** club search (UI)
- **Data source:** **NON TROVATO** (file not read; likely shared with `/search`)

### `/search/athletes`
- **File sorgente:** `app/search/athletes/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** athletes search (UI)
- **Data source:** **NON TROVATO**

### `/search-map`
- **File sorgente:** `app/(dashboard)/search-map/page.tsx` + `SearchMapClient`
- **Chi può vederla:** logged-in
- **Dati mostrati:** map search (clubs in bounds)
- **Data source:** `/api/auth/whoami`, `/api/search/clubs-in-bounds`, `/api/search/map`
- **Tabelle coinvolte/colonne:** **NON TROVATO** (API route not inspected here; see API section)

### `/favorites`
- **File sorgente:** `app/favorites/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** **NON TROVATO** (file not read)

### `/athletes/[id]`
- **File sorgente:** `app/athletes/[id]/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** **NON TROVATO** (file not read)

### `/settings`
- **File sorgente:** `app/settings/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** **NON TROVATO**

### `/profile/location-settings`
- **File sorgente:** `app/profile/location-settings/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** **NON TROVATO**

### `/alerts`
- **File sorgente:** `app/alerts/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** **NON TROVATO**

### `/reports`
- **File sorgente:** `app/reports/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** **NON TROVATO**

### `/admin/users`
- **File sorgente:** `app/admin/users/page.tsx`
- **Chi può vederla:** admin
- **Dati mostrati:** admin users list + status update
- **Data source:** `/api/admin/users` (GET), `/api/admin/users/status` (POST)
- **Tabelle/colonne:** **NON TROVATO** (API routes not inspected).

### `/admin/reports`
- **File sorgente:** `app/admin/reports/page.tsx`
- **Chi può vederla:** admin
- **Dati mostrati:** **NON TROVATO**

### `/admin/ads`
- **File sorgente:** `app/admin/ads/page.tsx`
- **Chi può vederla:** admin
- **Dati mostrati:** campaigns, targets, creatives
- **Data source:** `/api/admin/ads/campaigns`, `/api/admin/ads/targets`, `/api/admin/ads/creatives`, `/api/admin/ads/creatives/upload`, `/api/ads/serve`
- **Tabelle/colonne:** **NON TROVATO** (API routes not inspected).

### `/admin/ads/leads`
- **File sorgente:** `app/admin/ads/leads/page.tsx`
- **Chi può vederla:** admin
- **Dati mostrati:** leads list + detail
- **Data source:** `/api/admin/ads/leads`, `/api/admin/ads/leads/[id]`
- **Tabelle/colonne:** **NON TROVATO**.

### `/admin/verifications`
- **File sorgente:** `app/admin/verifications/page.tsx`
- **Chi può vederla:** admin
- **Dati mostrati:** verification requests + actions
- **Data source:** `/api/admin/verifications`, `/api/admin/verifications/[id]/pdf`, `/api/admin/verifications/[id]/mark-paid`, `/api/admin/verifications/[id]/approve`, `/api/admin/verifications/[id]/reject`
- **Tabelle/colonne:** **NON TROVATO**.

### `/debug/client-error`
- **File sorgente:** `app/debug/client-error/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** **NON TROVATO**

### `/debug/env`
- **File sorgente:** `app/debug/env/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** **NON TROVATO**

### `/blocked`
- **File sorgente:** `app/blocked/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** **NON TROVATO**

### `/onboarding`
- **File sorgente:** `app/(dashboard)/onboarding/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** onboarding dashboard
- **Data source:** `/api/auth/whoami`, `/api/profiles/me`, `/api/onboarding/dismiss`
- **Tabelle coinvolte:** `profiles` (me), `onboarding_dismissed`? **NON TROVATO** (see API)
- **Colonne:** **NON TROVATO**.

### `/onboarding/choose-role`
- **File sorgente:** `app/onboarding/choose-role/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** role selection
- **Data source:** `/api/profiles/me` (GET/PATCH)
- **Tabelle coinvolte:** `profiles` (account_type update)
- **Colonne scritte:** `profiles.account_type` (via `/api/profiles/me` PATCH)
- **Parity notes for Mobile:** replicate role choice flow.

### `/login`
- **File sorgente:** `app/login/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** login form
- **Data source:** `/api/auth/session` (POST for session sync)
- **Tabelle coinvolte:** N/A (auth session uses Supabase auth, not DB)
- **Parity notes for Mobile:** use same session sync after login.

### `/logout`
- **File sorgente:** `app/logout/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** logout action
- **Data source:** `/api/auth/session` (POST with null tokens to clear)
- **Parity notes for Mobile:** clear session similarly.

### `/signup`
- **File sorgente:** `app/signup/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** signup form
- **Data source:** Supabase auth client (not via API)
- **Parity notes for Mobile:** replicate signup behavior; use Supabase auth.

### `/reset-password`
- **File sorgente:** `app/reset-password/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** reset password UI
- **Data source:** Supabase auth client

### `/update-password`
- **File sorgente:** `app/update-password/page.tsx`
- **Chi può vederla:** logged-in (password update)
- **Data source:** Supabase auth client

### `/legal/terms`, `/legal/privacy`, `/legal/beta`
- **File sorgente:** `app/legal/*/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** static legal content
- **Data source:** N/A

### `/s/[token]` (share)
- **File sorgente:** `app/s/[token]/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** shared post read-only
- **Data source:** `/api/share-links/[token]` (GET)
- **Tabelle coinvolte:** `share_links`, `posts`, `profiles`, `post_media` (see API)
- **Parity notes for Mobile:** replicare read-only post share.

### `/sponsor`
- **File sorgente:** `app/sponsor/page.tsx`
- **Chi può vederla:** public
- **Dati mostrati:** sponsor info + lead form
- **Data source:** `/api/ads/leads` (POST)
- **Tabelle coinvolte:** `ads_leads`? **NON TROVATO** (see API).

### `/api/applications/sent` (UI)
- **File sorgente:** `app/api/applications/sent/page.tsx`
- **Chi può vederla:** logged-in
- **Dati mostrati:** redirect or list (uses `/api/applications/mine`)
- **Data source:** `/api/applications/mine` (GET)
- **Tabelle coinvolte/colonne:** see `/api/applications/me`.

---

## API routes (dettaglio)

> Solo endpoints realmente usati dalle pagine. Le tabelle/colonne sono quelle presenti nelle query Supabase o nei payload insert/update/delete.

### `/api/auth/whoami` (GET)
- **Auth requirement:** cookie-based Supabase session
- **Tabelle/colonne:**
  - `profiles`: select `account_type, type, status`; update `is_admin, updated_at`; upsert `user_id, display_name, account_type, role`.
  - `opportunities`: select `id` (count) where `created_by`.
  - `preapproved_emails`: select `role_hint` by `email`.
- **Response JSON:** `{ user, role, profile, clubsAdmin, admin }`.

### `/api/auth/session` (POST)
- **Auth requirement:** none (session sync)
- **Tabelle:** none (Supabase auth only)
- **Response JSON:** `{ ok: true }` or `{ ok: true, cleared: true }`.

### `/api/profiles/me` (GET/PATCH)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `profiles` GET: `*` by `user_id`.
  - `club_verification_requests_view`: select `is_verified` by `club_id`.
  - `regions/provinces/municipalities`: select `name` for resolving `interest_*` labels.
  - PATCH update fields (subset): `full_name, display_name, avatar_url, bio, country, region, province, birth_year, birth_place, city, residence_region_id, residence_province_id, residence_municipality_id, birth_country, birth_region_id, birth_province_id, birth_municipality_id, foot, height_cm, weight_kg, sport, role, visibility, interest_country, interest_region_id, interest_province_id, interest_municipality_id, interest_region, interest_province, interest_city, links, skills, notify_email_new_message, account_type, club_foundation_year, club_stadium, club_stadium_address, club_stadium_lat, club_stadium_lng, club_league_category, club_motto`.
- **Response JSON:** `{ data: profile }`.

### `/api/profiles/public` (GET)
- **Auth requirement:** none
- **Tabelle/colonne:**
  - `profiles`: select `id,user_id,display_name,full_name,first_name,last_name,headline,bio,sport,role,country,region,province,city,avatar_url,account_type,skills`.
  - `profile_skill_endorsements`: select `profile_id, skill_name` (counts) and `endorser_profile_id` (viewer-specific).
- **Response JSON:** `{ data: PublicProfileSummary[] }`.

### `/api/profiles/[id]/skills/endorse` (POST)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** `profile_skill_endorsements` insert/delete based on `profile_id, endorser_profile_id, skill_name`.
- **Response JSON:** `{ ok, endorsementsCount }`.

### `/api/profiles/avatar` (POST)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO** (route not inspected).
- **Response JSON:** **NON TROVATO**.

### `/api/feed/posts` (GET/POST)
- **Auth requirement:** GET public-ish (auth affects scope), POST requires auth
- **Tabelle/colonne:**
  - `posts` select (GET): `id, author_id, content, created_at, media_url, media_type, media_aspect, kind, event_payload, quoted_post_id, link_url, link_title, link_description, link_image`.
  - `posts` insert (POST): `author_id, content, media_url, media_type, media_aspect, link_url, link_title, link_description, link_image, kind, event_payload, quoted_post_id`.
  - `post_media` select (GET) + insert (POST): `id, post_id, media_type, url, poster_url, width, height, position`.
  - `profiles` select: `id, user_id, full_name, display_name, avatar_url, account_type, type`.
  - `follows` select: `target_profile_id` by `follower_profile_id`.
  - `club_verification_requests` select for verified badge.
- **Response JSON:** `{ items, nextPage, _debug? }` or `{ data }`.

### `/api/feed/posts/[id]` (PATCH/DELETE)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `posts` select `id, author_id`; update `content`; delete by `id`.
  - `post_media` select `id, post_id, media_type, url, poster_url, width, height, position`.
- **Response JSON:** `{ ok, item }` for PATCH; `{ ok }` for DELETE.

### `/api/feed/reactions` (GET/POST)
- **Auth requirement:** GET optional auth for `mine`; POST requires auth
- **Tabelle/colonne:** `post_reactions` select `post_id, reaction, user_id`; insert `post_id, user_id, reaction`; update `reaction`; delete by `id`.
- **Response JSON:** `{ counts, mine }` or `{ postId, counts, mine }`.

### `/api/feed/comments` (GET/POST)
- **Auth requirement:** GET public-ish; POST requires auth
- **Tabelle/colonne:**
  - `post_comments`: select `id, post_id, author_id, body, created_at`; insert `post_id, body, author_id`.
  - `profiles`: select `id, user_id, full_name, display_name, avatar_url, account_type, status`.
  - `club_verification_requests`: select `club_id, status, payment_status, verified_until, created_at`.
- **Response JSON:** `{ comments }` or `{ comment }`.

### `/api/feed/comments/counts` (GET)
- **Auth requirement:** none
- **Tabelle/colonne:** `post_comments` select `post_id`.
- **Response JSON:** `{ counts: [{ post_id, count }] }`.

### `/api/feed/comments/[id]` (PATCH/DELETE)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO** (route not inspected).

### `/api/feed/starter-pack` (GET)
- **Auth requirement:** cookie-based (returns empty for guest)
- **Tabelle/colonne:**
  - `profiles`: select `id, account_type, status, country, city, interest_country, interest_city, display_name, full_name, sport` (viewer); and `id, account_type, full_name, display_name, role, city, country, sport, avatar_url, created_at` (suggestions).
  - `opportunities`: select `id,title,description,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name,gender,club_id,owner_id,created_by,status`.
- **Response JSON:** `{ opportunities, profiles }`.

### `/api/feed/highlights` (GET)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO** (route not inspected).

### `/api/link-preview` (POST)
- **Auth requirement:** none
- **Tabelle:** none (HTTP fetch to external URL)
- **Response JSON:** `{ title, description, image }` (see route for exact shape).

### `/api/share-links` (POST)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `posts`: select `id` for validation.
  - `share_links`: insert `token, resource_type, resource_id, created_by, expires_at`; select `token, resource_type, resource_id, created_at, expires_at, revoked_at`.
- **Response JSON:** `{ shareLink: { token, url, resourceType, resourceId, createdAt, expiresAt, revokedAt } }`.

### `/api/share-links/[token]` (GET/POST)
- **Auth requirement:** GET public; POST revoke requires auth
- **Tabelle/colonne:**
  - `share_links`: select `token, resource_type, resource_id, revoked_at, expires_at, created_by`; update `revoked_at`.
  - `posts`: select `*` by `id` (admin).
  - `profiles`: select `id, user_id, full_name, display_name, avatar_url, account_type, type` (author).
  - `post_media`: select `id, post_id, media_type, url, poster_url, width, height, position`.
- **Response JSON:** `{ ok: true, post }` for GET; `{ shareLink, alreadyRevoked? }` for POST revoke.

### `/api/follows` (GET)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `profiles`: select `id, status` by `user_id`.
  - `follows`: select `target_profile_id` by `follower_profile_id`; select `follower_profile_id` by `target_profile_id`.
- **Response JSON:** `{ profileId, followingIds, followerIds, data }`.

### `/api/follows/toggle` (POST)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `profiles`: via `getActiveProfile`/`getProfileById` (see lib)
  - `follows`: select `id`; insert `follower_profile_id, target_profile_id`; delete by `id`.
- **Response JSON:** `{ isFollowing, targetProfileId, self? }`.

### `/api/follows/list` (GET)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `follows`: select `target_profile_id`.
  - `profiles`: select `id, full_name, display_name, account_type, type, avatar_url, city, country, sport, role`.
  - `club_verification_requests`: select `club_id, status, payment_status, verified_until, created_at`.
  - `athletes_view`: select `id, user_id, full_name, display_name, avatar_url`.
- **Response JSON:** `{ items }`.

### `/api/follows/suggestions` (GET)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `profiles`: select `id, user_id, account_type, type, full_name, display_name, role, city, province, region, country, sport, avatar_url, status, updated_at`.
  - `follows`: select `target_profile_id`.
  - `athletes_view`: select `id, full_name, display_name, avatar_url`.
  - `club_verification_requests`: select `club_id, status, payment_status, verified_until, created_at`.
- **Response JSON:** `{ items, nextCursor, role, debug? }`.

### `/api/notifications` (GET/PATCH)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `notifications`: select `id, kind, payload, created_at, updated_at, read_at, read, actor_profile_id, recipient_profile_id`; update `read_at, read`.
  - `profiles`: select `id, display_name, full_name, avatar_url, account_type`.
  - `athletes_view`: select `id, display_name, full_name`.
  - `clubs_view`: select `id, display_name`.
- **Response JSON:** `{ data: NotificationWithActor[] }`.

### `/api/notifications/mark-all-read` (POST)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** `notifications` update `read_at, read` where `user_id` and `read_at` is null.
- **Response JSON:** `{ success: true, updated }`.

### `/api/notifications/unread-count` (GET)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** `notifications` select `id` (count) where `user_id` and `read_at is null or read=false`.
- **Response JSON:** `{ count }`.

### `/api/opportunities` (GET/POST)
- **Auth requirement:** GET public; POST requires club
- **Tabelle/colonne:**
  - `opportunities` select `id,title,description,created_by,created_at,country,region,province,city,sport,role,category,required_category,age_min,age_max,club_name,gender,owner_id,club_id,status` (GET).
  - `profiles` select `id, user_id, display_name, full_name` (club name mapping).
  - POST inserts `title, description, country, region, province, city, sport, role, required_category, age_min, age_max, gender, owner_id, created_by, club_id, club_name, status`.
- **Response JSON:** `{ data, page, pageSize, total, pageCount, sort }` (GET); `{ data }` (POST).

### `/api/opportunities/[id]` (GET/PATCH/DELETE)
- **Auth requirement:** GET public; PATCH/DELETE owner-only
- **Tabelle/colonne:**
  - `opportunities` select `id,title,description,owner_id,created_at,country,region,province,city,sport,role,category,required_category,age_min,age_max,club_name,gender`.
  - PATCH update fields listed above plus `status` if provided in body; DELETE by `id`.
- **Response JSON:** `{ data }` or `{ success: true }`.

### `/api/opportunities/[id]/applications` (GET)
- **Auth requirement:** cookie-based, owner only
- **Tabelle/colonne:**
  - `opportunities` select `created_by` (ownership check).
  - `applications` select `id, athlete_id, note, status, created_at, updated_at`.
  - `profiles` via `getPublicProfilesMap` (see `/api/profiles/public`).
- **Response JSON:** `{ data: applications[] }`.

### `/api/applications` (POST)
- **Auth requirement:** cookie-based (player)
- **Tabelle/colonne:**
  - `opportunities`: select `id, owner_id, created_by`.
  - `applications`: select `id` (dup check); insert `opportunity_id, athlete_id, club_id, note, status`.
- **Response JSON:** `{ data }`.

### `/api/applications/me` (GET)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `applications`: select `id, opportunity_id, status, created_at, note, club_id` by `athlete_id`.
  - `opportunities`: select `id, title, club_id, club_name, role`.
- **Response JSON:** `{ data: enriched[] }`.

### `/api/applications/received` (GET)
- **Auth requirement:** cookie-based (club)
- **Tabelle/colonne:**
  - `opportunities`: select `id, title, role, city, province, region, country, owner_id, created_by` by owner.
  - `applications`: select `id, opportunity_id, athlete_id, club_id, note, status, created_at, updated_at`.
  - `athletes_view`: select `id, user_id, full_name, display_name, role, sport, city, province, region`.
- **Response JSON:** `{ data: enhanced[] }`.

### `/api/applications/[id]` (PATCH/DELETE)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `applications`: select `opportunity_id, athlete_id, status`; update `status`; delete by `id`.
  - `opportunities`: select `owner_id, created_by, title`.
  - `notifications`: insert `user_id, recipient_profile_id, actor_profile_id, kind, payload, read` when status changes.
  - `profiles`: select `id` by `user_id` (for notification actor/recipient).
- **Response JSON:** `{ data }` or `{ ok: true }`.

### `/api/direct-messages/threads` (GET)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:**
  - `direct_messages`: select `sender_profile_id, recipient_profile_id, content, created_at` with `deleted_at is null`.
  - `profiles`: select `id, display_name, full_name, avatar_url, status, account_type`.
  - `athletes_view`: select `id, user_id, full_name, display_name, avatar_url`.
  - `direct_message_hidden_threads`: select `other_profile_id, hidden_at`.
  - `direct_message_read_state`: select `other_profile_id, last_read_at`.
- **Response JSON:** `{ threads }` (see route for shape).

### `/api/direct-messages/[profileId]` (GET/POST)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO** (routes not inspected).

### `/api/direct-messages/[profileId]/mark-read` (POST)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/direct-messages/message/[messageId]` (DELETE)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/direct-messages/conversation/[profileId]` (DELETE)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/direct-messages/unread-count` (GET)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/clubs/me/roster` (GET/POST)
- **Auth requirement:** cookie-based (club)
- **Tabelle/colonne:** **NON TROVATO** (route not inspected).

### `/api/clubs/[id]/roster` (GET)
- **Auth requirement:** public
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/club/verification/status` (GET)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO** (route not inspected).

### `/api/club/verification/upload` (POST)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/club/verification/submit` (POST)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/search` (GET)
- **Auth requirement:** none
- **Tabelle/colonne:** **NON TROVATO** (route not inspected).

### `/api/search/clubs-in-bounds` (GET)
- **Auth requirement:** none
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/search/map` (GET)
- **Auth requirement:** none
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/italy-locations` (GET)
- **Auth requirement:** none
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/onboarding/dismiss` (POST)
- **Auth requirement:** cookie-based
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/ads/leads` (POST)
- **Auth requirement:** none
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/ads/serve` (GET)
- **Auth requirement:** none
- **Tabelle/colonne:** **NON TROVATO**.

### `/api/admin/*` (users, ads, verifications)
- **Auth requirement:** admin
- **Tabelle/colonne:** **NON TROVATO** (routes not inspected).

### `/api/notify-opportunity` (POST)
- **Auth requirement:** none
- **Tabelle/colonne:** **NON TROVATO** (route not inspected; likely email-only).

---

## Note finali per parity Mobile
- Usare gli stessi endpoint e rispettare ruoli (club vs player) dove indicato.
- Per ogni `NON TROVATO`, serve un follow-up di lettura dei file indicati per completare tabelle/colonne.
- Niente nuovi flussi: replicare esattamente gating, error states e badge verified.
