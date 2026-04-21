export function parseHM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export function formatHM(min: number): string {
  const total = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function format12(min: number): string {
  const total = ((min % 1440) + 1440) % 1440;
  let h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Treats "00:00" as end-of-day (1440)
export function parseEnd(s: string): number {
  const v = parseHM(s);
  return v === 0 ? 1440 : v;
}
