# PR-A1 Runtime Proof Pack (Admin Users)

Data: 2026-03-26

## 1) Admin success path (runtime evidenza)

**Stato:** ⚠️ Non eseguibile in questa environment.

Motivo:
- Nessun device/emulatore disponibile (`adb` assente).
- Impossibile acquisire screenshot/video runtime dell'app mobile senza runtime client.

Tentativi effettuati:
- avvio Metro bundler con `CI=1 npx expo start --offline` (ok, bundler attivo su `http://localhost:8081`)
- impossibile procedere con apertura app e interazioni UI senza device/emulatore.

## 2) Non-admin block path (runtime evidenza)

**Stato:** ⚠️ Non eseguibile in questa environment per gli stessi motivi (assenza device/emulatore/account sessione).

## 3) Network proof API

Chiamate effettuate (senza sessione autenticata, quindi comportamento atteso `401 Unauthorized`):

### GET `/api/admin/users?status=pending`
- Request: `GET https://www.clubandplayer.com/api/admin/users?status=pending`
- Status: `401 Unauthorized`
- Response sintetica: `{ "error": "Unauthorized" }`

### POST `/api/admin/users/status`
- Request: `POST https://www.clubandplayer.com/api/admin/users/status`
- Payload test (redatto): `{ "user_id": "00000000-0000-0000-0000-000000000000", "status": "active" }`
- Status: `401 Unauthorized`
- Response sintetica: `{ "error": "Unauthorized" }`

Nota su `user_id`:
- lato mobile PR-A1 invia il campo `user_id` della row (`item.user_id`) e non `profile id` (`item.id`).

## 4) Routing/guard proof

- Nessun update a `app/_layout.tsx` per allowlist `/admin/*`.
- Protezione gestita **dentro** `app/admin/users.tsx` tramite `whoami.data?.admin`.
- Per admin non rimbalza a feed perché il blocco `if (web.error || whoami.error || !isAdmin)` non si attiva quando `isAdmin === true`.

## 5) Regression smoke minimo

**Stato:** ⚠️ Non eseguibile runtime (assenza device/emulatore).

Verifiche statiche disponibili:
- typecheck e doctor passano.
- nessun file toccato fuori scope PR-A1 users approvals.

## 6) Comandi eseguiti

```bash
# toolchain/runtime availability
node -v
npx expo --version
which adb || true
adb devices || true

# metro attempt
CI=1 npx expo start --offline

# network proof (unauthenticated)
curl -sS -i 'https://www.clubandplayer.com/api/admin/users?status=pending' | head -n 20
curl -sS -i -X POST 'https://www.clubandplayer.com/api/admin/users/status' \
  -H 'content-type: application/json' \
  --data '{"user_id":"00000000-0000-0000-0000-000000000000","status":"active"}' | head -n 30

# required checks
npx tsc --noEmit
npx expo-doctor
```
