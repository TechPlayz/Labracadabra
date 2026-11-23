import { randomUUID } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { campusId, equipment, units } from "./catalog";
import { CampusError, type Command } from "./commands";
import { campusDate, campusTime, compatibleResources, overlap, slotProblem, weekday } from "./scheduling";
import { canReview, type Actor, type Campus, type Reservation, type Workspace } from "./types";

export const personas: Actor[] = [
  { id: campusId(30), name: "Alex Rivera", role: "student", department: "Mechatronics" },
  { id: campusId(31), name: "Maya Shah", role: "student", department: "Electrical Engineering" },
  { id: campusId(32), name: "Dr. Nila Rao", role: "faculty", department: "Computer Science" },
  { id: campusId(33), name: "Dr. Sam Patel", role: "faculty", department: "Mechatronics" },
  { id: campusId(34), name: "Jamie Chen", role: "super_admin", department: "Computer Science" },
  { id: campusId(35), name: "Morgan Singh", role: "lab_admin", department: "Mechanical Engineering" },
];

interface DemoState extends Campus {
  passes?: Record<string, string>;
  audit: { actorId: string; action: string; subjectId: string; at: string }[];
}

function seed(now: number): DemoState {
  let next = now + 86_400_000;
  while (weekday(campusDate(next)) > 5) next += 86_400_000;
  const date = campusDate(next);
  const start = campusTime(date, 14 * 60);
  const end = campusTime(date, 16 * 60);
  const createdAt = new Date(now - 2 * 86_400_000).toISOString();
  const projects = [
    { id: campusId(40), ownerId: personas[0].id, title: "Autonomous delivery robot", description: "Train a vision model and prototype campus navigation for a small delivery robot.", deadline: date, capabilities: ["computer-vision", "navigation", "sensor-integration", "3d-printing"], team: [], progress: 35 },
    { id: campusId(41), ownerId: personas[1].id, title: "Intelligent traffic counter", description: "Compare camera models for edge-based traffic counting.", deadline: campusDate(next + 7 * 86_400_000), capabilities: ["computer-vision"], team: [], progress: 10 },
  ];
  const requests: Reservation[] = projects.map((project, index) => ({
    id: campusId(50 + index), ownerId: project.ownerId, projectId: project.id,
    unitId: units[0].id, equipmentId: equipment[0].id, start, end, createdAt,
    status: "pending_approval", purpose: index === 0
      ? "Train the robot's initial object detection model and record inference performance."
      : "Benchmark two camera models for the traffic counting project.",
  }));
  for (let offset = 1; offset <= 28; offset++) {
    const earlier = campusDate(now - offset * 86_400_000);
    if (weekday(earlier) > 5) continue;
    const unit = units[1 + offset % (units.length - 1)];
    requests.push({ id: campusId(60 + offset), ownerId: personas[0].id, projectId: projects[0].id,
      unitId: unit.id, equipmentId: unit.equipmentId, start: campusTime(earlier, 10 * 60),
      end: campusTime(earlier, 12 * 60), createdAt: campusTime(earlier, 9 * 60), status: "completed",
      purpose: "Example activity from a prior campus session." });
  }
  return {
    equipment, units, projects, requests, audit: [], notices: [], occupied: [],
    maintenance: [{ unitId: units[8].id, start: campusTime(date, 9 * 60), end: campusTime(date, 11 * 60) }],
    certifications: [{ ownerId: personas[0].id, equipmentId: equipment[8].id, expires: new Date(now + 60 * 86_400_000).toISOString() }],
  };
}

const demoPath = () => resolve(process.env.LABRACADABRA_DEMO_FILE || (
  process.env.VERCEL === "1"
    ? join(tmpdir(), "labracadabra-demo", "workspace.json")
    : ".labracadabra-demo/workspace.json"
));

