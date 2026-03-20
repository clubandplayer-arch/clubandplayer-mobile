import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { fetchPublicProfiles, isUuid, toggleProfileSkillEndorsement, useWebSession, useWhoami, type PublicProfileSummary } from "../../src/lib/api";
import { getFeedPosts, type FeedPost } from "../../src/lib/feed/getFeedPosts";
import FeedCard from "../../src/components/feed/FeedCard";
import { iso2ToFlagEmoji } from "../../src/lib/geo/countryFlag";
import { getProfileDisplayName } from "../../src/lib/profiles/getProfileDisplayName";
import { theme } from "../../src/theme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileHeaderCard, ProfileSkillsSection, ProfileSocialLinksSection } from "../../src/components/profiles/ProfileSections";
import { buildProfileSkillItems, parseProfileLinks } from "../../src/components/profiles/profileShared";

type ProfileRow = PublicProfileSummary & {
  birth_year?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  foot?: string | null;
  interest_city?: string | null;
  interest_province?: string | null;
  interest_region?: string | null;
  interest_country?: string | null;
};
const getTextValue = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const getNumberValue = (value: unknown): number | null => typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : null;

export default function PlayerProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const id = useMemo(() => {
    const raw = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
    const v = String(raw ?? "").trim();
    return isUuid(v) ? v : null;
  }, [params.id]);
  const web = useWebSession();
  const whoami = useWhoami(web.ready);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [busySkill, setBusySkill] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return setLoading(false);
      setLoading(true);
      const res = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      let nextProfile = res.data ? (res.data as ProfileRow) : null;
      const publicRes = await fetchPublicProfiles([id]);
      const publicItems = Array.isArray(publicRes.data) ? publicRes.data : publicRes.data?.data;
      const publicProfile = Array.isArray(publicItems) ? publicItems.find((item) => item.id === id) : null;
      if (nextProfile && publicProfile) nextProfile = { ...nextProfile, ...publicProfile };
      if (mounted) {
        setProfile(nextProfile);
        setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    const loadWallPosts = async () => {
      if (!id) return;
      setPostsLoading(true);
      try {
        const res = await getFeedPosts({ scope: "all" });
        const filtered = res.items.filter((item) => [item.raw?.author_profile_id, item.raw?.authorId, item.raw?.author_id, item.raw?.author_profile?.id, item.author_id].some((candidate) => typeof candidate === "string" && candidate.trim() === id)).slice(0, 10);
        if (mounted) setPosts(filtered);
      } catch {
        if (mounted) setPosts([]);
      } finally {
        if (mounted) setPostsLoading(false);
      }
    };
    void loadWallPosts();
    return () => { mounted = false; };
  }, [id]);

  if (!id) return <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}><Text style={{ fontSize: 18, fontWeight: "800" }}>Profilo non valido</Text><Pressable onPress={() => router.back()}><Text>Indietro</Text></Pressable></View>;
  if (loading || web.loading || whoami.loading) return <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></SafeAreaView>;

  const displayName = getProfileDisplayName({ ...(profile ?? {}), account_type: "athlete" });
  const sportRole = [getTextValue(profile?.sport), getTextValue(profile?.role)].filter(Boolean).join(" • ") || "—";
  const interestLocation = [getTextValue(profile?.interest_city), getTextValue(profile?.interest_province), getTextValue(profile?.interest_region), [iso2ToFlagEmoji(getTextValue(profile?.interest_country)), getTextValue(profile?.interest_country)].filter(Boolean).join(" ")].filter(Boolean).join(" • ") || "—";
  const biography = getTextValue(profile?.bio) || "—";
  const skills = buildProfileSkillItems(profile?.skills, profile?.skill_endorsements);
  const links = parseProfileLinks(profile?.links);
  const viewerProfileId = typeof whoami.data?.profile === "object" && whoami.data?.profile && 'id' in (whoami.data.profile as any) ? String((whoami.data.profile as any).id ?? "") : null;

  const onToggleEndorse = async (skillName: string) => {
    if (!profile?.id || !viewerProfileId) return;
    setBusySkill(skillName);
    const res = await toggleProfileSkillEndorsement(profile.id, skillName);
    if (res.ok) {
      setProfile((current) => {
        if (!current) return current;
        const next = buildProfileSkillItems(current.skills, current.skill_endorsements).map((item) => item.name === skillName ? { ...item, endorsedByMe: !item.endorsedByMe, endorsementsCount: res.data?.endorsementsCount ?? Math.max(0, item.endorsementsCount + (item.endorsedByMe ? -1 : 1)) } : item);
        return { ...current, skill_endorsements: next.map((item) => ({ name: item.name, endorsementsCount: item.endorsementsCount, endorsedByMe: item.endorsedByMe })) };
      });
    }
    setBusySkill(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 16, paddingBottom: 16 }} scrollIndicatorInsets={{ bottom: 16 + (insets.bottom || 0) }}>
        <ProfileHeaderCard profileId={id} viewerProfileId={viewerProfileId} displayName={displayName} badgeLabel="Giocatore" subtitle={sportRole} location={interestLocation} avatarLetter={displayName.charAt(0).toUpperCase()} avatarUrl={getTextValue(profile?.avatar_url)} />
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, backgroundColor: theme.colors.background, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Dati player</Text>
          {[{ label: "Nazionalità", value: [iso2ToFlagEmoji(getTextValue(profile?.country)), getTextValue(profile?.country)].filter(Boolean).join(" ") || "—" }, { label: "Età", value: getNumberValue(profile?.birth_year) ? String(new Date().getFullYear() - Number(profile?.birth_year)) : "—" }, { label: "Piede", value: getTextValue(profile?.foot) || "—" }, { label: "Altezza", value: getNumberValue(profile?.height_cm) ? `${profile?.height_cm} cm` : "—" }, { label: "Peso", value: getNumberValue(profile?.weight_kg) ? `${profile?.weight_kg} kg` : "—" }].map((item) => <View key={item.label}><Text style={{ fontSize: 12, color: theme.colors.muted }}>{item.label}</Text><Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.text }}>{item.value}</Text></View>)}
        </View>
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, backgroundColor: theme.colors.background, padding: 16, gap: 10 }}><Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Biografia</Text><Text style={{ color: theme.colors.text, lineHeight: 22 }}>{biography}</Text></View>
        <ProfileSocialLinksSection links={links} />
        <ProfileSkillsSection items={skills} canEndorse={Boolean(viewerProfileId && viewerProfileId !== id)} onToggleEndorse={onToggleEndorse} busySkill={busySkill} />
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, backgroundColor: theme.colors.background, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Bacheca</Text>
          {postsLoading ? <ActivityIndicator /> : posts.length === 0 ? <Text style={{ color: theme.colors.muted }}>Nessun post pubblicato</Text> : posts.map((post) => <FeedCard key={post.id} item={post} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
