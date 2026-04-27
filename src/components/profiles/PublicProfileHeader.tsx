import type { ReactNode } from "react";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Linking, Pressable, Text, View, type TextStyle, type ViewStyle } from "react-native";

import FollowButton from "../follow/FollowButton";
import { theme } from "../../theme";
import ProfileAvatar from "./ProfileAvatar";

export type PublicProfileLinks = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
} | null;

type AccountType = "club" | "player" | "athlete";

type SocialItem = {
  key: "instagram" | "facebook" | "tiktok" | "x";
  href: string;
  label: string;
  accentColor: string;
  content: ReactNode;
};

type PublicProfileHeaderProps = {
  profileId: string;
  displayName: string;
  accountType: AccountType;
  avatarUrl?: string | null;
  subtitle?: string | null;
  locationLabel?: string | null;
  locationContent?: ReactNode;
  socialLinks?: PublicProfileLinks;
  showMessageButton?: boolean;
  messageLabel?: string;
  showFollowButton?: boolean;
  isVerified?: boolean | null;
};

function initialsFromName(name: string, accountType: AccountType) {
  const safeName = (name || "").trim();
  if (!safeName) return accountType === "club" ? "CL" : "PL";
  const parts = safeName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function asLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeExternalUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const direct = raw.match(/^[a-z][a-z0-9+\-.]*:/i) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(direct);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function socialItems(socialLinks?: PublicProfileLinks): SocialItem[] {
  const instagram = asLink(socialLinks?.instagram);
  const facebook = asLink(socialLinks?.facebook);
  const tiktok = asLink(socialLinks?.tiktok);
  const x = asLink(socialLinks?.x);

  return [
    instagram
      ? {
          key: "instagram",
          href: instagram,
          label: "Instagram",
          accentColor: "#E1306C",
          content: <Ionicons name="logo-instagram" size={18} color="#E1306C" />,
        }
      : null,
    facebook
      ? {
          key: "facebook",
          href: facebook,
          label: "Facebook",
          accentColor: "#1877F2",
          content: <Ionicons name="logo-facebook" size={18} color="#1877F2" />,
        }
      : null,
    tiktok
      ? {
          key: "tiktok",
          href: tiktok,
          label: "TikTok",
          accentColor: theme.colors.text,
          content: <FontAwesome6 name="tiktok" size={16} color={theme.colors.text} />,
        }
      : null,
    x
      ? {
          key: "x",
          href: x,
          label: "X",
          accentColor: theme.colors.text,
          content: <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: "900" }}>X</Text>,
        }
      : null,
  ].filter(Boolean) as SocialItem[];
}

async function openExternalUrl(url: string) {
  const normalizedUrl = normalizeExternalUrl(url);
  if (!normalizedUrl) {
    Alert.alert("Link non valido", "Questo social non contiene un URL valido.");
    return;
  }

  try {
    await Linking.openURL(normalizedUrl);
  } catch {
    Alert.alert("Link non supportato", "Impossibile aprire questo link.");
  }
}

function ProfileSocialLinks({ socialLinks }: { socialLinks?: PublicProfileLinks }) {
  const items = socialItems(socialLinks);
  if (!items.length) return null;

  return (
    <View style={{ gap: 8, alignItems: "flex-start", width: "100%" }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
        Social
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="link"
            accessibilityLabel={item.label}
            onPress={() => void openExternalUrl(item.href)}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: item.accentColor === theme.colors.text ? theme.colors.neutral200 : `${item.accentColor}4D`,
              backgroundColor: theme.colors.background,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            {item.content}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function badgeStyles(accountType: AccountType): { container: ViewStyle; text: TextStyle } {
  if (accountType === "club") {
    return {
      container: {
        backgroundColor: theme.colors.primary,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      },
      text: { color: theme.colors.background, fontSize: 12, fontWeight: "700" },
    };
  }

  return {
    container: {
      backgroundColor: theme.colors.primaryTint,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: "#bfdbfe",
    },
    text: { color: "#1e3a8a", fontSize: 12, fontWeight: "700" },
  };
}

export default function PublicProfileHeader({
  profileId,
  displayName,
  accountType,
  avatarUrl,
  subtitle,
  locationLabel,
  locationContent,
  socialLinks,
  showMessageButton = true,
  messageLabel = "Messaggia",
  showFollowButton = true,
  isVerified = null,
}: PublicProfileHeaderProps) {
  const router = useRouter();
  const name = displayName || (accountType === "club" ? "Club" : "Player");
  const initials = initialsFromName(name, accountType);
  const subtitleText = subtitle?.trim() || null;
  const locationText = locationLabel?.trim() || null;
  const isClub = accountType === "club";
  const badgeLabel = isClub ? "Club" : "Giocatore";
  const badge = badgeStyles(accountType);
  const hasActions = showMessageButton || showFollowButton;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
        padding: 16,
        gap: 16,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <ProfileAvatar
          uri={avatarUrl}
          size={72}
          name={initials}
          profile={{ accountType, isVerified }}
        />

        <View style={{ flex: 1, gap: 10 }}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 26, fontWeight: "900", color: theme.colors.text, flexShrink: 1 }}>{name}</Text>
              <View style={badge.container}>
                <Text style={badge.text}>{badgeLabel}</Text>
              </View>
            </View>
            {subtitleText ? <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{subtitleText}</Text> : null}
            {locationContent ? <View>{locationContent}</View> : <Text style={{ color: locationText ? theme.colors.muted : "#9ca3af", fontSize: 12 }}>{locationText || "Località —"}</Text>}
          </View>

          {(socialLinks || hasActions) && (
            <View style={{ gap: 12, alignItems: "flex-start" }}>
              <ProfileSocialLinks socialLinks={socialLinks} />
              {hasActions ? (
                <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {showMessageButton ? (
                    <Pressable
                      onPress={() => router.push(`/(tabs)/messages/${encodeURIComponent(profileId)}` as never)}
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: theme.colors.neutral200,
                        backgroundColor: theme.colors.background,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "800" }}>{messageLabel}</Text>
                    </Pressable>
                  ) : null}
                  {showFollowButton ? (
                  <FollowButton targetProfileId={profileId} />
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
