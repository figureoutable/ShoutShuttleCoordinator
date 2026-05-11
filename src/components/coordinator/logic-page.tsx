import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections: { title: string; items: string[] }[] = [
  {
    title: "Data & storage",
    items: [
      "Imports (.csv, .xls, .xlsx) are parsed in the browser only—nothing is sent to a server.",
      "State (passengers, config, run vehicle/driver picks, overrides, day-of statuses, schedule diagnostics) persists in this browser’s local storage, with a short debounce after edits; Dashboard has Save to browser for an immediate flush.",
      "A new import replaces passenger data and clears run assignments, manual reallocations, day-of statuses, and auto-schedule diagnostics. Configuration changes when you edit Configuration or reset it.",
    ],
  },
  {
    title: "Who appears each day",
    items: [
      "Inbound days (tabs from Planning → Add day): inbound-eligible, not Gatwick-inbound, valid inbound arrival time, and an arrival-date cell that matches that inbound day’s rules in your saved configuration (case-insensitive).",
      "Outbound day (exactly one): outbound-eligible with a computable pick-up time (departure minus configured drive time, floored by the “earliest pick-up” clock in Configuration).",
    ],
  },
  {
    title: "Automatic run grouping",
    items: [
      "Greedy grouping from the spreadsheet: passengers ordered by time (outbound day: pick-up stop order, then time).",
      "Others join a run if they fall within the grouping window (minutes) of that run’s earliest time and total group size fits the largest van rostered that day minus one seat for the driver.",
      "A booking whose group size alone hits that passenger cap gets its own run (solo).",
      "Run window on the card is earliest → latest member time. Grouping drives the baseline template; several timeline-only settings do not change who is grouped.",
    ],
  },
  {
    title: "Reallocate & “To be allocated”",
    items: [
      "Planning list: move a booking to another run or To be allocated; overrides are per passenger per day.",
      "Choosing the run the baseline would use anyway clears the override. Invalid keys after a re-import fall back to the automatic run.",
      "Empty runs disappear from list, timeline, and day-of; unallocated passengers are hidden there until placed on a run.",
    ],
  },
  {
    title: "Vehicles, drivers & Schedule",
    items: [
      "Fleet and roster are edited per shuttle day tab in Configuration. Removing a van or driver row clears it from assignments where it applied.",
      "Manual picks respect driver ↔ van “allowed” ticks (all ticked = any van that day). Same van or same driver (name, case-insensitive) cannot cover two runs whose modeled journeys overlap that day.",
      "Overlap uses the full modeled journey (driver leave through estimated return), same math as the timeline—not only the passenger time band on the card.",
      "Schedule (Planning): clears every run’s vehicle and driver for that day, then auto-assigns from the roster using shifts, capacity, allowed vans, and those overlap rules; among valid pairs it balances drivers first (fewer runs, then less journey time that day), then balances vans the same way, then prefers drivers and vans that have been idle longer (turnaround gaps).",
      "If a run still cannot be fully assigned, the run card shows Unscheduled with requirements, blocking reasons, and suggestions until you assign both manually or a later Schedule succeeds.",
    ],
  },
  {
    title: "Configuration vs timeline",
    items: [
      "Grouping window and seat cap come from fleet capacity for that day; they affect upload-based grouping, not the timeline traffic model by themselves.",
      "Going-leg minutes and peak windows scale drive times on the timeline. Inbound days add touchdown-to-exit, exit-to-meet, and handover buffers for the modeled inbound/return legs; the outbound day uses the pick-up window without those airport buffers.",
    ],
  },
  {
    title: "Planning timeline & day-of",
    items: [
      "Timeline columns follow that day’s vehicles (with fallbacks); each run block’s vertical position and height match the modeled journey so it lines up with Driver leave / Est. return (or Saturday depart). Click a block to scroll that run in the list.",
      "Day-of shows the same runs for the selected day; unallocated passengers are omitted. Run status (pending → departed → completed) is per run key, independent of grouping.",
    ],
  },
  {
    title: "Dashboard resets",
    items: [
      "Clear import & run assignments: removes passengers, flags, counts, slots, overrides, statuses, and schedule diagnostics—keeps configuration.",
      "Reset vehicles, drivers & settings: restores default fleet and timing; passenger import stays until cleared or replaced.",
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
          Operator-facing summary of how the app groups runs, models times,
          assigns resources, and saves state. For edge cases, behaviour in code
          wins.
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
