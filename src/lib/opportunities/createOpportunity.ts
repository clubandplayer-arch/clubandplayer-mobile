import { apiFetch, type ApiResponse } from "../api";
import type {
  CreateOpportunityPayload,
  CreateOpportunityResponse,
  OpportunityDetail,
} from "../../types/opportunity";

function toRequiredCategoryForCalcio(role: string | null | undefined): string | null {
  const normalized = String(role ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) return null;
  if (normalized.includes("portiere")) return "goalkeeper";
  if (normalized.includes("difensore") || normalized.includes("terzino")) return "defender";
  if (
    normalized.includes("mediano") ||
    normalized.includes("centrocampista") ||
    normalized.includes("trequartista")
  ) {
    return "midfielder";
  }
  if (normalized.includes("punta") || normalized.includes("esterno offensivo")) return "forward";

  return null;
}

function normalizeCreateOpportunityPayload(payload: CreateOpportunityPayload): CreateOpportunityPayload {
  const normalizedSport = payload.sport?.trim() || null;

  if (normalizedSport === "Calcio") {
    return {
      ...payload,
      sport: normalizedSport,
      required_category: toRequiredCategoryForCalcio(payload.role),
    };
  }

  return {
    ...payload,
    sport: normalizedSport,
    required_category: payload.required_category ?? null,
  };
}

export async function createOpportunity(payload: CreateOpportunityPayload): Promise<ApiResponse<OpportunityDetail>> {
  const normalizedPayload = normalizeCreateOpportunityPayload(payload);

  const response = await apiFetch<CreateOpportunityResponse>("/api/opportunities", {
    method: "POST",
    body: JSON.stringify(normalizedPayload),
  });

  if (!response.ok || !response.data?.data) {
    return {
      ok: false,
      status: response.status,
      errorText: response.errorText || "Creazione opportunità non riuscita",
    };
  }

  return {
    ok: true,
    status: response.status,
    data: response.data.data,
  };
}
