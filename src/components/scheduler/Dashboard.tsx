import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bus, SchedulerConfig, ScheduleResult, Trip } from "@/lib/scheduler/types";
import { DEFAULT_BUSES, DEFAULT_CONFIG } from "@/lib/scheduler/defaults";
import { generateSchedule } from "@/lib/scheduler/engine";
import { fetchBuses, fetchConfig, saveBus, saveConfig } from "@/lib/data-service";
import { format12, parseHM, parseEnd } from "@/lib/scheduler/time";
import { LiveMap } from "@/components/scheduler/LiveMap";
import { FleetManager } from "@/components/fleet/FleetManager";
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
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Bus as BusIcon,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Edit,
  Flame,
  Moon,
  Play,
  Plus,
  Printer,
  Route,
  Settings,
  Snowflake,
  Sun,
  Timer,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeProvider } from "@/hooks/use-theme";

type DaySchedule = {
  day: number;
  result: ScheduleResult;
  initialQueue: string[]; // queue order used to start this day
};

/* ── Dashboard ───────────────────────────────────────────────────── */

export function Dashboard() {
  const isMobile = useIsMobile();
  const [config, setConfig] = useState<SchedulerConfig>(DEFAULT_CONFIG);
  const [buses, setBuses] = useState<Bus[]>(DEFAULT_BUSES);
  const [hydrated, setHydrated] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  /* ── multi-day state ─── */
  const [days, setDays] = useState<DaySchedule[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [activeTab, setActiveTab] = useState("schedule");

  /* ── real-time clock ── */
  const [wallClock, setWallClock] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setWallClock(d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60);
      setNow(d);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch real data from Supabase instead of localStorage
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const configSuccess = await saveConfig(config);
      if (!configSuccess) throw new Error("Failed to save config to Supabase");

      const busResults = await Promise.all(buses.map((b) => saveBus(b)));
      if (busResults.some((r) => !r)) throw new Error("Failed to save some buses to Supabase");

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("Saved configuration and buses to Supabase");
      handleGenerate();
    },
    onError: (err) => {
      toast.error("Save failed", { description: err.message });
    },
  });

  const { data: dbBuses, isLoading: busesLoading } = useQuery({
    queryKey: ["buses"],
    queryFn: fetchBuses,
  });

  const { data: dbConfig, isLoading: configLoading } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  // hydrate from persistence and DB and generate Day 1 automatically
  useEffect(() => {
    if (busesLoading || configLoading) return;

    const activeBuses = dbBuses !== null ? dbBuses : DEFAULT_BUSES;
    const activeConfig = dbConfig || DEFAULT_CONFIG;

    setConfig(activeConfig);
    setBuses(activeBuses);

    // Always generate Day 1 on load
    const day1Result = generateSchedule(activeConfig, activeBuses);
    const day1: DaySchedule = {
      day: 1,
      result: day1Result,
      initialQueue: activeBuses.filter((b) => b.active).map((b) => b.id),
    };
    setDays([day1]);
    setCurrentDay(1);
    setHydrated(true);
  }, [dbBuses, dbConfig, busesLoading, configLoading]);

  // persist on change
  useEffect(() => {
    if (!hydrated) return;
    // Removed saving days to localStorage so that a fresh schedule is generated next time.
  }, [days, hydrated]);

  // Current day's schedule result (with overrides applied and propagated)
  const result: ScheduleResult = useMemo(() => {
    // Convert overrides from 0-indexed to 1-indexed (tripNumber)
    const engineOverrides: Record<number, string> = {};
    Object.entries(overrides).forEach(([idx, busId]) => {
      engineOverrides[parseInt(idx) + 1] = busId;
    });

    const daySchedule = days.find((d) => d.day === currentDay);

    // Carry queue from previous day if available
    let initialQueue: string[] | undefined;
    if (currentDay > 1) {
      const prevDay = days.find((d) => d.day === currentDay - 1);
      initialQueue = prevDay?.result.finalQueue;
    } else {
      initialQueue = daySchedule?.initialQueue;
    }

    // Always generate with current overrides to propagate changes
    return generateSchedule(config, buses, initialQueue, engineOverrides);
  }, [days, currentDay, config, buses, overrides]);

  /* ── generate schedule for current day ─── */
  const handleGenerate = useCallback(() => {
    // Determine initial queue: if generating for day > 1, carry from previous day
    let initialQueue: string[] | undefined;
    if (currentDay > 1) {
      const prevDay = days.find((d) => d.day === currentDay - 1);
      if (prevDay) {
        initialQueue = prevDay.result.finalQueue;
      }
    }

    const newResult = generateSchedule(config, buses, initialQueue);
    const newDay: DaySchedule = {
      day: currentDay,
      result: newResult,
      initialQueue: initialQueue ?? buses.filter((b) => b.active).map((b) => b.id),
    };

    setDays((prev) => {
      // Replace if this day exists, otherwise append
      const existing = prev.findIndex((d) => d.day === currentDay);
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = newDay;
        // Remove any future days since config may have changed
        return copy.filter((d) => d.day <= currentDay);
      }
      return [...prev, newDay];
    });
    setOverrides({});
    setActiveTab("schedule");
    toast.success(`Day ${currentDay} schedule generated`, {
      description: `${newResult.completedTurns} turns scheduled for ${config.routeName}.${initialQueue ? " Queue carried from Day " + (currentDay - 1) + "." : ""}`,
    });
  }, [config, buses, currentDay, days]);

  /* ── next day ─── */
  const handleNextDay = useCallback(() => {
    const nextDayNum = currentDay + 1;
    const prevDayResult = days.find((d) => d.day === currentDay);
    const prevQueue = prevDayResult?.result.finalQueue;

    if (!prevQueue) {
      toast.error("Generate the current day first", {
        description: `Day ${currentDay} must be generated before moving to Day ${nextDayNum}.`,
      });
      return;
    }

    const newResult = generateSchedule(config, buses, prevQueue);
    const newDay: DaySchedule = {
      day: nextDayNum,
      result: newResult,
      initialQueue: prevQueue,
    };

    setDays((prev) => {
      const existing = prev.findIndex((d) => d.day === nextDayNum);
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = newDay;
        return copy;
      }
      return [...prev, newDay];
    });
    setCurrentDay(nextDayNum);
    setOverrides({});
    setActiveTab("schedule");
    toast.success(`Day ${nextDayNum} schedule generated`, {
      description: `Queue carried from Day ${currentDay}. Starting bus: ${prevQueue[0]}.`,
    });
  }, [config, buses, currentDay, days]);

  /* ── filters ─── */
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "peak" | "off-peak">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "assigned" | "missed">("all");

  /* ── sorting ─── */
  type SortKey =
    | "tripNumber"
    | "departureMin"
    | "period"
    | "busId"
    | "tripDurationMin"
    | "busTotalTurns";
  const [sortKey, setSortKey] = useState<SortKey>("tripNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredTrips = useMemo(() => {
    let trips = result.trips.filter((t) => {
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

    // sort
    trips = [...trips].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "tripNumber":
          cmp = a.tripNumber - b.tripNumber;
          break;
        case "departureMin":
          cmp = a.departureMin - b.departureMin;
          break;
        case "period":
          cmp = a.period.localeCompare(b.period);
          break;
        case "busId":
          cmp = (a.busId ?? "").localeCompare(b.busId ?? "");
          break;
        case "tripDurationMin":
          cmp = a.tripDurationMin - b.tripDurationMin;
          break;
        case "busTotalTurns":
          cmp = (a.busTotalTurns ?? 0) - (b.busTotalTurns ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return trips;
  }, [result.trips, search, periodFilter, statusFilter, sortKey, sortDir]);

  /* ── analytics ─── */
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
  const avgTurns = usedBuses > 0 ? (result.completedTurns / usedBuses).toFixed(1) : "0";

  /* ── real-time metrics ── */
  const nextTrip = useMemo(() => {
    return result.trips.find((t) => t.departureMin > wallClock && !t.missed);
  }, [result.trips, wallClock]);

  const completedTurnsCount = useMemo(() => {
    return result.trips.filter((t) => !t.missed && t.departureMin + t.tripDurationMin <= wallClock)
      .length;
  }, [result.trips, wallClock]);

  const busesRunningToday = useMemo(() => {
    return new Set(result.trips.filter((t) => !t.missed && t.busId).map((t) => t.busId)).size;
  }, [result.trips]);

  const topPerformer = useMemo(() => {
    const counts: Record<string, number> = {};
    result.trips.forEach((t) => {
      if (t.busId) counts[t.busId] = (counts[t.busId] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (entries.length === 0) return { id: "—", count: 0 };
    const max = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
    return { id: max[0], count: max[1] };
  }, [result.trips]);

  /* ── current day info ─── */
  const startingQueue = useMemo(() => {
    const current = days.find((d) => d.day === currentDay);
    if (current) return current.initialQueue;
    if (currentDay > 1) {
      const prev = days.find((d) => d.day === currentDay - 1);
      return prev?.result.finalQueue;
    }
    return buses.filter((b) => b.active).map((b) => b.id);
  }, [days, currentDay, buses]);

  const currentDayName = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (currentDay - 1));
    return d.toLocaleDateString([], { weekday: "long" });
  }, [currentDay]);

  /* ── CSV export ─── */
  const exportCSV = () => {
    const header = [
      "Day",
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
      currentDay,
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
    a.download = `schedule-day${currentDay}-${config.routeName.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully", {
      description: `Day ${currentDay}: ${result.trips.length} trips exported.`,
    });
  };

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* ══ HEADER ══ */}
      <div className="bg-grid border-b border-border print:bg-white print:border-gray-200">
        <div className="mx-auto max-w-[1400px] px-6 py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shrink-0">
                <BusIcon className="h-9 w-9" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold font-sans tracking-tight leading-none">
                  Route Runner
                </h1>
                <p className="text-[10px] md:text-xs font-bold text-primary/70 uppercase tracking-[0.2em] mt-1">
                  by TrackiGo
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Route className="h-4 w-4" />
                    <span className="font-medium">{config.routeName}</span>
                  </div>
                  <span className="hidden md:inline text-white/20">•</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>
                      {config.startTime} — {config.endTime === "00:00" ? "24:00" : config.endTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Big Clock Display */}
            <div className="flex flex-col items-center md:items-end text-center md:text-right bg-primary/5 md:bg-transparent p-4 md:p-0 rounded-2xl w-full md:w-auto border border-primary/10 md:border-none">
              <div className="text-4xl md:text-4xl lg:text-5xl font-black tracking-tighter text-primary">
                {now.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mt-1">
                {now.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* ── KPI Strip ── */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPI
              label="Next Departure"
              tone="info"
              className="lg:col-span-2 py-6"
              value={
                nextTrip ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-black">{nextTrip.departureLabel}</span>
                      <Badge variant="outline" className="mb-1 border-primary/30 text-primary">
                        Trip #{nextTrip.tripNumber}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <span>
                          Bus: <span className="font-bold">{nextTrip.busId}</span>
                        </span>
                      </div>
                      {buses.find((b) => b.id === nextTrip.busId)?.driver && (
                        <div className="text-muted-foreground">
                          Driver:{" "}
                          <span className="text-foreground">
                            {buses.find((b) => b.id === nextTrip.busId)?.driver}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <span>{config.routeName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 border-l pl-4">
                        <span>In {Math.floor(nextTrip.departureMin - wallClock)} mins</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  "No more trips today"
                )
              }
            />
            <KPI
              label="Turns Completed"
              tone="success"
              className="lg:col-span-2 py-6"
              value={
                <div className="flex flex-col gap-2">
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black">{completedTurnsCount}</span>
                    <span className="mb-1 text-lg font-bold text-muted-foreground">
                      / {result.trips.length} turns
                    </span>
                    <Badge variant="secondary" className="mb-1 ml-auto">
                      {Math.round((completedTurnsCount / result.trips.length) * 100)}% Complete
                    </Badge>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-success transition-all duration-500"
                      style={{ width: `${(completedTurnsCount / result.trips.length) * 100}%` }}
                    />
                  </div>
                </div>
              }
            />
            <KPI
              label="Peak Intensity"
              value={`${result.trips.filter((t) => t.period === "peak").length}`}
            />
            <KPI
              label="Active Fleet"
              value={`${buses.filter((b) => b.active).length}/${buses.length}`}
            />
            <KPI
              label="Service Hours"
              value={`${(Math.abs(parseEnd(config.endTime) - parseHM(config.startTime)) / 60).toFixed(1)}h`}
            />
            <KPI label="Top Performer" value={`${topPerformer.id} (${topPerformer.count} turns)`} />
          </div>

          {/* ── Configuration Summary Tiles ── */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
            <KPI
              label="Service Window"
              value={`${config.startTime} — ${config.endTime === "00:00" ? "24:00" : config.endTime}`}
              className="py-4"
            />
            <KPI
              label="Intervals (Peak/Off)"
              value={
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {config.peakIntervalMin}m
                  </span>
                  <span className="text-muted-foreground text-sm">/</span>
                  <span className="text-xl font-bold">{config.offPeakIntervalMin}m</span>
                </div>
              }
              className="py-4"
            />
            <KPI
              label="Durations (Peak/Off)"
              value={
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {config.peakTurnMin}m
                  </span>
                  <span className="text-muted-foreground text-sm">/</span>
                  <span className="text-xl font-bold">{config.offPeakTurnMin}m</span>
                </div>
              }
              className="py-4"
            />
            <KPI
              label="Peak Windows"
              value={
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {config.peakWindows.map((pw, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[10px] font-bold h-6 bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      {pw.start}-{pw.end}
                    </Badge>
                  ))}
                </div>
              }
              className="py-4"
            />
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 flex w-full h-auto gap-1 overflow-x-auto overflow-y-hidden p-1 bg-muted/50 rounded-xl no-scrollbar print:hidden">
            <TabsTrigger value="schedule" className="shrink-0 min-w-[100px]">
              Schedule
            </TabsTrigger>
            <TabsTrigger value="live" className="shrink-0 min-w-[100px]">
              Live Map
            </TabsTrigger>
            <TabsTrigger value="buses" className="shrink-0 min-w-[100px]">
              Buses &amp; Queue
            </TabsTrigger>
            <TabsTrigger value="analytics" className="shrink-0 min-w-[100px]">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="logic" className="shrink-0 min-w-[100px]">
              Logic Flow
            </TabsTrigger>
            <TabsTrigger value="fleet" className="shrink-0 min-w-[100px]">
              Fleet
            </TabsTrigger>
            <TabsTrigger value="setup" className="shrink-0 min-w-[100px]">
              Setup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            <LiveMap result={result} buses={buses} config={config} />
          </TabsContent>

          {/* ── SCHEDULE TAB ── */}
          <TabsContent value="schedule" className="space-y-4">
            {/* Queue carry-over info banner */}
            {currentDay > 1 && startingQueue && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <strong>{currentDayName}</strong> — Queue carried from previous session. Starting
                  order: {startingQueue.slice(0, 5).join(" → ")}
                  {startingQueue.length > 5 ? " → …" : ""}
                </div>
              </div>
            )}
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle>Daily Schedule</CardTitle>
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <Input
                    placeholder="Search bus / time / trip…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-56"
                    id="schedule-search"
                  />
                  <Select
                    value={periodFilter}
                    onValueChange={(v) => setPeriodFilter(v as typeof periodFilter)}
                  >
                    <SelectTrigger className="w-36" id="period-filter">
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
                    <SelectTrigger className="w-36" id="status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 border-l pl-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportCSV}
                      id="export-csv-table-btn"
                    >
                      <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                      id="print-table-btn"
                    >
                      <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 md:p-6">
                <ScheduleTable
                  trips={filteredTrips}
                  buses={buses}
                  overrides={overrides}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  onReassign={(tripIdx, newBus) => {
                    setOverrides((o) => {
                      const newOverrides = { ...o };
                      if (newBus === "__clear__") {
                        delete newOverrides[tripIdx];
                        toast.info("Override cleared", {
                          description: `Trip #${tripIdx + 1} reverted to auto-schedule.`,
                        });
                      } else {
                        newOverrides[tripIdx] = newBus;
                        toast.info("Trip reassigned", {
                          description: `Trip #${tripIdx + 1} manually assigned to ${newBus}.`,
                        });
                      }
                      return newOverrides;
                    });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── BUSES & QUEUE TAB ── */}
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
                          i === 0 ? "border-primary/40 bg-primary/5" : "border-border bg-card"
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

          {/* ── ANALYTICS TAB ── */}
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
                      <Bar dataKey="turns" fill="var(--primary)" radius={[6, 6, 0, 0]} />
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

          {/* ── LOGIC FLOW TAB ── */}
          <TabsContent value="logic">
            <FlowChart />
          </TabsContent>

          <TabsContent value="fleet">
            <FleetManager isEmbedded />
          </TabsContent>

          {/* ── SETUP TAB ── */}
          <TabsContent value="setup" className="space-y-4">
            <SetupPanel
              config={config}
              setConfig={setConfig}
              onSave={() => saveMutation.mutate()}
              isSaving={saveMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════════════ */

function KPI({
  icon,
  label,
  value,
  tone = "default",
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "warning" | "info";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "border-border",
    success: "border-success/40 bg-success/5",
    warning: "border-warning/40 bg-warning/5",
    info: "border-primary/40 bg-primary/5",
  };
  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md ${tones[tone]} ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
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

/* ── Sortable Schedule Table ─────────────────────────────────────── */

type SortKey =
  | "tripNumber"
  | "departureMin"
  | "period"
  | "busId"
  | "tripDurationMin"
  | "busTotalTurns";

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}) {
  if (col !== sortKey) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return sortDir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3 text-primary" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3 text-primary" />
  );
}

