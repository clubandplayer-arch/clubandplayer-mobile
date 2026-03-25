import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  fetchClubVerificationStatus,
  fetchProfileMe,
  submitClubVerificationRequest,
  uploadClubVerificationPdf,
  type ClubVerificationRequest,
  type ClubVerificationStatus,
  type ClubVerificationPaymentStatus,
  useWebSession,
} from "../../src/lib/api";
import { Stack } from "expo-router";
import { theme } from "../../src/theme";

const STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  submitted: "In valutazione",
  approved: "Approvata",
  rejected: "Rifiutata",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Non pagato",
  paid: "Pagato",
  waived: "Esente",
};

function normalizeStatus(value: unknown): ClubVerificationStatus {
  return typeof value === "string" ? value.toLowerCase() : "draft";
}

function normalizePaymentStatus(value: unknown): ClubVerificationPaymentStatus {
  return typeof value === "string" ? value.toLowerCase() : "unpaid";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function extractFileName(path?: string | null) {
  if (!path) return null;
  const chunks = path.split("/");
  return chunks[chunks.length - 1] || null;
}

function parseApiError(errorText?: string) {
  if (!errorText) return null;

  try {
    const parsed = JSON.parse(errorText) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error.trim();
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message.trim();
  } catch {
    // response is plain text
  }

  return errorText;
}

export default function ClubVerificationScreen() {
  const web = useWebSession();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isClub, setIsClub] = useState(false);

  const [request, setRequest] = useState<ClubVerificationRequest | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const status = normalizeStatus(request?.status);
  const paymentStatus = normalizePaymentStatus(request?.payment_status);
  const paymentLabel = PAYMENT_LABELS[paymentStatus] ?? "Non pagato";
  const statusLabel = STATUS_LABELS[status] ?? "Bozza";
  const isPaymentOk = paymentStatus === "paid" || paymentStatus === "waived";

  const canUpload = status === "draft" || status === "rejected" || !request;
  const canSubmit = Boolean(request && status === "draft" && request.certificate_path && !submitting);

  const fileName = useMemo(() => {
    return selectedFileName || extractFileName(request?.certificate_path) || null;
  }, [request?.certificate_path, selectedFileName]);

  const loadData = useCallback(async () => {
    if (!web.ready) return;

    setError(null);

    const profileResponse = await fetchProfileMe();
    if (!profileResponse.ok || !profileResponse.data) {
      setIsClub(false);
      setRequest(null);
      setError(profileResponse.errorText ?? "Impossibile verificare il profilo.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const accountType = String(profileResponse.data.account_type ?? "").toLowerCase();
    const profileStatus = String((profileResponse.data as any).status ?? "").toLowerCase();
    const profileIsClub = accountType === "club" && (!profileStatus || profileStatus === "active");

    setIsClub(profileIsClub);

    if (!profileIsClub) {
      setRequest(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const response = await fetchClubVerificationStatus();
    if (!response.ok) {
      setRequest(null);
      setError(parseApiError(response.errorText) ?? "Impossibile caricare la richiesta.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setRequest(response.data?.request ?? null);
    setLoading(false);
    setRefreshing(false);
  }, [web.ready]);

  useEffect(() => {
    if (!web.ready) return;
    void loadData();
  }, [loadData, web.ready]);

  useEffect(() => {
    if (!web.loading && !web.ready) {
      setLoading(false);
      setRefreshing(false);
    }
  }, [web.loading, web.ready]);

  const onRetry = useCallback(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const onPickAndUploadPdf = useCallback(async () => {
    setError(null);
    setSuccess(null);

    const documentPicker = await Promise.resolve()
      .then(() => require("expo-document-picker"))
      .catch(() => null);
    if (!documentPicker?.getDocumentAsync) {
      setError(
        "Modulo selezione documenti non disponibile su questa build. Aggiorna la build nativa o usa Expo Go.",
      );
      return;
    }

    const picked = await documentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled || !picked.assets?.length) return;

    const asset = picked.assets[0];

    const mimeType = typeof asset.mimeType === "string" ? asset.mimeType.trim().toLowerCase() : "";
    const fileName = typeof asset.name === "string" ? asset.name.trim().toLowerCase() : "";
    const uriLower = typeof asset.uri === "string" ? asset.uri.trim().toLowerCase() : "";
    const hasPdfExtension = fileName.endsWith(".pdf") || uriLower.split("?")[0].endsWith(".pdf");
    const mimeLooksPdf = mimeType.includes("pdf");

    if (!mimeLooksPdf && !hasPdfExtension) {
      setError("Sono ammessi solo file PDF.");
      return;
    }

    if (typeof asset.size === "number" && asset.size > 10 * 1024 * 1024) {
      setError("File troppo grande (max 10MB).");
      return;
    }

    setUploading(true);

    const response = await uploadClubVerificationPdf({
      uri: asset.uri,
      fileName: asset.name ?? `club-verification-${Date.now()}.pdf`,
      mimeType: "application/pdf",
    });

    setUploading(false);

    if (!response.ok) {
      setError(
        parseApiError(response.errorText) ??
          "Caricamento non riuscito. Verifica che il file sia un PDF (max 10MB).",
      );
      return;
    }

    setRequest(response.data?.request ?? null);
    setSelectedFileName(asset.name ?? null);
    setSuccess("Certificato caricato correttamente.");
  }, []);

  const onSubmitRequest = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const response = await submitClubVerificationRequest();

    setSubmitting(false);

    if (!response.ok) {
      setError(parseApiError(response.errorText) ?? "Errore durante l'invio.");
      return;
    }

    setRequest(response.data?.request ?? null);
    setSuccess("Richiesta inviata correttamente.");
    void loadData();
  }, [loadData]);

  if (web.loading || (web.ready && loading)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
        <ActivityIndicator />
        <Text style={{ color: theme.colors.muted }}>Caricamento stato richiesta…</Text>
      </View>
    );
  }

  if (web.error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 10 }}>
        <Text style={{ color: theme.colors.danger, textAlign: "center" }}>{web.error}</Text>
        <Pressable onPress={onRetry} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ fontWeight: "700" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (!web.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 10 }}>
        <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
          Sessione web non disponibile.
        </Text>
        <Pressable onPress={() => void web.retry()} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ fontWeight: "700" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (!isClub) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 10 }}>Verifica profilo</Text>
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 14 }}>
          <Text style={{ color: theme.colors.muted }}>Accesso riservato ai club.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 42, gap: 12 }}
    >
      <Stack.Screen options={{ title: "Verifica profilo" }} />
      <Text style={{ color: theme.colors.muted }}>
        Carica il certificato PDF del Registro nazionale delle attività sportive dilettantistiche.
      </Text>

      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 14, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Richiesta verifica</Text>
        <Text style={{ color: theme.colors.muted }}>Stato: {statusLabel}</Text>

        {status === "submitted" ? (
          <View style={{ borderWidth: 1, borderColor: "#facc15", borderRadius: 10, padding: 12, backgroundColor: "#fefce8" }}>
            <Text style={{ color: "#a16207" }}>Richiesta inviata, in attesa di verifica.</Text>
          </View>
        ) : null}

        {status === "rejected" ? (
          <View style={{ borderWidth: 1, borderColor: "#fb7185", borderRadius: 10, padding: 12, backgroundColor: "#fff1f2", gap: 4 }}>
            <Text style={{ color: "#be123c", fontWeight: "700" }}>Richiesta rifiutata</Text>
            <Text style={{ color: "#be123c" }}>
              {request?.rejection_reason || "La richiesta è stata rifiutata. Puoi inviare un nuovo certificato."}
            </Text>
          </View>
        ) : null}

        {status === "approved" ? (
          <View style={{ borderWidth: 1, borderColor: "#6ee7b7", borderRadius: 10, padding: 12, backgroundColor: "#ecfdf5" }}>
            <Text style={{ color: "#047857" }}>
              {isPaymentOk
                ? `Club verificato fino al ${formatDate(request?.verified_until)}.`
                : "Richiesta approvata. In attesa di pagamento."}
            </Text>
          </View>
        ) : null}

        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, padding: 12, gap: 6 }}>
          <Text style={{ fontWeight: "700" }}>Certificato PDF</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Formato PDF · max 10MB</Text>
          {fileName ? <Text style={{ fontSize: 12 }}>File: {fileName}</Text> : null}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <Pressable
              onPress={() => void onPickAndUploadPdf()}
              disabled={!canUpload || uploading}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                opacity: !canUpload || uploading ? 0.6 : 1,
              }}
            >
              <Text style={{ fontWeight: "700" }}>{uploading ? "Caricamento…" : "Carica PDF"}</Text>
            </Pressable>

            <Pressable
              onPress={() => void onSubmitRequest()}
              disabled={!canSubmit}
              style={{
                borderRadius: 8,
                backgroundColor: theme.colors.primary,
                paddingHorizontal: 12,
                paddingVertical: 10,
                opacity: !canSubmit ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>{submitting ? "Invio…" : "Invia richiesta"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, padding: 12, gap: 4 }}>
          <Text style={{ fontWeight: "700" }}>Pagamento</Text>
          <Text>Stato: {paymentLabel}</Text>
          {!isPaymentOk ? <Text style={{ color: theme.colors.muted }}>Costo annuale: 12€ (MVP manuale).</Text> : null}
        </View>

        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, padding: 12, gap: 4 }}>
          <Text style={{ fontWeight: "700" }}>Ultima attività</Text>
          <Text>Richiesta: {formatDate(request?.created_at)}</Text>
          <Text>Aggiornamento: {formatDate(request?.updated_at)}</Text>
        </View>
      </View>

      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
      {success ? <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>{success}</Text> : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={onRefresh}
          disabled={refreshing}
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, opacity: refreshing ? 0.7 : 1 }}
        >
          <Text style={{ fontWeight: "700" }}>{refreshing ? "Aggiornamento…" : "Aggiorna stato"}</Text>
        </Pressable>
        <Pressable
          onPress={onRetry}
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ fontWeight: "700" }}>Riprova</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
