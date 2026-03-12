import { apiFetch, type ApiResponse } from "../api";

export async function deleteOpportunity(id: string): Promise<ApiResponse<{ ok?: boolean }>> {
  const safeId = encodeURIComponent(String(id).trim());
  return apiFetch<{ ok?: boolean }>(`/api/opportunities/${safeId}`, { method: "DELETE" });
}
