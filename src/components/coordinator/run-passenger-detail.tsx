import type { ReactNode } from "react";
import { childSeatBadgeLabel } from "@/lib/grouping";
import type { Passenger, ShuttleDay } from "@/lib/types";
import { cn } from "@/lib/utils";

export function formatFlightCode(airline: string, flight: string): string {
  const a = airline.trim();
  const f = flight.trim();
  if (!a && !f) return "-";
  if (!f) return a;
  if (!a) return f;
  const normF = f.replace(/\s+/g, "").toUpperCase();
  const prefix = a.replace(/\s+/g, "").toUpperCase().slice(0, 2);
  if (prefix && normF.startsWith(prefix)) return f;
  return `${a} ${f}`.replace(/\s+/g, " ").trim();
}

function dashIfEmpty(s: string): string {
  const t = s.trim();
  return t || "-";
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:text-sm">
        {label}
      </span>
      {value ? (
        <span className="min-w-0 text-xs font-semibold text-[#111827] leading-snug sm:text-sm">
          {value}
        </span>
      ) : null}
    </div>
  );
}

export function RunPassengerDetailBlock({
  passenger: p,
  day,
  className,
  variant = "default",
  allocationControl,
}: {
  passenger: Passenger;
  day: ShuttleDay;
  className?: string;
  /** Planning: full brand on run card outer border; pastel left accent here. */
  variant?: "default" | "planning";
  /** Renders inside this card (e.g. run placement on the planning list). */
  allocationControl?: ReactNode;
}) {
  const inbound = day === "tuesday" || day === "wednesday";
  const seats = childSeatBadgeLabel(p);

  const flight = inbound
    ? formatFlightCode(p.airline, p.inboundFlight)
    : formatFlightCode(p.outboundAirline, p.outboundFlight);

  const timeLabel = inbound ? "Est. arrival" : "Est. departure";
  const timeValue = inbound
    ? dashIfEmpty(p.inboundArrivalLabel)
    : dashIfEmpty(p.outboundDepartureLabel);

  const locationLine = inbound ? p.inboundDropOffCanonical : p.outboundPickUpCanonical;
  const locationTitle = inbound ? "Shuttle drop-off" : "Pick-up";

  return (
    <div
      className={cn(
        "break-inside-avoid rounded-lg p-[calc(0.75rem*0.935)] text-xs sm:text-sm",
        variant === "planning"
          ? "border border-[#E5E7EB] border-l-4 border-l-primary/45 bg-white pl-[calc(0.875rem*0.935)]"
          : "border border-[#E5E7EB] bg-[#F9FAFB]/60",
        className
      )}
    >
      <div className="grid gap-x-4 gap-y-[calc(0.75rem*0.935)] sm:grid-cols-2 sm:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col gap-y-[calc(0.5rem*0.935)]">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:text-sm">
              Passenger(s)
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-2 text-xs leading-snug sm:text-sm">
              <span className="font-semibold text-[#111827]">{p.name}</span>
              {p.spouseName ? (
                <span className="font-semibold text-[#111827]">
                  &amp; {p.spouseName}
                </span>
              ) : null}
              {seats ? (
                <span
                  title={seats}
                  className="text-xs leading-none sm:text-sm"
                  aria-label={seats}
                >
                  🧒
                </span>
              ) : null}
            </span>
          </div>
          <DetailItem label="No. of people" value={String(p.groupSize)} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-[calc(0.25rem*0.935)] text-left">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:text-sm">
              Flight
            </span>
            <span className="min-w-0 text-xs font-semibold leading-snug text-[#111827] sm:text-sm">
              {flight}
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:text-sm">
              {timeLabel}
            </span>
            <span className="min-w-0 text-xs font-semibold leading-snug text-[#111827] tabular-nums sm:text-sm">
              {timeValue}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-[calc(1rem*0.935)] grid grid-cols-1 gap-[calc(1rem*0.935)] border-[#E5E7EB] border-t pt-[calc(0.75rem*0.935)] sm:grid-cols-2 sm:items-center">
        {allocationControl ? (
          <div className="flex min-h-0 min-w-0 items-center">{allocationControl}</div>
        ) : null}
        <p
          className={cn(
            "min-w-0 text-xs leading-snug text-muted-foreground sm:text-sm",
            !allocationControl && "sm:col-start-2"
          )}
        >
          <span className="font-semibold text-[#111827]">{locationTitle}</span>
          <span className="text-muted-foreground"> · </span>
          {locationLine}
        </p>
      </div>
    </div>
  );
}
