import { apiFetch, type ApiResponse } from "../api";
import type { CreateOpportunityPayload, CreateOpportunityResponse, OpportunityDetail } from "../../types/opportunity";

function parseApiErrorText(errorText: string | undefined): string {
  if (!errorText) return "Creazione opportunità non riuscita";
  try {
    const parsed = JSON.parse(errorText);
    if (typeof parsed?.error === "string" && parsed.error.trim()) return parsed.error.trim();
    if (typeof parsed?.message === "string" && parsed.message.trim()) return parsed.message.trim();
  } catch {
    // noop
  }
  return errorText;
}

export async function createOpportunity(payload: CreateOpportunityPayload): Promise<ApiResponse<OpportunityDetail>> {
  const response = await apiFetch<CreateOpportunityResponse | OpportunityDetail>("/api/opportunities", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorText: parseApiErrorText(response.errorText),
    };
  }

  const normalized = ((response.data as CreateOpportunityResponse | undefined)?.data ?? response.data) as OpportunityDetail | undefined;

  if (!normalized) {
    return {
      ok: false,
      status: response.status,
      errorText: "Formato risposta creazione opportunità non valido",
    };
  }

  return {
    ok: true,
    status: response.status,
    data: normalized,
  };
}
