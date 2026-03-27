import type { ApiResponse, ApplyToOpportunityResult } from "../api";
import { devLog } from "../debug/devLog";
import { emit } from "../events/appEvents";

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

function includes(text: string | undefined, pattern: string): boolean {
  return String(text ?? "").toLowerCase().includes(pattern.toLowerCase());
}

export function normalizeApplyErrorMessage(response: Pick<ApiResponse<ApplyToOpportunityResult>, "status" | "errorText">): string {
  const message = String(response.errorText ?? "").trim();

  if (response.status === 409 || includes(message, "already applied")) {
    return "Hai già inviato la candidatura.";
  }
  if (response.status === 404 || includes(message, "not found")) {
    return "Questa opportunità non è più disponibile.";
  }
  if (
    response.status === 401 ||
    response.status === 403 ||
    includes(message, "cannot apply to your own opportunity") ||
    includes(message, "not allowed")
  ) {
    return "Non puoi candidarti a questa opportunità.";
  }
  if (response.status === 429) {
    return "Hai effettuato troppi tentativi. Riprova tra poco.";
  }

  return "Impossibile inviare la candidatura. Riprova.";
}

type OpportunityApplyTelemetryEvent =
  | "application_submit_attempt"
  | "application_submit"
  | "application_submit_failed"
  | "applications_open";

export function trackOpportunityApplyTelemetry(
  eventName: OpportunityApplyTelemetryEvent,
  payload?: Record<string, unknown>,
) {
  emit("telemetry:event", { name: eventName, ...payload });
  devLog("[telemetry]", eventName, payload ?? {});
}
