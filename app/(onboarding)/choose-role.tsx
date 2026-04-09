import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { BrandLogo } from "../../components/brand/BrandLogo";
import { fetchProfileMe, patchProfileMe } from "../../src/lib/api";
import { theme } from "../../src/theme";

type AccountType = "athlete" | "club" | "fan";

type RoleCard = {
  role: AccountType;
  title: string;
  description: string;
  icon: string;
};

const ROLE_CARDS: RoleCard[] = [
  {
    role: "club",
    title: "CLUB",
    description: "Gestisci il tuo club, pubblica contenuti e crea opportunità",
    icon: "C",
  },
  {
    role: "athlete",
    title: "PLAYER",
    description: "Vivi il tuo sport, crea il tuo profilo e trova opportunità",
    icon: "P",
  },
  {
    role: "fan",
    title: "FAN",
    description: "Segui, vivi e sostieni Club e Player, dentro e fuori dal campo",
    icon: "F",
  },
];

function getTargetRoute(accountType: string | null | undefined): "/player/profile" | "/club/profile" | "/(tabs)/feed" {
  if (accountType === "club") return "/club/profile";
  if (accountType === "athlete") return "/player/profile";
  return "/(tabs)/feed";
}

export default function ChooseRoleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AccountType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      const response = await fetchProfileMe();

      if (cancelled) return;

      if (!response.ok) {
        Alert.alert("Errore", response.errorText ?? "Impossibile leggere il profilo");
        setLoading(false);
        return;
      }

      const accountType = typeof response.data?.account_type === "string" ? response.data.account_type : null;

      if (accountType === "club" || accountType === "athlete" || accountType === "fan") {
        router.replace(getTargetRoute(accountType));
        return;
      }

      setLoading(false);
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const continueDisabled = useMemo(() => saving || selectedRole === null, [saving, selectedRole]);

  const submitRole = async () => {
    if (!selectedRole) return;

    try {
      setSaving(true);

      const response = await patchProfileMe(
        selectedRole === "fan"
          ? {
              account_type: "fan",
              role: null,
              sport: null,
              bio: null,
              links: null,
              skills: [],
              birth_year: null,
              birth_place: null,
              birth_country: null,
              birth_region_id: null,
              birth_province_id: null,
              birth_municipality_id: null,
              residence_region_id: null,
              residence_province_id: null,
              residence_municipality_id: null,
              foot: null,
              height_cm: null,
              weight_kg: null,
              club_foundation_year: null,
              club_stadium: null,
              club_stadium_address: null,
              club_stadium_lat: null,
              club_stadium_lng: null,
              club_league_category: null,
              club_motto: null,
            }
          : { account_type: selectedRole },
      );

      if (!response.ok) {
        Alert.alert("Errore", response.errorText ?? "Impossibile salvare il ruolo");
        setSaving(false);
        return;
      }

      router.replace(getTargetRoute(selectedRole));
    } catch {
      Alert.alert("Errore", "Qualcosa è andato storto");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 24,
        backgroundColor: theme.colors.background,
      }}
    >
      <View style={{ alignItems: "center", marginTop: 12, marginBottom: 20 }}>
        <BrandLogo />
      </View>

      <Text
        style={{
          fontSize: 28,
          color: theme.colors.primary,
          fontFamily: theme.fonts.brand,
          textAlign: "center",
        }}
      >
        Scegli come vuoi usare Club & Player
      </Text>

      <Text style={{ marginTop: 10, fontSize: 16, color: theme.colors.muted, textAlign: "center", lineHeight: 22 }}>
        Ogni ruolo offre un'esperienza diversa
      </Text>

      <View style={{ marginTop: 26, gap: 12 }}>
        {ROLE_CARDS.map((card) => {
          const active = selectedRole === card.role;
          return (
            <Pressable
              key={card.role}
              onPress={() => {
                if (!saving) setSelectedRole(card.role);
              }}
              disabled={saving}
              style={{
                borderWidth: active ? 2 : 1,
                borderColor: active ? "#6da9c2" : theme.colors.neutral200,
                borderRadius: 16,
                backgroundColor: theme.colors.background,
                padding: 16,
                opacity: saving ? 0.75 : 1,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#e7f1f6",
                }}
              >
                <Text style={{ color: "#1a7aa6", fontWeight: "800" }}>{card.icon}</Text>
              </View>

              <Text style={{ marginTop: 10, fontSize: 22, fontWeight: "800", color: theme.colors.text }}>{card.title}</Text>
              <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: theme.colors.muted }}>{card.description}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 24 }}>
        <Pressable
          onPress={() => {
            void submitRole();
          }}
          disabled={continueDisabled}
          style={{
            minHeight: 52,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#7db0c5",
            opacity: continueDisabled ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>Continua</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
