import assert from "node:assert/strict";

import {
  buildOpportunityApplyTelemetryPayload,
  normalizeApplyErrorMessage,
} from "../../src/lib/opportunities/applyWorkflow";

function run() {
  const successPayload = buildOpportunityApplyTelemetryPayload("application_submit", {
    opportunityId: "opp-123",
    surface: "opportunities_list",
  });
  assert.equal(successPayload.opportunityId, "opp-123");
  assert.equal(successPayload.surface, "opportunities_list");
  assert.equal(successPayload.outcome, "success");
  assert.ok(successPayload.timestamp);

  const failureMessage = normalizeApplyErrorMessage({ status: 403, errorText: "Cannot apply to your own opportunity" } as any);
  assert.equal(failureMessage, "Non puoi candidarti a questa opportunità.");

  const idempotentPayload = buildOpportunityApplyTelemetryPayload("application_submit", {
    opportunityId: "opp-123",
    surface: "opportunity_detail",
    outcome: "success_idempotent",
    idempotent: true,
  });
  assert.equal(idempotentPayload.idempotent, true);
  assert.equal(idempotentPayload.outcome, "success_idempotent");
  assert.equal(normalizeApplyErrorMessage({ status: 409, errorText: "Already applied" } as any), "Hai già inviato la candidatura.");

  const openMy = buildOpportunityApplyTelemetryPayload("applications_open", {
    surface: "my_applications",
  });
  const openClub = buildOpportunityApplyTelemetryPayload("applications_open", {
    surface: "club_applications",
  });
  const openOpp = buildOpportunityApplyTelemetryPayload("applications_open", {
    surface: "opportunity_applications",
    opportunityId: "opp-999",
  });

  assert.equal(openMy.outcome, "open");
  assert.equal(openClub.outcome, "open");
  assert.equal(openOpp.opportunityId, "opp-999");

  console.log("Smoke opportunities/applications: PASS");
}

run();
