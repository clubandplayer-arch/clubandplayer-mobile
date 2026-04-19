import { useMemo, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { apiFetch, isUuid, useWebSession, useWhoami } from "../../src/lib/api";
import { getFeedPosts, type FeedPost } from "../../src/lib/feed/getFeedPosts";
import FeedCard from "../../src/components/feed/FeedCard";
import { getProfileDisplayName } from "../../src/lib/profiles/getProfileDisplayName";
import PublicProfileHeader, { type PublicProfileLinks } from "../../src/components/profiles/PublicProfileHeader";
import { resolveItalianLocationLabels } from "../../src/lib/geo/location";
import { theme } from "../../src/theme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ProfileRow = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  sport?: string | null;
  role?: string | null;
  birth_year?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  foot?: string | null;
  interest_city?: string | null;
  interest_province?: string | null;
  interest_region?: string | null;
  interest_country?: string | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  links?: PublicProfileLinks | unknown;
  skills?: unknown;
  bio?: string | null;
  [key: string]: unknown;
};

type ProfileSkill = {
  name: string;
  endorsementsCount: number;
  endorsedByMe: boolean;
};

type PublicProfilesResponse = {
  data?: ProfileRow[];
};

type EndorsementRow = {
  skill_name?: string | null;
};

type SkillEndorseResponse = {
  ok?: boolean;
  endorsementsCount?: number;
  message?: string;
};

const getTextValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getNumberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};


function getLinks(value: unknown): PublicProfileLinks {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const pick = (key: "instagram" | "facebook" | "tiktok" | "x") => {
    const raw = obj[key];
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
  };

  const links = {
    instagram: pick("instagram"),
    facebook: pick("facebook"),
    tiktok: pick("tiktok"),
    x: pick("x"),
  };

  return Object.values(links).some(Boolean) ? links : null;
}

function normalizeSkillName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeProfileSkills(value: unknown): ProfileSkill[] {
  if (!Array.isArray(value)) return [];
  const deduped = new Map<string, ProfileSkill>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const name = normalizeSkillName(row.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (deduped.has(key)) continue;
    deduped.set(key, {
      name,
      endorsementsCount: 0,
      endorsedByMe: false,
    });
  }

  return Array.from(deduped.values());
}

