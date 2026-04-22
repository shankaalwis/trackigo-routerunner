import { Bus, SchedulerConfig } from "./types";

export const DEFAULT_CONFIG: SchedulerConfig = {
  routeName: "Kaduwela - Colombo",
  startTime: "04:30",
  endTime: "00:00",
  peakWindows: [
    { start: "07:00", end: "09:00" },
    { start: "16:00", end: "18:00" },
  ],
  peakIntervalMin: 5,
  offPeakIntervalMin: 15,
  peakTurnMin: 60,
  offPeakTurnMin: 90,
  requiredTurns: 44,
};

export const DEFAULT_BUSES: Bus[] = Array.from({ length: 10 }, (_, i) => ({
  id: `B${i + 1}`,
  active: true,
  driver: "",
}));
