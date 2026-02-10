import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { getWebBaseUrl } from "../../../src/lib/api";

type WebSearchItem = {
  id?: string;
  kind?: string; // "club" | "player" | "opportunity" | ...
  title?: string;
  subtitle?: string;
  href?: string; // WEB provides /clubs/[id] or /players/[id]
  avatar_url?: string | null;
};

function asText(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function normalizeHref(item: WebSearchItem): string | null {
  const href = asText(item.href).trim();
  if (!href) return null;
  // For PR6 we only support profile routes; ignore opportunities for now (no invention)
  if (href.startsWith("/clubs/") || href.startsWith("/players/")) return href;
  return null;
}

function AvatarPlaceholder({ label }: { label: string }) {
  const letter = (label.trim().slice(0, 1) || "U").toUpperCase();
  return (
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 999,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontWeight: "800", color: "#111827" }}>{letter}</Text>
    </View>
  );
}

async function fetchWebSearch(q: string): Promise<WebSearchItem[]> {
  const base = getWebBaseUrl();
  const sp = new URLSearchParams();
  // WEB endpoint param is q (per Codex web summary)
  sp.set("q", q);

  const res = await fetch(`${base}/api/search?${sp.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

  let json: any;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Risposta /api/search non valida");
  }

  // tolerate shapes
  const items =
    (Array.isArray(json?.items) && json.items) ||
    (Array.isArray(json?.results) && json.results) ||
    (Array.isArray(json?.data?.items) && json.data.items) ||
    (Array.isArray(json?.data) && json.data) ||
    [];

  return items as WebSearchItem[];
}

export default function SearchScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<WebSearchItem[]>([]);

  const query = q.trim();
  const suggestions = ["Calcio", "Portiere", "Under 21", "Sicilia", "Volley"];

  useEffect(() => {
    let cancelled = false;

    if (!query) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWebSearch(query);
        if (cancelled) return;
        setItems(data);
      } catch (e: any) {
        if (cancelled) return;
        setItems([]);
        setError(e?.message ? String(e.message) : "Errore ricerca");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const rows = useMemo(() => {
    return items
      .map((it) => {
        const href = normalizeHref(it);
        return {
          href,
          title: asText(it.title).trim() || "Risultato",
          subtitle: asText(it.subtitle).trim(),
          avatar_url: it.avatar_url ?? null,
        };
      })
      .filter((r) => !!r.href);
  }, [items]);

  const Chip = ({ label }: { label: string }) => (
    <Pressable
      onPress={() => setQ(label)}
      style={{
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Cerca</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Ricerca</Text>

        <TextInput
          placeholder="Cerca club, giocatori…"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
          }}
        />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {suggestions.map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Risultati</Text>

        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ color: "#6b7280" }}>Cerco…</Text>
          </View>
        ) : error ? (
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        ) : !query ? (
          <Text style={{ color: "#374151" }}>Inizia a digitare per cercare.</Text>
        ) : rows.length === 0 ? (
          <Text style={{ color: "#374151" }}>Nessun risultato per “{query}”.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {rows.map((r) => (
              <View
                key={r.href}
                style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable onPress={() => router.push(r.href!)}>
                    <AvatarPlaceholder label={r.title} />
                  </Pressable>

                  <Pressable onPress={() => router.push(r.href!)} style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", fontSize: 16 }}>{r.title}</Text>
                  </Pressable>
                </View>

                {r.subtitle ? <Text style={{ color: "#374151" }}>{r.subtitle}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