export default function PlayerProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const insets = useSafeAreaInsets();

  const id = useMemo(() => {
    const raw = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
    if (!raw) return null;
    const v = String(raw).trim();
    return isUuid(v) ? v : null;
  }, [params.id]);

  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [skills, setSkills] = useState<ProfileSkill[]>([]);
  const [endorsingSkill, setEndorsingSkill] = useState<string | null>(null);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<{ country: string | null; region: string | null; province: string | null; city: string | null } | null>(null);
  const isLoading = loading || web.loading || whoami.loading;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id) {
        setProfile(null);
        setMeId(null);
        setSkills([]);
        setResolvedLocation(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setSkillsError(null);
      const auth = await supabase.auth.getUser();
      const viewerId = auth?.data?.user?.id ?? null;
      setMeId(viewerId);
      const publicProfileRes = await apiFetch<PublicProfilesResponse>(`/api/profiles/public?ids=${encodeURIComponent(id)}`, { method: "GET" });
      const items = Array.isArray(publicProfileRes.data?.data) ? publicProfileRes.data?.data : [];

      if (!mounted) return;

      const nextProfile = items.length > 0 ? (items[0] as ProfileRow) : null;
      setProfile(nextProfile);
      const normalizedSkills = normalizeProfileSkills(nextProfile?.skills);
      setSkills(normalizedSkills);

      if (!nextProfile) {
        setSkills([]);
        setResolvedLocation(null);
        setLoading(false);
        return;
      }

      try {
        const { data: endorsementRows, error: endorsementError } = await supabase
          .from("profile_skill_endorsements")
          .select("skill_name")
          .eq("profile_id", id);

        if (!mounted) return;

        if (endorsementError) {
          setSkillsError(`Errore endorsement: ${endorsementError.message}`);
        } else {
          const countsMap = new Map<string, number>();
          for (const row of (endorsementRows ?? []) as EndorsementRow[]) {
            const normalizedName = normalizeSkillName(row.skill_name);
            if (!normalizedName) continue;
            const key = normalizedName.toLowerCase();
            countsMap.set(key, (countsMap.get(key) ?? 0) + 1);
          }

          let endorsedByMeSet = new Set<string>();
          if (viewerId) {
            const { data: mineRows } = await supabase
              .from("profile_skill_endorsements")
              .select("skill_name")
              .eq("endorser_profile_id", viewerId)
              .eq("profile_id", id);

            if (!mounted) return;

            endorsedByMeSet = new Set<string>();
            for (const row of (mineRows ?? []) as EndorsementRow[]) {
              const normalizedName = normalizeSkillName(row.skill_name);
              if (!normalizedName) continue;
              endorsedByMeSet.add(normalizedName.toLowerCase());
            }
          }

          setSkills(
            normalizedSkills.map((skill) => ({
              ...skill,
              endorsementsCount: countsMap.get(skill.name.toLowerCase()) ?? 0,
              endorsedByMe: endorsedByMeSet.has(skill.name.toLowerCase()),
            })),
          );
        }
      } catch (error) {
        if (!mounted) return;
        setSkillsError(`Errore endorsement: ${error instanceof Error ? error.message : "sconosciuto"}`);
      }

      try {
        const labels = await resolveItalianLocationLabels({
          country: getTextValue(nextProfile.interest_country) ?? getTextValue(nextProfile.country),
          regionId: getNumberValue(nextProfile.interest_region_id),
          provinceId: getNumberValue(nextProfile.interest_province_id),
          municipalityId: getNumberValue(nextProfile.interest_municipality_id),
          regionLabel: getTextValue(nextProfile.interest_region) ?? getTextValue(nextProfile.region),
          provinceLabel: getTextValue(nextProfile.interest_province) ?? getTextValue(nextProfile.province),
          cityLabel: getTextValue(nextProfile.interest_city) ?? getTextValue(nextProfile.city),
        });

        if (!mounted) return;

        setResolvedLocation({
          country: getTextValue(nextProfile.interest_country) ?? getTextValue(nextProfile.country),
          region: labels.region ?? getTextValue(nextProfile.interest_region) ?? getTextValue(nextProfile.region),
          province: labels.province ?? getTextValue(nextProfile.interest_province) ?? getTextValue(nextProfile.province),
          city: labels.city ?? getTextValue(nextProfile.interest_city) ?? getTextValue(nextProfile.city),
        });
      } catch {
        if (!mounted) return;
        setResolvedLocation({
          country: getTextValue(nextProfile.interest_country) ?? getTextValue(nextProfile.country),
          region: getTextValue(nextProfile.interest_region) ?? getTextValue(nextProfile.region),
          province: getTextValue(nextProfile.interest_province) ?? getTextValue(nextProfile.province),
          city: getTextValue(nextProfile.interest_city) ?? getTextValue(nextProfile.city),
        });
      }

      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [id]);

  const isOwner = useMemo(() => {
    if (!profile || !meId) return false;
    return meId === profile.id || meId === profile.user_id;
  }, [meId, profile]);

  const toggleEndorse = async (skill: ProfileSkill) => {
    if (!profile || !id) return;
    if (!meId) {
      setSkillsError("Devi accedere per endorsare una competenza.");
      return;
    }
    if (isOwner) {
      setSkillsError("Non puoi endorsare il tuo profilo.");
      return;
    }

    const action = skill.endorsedByMe ? "remove" : "endorse";
    setEndorsingSkill(skill.name);
    setSkillsError(null);
    try {
      const res = await apiFetch<SkillEndorseResponse>(`/api/profiles/${encodeURIComponent(id)}/skills/endorse`, {
        method: "POST",
        body: JSON.stringify({ skillName: skill.name, action }),
      });

      if (!res.ok || !res.data?.ok) {
        setSkillsError(res.data?.message ?? res.errorText ?? "Errore durante l'endorsement");
        return;
      }

      const newCount = typeof res.data?.endorsementsCount === "number" ? res.data.endorsementsCount : undefined;
      setSkills((prev) =>
        prev.map((item) => {
          if (item.name !== skill.name) return item;
          const delta = action === "endorse" ? 1 : -1;
          const fallback = Math.max(0, (item.endorsementsCount ?? 0) + delta);
          return {
            ...item,
            endorsedByMe: action === "endorse",
            endorsementsCount: newCount ?? fallback,
          };
        }),
      );
    } finally {
      setEndorsingSkill(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadWallPosts = async () => {
      if (!id) {
        setPosts([]);
        setPostsLoading(false);
        return;
      }

      setPostsLoading(true);
      try {
        const res = await getFeedPosts({ scope: "all" });
        if (!mounted) return;

        const filtered = res.items
          .filter((item) => {
            const raw = item.raw ?? {};
            const authorCandidates = [
              raw?.author_profile_id,
              raw?.authorId,
              raw?.author_id,
              raw?.author_profile?.id,
              item.author_id,
            ];
            return authorCandidates.some((candidate) =>
              typeof candidate === "string" ? candidate.trim() === id : false,
            );
          })
          .slice(0, 10);

        setPosts(filtered);
      } catch (error) {
        if (__DEV__) console.log("[players] wall posts load error", error);
        if (!mounted) return;
        setPosts([]);
      } finally {
        if (mounted) setPostsLoading(false);
      }
    };

    void loadWallPosts();

    return () => {
      mounted = false;
    };
  }, [id]);

  const displayName = isLoading ? "Caricamento…" : getProfileDisplayName({ ...(profile ?? {}), account_type: "athlete" });
  const avatarUrl = getTextValue(profile?.avatar_url);
  const sport = getTextValue(profile?.sport);
  const role = getTextValue(profile?.role);
  const sportRole = [sport, role].filter(Boolean).join(" • ") || "—";

  const countryCode = getTextValue(resolvedLocation?.country) ?? getTextValue(profile?.interest_country) ?? getTextValue(profile?.country);
  const nationality = countryCode || "—";
  const birthYear = getNumberValue(profile?.birth_year);
  const currentYear = new Date().getFullYear();
  const age = birthYear ? String(currentYear - birthYear) : "—";

  const heightCm = getNumberValue(profile?.height_cm);
  const weightKg = getNumberValue(profile?.weight_kg);
  const height = heightCm ? `${heightCm} cm` : "—";
  const weight = weightKg ? `${weightKg} kg` : "—";
  const foot = getTextValue(profile?.foot) || "—";

  const interestParts = [
    getTextValue(resolvedLocation?.city) ?? getTextValue(profile?.interest_city) ?? getTextValue(profile?.city),
    getTextValue(resolvedLocation?.province) ?? getTextValue(profile?.interest_province) ?? getTextValue(profile?.province),
    getTextValue(resolvedLocation?.region) ?? getTextValue(profile?.interest_region) ?? getTextValue(profile?.region),
    getTextValue(resolvedLocation?.country) ?? getTextValue(profile?.interest_country) ?? getTextValue(profile?.country),
  ].filter(Boolean) as string[];
  const interestLocation = interestParts.join(" • ") || "—";

  const biography = getTextValue(profile?.bio) || "—";
  const viewerProfileId =
    whoami.data?.profile && typeof whoami.data.profile === "object"
      ? getTextValue((whoami.data.profile as Record<string, unknown>).id)
      : null;
  const viewerUserId =
    whoami.data?.user && typeof whoami.data.user === "object"
      ? getTextValue((whoami.data.user as Record<string, unknown>).id)
      : null;
  const profileUserId = getTextValue(profile?.user_id);
  const isMe = Boolean(
    id &&
      ((viewerProfileId && viewerProfileId === id) ||
        (viewerUserId && (viewerUserId === id || (profileUserId && viewerUserId === profileUserId)))),
  );

  if (!id) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Profilo non valido</Text>
        <Text style={{ color: theme.colors.muted }}>Questo percorso richiede un UUID valido.</Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.text,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          gap: 16,
          paddingBottom: 16,
        }}
        scrollIndicatorInsets={{ bottom: 16 + (insets.bottom || 0) }}
      >

      <PublicProfileHeader
        profileId={id}
        displayName={displayName}
        accountType="player"
        avatarUrl={avatarUrl}
        subtitle={sportRole}
        locationLabel={interestLocation}
        socialLinks={getLinks(profile?.links)}
        showMessageButton={!isMe}
        showFollowButton={!isMe}
      />

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Dati player</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 14, columnGap: 12 }}>
          {[
            { label: "Età", value: age },
            { label: "Altezza", value: height },
            { label: "Peso", value: weight },
            { label: "Piede", value: foot },
            { label: "Sport", value: sport || "—" },
            { label: "Ruolo", value: role || "—" },
            { label: "Nazionalità", value: nationality },
            { label: "Zona di interesse", value: interestLocation },
          ].map((item) => (
            <View key={item.label} style={{ width: "48%", gap: 4 }}>
              <Text style={{ fontSize: 12, color: theme.colors.muted }}>{item.label}</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.text }}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Biografia</Text>
        <Text style={{ color: theme.colors.text, lineHeight: 22 }}>{biography}</Text>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Competenze</Text>
        {skillsError ? <Text style={{ color: "#b91c1c", fontSize: 13 }}>{skillsError}</Text> : null}

        {skills.length > 0 ? (
          <View style={{ gap: 10 }}>
            {skills.map((skill) => (
              <View
                key={skill.name}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#f1f5f9",
                  backgroundColor: "#f8fafc",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.text, flexShrink: 1 }}>{skill.name}</Text>
                  <View style={{ borderRadius: 999, backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: "#1e40af", fontSize: 12, fontWeight: "700" }}>{skill.endorsementsCount}</Text>
                  </View>
                </View>
                {!isOwner ? (
                  <Pressable
                    onPress={() => void toggleEndorse(skill)}
                    disabled={endorsingSkill === skill.name || !meId}
                    style={({ pressed }) => ({
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: skill.endorsedByMe ? "#2563eb" : "#cbd5e1",
                      backgroundColor: skill.endorsedByMe ? "#2563eb" : theme.colors.background,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      opacity: endorsingSkill === skill.name || !meId ? 0.7 : pressed ? 0.8 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: skill.endorsedByMe ? theme.colors.background : theme.colors.text }}>
                      {skill.endorsedByMe ? "Rimuovi endorsement" : meId ? "Endorsa" : "Accedi per endorsare"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: theme.colors.neutral200,
              borderRadius: 12,
              backgroundColor: "#f8fafc",
              padding: 14,
              gap: 6,
            }}
          >
            <Text style={{ fontWeight: "700", color: theme.colors.text }}>Ancora nessuna competenza</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
              {isOwner
                ? "Aggiungi le competenze dal pannello modifica profilo per aiutare i club a trovarti più facilmente."
                : "Questo player non ha ancora inserito competenze."}
            </Text>
          </View>
        )}
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Bacheca</Text>

        {postsLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: theme.colors.muted }}>Carico post…</Text>
          </View>
        ) : null}

        {!postsLoading && posts.length === 0 ? (
          <Text style={{ color: theme.colors.muted }}>Nessun post pubblicato</Text>
        ) : null}

        {!postsLoading && posts.length > 0
          ? posts.map((post) => {
              return <FeedCard key={post.id} item={post} />;
            })
          : null}
      </View>

      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" />
          <Text style={{ color: theme.colors.muted }}>Carico profilo…</Text>
        </View>
      ) : null}
      <View style={{ height: 16 + (insets.bottom || 0) }} />
      </ScrollView>
    </SafeAreaView>
  );
}
