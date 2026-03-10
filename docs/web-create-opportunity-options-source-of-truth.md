# Web create opportunity: source of truth opzioni (stato reale verificabile da questo ambiente)

## Premessa / perimetro di verifica
Questo documento risponde alla richiesta di estrarre la source of truth **dal codice web reale** per `/opportunities/new`.

In questo ambiente è disponibile solo il repository `clubandplayer-mobile` e **non** il repository web `clubandplayer-app`.
Di conseguenza:
- non è stato possibile aprire direttamente file web come `app/(dashboard)/opportunities/new/page.tsx`;
- non è stato possibile clonare il repo web via rete (tentativo fallito con `CONNECT tunnel failed, response 403`).

Per evitare invenzioni, sotto riporto solo ciò che è verificabile:
1. file/implementazione mobile corrente;
2. documentazione interna già presente nel repo mobile che cita i file web;
3. punti che restano **NON TROVATO nel codice web reale** finché non viene fornito accesso al repo web.

---

## 1) Route e componenti reali del form create opportunity

### Evidenza disponibile
Dalla documentazione interna (`docs/web-to-mobile-pages-spec.md`) la route web è:
- `/opportunities/new`
- file sorgente web dichiarato: `app/(dashboard)/opportunities/new/page.tsx`.

> Nota: questa è una citazione da spec interna, non ispezione diretta del repo web.

### Stato verifica codice web reale
- Pagina web reale: **NON ISPEZIONABILE in questo ambiente**.
- Componenti figli reali del form: **NON TROVATO**.
- Validator/schema/helpers web collegati: **NON TROVATO**.

---

## 2) Source of truth reale delle opzioni (SPORTS, SPORTS_ROLES, AGE_BRACKETS, CATEGORIES_BY_SPORT, COUNTRIES, OPPORTUNITY_GENDER_LABELS)

## Esito richiesto (repo web reale)
Non disponibile in questo ambiente per assenza repo `clubandplayer-app`.

## Cosa è stato trovato nel repo mobile (da NON considerare web source-of-truth)
Nel mobile esiste `src/constants/opportunities.ts` con valori hardcoded:
- `SPORTS`
- `SPORTS_ROLES`
- `AGE_BRACKETS`
- `CATEGORIES_BY_SPORT`
- `COUNTRIES`
- `OPPORTUNITY_GENDER_LABELS`

Questi valori sono nel codice mobile e **non possono essere certificati come valori web reali** senza ispezione del repo web.

### Valori attualmente presenti nel mobile
- `SPORTS = ["Calcio", "Basket", "Volley", "Tennis", "Atletica"]`
- `SPORTS_ROLES.Calcio = ["Portiere", "Difensore", "Centrocampista", "Attaccante"]`
- `AGE_BRACKETS = ["U13", "U15", "U17", "U19", "U21", "Senior"]`
- `CATEGORIES_BY_SPORT.Calcio = ["Prima Squadra", "Juniores", "Allievi", "Giovanissimi"]`
- `COUNTRIES = ["IT", "ES", "FR", "DE", "GB", "PT", "NL", "BE", "CH", "AT"]`
- `OPPORTUNITY_GENDER_LABELS = ["uomo", "donna", "mixed"]`

Stato affidabilità rispetto al web reale: **NON VERIFICATO**.

---

## 3) Regole reali del form (mappatura campo UI/payload)

Senza accesso al codice web posso mappare solo il form mobile corrente e marcare cosa manca dal web.

