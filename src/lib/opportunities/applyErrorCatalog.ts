import type { ApiResponse, ApplyToOpportunityResult } from "../api";

type ApplyErrorCopyRule = {
  id: string;
  matches: (response: Pick<ApiResponse<ApplyToOpportunityResult>, "status" | "errorText">) => boolean;
  message: string;
};

function includes(text: string | undefined, pattern: string): boolean {
  return String(text ?? "").toLowerCase().includes(pattern.toLowerCase());
}

export const APPLY_ERROR_COPY_RULES: ApplyErrorCopyRule[] = [
  {
    id: "already_applied",
    matches: (response) => response.status === 409 || includes(response.errorText, "already applied"),
    message: "Hai già inviato la candidatura.",
  },
  {
    id: "opportunity_not_found",
    matches: (response) => response.status === 404 || includes(response.errorText, "not found"),
    message: "Questa opportunità non è più disponibile.",
  },
  {
    id: "not_allowed",
    matches: (response) =>
      response.status === 401 ||
      response.status === 403 ||
      includes(response.errorText, "cannot apply to your own opportunity") ||
      includes(response.errorText, "not allowed"),
    message: "Non puoi candidarti a questa opportunità.",
  },
  {
    id: "rate_limited",
    matches: (response) => response.status === 429,
    message: "Hai effettuato troppi tentativi. Riprova tra poco.",
  },
];

export const APPLY_ERROR_COPY_FALLBACK = "Impossibile inviare la candidatura. Riprova.";

export function resolveOpportunityApplyErrorCopy(
  response: Pick<ApiResponse<ApplyToOpportunityResult>, "status" | "errorText">,
): string {
  const matchedRule = APPLY_ERROR_COPY_RULES.find((rule) => rule.matches(response));
  return matchedRule?.message ?? APPLY_ERROR_COPY_FALLBACK;
}
