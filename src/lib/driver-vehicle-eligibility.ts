import type { Driver, ShuttleDay, Vehicle } from "./types";
import { normalizeDriverName } from "./run-resource-conflicts";

export function driverEnabledOnShuttleDay(
  driver: Driver,
  day: ShuttleDay
): boolean {
  return driver.shuttleDay === day;
}

/** Roster lookup for a run: name must match a driver row for that calendar shuttle day. */
export function findDriverByName(
  drivers: Driver[],
  driverName: string,
  day: ShuttleDay
): Driver | null {
  const want = normalizeDriverName(driverName);
  if (!want) return null;
  return (
    drivers
      .filter((d) => d.shuttleDay === day)
      .find((d) => normalizeDriverName(d.name) === want) ?? null
  );
}

export function vehiclesForShuttleDay(
  vehicles: Vehicle[],
  day: ShuttleDay
): Vehicle[] {
  return vehicles.filter((v) => v.shuttleDay === day);
}

export function fleetVehicleIdsForDay(
  vehicles: Vehicle[],
  day: ShuttleDay
): string[] {
  return vehiclesForShuttleDay(vehicles, day).map((v) => v.id);
}

/**
 * `allowedVehicleIds` undefined = may use any vehicle in the fleet.
 * Empty array = none. Otherwise intersection with current fleet ids.
 */
export function effectiveDriverVehicleIds(
  driver: Driver,
  fleetIds: string[]
): string[] {
  if (driver.allowedVehicleIds === undefined) {
    return [...fleetIds];
  }
  return driver.allowedVehicleIds.filter((id) => fleetIds.includes(id));
}

export function driverMayOperateVehicle(
  driver: Driver | null,
  vehicleId: string | null | undefined,
  fleetIds: string[]
): boolean {
  if (!vehicleId) return true;
  if (!driver) return true;
  return effectiveDriverVehicleIds(driver, fleetIds).includes(vehicleId);
}
