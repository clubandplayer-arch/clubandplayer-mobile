import type { ApiResponse, ApplyToOpportunityResult } from "../api";
import { devLog } from "../debug/devLog";
import { emit } from "../events/appEvents";
import { resolveOpportunityApplyErrorCopy } from "./applyErrorCatalog";
import type { OpportunityApplyTelemetryEvent, OpportunityApplyTelemetryPayload } from "../telemetry/opportunityTelemetry";

export type ApplyFlowState = "idle" | "checking" | "submitting" | "applied" | "error";

export function resolveApplyFlowState(params: {
  alreadyApplied: boolean;
  checkingApplied: boolean;
  isApplying: boolean;
  errorMessage?: string | null;
}): ApplyFlowState {
  if (params.isApplying) return "submitting";
  if (params.checkingApplied) return "checking";
  if (params.alreadyApplied) return "applied";
  if (params.errorMessage) return "error";
  return "idle";
}

export function normalizeApplyErrorMessage(response: Pick<ApiResponse<ApplyToOpportunityResult>, "status" | "errorText">): string {
  return resolveOpportunityApplyErrorCopy(response);
}

export type OpportunityApplyTelemetryInput = {
  opportunityId?: string | null;
  surface?: string | null;
  outcome?: string | null;
  status?: number;
  idempotent?: boolean;
};

function defaultOutcomeForEvent(eventName: OpportunityApplyTelemetryEvent): string {
  if (eventName === "application_submit_attempt") return "attempt";
  if (eventName === "application_submit") return "success";
  if (eventName === "application_submit_failed") return "failed";
  return "open";
}

export function buildOpportunityApplyTelemetryPayload(
  eventName: OpportunityApplyTelemetryEvent,
  payload?: OpportunityApplyTelemetryInput,
): OpportunityApplyTelemetryPayload {
  return {
    opportunityId: payload?.opportunityId ? String(payload.opportunityId).trim() || null : null,
    surface: payload?.surface ? String(payload.surface).trim() || "unknown" : "unknown",
    outcome: payload?.outcome ? String(payload.outcome).trim() || defaultOutcomeForEvent(eventName) : defaultOutcomeForEvent(eventName),
    timestamp: new Date().toISOString(),
    status: typeof payload?.status === "number" ? payload.status : undefined,
    idempotent: typeof payload?.idempotent === "boolean" ? payload.idempotent : undefined,
  };
}

export function trackOpportunityApplyTelemetry(
  eventName: OpportunityApplyTelemetryEvent,
  payload?: OpportunityApplyTelemetryInput,
) {
  const normalizedPayload = buildOpportunityApplyTelemetryPayload(eventName, payload);
  emit("telemetry:event", { name: eventName, payload: normalizedPayload });
  devLog("[telemetry]", eventName, normalizedPayload);
}
