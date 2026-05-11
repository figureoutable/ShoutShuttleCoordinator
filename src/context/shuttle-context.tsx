"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultCoordinatorConfig } from "@/lib/default-coordinator-config";
import {
  buildRunsForDay,
  buildRunsForDayWithOverrides,
  passengerRunOverrideKey,
} from "@/lib/grouping";
import {
  driverEnabledOnShuttleDay,
  driverMayOperateVehicle,
  findDriverByName,
  fleetVehicleIdsForDay,
} from "@/lib/driver-vehicle-eligibility";
import {
  findConflictingRunForDriver,
  findConflictingRunForVehicle,
  normalizeDriverName,
  parseShuttleRunKey,
} from "@/lib/run-resource-conflicts";
import { computeAutoScheduleForDay } from "@/lib/auto-schedule-run-resources";
import {
  loadPersistedShuttleBundle,
  normalizeCoordinatorResourceDays,
  persistShuttleBundle,
  sanitizeRunSlotsAgainstFleet,
  type PersistedShuttleBundle,
} from "@/lib/shuttle-persistence";
import type {
  CoordinatorConfig,
  Driver,
  ParseResult,
  Passenger,
  RunScheduleDiagnostic,
  RunSlotState,
  RunStatus,
  ShuttleDay,
  ShuttleRun,
  UploadFlags,
  Vehicle,
} from "@/lib/types";

export type AutoScheduleRunResourcesResult = {
  assigned: number;
  failedRunNumbers: number[];
  skippedReason?: string;
};

interface ShuttleContextValue {
  passengers: Passenger[];
  uploadFlags: UploadFlags | null;
  totalRows: number;
  config: CoordinatorConfig;
  setConfig: React.Dispatch<React.SetStateAction<CoordinatorConfig>>;
  /** Removes this roster row and clears that name on runs for that day only (unless another row shares the name that day). */
  removeDriver: (driver: Driver) => void;
  /** Removes this fleet row for one day, strips its id from driver restrictions, and clears it from any run slots. */
  removeVehicle: (vehicle: Vehicle) => void;
  ingestParse: (result: ParseResult) => void;
  /** Passenger file data and planning assignments (not configuration). */
  clearData: () => void;
  /** Vehicles, drivers, timing, traffic: back to defaults. Keeps passenger data. */
  clearResources: () => void;
  /** Write full bundle to localStorage immediately (also auto-saves after edits). */
  saveToBrowser: () => void;
  runSlots: Record<string, RunSlotState>;
  /**
   * Returns false if that vehicle is already assigned to an overlapping run the same day,
   * or if the run already has a driver who is not allowed to drive that vehicle.
   */
  setRunVehicle: (runKey: string, vehicleId: string | null) => boolean;
  /**
   * Returns false if that driver is already assigned to an overlapping run the same day,
   * or if the run already has a vehicle that driver is not allowed to drive.
   */
  setRunDriver: (runKey: string, driverName: string) => boolean;
  /**
   * Clears vehicle/driver on every run for that day, then assigns from the day’s
   * roster using shift windows, seat capacity, overlap rules, and “can drive” ticks.
   */
  autoScheduleRunResources: (day: ShuttleDay) => AutoScheduleRunResourcesResult;
  /** Auto-schedule failures: requirements and blocking reasons per run key. */
  runScheduleDiagnostics: Record<string, RunScheduleDiagnostic>;
  runStatuses: Record<string, RunStatus>;
  cycleRunStatus: (runKey: string) => void;
  /** Runs after manual passenger placement (empty template runs omitted). */
  getRuns: (day: ShuttleDay) => ShuttleRun[];
  getUnallocatedPassengers: (day: ShuttleDay) => Passenger[];
  /** Greedy baseline runs (keys used for allocation dropdown). */
  getTemplateRuns: (day: ShuttleDay) => ShuttleRun[];
  passengerRunOverrides: Record<string, string>;
  setPassengerRunOverride: (
    day: ShuttleDay,
    passengerId: string,
    targetRunKey: string | null
  ) => void;
  inboundRunCount: number;
  outboundRunCount: number;
}

const ShuttleContext = createContext<ShuttleContextValue | null>(null);

const PERSIST_DEBOUNCE_MS = 300;

