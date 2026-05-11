import { stopSortIndex } from "./locations";
import {
  minutesToLabel,
  minutesToLabelNoHourPad,
  parseClockToMinutes,
} from "./time";
import type {
  CoordinatorConfig,
  Passenger,
  ShuttleDay,
  ShuttleRun,
} from "./types";

/** Largest vehicle seat count including driver for that shuttle day’s fleet. */
export function largestVehicleCapacity(
  config: CoordinatorConfig,
  day: ShuttleDay
): number {
  const dayFleet = config.vehicles.filter((v) => v.shuttleDay === day);
  if (dayFleet.length === 0) return 9;
  return Math.max(...dayFleet.map((v) => v.capacity));
}

export function maxPassengerSeats(
  config: CoordinatorConfig,
  day: ShuttleDay
): number {
  return Math.max(1, largestVehicleCapacity(config, day) - 1);
}

function isOversizedGroup(p: Passenger, maxSeats: number): boolean {
  return p.groupSize >= maxSeats;
}

export function computeSaturdayPickupMinutes(
  p: Passenger,
  config: CoordinatorConfig
): number | null {
  if (p.outboundDepartureMinutes == null) return null;
  let pick = p.outboundDepartureMinutes - config.travelTimeToHeathrowMinutes;
  const floor = parseClockToMinutes(config.saturdayStartTime);
  if (pick < floor) pick = floor;
  return pick;
}

function uniqueTerminals(passengers: Passenger[], inbound: boolean): string[] {
  const set = new Set<string>();
  for (const p of passengers) {
    const t = inbound ? p.terminal : p.departureTerminal;
    if (t?.trim()) set.add(t.trim());
  }
  return [...set];
}

function groupGreedy(
  sorted: Passenger[],
  getTime: (p: Passenger) => number,
  windowMinutes: number,
  maxSeats: number,
  day: ShuttleDay,
  startRunNumber: number
): ShuttleRun[] {
  const used = new Set<string>();
  const runs: ShuttleRun[] = [];
  let runNumber = startRunNumber;

  for (const p of sorted) {
    if (used.has(p.id)) continue;

    if (isOversizedGroup(p, maxSeats)) {
      const t = getTime(p);
      runs.push({
        key: `${day}-${runNumber}`,
        day,
        runNumber,
        passengers: [p],
        startMinutes: t,
        endMinutes: t,
        oversized: true,
        terminals: uniqueTerminals([p], day !== "saturday"),
      });
      used.add(p.id);
      runNumber += 1;
      continue;
    }

    const group: Passenger[] = [p];
    used.add(p.id);
    const earliest = getTime(p);
    let totalPax = p.groupSize;
    let endT = earliest;

    for (const q of sorted) {
      if (used.has(q.id)) continue;
      if (isOversizedGroup(q, maxSeats)) continue;

      const qt = getTime(q);
      if (qt - earliest > windowMinutes) continue;
      if (totalPax + q.groupSize > maxSeats) continue;

      group.push(q);
      used.add(q.id);
      totalPax += q.groupSize;
      endT = Math.max(endT, qt);
    }

    const lastTimes = group.map(getTime);
    endT = Math.max(...lastTimes);

    runs.push({
      key: `${day}-${runNumber}`,
      day,
      runNumber,
      passengers: group,
      startMinutes: earliest,
      endMinutes: endT,
      oversized: false,
      terminals: uniqueTerminals(group, day !== "saturday"),
    });
    runNumber += 1;
  }

  return runs;
}

function filterInboundDay(
  passengers: Passenger[],
  day: "tuesday" | "wednesday"
): Passenger[] {
  return passengers.filter((p) => {
    if (!p.inboundEligible || p.gatwickInbound) return false;
    if (p.inboundArrivalMinutes == null) return false;
    if (day === "tuesday" && !p.inboundTuesday) return false;
    if (day === "wednesday" && !p.inboundWednesday) return false;
    return true;
  });
}

function filterSaturday(
  passengers: Passenger[],
  config: CoordinatorConfig
): Passenger[] {
  return passengers.filter((p) => {
    if (!p.outboundEligible) return false;
    const pick = computeSaturdayPickupMinutes(p, config);
    return pick != null;
  });
}

/** Persisted map key for manual run placement: `${day}::${passengerId}`. */
export function passengerRunOverrideKey(day: ShuttleDay, passengerId: string): string {
  return `${day}::${passengerId}`;
}

/** Target outside any run (planning list + timeline exclude these passengers). */
export const UNALLOCATED_RUN_KEY = "__UNALLOCATED__";

