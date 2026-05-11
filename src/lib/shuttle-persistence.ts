import {
  defaultCoordinatorConfig,
  defaultTimelineTraffic,
} from "@/lib/default-coordinator-config";
import type {
  CoordinatorConfig,
  Driver,
  Passenger,
  RunScheduleDiagnostic,
  RunSlotState,
  RunStatus,
  ShuttleDay,
  TimelineTrafficSettings,
  TimelineTrafficWindow,
  UploadFlags,
  Vehicle,
} from "@/lib/types";

const STORAGE_KEY = "equippers-shuttle-coordinator-v1";

export type PersistedShuttleBundle = {
  config: CoordinatorConfig;
  passengers: Passenger[];
  uploadFlags: UploadFlags | null;
  totalRows: number;
  runSlots: Record<string, RunSlotState>;
  runStatuses: Record<string, RunStatus>;
  /** Manual passenger→run placement; keys from `passengerRunOverrideKey`. */
  passengerRunOverrides?: Record<string, string>;
  /** Last auto-schedule failures per run key (`tuesday-1`, etc.). */
  runScheduleDiagnostics?: Record<string, RunScheduleDiagnostic>;
};

function isVehicle(x: unknown): x is Vehicle {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    (o.type === "Van" || o.type === "Car") &&
    typeof o.capacity === "number" &&
    isShuttleDayValue(o.shuttleDay)
  );
}

function isTimelineTrafficWindow(x: unknown): x is TimelineTrafficWindow {
  if (!x || typeof x !== "object") return false;
  const w = x as Record<string, unknown>;
  return typeof w.start === "string" && typeof w.end === "string";
}

function parseTimelineTraffic(raw: unknown): TimelineTrafficSettings {
  const d = defaultTimelineTraffic();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const peakExtra =
    typeof o.peakExtraPercent === "number" && o.peakExtraPercent >= 0
      ? o.peakExtraPercent
      : d.peakExtraPercent;
  const peakWindows = Array.isArray(o.peakWindows)
    ? o.peakWindows.filter(isTimelineTrafficWindow)
    : d.peakWindows;
  return {
    peakExtraPercent: peakExtra,
    peakWindows: peakWindows.length ? peakWindows : d.peakWindows,
  };
}

function isShuttleDayValue(x: unknown): x is ShuttleDay {
  return x === "tuesday" || x === "wednesday" || x === "saturday";
}

function isDriver(x: unknown): x is Driver {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.name !== "string" ||
    !isShuttleDayValue(o.shuttleDay) ||
    typeof o.shiftStart !== "string" ||
    typeof o.shiftEnd !== "string"
  ) {
    return false;
  }
  if (
    "allowedVehicleIds" in o &&
    o.allowedVehicleIds != null &&
    (!Array.isArray(o.allowedVehicleIds) ||
      !o.allowedVehicleIds.every((id) => typeof id === "string"))
  ) {
    return false;
  }
  return true;
}

/** Legacy roster used per-day booleans on a single row; split into one row per enabled day. */
function migrateLegacyDriverRecord(o: Record<string, unknown>): Driver[] {
  const id = typeof o.id === "string" ? o.id : "driver-legacy";
  const name = typeof o.name === "string" ? o.name : "Driver";
  const shiftStart = typeof o.shiftStart === "string" ? o.shiftStart : "06:00";
  const shiftEnd = typeof o.shiftEnd === "string" ? o.shiftEnd : "22:00";
  let allowed: string[] | undefined;
  if (Array.isArray(o.allowedVehicleIds)) {
    const ids = o.allowedVehicleIds.filter((x) => typeof x === "string") as string[];
    if (ids.length) allowed = ids;
  }
  const days: ShuttleDay[] = [];
  if (o.enabledTuesday === true) days.push("tuesday");
  if (o.enabledWednesday === true) days.push("wednesday");
  if (o.enabledSaturday === true) days.push("saturday");
  if (days.length === 0) return [];
  const base: Omit<Driver, "id" | "shuttleDay"> = {
    name,
    shiftStart,
    shiftEnd,
    ...(allowed ? { allowedVehicleIds: allowed } : {}),
  };
  return days.map((day) => ({
    ...base,
    id: `${id}-m-${day}`,
    shuttleDay: day,
  }));
}

function normalizePersistedDrivers(raw: unknown, fallback: Driver[]): Driver[] {
  if (!Array.isArray(raw)) return fallback;
  const out: Driver[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (isShuttleDayValue(o.shuttleDay) && isDriver(item)) {
      out.push(item as Driver);
      continue;
    }
    if (
      typeof o.id === "string" &&
      typeof o.name === "string" &&
      typeof o.enabledTuesday === "boolean" &&
      typeof o.shiftStart === "string"
    ) {
      out.push(...migrateLegacyDriverRecord(o));
    }
  }
  return out.length ? out : fallback;
}