function transaction<T>(work: (state: DemoState, now: number) => T, save = false) {
  const file = demoPath();
  mkdirSync(dirname(file), { recursive: true });
  let lock;
  try {
    lock = openSync(`${file}.lock`, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new CampusError("The demo workspace is busy. Retry in a moment.", 409);
    throw error;
  }
  try {
    const now = Date.now();
    let state: DemoState;
    let initialized = false;
    try {
      state = JSON.parse(readFileSync(file, "utf-8")) as DemoState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      state = seed(now);
      initialized = true;
    }
    state.occupied = state.requests.filter((request) => request.status === "confirmed" || request.status === "completed");
    const result = work(state, now);
    if (save || initialized) {
      const pending = `${file}.${randomUUID()}.tmp`;
      writeFileSync(pending, JSON.stringify(state), { flag: "wx" });
      try { renameSync(pending, file); } catch (error) { unlinkSync(pending); throw error; }
    }
    return result;
  } finally {
    closeSync(lock);
    unlinkSync(`${file}.lock`);
  }
}

export function demoActor(id?: string) {
  return personas.find((person) => person.id === id) ?? personas[0];
}

export function demoWorkspace(actor: Actor): Workspace {
  return transaction((state, now) => {
    const all = state.requests.map((request) => ({
      ...request,
      status: request.status === "confirmed" && Date.parse(request.end) <= now ? "completed" as const : request.status,
    }));
    const requests = all.filter((request) => {
      const resource = state.equipment.find((entry) => entry.id === request.equipmentId);
      return request.ownerId === actor.id || (resource && canReview(actor, resource, request.ownerId));
    });
    return {
      actor, demo: true, asOf: now, equipment: state.equipment, units: state.units, maintenance: state.maintenance,
      occupied: state.occupied.map(({ unitId, start, end }) => ({ unitId, start, end })),
      requests: requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      projects: state.projects.filter((project) =>
        project.ownerId === actor.id || project.team.includes(actor.id) || requests.some((request) => request.projectId === project.id)),
      certifications: state.certifications.filter((item) => item.ownerId === actor.id ||
        requests.some((request) => request.ownerId === item.ownerId && request.equipmentId === item.equipmentId)),
      notices: state.notices.filter((entry) => entry.ownerId === actor.id).reverse(),
      analyticsRequests: all.filter((request) => actor.role === "super_admin" ||
        (actor.role === "lab_admin" && state.equipment.find((item) => item.id === request.equipmentId)?.department === actor.department))
        .map(({ id, unitId, equipmentId, start, end, status, fromWaitlist, ownerId }) => ({
          id, unitId, equipmentId, start, end, status, fromWaitlist, crossDepartment:
            personas.find((person) => person.id === ownerId)?.department !== state.equipment.find((resource) => resource.id === equipmentId)?.department,
        })),
    };
  });
}

export function demoMutation(actor: Actor, command: Command) {
  return transaction((state, now) => {
    const at = new Date(now).toISOString();
    const audit = (action: string, subjectId: string) => state.audit.push({ actorId: actor.id, action, subjectId, at });
    const notify = (ownerId: string, message: string) => state.notices.push({ id: randomUUID(), ownerId, message, createdAt: at, read: false });
    const forbidden = () => new CampusError("Your demo persona does not have access to this action.", 403);
    if (command.type === "readNotices") {
      for (const notice of state.notices) if (notice.ownerId === actor.id) notice.read = true;
      return {};
    }
    if (command.type === "saveProject") {
      if (actor.role !== "student") throw forbidden();
      const old = state.projects.find((project) => project.id === command.id);
      if (command.id && old?.ownerId !== actor.id) throw forbidden();
      if (command.team.some((id) => !personas.some((person) => person.id === id))) throw new CampusError("Choose an existing demo member.");
      const { title, description, deadline, capabilities, team, progress } = command;
      const project = { id: old?.id ?? randomUUID(), ownerId: actor.id, title, description, deadline,
        capabilities, team: [...new Set(team)].filter((id) => id !== actor.id), progress };
      state.projects = [...state.projects.filter((entry) => entry.id !== project.id), project];
      audit(command.type, project.id);
      return { id: project.id };
    }

    if (command.type === "issuePass") {
      const request = state.requests.find((item) => item.id === command.id && item.ownerId === actor.id);
      if (!request || request.status !== "confirmed" || request.checkedOutAt || Date.parse(request.end) + 86_400_000 <= now) throw forbidden();
      state.passes ??= {};
      state.passes[request.id] ??= randomUUID();
      return { pass: state.passes[request.id] };
    }
    if (command.type === "checkVisit") {
      const request = state.requests.find((item) => state.passes?.[item.id] === command.pass);
      const resource = state.equipment.find((item) => item.id === request?.equipmentId);
      if (!request || !resource || request.status !== "confirmed" || !canReview(actor, resource, request.ownerId)) throw forbidden();
      const starts = Date.parse(request.start);
      const ends = Date.parse(request.end);
      if (command.action === "in") {
        if (request.checkedInAt || now < starts - 900_000 || now >= ends) throw new CampusError("Check-in opens 15 minutes before the session and closes at its scheduled end.", 409);
        request.checkedInAt = at;
      } else {
        if (!request.checkedInAt || request.checkedOutAt || now >= ends + 86_400_000) throw new CampusError("Check-out requires an active check-in and closes 24 hours after the session.", 409);
        request.checkedOutAt = at;
      }
      audit(`visit:${command.action}`, request.id);
      notify(request.ownerId, `Lab visit ${command.action === "in" ? "check-in" : "check-out"} recorded for ${resource.name}.`);
      return { id: request.id };
    }
    if (command.type === "setOperational" || command.type === "setMaintenance") {
      const unit = state.units.find((entry) => entry.id === (command.type === "setOperational" ? command.id : command.unitId));
      const resource = state.equipment.find((entry) => entry.id === unit?.equipmentId);
      if (!unit || !resource || !(actor.role === "super_admin" || (actor.role === "lab_admin" && actor.department === resource.department))) throw forbidden();
      if (command.type === "setOperational") {
        if (!command.operational && state.occupied.some((entry) => entry.unitId === unit.id && Date.parse(entry.end) > now)) {
          throw new CampusError("This unit has upcoming confirmed reservations.", 409);
        }
        unit.operational = command.operational;
      } else {
        if (Date.parse(command.start) <= now || Date.parse(command.end) <= Date.parse(command.start)) {
          throw new CampusError("Choose a future maintenance window with a positive duration.");
        }
        if (state.occupied.some((entry) => overlap(entry, command)) || state.maintenance.some((entry) => overlap(entry, command))) {
          throw new CampusError("Maintenance overlaps an existing reservation or maintenance window.", 409);
        }
        state.maintenance.push({ unitId: unit.id, start: command.start, end: command.end });
      }
      audit(command.type, unit.id);
      return { id: unit.id };
    }

    const existing = command.type === "request" ? undefined : state.requests.find((request) => request.id === command.id);
    if (command.type !== "request" && !existing) throw forbidden();
    const slot = existing ?? (command.type === "request" ? command : undefined);
    if (!slot) throw new CampusError("Missing requested slot.");
    const unit = state.units.find((entry) => entry.id === slot.unitId);
    const resource = state.equipment.find((entry) => entry.id === unit?.equipmentId);
    const project = state.projects.find((entry) => entry.id === slot.projectId);
    if (!unit || !resource || !project) throw new CampusError("The requested resource or project is unavailable.");
    const validate = (candidate: typeof slot, ownerId: string) => {
      if (project.ownerId !== ownerId && !project.team.includes(ownerId)) throw forbidden();
      const problem = slotProblem(state, unit, candidate, ownerId, now, project);
      if (problem) throw new CampusError(problem, 409);
      return state.occupied.some((entry) => overlap(entry, candidate));
    };

    if (command.type === "request") {
      if (actor.role !== "student" || (project.ownerId !== actor.id && !project.team.includes(actor.id))) throw forbidden();
      const occupied = validate(command, actor.id);
      if (state.requests.some((entry) => entry.ownerId === actor.id && entry.unitId === unit.id &&
        Date.parse(entry.start) === Date.parse(command.start) && Date.parse(entry.end) === Date.parse(command.end) &&
        ["waitlisted", "pending_approval", "confirmed"].includes(entry.status))) throw new CampusError("You already have a request for this slot.", 409);
      const status = occupied ? "waitlisted" : resource.requiresApproval ? "pending_approval" : "confirmed";
      const id = randomUUID();
      state.requests.push({ id, ownerId: actor.id, unitId: unit.id, projectId: project.id, equipmentId: resource.id,
        start: new Date(command.start).toISOString(), end: new Date(command.end).toISOString(),
        purpose: command.purpose, status, createdAt: at });
      audit(`request:${status}`, id);
      notify(actor.id, `Request for ${resource.name}: ${status.replaceAll("_", " ")}.`);
      return { id, status };
    }
    if (!existing) throw forbidden();
    if (command.type === "cancel") {
      if (existing.ownerId !== actor.id) throw forbidden();
      if (!["waitlisted", "pending_approval", "confirmed"].includes(existing.status) || Date.parse(existing.start) <= now) {
        throw new CampusError("This request cannot be cancelled.", 409);
      }
      existing.status = "cancelled";
    } else if (command.type === "retry") {
      if (existing.ownerId !== actor.id) throw forbidden();
      if (existing.status !== "waitlisted") throw new CampusError("This request is no longer waitlisted.", 409);
      if (validate(existing, actor.id)) throw new CampusError("This slot is still occupied.", 409);
      existing.status = resource.requiresApproval ? "pending_approval" : "confirmed";
      existing.fromWaitlist = true;
    } else {
      if (!canReview(actor, resource, existing.ownerId)) throw forbidden();
      if (existing.status !== "pending_approval") throw new CampusError("This request is no longer pending.", 409);
      if (command.decision === "approved") {
        if (validate(existing, existing.ownerId)) throw new CampusError("This slot is already occupied.", 409);
        existing.status = "confirmed";
      } else {
        if (command.comment.length < 3) throw new CampusError("Include a reason for your decision.");
        if (command.decision === "alternative") {
          if (!command.suggestedStart) throw new CampusError("Choose a suggested slot.");
          const alternateUnit = state.units.find((entry) => entry.id === (command.suggestedUnitId ?? unit.id));
          const matches = compatibleResources(resource, state.equipment, project);
          if (!alternateUnit || (alternateUnit.equipmentId !== resource.id && !matches.some((entry) => entry.id === alternateUnit.equipmentId))) {
            throw new CampusError("Choose a compatible alternative unit.", 409);
          }
          const end = new Date(Date.parse(command.suggestedStart) + Date.parse(existing.end) - Date.parse(existing.start)).toISOString();
          const proposal = { unitId: alternateUnit.id, start: command.suggestedStart, end };
          const problem = slotProblem(state, alternateUnit, proposal, existing.ownerId, now, project);
          if (problem) throw new CampusError(problem, 409);
          if (state.occupied.some((entry) => overlap(entry, proposal))) throw new CampusError("The alternative is already occupied.", 409);
          existing.suggestedStart = command.suggestedStart;
          existing.suggestedUnitId = alternateUnit.id;
          existing.suggestedEquipmentId = alternateUnit.equipmentId;
        }
        existing.status = "rejected";
      }
      existing.comment = command.comment;
      existing.decisionBy = actor.id;
      existing.decidedAt = at;
    }
    audit(`${command.type}:${existing.status}`, existing.id);
    notify(existing.ownerId, `Request for ${resource.name}: ${existing.suggestedStart ? "alternative slot suggested" : existing.status.replaceAll("_", " ")}.`);
    return { id: existing.id, status: existing.status };
  }, true);
}
