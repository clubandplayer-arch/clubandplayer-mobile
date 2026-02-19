import { useCallback, useEffect, useState } from "react";

import { fetchProfileMe, fetchWhoami } from "../lib/api";
import { on } from "../lib/events/appEvents";

function isClubValue(value: unknown): boolean {
  return String(value ?? "").toLowerCase() === "club";
}

export function useIsClub() {
  const [isClub, setIsClub] = useState(false);
  const [loading, setLoading] = useState(true);

  const resolveIsClub = useCallback(async () => {
    setLoading(true);

    const whoami = await fetchWhoami();
    if (whoami.ok && isClubValue(whoami.data?.role)) {
      setIsClub(true);
      setLoading(false);
      return;
    }

    const profile = await fetchProfileMe();
    if (profile.ok && isClubValue(profile.data?.account_type)) {
      setIsClub(true);
      setLoading(false);
      return;
    }

    setIsClub(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void resolveIsClub();
  }, [resolveIsClub]);

  useEffect(() => {
    const unsubscribe = on("app:auth-session-updated", () => {
      void resolveIsClub();
    });

    return unsubscribe;
  }, [resolveIsClub]);

  return { isClub, loading, reload: resolveIsClub };
}
