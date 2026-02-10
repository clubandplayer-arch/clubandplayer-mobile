import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FollowButton } from "../../src/components/follow/FollowButton";
import { useWebSession, useWhoami } from "../../src/lib/api";

function getProfileIdFromWhoamiProfile(profile: unknown): string | null {
  if (!profile || typeof profile !== "object") return null;
  const candidate = (profile as any).id;
  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  return trimmed ? trimmed : null;
}

export default function PlayerProfileRouteScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();

  const profileIdRaw = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const profileId = String(profileIdRaw).trim();

  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const currentActiveProfileId = getProfileIdFromWhoamiProfile(whoami.data?.profile);

  return (
    <View style={{ flex: 1, padding: 24, gap: 16, backgroundColor: "#ffffff" }}>
      <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
        <Text style={{ fontWeight: "700", color: "#111827" }}>← Indietro</Text>
      </Pressable>

      <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>
        Player profile
      </Text>
      <Text style={{ color: "#374151" }}>id: {profileId || "—"}</Text>

      <FollowButton
        targetProfileId={profileId}
        currentProfileId={currentActiveProfileId}
        canToggle={Boolean(whoami.data?.user)}
        onRequireAuth={() => {
          router.replace("/(auth)/login");
        }}
      />
    </View>
  );
}
