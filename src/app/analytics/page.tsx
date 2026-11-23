"use client";

import { useState } from "react";
import { Activity, Building2, CalendarCheck, Clock, FlaskConical, Scale } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCampus } from "@/components/layout/CampusProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDay, PageHeading } from "@/components/ui/WorkspaceUI";
import { computeAnalytics } from "@/lib/campus/analytics";

export default function AnalyticsPage() {
  return <AppLayout><Analytics /></AppLayout>;
}

function Analytics() {
  const { workspace } = useCampus();
  const [days, setDays] = useState(7);
  if (!workspace) return null;
  if (workspace.actor.role !== "lab_admin" && workspace.actor.role !== "super_admin") return <Card className="space-y-2 p-5"><h1 className="text-xl font-semibold">Administrator access required</h1><p className="text-sm text-quiet">Resource analytics are available to campus and laboratory administrators.</p></Card>;
  const stats = computeAnalytics(workspace, days, workspace.asOf);
  const metrics = [
    { label: "Catalog resources", value: stats.total, hint: `${stats.open} with openings today`, icon: FlaskConical },
    { label: "Utilization", value: `${stats.utilization.toFixed(1)}%`, hint: `${stats.hours.toFixed(1)} of ${stats.eligible.toFixed(1)} unit-hours`, icon: Activity },
    { label: "Booking requests", value: stats.volume, hint: "By requested session date", icon: CalendarCheck },
    { label: "Cross-department requests", value: stats.crossDepartment, hint: "Requester and resource departments differ", icon: Building2 },
    { label: "Pending approvals", value: stats.pending, hint: "In the selected period", icon: Clock },
    { label: "Waitlist recoveries", value: stats.recovered, hint: "Waitlisted requests later confirmed", icon: Scale },
  ];

  return <div className="space-y-6">
    <PageHeading title="Resource analytics" description={workspace.actor.role === "super_admin" ? "Campus-wide demand, access, and resource utilization." : `Resource utilization in ${workspace.actor.department}.`}
      action={<label className="text-sm font-medium">Reporting period<select className="field mt-1" value={days} onChange={(event) => setDays(Number(event.target.value))}>
        <option value={7}>Last 7 days</option><option value={-7}>Next 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option>
      </select></label>} />
    {workspace.demo && <Badge variant="warning">Demo records</Badge>}
    <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-3">
      {metrics.map(({ label, value, hint, icon: Icon }) => <div key={label} className="space-y-1 bg-paper p-4">
        <div className="flex items-center gap-2 text-sm text-quiet"><Icon className="size-4 shrink-0 text-accent-ink" />{label}</div>
        <p className="text-[29px] font-semibold tracking-tight tabular-nums">{value}</p><p className="text-xs text-quiet">{hint}</p>
      </div>)}
    </Card>
    <div className="grid gap-4 md:grid-cols-2">
      <Trend title="Utilization trend" data={stats.timeSeries.map((item) => ({ date: item.date, value: item.utilization }))} percent />
      <Trend title="Booking activity" data={stats.timeSeries.map((item) => ({ date: item.date, value: item.requests }))} />
      <Bars title="Department utilization" data={stats.byDepartment} percent />
      <Bars title="Equipment by category" data={stats.byCategory} />
      <Bars title="Most requested equipment" data={stats.most.map((item) => ({ label: `${item.label} · ${item.department}`, value: item.count }))} />
      <Bars title="Equipment with lowest demand" data={stats.least.map((item) => ({ label: `${item.label} · ${item.department}`, value: item.count }))} />
      <Bars title="Peak booked hours" data={stats.peak} />
      {stats.forecast.length > 0 ? <Trend title="Next-week request forecast" data={stats.forecast} /> : <Card className="space-y-2 p-5"><h2 className="text-lg font-semibold">Request forecast</h2><p className="text-sm text-quiet">At least seven dates with recent request history are needed.</p></Card>}
      <DemandHeatmap data={stats.heatmap} />
      <Card className="space-y-3 p-5 text-sm text-quiet">
        <h2 className="section-title text-ink">Metric definitions</h2>
        <p>Utilization divides confirmed, occupied unit-hours by scheduled operational unit-hours in the chosen period. Maintenance is removed from eligible hours. Today includes its remaining scheduled capacity.</p>
        <p>Booking volume counts requests with a session in the period, including rejected and cancelled submissions. Peak hours count confirmed booked time by campus hour.</p>
        <p>When a unit is marked offline, previously confirmed hours on that unit count toward both capacity and usage.</p>
        <p>The forecast averages requests from the same weekday across the previous four complete weeks. It estimates demand and does not reserve resources.</p>
      </Card>
    </div>
  </div>;
}

