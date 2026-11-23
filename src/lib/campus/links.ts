import { campusDate } from "./scheduling";
import type { Interval } from "./types";

export function slotLink(option: Interval & { equipmentId: string }, project?: string) {
  const query = new URLSearchParams({
    date: campusDate(option.start), start: new Date(option.start).toISOString(), unit: option.unitId,
    minutes: String((Date.parse(option.end) - Date.parse(option.start)) / 60_000),
  });
  if (project) query.set("project", project);
  return `/equipment/${option.equipmentId}?${query}`;
}
