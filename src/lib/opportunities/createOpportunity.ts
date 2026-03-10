import { apiFetch, type ApiResponse } from "../api";
import type { CreateOpportunityPayload, CreateOpportunityResponse, OpportunityDetail } from "../../types/opportunity";

export async function createOpportunity(payload: CreateOpportunityPayload): Promise<ApiResponse<OpportunityDetail>> {
  const response = await apiFetch<CreateOpportunityResponse>("/api/opportunities", {
    method: "POST",
    body: JSON.stringify(payload),
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