/** Legacy fleet used per-day booleans on one row; split into one row per enabled day. */
function migrateLegacyVehicleRecord(o: Record<string, unknown>): Vehicle[] {
  const id = typeof o.id === "string" ? o.id : "vehicle-legacy";
  const name = typeof o.name === "string" ? o.name : "Van";
  const type = o.type === "Car" ? "Car" : "Van";
  const capacity = typeof o.capacity === "number" ? o.capacity : 9;
  const days: ShuttleDay[] = [];
  if (o.enabledTuesday === true) days.push("tuesday");
  if (o.enabledWednesday === true) days.push("wednesday");
  if (o.enabledSaturday === true) days.push("saturday");
  if (days.length === 0) return [];
  return days.map((day) => ({
    id: `${id}-m-${day}`,
    name,
    type,
    capacity,
    shuttleDay: day,
  }));
}

function normalizePersistedVehicles(raw: unknown, fallback: Vehicle[]): Vehicle[] {
  if (!Array.isArray(raw)) return fallback;
  const out: Vehicle[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (isShuttleDayValue(o.shuttleDay) && isVehicle(item)) {
      out.push(item as Vehicle);
      continue;
    }
    if (
      typeof o.id === "string" &&
      typeof o.name === "string" &&
      (o.type === "Van" || o.type === "Car") &&
      typeof o.capacity === "number" &&
      typeof o.enabledTuesday === "boolean"
    ) {
      out.push(...migrateLegacyVehicleRecord(o));
    }
  }
  return out.length ? out : fallback;
}

/** Shallow copy so callers can safely mutate without aliasing persisted state. */
export function normalizeCoordinatorResourceDays(c: CoordinatorConfig): CoordinatorConfig {
  return { ...c };
}

function parseConfig(raw: unknown): CoordinatorConfig {
  const d = defaultCoordinatorConfig();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const vehicles = normalizePersistedVehicles(o.vehicles, d.vehicles);
  const drivers = normalizePersistedDrivers(o.drivers, d.drivers);

  const inboundFromFile =
    typeof o.inboundAirportExitWaitMinutes === "number" &&
    o.inboundAirportExitWaitMinutes >= 0
      ? o.inboundAirportExitWaitMinutes
      : null;
  const hasTouchdownField =
    typeof o.touchdownToAirportExitMinutes === "number" &&
    o.touchdownToAirportExitMinutes >= 0;

  let touchdownToAirportExitMinutes: number;
  let inboundAirportExitWaitMinutes: number;
  if (hasTouchdownField) {
    touchdownToAirportExitMinutes = o.touchdownToAirportExitMinutes as number;
    inboundAirportExitWaitMinutes =
      inboundFromFile ?? d.inboundAirportExitWaitMinutes;
  } else if (inboundFromFile != null) {
    // Legacy single “exit” field: split into touchdown→exit (cap 30) + exit→meet remainder.
    touchdownToAirportExitMinutes = Math.min(30, inboundFromFile);
    inboundAirportExitWaitMinutes = Math.max(
      0,
      inboundFromFile - touchdownToAirportExitMinutes
    );
  } else {
    touchdownToAirportExitMinutes = d.touchdownToAirportExitMinutes;
    inboundAirportExitWaitMinutes = d.inboundAirportExitWaitMinutes;
  }

  return normalizeCoordinatorResourceDays({
    groupingWindowMinutes:
      typeof o.groupingWindowMinutes === "number" && o.groupingWindowMinutes > 0
        ? o.groupingWindowMinutes
        : d.groupingWindowMinutes,
    saturdayStartTime:
      typeof o.saturdayStartTime === "string" && o.saturdayStartTime
        ? o.saturdayStartTime
        : d.saturdayStartTime,
    travelTimeToHeathrowMinutes:
      typeof o.travelTimeToHeathrowMinutes === "number" &&
      o.travelTimeToHeathrowMinutes > 0
        ? o.travelTimeToHeathrowMinutes
        : d.travelTimeToHeathrowMinutes,
    touchdownToAirportExitMinutes,
    inboundAirportExitWaitMinutes,
    inboundHandoverBufferMinutes:
      typeof o.inboundHandoverBufferMinutes === "number" &&
      o.inboundHandoverBufferMinutes >= 0
        ? o.inboundHandoverBufferMinutes
        : d.inboundHandoverBufferMinutes,
    timelineTraffic: parseTimelineTraffic(o.timelineTraffic),
    vehicles,
    drivers,
  });
}

