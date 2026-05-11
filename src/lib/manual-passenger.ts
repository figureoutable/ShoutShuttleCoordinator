import { mapDropOffToStop } from "@/lib/locations";
import { computeInboundDayIdsForPassenger } from "@/lib/shuttle-days";
import { parseTimeToMinutes } from "@/lib/time";
import type { ChildSeats, CoordinatorConfig, Passenger } from "@/lib/types";

const emptySeats = (): ChildSeats => ({
  baby: 0,
  toddler: 0,
  child: 0,
  booster: 0,
});

export type ManualPassengerInput = {
  name: string;
  spouseName: string;
  groupSize: number;
  arrivalDateLabel: string;
  terminal: string;
  departureTerminal: string;
  airline: string;
  inboundFlight: string;
  inboundArrivalTime: string;
  outboundAirline: string;
  outboundFlight: string;
  outboundDepartureTime: string;
  /** Maps to inbound Heathrow shuttle eligibility (e.g. “Tuesday: Heathrow”). */
  inboundShuttleRequested: boolean;
  /** Maps to outbound “Yes, Shuttle to Heathrow”. */
  outboundShuttleRequested: boolean;
  inboundDropOffRaw: string;
  outboundPickUpRaw: string;
  mobile: string;
  email: string;
};

export function defaultManualPassengerInput(
  config: CoordinatorConfig
): ManualPassengerInput {
  const firstInbound = config.shuttleDays.find((s) => s.kind === "inbound");
  const arrivalHint = firstInbound
    ? `${firstInbound.weekdayLabel} ${firstInbound.dateLine.replace(/^\s+|\s+$/g, "")}`
    : "Tuesday 22 Jul";
  return {
    name: "",
    spouseName: "",
    groupSize: 1,
    arrivalDateLabel: arrivalHint,
    terminal: "Heathrow Terminal 2",
    departureTerminal: "Heathrow Terminal 2",
    airline: "",
    inboundFlight: "",
    inboundArrivalTime: "14:00",
    outboundAirline: "",
    outboundFlight: "",
    outboundDepartureTime: "12:00",
    inboundShuttleRequested: true,
    outboundShuttleRequested: true,
    inboundDropOffRaw: "Travelodge Guildford",
    outboundPickUpRaw: "Harbour Hotel Guildford",
    mobile: "",
    email: "",
  };
}

export function buildManualPassenger(
  input: ManualPassengerInput,
  config: CoordinatorConfig,
  rowIndex: number
): Passenger {
  const name = input.name.trim();
  const spouse = input.spouseName.trim();
  const rawSize = Number(input.groupSize);
  let groupSize = Number.isFinite(rawSize)
    ? Math.max(1, Math.floor(rawSize))
    : 1;
  if (spouse && groupSize < 2) {
    groupSize = 2;
  }

  const inboundTime = parseTimeToMinutes(input.inboundArrivalTime.trim());
  const outboundTime = parseTimeToMinutes(input.outboundDepartureTime.trim());

  const inboundMapped = mapDropOffToStop(input.inboundDropOffRaw.trim());
  const outboundMapped = mapDropOffToStop(input.outboundPickUpRaw.trim());

  const terminal = input.terminal.trim();
  const gatwickInbound = terminal.toLowerCase().includes("gatwick");

  const inboundHeathrow = input.inboundShuttleRequested;
  const outboundEligible = input.outboundShuttleRequested;

  const id = `p-manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  const arrivalDateLabel = input.arrivalDateLabel.trim() || "—";

  return {
    id,
    rowIndex,
    name,
    spouseName: spouse,
    groupSize,
    inboundDropOffCanonical: inboundMapped.canonical,
    inboundDropOffRaw: input.inboundDropOffRaw.trim(),
    outboundPickUpCanonical: outboundMapped.canonical,
    outboundPickUpRaw: input.outboundPickUpRaw.trim(),
    inboundEligible: inboundHeathrow,
    outboundEligible,
    arrivalDateLabel,
    inboundDayIds: computeInboundDayIdsForPassenger(arrivalDateLabel, config.shuttleDays),
    terminal,
    inboundFlyingFrom: "",
    airline: input.airline.trim(),
    inboundFlight: input.inboundFlight.trim(),
    inboundArrivalMinutes: inboundTime?.minutes ?? null,
    inboundArrivalLabel: inboundTime?.label ?? "",
    departureTerminal: input.departureTerminal.trim(),
    outboundAirline: input.outboundAirline.trim(),
    outboundFlight: input.outboundFlight.trim(),
    outboundDepartureMinutes: outboundTime?.minutes ?? null,
    outboundDepartureLabel: outboundTime?.label ?? "",
    saturdayPickupMinutes: null,
    seats: emptySeats(),
    mobile: input.mobile.trim(),
    email: input.email.trim().toLowerCase(),
    unknownInboundLocation: inboundMapped.unknown && inboundHeathrow,
    unknownOutboundLocation: outboundMapped.unknown && outboundEligible,
    gatwickInbound,
  };
}
