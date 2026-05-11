export const CANONICAL_STOPS = [
  "Travelodge Guildford (Woodbridge Meadows, Woodbridge Road, GU1 1BD)",
  "Harbour Hotel Guildford (3 Alexandra Terrace, High St, GU1 3DA)",
  "Mandolay Hotel (36-40 London Road, GU1 2AE)",
  "G-Live / Guildford Station (Dene Road, GU1 4DD)",
] as const;

export type CanonicalStop = (typeof CANONICAL_STOPS)[number];

const KEYWORDS: { keyword: string; stop: CanonicalStop }[] = [
  { keyword: "travelodge", stop: CANONICAL_STOPS[0] },
  { keyword: "harbour", stop: CANONICAL_STOPS[1] },
  { keyword: "mandolay", stop: CANONICAL_STOPS[2] },
  { keyword: "g-live", stop: CANONICAL_STOPS[3] },
  { keyword: "g live", stop: CANONICAL_STOPS[3] },
  { keyword: "guildford station", stop: CANONICAL_STOPS[3] },
];

export function mapDropOffToStop(raw: string): {
  canonical: CanonicalStop | "Unknown location";
  unknown: boolean;
} {
  const s = raw.trim().toLowerCase();
  if (!s) {
    return { canonical: "Unknown location", unknown: true };
  }
  for (const { keyword, stop } of KEYWORDS) {
    if (s.includes(keyword)) {
      return { canonical: stop, unknown: false };
    }
  }
  return { canonical: "Unknown location", unknown: true };
}

export function stopSortIndex(canonical: string): number {
  const i = CANONICAL_STOPS.indexOf(canonical as CanonicalStop);
  if (i >= 0) return i;
  return 999;
}
