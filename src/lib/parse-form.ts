import { mapDropOffToStop } from "./locations";
import type { ParseResult, Passenger, UploadFlags, ChildSeats } from "./types";
import { parseTimeToMinutes } from "./time";

function norm(s: string): string {
  return s.trim().replace(/:\s*$/, "").toLowerCase();
}

function findColumnIndex(
  headers: string[],
  matchers: ((h: string) => boolean)[]
): number {
  const normalized = headers.map((h) => norm(String(h ?? "")));
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (matchers.some((fn) => fn(h))) return i;
  }
  return -1;
}

function cell(row: unknown[], idx: number): string {
  if (idx < 0) return "";
  const v = row[idx];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function intOrZero(s: string): number {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseChildSeatCount(s: string): number {
  if (!s) return 0;
  const n = Number(s);
  if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  return intOrZero(s);
}

export function parseFormRows(rows: unknown[][]): ParseResult {
  if (!rows.length) {
    return {
      passengers: [],
      flags: emptyFlags(),
      totalRows: 0,
    };
  }

  const headers = (rows[0] as unknown[]).map((c) => String(c ?? ""));
  const dataRows = rows.slice(1).filter((r) =>
    (r as unknown[]).some((c) => String(c ?? "").trim() !== "")
  );

  const idx = {
    name: findColumnIndex(headers, [
      (h) => h.includes("your full name") && h.includes("first"),
    ]),
    spouse: findColumnIndex(headers, [(h) => h.includes("full name of spouse")]),
    groupSize: findColumnIndex(headers, [
      (h) =>
        h.includes("how many family members") &&
        h.includes("travelling altogether"),
    ]),
    inboundDrop: findColumnIndex(headers, [
      (h) => h.startsWith("shuttle drop off"),
    ]),
    inboundReq: findColumnIndex(headers, [
      (h) => h.includes("inbound:") && h.includes("shuttle pick-up"),
    ]),
    arrivalDate: findColumnIndex(headers, [
      (h) => h.includes("what date do you arrive"),
    ]),
    terminal: findColumnIndex(headers, [
      (h) => h.includes("what airport do you arrive at"),
    ]),
    inboundFlyingFrom: findColumnIndex(headers, [
      (h) => h.includes("flying from"),
      (h) => h.includes("fly from") && !h.includes("shuttle back"),
      (h) =>
        h.includes("where") &&
        h.includes("from") &&
        (h.includes("fly") || h.includes("flight")),
    ]),
    airline: findColumnIndex(headers, [
      (h) =>
        h.includes("name of airline") &&
        !h.includes("name of airline 2"),
    ]),
    inboundFlight: -1,
    inboundTime: findColumnIndex(headers, [
      (h) =>
        h.includes("expected uk flight arrival time") ||
        (h.includes("flight arrival time") && h.includes("24hr")),
    ]),
    outboundReq: findColumnIndex(headers, [
      (h) =>
        h.includes("shuttle back to the airport on saturday 26 july") ||
        (h.includes("shuttle back") && h.includes("saturday")),
    ]),
    outboundPick: findColumnIndex(headers, [
      (h) => h.startsWith("shuttle pick up"),
    ]),
    depTerminal: findColumnIndex(headers, [
      (h) => h.includes("what airport are you departing from"),
    ]),
    outboundAirline: findColumnIndex(headers, [
      (h) => h.includes("name of airline 2"),
    ]),
    outboundFlight: -1,
    outboundTime: findColumnIndex(headers, [
      (h) => h.includes("uk flight departure time"),
    ]),
    baby: findColumnIndex(headers, [
      (h) => h.includes("baby seat") && h.includes("0-12"),
    ]),
    toddler: findColumnIndex(headers, [
      (h) => h.includes("toddler seat"),
    ]),
    child: findColumnIndex(headers, [
      (h) => h.includes("child seat") && h.includes("3-5"),
    ]),
    booster: findColumnIndex(headers, [
      (h) => h.includes("booster seat"),
    ]),
    mobile: findColumnIndex(headers, [
      (h) => h.includes("mobile number"),
    ]),
    email: findColumnIndex(headers, [
      (h) => h === "email" || h.includes("email address"),
    ]),
  };

  const normalized = headers.map((h) => norm(String(h ?? "")));
  const flightCols = normalized
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.includes("flight code and number"));
  if (flightCols.length >= 2) {
    idx.inboundFlight = flightCols[0].i;
    idx.outboundFlight = flightCols[1].i;
  } else if (flightCols.length === 1) {
    const h = flightCols[0].h;
    if (/\)\s*2\s*$/.test(h) || h.endsWith(" 2")) {
      idx.outboundFlight = flightCols[0].i;
    } else {
      idx.inboundFlight = flightCols[0].i;
    }
  }

  const flags = emptyFlags();
  const emailRows = new Map<string, number[]>();

  const passengers: Passenger[] = dataRows.map((rowRaw, j) => {
    const row = rowRaw as unknown[];
    const name = cell(row, idx.name);
    const spouse = cell(row, idx.spouse);
    const groupSizeRaw = cell(row, idx.groupSize);
    let groupSize = groupSizeRaw ? intOrZero(groupSizeRaw) : 0;
    if (!groupSizeRaw) {
      groupSize = spouse ? 2 : 1;
    } else if (groupSize < 1) {
      groupSize = 1;
    }

    const inboundDropRaw = cell(row, idx.inboundDrop);
    const inboundMapped = mapDropOffToStop(inboundDropRaw);
    const outboundPickRaw = cell(row, idx.outboundPick);
    const outboundMapped = mapDropOffToStop(outboundPickRaw);

    const inboundReqRaw = cell(row, idx.inboundReq);
    const inboundHeathrow = inboundReqRaw.toLowerCase().includes("heathrow");

    const terminal = cell(row, idx.terminal);
    const gatwickInbound = terminal.toLowerCase().includes("gatwick");

    const arrivalDateLabel = cell(row, idx.arrivalDate);

    const outboundReqRaw = cell(row, idx.outboundReq);
    const outboundEligible = outboundReqRaw
      .toLowerCase()
      .includes("yes, shuttle to heathrow");

    const inboundTime = parseTimeToMinutes(row[idx.inboundTime]);
    const outboundTime = parseTimeToMinutes(row[idx.outboundTime]);

    const seats: ChildSeats = {
      baby: parseChildSeatCount(cell(row, idx.baby)),
      toddler: parseChildSeatCount(cell(row, idx.toddler)),
      child: parseChildSeatCount(cell(row, idx.child)),
      booster: parseChildSeatCount(cell(row, idx.booster)),
    };

    const email = cell(row, idx.email).toLowerCase();
    if (email) {
      const list = emailRows.get(email) ?? [];
      list.push(j);
      emailRows.set(email, list);
    }

    const passenger: Passenger = {
      id: `p-${j}-${name.replace(/\s+/g, "-").slice(0, 24)}`,
      rowIndex: j + 2,
      name,
      spouseName: spouse,
      groupSize,
      inboundDropOffCanonical: inboundMapped.canonical,
      inboundDropOffRaw: inboundDropRaw,
      outboundPickUpCanonical: outboundMapped.canonical,
      outboundPickUpRaw: outboundPickRaw,
      inboundEligible: inboundHeathrow,
      outboundEligible,
      arrivalDateLabel,
      inboundDayIds: [],
      terminal,
      inboundFlyingFrom: cell(row, idx.inboundFlyingFrom),
      airline: cell(row, idx.airline),
      inboundFlight: cell(row, idx.inboundFlight),
      inboundArrivalMinutes: inboundTime?.minutes ?? null,
      inboundArrivalLabel: inboundTime?.label ?? "",
      departureTerminal: cell(row, idx.depTerminal),
      outboundAirline: cell(row, idx.outboundAirline),
      outboundFlight: cell(row, idx.outboundFlight),
      outboundDepartureMinutes: outboundTime?.minutes ?? null,
      outboundDepartureLabel: outboundTime?.label ?? "",
      saturdayPickupMinutes: null,
      seats,
      mobile: cell(row, idx.mobile),
      email,
      unknownInboundLocation: inboundMapped.unknown && inboundHeathrow,
      unknownOutboundLocation: outboundMapped.unknown && outboundEligible,
      gatwickInbound,
    };

    return passenger;
  });

  for (const [email, indices] of emailRows) {
    if (indices.length > 1) {
      const names = indices
        .map((i) => passengers[i]?.name)
        .filter(Boolean)
        .join(", ");
      flags.duplicateEmails.push(
        `${email}: ${indices.length}× (${names})`
      );
    }
  }

  for (const p of passengers) {
    if (p.groupSize >= 8) {
      flags.largeGroups.push({ name: p.name, groupSize: p.groupSize });
    }
    const types: string[] = [];
    if (p.seats.baby) types.push(`Baby×${p.seats.baby}`);
    if (p.seats.toddler) types.push(`Toddler×${p.seats.toddler}`);
    if (p.seats.child) types.push(`Child×${p.seats.child}`);
    if (p.seats.booster) types.push(`Booster×${p.seats.booster}`);
    if (types.length) {
      flags.childSeats.push({ name: p.name, types });
    }
    if (p.gatwickInbound) {
      flags.gatwickCount += 1;
    }
    if (p.unknownInboundLocation) {
      flags.unknownLocations.push({
        name: p.name,
        field: "inbound",
        raw: p.inboundDropOffRaw,
      });
    }
    if (p.unknownOutboundLocation) {
      flags.unknownLocations.push({
        name: p.name,
        field: "outbound",
        raw: p.outboundPickUpRaw,
      });
    }
  }

  return { passengers, flags, totalRows: dataRows.length };
}

