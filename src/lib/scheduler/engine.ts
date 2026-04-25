import { Bus, BusState, ScheduleResult, SchedulerConfig, Trip } from "./types";
import { format12, parseEnd, parseHM } from "./time";

function isPeak(min: number, cfg: SchedulerConfig): boolean {
  return cfg.peakWindows.some((w) => {
    const s = parseHM(w.start);
    const e = parseHM(w.end);
    return min >= s && min < e;
  });
}

/**
 * Generate a daily schedule.
 *
 * @param cfg        scheduler configuration
 * @param buses      full bus list (only active buses are used)
 * @param initialQueue  optional queue order carried from the previous day.
 *                      If provided, the queue starts in this order (with any
 *                      new active buses appended at the end and removed buses
 *                      filtered out). All buses reset to available at start time.
 */
export function generateSchedule(
  cfg: SchedulerConfig,
  buses: Bus[],
  initialQueue?: string[],
  overrides: Record<number, string> = {},
): ScheduleResult {
  const activeBuses = buses.filter((b) => b.active);
  const activeIds = new Set(activeBuses.map((b) => b.id));
  const start = parseHM(cfg.startTime);
  const end = parseEnd(cfg.endTime);

  let queue: string[];
  if (initialQueue && initialQueue.length > 0) {
    const carried = initialQueue.filter((id) => activeIds.has(id));
    const carriedSet = new Set(carried);
    const newBuses = activeBuses.filter((b) => !carriedSet.has(b.id)).map((b) => b.id);
    queue = [...carried, ...newBuses];
  } else {
    queue = activeBuses.map((b) => b.id);
  }

  const states = new Map<string, BusState>();
  activeBuses.forEach((b) =>
    states.set(b.id, {
      id: b.id,
      nextAvailableMin: start,
      totalTurns: 0,
      lastAssignedMin: null,
    }),
  );

  const trips: Trip[] = [];
  let cumulative = 0;
  let missed = 0;
  let tripNumber = 0;

  let t = start;
  while (t < end) {
    const peak = isPeak(t, cfg);
    const interval = peak ? cfg.peakIntervalMin : cfg.offPeakIntervalMin;
    const duration = peak ? cfg.peakTurnMin : cfg.offPeakTurnMin;

    tripNumber++;

    // Check for manual override for this specific trip number
    const forcedBusId = overrides[tripNumber];

    if (forcedBusId && states.has(forcedBusId)) {
      const st = states.get(forcedBusId)!;
      const lostBusId = queue[0]; // The one at the front of the queue who "lost the chance"

      st.lastAssignedMin = t;
      st.nextAvailableMin = t + duration;
      st.totalTurns += 1;
      cumulative += 1;

      // Update queue:
      // 1. Remove forced bus from current position
      // 2. If lostBusId is different, move it to the back (the one who lost the chance)
      // 3. Move forced bus to the very back
      let newQueue = queue.filter((id) => id !== forcedBusId);
      if (lostBusId && lostBusId !== forcedBusId) {
        newQueue = newQueue.filter((id) => id !== lostBusId);
        newQueue.push(lostBusId); // Re-queue the skipped bus
      }
      newQueue.push(forcedBusId);
      queue = newQueue;

      trips.push({
        tripNumber,
        departureMin: t,
        departureLabel: format12(t),
        period: peak ? "peak" : "off-peak",
        busId: forcedBusId,
        tripDurationMin: duration,
        nextAvailableMin: st.nextAvailableMin,
        nextAvailableLabel: format12(st.nextAvailableMin),
        busTotalTurns: st.totalTurns,
        queueAfter: [...queue],
        cumulativeTurns: cumulative,
        missed: false,
      });
    } else {
      // Standard Logic: Scan queue from front for first available bus
      let chosenIdx = -1;
      for (let i = 0; i < queue.length; i++) {
        const st = states.get(queue[i])!;
        if (st.nextAvailableMin <= t) {
          chosenIdx = i;
          break;
        }
      }

      if (chosenIdx === -1) {
        missed++;
        trips.push({
          tripNumber,
          departureMin: t,
          departureLabel: format12(t),
          period: peak ? "peak" : "off-peak",
          busId: null,
          tripDurationMin: duration,
          nextAvailableMin: null,
          nextAvailableLabel: null,
          busTotalTurns: null,
          queueAfter: [...queue],
          cumulativeTurns: cumulative,
          missed: true,
        });
      } else {
        const busId = queue[chosenIdx];
        const st = states.get(busId)!;
        st.lastAssignedMin = t;
        st.nextAvailableMin = t + duration;
        st.totalTurns += 1;
        cumulative += 1;

        // Move to back
        queue = [...queue.slice(0, chosenIdx), ...queue.slice(chosenIdx + 1), busId];

        trips.push({
          tripNumber,
          departureMin: t,
          departureLabel: format12(t),
          period: peak ? "peak" : "off-peak",
          busId,
          tripDurationMin: duration,
          nextAvailableMin: st.nextAvailableMin,
          nextAvailableLabel: format12(st.nextAvailableMin),
          busTotalTurns: st.totalTurns,
          queueAfter: [...queue],
          cumulativeTurns: cumulative,
          missed: false,
        });
      }
    }

    t += interval;
  }

  return {
    trips,
    finalBusStates: Array.from(states.values()),
    finalQueue: queue,
    missedCount: missed,
    completedTurns: cumulative,
  };
}
