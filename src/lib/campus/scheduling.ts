import { campusOffset } from "./catalog";
import type { Campus, Interval, Project, Reservation, Resource, Unit } from "./types";

const minute = 60_000;
const step = 30 * minute;
const day = 24 * 60 * minute;
const time = (value: string) => Date.parse(value);

export function campusDate(value: number | string = Date.now()) {
  return new Date((typeof value === "string" ? time(value) : value) + 330 * minute).toISOString().slice(0, 10);
}

export function campusTime(date: string, minutes: number) {
  return new Date(time(`${date}T00:00:00${campusOffset}`) + minutes * minute).toISOString();
}

export function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
}

export function overlap(first: Interval, second: Interval) {
  return first.unitId === second.unitId && time(first.start) < time(second.end) && time(second.start) < time(first.end);
}

export function supportsProject(resource: Resource, project?: Project) {
  return !project?.capabilities.length || project.capabilities.some((capability) => resource.capabilities.includes(capability));
}

export function compatibleResources(resource: Resource, equipment: Resource[], project?: Pick<Project, "capabilities">) {
  const needed = project?.capabilities.filter((capability) => resource.capabilities.includes(capability));
  const essential = needed?.length ? needed : resource.capabilities;
  return equipment.filter((candidate) => candidate.id !== resource.id && essential.length > 0 &&
    essential.every((capability) => candidate.capabilities.includes(capability)));
}

export function slotProblem(
  campus: Campus, unit: Unit, interval: Interval, ownerId: string | undefined, now: number, project?: Project,
) {
  const resource = campus.equipment.find((entry) => entry.id === unit.equipmentId);
  if (!resource || !unit.operational || unit.id !== interval.unitId) return "This unit is unavailable.";
  const start = time(interval.start);
  const end = time(interval.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= now ||
      end - start < step || end - start > 8 * step || (end - start) % step || start % step) {
    return "Choose a future half-hour slot of 30 minutes to four hours.";
  }

  const date = campusDate(start);
  if (!unit.days.includes(weekday(date)) || start < time(campusTime(date, unit.opens * 60)) ||
      end > time(campusTime(date, unit.closes * 60))) return "The slot is outside campus operating hours.";
  if (project && (campusDate(end - 1) > project.deadline || !supportsProject(resource, project))) {
    return "Choose equipment that matches the project and a slot within its deadline.";
  }
  if (ownerId && resource.requiresTraining && !campus.certifications.some((cert) =>
    cert.ownerId === ownerId && cert.equipmentId === resource.id && time(cert.expires) >= end)) {
    return "Current equipment training is required.";
  }
  if (campus.maintenance.some((block) => overlap(block, interval))) return "This slot overlaps maintenance.";
  return null;
}

export function openSlots(
  campus: Campus, resourceIds: string[], date: string, duration: number,
  now: number, ownerId?: string, project?: Project, includeOccupied = false,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(time(`${date}T00:00:00Z`)) ||
    !Number.isInteger(duration) || duration < 30 || duration > 240 || duration % 30) return [];
  const slots = [];
  for (const unit of campus.units.filter((item) => resourceIds.includes(item.equipmentId))) {
    if (!unit.operational || !unit.days.includes(weekday(date))) continue;
    for (let minutes = unit.opens * 60; minutes + duration <= unit.closes * 60; minutes += 30) {
      const interval = { unitId: unit.id, start: campusTime(date, minutes), end: campusTime(date, minutes + duration) };
      if (slotProblem(campus, unit, interval, ownerId, now, project)) continue;
      const occupied = campus.occupied.some((booking) => overlap(booking, interval));
      if (includeOccupied || !occupied) slots.push({ ...interval, equipmentId: unit.equipmentId, occupied });
    }
  }
  return slots.sort((first, second) => first.start.localeCompare(second.start) || first.unitId.localeCompare(second.unitId));
}

export const fairnessWeights = { deadline: 50, waiting: 30, access: 20 };

export function rankRequest(campus: Campus, request: Reservation, now: number) {
  const project = campus.projects.find((entry) => entry.id === request.projectId);
  const daysRemaining = project ? Math.max(0, (time(`${project.deadline}T23:59:59${campusOffset}`) - now) / day) : 14;
  const waited = Math.max(0, (now - time(request.createdAt)) / day);
  const recentHours = campus.requests.filter((entry) =>
    entry.ownerId === request.ownerId && entry.equipmentId === request.equipmentId &&
    ["confirmed", "completed"].includes(entry.status) && time(entry.start) >= now - 30 * day && time(entry.start) <= now
  ).reduce((total, entry) => total + (time(entry.end) - time(entry.start)) / 3_600_000, 0);

  const factors = {
    deadline: fairnessWeights.deadline * Math.max(0, 1 - daysRemaining / 14),
    waiting: fairnessWeights.waiting * Math.min(1, waited / 7),
    access: fairnessWeights.access * Math.max(0, 1 - recentHours / 12),
  };
  return { score: Object.values(factors).reduce((total, points) => total + points, 0), factors, project, recentHours };
}

type Candidate = ReturnType<typeof openSlots>[number];

export function findAlternatives(campus: Campus, request: Reservation, now: number, claimed: Interval[] = []) {
  const project = campus.projects.find((entry) => entry.id === request.projectId);
  const resource = campus.equipment.find((entry) => entry.id === request.equipmentId);
  if (!resource) return [];
  const ids = [resource.id, ...compatibleResources(resource, campus.equipment, project).map((entry) => entry.id)];
  const duration = (time(request.end) - time(request.start)) / minute;
  const searchFrom = Math.max(now, time(request.start) - 3 * day);
  const options: Candidate[] = [];

  for (let i = 0; i < 15; i++) {
    const date = campusDate(searchFrom + i * day);
    if (project && date > project.deadline) break;
    options.push(...openSlots(campus, ids, date, duration, now, request.ownerId, project)
      .filter((option) => !claimed.some((interval) => overlap(option, interval))));
  }

  const cost = (option: Candidate) => {
    const drift = Math.abs(time(option.start) - time(request.start)) / minute;
    const equipmentChange = option.equipmentId === resource.id ? 0 : 45;
    const approval = campus.equipment.find((entry) => entry.id === option.equipmentId)?.requiresApproval ? 15 : 0;
    return drift + equipmentChange + approval;
  };
  return options.sort((first, second) => cost(first) - cost(second) ||
    first.start.localeCompare(second.start) || first.unitId.localeCompare(second.unitId));
}

export function fairShare(campus: Campus, now: number) {
  const pending = campus.requests.filter((entry) => ["pending_approval", "waitlisted"].includes(entry.status) && time(entry.end) > now);
  const conflicts = pending.filter((entry) => campus.occupied.some((slot) => overlap(entry, slot)) ||
    pending.some((other) => entry.id !== other.id && overlap(entry, other)));
  const ranked = conflicts.map((request) => ({ request, ...rankRequest(campus, request, now) }))
    .sort((first, second) => second.score - first.score ||
      time(first.request.createdAt) - time(second.request.createdAt) || first.request.id.localeCompare(second.request.id));

  const claimed: Interval[] = pending.filter((entry) => !conflicts.includes(entry));
  return ranked.map((entry) => {
    const [suggestion, ...alternatives] = findAlternatives(campus, entry.request, now, claimed);
    if (suggestion) claimed.push(suggestion);
    return { ...entry, suggestion, alternatives: alternatives.slice(0, 3) };
  });
}
