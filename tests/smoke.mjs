import assert from "node:assert/strict";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3077");
assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "Use an isolated localhost demo server.");

async function call(path, body, cookie, expected = 200) {
  const response = await fetch(new URL(path, base), {
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { Origin: base.origin, "Content-Type": "application/json" } : {}) },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  return [data, response.headers.get("set-cookie")?.split(";")[0]];
}

const [{ workspace, personas }] = await call("/api/campus");
assert.equal(workspace.demo, true);
assert.equal(workspace.equipment.filter((entry) => entry.name.includes("Raspberry Pi")).length, 2);
const routes = ["/", "/equipment?q=Raspberry%20Pi", `/equipment/${workspace.equipment[0].id}`, "/projects",
  `/projects/${workspace.projects[0].id}`, "/bookings", "/conflicts", "/assistant", "/faculty", "/analytics", "/admin", "/check-in", "/login"];
for (const path of routes) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  assert.match(await response.text(), /Campus workspace|labracadabra/i);
}
console.log(`Loaded ${routes.length} application routes.`);

const plan = (await call("/api/copilot", { type: "plan", prompt: "Build an autonomous delivery robot" }))[0];
assert.ok(plan.recommendations.length > 0);
assert.ok(plan.recommendations.every((item) => workspace.equipment.some((entry) => entry.id === item.equipmentId)));
const pending = workspace.requests.find((item) => item.status === "pending_approval");
assert.ok(pending);
const today = pending.start;
const date = new Date(Date.parse(today) + 330 * 60_000).toISOString().slice(0, 10);
const command = { type: "saveProject", title: "Integration test project", description: "Build and test a GPIO prototype.",
  deadline: date, progress: 10, capabilities: ["gpio"], team: [] };
const [project] = await call("/api/campus", command);
const [stored] = await call("/api/campus");
assert.ok(stored.workspace.projects.some((entry) => entry.id === project.id));
const resource = workspace.equipment.find((entry) => entry.name.includes("Raspberry Pi"));
const unit = workspace.units.find((entry) => entry.equipmentId === resource.id);
const slot = { type: "request", projectId: project.id, unitId: unit.id, start: pending.start, end: pending.end, purpose: "Validate end to end booking." };
const [booked] = await call("/api/campus", slot);
assert.equal(booked.status, "confirmed");
const [{ workspace: persisted }] = await call("/api/campus");
assert.ok(persisted.requests.some((entry) => entry.id === booked.id && entry.status === "confirmed"));
const [{ pass }] = await call("/api/campus", { type: "issuePass", id: booked.id });
assert.match(pass, /^[a-f0-9-]{36}$/i);
await call("/api/campus", { type: "checkVisit", pass, action: "in" }, undefined, 403);

const review = { type: "decide", id: pending.id, decision: "approved", comment: "" };
await call("/api/campus", review, undefined, 403);
const wrong = personas.find((entry) => entry.role === "faculty" && entry.department !== "Computer Science");
const [, wrongCookie] = await call("/api/campus", { type: "persona", id: wrong.id });
await call("/api/campus", review, wrongCookie, 403);
const faculty = personas.find((entry) => entry.role === "faculty" && entry.department === "Computer Science");
const [, facultyCookie] = await call("/api/campus", { type: "persona", id: faculty.id });
const [{ workspace: queue }] = await call("/api/campus", undefined, facultyCookie);
const contested = queue.requests.filter((entry) => entry.start === pending.start && entry.unitId === pending.unitId && entry.status === "pending_approval");
assert.equal(contested.length, 2);
const [explanation] = await call("/api/copilot", { type: "conflict", id: pending.id }, facultyCookie);
assert.ok(["deadline", "waiting", "access"].includes(explanation.focus));
const [summary] = await call("/api/copilot", { type: "summary", id: pending.id }, facultyCookie);
assert.ok(summary.summary);
const decisions = await Promise.all(contested.map(async (entry) => {
  const response = await fetch(new URL("/api/campus", base), { method: "POST",
    headers: { Origin: base.origin, "Content-Type": "application/json", Cookie: facultyCookie },
    body: JSON.stringify({ ...review, id: entry.id }) });
  return response.status;
}));
assert.deepEqual(decisions.sort(), [200, 409]);
const [{ workspace: confirmed }] = await call("/api/campus", undefined, facultyCookie);
assert.equal(confirmed.occupied.filter((entry) => entry.unitId === pending.unitId && entry.start === pending.start).length, 1);
const administrator = personas.find((entry) => entry.role === "super_admin");
const [, adminCookie] = await call("/api/campus", { type: "persona", id: administrator.id });
const [{ workspace: analytics }] = await call("/api/campus", undefined, adminCookie);
assert.ok(analytics.analyticsRequests.some((entry) => entry.id === booked.id && entry.status === "confirmed"));
assert.ok(analytics.analyticsRequests.some((entry) => contested.some((item) => entry.id === item.id) && entry.status === "confirmed"));
const blocked = await fetch(new URL("/api/campus", base), { method: "POST", headers: { Origin: "http://example.invalid", "Content-Type": "application/json" }, body: JSON.stringify(review) });
assert.equal(blocked.status, 403);
console.log("Passed project persistence, catalog and Copilot grounding, booking persistence, permission scope, faculty summary, concurrent overlap protection, and admin analytics records.");