function parseRunSlots(raw: unknown): Record<string, RunSlotState> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, RunSlotState> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const vehicleId =
      o.vehicleId === null || typeof o.vehicleId === "string"
        ? o.vehicleId
        : null;
    const driverName =
      typeof o.driverName === "string" ? o.driverName : "";
    out[k] = { vehicleId, driverName };
  }
  return out;
}

/**
 * Clears vehicleId on any run slot that references a vehicle no longer in the fleet
 * (e.g. after deleting a van). Returns the same object reference if nothing changed.
 */
export function sanitizeRunSlotsAgainstFleet(
  runSlots: Record<string, RunSlotState>,
  vehicles: { id: string }[]
): Record<string, RunSlotState> {
  const allowed = new Set(vehicles.map((v) => v.id));
  let hasStale = false;
  for (const slot of Object.values(runSlots)) {
    const vid = slot.vehicleId;
    if (vid != null && vid !== "" && !allowed.has(vid)) {
      hasStale = true;
      break;
    }
  }
  if (!hasStale) return runSlots;
  const out: Record<string, RunSlotState> = {};
  for (const [key, slot] of Object.entries(runSlots)) {
    const vid = slot.vehicleId;
    if (vid != null && vid !== "" && !allowed.has(vid)) {
      out[key] = { ...slot, vehicleId: null };
    } else {
      out[key] = slot;
    }
  }
  return out;
}

function parsePassengerRunOverrides(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k === "string" && typeof v === "string" && v.length > 0) {
      out[k] = v;
    }
  }
  return out;
}

function parseRunScheduleDiagnostics(
  raw: unknown
): Record<string, RunScheduleDiagnostic> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, RunScheduleDiagnostic> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    if (o.unscheduled !== true) continue;
    if (typeof o.runNumber !== "number") continue;
    const sd = o.shuttleDay;
    if (sd !== "tuesday" && sd !== "wednesday" && sd !== "saturday") continue;
    const req = Array.isArray(o.requirements)
      ? o.requirements.filter((x) => typeof x === "string")
      : [];
    const block = Array.isArray(o.blockingReasons)
      ? o.blockingReasons.filter((x) => typeof x === "string")
      : [];
    const sug = Array.isArray(o.suggestedActions)
      ? o.suggestedActions.filter((x) => typeof x === "string")
      : [];
    out[k] = {
      unscheduled: true,
      runNumber: o.runNumber,
      shuttleDay: sd,
      requirements: req,
      blockingReasons: block,
      suggestedActions: sug,
    };
  }
  return out;
}

function parseRunStatuses(raw: unknown): Record<string, RunStatus> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, RunStatus> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === "pending" || v === "departed" || v === "completed") {
      out[k] = v;
    }
  }
  return out;
}

function parseUploadFlags(raw: unknown): UploadFlags | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    largeGroups: Array.isArray(o.largeGroups) ? o.largeGroups : [],
    childSeats: Array.isArray(o.childSeats) ? o.childSeats : [],
    gatwickCount: typeof o.gatwickCount === "number" ? o.gatwickCount : 0,
    unknownLocations: Array.isArray(o.unknownLocations)
      ? o.unknownLocations
      : [],
    duplicateEmails: Array.isArray(o.duplicateEmails)
      ? o.duplicateEmails
      : [],
  };
}

/** Load persisted bundle from localStorage (browser only). */
export function loadPersistedShuttleBundle(): Partial<PersistedShuttleBundle> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    const out: Partial<PersistedShuttleBundle> = {};
    if ("config" in o) out.config = parseConfig(o.config);
    if (Array.isArray(o.passengers)) {
      out.passengers = o.passengers as Passenger[];
    }
    if ("uploadFlags" in o) {
      out.uploadFlags =
        o.uploadFlags === null ? null : parseUploadFlags(o.uploadFlags);
    }
    if (typeof o.totalRows === "number") out.totalRows = o.totalRows;
    if ("runSlots" in o) out.runSlots = parseRunSlots(o.runSlots);
    if ("runStatuses" in o) out.runStatuses = parseRunStatuses(o.runStatuses);
    if ("passengerRunOverrides" in o) {
      out.passengerRunOverrides = parsePassengerRunOverrides(
        o.passengerRunOverrides
      );
    }
    if ("runScheduleDiagnostics" in o) {
      out.runScheduleDiagnostics = parseRunScheduleDiagnostics(
        o.runScheduleDiagnostics
      );
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export function persistShuttleBundle(bundle: PersistedShuttleBundle): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    /* quota or private mode */
  }
}
