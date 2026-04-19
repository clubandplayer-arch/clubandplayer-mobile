# PR0 Discovery Results

## Commands Run
- `git fetch --all --prune`
- `git branch --show-current`
- `grep -RIn --exclude-dir=node_modules --exclude-dir=.git -E "expo-apple-authentication|signInWithApple|AppleAuthentication" app src`
- `git checkout main`
- `git pull`
- `git log --oneline --decorate -- "app/(auth)/login.tsx" "app/(auth)/signup.tsx" | head -n 20`

## Current Branch
- `work`

## Apple References (current branch)
- `src/lib/appleAuth.ts:1:import * as AppleAuthentication from "expo-apple-authentication";`
- `src/lib/appleAuth.ts:4:export async function signInWithApple() {`
- `src/lib/appleAuth.ts:5:  const credential = await AppleAuthentication.signInAsync({`
- `src/lib/appleAuth.ts:7:            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,`
- `src/lib/appleAuth.ts:8:                  AppleAuthentication.AppleAuthenticationScope.EMAIL,`

## Apple References (main)
- Unable to run on `main` because the branch does not exist in this repository clone:
  - `error: pathspec 'main' did not match any file(s) known to git`

## Git Log for login/signup paths
- `8b41d90 Update brand header styles and auth/message UI colors`
- `132c598 Remove Apple auth from login and signup screens`
- `d3c297e Load Righteous font and polish onboarding/auth headers/buttons`
- `934457e Add remote brand header to onboarding and auth screens`
- `cbbeb9d feat(auth): production-ready login/signup UX`
- `c416a30 Add debug deeplink access`
- `43f8c2f fix(auth): authgate + first-run onboarding + oauth to feed`
- `b126e6f feat(auth): redirect signup to feed when session exists`
- `f018bb3 Fix auth redirect timing on login`
- `09209f5 feat(ios): add Sign in with Apple button to login`
- `79ae5ed chore: init mobile app (expo router + auth + eas)`
