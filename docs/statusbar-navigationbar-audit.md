# Status/Navigation bar audit (micro PR)

Data audit eseguito su codice applicativo (`app/`, `src/`, `App.tsx`) con ricerca mirata di:

- `StatusBar`
- `backgroundColor` su `StatusBar`
- `navigationBarColor`
- `statusBarColor`
- `expo-navigation-bar`
- `SystemUI`
- `edgeToEdge`

## Risultato

- Trovato solo un utilizzo di `StatusBar` in `App.tsx` con `style="auto"`.
- Nessun uso diretto trovato di:
  - `backgroundColor` su `StatusBar`
  - `navigationBarColor`
  - `statusBarColor`
  - `expo-navigation-bar`
  - `SystemUI`
  - `edgeToEdge`

## Safe area

Verifica rapida effettuata su schermate principali:

- Presenza diffusa di `SafeAreaView` e/o `useSafeAreaInsets` in file `app/` e `src/components/`.
- Nessun intervento UI applicato in questa PR.

## Note

- Nessuna modifica a Expo / React Native.
- Nessuna modifica in `node_modules`.
- Eventuali warning residui provenienti da namespace librerie (es. `com.facebook.react.*`, `com.swmansion.rnscreens.*`, `expo.modules.*`, `com.google.android.material.*`) sono da gestire con upgrade controllato Expo/RN, non con patch locale rischiosa.
