import { useMemo } from "react";
import { Text, View } from "react-native";
import { theme } from "../../theme";

type AthleteExperience = {
  id: string;
  club_name: string | null;
  sport: string | null;
  role: string | null;
  category: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean | null;
  description: string | null;
};

type Props = {
  experiences: AthleteExperience[];
};

function formatPeriod(exp: AthleteExperience) {
  const start = exp.start_year ?? null;
  const end = exp.is_current ? "oggi" : exp.end_year ?? null;
  if (!start && !end) return "Periodo non indicato";
  if (start && !end) return `${start} – —`;
  if (!start && end) return `— – ${end}`;
  return `${start} – ${end}`;
}

export default function AthleteExperiencesSection({ experiences }: Props) {
  const ordered = useMemo(
    () =>
      [...experiences].sort((a, b) => {
        const aCurrent = a.is_current ? 1 : 0;
        const bCurrent = b.is_current ? 1 : 0;
        if (aCurrent !== bCurrent) return bCurrent - aCurrent;
        const aStart = a.start_year ?? 0;
        const bStart = b.start_year ?? 0;
        if (aStart !== bStart) return bStart - aStart;
        const aEnd = a.end_year ?? 0;
        const bEnd = b.end_year ?? 0;
        return bEnd - aEnd;
      }),
    [experiences],
  );

  return (
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
      <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Esperienze passate</Text>
      {!ordered.length ? <Text style={{ color: theme.colors.muted }}>Nessuna esperienza inserita.</Text> : null}
      {!!ordered.length
        ? ordered.map((exp) => (
            <View
              key={exp.id}
              style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, padding: 12, gap: 4 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15 }}>
                    {exp.club_name || "Club non indicato"}
                  </Text>
                  <Text style={{ color: theme.colors.muted }}>
                    {[exp.role, exp.category].filter(Boolean).join(" · ") || "Ruolo non indicato"}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    {(exp.sport || "Sport non indicato").toUpperCase()}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{formatPeriod(exp)}</Text>
              </View>
              {exp.description && exp.description.trim().length > 0 ? (
                <Text style={{ color: theme.colors.text }}>{exp.description}</Text>
              ) : null}
            </View>
          ))
        : null}
    </View>
  );
}
