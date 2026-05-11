import type {
  CoordinatorConfig,
  Passenger,
  ShuttleDay,
  ShuttleDayKind,
  ShuttleDaySpec,
} from "./types";

/** Default Microsoft Form–style inbound + one outbound day (ids stable for run keys). */
export function defaultShuttleDays(): ShuttleDaySpec[] {
  return [
    {
      id: "tuesday",
      kind: "inbound",
      weekdayLabel: "Tuesday",
      dateLine: "22 Jul",
      kindLine: "Arrivals",
      arrivalMatchLines: "tuesday,22\ntuesday,july 22",
    },
    {
      id: "wednesday",
      kind: "inbound",
      weekdayLabel: "Wednesday",
      dateLine: "23 Jul",
      kindLine: "Arrivals",
      arrivalMatchLines: "wednesday,23\nwednesday,july 23",
    },
    {
      id: "saturday",
      kind: "outbound",
      weekdayLabel: "Saturday",
      dateLine: "26 Jul",
      kindLine: "Departures",
      arrivalMatchLines: "",
    },
  ];
}

/** Day ids longest-first so run keys like `inbound-thu-1` parse before shorter prefixes. */
export function orderedShuttleDayIdsForRunKeys(specs: ShuttleDaySpec[]): string[] {
  return [...specs.map((s) => s.id)].sort((a, b) => b.length - a.length);
}

export function parseShuttleRunKey(
  runKey: string,
  config: CoordinatorConfig
): { day: string; runNumber: number } | null {
  for (const id of orderedShuttleDayIdsForRunKeys(config.shuttleDays)) {
    const prefix = `${id}-`;
    if (!runKey.startsWith(prefix)) continue;
    const n = Number(runKey.slice(prefix.length));
    if (!Number.isFinite(n) || n < 1) return null;
    return { day: id, runNumber: n };
  }
  return null;
}

export function shuttleSpecById(
  specs: ShuttleDaySpec[],
  id: string
): ShuttleDaySpec | undefined {
  return specs.find((s) => s.id === id);
}

export function inboundShuttleDaySpecs(specs: ShuttleDaySpec[]): ShuttleDaySpec[] {
  return specs.filter((s) => s.kind === "inbound");
}

export function outboundShuttleDaySpecs(specs: ShuttleDaySpec[]): ShuttleDaySpec[] {
  return specs.filter((s) => s.kind === "outbound");
}

export function firstOutboundDayId(specs: ShuttleDaySpec[]): string | null {
  const o = specs.find((s) => s.kind === "outbound");
  return o?.id ?? null;
}

export function isOutboundShuttleDay(
  config: CoordinatorConfig,
  dayId: string
): boolean {
  return shuttleSpecById(config.shuttleDays, dayId)?.kind === "outbound";
}

/** Each non-empty line = OR branch; commas inside a line = AND (all substrings must appear). */
export function parseArrivalMatchLines(arrivalMatchLines: string): string[][] {
  const lines = arrivalMatchLines.split(/\r?\n/);
  const out: string[][] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const parts = t
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length) out.push(parts);
  }
  return out;
}

export function arrivalLabelMatchesInboundSpec(
  arrivalDateLabel: string,
  spec: ShuttleDaySpec
): boolean {
  if (spec.kind !== "inbound") return false;
  const dl = arrivalDateLabel.trim().toLowerCase();
  if (!dl) return false;
  const branches = parseArrivalMatchLines(spec.arrivalMatchLines);
  if (branches.length === 0) return false;
  return branches.some((ands) => ands.every((frag) => dl.includes(frag)));
}

export function computeInboundDayIdsForPassenger(
  arrivalDateLabel: string,
  specs: ShuttleDaySpec[]
): string[] {
  const ids: string[] = [];
  for (const s of specs) {
    if (s.kind !== "inbound") continue;
    if (arrivalLabelMatchesInboundSpec(arrivalDateLabel, s)) ids.push(s.id);
  }
  return ids;
}

export function attachInboundDayIds(
  passengers: Passenger[],
  specs: ShuttleDaySpec[]
): Passenger[] {
  return passengers.map((p) => ({
    ...p,
    inboundDayIds: computeInboundDayIdsForPassenger(p.arrivalDateLabel, specs),
  }));
}

