import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections: { title: string; items: string[] }[] = [
  {
    title: "Data & privacy",
    items: [
      "Spreadsheet files (CSV / XLSX) are parsed entirely in the browser; nothing is uploaded to a server.",
      "Coordinator state (passengers, configuration, vehicle/driver assignments, day-of statuses, manual reallocations) is saved in this browser’s local storage, with a short debounce after edits and an optional explicit save on the dashboard.",
      "A new import replaces passenger rows and clears run vehicle/driver assignments and day-of statuses; configuration is updated when you change it and when you save.",
    ],
  },
  {
    title: "Who appears on each shuttle day",
    items: [
      "Tuesday & Wednesday (inbound): passengers must be inbound-eligible, not Gatwick-inbound, have a valid inbound arrival time, and have that day’s inbound flag (Tuesday or Wednesday).",
      "Saturday (outbound): passengers must be outbound-eligible; pickup time is estimated as outbound departure time minus the configured one-way drive minutes, but not earlier than the configured Saturday start time.",
    ],
  },
  {
    title: "Automatic run grouping (greedy)",
    items: [
      "Passengers are sorted by time (and on Saturday by pick-up location order, then time).",
      "A run starts with the next unused passenger. More passengers join the same run if their time is within the grouping window (minutes) of the earliest arrival/pickup in that run, and total group size does not exceed the maximum passenger seats (largest fleet vehicle capacity minus one for the driver).",
      "If a single booking’s group size is at or above that seat limit, it is treated as an oversized group and gets its own run with only that booking.",
      "Run time window on a run is from the earliest to the latest member time in that group.",
      "Grouping rules affect the upload-derived baseline only; several timeline-only settings do not change which passengers are eligible or how this baseline is computed.",
    ],
  },
  {
    title: "Reallocate (“To be allocated”)",
    items: [
      "You can move a booking to another run or to “To be allocated” using Reallocate on the planning list. Choices are keyed per passenger per day.",
      "Reallocate uses the same run keys as the current automatic grouping for that day. If you pick the run the system would have chosen anyway, the manual override is cleared.",
      "Runs with no passengers after moves are hidden from the list, timeline, and day-of (vehicle/driver slots for old keys may remain in storage until reused).",
      "Passengers left unallocated do not appear on the planning timeline or day-of until they are assigned to a run.",
      "If grouping changes (e.g. window or upload) so an override no longer matches a valid run key, the app falls back to the automatic run for that passenger.",
    ],
  },
  {
    title: "Vehicle & driver on runs",
    items: [
      "On the same calendar day (Tuesday, Wednesday, or Saturday), the same van or the same driver (name compared case-insensitively, trimmed) cannot be assigned to two runs whose modeled journeys overlap: from earliest driver departure through end of the return leg given Configuration (travel, buffers, peak), not only the passenger arrival or pick-up spread on the run card.",
      "Conflict checks use that journey span (same model as the planning timeline block height).",
      "In Configuration, vehicle and driver lists each follow the day selector above Planning: Tuesday, Wednesday, and Saturday are edited separately for both. Add vehicle or add driver creates a row for that day only. Trash on a vehicle removes that van for that day and clears it from run assignments; trash on a driver removes that day’s driver row and clears that name from runs for that day when no other roster row for that day still uses the same name.",
      "Assigning a driver on a run also checks they are allowed for the van on that run (vehicle ticks on the driver row, or no restriction if all are ticked). Clearing the driver sets the slot to unassigned.",
      "Schedule (Planning toolbar): clears vehicle and driver on every run for that day, then assigns from the Configuration roster using each driver’s shift window, group size vs van capacity (same seat rule as grouping), and which vehicles each driver may drive. It applies the same overlap rules as manual assignment: overlapping journeys cannot share the same vehicle, and overlapping journeys cannot share the same driver. Among valid choices it prefers more turnaround buffer on the van and on the driver. Needs at least one driver and one vehicle for that day. Runs that still cannot be assigned get an Unscheduled flag on the run card with “resources required” (capacity, time window, modeled journey), why assignment failed with the current roster, and suggested next steps; the flag clears when both vehicle and driver are set manually or a later Schedule succeeds for that day.",
    ],
  },
  {
    title: "Configuration: timing, traffic, buffers",
    items: [
      "Run grouping window (minutes) and maximum seats per run still only affect automatic grouping from the upload, not the timeline math.",
      "Going-leg minutes: one-way drive time for the main airport leg. The planning timeline uses it for both outbound and return legs, multiplied when the leg starts inside a configured peak window (local 24h) by 1 + peak extra percent.",
      "Tuesday/Wednesday only, three buffers apply to the timeline model (not CSV grouping): time from touchdown to airport exit; return leg exit to meet (extra after exit); return leg loading/unloading at the van. Together with the run’s arrival window they set when the outbound target is met, when the return leg can start after the last landing, and the printed driver leave / estimated return on run cards and timeline tiles.",
      "Saturday has no airport exit buffers; the same going-leg minutes and peak scaling still apply to outbound and return drives in the model.",
    ],
  },
  {
    title: "Planning timeline",
    items: [
      "The grid uses the same runs as the planning list after manual placement. Columns are one per vehicle configured for that shuttle day when possible, plus Unassigned if needed, or a single Runs column if there are no vehicles for that day yet.",
      "Each run is a block whose top aligns with the modeled journey start and whose height is the span to modeled journey end, with a small minimum on-screen height so very short model spans stay tappable. That matches the “Driver leave” / “Est. return” (or Saturday “Depart”) text on the tile, so the block should line up with those times on the vertical clock.",
      "Tuesday/Wednesday: outbound targets first landing plus touchdown-to-exit and exit-to-meet; return starts after the last landing plus all three buffers, then the return drive. Saturday: modeled from the pickup window without those airport buffers.",
      "Click a block to scroll that run into view in the list below.",
    ],
  },
  {
    title: "Day-of",
    items: [
      "Shows the same runs as planning for the selected day (after manual placement). Unallocated passengers do not appear.",
      "Run status (pending / departed / completed) is stored per run key and is separate from grouping.",
    ],
  },
  {
    title: "Reset actions (dashboard)",
    items: [
      "Clear import removes passengers, upload flags, row counts, run assignments, and day-of statuses; configuration is kept.",
      "Reset vehicles, drivers & settings restores default fleet and timing; passenger data stays until cleared or re-imported.",
    ],
  },
];

export function LogicPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-semibold text-[#111827] text-2xl tracking-tight">
          Logic
        </h1>
        <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
          Rules the Shuttle Coordinator follows when grouping runs, scaling
          times, assigning resources, and saving state. Wording here is for
          operators; exact behaviour is defined in application code.
        </p>
      </header>
      <div className="space-y-4">
        {sections.map((s) => (
          <Card key={s.title} className="border-[#E5E7EB] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#111827] text-base">{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="list-disc space-y-2 pl-5 text-[#111827] text-sm leading-relaxed">
                {s.items.map((item, i) => (
                  <li key={`${s.title}-${i}`}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