export function ShuttleProvider({ children }: { children: ReactNode }) {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [uploadFlags, setUploadFlags] = useState<UploadFlags | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [config, setConfig] = useState<CoordinatorConfig>(() =>
    normalizeCoordinatorResourceDays(defaultCoordinatorConfig())
  );
  const [runSlots, setRunSlots] = useState<Record<string, RunSlotState>>({});
  const [runStatuses, setRunStatuses] = useState<Record<string, RunStatus>>({});
  const [passengerRunOverrides, setPassengerRunOverrides] = useState<
    Record<string, string>
  >({});
  const [runScheduleDiagnostics, setRunScheduleDiagnostics] = useState<
    Record<string, RunScheduleDiagnostic>
  >({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadPersistedShuttleBundle();
    startTransition(() => {
      if (saved) {
        const resolvedConfig = saved.config
          ? normalizeCoordinatorResourceDays(saved.config)
          : null;
        if (resolvedConfig) {
          setConfig(resolvedConfig);
        }
        if (saved.passengers) setPassengers(saved.passengers);
        if (saved.uploadFlags !== undefined) setUploadFlags(saved.uploadFlags);
        if (typeof saved.totalRows === "number") setTotalRows(saved.totalRows);
        if (saved.runSlots) {
          const fleet =
            resolvedConfig?.vehicles ??
            normalizeCoordinatorResourceDays(defaultCoordinatorConfig()).vehicles;
          setRunSlots(sanitizeRunSlotsAgainstFleet(saved.runSlots, fleet));
        }
        if (saved.runStatuses) setRunStatuses(saved.runStatuses);
        if (saved.passengerRunOverrides) {
          setPassengerRunOverrides(saved.passengerRunOverrides);
        }
        if (saved.runScheduleDiagnostics) {
          setRunScheduleDiagnostics(saved.runScheduleDiagnostics);
        }
      }
      setHydrated(true);
    });
  }, []);

  const fleetVehicleIdsKey = useMemo(
    () => config.vehicles.map((v) => v.id).join("|"),
    [config.vehicles]
  );

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setRunSlots((prev) =>
        sanitizeRunSlotsAgainstFleet(prev, config.vehicles)
      );
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, fleetVehicleIdsKey, config.vehicles]);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      const bundle: PersistedShuttleBundle = {
        config,
        passengers,
        uploadFlags,
        totalRows,
        runSlots,
        runStatuses,
        passengerRunOverrides,
        runScheduleDiagnostics,
      };
      persistShuttleBundle(bundle);
    }, PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [
    hydrated,
    config,
    passengers,
    uploadFlags,
    totalRows,
    runSlots,
    runStatuses,
    passengerRunOverrides,
    runScheduleDiagnostics,
  ]);

  const ingestParse = useCallback((result: ParseResult) => {
    setPassengers(result.passengers);
    setUploadFlags(result.flags);
    setTotalRows(result.totalRows);
    setRunSlots({});
    setRunStatuses({});
    setPassengerRunOverrides({});
    setRunScheduleDiagnostics({});
  }, []);

  const clearData = useCallback(() => {
    setPassengers([]);
    setUploadFlags(null);
    setTotalRows(0);
    setRunSlots({});
    setRunStatuses({});
    setPassengerRunOverrides({});
    setRunScheduleDiagnostics({});
  }, []);

  const clearResources = useCallback(() => {
    setConfig(normalizeCoordinatorResourceDays(defaultCoordinatorConfig()));
  }, []);

  const removeVehicle = useCallback((vehicle: Vehicle) => {
    setConfig((c) => ({
      ...c,
      vehicles: c.vehicles.filter((x) => x.id !== vehicle.id),
      drivers: c.drivers.map((d) => ({
        ...d,
        allowedVehicleIds:
          d.allowedVehicleIds === undefined
            ? undefined
            : d.allowedVehicleIds.filter((vid) => vid !== vehicle.id),
      })),
    }));
    setRunSlots((prev) => {
      const next = { ...prev };
      for (const [k, slot] of Object.entries(prev)) {
        if (slot.vehicleId !== vehicle.id) continue;
        next[k] = { ...slot, vehicleId: null };
      }
      return next;
    });
  }, []);

  const removeDriver = useCallback(
    (driver: Driver) => {
      const hasDup = config.drivers.some(
        (x) =>
          x.id !== driver.id &&
          x.shuttleDay === driver.shuttleDay &&
          normalizeDriverName(x.name) === normalizeDriverName(driver.name)
      );
      setConfig((c) => ({
        ...c,
        drivers: c.drivers.filter((x) => x.id !== driver.id),
      }));
      if (!hasDup) {
        setRunSlots((prev) => {
          const next = { ...prev };
          for (const [k, slot] of Object.entries(prev)) {
            const p = parseShuttleRunKey(k);
            if (!p || p.day !== driver.shuttleDay) continue;
            if (
              normalizeDriverName(slot.driverName) !==
              normalizeDriverName(driver.name)
            ) {
              continue;
            }
            next[k] = { ...slot, driverName: "" };
          }
          return next;
        });
      }
    },
    [config.drivers]
  );

  const saveToBrowser = useCallback(() => {
    persistShuttleBundle({
      config,
      passengers,
      uploadFlags,
      totalRows,
      runSlots,
      runStatuses,
      passengerRunOverrides,
      runScheduleDiagnostics,
    });
  }, [
    config,
    passengers,
    uploadFlags,
    totalRows,
    runSlots,
    runStatuses,
    passengerRunOverrides,
    runScheduleDiagnostics,
  ]);

  const getTemplateRuns = useCallback(
    (day: ShuttleDay) => buildRunsForDay(passengers, day, config),
    [passengers, config]
  );

  const getRuns = useCallback(
    (day: ShuttleDay) =>
      buildRunsForDayWithOverrides(passengers, day, config, passengerRunOverrides)
        .runs,
    [passengers, config, passengerRunOverrides]
  );

  const getUnallocatedPassengers = useCallback(
    (day: ShuttleDay) =>
      buildRunsForDayWithOverrides(passengers, day, config, passengerRunOverrides)
        .unallocated,
    [passengers, config, passengerRunOverrides]
  );

  const setPassengerRunOverride = useCallback(
    (day: ShuttleDay, passengerId: string, targetRunKey: string | null) => {
      const mapKey = passengerRunOverrideKey(day, passengerId);
      setPassengerRunOverrides((prev) => {
        const next = { ...prev };
        if (targetRunKey == null) {
          delete next[mapKey];
        } else {
          next[mapKey] = targetRunKey;
        }
        return next;
      });
    },
    []
  );

  const setRunVehicle = useCallback(
    (runKey: string, vehicleId: string | null): boolean => {
      const parsed = parseShuttleRunKey(runKey);
      if (!parsed) return false;
      const runs = getRuns(parsed.day);
      const target = runs.find((r) => r.key === runKey);
      if (!target) return false;

      if (vehicleId) {
        const van = config.vehicles.find((v) => v.id === vehicleId);
        if (!van || van.shuttleDay !== parsed.day) return false;
        const conflict = findConflictingRunForVehicle(
          target,
          runs,
          runSlots,
          vehicleId,
          parsed.day,
          config
        );
        if (conflict) return false;
        const fleetIds = fleetVehicleIdsForDay(config.vehicles, parsed.day);
        const driver = findDriverByName(
          config.drivers,
          runSlots[runKey]?.driverName ?? "",
          parsed.day
        );
        if (
          !driverMayOperateVehicle(driver, vehicleId, fleetIds) ||
          (driver && !driverEnabledOnShuttleDay(driver, parsed.day))
        ) {
          return false;
        }
      }

      const nextDriver = runSlots[runKey]?.driverName ?? "";
      setRunSlots((prev) => ({
        ...prev,
        [runKey]: {
          vehicleId,
          driverName: prev[runKey]?.driverName ?? "",
        },
      }));
      if (vehicleId && nextDriver.trim()) {
        setRunScheduleDiagnostics((d) => {
          if (!d[runKey]) return d;
          const n = { ...d };
          delete n[runKey];
          return n;
        });
      }
      return true;
    },
    [getRuns, runSlots, config]
  );

  const setRunDriver = useCallback(
    (runKey: string, driverName: string): boolean => {
      const parsed = parseShuttleRunKey(runKey);
      if (!parsed) return false;
      const runs = getRuns(parsed.day);
      const target = runs.find((r) => r.key === runKey);
      if (!target) return false;

      const trimmed = driverName.trim();
      if (!trimmed) {
        setRunSlots((prev) => ({
          ...prev,
          [runKey]: {
            vehicleId: prev[runKey]?.vehicleId ?? null,
            driverName: "",
          },
        }));
        return true;
      }

      const conflict = findConflictingRunForDriver(
        target,
        runs,
        runSlots,
        trimmed,
        parsed.day,
        config
      );
      if (conflict) return false;

      const fleetIds = fleetVehicleIdsForDay(config.vehicles, parsed.day);
      const vehicleId = runSlots[runKey]?.vehicleId;
      const driver = findDriverByName(config.drivers, trimmed, parsed.day);
      if (
        !driver ||
        !driverEnabledOnShuttleDay(driver, parsed.day) ||
        !driverMayOperateVehicle(driver, vehicleId, fleetIds)
      ) {
        return false;
      }

      const vid = runSlots[runKey]?.vehicleId ?? null;
      setRunSlots((prev) => ({
        ...prev,
        [runKey]: {
          vehicleId: prev[runKey]?.vehicleId ?? null,
          driverName: trimmed,
        },
      }));
      if (vid && trimmed) {
        setRunScheduleDiagnostics((d) => {
          if (!d[runKey]) return d;
          const n = { ...d };
          delete n[runKey];
          return n;
        });
      }
      return true;
    },
    [getRuns, runSlots, config]
  );

  const autoScheduleRunResources = useCallback(
    (day: ShuttleDay): AutoScheduleRunResourcesResult => {
      const drivers = config.drivers.filter((d) => d.shuttleDay === day);
      const vehicles = config.vehicles.filter((v) => v.shuttleDay === day);
      if (drivers.length === 0 || vehicles.length === 0) {
        return {
          assigned: 0,
          failedRunNumbers: [],
          skippedReason:
            "Add at least one driver and one vehicle for this day in Configuration (above).",
        };
      }
      const runs = getRuns(day);
      if (runs.length === 0) {
        return {
          assigned: 0,
          failedRunNumbers: [],
          skippedReason: "No runs for this day yet.",
        };
      }

      let summary: AutoScheduleRunResourcesResult = {
        assigned: 0,
        failedRunNumbers: [],
      };
      let diagnosticsFromRun: Record<string, RunScheduleDiagnostic> = {};
      setRunSlots((prev) => {
        const computed = computeAutoScheduleForDay(
          day,
          runs,
          drivers,
          vehicles,
          config,
          prev
        );
        diagnosticsFromRun = computed.diagnosticsByRunKey;
        summary = {
          assigned: computed.assignedCount,
          failedRunNumbers: [...computed.failedRunNumbers],
        };
        const next = { ...prev };
        for (const run of runs) {
          next[run.key] = computed.runSlotsPatch[run.key] ?? {
            vehicleId: null,
            driverName: "",
          };
        }
        return next;
      });
      setRunScheduleDiagnostics((dPrev) => {
        const next = { ...dPrev };
        for (const k of Object.keys(next)) {
          if (parseShuttleRunKey(k)?.day === day) {
            delete next[k];
          }
        }
        for (const [k, diag] of Object.entries(diagnosticsFromRun)) {
          next[k] = diag;
        }
        return next;
      });
      return summary;
    },
    [config, getRuns]
  );

  const cycleRunStatus = useCallback((runKey: string) => {
    setRunStatuses((prev) => {
      const cur = prev[runKey] ?? "pending";
      const next: RunStatus =
        cur === "pending" ? "departed" : cur === "departed" ? "completed" : "pending";
      return { ...prev, [runKey]: next };
    });
  }, []);

  const tuesdayRuns = useMemo(
    () =>
      buildRunsForDayWithOverrides(
        passengers,
        "tuesday",
        config,
        passengerRunOverrides
      ).runs,
    [passengers, config, passengerRunOverrides]
  );
  const wedRuns = useMemo(
    () =>
      buildRunsForDayWithOverrides(
        passengers,
        "wednesday",
        config,
        passengerRunOverrides
      ).runs,
    [passengers, config, passengerRunOverrides]
  );
  const satRuns = useMemo(
    () =>
      buildRunsForDayWithOverrides(
        passengers,
        "saturday",
        config,
        passengerRunOverrides
      ).runs,
    [passengers, config, passengerRunOverrides]
  );

  const inboundRunCount = tuesdayRuns.length + wedRuns.length;
  const outboundRunCount = satRuns.length;

  const value = useMemo<ShuttleContextValue>(
    () => ({
      passengers,
      uploadFlags,
      totalRows,
      config,
      setConfig,
      removeDriver,
      removeVehicle,
      ingestParse,
      clearData,
      clearResources,
      saveToBrowser,
      runSlots,
      setRunVehicle,
      setRunDriver,
      autoScheduleRunResources,
      runScheduleDiagnostics,
      runStatuses,
      cycleRunStatus,
      getRuns,
      getUnallocatedPassengers,
      getTemplateRuns,
      passengerRunOverrides,
      setPassengerRunOverride,
      inboundRunCount,
      outboundRunCount,
    }),
    [
      passengers,
      uploadFlags,
      totalRows,
      config,
      setConfig,
      removeDriver,
      removeVehicle,
      ingestParse,
      clearData,
      clearResources,
      saveToBrowser,
      runSlots,
      setRunVehicle,
      setRunDriver,
      autoScheduleRunResources,
      runScheduleDiagnostics,
      runStatuses,
      cycleRunStatus,
      getRuns,
      getUnallocatedPassengers,
      getTemplateRuns,
      passengerRunOverrides,
      setPassengerRunOverride,
      inboundRunCount,
      outboundRunCount,
    ]
  );

  return (
    <ShuttleContext.Provider value={value}>{children}</ShuttleContext.Provider>
  );
}

export function useShuttle() {
  const ctx = useContext(ShuttleContext);
  if (!ctx) {
    throw new Error("useShuttle must be used within ShuttleProvider");
  }
  return ctx;
}
