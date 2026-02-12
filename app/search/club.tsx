import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function SearchClubAlias() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/search?type=clubs" as any);
  }, [router]);

  return null;
}
