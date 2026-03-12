import { apiFetch, type ApiResponse } from "../api";
import type { CreateOpportunityPayload, CreateOpportunityResponse, OpportunityDetail } from "../../types/opportunity";

export async function updateOpportunity(id: string, payload: CreateOpportunityPayload): Promise<ApiResponse<OpportunityDetail>> {
  const safeId = encodeURIComponent(String(id).trim());
  const response = await apiFetch<CreateOpportunityResponse>(`/api/opportunities/${safeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.data?.data) {
    return {
      ok: false,
      status: response.status,
      errorText: response.errorText || "Aggiornamento opportunità non riuscito",
    };
  }

  return {
    ok: true,
    status: response.status,
    data: response.data.data,
  };
}