function emptyFlags(): UploadFlags {
  return {
    largeGroups: [],
    childSeats: [],
    gatwickCount: 0,
    unknownLocations: [],
    duplicateEmails: [],
  };
}

/** Recompute upload flags from the current passenger list (e.g. after manual add/remove). */
export function computeUploadFlagsFromPassengers(passengers: Passenger[]): UploadFlags {
  const flags = emptyFlags();
  const emailRows = new Map<string, number[]>();
  passengers.forEach((p, j) => {
    const email = p.email.trim().toLowerCase();
    if (email) {
      const list = emailRows.get(email) ?? [];
      list.push(j);
      emailRows.set(email, list);
    }
  });

  for (const [email, indices] of emailRows) {
    if (indices.length > 1) {
      const names = indices
        .map((i) => passengers[i]?.name)
        .filter(Boolean)
        .join(", ");
      flags.duplicateEmails.push(`${email}: ${indices.length}× (${names})`);
    }
  }

  for (const p of passengers) {
    if (p.groupSize >= 8) {
      flags.largeGroups.push({ name: p.name, groupSize: p.groupSize });
    }
    const types: string[] = [];
    if (p.seats.baby) types.push(`Baby×${p.seats.baby}`);
    if (p.seats.toddler) types.push(`Toddler×${p.seats.toddler}`);
    if (p.seats.child) types.push(`Child×${p.seats.child}`);
    if (p.seats.booster) types.push(`Booster×${p.seats.booster}`);
    if (types.length) {
      flags.childSeats.push({ name: p.name, types });
    }
    if (p.gatwickInbound) {
      flags.gatwickCount += 1;
    }
    if (p.unknownInboundLocation) {
      flags.unknownLocations.push({
        name: p.name,
        field: "inbound",
        raw: p.inboundDropOffRaw,
      });
    }
    if (p.unknownOutboundLocation) {
      flags.unknownLocations.push({
        name: p.name,
        field: "outbound",
        raw: p.outboundPickUpRaw,
      });
    }
  }

  return flags;
}