function Bars({ title, data, percent }: { title: string; data: { label: string; value: number }[]; percent?: boolean }) {
  const max = percent ? 100 : Math.max(1, ...data.map((item) => item.value));
  return <Card className="space-y-4 p-5"><h2 className="text-lg font-semibold">{title}</h2>
    {data.length ? <ul className="space-y-3">{data.map((item) => <li key={item.label} className="space-y-1">
      <div className="flex justify-between gap-2 text-sm text-quiet"><span>{item.label}</span><span>{Number(item.value.toFixed(1))}{percent ? "%" : ""}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-soft" aria-hidden="true"><div className="h-full rounded-sm bg-accent" style={{ width: `${100 * item.value / max}%` }} /></div>
    </li>)}</ul> : <p className="text-sm text-quiet">No data in this period.</p>}
  </Card>;
}

function DemandHeatmap({ data }: { data: number[][] }) {
  const hours = Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => data.some((day) => day[hour] > 0));
  const max = Math.max(1, ...data.flat());
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return <Card className="space-y-3 p-5">
    <h2 className="text-lg font-semibold">Booked time by weekday</h2>
    {hours.length ? <div className="overflow-x-auto"><table className="w-full border-separate border-spacing-1 text-center text-xs">
      <caption className="pb-2 text-left text-sm text-quiet">Occupied unit-hours by campus hour (IST)</caption>
      <thead><tr><th scope="col" className="px-2 text-left">Day</th>{hours.map((hour) => <th scope="col" key={hour} className="px-2 py-1">{hour}:00</th>)}</tr></thead>
      <tbody>{data.map((row, index) => <tr key={days[index]}><th scope="row" className="px-2 text-left">{days[index]}</th>
        {hours.map((hour) => <td key={hour} className="rounded px-2 py-1 tabular-nums text-ink"
          style={{ backgroundColor: `color-mix(in srgb, var(--cyan) ${15 + 85 * row[hour] / max}%, white)` }}>{Number(row[hour].toFixed(1))}</td>)}</tr>)}</tbody>
    </table></div> : <p className="text-sm text-quiet">No booked time in this period.</p>}
  </Card>;
}

function Trend({ title, data, percent }: { title: string; data: { date: string; value: number }[]; percent?: boolean }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return <Card className="space-y-4 p-5">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="flex items-stretch gap-2" aria-hidden="true">
      <div className="flex flex-col justify-between pb-0.5 text-[11px] text-quiet tabular-nums"><span>{Number(max.toFixed(1))}{percent ? "%" : ""}</span><span>0</span></div>
      <div className="chart-grid flex h-32 min-w-0 flex-1 items-end gap-1 border-b border-line px-1">
      {data.map((item) => <div key={item.date} title={`${formatDay(item.date)} · ${item.value.toFixed(1)}${percent ? "%" : ""}`}
        className={`min-w-0 flex-1 rounded-t-sm ${percent ? "bg-accent" : "bg-[#4f8590]"}`}
        style={{ height: `${item.value / max * 100}%` }} />)}
    </div>
    </div>
    <div className="flex justify-between text-xs text-quiet tabular-nums"><span>{formatDay(data[0].date)}</span><span>{formatDay(data.at(-1)!.date)}</span></div>
    <details className="text-sm text-quiet"><summary className="cursor-pointer">View daily values</summary>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">{data.map((item) => <li key={item.date}>{formatDay(item.date)} · {Number(item.value.toFixed(1))}{percent ? "%" : ""}</li>)}</ul>
    </details>
  </Card>;
}
