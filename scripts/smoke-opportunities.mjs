import fs from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const applyWorkflow = fs.readFileSync("src/lib/opportunities/applyWorkflow.ts", "utf8");
const opportunitiesList = fs.readFileSync("app/(tabs)/opportunities/index.tsx", "utf8");
const opportunitiesDetail = fs.readFileSync("app/opportunities/[id].tsx", "utf8");
const myApplications = fs.readFileSync("app/my/applications.tsx", "utf8");
const clubApplications = fs.readFileSync("app/club/applications.tsx", "utf8");
const opportunityApplications = fs.readFileSync("app/opportunities/[id]/applications.tsx", "utf8");

assert(applyWorkflow.includes('response.status === 409'), "Missing 409 idempotent mapping in apply error catalog");
assert(applyWorkflow.includes('Impossibile inviare la candidatura. Riprova.'), "Missing fallback UX error copy");

assert(opportunitiesList.includes('"application_submit_attempt"'), "Missing application_submit_attempt telemetry on list");
assert(opportunitiesList.includes('"application_submit_failed"'), "Missing application_submit_failed telemetry on list");
assert(opportunitiesDetail.includes('"application_submit"'), "Missing application_submit telemetry on detail");

const openSurfaces = [myApplications, clubApplications, opportunityApplications].join("\n");
assert(openSurfaces.includes('surface: "my_applications"'), "Missing applications_open my_applications telemetry");
assert(openSurfaces.includes('surface: "club_applications"'), "Missing applications_open club_applications telemetry");
assert(openSurfaces.includes('surface: "opportunity_applications"'), "Missing applications_open opportunity_applications telemetry");

assert(!opportunitiesList.includes('apply_state: {applyFlowState}</Text> : null}\n') || opportunitiesList.includes('SHOW_APPLY_FLOW_DEBUG_LABEL'), "apply_state label is not explicitly guarded on list");
assert(!opportunitiesDetail.includes('apply_state: {applyFlowState}</Text> : null}\n') || opportunitiesDetail.includes('SHOW_APPLY_FLOW_DEBUG_LABEL'), "apply_state label is not explicitly guarded on detail");

console.log("PR-F4 smoke checks passed");
