import { useEffect, useMemo, useState } from "react";
import { Bus, SchedulerConfig, Trip } from "@/lib/scheduler/types";
import { DEFAULT_BUSES, DEFAULT_CONFIG } from "@/lib/scheduler/defaults";
import { generateSchedule } from "@/lib/scheduler/engine";
import { format12 } from "@/lib/scheduler/time";
import { LiveMap } from "@/components/scheduler/LiveMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bus as BusIcon,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Play,
  Plus,
  Route,
  Snowflake,
  Trash2,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

const STORAGE = "bus-turn-scheduler-v1";

type Persisted = { config: SchedulerConfig; buses: Bus[] };

function load(): Persisted {
  if (typeof window === "undefined") return { config: DEFAULT_CONFIG, buses: DEFAULT_BUSES };
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return { config: DEFAULT_CONFIG, buses: DEFAULT_BUSES };
    const p = JSON.parse(raw) as Persisted;
    return { config: { ...DEFAULT_CONFIG, ...p.config }, buses: p.buses ?? DEFAULT_BUSES };
  } catch {
    return { config: DEFAULT_CONFIG, buses: DEFAULT_BUSES };
  }
}

export function Dashboard() {
  const [config, setConfig] = useState<SchedulerConfig>(DEFAULT_CONFIG);
  const [buses, setBuses] = useState<Bus[]>(DEFAULT_BUSES);
  const [hydrated, setHydrated] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  useEffect(() => {
    const p = load();
    setConfig(p.config);
    setBuses(p.buses);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE, JSON.stringify({ config, buses }));
  }, [config, buses, hydrated]);

  const result = useMemo(() => {
    const base = generateSchedule(config, buses);
    const trips = base.trips.map((t) => {
      if (overrides[t.tripNumber - 1]) {
        return { ...t, busId: overrides[t.tripNumber - 1], missed: false };
      }
      return t;
    });
    return { ...base, trips };
  }, [config, buses, overrides]);

  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "peak" | "off-peak">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "assigned" | "missed">("all");

  const filteredTrips = useMemo(() => {
    return result.trips.filter((t) => {
      if (periodFilter !== "all" && t.period !== periodFilter) return false;
      if (statusFilter === "assigned" && t.missed) return false;
      if (statusFilter === "missed" && !t.missed) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(
            t.busId?.toLowerCase().includes(q) ||
            t.departureLabel.toLowerCase().includes(q) ||
            String(t.tripNumber).includes(q)
          )
        )
          return false;
      }
      return true;
    });
  }, [result.trips, search, periodFilter, statusFilter]);

  const turnsPerBus = useMemo(
    () =>
      result.finalBusStates
        .map((s) => ({ bus: s.id, turns: s.totalTurns }))
        .sort((a, b) => Number(a.bus.replace(/\D/g, "")) - Number(b.bus.replace(/\D/g, ""))),
    [result],
  );

  const busiest = [...result.finalBusStates].sort((a, b) => b.totalTurns - a.totalTurns)[0];
  const least = [...result.finalBusStates]
    .filter((b) => b.totalTurns > 0)
    .sort((a, b) => a.totalTurns - b.totalTurns)[0];
  const usedBuses = result.finalBusStates.filter((b) => b.totalTurns > 0).length;
  const avgTurns =
    usedBuses > 0
      ? (result.completedTurns / usedBuses).toFixed(1)
      : "0";

  const exportCSV = () => {
    const header = [
      "Trip",
      "Departure",
      "Period",
      "Bus",
      "Duration (min)",
      "Next Available",
      "Bus Total Turns",
      "Status",
    ];
    const rows = result.trips.map((t) => [
      t.tripNumber,
      t.departureLabel,
      t.period,
      t.busId ?? "—",
      t.tripDurationMin,
      t.nextAvailableLabel ?? "—",
      t.busTotalTurns ?? "—",
      t.missed ? "MISSED" : "ASSIGNED",
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-${config.routeName.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-grid border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                <BusIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Bus Turn Scheduler</h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Route className="h-4 w-4" />
                  <span className="font-medium">{config.routeName}</span>
                  <span>•</span>
                  <Clock className="h-4 w-4" />
                  <span>
                    {config.startTime} → {config.endTime === "00:00" ? "24:00" : config.endTime}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              <Button onClick={() => window.print()} variant="outline">
                Print
              </Button>
              <Button onClick={() => setBuses([...buses])}>
                <Play className="mr-2 h-4 w-4" /> Regenerate
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KPI
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Turns Completed"
              value={`${result.completedTurns}/${config.requiredTurns}`}
              tone="success"
            />
            <KPI
              icon={<TrendingUp className="h-4 w-4" />}
              label="Remaining"
              value={String(Math.max(0, config.requiredTurns - result.completedTurns))}
            />
            <KPI
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Missed Slots"
              value={String(result.missedCount)}
              tone={result.missedCount > 0 ? "warning" : "default"}
            />
            <KPI
              icon={<Users className="h-4 w-4" />}
              label="Buses Used"
              value={`${usedBuses}/${buses.filter((b) => b.active).length}`}
            />
            <KPI
              icon={<Activity className="h-4 w-4" />}
              label="Avg Turns / Bus"
              value={avgTurns}
            />
            <KPI
              icon={<Flame className="h-4 w-4" />}
              label="Busiest Bus"
              value={busiest ? `${busiest.id} (${busiest.totalTurns})` : "—"}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="live">Live Map</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="buses">Buses & Queue</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="logic">Logic Flow</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            <LiveMap result={result} buses={buses} config={config} />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle>Daily Schedule</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Search bus / time / trip…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-56"
                  />
                  <Select
                    value={periodFilter}
                    onValueChange={(v) => setPeriodFilter(v as typeof periodFilter)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All periods</SelectItem>
                      <SelectItem value="peak">Peak only</SelectItem>
                      <SelectItem value="off-peak">Off-peak only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ScheduleTable
                  trips={filteredTrips}
                  buses={buses}
                  onReassign={(tripIdx, newBus) => {
                    setOverrides((o) => ({ ...o, [tripIdx]: newBus }));
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="buses" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Bus Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {result.finalBusStates.map((s) => {
                      const bus = buses.find((b) => b.id === s.id);
                      const util =
                        result.completedTurns > 0
                          ? Math.round((s.totalTurns / result.completedTurns) * 100)
                          : 0;
                      return (
                        <div
                          key={s.id}
                          className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 font-bold text-primary">
                                {s.id}
                              </div>
                              <div>
                                <div className="font-semibold">{s.id}</div>
                                {bus?.driver && (
                                  <div className="text-xs text-muted-foreground">{bus.driver}</div>
                                )}
                              </div>
                            </div>
                            <Badge variant={s.totalTurns > 0 ? "default" : "secondary"}>
                              {s.totalTurns} turns
                            </Badge>
                          </div>
                          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Last assigned</span>
                              <span className="font-mono text-foreground">
                                {s.lastAssignedMin !== null ? format12(s.lastAssignedMin) : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Next available</span>
                              <span className="font-mono text-foreground">
                                {format12(s.nextAvailableMin)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-muted-foreground">Utilization</span>
                              <span className="font-medium">{util}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${util}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-4 w-4" /> Live Queue Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Order after the last assignment. Front of queue gets next turn.
                  </p>
                  <div className="flex flex-col gap-2">
                    {result.finalQueue.map((id, i) => (
                      <div
                        key={id}
                        className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                          i === 0
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-xs font-mono text-muted-foreground">
                            #{i + 1}
                          </span>
                          <span className="font-semibold">{id}</span>
                        </div>
                        {i === 0 && (
                          <Badge className="bg-primary text-primary-foreground">Next</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Turns per Bus</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={turnsPerBus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="bus" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      <Bar
                        dataKey="turns"
                        fill="var(--primary)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Schedule Timeline by Bus</CardTitle>
                </CardHeader>
                <CardContent>
                  <Timeline trips={result.trips} buses={buses} config={config} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                label="Busiest Bus"
                value={busiest ? `${busiest.id} • ${busiest.totalTurns} turns` : "—"}
                icon={<Flame className="h-4 w-4" />}
              />
              <InfoCard
                label="Least Used Bus"
                value={least ? `${least.id} • ${least.totalTurns} turns` : "—"}
                icon={<Snowflake className="h-4 w-4" />}
              />
              <InfoCard
                label="Average Turns"
                value={`${avgTurns} per active bus`}
                icon={<Activity className="h-4 w-4" />}
              />
            </div>
          </TabsContent>

          <TabsContent value="logic">
            <FlowChart />
          </TabsContent>

          <TabsContent value="setup" className="space-y-4">
            <SetupPanel
              config={config}
              setConfig={setConfig}
              buses={buses}
              setBuses={setBuses}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const tones: Record<string, string> = {
    default: "border-border",
    success: "border-success/40 bg-success/5",
    warning: "border-warning/40 bg-warning/5",
  };
  return (
    <div className={`rounded-xl border bg-card p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleTable({
  trips,
  buses,
  onReassign,
}: {
  trips: Trip[];
  buses: Bus[];
  onReassign: (idx: number, newBus: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Departure</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Bus</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Next Available</TableHead>
            <TableHead>Bus Turns</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Override</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trips.map((t) => (
            <TableRow
              key={t.tripNumber}
              className={t.period === "peak" ? "bg-peak/5" : ""}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">
                {t.tripNumber}
              </TableCell>
              <TableCell className="font-mono font-medium">{t.departureLabel}</TableCell>
              <TableCell>
                {t.period === "peak" ? (
                  <Badge className="border-peak/40 bg-peak/15 text-peak-foreground hover:bg-peak/20">
                    <Zap className="mr-1 h-3 w-3" /> Peak
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="border-offpeak/30 bg-offpeak/15 text-offpeak-foreground"
                  >
                    Off-peak
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {t.busId ? (
                  <span className="font-semibold">{t.busId}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{t.tripDurationMin}m</TableCell>
              <TableCell className="font-mono text-sm">
                {t.nextAvailableLabel ?? "—"}
              </TableCell>
              <TableCell>{t.busTotalTurns ?? "—"}</TableCell>
              <TableCell>
                {t.missed ? (
                  <Badge variant="destructive">Missed</Badge>
                ) : (
                  <Badge className="bg-success/20 text-success-foreground hover:bg-success/30">
                    Assigned
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Select
                  value={t.busId ?? ""}
                  onValueChange={(v) => onReassign(t.tripNumber - 1, v)}
                >
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {buses
                      .filter((b) => b.active)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
          {trips.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                No trips match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function Timeline({
  trips,
  buses,
  config,
}: {
  trips: Trip[];
  buses: Bus[];
  config: SchedulerConfig;
}) {
  const active = buses.filter((b) => b.active);
  const startMin = trips[0]?.departureMin ?? 270;
  const endMin = (trips[trips.length - 1]?.departureMin ?? 1440) + 60;
  const span = endMin - startMin;
  return (
    <div className="space-y-2">
      <div className="relative h-6">
        {config.peakWindows.map((w, i) => {
          const s = (parseInt(w.start.split(":")[0]) * 60 + parseInt(w.start.split(":")[1]) - startMin) / span;
          const e = (parseInt(w.end.split(":")[0]) * 60 + parseInt(w.end.split(":")[1]) - startMin) / span;
          return (
            <div
              key={i}
              className="absolute top-0 h-full rounded bg-peak/15 text-[10px] text-peak-foreground"
              style={{ left: `${Math.max(0, s) * 100}%`, width: `${Math.max(0, e - s) * 100}%` }}
            >
              <span className="px-1">Peak</span>
            </div>
          );
        })}
      </div>
      <div className="space-y-1.5">
        {active.map((bus) => (
          <div key={bus.id} className="flex items-center gap-2">
            <div className="w-10 text-xs font-semibold text-muted-foreground">{bus.id}</div>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted/40">
              {trips
                .filter((t) => t.busId === bus.id)
                .map((t) => {
                  const left = ((t.departureMin - startMin) / span) * 100;
                  const width = (t.tripDurationMin / span) * 100;
                  return (
                    <div
                      key={t.tripNumber}
                      title={`Trip ${t.tripNumber} • ${t.departureLabel}`}
                      className={`absolute top-0 h-full rounded ${
                        t.period === "peak" ? "bg-peak" : "bg-offpeak"
                      }`}
                      style={{ left: `${left}%`, width: `${Math.max(0.5, width)}%` }}
                    />
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowChart() {
  const steps = [
    { label: "Start of Day", desc: "Initialize all active buses, queue order fixed" },
    { label: "Set Time Slot", desc: "Begin at operational start time" },
    { label: "Determine Period", desc: "Check if slot falls in peak window" },
    { label: "Pick Interval & Duration", desc: "Peak: 5m / 60m   |   Off-peak: 15m / 90m" },
    { label: "Scan Queue From Front", desc: "Find first bus where next-available ≤ slot" },
    { label: "Assign Trip", desc: "Update next-available, increment turns" },
    { label: "Move Bus to Back", desc: "Preserve fairness via round-robin" },
    { label: "Advance Slot", desc: "slot += interval" },
    { label: "Check Stop Conditions", desc: "Stop when 44 turns done OR end of day" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-4 w-4" /> Scheduling Decision Flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={i}
              className="relative rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="font-semibold">{s.label}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground md:block" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Fairness rule:</strong> The algorithm always
          respects queue turn order. It does <em>not</em> pick the globally earliest available
          bus — it picks the first bus in queue order whose next-available time has passed.
          Unavailable buses are skipped temporarily but keep their queue position.
        </div>
      </CardContent>
    </Card>
  );
}

function SetupPanel({
  config,
  setConfig,
  buses,
  setBuses,
}: {
  config: SchedulerConfig;
  setConfig: (c: SchedulerConfig) => void;
  buses: Bus[];
  setBuses: (b: Bus[]) => void;
}) {
  const [newId, setNewId] = useState("");
  const [newDriver, setNewDriver] = useState("");

  const addBus = () => {
    const id = newId.trim();
    if (!id) return;
    if (buses.some((b) => b.id.toLowerCase() === id.toLowerCase())) return;
    setBuses([...buses, { id, active: true, driver: newDriver.trim() }]);
    setNewId("");
    setNewDriver("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Route & Schedule Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Route name">
            <Input
              value={config.routeName}
              onChange={(e) => setConfig({ ...config, routeName: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time">
              <Input
                type="time"
                value={config.startTime}
                onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
              />
            </Field>
            <Field label="End time">
              <Input
                type="time"
                value={config.endTime}
                onChange={(e) => setConfig({ ...config, endTime: e.target.value })}
              />
            </Field>
          </div>
          {config.peakWindows.map((w, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <Field label={`Peak ${i + 1} start`}>
                <Input
                  type="time"
                  value={w.start}
                  onChange={(e) => {
                    const pw = [...config.peakWindows];
                    pw[i] = { ...pw[i], start: e.target.value };
                    setConfig({ ...config, peakWindows: pw });
                  }}
                />
              </Field>
              <Field label={`Peak ${i + 1} end`}>
                <Input
                  type="time"
                  value={w.end}
                  onChange={(e) => {
                    const pw = [...config.peakWindows];
                    pw[i] = { ...pw[i], end: e.target.value };
                    setConfig({ ...config, peakWindows: pw });
                  }}
                />
              </Field>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peak interval (min)">
              <Input
                type="number"
                min={1}
                value={config.peakIntervalMin}
                onChange={(e) =>
                  setConfig({ ...config, peakIntervalMin: Number(e.target.value) || 1 })
                }
              />
            </Field>
            <Field label="Off-peak interval (min)">
              <Input
                type="number"
                min={1}
                value={config.offPeakIntervalMin}
                onChange={(e) =>
                  setConfig({ ...config, offPeakIntervalMin: Number(e.target.value) || 1 })
                }
              />
            </Field>
            <Field label="Peak turn duration (min)">
              <Input
                type="number"
                min={1}
                value={config.peakTurnMin}
                onChange={(e) =>
                  setConfig({ ...config, peakTurnMin: Number(e.target.value) || 1 })
                }
              />
            </Field>
            <Field label="Off-peak turn duration (min)">
              <Input
                type="number"
                min={1}
                value={config.offPeakTurnMin}
                onChange={(e) =>
                  setConfig({ ...config, offPeakTurnMin: Number(e.target.value) || 1 })
                }
              />
            </Field>
            <Field label="Required daily turns">
              <Input
                type="number"
                min={1}
                value={config.requiredTurns}
                onChange={(e) =>
                  setConfig({ ...config, requiredTurns: Number(e.target.value) || 1 })
                }
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fleet ({buses.length})</CardTitle>
          <Badge variant="secondary">
            {buses.filter((b) => b.active).length} active
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-2 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              placeholder="Bus ID (e.g. B15)"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
            />
            <Input
              placeholder="Driver (optional)"
              value={newDriver}
              onChange={(e) => setNewDriver(e.target.value)}
            />
            <Button onClick={addBus}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bus</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buses.map((b, i) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-semibold">{b.id}</TableCell>
                    <TableCell>
                      <Input
                        value={b.driver ?? ""}
                        onChange={(e) => {
                          const copy = [...buses];
                          copy[i] = { ...b, driver: e.target.value };
                          setBuses(copy);
                        }}
                        className="h-8"
                        placeholder="—"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={b.active}
                        onCheckedChange={(v) => {
                          const copy = [...buses];
                          copy[i] = { ...b, active: v };
                          setBuses(copy);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setBuses(buses.filter((x) => x.id !== b.id))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
