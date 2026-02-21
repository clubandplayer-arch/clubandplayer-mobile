import { useCallback, useEffect, useState } from "react";

import { fetchProfileMe, fetchWhoami } from "./api";

export function useIsClub(enabled: boolean = true) {
  const [isClub, setIsClub] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const whoami = await fetchWhoami();
    const whoamiRole = whoami.data?.role;
    if (typeof whoamiRole === "string") {
      setIsClub(whoamiRole.toLowerCase() === "club");
      setLoading(false);
      return;
    }

    const profileMe = await fetchProfileMe();
    const accountType = profileMe.data?.account_type;
    setIsClub(typeof accountType === "string" && accountType.toLowerCase() === "club");
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
