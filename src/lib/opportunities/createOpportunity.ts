import { apiFetch, type ApiResponse } from "../api";
import type {
  CreateOpportunityPayload,
  CreateOpportunityResponse,
  OpportunityDetail,
} from "../../types/opportunity";

const ALLOWED_REQUIRED_CATEGORIES = new Set(["goalkeeper", "defender", "midfielder", "forward"]);

function sanitizeRequiredCategory(value: string | null | undefined): string | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ALLOWED_REQUIRED_CATEGORIES.has(normalized) ? normalized : null;
}

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
  if (
    normalized.includes("punta") ||
    normalized.includes("attacco") ||
    normalized.includes("offensivo") ||
    normalized.includes("ala") ||
    normalized.includes("esterno")
  ) {
    return "forward";
  }

  return null;
}

function normalizeCreateOpportunityPayload(payload: CreateOpportunityPayload): CreateOpportunityPayload {
  const normalizedSport = payload.sport?.trim() || null;

  if (normalizedSport === "Calcio") {
    return {
      ...payload,
      sport: normalizedSport,
      required_category:
        toRequiredCategoryForCalcio(payload.role) ?? sanitizeRequiredCategory(payload.required_category),
    };
  }

  return {
    ...payload,
    sport: normalizedSport,
    required_category: sanitizeRequiredCategory(payload.required_category),
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
