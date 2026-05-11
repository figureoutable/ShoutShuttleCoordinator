import {
  driverMayOperateVehicle,
  fleetVehicleIdsForDay,
} from "@/lib/driver-vehicle-eligibility";
import { formatWindowNoHourPad, totalPaxInRun } from "@/lib/grouping";
import {
  findConflictingRunForDriver,
  findConflictingRunForVehicle,
  normalizeDriverName,
  parseShuttleRunKey,
} from "@/lib/run-resource-conflicts";
import {
  computeRunTimelineJourney,
  runDriverTimingLabels,
} from "@/lib/timeline-journey";
import { parseClockToMinutes } from "@/lib/time";
import type {
  CoordinatorConfig,
  Driver,
  RunScheduleDiagnostic,
  RunSlotState,
  ShuttleDay,
  ShuttleRun,
  Vehicle,
} from "@/lib/types";

export type AutoScheduleResult = {
  runSlotsPatch: Record<string, RunSlotState>;
  assignedCount: number;
  failedRunNumbers: number[];
  diagnosticsByRunKey: Record<string, RunScheduleDiagnostic>;
};

/** Build operator-facing copy for a run auto-schedule could not place. */
export function explainScheduleFailure(
  run: ShuttleRun,
  day: ShuttleDay,
  runs: ShuttleRun[],
  work: Record<string, RunSlotState>,
  drivers: Driver[],
  vehicles: Vehicle[],
  config: CoordinatorConfig
): RunScheduleDiagnostic {
  const pax = totalPaxInRun(run);
  const fleetIds = fleetVehicleIdsForDay(vehicles, day);
  const timing = runDriverTimingLabels(run, day, config);
  const windowLabel =
    day === "saturday" ? "Passenger pick-up window" : "Passenger arrival window";

  const requirements: string[] = [
    `${pax} passengers: vehicle must have at least ${pax + 1} total seats (including driver).`,
    `${windowLabel}: ${formatWindowNoHourPad(run)}.`,
  ];
  if (timing) {
    requirements.push(
      `Modeled journey (used for overlap checks): about ${timing.leave}–${timing.returnAt}.`
    );
  }

  const blockingReasons: string[] = [];
  const suggestedActions: string[] = [];

  const fittingVehicles = vehicles.filter(
    (v) => pax <= Math.max(0, v.capacity - 1)
  );

  if (fittingVehicles.length === 0) {
    blockingReasons.push(
      `No vehicle on this day’s roster has enough seats (need capacity ≥ ${pax + 1}).`
    );
    suggestedActions.push(
      "Add a larger van for this day in Configuration, split the group across runs, or reallocate passengers."
    );
    return {
      unscheduled: true,
      runNumber: run.runNumber,
      shuttleDay: day,
      requirements,
      blockingReasons,
      suggestedActions,
    };
  }

  const vansWithoutVehicleOverlap = fittingVehicles.filter(
    (v) => !findConflictingRunForVehicle(run, runs, work, v.id, day, config)
  );

  if (vansWithoutVehicleOverlap.length === 0) {
    blockingReasons.push(
      "Every van that fits this group is already assigned to another run whose journey overlaps this run (same van cannot cover two overlapping journeys)."
    );
    suggestedActions.push(
      "Move another run to a different van, add a van for this day, or adjust timing if trips can be staggered."
    );
    return {
      unscheduled: true,
      runNumber: run.runNumber,
      shuttleDay: day,
      requirements,
      blockingReasons,
      suggestedActions,
    };
  }

  const driversInShift = drivers.filter((d) => driverShiftCoversRun(d, run));
  if (driversInShift.length === 0) {
    blockingReasons.push(
      "No driver’s shift (shift from / shift to) fully covers this run’s passenger time window."
    );
    suggestedActions.push(
      "Widen a driver’s shift for this day or split the run so each part fits a shift."
    );
    return {
      unscheduled: true,
      runNumber: run.runNumber,
      shuttleDay: day,
      requirements,
      blockingReasons,
      suggestedActions,
    };
  }

  let anyLegalPair = false;
  for (const vehicle of vansWithoutVehicleOverlap) {
    for (const driver of driversInShift) {
      if (!driverMayOperateVehicle(driver, vehicle.id, fleetIds)) continue;
      if (findConflictingRunForDriver(run, runs, work, driver.name, day, config))
        continue;
      anyLegalPair = true;
      break;
    }
    if (anyLegalPair) break;
  }

  if (!anyLegalPair) {
    const anyAllowedVan = driversInShift.some((d) =>
      vansWithoutVehicleOverlap.some((v) =>
        driverMayOperateVehicle(d, v.id, fleetIds)
      )
    );
    if (!anyAllowedVan) {
      blockingReasons.push(
        "No driver on shift is ticked to drive any van that fits this group and is free of vehicle overlap."
      );
      suggestedActions.push(
        "In Configuration, under each driver, tick the vans they may use, or add a driver who can use an available van."
      );
    } else {
      blockingReasons.push(
        "Every driver who is allowed on an available van is already assigned to another run whose journey overlaps this one (same driver cannot cover two overlapping journeys)."
      );
      suggestedActions.push(
        "Add or enable another driver for this day, move overlapping runs to different resources, or assign this run manually."
      );
    }
  }

  if (suggestedActions.length === 0) {
    suggestedActions.push(
      "Review Configuration (drivers, vans, shifts, can drive) or assign vehicle and driver manually on this card."
    );
  }

  return {
    unscheduled: true,
    runNumber: run.runNumber,
    shuttleDay: day,
    requirements,
    blockingReasons,
    suggestedActions,
  };
}

