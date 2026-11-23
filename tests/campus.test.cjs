/* eslint-disable @typescript-eslint/no-require-imports -- The Node 20 test runner loads TypeScript through a CommonJS hook. */
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");
const { campusId, equipment, units } = require("../src/lib/campus/catalog.ts");
const { availability, catalogSearch } = require("../src/lib/campus/discovery.ts");
const { demoWorkspace, demoMutation, personas } = require("../src/lib/campus/demo.ts");
const { commandSchema } = require("../src/lib/campus/commands.ts");
const { z } = require("zod");
const { generate, usageAllowed } = require("../src/lib/campus/copilot.ts");
const { buildPlan } = require("../src/lib/campus/planning.ts");
const { computeAnalytics } = require("../src/lib/campus/analytics.ts");
const { campusTime, compatibleResources, fairShare, openSlots, overlap, rankRequest, slotProblem } = require("../src/lib/campus/scheduling.ts");

const date = "2026-11-24";
const now = Date.parse(campusTime(date, 8 * 60));
const [student, otherStudent, faculty, wrongFaculty, admin, labAdmin] = personas;
const unitsUsed = [units[0], units[12]];
const at = (hour, day = date) => campusTime(day, hour * 60);
const window = (start, end, unit = units[0]) => ({ unitId: unit.id, start: at(start), end: at(end) });
const project = (key, owner, deadline = date, capabilities = ["gpu"]) => ({
  id: campusId(key), ownerId: owner.id, title: "Test project", description: "Validate campus equipment.", deadline, capabilities, team: [], progress: 0,
});
const firstProject = project(70, student);
const secondProject = project(71, otherStudent, "2026-12-01");
const request = (key, owner, project, status = "pending_approval") => ({
  ...window(14, 16), id: campusId(key), equipmentId: equipment[0].id, ownerId: owner.id,
  projectId: project.id, status, createdAt: new Date(now - 86400000).toISOString(), purpose: "Benchmark GPU workloads.",
});
const first = request(80, student, firstProject);
const second = request(81, otherStudent, secondProject);
const campus = (changes = {}) => ({
  equipment, units, maintenance: [], occupied: [], projects: [firstProject, secondProject],
  requests: [first, second], certifications: [], notices: [], ...changes,
});

test("half-open intervals admit adjacent reservations and detect real overlaps", () => {
  assert.equal(overlap(window(9, 10), window(10, 11)), false);
  assert.equal(overlap(window(9, 10), window(9.5, 11)), true);
  assert.equal(overlap(window(9, 10), window(9, 10, units[12])), false);
});

test("occupied and maintenance periods remove affected slots", () => {
  const data = campus({ maintenance: [window(9, 10)], occupied: [window(10, 11)] });
  assert.match(slotProblem(data, units[0], window(9, 10), student.id, now), /maintenance/);
  const slots = openSlots(data, [equipment[0].id], date, 60, now);
  assert.equal(slots[0].start, at(11));
  assert.ok(openSlots(data, [equipment[0].id], date, 60, now, student.id, undefined, true).some((item) => item.occupied));
});

test("operating hours, weekends, project deadline and duration are hard constraints", () => {
  const data = campus();
  assert.match(slotProblem(data, units[0], window(16.5, 17.5), student.id, now), /operating hours/);
  assert.equal(openSlots(data, [equipment[0].id], "2026-11-28", 60, now).length, 0);
  assert.equal(openSlots(data, [equipment[0].id], "2026-11-25", 60, now, student.id, firstProject).length, 0);
  assert.match(slotProblem(data, units[0], window(9, 14), student.id, now), /four hours/);
  assert.match(slotProblem(data, units[0], window(9.25, 10.25), student.id, now), /half-hour/);
});

test("training must cover the end of a requested session", () => {
  const unit = units[8];
  const slot = window(9, 10, unit);
  const certification = { ownerId: student.id, equipmentId: unit.equipmentId, expires: at(9.5) };
  assert.match(slotProblem(campus({ certifications: [certification] }), unit, slot, student.id, now), /training/);
  assert.equal(slotProblem(campus({ certifications: [{ ...certification, expires: at(10) }] }), unit, slot, student.id, now), null);
});