| Campo | UI mobile attuale | Payload mobile (`CreateOpportunityPayload`) | Obbligatorio mobile | Dipendenze mobile | Governa (mobile) | Stato verifica web |
|---|---|---|---|---|---|---|
| `title` | TextInput | `title` | Sì | No | `app/opportunities/new.tsx` (`onSubmit`) | NON VERIFICATO su web |
| `description` | TextInput multiline | `description` | No | No | `app/opportunities/new.tsx` | NON VERIFICATO |
| `country` | selector modal | `country` | Di fatto sì (default `IT`) | influenza geo | `app/opportunities/new.tsx` | NON VERIFICATO |
| `region` | selector IT / text non-IT | `region` | Sì per submit | country | `app/opportunities/new.tsx` | NON VERIFICATO |
| `province` | selector IT / text non-IT | `province` | Sì solo per IT | country/region | `app/opportunities/new.tsx` | NON VERIFICATO |
| `city` | selector IT / text non-IT | `city` | Sì per submit | country/province | `app/opportunities/new.tsx` | NON VERIFICATO |
| `sport` | selector modal | `sport` | Sì | abilita ruoli/categorie | `app/opportunities/new.tsx` + `src/constants/opportunities.ts` | NON VERIFICATO |
| `role` | selector modal | `role` | Sì solo se `sport=Calcio` | sport | `app/opportunities/new.tsx` | NON VERIFICATO |
| `category` | selector modal | `category` | No | sport | `app/opportunities/new.tsx` | NON VERIFICATO |
| `required_category` | selector modal | `required_category` | No | sport | `app/opportunities/new.tsx` | NON VERIFICATO |
| `age_bracket` | selector modal | `age_bracket` | No | No | `app/opportunities/new.tsx` | NON VERIFICATO |
| `age_min` | TextInput numeric | `age_min` | No | coerenza con `age_max` | `app/opportunities/new.tsx` | NON VERIFICATO |
| `age_max` | TextInput numeric | `age_max` | No | coerenza con `age_min` | `app/opportunities/new.tsx` | NON VERIFICATO |
| `gender` | selector modal | `gender` | Sì | No | `app/opportunities/new.tsx` + type | NON VERIFICATO |
| `status` | non in UI | non in payload | n/a | n/a | `src/types/opportunity.ts` | NON VERIFICATO |

---

## 4) Regole speciali richieste (stato)

### `status` presente nel form web create?
- **NON VERIFICABILE da codice web reale** in questo ambiente.
- La spec interna cita `status` tra colonne scritte API, ma non prova che sia un input UI del form.

### `gender` obbligatorio?
- Mobile attuale: sì (blocco submit + tipo `gender: string`).
- Web reale: **NON VERIFICATO**.

### `role` obbligatorio solo Calcio?
- Mobile attuale: sì, solo per `Calcio`.
- Web reale: **NON VERIFICATO**.

### `category` e `required_category`
- Mobile attuale: entrambi disponibili, non obbligatori, dipendono da sport.
- Web reale: **NON VERIFICATO**.

### `age_bracket`
- Mobile attuale: presente come selector, non obbligatorio.
- Web reale: **NON VERIFICATO**.

### Geo IT a cascata
- Mobile usa helper: `getRegions` → `getProvinces` → `getMunicipalities`.
- Implementazione helper in `src/lib/geo/location.ts` via RPC `location_children` + fallback tabelle `regions/provinces/municipalities`.
- Parity web reale su questo punto: **NON VERIFICATA**.

### Geo non-IT
- Mobile: campi testo libero (`region`, `province`, `city`).
- Web reale: **NON VERIFICATO**.

---

## 5) Payload reale inviato oggi dal mobile a POST `/api/opportunities`

Payload costruito in `app/opportunities/new.tsx`:

```ts
{
  title,
  description,
  country,
  region,
  province,
  city,
  sport,
  role,
  category,
  required_category,
  age_bracket,
  age_min,
  age_max,
  gender,
}
```

### Normalizzazioni mobile
- stringhe passano da `asOptionalText` (`""` -> `null`);
- numeri da `asOptionalNumber`;
- `role` forzato `null` se sport non è `Calcio`.

### Redirect mobile dopo successo
- `router.replace("/(tabs)/opportunities")`.

### Shape response API gestita lato mobile
`src/lib/opportunities/createOpportunity.ts` accetta sia:
- `response.data.data`
- sia `response.data` diretta.

---

## 6) Cosa il mobile sta ancora sbagliando rispetto alla richiesta “web source-of-truth reale”

1. Le opzioni del form (`SPORTS`, `SPORTS_ROLES`, `AGE_BRACKETS`, `CATEGORIES_BY_SPORT`, `COUNTRIES`, `OPPORTUNITY_GENDER_LABELS`) sono hardcoded nel mobile e non collegate al codice web reale verificato.
2. Non c’è evidenza file-per-file dal repo web delle regole di obbligatorietà/dipendenza campi.
3. Non c’è prova dal codice web reale su presenza/assenza `status` nella UI create.
4. Non c’è prova dal codice web reale su comportamento effettivo di geo IT/non-IT.

---

## 7) Passi necessari per chiudere davvero il task 1:1

Per completare la richiesta in modo definitivo serve accesso al repo web `clubandplayer-app` (o uno snapshot dei file sorgente web). Con accesso, i file minimi da estrarre/citare sono:
- route `/opportunities/new` (`page.tsx` + componenti usati);
- eventuali file costanti/export opzioni;
- schema/validator (es. zod/yup o helper custom);
- handler submit e redirect;
- route API `POST /api/opportunities` (payload parser/server validation).

Senza questi file, qualsiasi lista “ufficiale” valori rischia di essere inventata/incompleta.
