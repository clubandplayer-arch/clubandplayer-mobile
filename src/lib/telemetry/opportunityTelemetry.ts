import { devLog } from "../debug/devLog";
import { on } from "../events/appEvents";

export type OpportunityApplyTelemetryEvent =
  | "application_submit_attempt"
  | "application_submit"
  | "application_submit_failed"
  | "applications_open";

export type OpportunityApplyTelemetryPayload = {
  opportunityId: string | null;
  surface: string;
  outcome: string;
  timestamp: string;
  status?: number;
  idempotent?: boolean;
};

type TelemetryEventEnvelope = {
  name: OpportunityApplyTelemetryEvent;
  payload: OpportunityApplyTelemetryPayload;
};

type TelemetryProvider = (event: TelemetryEventEnvelope) => void | Promise<void>;

let telemetryProvider: TelemetryProvider | null = null;
let telemetryConsumerInstalled = false;

export function setOpportunityTelemetryProvider(provider: TelemetryProvider | null) {
  telemetryProvider = provider;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toEnvelope(payload: unknown): TelemetryEventEnvelope | null {
  if (!isRecord(payload)) return null;
  const name = payload.name;
  const raw = payload.payload;
  if (typeof name !== "string" || !isRecord(raw)) return null;

  const envelope: TelemetryEventEnvelope = {
    name: name as OpportunityApplyTelemetryEvent,
    payload: {
      opportunityId: typeof raw.opportunityId === "string" ? raw.opportunityId : null,
      surface: typeof raw.surface === "string" ? raw.surface : "unknown",
      outcome: typeof raw.outcome === "string" ? raw.outcome : "unknown",
      timestamp: typeof raw.timestamp === "string" ? raw.timestamp : new Date().toISOString(),
      status: typeof raw.status === "number" ? raw.status : undefined,
      idempotent: typeof raw.idempotent === "boolean" ? raw.idempotent : undefined,
    },
  };

  return envelope;
}

export function installOpportunityTelemetryConsumer() {
  if (telemetryConsumerInstalled) return () => undefined;
  telemetryConsumerInstalled = true;

  return on("telemetry:event", (input) => {
    const event = toEnvelope(input);
    if (!event) {
      devLog("[telemetry] invalid telemetry:event payload", input);
      return;
    }

    if (!telemetryProvider) {
      devLog("[telemetry] provider missing, event sent to dev fallback", event);
      return;
    }

    try {
      const maybePromise = telemetryProvider(event);
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === "function") {
        void (maybePromise as Promise<void>).catch((error) => {
          devLog("[telemetry] provider error", error);
        });
      }
    } catch (error) {
      devLog("[telemetry] provider throw", error);
    }
  });
}