function getPoolSortedForDay(
  passengers: Passenger[],
  day: ShuttleDay,
  config: CoordinatorConfig
): Passenger[] {
  if (day === "tuesday" || day === "wednesday") {
    const pool = filterInboundDay(passengers, day);
    return [...pool].sort(
      (a, b) => (a.inboundArrivalMinutes ?? 0) - (b.inboundArrivalMinutes ?? 0)
    );
  }
  const pool = filterSaturday(passengers, config);
  const withPick = pool.map((p) => ({
    p,
    pick: computeSaturdayPickupMinutes(p, config)!,
  }));
  withPick.sort((a, b) => {
    const loc =
      stopSortIndex(a.p.outboundPickUpCanonical) - stopSortIndex(b.p.outboundPickUpCanonical);
    if (loc !== 0) return loc;
    return a.pick - b.pick;
  });
  return withPick.map((x) => x.p);
}

function recomputeRunFromPassengers(
  template: ShuttleRun,
  passengers: Passenger[],
  day: ShuttleDay,
  config: CoordinatorConfig
): ShuttleRun {
  const maxSeats = maxPassengerSeats(config, day);
  if (passengers.length === 0) {
    return {
      ...template,
      passengers: [],
      oversized: false,
      terminals: [],
      startMinutes: template.startMinutes,
      endMinutes: template.endMinutes,
    };
  }
  if (day === "saturday") {
    const picks = passengers.map((p) => computeSaturdayPickupMinutes(p, config)!);
    return {
      ...template,
      passengers,
      startMinutes: Math.min(...picks),
      endMinutes: Math.max(...picks),
      oversized: passengers.some((p) => isOversizedGroup(p, maxSeats)),
      terminals: uniqueTerminals(passengers, false),
    };
  }
  const mins = passengers.map((p) => p.inboundArrivalMinutes ?? 0);
  return {
    ...template,
    passengers,
    startMinutes: Math.min(...mins),
    endMinutes: Math.max(...mins),
    oversized: passengers.some((p) => isOversizedGroup(p, maxSeats)),
    terminals: uniqueTerminals(passengers, true),
  };
}

/**
 * Greedy runs as baseline, then moves passengers per `overrides` map
 * (`passengerRunOverrideKey` → run `key` or `UNALLOCATED_RUN_KEY`).
 * Runs with no passengers are omitted (vehicle slots for those keys stay in storage but unused).
 */
export function buildRunsForDayWithOverrides(
  passengers: Passenger[],
  day: ShuttleDay,
  config: CoordinatorConfig,
  overrides: Record<string, string> | undefined | null
): { runs: ShuttleRun[]; unallocated: Passenger[] } {
  const autoRuns = buildRunsForDay(passengers, day, config);
  const validKeys = new Set(autoRuns.map((r) => r.key));
  const pool = getPoolSortedForDay(passengers, day, config);

  const defaultRunKey = new Map<string, string>();
  for (const run of autoRuns) {
    for (const p of run.passengers) {
      defaultRunKey.set(p.id, run.key);
    }
  }

  const buckets = new Map<string, Passenger[]>();
  for (const k of validKeys) {
    buckets.set(k, []);
  }

  const unallocated: Passenger[] = [];

  for (const p of pool) {
    const mapKey = passengerRunOverrideKey(day, p.id);
    const raw = overrides?.[mapKey];
    let targetKey: string;
    if (raw === UNALLOCATED_RUN_KEY) {
      unallocated.push(p);
      continue;
    }
    if (raw && validKeys.has(raw)) {
      targetKey = raw;
    } else {
      const def = defaultRunKey.get(p.id);
      targetKey = def ?? [...validKeys][0] ?? "";
    }
    if (!targetKey || !buckets.has(targetKey)) {
      unallocated.push(p);
      continue;
    }
    buckets.get(targetKey)!.push(p);
  }

  const runs: ShuttleRun[] = [];
  for (const template of autoRuns) {
    const ps = buckets.get(template.key) ?? [];
    if (ps.length === 0) continue;
    runs.push(recomputeRunFromPassengers(template, ps, day, config));
  }

  return { runs, unallocated };
}