test("higher urgency wins the contested slot and the compatible unit takes the second request", () => {
  const result = fairShare(campus(), now);
  assert.equal(result[0].request.id, first.id);
  assert.equal(result[0].suggestion.unitId, units[0].id);
  assert.equal(result[0].suggestion.start, first.start);
  assert.equal(result[1].suggestion.unitId, units[12].id);
  assert.equal(result[1].suggestion.start, second.start);
  assert.equal(overlap(result[0].suggestion, result[1].suggestion), false);
  assert.ok(rankRequest(campus(), first, now).factors.deadline > rankRequest(campus(), second, now).factors.deadline);
});

test("earlier submission wins when scores are tied, and recent use reduces access points", () => {
  const earlier = { ...second, createdAt: new Date(now - 8 * 86400000).toISOString() };
  const later = { ...first, createdAt: new Date(now - 7 * 86400000).toISOString() };
  const sameDeadline = { ...secondProject, deadline: firstProject.deadline };
  const data = campus({ projects: [firstProject, sameDeadline], requests: [later, earlier] });
  assert.equal(rankRequest(data, earlier, now).score, rankRequest(data, later, now).score);
  assert.equal(fairShare(data, now)[0].request.id, earlier.id);
  const history = { ...first, id: campusId(82), status: "completed", start: at(11, "2026-11-23"), end: at(15, "2026-11-23") };
  assert.ok(rankRequest(campus({ requests: [first, history] }), first, now).factors.access < rankRequest(campus(), first, now).factors.access);
});

test("alternatives preserve essential capabilities and cannot use confirmed or unavailable units", () => {
  assert.deepEqual(compatibleResources(equipment[0], equipment, firstProject).map((item) => item.id), [equipment[12].id]);
  const blocked = window(9, 17, unitsUsed[0]);
  const data = campus({ units: [unitsUsed[0], { ...unitsUsed[1], operational: false }], occupied: [blocked], requests: [first] });
  const [result] = fairShare(data, now);
  assert.equal(result.suggestion, undefined);
  assert.deepEqual(result.alternatives, []);
});

test("catalog searches cross-campus metadata and honors rule-based availability filters", () => {
  const data = campus({ units: units.map((item) => item.id === units[1].id ? { ...item, operational: false } : item) });
  const filters = { query: "raspberry pi", category: "", availability: "", access: "", sort: "relevance" };
  assert.equal(catalogSearch(data, filters, now).length, 2);
  assert.equal(catalogSearch(data, { ...filters, availability: "today" }, now).length, 1);
  assert.equal(availability(data, now).has(equipment[1].id), false);
  assert.equal(catalogSearch(data, { ...filters, query: "mechatronics gpio" }, now)[0].resource.id, equipment[2].id);
});

test("copilot output is grounded in catalog IDs and strips unsupported model capability labels", () => {
  const plan = buildPlan("I want to build an autonomous delivery robot", equipment);
  assert.equal(plan.source, "Catalog rules");
  assert.ok(plan.recommendations.some((entry) => entry.equipmentId === equipment[9].id));
  assert.ok(plan.recommendations.every((entry) => equipment.some((resource) => resource.id === entry.equipmentId)));
  assert.deepEqual(buildPlan("test project", equipment, ["invented", "gpu"]).capabilities, ["gpu"]);
  assert.deepEqual(buildPlan("zzzx", equipment).recommendations, []);
});

