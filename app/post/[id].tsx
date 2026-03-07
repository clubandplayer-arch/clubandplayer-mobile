import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyPostDetailRedirect() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || !id.trim()) {
    return <Redirect href="/feed" />;
  }

  return <Redirect href={`/posts/${encodeURIComponent(id)}`} />;
}
