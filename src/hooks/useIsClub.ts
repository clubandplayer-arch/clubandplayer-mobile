import { useCallback, useEffect, useState } from "react";

import { fetchProfileMe, fetchWhoami } from "../lib/api";

export function useIsClub() {
  const [isClub, setIsClub] = useState(false);
  const [loading, setLoading] = useState(true);

  const resolveIsClub = useCallback(async () => {
    setLoading(true);

    const whoami = await fetchWhoami();
    if (whoami.ok && whoami.data?.role === "club") {
      setIsClub(true);
      setLoading(false);
      return;
    }

    const profile = await fetchProfileMe();
    if (profile.ok && profile.data?.account_type === "club") {
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

  return { isClub, loading, reload: resolveIsClub };
}