test("Gemini adapter validates structured output, handles outages and bounds usage", async () => {
  const original = global.fetch;
  const key = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-value";
  const schema = z.object({ capabilities: z.array(z.string()).max(12) });
  try {
    global.fetch = async (url, options) => {
      assert.match(url, /:generateContent$/);
      assert.equal(options.headers["x-goog-api-key"], "test-value");
      assert.equal(JSON.parse(options.body).generationConfig.responseJsonSchema.$schema, undefined);
      return Response.json({ candidates: [{ content: { parts: [{ text: "hidden", thought: true }, { text: JSON.stringify({ capabilities: ["gpio"] }) }] } }] });
    };
    assert.deepEqual(await generate("Extract capabilities", { description: "test" }, schema), { capabilities: ["gpio"] });
    global.fetch = async () => Response.json({ candidates: [{ content: { parts: [{ text: '{"unknown":true}' }] } }] });
    assert.equal(await generate("Extract capabilities", {}, schema), undefined);
    global.fetch = async () => new Response(null, { status: 503 });
    assert.equal(await generate("Extract capabilities", {}, schema), undefined);
    assert.ok(Array.from({ length: 10 }, () => usageAllowed("rate-test", 0)).every(Boolean));
    assert.equal(usageAllowed("rate-test", 0), false);
    assert.equal(usageAllowed("rate-test", 60_000), true);
  } finally {
    global.fetch = original;
    if (key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = key;
  }
});

test("analytics subtracts the union of overlapping maintenance from eligible capacity", () => {
  const data = { ...campus({ equipment: [equipment[0]], units: [units[0]], occupied: [window(9, 10)],
    maintenance: [window(11, 13), window(12, 14)] }), actor: admin, analyticsRequests: [], demo: true };
  const result = computeAnalytics(data, 1, now);
  assert.equal(result.hours, 1);
  assert.equal(result.eligible, 5);
  assert.equal(result.utilization, 20);
});

test("server command validation rejects malformed data and ignores extra fields", () => {
  assert.equal(commandSchema.safeParse({ type: "request", projectId: firstProject.id, start: "tomorrow" }).success, false);
  const parsed = commandSchema.parse({ type: "cancel", id: first.id, role: "super_admin" });
  assert.equal("role" in parsed, false);
});

test("persisted demo booking checks authorization, approval, training, capacity, cancellation and waitlist retry", () => {
  const folder = mkdtempSync(join(tmpdir(), "labracadabra-unit-"));
  const oldPath = process.env.LABRACADABRA_DEMO_FILE;
  process.env.LABRACADABRA_DEMO_FILE = join(folder, "store.json");
  try {
    const demo = demoWorkspace(faculty);
    const [pending, competing] = demo.requests.filter((item) => item.status === "pending_approval");
    const approve = { type: "decide", id: pending.id, decision: "approved", comment: "Approved" };
    assert.throws(() => demoMutation(student, approve), { status: 403 });
    assert.throws(() => demoMutation(wrongFaculty, approve), { status: 403 });
    assert.throws(() => demoMutation(labAdmin, { type: "setOperational", id: units[0].id, operational: false }), { status: 403 });
    assert.equal(demoMutation(faculty, approve).status, "confirmed");
    assert.throws(() => demoMutation(faculty, { ...approve, id: competing.id }), /already occupied/);
    assert.throws(() => demoMutation(admin, { type: "setMaintenance", ...window(14, 16), start: pending.start, end: pending.end }), /overlaps/);
    const owner = personas.find((actor) => actor.id === pending.ownerId);
    const loser = personas.find((actor) => actor.id === competing.ownerId);
    assert.throws(() => demoMutation(faculty, { ...approve, id: competing.id, decision: "alternative",
      comment: "Try the second GPU", suggestedStart: competing.start, suggestedUnitId: units[1].id }), /compatible/);
    assert.equal(demoMutation(faculty, { ...approve, id: competing.id, decision: "alternative",
      comment: "Try the second GPU", suggestedStart: competing.start, suggestedUnitId: units[12].id }).status, "rejected");
    assert.equal(demoWorkspace(loser).requests.find((item) => item.id === competing.id).suggestedUnitId, units[12].id);
    const queued = demoMutation(loser, { type: "request", projectId: competing.projectId, unitId: competing.unitId,
      start: competing.start, end: competing.end, purpose: "Wait for a confirmed opening." });
    assert.equal(queued.status, "waitlisted");
    assert.equal(demoMutation(owner, { type: "cancel", id: pending.id }).status, "cancelled");
    assert.equal(demoMutation(loser, { type: "retry", id: queued.id }).status, "pending_approval");
    assert.equal(demoMutation(faculty, { ...approve, id: queued.id }).status, "confirmed");
    assert.equal(demoWorkspace(loser).requests.find((item) => item.id === queued.id).status, "confirmed");
    assert.ok(demoWorkspace(loser).notices.some((notice) => /confirmed/.test(notice.message)));
  } finally {
    if (oldPath === undefined) delete process.env.LABRACADABRA_DEMO_FILE;
    else process.env.LABRACADABRA_DEMO_FILE = oldPath;
    rmSync(folder, { recursive: true, force: true });
  }
});
