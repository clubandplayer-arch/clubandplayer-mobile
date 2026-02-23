import { useCallback, useEffect, useState } from "react";

import { fetchProfileMe, fetchWhoami } from "./api";

export function useIsClub(enabled: boolean = true) {
  const [isClub, setIsClub] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    let nextIsClub = false;
    let role: string | null = null;
    let accountType: string | null = null;
    let userId: string | null = null;

    const whoami = await fetchWhoami();
    if (whoami.ok && whoami.data) {
      role = typeof whoami.data.role === "string" ? whoami.data.role.toLowerCase() : null;
      const user = whoami.data.user as { id?: unknown } | undefined;
      userId = typeof user?.id === "string" && user.id.trim() ? user.id.trim() : null;
      if (role === "club" && userId) nextIsClub = true;
    }

    if (!nextIsClub) {
      const profileMe = await fetchProfileMe();
      if (profileMe.ok && profileMe.data) {
        accountType =
          typeof profileMe.data.account_type === "string"
            ? profileMe.data.account_type.toLowerCase()
            : null;

        if (!userId) {
          userId =
            typeof profileMe.data.user_id === "string" && profileMe.data.user_id.trim()
              ? profileMe.data.user_id.trim()
              : null;
        }

        if (accountType === "club" && userId) nextIsClub = true;
      }
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
      return;
    }

    void load();
  }, [enabled, load]);

  return { isClub, loading, reload: load };
}
