export type Bus = {
  id: string;
  driver?: string;
  active: boolean;
};

export type BusState = {
  id: string;
  nextAvailableMin: number; // minutes from midnight
  totalTurns: number;
  lastAssignedMin: number | null;
};

export type PeakWindow = { start: string; end: string }; // "HH:MM"

export type SchedulerConfig = {
  routeName: string;
  originName: string;
  destinationName: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM" — "00:00" treated as 24:00
  peakWindows: PeakWindow[];
  peakIntervalMin: number;
  offPeakIntervalMin: number;
  peakTurnMin: number;
  offPeakTurnMin: number;
};

export type Trip = {
  tripNumber: number;
  departureMin: number;
  departureLabel: string;
  period: "peak" | "off-peak";
  busId: string | null;
  tripDurationMin: number;
  nextAvailableMin: number | null;
  nextAvailableLabel: string | null;
  busTotalTurns: number | null;
  queueAfter: string[];
  cumulativeTurns: number;
  missed: boolean;
};

export type ScheduleResult = {
  trips: Trip[];
  finalBusStates: BusState[];
  finalQueue: string[];
  missedCount: number;
  completedTurns: number;
};
