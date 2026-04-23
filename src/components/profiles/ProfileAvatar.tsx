import { Image, Text, View } from "react-native";

import { isCertifiedClub, type CertifiedClubProfile } from "../../lib/profiles/isCertifiedClub";
import { theme } from "../../theme";
import CertifiedClubCMark from "./CertifiedClubCMark";

type ProfileAvatarProps = {
  uri?: string | null;
  size?: number;
  name?: string;
  profile?: CertifiedClubProfile;
  badgeSize?: "sm" | "md" | "lg";
  badgeOffsetX?: number;
  badgeOffsetY?: number;
  badgeColor?: string;
};

function resolveBadgeSize(size: number): "sm" | "md" | "lg" {
  if (size >= 56) return "lg";
  if (size <= 30) return "sm";
  return "md";
}

export default function ProfileAvatar({
  uri,
  size = 40,
  name,
  profile,
  badgeSize,
  badgeOffsetX,
  badgeOffsetY,
  badgeColor,
}: ProfileAvatarProps) {
  const safeUri = typeof uri === "string" && uri.trim() ? uri.trim() : null;
  const initial = name?.trim().charAt(0).toUpperCase() || "U";
  const certifiedClub = isCertifiedClub(profile);
  const computedBadgeSize = badgeSize ?? resolveBadgeSize(size);

  return (
    <View style={{ position: "relative" }}>
      {safeUri ? (
        <Image
          source={{ uri: safeUri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.neutral200,
          }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.neutral200,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: Math.max(12, Math.floor(size * 0.35)), fontWeight: "700", color: theme.colors.text }}>
            {initial}
          </Text>
        </View>
      )}

      {certifiedClub ? (
        <CertifiedClubCMark
          size={computedBadgeSize}
          offsetX={badgeOffsetX}
          offsetY={badgeOffsetY}
          color={badgeColor}
        />
      ) : null}
    </View>
  );
}
