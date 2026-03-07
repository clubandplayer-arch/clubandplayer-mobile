# MP-05 — PARITY.POST.1 — Censimento dominio Post mobile

## 1) MAPPA ROUTE POST MOBILE

### Route reali Expo Router (dominio Post)

| Route | File | Stato attuale | Note |
|---|---|---|---|
| `/posts/[id]` | `app/posts/[id].tsx` | **Attiva e referenziata** | Route principale usata da feed card, notifiche e deep-link share token. |
| `/post/[id]` | `app/post/[id].tsx` | **Attiva ma non referenziata** | Implementazione legacy/duplicata del detail post, senza ingressi di navigazione interni rilevati. |
| `/s/[token]` | `app/s/[token].tsx` | **Attiva e referenziata** | Risolve token share via endpoint web e fa redirect verso `/posts/${id}`. |

### Differenze sostanziali tra le due route detail

- `app/posts/[id].tsx` (plurale) è orientata a **parity Web**:
  - usa sessione web (`useWebSession`, `useWhoami`),
  - usa endpoint web per reazioni/commenti (`/api/feed/reactions`, `/api/feed/comments/counts`, `/api/feed/comments`),
  - usa `CommentsSection` condivisa con API web-like,
  - usa share-link web (`/api/share-links`).
- `app/post/[id].tsx` (singolare) è una variante legacy con datasource prevalentemente Supabase diretto + discovery schema dinamica per social, e UI/flow separati.

## 2) MAPPA NAVIGAZIONI

### File/componenti che puntano a `/posts/[id]`

1. `src/components/feed/FeedCard.tsx`
   - `resolvePostPath()` costruisce `/posts/${id}`.
   - Navigazione usata su tap testo e su tap commenti.
2. `app/(tabs)/notifications/index.tsx`
   - Per notifiche `new_comment` / `new_reaction` fa `router.push(`/posts/${p.post_id}`)`.
3. `app/s/[token].tsx`
   - Dopo risoluzione token fa `router.replace(`/posts/${postId}`)`.
4. `app/_layout.tsx`
   - `allowAuthedOutsideTabs` consente esplicitamente pathname che iniziano con `/posts/`.
   - Stack registra esplicitamente `posts/[id]`.

### File/componenti che puntano a `/post/[id]`

- **Nessun puntamento attivo trovato** (nessun `router.push`, `router.replace`, `href`, `pathname` verso `/post/[id]` nel codice runtime).
- Rimane il file route `app/post/[id].tsx` come entrypoint potenziale solo via URL diretto/deep link esterno costruito manualmente.

## 3) MAPPA DATASOURCE

### A) Feed + card (entry verso detail)
- **Feature:** caricamento lista post e metadata social.
- **Datasource:** endpoint web
  - `GET /api/feed/posts`
  - `GET /api/feed/reactions?ids=...`
  - `GET /api/feed/comments/counts?ids=...`
- **Helper/repository:**
  - `src/lib/feed/getFeedPosts.ts`
  - `src/lib/api.ts` (`fetchFeedPosts`, `fetchReactionsForIds`, `fetchCommentCountsForIds`)
- **Output nav detail:** sempre `/posts/[id]` via `FeedCard`.

### B) Detail moderno `/posts/[id]`
- **Feature:** dettaglio post, quote, like, contatore commenti, comment composer, share.
- **Datasource misto (prevalenza web parity):**
  - Supabase diretto per post core e author profile:
    - `posts`
    - `profiles`
  - Endpoint web per social:
    - `GET /api/feed/reactions?ids=...`
    - `GET /api/feed/comments/counts?ids=...`
    - `POST /api/feed/reactions` (like/unlike con `reaction: like|null`)
    - `GET/POST/PATCH/DELETE /api/feed/comments...` (tramite `CommentsSection`)
  - Endpoint web per share:
    - `POST /api/share-links`
