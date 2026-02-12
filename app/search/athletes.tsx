import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function SearchAthletesAlias() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/search?type=players" as any);
  }, [router]);

  return null;
}
