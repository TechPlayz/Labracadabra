import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const directory = process.argv[2];
if (!directory) throw new Error("Pass the temporary directory containing node_modules/@electric-sql/pglite.");
const dist = resolve(directory, "node_modules/@electric-sql/pglite/dist");
const { PGlite } = await import(pathToFileURL(resolve(dist, "index.js")).href);
const { btree_gist } = await import(pathToFileURL(resolve(dist, "contrib/btree_gist.js")).href);
const db = await PGlite.create({ extensions: { btree_gist } });
const id = (value) => `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const account = (value) => `20000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

async function asUser(user) {
  await db.exec("reset role; set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
}
async function mutate(command) {
  return (await db.query("select campus_mutate($1::jsonb) value", [JSON.stringify(command)])).rows[0].value;
}
async function snapshot() {
  return (await db.query("select campus_snapshot() value")).rows[0].value;
}
const validDay = (() => {
  const date = new Date(Date.now() + 2 * 86400000 + 330 * 60000);
  while (date.getUTCDay() % 6 === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
})();
const time = (hour) => `${validDay}T${String(hour).padStart(2, "0")}:00:00+05:30`;
const project = { type: "saveProject", title: "Database workflow", description: "Campus scheduling integration test.", deadline: validDay, capabilities: ["computer-vision"], team: [], progress: 0 };

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  `);
  for (const file of ["supabase/migrations/001_campus.sql", "supabase/migrations/002_workspace.sql", "supabase/seed.sql"]) {
    await db.exec(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
  }
  const users = [[account(1), "student", id(12)], [account(2), "student", id(11)], [account(3), "faculty", id(10)], [account(4), "faculty", id(12)], [account(5), "super_admin", id(10)]];
  for (const [user, role, dept] of users) {
    await db.query("insert into auth.users values ($1)", [user]);
    await db.query("insert into profiles(id,full_name,email,department_id,role) values ($1,$2,$3,$4,$5)", [user, role, `${user}@campus.invalid`, dept, role]);
  }

  await asUser(account(1));
  await assert.rejects(db.query("update profiles set role='super_admin'"), { code: "42501" });
  const saved = await mutate(project);
  await mutate({ ...project, id: saved.id, progress: 40 });
  const first = await mutate({ type: "request", projectId: saved.id, unitId: id(200), start: time(14), end: time(16), purpose: "Evaluate GPU benchmark metrics." });
  assert.equal(first.status, "pending_approval");
  const studentView = await snapshot();
  assert.equal(studentView.projects[0].progress, 40);
  assert.equal(studentView.occupied.length, 0);
  assert.equal(studentView.equipment.length, 15);
  assert.ok(studentView.asOf > 0);
  const approve = { type: "decide", id: first.id, decision: "approved", comment: "Reviewed" };
  await assert.rejects(mutate(approve), { code: "42501" });

  await asUser(account(2));
  assert.equal((await snapshot()).projects.length, 0);
  const secondProject = await mutate(project);
  const second = await mutate({ type: "request", projectId: secondProject.id, unitId: id(200), start: time(14), end: time(16), purpose: "Evaluate GPU benchmark throughput." });
  assert.equal(second.status, "pending_approval");
  await asUser(account(4));
  await assert.rejects(mutate(approve), { code: "42501" });
  await asUser(account(3));
  assert.equal((await snapshot()).requests.length, 2);
  assert.equal((await mutate(approve)).status, "confirmed");
  await assert.rejects(mutate({ ...approve, id: second.id }), /already occupied/);
  await assert.rejects(mutate({ ...approve, id: second.id, decision: "alternative", suggestedStart: time(14), suggestedUnitId: id(201) }), /compatible/);
  assert.equal((await mutate({ ...approve, id: second.id, decision: "alternative", suggestedStart: time(14), suggestedUnitId: id(212) })).status, "rejected");
  await asUser(account(2));
  const student = await snapshot();
  assert.equal(student.requests[0].suggestedEquipmentId, id(112));
  assert.equal(student.notices.length, 2);
  const alternative = await mutate({ type: "request", projectId: secondProject.id, unitId: id(212), start: time(14), end: time(16), purpose: "Take the proposed alternative GPU." });
  assert.equal(alternative.status, "pending_approval");
  await asUser(account(4));
  assert.equal((await mutate({ ...approve, id: alternative.id })).status, "confirmed");

  await asUser(account(1));
  const { pass } = await mutate({ type: "issuePass", id: first.id });
  assert.match(pass, /^[a-f0-9-]{36}$/i);
  assert.ok(!JSON.stringify(await snapshot()).includes(pass));
  await assert.rejects(mutate({ type: "checkVisit", pass, action: "in" }), { code: "42501" });
  await asUser(account(4));
  await assert.rejects(mutate({ type: "checkVisit", pass, action: "in" }), { code: "42501" });
  await asUser(account(3));
  await assert.rejects(mutate({ type: "checkVisit", pass, action: "in" }), /Check-in opens/);

  await asUser(account(5));
  assert.equal((await snapshot()).analyticsRequests.filter((row) => row.status === "confirmed").length, 2);
  await assert.rejects(mutate({ type: "setMaintenance", unitId: id(200), start: time(14), end: time(16) }), /overlaps a confirmed reservation/);
  assert.equal((await mutate({ type: "setMaintenance", unitId: id(200), start: time(9), end: time(10) })).id, id(200));
  assert.equal((await mutate({ type: "setOperational", id: id(214), operational: false })).id, id(214));
  await db.exec("reset role");
  await assert.rejects(db.query("insert into bookings(request_id,equipment_unit_id,starts_at,ends_at) values ($1,$2,$3,$4)", [second.id, id(200), time(15), time(16)]), { code: "23P01" });
  await db.query("update bookings set starts_at=now()-interval '5 minutes',ends_at=now()+interval '60 minutes' where request_id=$1", [first.id]);
  await asUser(account(3));
  assert.equal((await mutate({ type: "checkVisit", pass, action: "in" })).id, first.id);
  await assert.rejects(mutate({ type: "checkVisit", pass, action: "in" }), /Check-in opens/);
  assert.equal((await mutate({ type: "checkVisit", pass, action: "out" })).id, first.id);
  await assert.rejects(mutate({ type: "checkVisit", pass, action: "out" }), /Check-out requires/);
  assert.ok((await snapshot()).requests.find((item) => item.id === first.id).checkedOutAt);
  await db.exec("reset role; set role anon");
  await assert.rejects(snapshot(), { code: "42501" });
  console.log("Applied both migrations and seed in PostgreSQL WASM. Verified project edits, private scope, faculty and admin authorization, proposed cross-department alternatives, alerts, maintenance protection, QR check-in and check-out, and the GiST overlap constraint.");
} finally { await db.close(); }
