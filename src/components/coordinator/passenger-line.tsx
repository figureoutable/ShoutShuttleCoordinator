import { Badge } from "@/components/ui/badge";
import { childSeatBadgeLabel } from "@/lib/grouping";
import type { Passenger } from "@/lib/types";

export function PassengerLine({
  passenger: p,
  showSpouse,
}: {
  passenger: Passenger;
  showSpouse?: boolean;
}) {
  const seats = childSeatBadgeLabel(p);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-medium text-[#111827]">{p.name}</span>
      {seats ? (
        <span title={seats} className="text-base leading-none" aria-label={seats}>
          🧒
        </span>
      ) : null}
      {showSpouse && p.spouseName ? (
        <span className="text-muted-foreground text-sm">&amp; {p.spouseName}</span>
      ) : null}
      <Badge variant="secondary" className="font-normal text-xs">
        ×{p.groupSize}
      </Badge>
    </span>
  );
}
