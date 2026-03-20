import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { fetchPublicProfiles, isUuid, useWebSession, useWhoami } from "../../src/lib/api";
import { getFeedPosts, type FeedPost } from "../../src/lib/feed/getFeedPosts";
import FeedCard from "../../src/components/feed/FeedCard";
import { iso2ToFlagEmoji } from "../../src/lib/geo/countryFlag";
import { getProfileDisplayName } from "../../src/lib/profiles/getProfileDisplayName";
import { theme } from "../../src/theme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileHeaderCard, ProfileSocialLinksSection } from "../../src/components/profiles/ProfileSections";
import { parseProfileLinks } from "../../src/components/profiles/profileShared";

type ProfileRow = {
  id: string; account_type?: string | null; display_name?: string | null; full_name?: string | null; avatar_url?: string | null; country?: string | null; city?: string | null; sport?: string | null; club_league_category?: string | null; category?: string | null; level?: string | null; club_stadium?: string | null; club_stadium_address?: string | null; club_motto?: string | null; bio?: string | null; description?: string | null; links?: unknown; verified?: boolean | null; certified?: boolean | null; is_certified?: boolean | null; certification?: string | boolean | null;
};
const getTextValue = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;

export default function ClubProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const id = useMemo(() => { const raw = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null; const v = String(raw ?? "").trim(); return isUuid(v) ? v : null; }, [params.id]);
  const web = useWebSession();
  const whoami = useWhoami(web.ready);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return setLoading(false);
      setLoading(true);
      const publicRes = await fetchPublicProfiles([id]);
      const publicItems = Array.isArray(publicRes.data) ? publicRes.data : publicRes.data?.data;
      const publicProfile = Array.isArray(publicItems) ? publicItems.find((item) => item.id === id) : null;
      const supplemental = await supabase
        .from("profiles")
        .select("id,club_league_category,category,level,club_stadium,club_stadium_address,club_motto,description,links,verified,certified,is_certified,certification")
        .eq("id", id)
        .maybeSingle();
      const nextProfile = publicProfile ? ({ ...publicProfile, ...(supplemental.data ?? {}) } as ProfileRow) : (supplemental.data ? (supplemental.data as ProfileRow) : null);
      if (mounted) { setProfile(nextProfile); setLoading(false); }
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
      } catch { if (mounted) setPosts([]); } finally { if (mounted) setPostsLoading(false); }
    };
    void loadWallPosts();
    return () => { mounted = false; };
  }, [id]);

  if (!id) return <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}><Text style={{ fontSize: 18, fontWeight: "800" }}>Profilo non valido</Text><Pressable onPress={() => router.back()}><Text>Indietro</Text></Pressable></View>;
  if (loading || web.loading || whoami.loading) return <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></SafeAreaView>;

  const displayName = getProfileDisplayName({ ...(profile ?? {}), account_type: profile?.account_type ?? "club" });
  const category = getTextValue(profile?.club_league_category) || getTextValue(profile?.category) || getTextValue(profile?.level) || "—";
  const location = [[iso2ToFlagEmoji(getTextValue(profile?.country)), getTextValue(profile?.country)].filter(Boolean).join(" "), getTextValue(profile?.city)].filter(Boolean).join(" • ") || "—";
  const facility = [getTextValue(profile?.club_stadium), getTextValue(profile?.club_stadium_address)].filter(Boolean).join(" • ") || "—";
  const biography = getTextValue(profile?.bio) || getTextValue(profile?.description) || "—";
  const verified = profile?.is_certified === true || profile?.certified === true || profile?.verified === true || profile?.certification === true || (typeof profile?.certification === "string" && profile.certification.trim().length > 0);
  const viewerProfileId = typeof whoami.data?.profile === "object" && whoami.data?.profile && 'id' in (whoami.data.profile as any) ? String((whoami.data.profile as any).id ?? "") : null;
  const links = parseProfileLinks(profile?.links);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 16, paddingBottom: 16 }} scrollIndicatorInsets={{ bottom: 16 + (insets.bottom || 0) }}>
        <ProfileHeaderCard profileId={id} viewerProfileId={viewerProfileId} displayName={displayName} badgeLabel="Club" subtitle={[getTextValue(profile?.sport), category].filter(Boolean).join(" • ") || "—"} location={location} avatarLetter={displayName.charAt(0).toUpperCase()} avatarUrl={getTextValue(profile?.avatar_url)} verified={verified} />
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, backgroundColor: theme.colors.background, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Dati club</Text>
          <View><Text style={{ color: theme.colors.muted, fontSize: 12 }}>Sede</Text><Text style={{ color: theme.colors.text, fontWeight: "600" }}>{location}</Text></View>
          <View><Text style={{ color: theme.colors.muted, fontSize: 12 }}>Sport principale</Text><Text style={{ color: theme.colors.text, fontWeight: "600" }}>{getTextValue(profile?.sport) || "—"}</Text></View>
          <View><Text style={{ color: theme.colors.muted, fontSize: 12 }}>Categoria</Text><Text style={{ color: theme.colors.text, fontWeight: "600" }}>{category}</Text></View>
          <View><Text style={{ color: theme.colors.muted, fontSize: 12 }}>Impianto</Text><Text style={{ color: theme.colors.text, fontWeight: "600" }}>{facility}</Text></View>
          <View><Text style={{ color: theme.colors.muted, fontSize: 12 }}>Motto</Text><Text style={{ color: theme.colors.text, fontWeight: "600" }}>{getTextValue(profile?.club_motto) || "—"}</Text></View>
        </View>
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, backgroundColor: theme.colors.background, padding: 16, gap: 10 }}><Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Biografia</Text><Text style={{ color: theme.colors.text, lineHeight: 20 }}>{biography}</Text></View>
        <ProfileSocialLinksSection links={links} />
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, backgroundColor: theme.colors.background, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Bacheca</Text>
          {postsLoading ? <ActivityIndicator /> : posts.length === 0 ? <Text style={{ color: theme.colors.muted }}>Nessun post pubblicato</Text> : posts.map((post) => <FeedCard key={post.id} item={post} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
