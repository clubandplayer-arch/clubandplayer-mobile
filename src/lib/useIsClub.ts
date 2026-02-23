import { useCallback, useEffect, useRef, useState } from "react";

import { fetchProfileMe, fetchWhoami } from "./api";

export function useIsClub(enabled: boolean = true) {
  const [isClub, setIsClub] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasStableProfileRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);

    let nextIsClub = false;
    let role: string | null = null;
    let accountType: string | null = null;
    let userId: string | null = null;

    const profileMe = await fetchProfileMe();
    if (__DEV__) {
      console.log("[isClub][profileMe]", {
        ok: profileMe.ok,
        status: profileMe.status,
        accountType: profileMe.ok ? profileMe.data?.account_type ?? null : null,
        errorText: profileMe.ok ? null : profileMe.errorText ?? null,
      });
    }

    if (profileMe.ok && profileMe.data) {
      hasStableProfileRef.current = true;

      accountType =
        typeof profileMe.data.account_type === "string"
          ? profileMe.data.account_type.toLowerCase()
          : null;
      userId =
        typeof profileMe.data.user_id === "string" && profileMe.data.user_id.trim()
          ? profileMe.data.user_id.trim()
          : null;

      nextIsClub = accountType === "club";
      setIsClub(nextIsClub);

      if (__DEV__) {
        console.log("[isClub]", {
          isClub: nextIsClub,
          role,
          accountType,
          userIdPresent: !!userId,
        });
      }

      setLoading(false);
      return;
    }

    if (hasStableProfileRef.current) {
      setLoading(false);
      return;
    }

    const whoami = await fetchWhoami();
    if (__DEV__) {
      console.log("[isClub][whoami]", {
        ok: whoami.ok,
        status: whoami.status,
        role: whoami.ok ? whoami.data?.role ?? null : null,
        errorText: whoami.ok ? null : whoami.errorText ?? null,
      });
    }

    if (whoami.ok && whoami.data) {
      role = typeof whoami.data.role === "string" ? whoami.data.role.toLowerCase() : null;
      const user = whoami.data.user as { id?: unknown } | undefined;
      userId = typeof user?.id === "string" && user.id.trim() ? user.id.trim() : null;
      nextIsClub = role === "club";
    }

    setIsClub(nextIsClub);
    if (__DEV__) {
      console.log("[isClub]", {
        isClub: nextIsClub,
        role,
        accountType,
        userIdPresent: !!userId,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsClub(false);
      setLoading(false);
      hasStableProfileRef.current = false;
      return;
    }

    void load();
  }, [enabled, load]);

  return { isClub, loading, reload: load };
}