/** Migrate legacy passengers that still have boolean inbound flags. */
export function normalizePassengerInboundDays(
  p: Passenger,
  specs: ShuttleDaySpec[]
): Passenger {
  if (p.inboundDayIds && p.inboundDayIds.length > 0) {
    return { ...p, inboundDayIds: [...new Set(p.inboundDayIds)] };
  }
  const tuesdayId = specs.find((s) => s.id === "tuesday" && s.kind === "inbound")?.id;
  const wedId = specs.find((s) => s.id === "wednesday" && s.kind === "inbound")?.id;
  const ids: string[] = [];
  const legacyTue = (p as { inboundTuesday?: boolean }).inboundTuesday === true;
  const legacyWed = (p as { inboundWednesday?: boolean }).inboundWednesday === true;
  if (legacyTue && tuesdayId) ids.push(tuesdayId);
  if (legacyWed && wedId) ids.push(wedId);
  if (ids.length === 0) {
    return { ...p, inboundDayIds: computeInboundDayIdsForPassenger(p.arrivalDateLabel, specs) };
  }
  return { ...p, inboundDayIds: ids };
}

function monthAbbrev(m: string): string {
  const t = m.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1, 3).toLowerCase();
}

/** Best-effort "22 Jul" + weekday from a typical form answer. */
export function deriveLabelsFromArrivalCell(full: string): {
  weekdayLabel: string;
  dateLine: string;
} | null {
  const t = full.trim();
  if (!t) return null;
  const m = t.match(/^(\w+)\s+(\d{1,2})\s+(\w+)/i);
  if (m?.[1] && m[2] && m[3]) {
    const weekday =
      m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    const dateLine = `${m[2]} ${monthAbbrev(m[3])}`;
    return { weekdayLabel: weekday, dateLine };
  }
  const first = t.split(/\s+/)[0];
  if (first && first.length > 2) {
    return {
      weekdayLabel: first.charAt(0).toUpperCase() + first.slice(1).toLowerCase(),
      dateLine: t.slice(first.length).trim().slice(0, 12) || "—",
    };
  }
  return null;
}

