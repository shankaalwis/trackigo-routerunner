import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Bus, ScheduleResult, SchedulerConfig } from "@/lib/scheduler/types";
import { format12 } from "@/lib/scheduler/time";
import { MapPin, Pause, Play, RotateCcw, Bus as BusIcon, Gauge } from "lucide-react";

type Props = {
  result: ScheduleResult;
  buses: Bus[];
  config: SchedulerConfig;
};

type RunningBus = {
  busId: string;
  progress: number; // 0..1
  tripNumber: number;
  departureMin: number;
  arrivalMin: number;
};

function parseHM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export function LiveMap({ result, buses, config }: Props) {
  const startMin = parseHM(config.startTime);
  const endMin = config.endTime === "00:00" ? 1440 : parseHM(config.endTime);

  const [now, setNow] = useState(startMin);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(60); // simulated minutes per real second

  // Auto-advance simulation
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setNow((n) => {
        const next = n + speed / 10; // tick every 100ms
        if (next >= endMin) {
          return startMin;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, speed, startMin, endMin]);

  const assignedTrips = useMemo(
    () => result.trips.filter((t) => !t.missed && t.busId),
    [result.trips],
  );

  // Determine running buses at current sim time
  const running: RunningBus[] = useMemo(() => {
    const map = new Map<string, RunningBus>();
    for (const t of assignedTrips) {
      const arrival = t.departureMin + t.tripDurationMin;
      if (now >= t.departureMin && now < arrival && t.busId) {
        const progress = Math.min(1, Math.max(0, (now - t.departureMin) / t.tripDurationMin));
        // If multiple trips overlap for same bus (shouldn't, but safe), keep the latest
        map.set(t.busId, {
          busId: t.busId,
          progress,
          tripNumber: t.tripNumber,
          departureMin: t.departureMin,
          arrivalMin: arrival,
        });
      }
    }
    return Array.from(map.values());
  }, [assignedTrips, now]);

  const runningSet = new Set(running.map((r) => r.busId));

  // Live queue derived by replaying assignments up to `now`
  const liveQueue = useMemo(() => {
    const active = buses.filter((b) => b.active);
    let queue = active.map((b) => b.id);
    const nextAvail: Record<string, number> = {};
    active.forEach((b) => (nextAvail[b.id] = startMin));

    for (const t of assignedTrips) {
      if (t.departureMin > now) break;
      if (!t.busId) continue;
      const idx = queue.indexOf(t.busId);
      if (idx >= 0) {
        queue = [...queue.slice(0, idx), ...queue.slice(idx + 1), t.busId];
      }
      nextAvail[t.busId] = t.departureMin + t.tripDurationMin;
    }
    return { queue, nextAvail };
  }, [assignedTrips, buses, now, startMin]);

  // Cluster running buses by their X position to vertically offset overlapping markers
  const positioned = useMemo(() => {
    const sorted = [...running].sort((a, b) => a.progress - b.progress);
    const lanes: number[] = []; // last progress in each lane
    return sorted.map((r) => {
      let lane = 0;
      while (lane < lanes.length && r.progress - lanes[lane] < 0.06) lane++;
      lanes[lane] = r.progress;
      return { ...r, lane };
    });
  }, [running]);

  return (
    <div className="space-y-4">
      {/* Top control bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Simulation Time
              </div>
              <div className="font-mono text-2xl font-bold">{format12(Math.floor(now))}</div>
            </div>
            <div className="ml-4 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <BusIcon className="h-3 w-3" /> {running.length} running
              </Badge>
              <Badge variant="outline">
                {liveQueue.queue.length - running.length} queued
              </Badge>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3 sm:max-w-xl">
            <Button
              size="sm"
              variant={playing ? "secondary" : "default"}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? (
                <>
                  <Pause className="mr-1 h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="mr-1 h-4 w-4" /> Play
                </>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setNow(startMin)}>
              <RotateCcw className="mr-1 h-4 w-4" /> Reset
            </Button>
            <div className="flex-1">
              <Slider
                value={[now]}
                min={startMin}
                max={endMin}
                step={1}
                onValueChange={(v) => {
                  setPlaying(false);
                  setNow(v[0]);
                }}
              />
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xs text-muted-foreground">Speed</span>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value={15}>0.25×</option>
                <option value={30}>0.5×</option>
                <option value={60}>1×</option>
                <option value={180}>3×</option>
                <option value={600}>10×</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Route Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Route Map — {config.routeName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[360px] overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/30 to-muted/10 p-6">
              {/* Endpoint labels */}
              <div className="absolute left-6 top-6 text-xs">
                <div className="font-semibold">Kaduwela</div>
                <div className="text-muted-foreground">Origin</div>
              </div>
              <div className="absolute right-6 top-6 text-right text-xs">
                <div className="font-semibold">Colombo</div>
                <div className="text-muted-foreground">Destination</div>
              </div>

              {/* SVG Route */}
              <svg
                viewBox="0 0 1000 200"
                preserveAspectRatio="none"
                className="absolute inset-x-6 top-1/2 h-32 w-[calc(100%-3rem)] -translate-y-1/2"
              >
                {/* Road shadow */}
                <path
                  d="M 20 100 Q 250 30, 500 100 T 980 100"
                  stroke="var(--border)"
                  strokeWidth="22"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Road */}
                <path
                  d="M 20 100 Q 250 30, 500 100 T 980 100"
                  stroke="var(--primary)"
                  strokeOpacity="0.18"
                  strokeWidth="16"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Center dashed line */}
                <path
                  d="M 20 100 Q 250 30, 500 100 T 980 100"
                  stroke="var(--primary)"
                  strokeOpacity="0.55"
                  strokeWidth="2"
                  strokeDasharray="10 10"
                  fill="none"
                />
                {/* Endpoints */}
                <circle cx="20" cy="100" r="9" fill="var(--primary)" />
                <circle cx="980" cy="100" r="9" fill="var(--primary)" />
              </svg>

              {/* Bus markers */}
              <div className="absolute inset-x-6 top-1/2 h-32 -translate-y-1/2">
                {positioned.length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No buses currently on route at {format12(Math.floor(now))}
                  </div>
                )}
                {positioned.map((r) => {
                  // Approximate y on the curved path: y = 100 + sin-ish dip
                  // Path goes high in middle (~y=65), endpoints y=100. Use parabola.
                  const x = r.progress; // 0..1
                  const yCurve = 100 - 35 * 4 * x * (1 - x); // peak at x=0.5 → y=65
                  const leftPct = x * 100;
                  const topPx = (yCurve / 200) * 128 + r.lane * 28 - 18;
                  return (
                    <div
                      key={r.busId}
                      className="absolute -translate-x-1/2 transition-all duration-150"
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPx}px`,
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="rounded-full bg-success px-2 py-1 text-[10px] font-bold text-success-foreground shadow-md ring-2 ring-background">
                          <BusIcon className="mr-0.5 inline h-3 w-3" />
                          {r.busId}
                        </div>
                        <div className="h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-success" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress legend */}
              <div className="absolute inset-x-6 bottom-3 flex justify-between text-[10px] text-muted-foreground">
                <span>0 km</span>
                <span>~ midway</span>
                <span>~ end</span>
              </div>
            </div>

            {/* Running list */}
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                On Route ({running.length})
              </div>
              {running.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  All buses are currently at terminal / waiting in queue.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {running.map((r) => (
                    <div
                      key={r.busId}
                      className="flex items-center justify-between rounded-md border border-success/30 bg-success/5 px-3 py-2"
                    >
                      <div>
                        <div className="font-semibold">{r.busId}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Trip #{r.tripNumber} • dep {format12(r.departureMin)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono">{Math.round(r.progress * 100)}%</div>
                        <div className="text-[10px] text-muted-foreground">
                          ETA {format12(r.arrivalMin)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Queue */}
        <Card>
          <CardHeader>
            <CardTitle>Live Bus Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Front of queue gets the next departure. Running buses stay in queue position but
              are unavailable until they return.
            </p>
            <div className="flex max-h-[460px] flex-col gap-1.5 overflow-y-auto pr-1">
              {liveQueue.queue.map((id, i) => {
                const isRunning = runningSet.has(id);
                const next = liveQueue.nextAvail[id] ?? startMin;
                const ready = next <= now;
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 transition-colors ${
                      isRunning
                        ? "border-success/40 bg-success/10"
                        : ready
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 font-mono text-xs text-muted-foreground">
                        #{i + 1}
                      </span>
                      <span className="font-semibold">{id}</span>
                      {isRunning ? (
                        <Badge className="bg-success text-success-foreground hover:bg-success/90">
                          Running
                        </Badge>
                      ) : ready ? (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Waiting</Badge>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <div>next</div>
                      <div className="font-mono text-foreground">{format12(next)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
