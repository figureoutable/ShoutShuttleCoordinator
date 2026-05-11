import type {
  CoordinatorConfig,
  Driver,
  ShuttleDay,
  TimelineTrafficSettings,
  Vehicle,
} from "./types";
import { defaultShuttleDays } from "./shuttle-days";

export function defaultTimelineTraffic(): TimelineTrafficSettings {
  return {
    peakExtraPercent: 20,
    peakWindows: [
      { start: "07:00", end: "09:30" },
      { start: "16:00", end: "19:00" },
    ],
  };
}

export function defaultVehicles(): Vehicle[] {
  const rows = (id: string, name: string, day: ShuttleDay): Vehicle => ({
    id,
    name,
    type: "Van",
    capacity: 9,
    shuttleDay: day,
  });
  return [
    rows("van-1-tue", "Van 1", "tuesday"),
    rows("van-1-wed", "Van 1", "wednesday"),
    rows("van-1-sat", "Van 1", "saturday"),
    rows("van-2-tue", "Van 2", "tuesday"),
    rows("van-2-wed", "Van 2", "wednesday"),
    rows("van-2-sat", "Van 2", "saturday"),
  ];
}

export function defaultDrivers(): Driver[] {
  return [
    {
      id: "driver-1-tue",
      name: "Driver 1",
      shuttleDay: "tuesday",
      shiftStart: "06:00",
      shiftEnd: "22:00",
    },
    {
      id: "driver-1-wed",
      name: "Driver 1",
      shuttleDay: "wednesday",
      shiftStart: "06:00",
      shiftEnd: "22:00",
    },
    {
      id: "driver-1-sat",
      name: "Driver 1",
      shuttleDay: "saturday",
      shiftStart: "06:00",
      shiftEnd: "22:00",
    },
    {
      id: "driver-2-tue",
      name: "Driver 2",
      shuttleDay: "tuesday",
      shiftStart: "07:00",
      shiftEnd: "20:00",
    },
    {
      id: "driver-2-wed",
      name: "Driver 2",
      shuttleDay: "wednesday",
      shiftStart: "07:00",
      shiftEnd: "20:00",
    },
  ];
}

export function defaultCoordinatorConfig(): CoordinatorConfig {
  return {
    shuttleDays: defaultShuttleDays(),
    groupingWindowMinutes: 90,
    saturdayStartTime: "08:00",
    travelTimeToHeathrowMinutes: 40,
    touchdownToAirportExitMinutes: 30,
    inboundAirportExitWaitMinutes: 0,
    inboundHandoverBufferMinutes: 15,
    timelineTraffic: defaultTimelineTraffic(),
    vehicles: defaultVehicles(),
    drivers: defaultDrivers(),
  };
}