function modeLabel(labels: string[]): string | null {
  const counts = new Map<string, number>();
  for (const l of labels) {
    const k = l.trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best: string | null = null;
  let n = 0;
  for (const [k, c] of counts) {
    if (c > n) {
      n = c;
      best = k;
    }
  }
  return best;
}

/** Refresh inbound weekday + short date line from the most common matching arrival cell. */
export function mergeInboundDateHintsFromPassengers(
  specs: ShuttleDaySpec[],
  passengers: Passenger[]
): ShuttleDaySpec[] {
  return specs.map((spec) => {
    if (spec.kind !== "inbound") return spec;
    const labels = passengers
      .filter(
        (p) =>
          p.inboundEligible &&
          !p.gatwickInbound &&
          p.inboundDayIds?.includes(spec.id) &&
          p.arrivalDateLabel.trim()
      )
      .map((p) => p.arrivalDateLabel.trim());
    const pick = modeLabel(labels);
    if (!pick) return spec;
    const derived = deriveLabelsFromArrivalCell(pick);
    if (!derived) return spec;
    return {
      ...spec,
      weekdayLabel: derived.weekdayLabel,
      dateLine: derived.dateLine,
    };
  });
}

export function shuttleDayFilterCaption(
  config: CoordinatorConfig,
  dayId: string
): string {
  const s = shuttleSpecById(config.shuttleDays, dayId);
  if (!s) return dayId;
  return `${s.weekdayLabel} ${s.dateLine} · ${s.kindLine}`;
}

export function planningDayTitle(config: CoordinatorConfig, dayId: string): string {
  const s = shuttleSpecById(config.shuttleDays, dayId);
  if (!s) return dayId;
  return `${s.weekdayLabel} ${s.kindLine.toLowerCase()}`;
}

export function planningDayPrintLabel(config: CoordinatorConfig, dayId: string): string {
  const s = shuttleSpecById(config.shuttleDays, dayId);
  if (!s) return dayId;
  return `${s.weekdayLabel} ${s.dateLine}: ${s.kindLine.toLowerCase()}`;
}

export function ensureShuttleDaysShape(
  raw: unknown,
  fallback: ShuttleDaySpec[]
): ShuttleDaySpec[] {
  if (!Array.isArray(raw)) return fallback;
  const out: ShuttleDaySpec[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" && /^[\w-]+$/.test(o.id) ? o.id : "";
    const kind = o.kind === "outbound" ? "outbound" : "inbound";
    if (!id || id.length > 48) continue;
    out.push({
      id,
      kind,
      weekdayLabel: typeof o.weekdayLabel === "string" ? o.weekdayLabel : id,
      dateLine: typeof o.dateLine === "string" ? o.dateLine : "—",
      kindLine:
        typeof o.kindLine === "string"
          ? o.kindLine
          : kind === "outbound"
            ? "Departures"
            : "Arrivals",
      arrivalMatchLines:
        typeof o.arrivalMatchLines === "string" ? o.arrivalMatchLines : "",
    });
  }
  if (out.length === 0) return fallback;
  let keptOutbound = false;
  const fixed: ShuttleDaySpec[] = [];
  for (const s of out) {
    if (s.kind === "outbound") {
      if (keptOutbound) continue;
      keptOutbound = true;
    }
    fixed.push(s);
  }
  return fixed.length ? fixed : fallback;
}

/** If a roster row references a removed day id, pin it to the first configured day. */
export function coerceResourceShuttleDayIds<T extends { shuttleDay: ShuttleDay }>(
  rows: T[],
  specs: ShuttleDaySpec[]
): T[] {
  const allowed = new Set(specs.map((s) => s.id));
  const fb = specs[0]?.id ?? "tuesday";
  return rows.map((r) => (allowed.has(r.shuttleDay) ? r : { ...r, shuttleDay: fb }));
}

export function normalizePassengersForShuttleDays(
  passengers: Passenger[],
  specs: ShuttleDaySpec[]
): Passenger[] {
  return passengers.map((p) => normalizePassengerInboundDays(p, specs));
}

export function slugifyShuttleDayId(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || `day-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Autogenerated OR branches for new inbound days (typical “Tuesday 22 Jul” style answers).
 */
export function buildArrivalMatchLinesFromWeekdayAndDate(
  weekdayLabel: string,
  dateLine: string
): string {
  const w = weekdayLabel.trim().toLowerCase();
  const first = w.split(/\s+/).filter(Boolean)[0] ?? "";
  const d = dateLine.trim().toLowerCase().replace(/\s+/g, " ");
  const branches = new Set<string>();
  if (first && d) {
    branches.add(`${first},${d}`);
    const m = d.match(/^(\d{1,2})\s+([a-z]{3,12})$/i);
    if (m?.[1] && m?.[2]) {
      const dayNum = m[1];
      const mon = m[2].toLowerCase();
      branches.add(`${first},${dayNum}`);
      branches.add(`${first},${mon} ${dayNum}`);
    }
  }
  if (branches.size === 0) return "monday\ntuesday";
  return [...branches].join("\n");
}

export type AddShuttleDayFormInput = {
  kind: ShuttleDayKind;
  weekdayLabel: string;
  dateLine: string;
};

function pickNewOutboundDayId(specs: ShuttleDaySpec[]): string {
  const used = new Set(specs.map((s) => s.id));
  if (!used.has("saturday")) return "saturday";
  return slugifyShuttleDayId(`outbound-${specs.length + 1}`);
}

/** Append a new inbound day, insert a first outbound day, or refresh labels on the existing outbound day. */
export function addShuttleDayFromForm(
  config: CoordinatorConfig,
  input: AddShuttleDayFormInput
): CoordinatorConfig {
  const weekdayLabel = input.weekdayLabel.trim();
  const dateLine = input.dateLine.trim();

  if (input.kind === "outbound") {
    const existing = config.shuttleDays.find((s) => s.kind === "outbound");
    if (existing) {
      return {
        ...config,
        shuttleDays: config.shuttleDays.map((s) =>
          s.id === existing.id
            ? {
                ...s,
                weekdayLabel,
                dateLine,
                kindLine: "Departures",
                kind: "outbound",
              }
            : s
        ),
      };
    }
    const inn = inboundShuttleDaySpecs(config.shuttleDays);
    const out = outboundShuttleDaySpecs(config.shuttleDays);
    const id = pickNewOutboundDayId(config.shuttleDays);
    const spec: ShuttleDaySpec = {
      id,
      kind: "outbound",
      weekdayLabel,
      dateLine,
      kindLine: "Departures",
      arrivalMatchLines: "",
    };
    return { ...config, shuttleDays: [...inn, ...out, spec] };
  }

  const inn = inboundShuttleDaySpecs(config.shuttleDays);
  const out = outboundShuttleDaySpecs(config.shuttleDays);
  const n = inn.length + 1;
  const id = slugifyShuttleDayId(`inbound-${n}`);
  const arrivalMatchLines = buildArrivalMatchLinesFromWeekdayAndDate(
    weekdayLabel,
    dateLine
  );
  const spec: ShuttleDaySpec = {
    id,
    kind: "inbound",
    weekdayLabel,
    dateLine,
    kindLine: "Arrivals",
    arrivalMatchLines,
  };
  return { ...config, shuttleDays: [...inn, spec, ...out] };
}