function runMinutesInOvernightShiftWindow(
  runStart: number,
  runEnd: number,
  shiftStart: number,
  shiftEnd: number
): boolean {
  if (runEnd <= runStart) return false;
  const evening = runStart >= shiftStart && runEnd <= 24 * 60;
  const morning = runStart >= 0 && runEnd <= shiftEnd;
  return evening || morning;
}

/** True if the run’s passenger time window lies fully inside the driver’s shift. */
export function driverShiftCoversRun(driver: Driver, run: ShuttleRun): boolean {
  const s = parseClockToMinutes(driver.shiftStart.trim());
  const e = parseClockToMinutes(driver.shiftEnd.trim());
  if (e > s) {
    return run.startMinutes >= s && run.endMinutes <= e;
  }
  if (e === s) return false;
  return runMinutesInOvernightShiftWindow(
    run.startMinutes,
    run.endMinutes,
    s,
    e
  );
}

function journeyBounds(
  run: ShuttleRun,
  day: ShuttleDay,
  config: CoordinatorConfig
): { start: number; end: number } {
  const j = computeRunTimelineJourney(run, day, config);
  if (!j) return { start: run.startMinutes, end: run.endMinutes };
  return { start: j.displayStart, end: j.displayEnd };
}

/**
 * Minutes from the end of the latest prior journey on this vehicle (same day, already
 * in `work`) to this run’s journey start. Infinity if the van has no earlier assignment.
 */
function turnaroundGapOnVehicle(
  vehicleId: string,
  targetRun: ShuttleRun,
  allRuns: ShuttleRun[],
  work: Record<string, RunSlotState>,
  day: ShuttleDay,
  config: CoordinatorConfig
): number {
  const { start: t0 } = journeyBounds(targetRun, day, config);
  let lastEnd: number | null = null;
  for (const r of allRuns) {
    if (r.key === targetRun.key) continue;
    if (work[r.key]?.vehicleId !== vehicleId) continue;
    const { end } = journeyBounds(r, day, config);
    if (end <= t0 && (lastEnd === null || end > lastEnd)) {
      lastEnd = end;
    }
  }
  if (lastEnd === null) return Number.POSITIVE_INFINITY;
  return t0 - lastEnd;
}

/** Same for driver name (normalized match). */
function turnaroundGapOnDriver(
  driverName: string,
  targetRun: ShuttleRun,
  allRuns: ShuttleRun[],
  work: Record<string, RunSlotState>,
  day: ShuttleDay,
  config: CoordinatorConfig
): number {
  const want = normalizeDriverName(driverName);
  if (!want) return Number.NEGATIVE_INFINITY;
  const { start: t0 } = journeyBounds(targetRun, day, config);
  let lastEnd: number | null = null;
  for (const r of allRuns) {
    if (r.key === targetRun.key) continue;
    const d = normalizeDriverName(work[r.key]?.driverName ?? "");
    if (d !== want) continue;
    const { end } = journeyBounds(r, day, config);
    if (end <= t0 && (lastEnd === null || end > lastEnd)) {
      lastEnd = end;
    }
  }
  if (lastEnd === null) return Number.POSITIVE_INFINITY;
  return t0 - lastEnd;
}

/** Stable sort key so Infinity does not break comparator (Infinity − Infinity is NaN). */
function gapRank(g: number): number {
  if (g === Number.POSITIVE_INFINITY) return 1_000_000;
  if (g === Number.NEGATIVE_INFINITY) return -1_000_000;
  return g;
}

