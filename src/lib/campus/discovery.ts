import { campusDate, openSlots } from "./scheduling";
import type { Campus } from "./types";

export function availability(campus: Campus, now: number) {
  const result = new Map<string, string>();
  const resourceIds = campus.equipment.map((resource) => resource.id);

  for (let day = 0; day < 14 && result.size < resourceIds.length; day++) {
    const remaining = resourceIds.filter((id) => !result.has(id));
    for (const slot of openSlots(campus, remaining, campusDate(now + day * 86_400_000), 30, now)) {
      if (!result.has(slot.equipmentId)) result.set(slot.equipmentId, slot.start);
    }
  }
  return result;
}

export function catalogSearch(campus: Campus, filters: {
  query: string; category: string; availability: string; access: string; sort: string;
}, now: number) {
  const terms = filters.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const upcoming = availability(campus, now);
  return campus.equipment.flatMap((resource) => {
    const name = resource.name.toLowerCase();
    const searchable = [resource.name, resource.category, resource.department, resource.lab,
      resource.specifications, resource.model, resource.manufacturer, ...resource.capabilities].join(" ").toLowerCase();
    const next = upcoming.get(resource.id);
    const available = next && campusDate(next) === campusDate(now);
    if (!terms.every((term) => searchable.includes(term))) return [];
    if (filters.category && resource.category !== filters.category) return [];
    if (filters.availability === "today" && !available) return [];
    if (filters.availability === "upcoming" && !next) return [];
    if (filters.access === "open" && (resource.requiresApproval || resource.requiresTraining)) return [];
    if (filters.access === "approval" && !resource.requiresApproval) return [];
    if (filters.access === "training" && !resource.requiresTraining) return [];
    return [{ resource, next, score: terms.reduce((score, term) => score + (name.includes(term) ? 3 : 1), 0) }];
  }).sort((first, second) => {
    const title = first.resource.name.localeCompare(second.resource.name) || first.resource.id.localeCompare(second.resource.id);
    return filters.sort === "availability"
      ? (first.next ?? "~").localeCompare(second.next ?? "~") || title
      : second.score - first.score || title;
  });
}
