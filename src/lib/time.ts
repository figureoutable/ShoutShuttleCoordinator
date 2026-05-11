export function parseTimeToMinutes(value: unknown): { minutes: number; label: string } | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0 && value <= 1) {
      const totalMinutes = value * 24 * 60;
      let hours = Math.floor(totalMinutes / 60);
      let minutes = Math.round(totalMinutes - hours * 60);
      if (minutes === 60) {
        hours += 1;
        minutes = 0;
      }
      hours = hours % 24;
      return { minutes: hours * 60 + minutes, label: format24h(hours, minutes) };
    }
    if (value > 1 && value < 100000) {
      const whole = Math.floor(value);
      const frac = value - whole;
      const excelDate = new Date((whole - 25569) * 86400 * 1000);
      const base =
        excelDate.getUTCFullYear() * 10000 +
        (excelDate.getUTCMonth() + 1) * 100 +
        excelDate.getUTCDate();
      void base;
      const hours = Math.floor(frac * 24);
      const minutes = Math.round((frac * 24 - hours) * 60);
      return { minutes: normalizeMinutes(hours * 60 + minutes), label: format24h(hours, minutes) };
    }
  }

  if (typeof value === "string") {
    const s = value.trim();
    const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (m) {
      const h = Number(m[1]);
      const min = Number(m[2]);
      if (h >= 0 && h < 24 && min >= 0 && min < 60) {
        return { minutes: h * 60 + min, label: format24h(h, min) };
      }
    }
  }

  return null;
}

function normalizeMinutes(m: number): number {
  const mod = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
  return mod;
}

export function format24h(hours: number, minutes: number): string {
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function minutesToLabel(minutes: number): string {
  const m = normalizeMinutes(minutes);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return format24h(h, min);
}

/** 24h clock without a leading zero on the hour (e.g. 9:00, 14:20). */
export function minutesToLabelNoHourPad(minutes: number): string {
  const m = normalizeMinutes(minutes);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, "0")}`;
}

export function parseClockToMinutes(clock: string): number {
  const [h, m] = clock.split(":").map((x) => Number(x));
  return h * 60 + (m || 0);
}
