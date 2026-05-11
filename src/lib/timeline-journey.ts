import { runsOverlap } from "@/lib/grouping";
import { shuttleSpecById } from "./shuttle-days";
import { minutesToLabel, parseClockToMinutes } from "./time";
import type {
  CoordinatorConfig,
  ShuttleDay,
  ShuttleRun,
  TimelineTrafficSettings,
  TimelineTrafficWindow,
} from "./types";

export type TrafficTier = "peak" | "off";

function minuteInWindow(m: number, w: TimelineTrafficWindow): boolean {
  const a = parseClockToMinutes(w.start);
  const b = parseClockToMinutes(w.end);
  if (a <= b) return m >= a && m < b;
  return m >= a || m < b;
}

export function trafficTierAt(
  minuteOfDay: number,
  traffic: TimelineTrafficSettings
): TrafficTier {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  if (traffic.peakWindows.some((w) => minuteInWindow(m, w))) return "peak";
  return "off";
}

export function trafficMultiplier(
  tier: TrafficTier,
  traffic: TimelineTrafficSettings
): number {
  if (tier === "peak") return 1 + traffic.peakExtraPercent / 100;
  return 1;
}

export function trafficTierLabel(
  tier: TrafficTier,
  traffic: TimelineTrafficSettings
): string {
  if (tier === "peak") return `peak +${traffic.peakExtraPercent}%`;
  return "off-peak";
}

export type RunTimelineJourney = {
  displayStart: number;
  displayEnd: number;
  baseTravel: number;
  outbound: {
    minutes: number;
    tier: TrafficTier;
    multiplier: number;
    departMinute: number;
  };
  returnLeg: {
    minutes: number;
    tier: TrafficTier;
    multiplier: number;
    startMinute: number;
  };
  /** Flight or pickup spread */
  windowMinutes: number;
  /** Airport exit + handover (inbound only) */
  waitMinutes: number;
  airportExitMinutes: number;
  handoverMinutes: number;
};

/**
 * Going leg to the airport (inbound) or first pick-up (outbound).
 * `arriveAtEndMinute` = minute the driver must **finish** this leg (at meet / first pax time).
 * Returns `departMinute` = when to **start** driving: `arriveAtEndMinute −` scaled travel.
 */
function computeOutboundLeg(
  baseTravel: number,
  arriveAtEndMinute: number,
  traffic: TimelineTrafficSettings
): { minutes: number; tier: TrafficTier; multiplier: number; departMinute: number } {
  if (baseTravel <= 0) {
    return {
      minutes: 0,
      tier: "off",
      multiplier: 1,
      departMinute: arriveAtEndMinute,
    };
  }
  let departApprox = Math.max(0, arriveAtEndMinute - baseTravel);
  let tier = trafficTierAt(departApprox, traffic);
  let mult = trafficMultiplier(tier, traffic);
  let mins = Math.max(1, Math.round(baseTravel * mult));
  departApprox = Math.max(0, arriveAtEndMinute - mins);
  tier = trafficTierAt(departApprox, traffic);
  mult = trafficMultiplier(tier, traffic);
  mins = Math.max(1, Math.round(baseTravel * mult));
  return { minutes: mins, tier, multiplier: mult, departMinute: departApprox };
}

function computeReturnLeg(
  baseTravel: number,
  returnStartMinute: number,
  traffic: TimelineTrafficSettings
): { minutes: number; tier: TrafficTier; multiplier: number; startMinute: number } {
  if (baseTravel <= 0) {
    return {
      minutes: 0,
      tier: "off",
      multiplier: 1,
      startMinute: returnStartMinute,
    };
  }
  const tier = trafficTierAt(returnStartMinute, traffic);
  const mult = trafficMultiplier(tier, traffic);
  const mins = Math.max(1, Math.round(baseTravel * mult));
  return {
    minutes: mins,
    tier,
    multiplier: mult,
    startMinute: returnStartMinute,
  };
}

/** Full timeline span and per-leg travel for Tue / Wed / Sat planning. */
export function computeRunTimelineJourney(
  run: ShuttleRun,
  day: ShuttleDay,
  config: CoordinatorConfig
): RunTimelineJourney | null {
  const spec = shuttleSpecById(config.shuttleDays, day);
  if (!spec) return null;
  const outbound = spec.kind === "outbound";
  const base = Math.max(0, config.travelTimeToHeathrowMinutes);
  const traffic = config.timelineTraffic;
  const touchdown =
    outbound ? 0 : Math.max(0, config.touchdownToAirportExitMinutes);
  const exitMeet =
    outbound ? 0 : Math.max(0, config.inboundAirportExitWaitMinutes);
  const handover =
    outbound ? 0 : Math.max(0, config.inboundHandoverBufferMinutes);
  const wait = touchdown + exitMeet + handover;
  const windowM = Math.max(0, run.endMinutes - run.startMinutes);

  /**
   * Inbound: `run.startMinutes` = first flight landing in the run. Driver must be at the
   * Heathrow meet after clearance + exit-to-meet (not before). Example: land 13:00, 30 min
   * clearance + 0 exit-to-meet → ready 13:30; 40 min drive → **leave by 12:50**.
   * Outbound (Sat): first pick-up window start (no airport clearance fields).
   */
  const driverArriveAtMeetOrFirstPickMinute = outbound
    ? run.startMinutes
    : run.startMinutes + touchdown + exitMeet;

  const out = computeOutboundLeg(base, driverArriveAtMeetOrFirstPickMinute, traffic);
  const displayStart =
    out.minutes > 0 ? Math.max(0, out.departMinute) : driverArriveAtMeetOrFirstPickMinute;

  const returnStart = run.endMinutes + wait;
  const ret = computeReturnLeg(base, returnStart, traffic);
  const displayEnd = returnStart + ret.minutes;

  return {
    displayStart,
    displayEnd,
    baseTravel: base,
    outbound: out,
    returnLeg: ret,
    windowMinutes: windowM,
    waitMinutes: wait,
    airportExitMinutes: touchdown + exitMeet,
    handoverMinutes: handover,
  };
}

/**
 * True if two runs overlap on the modeled driver+vehicle timeline (first possible
 * departure through end of return leg). Use this for vehicle/driver conflict checks,
 * not passenger-only `runsOverlap` (arrival or pickup spread).
 */
export function runsOverlapJourney(
  a: ShuttleRun,
  b: ShuttleRun,
  day: ShuttleDay,
  config: CoordinatorConfig
): boolean {
  const ja = computeRunTimelineJourney(a, day, config);
  const jb = computeRunTimelineJourney(b, day, config);
  if (!ja || !jb) return runsOverlap(a, b);
  return ja.displayEnd > jb.displayStart && jb.displayEnd > ja.displayStart;
}

/** Driver leave (outbound depart) and end of return leg, for planning UI. */
export function runDriverTimingLabels(
  run: ShuttleRun,
  day: ShuttleDay,
  config: CoordinatorConfig
): { leave: string; returnAt: string } | null {
  const j = computeRunTimelineJourney(run, day, config);
  if (!j) return null;
  return {
    leave: minutesToLabel(j.outbound.departMinute),
    returnAt: minutesToLabel(j.displayEnd),
  };
}