function ScheduleTable({
  trips,
  buses,
  overrides,
  sortKey,
  sortDir,
  onSort,
  onReassign,
}: {
  trips: Trip[];
  buses: Bus[];
  overrides: Record<number, string>;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onReassign: (idx: number, newBus: string) => void;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        {trips.map((t) => {
          const isOverridden = overrides[t.tripNumber - 1] !== undefined;
          return (
            <div
              key={t.tripNumber}
              className={`rounded-2xl border bg-card p-4 shadow-sm ${
                t.period === "peak" ? "border-peak/20 bg-peak/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">#{t.tripNumber}</span>
                  <span className="text-lg font-bold">{t.departureLabel}</span>
                </div>
                {t.period === "peak" ? (
                  <Badge className="border-peak/40 bg-peak/15 text-peak-foreground">
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
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Assigned Bus
                  </p>
                  <p className="font-bold">{t.busId || "—"}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Status
                  </p>
                  {t.missed ? (
                    <Badge variant="destructive" className="h-5">
                      Missed
                    </Badge>
                  ) : (
                    <Badge className="h-5 bg-success/20 text-success-foreground">Assigned</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Next Available
                  </p>
                  <p className="font-mono text-sm">{t.nextAvailableLabel || "—"}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Bus Turns
                  </p>
                  <p className="text-sm">{t.busTotalTurns ?? "—"}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground italic">Manual Override</p>
                <Select
                  value={overrides[t.tripNumber - 1] ?? ""}
                  onValueChange={(v) => onReassign(t.tripNumber - 1, v)}
                >
                  <SelectTrigger
                    className={`h-9 w-32 px-3 text-xs rounded-xl ${isOverridden ? "border-primary bg-primary/5 text-primary font-bold" : ""}`}
                  >
                    <SelectValue placeholder="Override" />
                    {isOverridden ? (
                      <span className="ml-auto">{overrides[t.tripNumber - 1]}</span>
                    ) : (
                      <Edit className="ml-auto h-3 w-3 opacity-50" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__" className="text-muted-foreground italic">
                      Default (Auto)
                    </SelectItem>
                    {buses
                      .filter((b) => b.active)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
        {trips.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No trips match the current filters.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead
              className="w-12 cursor-pointer select-none"
              onClick={() => onSort("tripNumber")}
            >
              # <SortIcon col="tripNumber" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => onSort("departureMin")}
            >
              Departure <SortIcon col="departureMin" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => onSort("period")}>
              Period <SortIcon col="period" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => onSort("busId")}>
              Bus <SortIcon col="busId" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => onSort("tripDurationMin")}
            >
              Duration <SortIcon col="tripDurationMin" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead>Next Available</TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => onSort("busTotalTurns")}
            >
              Bus Turns <SortIcon col="busTotalTurns" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="print:hidden text-center">Override</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trips.map((t) => {
            const isOverridden = overrides[t.tripNumber - 1] !== undefined;
            return (
              <TableRow key={t.tripNumber} className={t.period === "peak" ? "bg-peak/5" : ""}>
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
                <TableCell className="font-mono text-sm">{t.nextAvailableLabel ?? "—"}</TableCell>
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
                <TableCell className="print:hidden text-center">
                  <Select
                    value={overrides[t.tripNumber - 1] ?? ""}
                    onValueChange={(v) => onReassign(t.tripNumber - 1, v)}
                  >
                    <SelectTrigger
                      className={`mx-auto h-8 w-auto min-w-[32px] px-2 text-xs border-none bg-transparent hover:bg-accent ${isOverridden ? "text-primary font-bold" : "text-muted-foreground"}`}
                    >
                      {isOverridden ? (
                        <span>{overrides[t.tripNumber - 1]}</span>
                      ) : (
                        <Edit className="h-4 w-4" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__" className="text-muted-foreground italic">
                        Default (Auto)
                      </SelectItem>
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
            );
          })}
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

/* ── Timeline ────────────────────────────────────────────────────── */

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
          const s =
            (parseInt(w.start.split(":")[0]) * 60 + parseInt(w.start.split(":")[1]) - startMin) /
            span;
          const e =
            (parseInt(w.end.split(":")[0]) * 60 + parseInt(w.end.split(":")[1]) - startMin) / span;
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

/* ── Enhanced FlowChart ──────────────────────────────────────────── */

function FlowChart() {
  const steps = [
    {
      label: "Start Day",
      desc: "Initialize all active buses and set queue order",
      color: "var(--primary)",
    },
    {
      label: "Set Time Slot",
      desc: "Begin at operational start time (04:30)",
      color: "var(--primary)",
    },
    {
      label: "Determine Period",
      desc: "Check if slot falls within peak windows",
      color: "var(--peak)",
    },
    {
      label: "Set Interval & Duration",
      desc: "Peak: 5m / 60m | Off-peak: 15m / 90m",
      color: "var(--peak)",
    },
    { label: "Scan Queue", desc: "Check buses from front of queue", color: "var(--primary)" },
    {
      label: "Bus Available?",
      desc: "Is next-available ≤ departure time?",
      color: "var(--warning)",
      decision: true,
    },
    {
      label: "Assign Trip",
      desc: "Update next-available and increment turn count",
      color: "var(--success)",
    },
    { label: "Move to Back", desc: "Move assigned bus to back of queue", color: "var(--success)" },
    {
      label: "Check Limits",
      desc: "Operational hours ended?",
      color: "var(--destructive)",
      decision: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-4 w-4" /> Scheduling Decision Flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Connected visual flow */}
        <div className="relative">
          {/* SVG connector lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none hidden md:block"
            viewBox="0 0 900 600"
            preserveAspectRatio="none"
            style={{ zIndex: 0 }}
          >
            {steps.map((_, i) => {
              if (i >= steps.length - 1) return null;
              const cols = 3;
              const row1 = Math.floor(i / cols);
              const col1 = i % cols;
              const row2 = Math.floor((i + 1) / cols);
              const col2 = (i + 1) % cols;

              // Grid size for viewBox (900 x 600)
              const x1 = col1 * 300 + 150;
              const x2 = col2 * 300 + 150;
              const y1 = row1 * 160 + 80;
              const y2 = row2 * 160 + 80;

              if (row1 === row2) {
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.4"
                  />
                );
              } else {
                return (
                  <path
                    key={i}
                    d={`M ${x1} ${y1 + 50} L ${x1} ${y1 + 65} L ${x2} ${y2 - 45} L ${x2} ${y2 - 30}`}
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    fill="none"
                    opacity="0.4"
                  />
                );
              }
            })}
          </svg>

          <div className="relative grid gap-5 md:grid-cols-3" style={{ zIndex: 1 }}>
            {steps.map((s, i) => (
              <div
                key={i}
                className={`rounded-xl border-2 bg-card p-5 shadow-sm transition-all hover:shadow-md ${
                  s.decision ? "border-dashed" : "border-solid"
                }`}
                style={{ borderColor: `color-mix(in oklab, ${s.color} 40%, transparent)` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                    style={{ background: s.color }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">{s.label}</h3>
                    {s.decision && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        Decision
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="mt-3 flex justify-end md:hidden">
                    <ArrowRight className="h-4 w-4 text-muted-foreground animate-pulse" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Loop-back indicator */}
        <div className="mt-6 flex items-center gap-3 rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <ArrowRight className="h-4 w-4 rotate-180" />
          </div>
          <div className="text-sm text-muted-foreground">
            <strong className="text-foreground">Loop back to step 2</strong> — advance slot by
            interval and repeat until operational hours end.
          </div>
        </div>

        {/* Fairness rule */}
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Fairness rule:</strong> The algorithm always respects
          queue turn order. It does <em>not</em> pick the globally earliest available bus — it picks
          the first bus in queue order whose next-available time has passed. Unavailable buses are
          skipped temporarily but keep their queue position.
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Setup Panel ─────────────────────────────────────────────────── */

function SetupPanel({
  config,
  setConfig,
  onSave,
  isSaving,
}: {
  config: SchedulerConfig;
  setConfig: (c: SchedulerConfig) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <h3 className="font-semibold text-lg">Save Changes to Database</h3>
          <p className="text-sm text-muted-foreground">
            Click save to persist your local setup to Supabase.
          </p>
        </div>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save & Generate Schedule"}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Route &amp; Schedule Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Route name">
              <Input
                value={config.routeName}
                onChange={(e) => setConfig({ ...config, routeName: e.target.value })}
                id="config-route-name"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Start time">
                <Input
                  type="time"
                  value={config.startTime}
                  onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                  id="config-start-time"
                />
              </Field>
              <Field label="End time">
                <Input
                  type="time"
                  value={config.endTime}
                  onChange={(e) => setConfig({ ...config, endTime: e.target.value })}
                  id="config-end-time"
                />
              </Field>
            </div>
            {config.peakWindows.map((w, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Peak interval (min)">
                <Input
                  type="number"
                  min={1}
                  value={config.peakIntervalMin}
                  onChange={(e) =>
                    setConfig({ ...config, peakIntervalMin: Number(e.target.value) || 1 })
                  }
                  id="config-peak-interval"
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
                  id="config-offpeak-interval"
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
                  id="config-peak-turn"
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
                  id="config-offpeak-turn"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fleet Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage your bus fleet, drivers, and active status in the dedicated fleet management
              page.
            </p>
            <Link to="/fleet">
              <Button variant="outline" className="w-full">
                <BusIcon className="mr-2 h-4 w-4" /> Go to Fleet Management
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
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
