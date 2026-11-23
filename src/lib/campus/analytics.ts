import { campusDate, campusTime, openSlots, weekday } from "./scheduling";
import type { Interval, Workspace } from "./types";

const day = 86_400_000;
const hour = 3_600_000;

function clipped(start: number, end: number, intervals: Interval[]) {
  const slices = intervals.map((entry) => [Math.max(start, Date.parse(entry.start)), Math.min(end, Date.parse(entry.end))])
    .filter(([start, end]) => start < end).sort((first, second) => first[0] - second[0]);
  let through = start;
  let total = 0;
  for (const [from, to] of slices) {
    total += Math.max(0, to - Math.max(through, from));
    through = Math.max(through, to);
  }
  return total / hour;
}

export function computeAnalytics(workspace: Workspace, days: number, now: number) {
  const resources = workspace.equipment.filter((entry) => workspace.actor.role === "super_admin" || entry.department === workspace.actor.department);
  const ids = new Set(resources.map((entry) => entry.id));
  const units = workspace.units.filter((entry) => ids.has(entry.equipmentId));
  const dates = Array.from({ length: Math.abs(days) }, (_, index) => campusDate(now + (days < 0 ? index : index - days + 1) * day));
  const periodStart = Date.parse(campusTime(dates[0], 0));
  const periodEnd = Date.parse(campusTime(dates.at(-1)!, 1440));
  const requests = workspace.analyticsRequests.filter((entry) => ids.has(entry.equipmentId) &&
    Date.parse(entry.start) < periodEnd && Date.parse(entry.end) > periodStart);
  const occupied = workspace.occupied.filter((entry) => Date.parse(entry.start) < periodEnd && Date.parse(entry.end) > periodStart);
  const byDepartment = new Map<string, { occupied: number; eligible: number }>();
  const byCategory = new Map<string, number>();
  const demand = new Map<string, number>();
  const peak = new Map<number, number>();
  const timeSeries: { date: string; utilization: number; requests: number }[] = [];
  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));

  for (const resource of resources) byCategory.set(resource.category, (byCategory.get(resource.category) ?? 0) + 1);
  for (const request of requests) demand.set(request.equipmentId, (demand.get(request.equipmentId) ?? 0) + 1);
  for (const date of dates) {
    let used = 0;
    let capacity = 0;
    for (const unit of units) {
      if (!unit.days.includes(weekday(date))) continue;
      const start = Date.parse(campusTime(date, unit.opens * 60));
      const end = Date.parse(campusTime(date, unit.closes * 60));
      const blocks = workspace.maintenance.filter((entry) => entry.unitId === unit.id);
      const bookings = occupied.filter((entry) => entry.unitId === unit.id);
      const occupiedHours = clipped(start, end, bookings);
      const eligible = unit.operational ? (end - start) / hour - clipped(start, end, blocks) : occupiedHours;
      used += occupiedHours;
      capacity += eligible;
      const department = resources.find((entry) => entry.id === unit.equipmentId)?.department ?? "";
      const departmentTotal = byDepartment.get(department) ?? { occupied: 0, eligible: 0 };
      departmentTotal.occupied += occupiedHours; departmentTotal.eligible += eligible;
      byDepartment.set(department, departmentTotal);
      for (let time = unit.opens; time < unit.closes; time++) {
        const hours = clipped(Date.parse(campusTime(date, time * 60)), Date.parse(campusTime(date, (time + 1) * 60)), bookings);
        if (hours > 0) {
          peak.set(time, (peak.get(time) ?? 0) + hours);
          heatmap[weekday(date) - 1][time] += hours;
        }
      }
    }
    timeSeries.push({ date, utilization: capacity > 0 ? 100 * used / capacity : 0,
      requests: requests.filter((entry) => campusDate(entry.start) === date).length });
  }

  const totals = [...byDepartment.values()].reduce((total, item) => ({ occupied: total.occupied + item.occupied, eligible: total.eligible + item.eligible }), { occupied: 0, eligible: 0 });
  const usage = resources.map((entry) => ({ id: entry.id, label: entry.name, department: entry.department, count: demand.get(entry.id) ?? 0 }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
  const open = new Set(openSlots(workspace, [...ids], campusDate(now), 30, now).map((entry) => entry.equipmentId));
  const historical = workspace.analyticsRequests.filter((entry) => ids.has(entry.equipmentId) &&
    Date.parse(entry.start) < now && Date.parse(entry.start) >= now - 28 * day);
  const historicalCounts = new Map<string, number>();
  for (const entry of historical) {
    const date = campusDate(entry.start);
    historicalCounts.set(date, (historicalCounts.get(date) ?? 0) + 1);
  }
  const forecast = Array.from({ length: 7 }, (_, index) => {
    const date = campusDate(now + (index + 1) * day);
    const samples = [7, 14, 21, 28, 35].map((offset) => campusDate(now + (index + 1 - offset) * day))
      .filter((sample) => sample < campusDate(now) && sample >= campusDate(now - 28 * day));
    return { date, value: samples.reduce((sum, sample) => sum + (historicalCounts.get(sample) ?? 0), 0) / samples.length };
  });
  return {
    heatmap, forecast: historicalCounts.size >= 7 ? forecast : [],
    total: resources.length, open: open.size, hours: totals.occupied, eligible: totals.eligible,
    utilization: totals.eligible > 0 ? 100 * totals.occupied / totals.eligible : 0,
    volume: requests.length, pending: requests.filter((entry) => entry.status === "pending_approval").length,
    crossDepartment: requests.filter((entry) => entry.crossDepartment).length,
    recovered: requests.filter((entry) => entry.fromWaitlist && ["confirmed", "completed"].includes(entry.status)).length,
    timeSeries, byDepartment: [...byDepartment].map(([label, value]) => ({ label, value: value.eligible > 0 ? 100 * value.occupied / value.eligible : 0 })),
    byCategory: [...byCategory].map(([label, value]) => ({ label, value })),
    most: usage.slice(0, 4), least: [...usage].reverse().slice(0, 4),
    peak: [...peak].map(([label, value]) => ({ label: `${String(label).padStart(2, "0")}:00 IST`, value })).sort((a, b) => b.value - a.value).slice(0, 4),
  };
}