/** Value for run-allocation UI: explicit override, else greedy run key, else unallocated. */
export function passengerAllocationValue(
  day: ShuttleDay,
  passengerId: string,
  overrides: Record<string, string> | undefined,
  templateRuns: ShuttleRun[]
): string {
  const k = passengerRunOverrideKey(day, passengerId);
  const o = overrides?.[k];
  if (o === UNALLOCATED_RUN_KEY) return UNALLOCATED_RUN_KEY;
  const valid = new Set(templateRuns.map((r) => r.key));
  if (o && valid.has(o)) return o;
  const def = templateRuns.find((r) =>
    r.passengers.some((p) => p.id === passengerId)
  )?.key;
  return def ?? UNALLOCATED_RUN_KEY;
}

export function buildRunsForDay(
  passengers: Passenger[],
  day: ShuttleDay,
  config: CoordinatorConfig
): ShuttleRun[] {
  const maxSeats = maxPassengerSeats(config, day);
  const window = config.groupingWindowMinutes;

  if (day === "tuesday" || day === "wednesday") {
    const pool = filterInboundDay(passengers, day);
    const sorted = [...pool].sort(
      (a, b) => (a.inboundArrivalMinutes ?? 0) - (b.inboundArrivalMinutes ?? 0)
    );
    return groupGreedy(
      sorted,
      (p) => p.inboundArrivalMinutes ?? 0,
      window,
      maxSeats,
      day,
      1
    );
  }

  const pool = filterSaturday(passengers, config);
  const withPick = pool.map((p) => ({
    p,
    pick: computeSaturdayPickupMinutes(p, config)!,
  }));
  withPick.sort((a, b) => {
    const loc = stopSortIndex(a.p.outboundPickUpCanonical) - stopSortIndex(b.p.outboundPickUpCanonical);
    if (loc !== 0) return loc;
    return a.pick - b.pick;
  });
  const sorted = withPick.map((x) => x.p);
  const getTime = (p: Passenger) => computeSaturdayPickupMinutes(p, config)!;
  return groupGreedy(sorted, getTime, window, maxSeats, "saturday", 1);
}

export function formatWindow(run: ShuttleRun): string {
  const a = minutesToLabel(run.startMinutes);
  const b = minutesToLabel(run.endMinutes);
  if (a === b) return a;
  return `${a}–${b}`;
}

/** Same as {@link formatWindow} but hours omit a leading zero (e.g. 9:00–10:15). */
export function formatWindowNoHourPad(run: ShuttleRun): string {
  const a = minutesToLabelNoHourPad(run.startMinutes);
  const b = minutesToLabelNoHourPad(run.endMinutes);
  if (a === b) return a;
  return `${a}–${b}`;
}

function parseHeathrowTerminal(
  raw: string
): { airport: "heathrow"; terminalNum: string } | null {
  const t = raw.trim();
  const m =
    t.match(/^heathrow\s+terminal\s*(\d+)$/i) ??
    t.match(/^heathrow\s+t\s*(\d+)$/i);
  if (!m?.[1]) return null;
  return { airport: "heathrow", terminalNum: m[1] };
}

/**
 * Compact terminal line for run headers, e.g.
 * ["Heathrow Terminal 2", "Heathrow Terminal 5"] → "Heathrow T2 & T5".
 */
export function formatRunTerminalsShort(terminals: string[]): string {
  if (terminals.length === 0) return "";
  const parsed = terminals.map((s) => ({
    raw: s.trim(),
    heathrow: parseHeathrowTerminal(s),
  }));
  if (parsed.every((x) => x.heathrow)) {
    const nums = parsed.map((x) => x.heathrow!.terminalNum);
    const [first, ...rest] = nums;
    const head = `Heathrow T${first}`;
    if (rest.length === 0) return head;
    return `${head} & ${rest.map((n) => `T${n}`).join(" & ")}`;
  }
  return parsed
    .map(({ raw, heathrow }) =>
      heathrow ? `Heathrow T${heathrow.terminalNum}` : raw
    )
    .join(" & ");
}

export function totalPaxInRun(run: ShuttleRun): number {
  return run.passengers.reduce((s, p) => s + p.groupSize, 0);
}

export function childSeatBadgeLabel(p: Passenger): string | null {
  const parts: string[] = [];
  if (p.seats.baby) parts.push(`Baby×${p.seats.baby}`);
  if (p.seats.toddler) parts.push(`Toddler×${p.seats.toddler}`);
  if (p.seats.child) parts.push(`Child×${p.seats.child}`);
  if (p.seats.booster) parts.push(`Booster×${p.seats.booster}`);
  return parts.length ? parts.join(", ") : null;
}

export function runsOverlap(a: ShuttleRun, b: ShuttleRun): boolean {
  return a.endMinutes > b.startMinutes && b.endMinutes > a.startMinutes;
}
