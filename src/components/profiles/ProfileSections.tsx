import { Image, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { theme } from "../../theme";
import FollowButton from "../follow/FollowButton";
import type { ProfileLinksMap, ProfileSkillItem } from "./profileShared";

export function ProfileHeaderCard({
  profileId,
  viewerProfileId,
  displayName,
  badgeLabel,
  subtitle,
  location,
  avatarLetter,
  avatarUrl,
  verified,
}: {
  profileId: string;
  viewerProfileId?: string | null;
  displayName: string;
  badgeLabel: string;
  subtitle?: string | null;
  location?: string | null;
  avatarLetter: string;
  avatarUrl?: string | null;
  verified?: boolean;
}) {
  const isOwnProfile = viewerProfileId === profileId;
  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, backgroundColor: theme.colors.neutral50, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.neutral200 }} />
        ) : (
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.neutral200, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontWeight: "800", color: theme.colors.muted, fontSize: 20 }}>{avatarLetter}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: theme.colors.text, flexShrink: 1 }}>{displayName}</Text>
            {verified ? <Text style={{ fontSize: 16 }}>✔️</Text> : null}
          </View>
          <View style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: theme.colors.neutral200, paddingVertical: 4, paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.text }}>{badgeLabel}</Text>
          </View>
          {subtitle ? <Text style={{ color: theme.colors.muted }}>{subtitle}</Text> : null}
          {location ? <Text style={{ color: theme.colors.muted }}>{location}</Text> : null}
        </View>
      </View>

      {!isOwnProfile ? (
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => router.push(`/(tabs)/messages/${profileId}`)}
            style={{ borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: theme.colors.text }}
          >
            <Text style={{ color: theme.colors.background, fontWeight: "800" }}>Messaggia</Text>
          </Pressable>
          <FollowButton targetProfileId={profileId} />
        </View>
      ) : null}
    </View>
  );
}

export function ProfileSocialLinksSection({ links }: { links: ProfileLinksMap }) {
  const items = [
    { key: "instagram", label: "Instagram", value: links.instagram },
    { key: "facebook", label: "Facebook", value: links.facebook },
    { key: "tiktok", label: "TikTok", value: links.tiktok },
    { key: "x", label: "X", value: links.x },
  ].filter((item) => item.value);

  if (!items.length) return null;

  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, backgroundColor: theme.colors.background, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Social network</Text>
      {items.map((item) => (
        <Text key={item.key} style={{ color: theme.colors.text }}>{item.label}: {item.value}</Text>
      ))}
    </View>
  );
}

export function ProfileSkillsSection({
  items,
  canEndorse,
  onToggleEndorse,
  busySkill,
}: {
  items: ProfileSkillItem[];
  canEndorse?: boolean;
  onToggleEndorse?: (skillName: string) => void;
  busySkill?: string | null;
}) {
  if (!items.length) return null;
  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, backgroundColor: theme.colors.background, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Competenze</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {items.map((skill) => {
          const active = skill.endorsedByMe;
          return (
            <Pressable
              key={skill.name}
              disabled={!canEndorse || !onToggleEndorse || busySkill === skill.name}
              onPress={() => onToggleEndorse?.(skill.name)}
              style={{ borderWidth: 1, borderColor: active ? theme.colors.text : theme.colors.neutral200, backgroundColor: active ? theme.colors.text : theme.colors.neutral50, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, opacity: busySkill === skill.name ? 0.7 : 1 }}
            >
              <Text style={{ color: active ? theme.colors.background : theme.colors.text, fontWeight: "700" }}>
                {skill.name} · {skill.endorsementsCount}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ProfileSocialInputs({
  value,
  onChange,
}: {
  value: ProfileLinksMap;
  onChange: (next: ProfileLinksMap) => void;
}) {
  const fields: Array<keyof ProfileLinksMap> = ["instagram", "facebook", "tiktok", "x"];
  return (
    <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
      <Text style={{ fontWeight: "700" }}>Link social</Text>
      {fields.map((field) => (
        <TextInput
          key={field}
          placeholder={field}
          value={value[field] ?? ""}
          onChangeText={(text: string) => onChange({ ...value, [field]: text })}
          autoCapitalize="none"
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }}
        />
      ))}
    </View>
  );
}
