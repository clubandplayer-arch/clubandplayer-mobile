import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { fetchFollowState, toggleFollow } from "../api";

type FollowContextValue = {
  ensureState: (targetIds: string[]) => Promise<void>;
  toggle: (targetProfileId: string) => Promise<void>;
  isFollowing: (targetProfileId: string) => boolean;
  isPending: (targetProfileId: string) => boolean;
};

const FollowContext = createContext<FollowContextValue | null>(null);

function normalizeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => String(id).trim()).filter(Boolean)));
}

export function FollowProvider({ children }: { children: ReactNode }) {
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [knownStateMap, setKnownStateMap] = useState<Map<string, boolean>>(new Map());
  const [pendingSet, setPendingSet] = useState<Set<string>>(new Set());

  const isFollowing = useCallback(
    (targetProfileId: string) => followingSet.has(String(targetProfileId).trim()),
    [followingSet],
  );

  const isPending = useCallback(
    (targetProfileId: string) => pendingSet.has(String(targetProfileId).trim()),
    [pendingSet],
  );

  const ensureState = useCallback(
    async (targetIds: string[]) => {
      const normalized = normalizeIds(targetIds);
      if (!normalized.length) return;

      const unresolved = normalized.filter((id) => !knownStateMap.has(id));
      if (!unresolved.length) return;

      const response = await fetchFollowState(unresolved);
      if (!response.ok || !response.data?.ok || !response.data.state) {
        throw new Error(response.errorText ?? "Impossibile leggere stato follow");
      }

      const state = response.data.state;
      setKnownStateMap((prev) => {
        const next = new Map(prev);
        for (const id of unresolved) {
          const nextValue = Boolean(state[id]);
          next.set(id, nextValue);
        }
        return next;
      });

      setFollowingSet((prev) => {
        const next = new Set(prev);
        for (const id of unresolved) {
          if (Boolean(state[id])) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [knownStateMap],
  );

  const toggle = useCallback(
    async (targetProfileId: string) => {
      const targetId = String(targetProfileId).trim();
      if (!targetId) return;

      if (pendingSet.has(targetId)) return;

      const prevIsKnown = knownStateMap.has(targetId);
      const prevIsFollowing = followingSet.has(targetId);
      const optimisticValue = !prevIsFollowing;

      setPendingSet((prev) => {
        const next = new Set(prev);
        next.add(targetId);
        return next;
      });

      setKnownStateMap((prev) => {
        const next = new Map(prev);
        next.set(targetId, optimisticValue);
        return next;
      });

      setFollowingSet((prev) => {
        const next = new Set(prev);
        if (optimisticValue) next.add(targetId);
        else next.delete(targetId);
        return next;
      });

      try {
        const response = await toggleFollow(targetId);
        if (!response.ok || !response.data?.ok) {
          throw new Error(response.errorText ?? "Impossibile aggiornare follow");
        }

        const nextIsFollowing = Boolean(response.data.isFollowing);
        setKnownStateMap((prev) => {
          const next = new Map(prev);
          next.set(targetId, nextIsFollowing);
          return next;
        });

        setFollowingSet((prev) => {
          const next = new Set(prev);
          if (nextIsFollowing) next.add(targetId);
          else next.delete(targetId);
          return next;
        });
      } catch (error) {
        setKnownStateMap((prev) => {
          const next = new Map(prev);
          if (prevIsKnown) next.set(targetId, prevIsFollowing);
          else next.delete(targetId);
          return next;
        });

        setFollowingSet((prev) => {
          const next = new Set(prev);
          if (prevIsFollowing) next.add(targetId);
          else next.delete(targetId);
          return next;
        });

        throw error;
      } finally {
        setPendingSet((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      }
    },
    [followingSet, knownStateMap, pendingSet],
  );

  const value = useMemo<FollowContextValue>(
    () => ({
      ensureState,
      toggle,
      isFollowing,
      isPending,
    }),
    [ensureState, isFollowing, isPending, toggle],
  );

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollow() {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error("useFollow deve essere usato dentro FollowProvider");
  }
  return context;
}
