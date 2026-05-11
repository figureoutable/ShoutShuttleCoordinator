import { runsOverlapJourney } from "./timeline-journey";
import type {
  CoordinatorConfig,
  RunSlotState,
  ShuttleDay,
  ShuttleRun,
} from "./types";

export function normalizeDriverName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Another run whose journey overlaps this one and already has this vehicle. */
export function findConflictingRunForVehicle(
  targetRun: ShuttleRun,
  allDayRuns: ShuttleRun[],
  runSlots: Record<string, RunSlotState>,
  vehicleId: string,
  day: ShuttleDay,
  config: CoordinatorConfig
): ShuttleRun | null {
  for (const other of allDayRuns) {
    if (other.key === targetRun.key) continue;
    if (!runsOverlapJourney(targetRun, other, day, config)) continue;
    if (runSlots[other.key]?.vehicleId === vehicleId) return other;
  }
  return null;
}

/** Another run whose journey overlaps this one and already has this driver (name match). */
export function findConflictingRunForDriver(
  targetRun: ShuttleRun,
  allDayRuns: ShuttleRun[],
  runSlots: Record<string, RunSlotState>,
  driverName: string,
  day: ShuttleDay,
  config: CoordinatorConfig
): ShuttleRun | null {
  const want = normalizeDriverName(driverName);
  if (!want) return null;
  for (const other of allDayRuns) {
    if (other.key === targetRun.key) continue;
    if (!runsOverlapJourney(targetRun, other, day, config)) continue;
    const otherDriver = normalizeDriverName(runSlots[other.key]?.driverName ?? "");
    if (otherDriver && otherDriver === want) return other;
  }
  return null;
}

export { parseShuttleRunKey } from "./shuttle-days";
