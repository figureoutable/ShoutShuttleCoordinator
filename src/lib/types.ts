import type { CanonicalStop } from "./locations";

export type ShuttleDay = "tuesday" | "wednesday" | "saturday";

export type RunStatus = "pending" | "departed" | "completed";

/** One fleet row per shuttle day (same physical van on two days is two entries). */
export interface Vehicle {
  id: string;
  name: string;
  type: "Van" | "Car";
  capacity: number;
  shuttleDay: ShuttleDay;
}

/**
 * One roster row per shuttle day: the same person on Tuesday and Wednesday is
 * two entries (same name allowed). Planning lists drivers for the day you are viewing.
 */
export interface Driver {
  id: string;
  name: string;
  shuttleDay: ShuttleDay;
  shiftStart: string;
  shiftEnd: string;
  /**
   * Vehicle ids this driver may be assigned with on a run (ids for this row’s
   * `shuttleDay` only). Omit or leave undefined to allow any fleet vehicle that day.
   */
  allowedVehicleIds?: string[];
}

/** Local-time window (HH:mm) for planning timeline traffic adjustment. */
export interface TimelineTrafficWindow {
  start: string;
  end: string;
}

/**
 * Peak road time: extra % on configured one-way travel for each leg.
 * Checked at approximate departure time of that leg (timeline visualization only).
 */
export interface TimelineTrafficSettings {
  /** e.g. 20 → multiply travel by 1.2 in peak windows */
  peakExtraPercent: number;
  peakWindows: TimelineTrafficWindow[];
}

export interface CoordinatorConfig {
  groupingWindowMinutes: number;
  saturdayStartTime: string;
  travelTimeToHeathrowMinutes: number;
  /**
   * Tuesday/Wednesday: minutes from landing (run window start) to airport exit / kerbside.
   * Used for driver-leave timing and for return-leg placement after the last landing.
   */
  touchdownToAirportExitMinutes: number;
  /**
   * Tuesday/Wednesday: extra minutes after terminal exit to reach the meet point and board
   * (walking, kerb delays). Added after touchdown-to-exit for both outbound target and return start.
   */
  inboundAirportExitWaitMinutes: number;
  /**
   * Extra buffer after meet at the airport (loading/unloading, kerb delays) before the return drive.
   * Timeline only; does not change run grouping.
   */
  inboundHandoverBufferMinutes: number;
  timelineTraffic: TimelineTrafficSettings;
  vehicles: Vehicle[];
  drivers: Driver[];
}

/** Vehicle + driver assignment for one run (planning / day-of). */
export interface RunSlotState {
  vehicleId: string | null;
  driverName: string;
}

/**
 * Set when auto-schedule could not assign a run; cleared when both vehicle and driver
 * are assigned manually or the run is successfully scheduled later.
 */
export interface RunScheduleDiagnostic {
  unscheduled: true;
  runNumber: number;
  shuttleDay: ShuttleDay;
  /** Capacity, time window, modeled journey span */
  requirements: string[];
  /** Why no legal van+driver pair existed given the partial schedule */
  blockingReasons: string[];
  /** Short operator hints */
  suggestedActions: string[];
}

export interface ChildSeats {
  baby: number;
  toddler: number;
  child: number;
  booster: number;
}

export interface Passenger {
  id: string;
  rowIndex: number;
  name: string;
  spouseName: string;
  groupSize: number;
  inboundDropOffCanonical: CanonicalStop | "Unknown location";
  inboundDropOffRaw: string;
  outboundPickUpCanonical: CanonicalStop | "Unknown location";
  outboundPickUpRaw: string;
  inboundEligible: boolean;
  outboundEligible: boolean;
  arrivalDateLabel: string;
  inboundTuesday: boolean;
  inboundWednesday: boolean;
  terminal: string;
  /** Optional: city or airport flying from (inbound), if present on upload sheet. */
  inboundFlyingFrom: string;
  airline: string;
  inboundFlight: string;
  inboundArrivalMinutes: number | null;
  inboundArrivalLabel: string;
  departureTerminal: string;
  outboundAirline: string;
  outboundFlight: string;
  outboundDepartureMinutes: number | null;
  outboundDepartureLabel: string;
  saturdayPickupMinutes: number | null;
  seats: ChildSeats;
  mobile: string;
  email: string;
  unknownInboundLocation: boolean;
  unknownOutboundLocation: boolean;
  gatwickInbound: boolean;
}

export interface ShuttleRun {
  key: string;
  day: ShuttleDay;
  runNumber: number;
  passengers: Passenger[];
  startMinutes: number;
  endMinutes: number;
  oversized: boolean;
  terminals: string[];
}

export interface UploadFlags {
  largeGroups: { name: string; groupSize: number }[];
  childSeats: { name: string; types: string[] }[];
  gatwickCount: number;
  unknownLocations: { name: string; field: "inbound" | "outbound"; raw: string }[];
  duplicateEmails: string[];
}

export interface ParseResult {
  passengers: Passenger[];
  flags: UploadFlags;
  totalRows: number;
}