- **Helper/repository:**
  - `app/posts/[id].tsx`
  - `src/lib/api.ts`
  - `src/components/CommentsSection.tsx`
  - `src/lib/shareLinks.ts`, `src/lib/sharePost.ts`

### C) Detail legacy `/post/[id]`
- **Feature:** dettaglio alternativo con social + commenti integrati nello screen.
- **Datasource prevalente Supabase diretto con discovery dinamica schema:**
  - `posts` (select `*`)
  - `post_media`
  - social via `getPostSocial` + `togglePostLike` + `createPostComment` con discovery tabelle/colonne:
    - like tables candidate: `likes`, `post_likes`, `likes_posts`, `reactions`, `post_reactions`
    - comments tables candidate: `comments`, `post_comments`, `comments_posts`
- **Helper/repository:**
  - `src/lib/posts/getPostSocial.ts`
  - `src/lib/posts/togglePostLike.ts`
  - `src/lib/posts/createPostComment.ts`
- **Nota:** implementazione autonoma rispetto alla pipeline web `/api/feed/*`.

### D) Composer/create post
- **Composer feed (`components/feed/FeedComposer.tsx`)**
  - usa endpoint web `POST /api/feed/posts` (con upload media via signed URL ritornati dal backend web).
- **Tab create (`app/(tabs)/create/index.tsx`)**
  - usa Supabase diretto tramite `src/lib/posts/createPost.ts`:
    - insert `posts`
    - insert `post_media`
- **Divergenza:** due percorsi di creazione post attivi con datasource diversi.

### E) Share/deep-link
- `src/lib/shareLinks.ts`: `POST /api/share-links`
- `app/s/[token].tsx`: `GET /api/share-links/:token` poi redirect a `/posts/[id]`

## 4) DIVERGENZE ARCHITETTURALI

1. **Duplicazione route detail**
   - `/posts/[id]` e `/post/[id]` coesistono con implementazioni diverse.
2. **Duplicazione datasource social/commenti**
   - percorso moderno usa `/api/feed/*` (coerenza web);
   - percorso legacy usa Supabase + discovery schema runtime.
3. **Duplicazione create post**
   - feed composer = web API;
   - tab create = Supabase diretto.
4. **Route singolare non allineata alla navigazione reale**
   - nessun caller interno verso `/post/[id]`, ma file ancora presente => rischio regressioni/deep link incoerenti.
5. **Rischio drift funzionale**
   - like/comment count, policy permessi, shape payload e handling error possono divergere tra i due mondi.

## 5) VERDETTO FINALE

- **Source of truth mobile da consolidare:** `/posts/[id]` (plurale).
- Motivazioni:
  - è l’unica route detail usata dai punti di ingresso reali (feed/notifiche/share token),
  - è già innestata nella parity web (`/api/feed/*`, `/api/share-links`),
  - è già esplicitamente registrata/ammessa nel root layout.
- **`/post/[id]` (singolare):** da trattare come legacy.
  - Raccomandazione MP-06: **redirect/alias temporaneo verso `/posts/[id]`** per backward compatibility, poi rimozione file legacy a valle validazione.

### File candidati coinvolti in MP-06

- Route/routing:
  - `app/post/[id].tsx` (deprecazione/redirect/rimozione)
  - `app/posts/[id].tsx` (unica implementazione detail)
  - `app/_layout.tsx` (eventuale hardening whitelist route)
- Navigazioni:
  - verifica globale caller detail (attualmente allineati a `/posts/[id]`)
- Datasource social/commenti:
  - convergenza su `src/lib/api.ts` + `src/components/CommentsSection.tsx`
  - dismissione progressiva dipendenze `src/lib/posts/getPostSocial.ts`, `togglePostLike.ts`, `createPostComment.ts` dove riferite al detail legacy
- Composer:
  - allineare `app/(tabs)/create/index.tsx`/`src/lib/posts/createPost.ts` alla pipeline web, se richiesto dalla milestone di unificazione.

## 6) TABELLA FINALE OBBLIGATORIA