/**
 * Greedy assignment: largest groups first. Among valid (vehicle, driver) pairs,
 * prefers **more turnaround buffer**: time from the previous journey end on that van
 * and on that driver to this run’s journey start (spreads load across vans when another
 * van has been idle longer).
 *
 * **Non-overlap (same as manual Planning):** uses journey windows (driver leave through
 * estimated return from Configuration), not only passenger arrival/pickup spread.
 *
 * 1. **Same vehicle:** two runs that overlap in time cannot share a vehicle id.
 * 2. **Same driver:** two runs that overlap in time cannot share a driver (name match).
 *
 * Also enforces shift windows, seat capacity (pax ≤ capacity − 1), and “can drive” ticks.
 */
export function computeAutoScheduleForDay(
  day: ShuttleDay,
  runs: ShuttleRun[],
  drivers: Driver[],
  vehicles: Vehicle[],
  config: CoordinatorConfig,
  existingSlots: Record<string, RunSlotState>
): AutoScheduleResult {
  const fleetIds = fleetVehicleIdsForDay(vehicles, day);

  const work: Record<string, RunSlotState> = { ...existingSlots };
  for (const key of Object.keys(work)) {
    const p = parseShuttleRunKey(key);
    if (p?.day === day) {
      work[key] = { vehicleId: null, driverName: "" };
    }
  }

  const sortedRuns = [...runs].sort((a, b) => {
    const pa = totalPaxInRun(a);
    const pb = totalPaxInRun(b);
    if (pb !== pa) return pb - pa;
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.runNumber - b.runNumber;
  });

  const driversSorted = [...drivers].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  let assignedCount = 0;
  const failedRunNumbers: number[] = [];
  const diagnosticsByRunKey: Record<string, RunScheduleDiagnostic> = {};

  for (const run of sortedRuns) {
    const pax = totalPaxInRun(run);
    const fittingVehicles = vehicles.filter(
      (v) => pax <= Math.max(0, v.capacity - 1)
    );

    type Cand = {
      vehicle: Vehicle;
      driver: Driver;
      vehicleGap: number;
      driverGap: number;
    };
    const candidates: Cand[] = [];

    for (const vehicle of fittingVehicles) {
      if (findConflictingRunForVehicle(run, runs, work, vehicle.id, day, config))
        continue;
      const vehicleGap = turnaroundGapOnVehicle(
        vehicle.id,
        run,
        runs,
        work,
        day,
        config
      );
      for (const driver of driversSorted) {
        if (!driverShiftCoversRun(driver, run)) continue;
        if (!driverMayOperateVehicle(driver, vehicle.id, fleetIds)) continue;
        if (findConflictingRunForDriver(run, runs, work, driver.name, day, config))
          continue;
        const driverGap = turnaroundGapOnDriver(
          driver.name,
          run,
          runs,
          work,
          day,
          config
        );
        candidates.push({ vehicle, driver, vehicleGap, driverGap });
      }
    }

    candidates.sort((a, b) => {
      const vg = gapRank(b.vehicleGap) - gapRank(a.vehicleGap);
      if (vg !== 0) return vg;
      const dg = gapRank(b.driverGap) - gapRank(a.driverGap);
      if (dg !== 0) return dg;
      if (a.vehicle.capacity !== b.vehicle.capacity) {
        return a.vehicle.capacity - b.vehicle.capacity;
      }
      const vn = a.vehicle.name.localeCompare(b.vehicle.name, undefined, {
        sensitivity: "base",
      });
      if (vn !== 0) return vn;
      return a.driver.name.localeCompare(b.driver.name, undefined, {
        sensitivity: "base",
      });
    });

    const best = candidates[0];
    if (best) {
      work[run.key] = {
        vehicleId: best.vehicle.id,
        driverName: best.driver.name.trim(),
      };
      assignedCount += 1;
    } else {
      failedRunNumbers.push(run.runNumber);
      diagnosticsByRunKey[run.key] = explainScheduleFailure(
        run,
        day,
        runs,
        work,
        drivers,
        vehicles,
        config
      );
    }
  }

  const runSlotsPatch: Record<string, RunSlotState> = {};
  for (const run of runs) {
    runSlotsPatch[run.key] = work[run.key] ?? {
      vehicleId: null,
      driverName: "",
    };
  }

  return { runSlotsPatch, assignedCount, failedRunNumbers, diagnosticsByRunKey };
}