| Elemento | File | Route target | Datasource | Stato | Note parity |
|---|---|---|---|---|---|
| Detail post principale | `app/posts/[id].tsx` | `/posts/[id]` | Supabase (`posts`,`profiles`) + Web API (`/api/feed/reactions`, `/api/feed/comments/*`, `/api/share-links`) | Attivo | Coerente con ingressi reali e con web parity social/share. |
| Detail post legacy | `app/post/[id].tsx` | `/post/[id]` | Supabase diretto + discovery tabelle like/comment | Legacy attivo ma orfano | Divergente, rischio drift, candidato a redirect/rimozione. |
| Feed card navigation | `src/components/feed/FeedCard.tsx` | `/posts/[id]` | Feed da `/api/feed/posts` + counters da `/api/feed/*` | Attivo | Allineato a source of truth plurale. |
| Notifiche deep-link post | `app/(tabs)/notifications/index.tsx` | `/posts/[id]` | Notifiche API + push router | Attivo | Allineato alla route plurale. |
| Share token resolver | `app/s/[token].tsx` | `/posts/[id]` (redirect) | `GET /api/share-links/:token` | Attivo | Allineato route plurale + web share links. |
| Gate routing root | `app/_layout.tsx` | allow `/posts/*` | N/A routing guard | Attivo | Whitelist include solo plurale. |
| Commenti detail moderno | `src/components/CommentsSection.tsx` | n/a (usato in `/posts/[id]`) | `/api/feed/comments` (GET/POST/PATCH/DELETE) | Attivo | Pipeline web-like. |
| Social detail legacy helper | `src/lib/posts/getPostSocial.ts` | n/a (usato da `/post/[id]`) | Supabase discovery multi-tabella | Legacy | Non allineato alla API web unica. |
| Toggle like legacy helper | `src/lib/posts/togglePostLike.ts` | n/a (usato da `/post/[id]` + feed card like locale) | Supabase discovery like source | Misto | Da valutare convergenza a `/api/feed/reactions`. |
| Create post tab | `app/(tabs)/create/index.tsx` + `src/lib/posts/createPost.ts` | n/a | Supabase diretto (`posts`,`post_media`) | Attivo | Diverge da composer feed (web API). |
| Create post composer feed | `components/feed/FeedComposer.tsx` | n/a | `POST /api/feed/posts` (+ link preview API) | Attivo | Più vicino alla parity web. |

## Comandi usati per il censimento

```bash
pwd && rg --files -g 'AGENTS.md'
find .. -maxdepth 3 -name AGENTS.md
find app -maxdepth 4 -type f | sort
rg -n '/posts/\[id\]|/posts/' .
rg -n "/posts/|/post/|pathname:\s*\"/posts/\[id\]|pathname:\s*\"/post/\[id\]" app src components
rg -n "router\.(push|replace|navigate)\(.*posts|router\.(push|replace|navigate)\(.*post|href=.*posts|href=.*post|pathname:\s*['\"]/posts/\[id\]|pathname:\s*['\"]/post/\[id\]" app src components --glob '!**/*.md' --glob '!FULL_FILES.txt' --glob '!PR6-clean-input.txt'
rg -n "/post/\\[id\\]|/post/" app src components
find src/lib -maxdepth 3 -type f | rg 'post|feed|getFeed|share|comment|reaction'
rg -n 'fetchReactionsForIds|fetchCommentCountsForIds|setPostReaction|apiFetch|/api/feed|/api/comments|/api/reactions' src/lib/api.ts src/lib -g '*.ts'
```

## Branch

`mp-05-parity-post-1-censimento`

## Esito ricerche globali rilevanti

- Ricerca navigazioni verso `/posts/[id]`: **4 ingressi runtime** (FeedCard, Notifications, Share token redirect, whitelist layout).
- Ricerca navigazioni verso `/post/[id]`: **0 ingressi runtime** nel codice applicativo.
- Presenza file route legacy: **`app/post/[id].tsx` presente** e compilabile come route Expo Router autonoma.
