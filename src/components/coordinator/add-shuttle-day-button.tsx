"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShuttle } from "@/context/shuttle-context";
import {
  addShuttleDayFromForm,
  outboundShuttleDaySpecs,
} from "@/lib/shuttle-days";
import type { ShuttleDayKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AddShuttleDayButton({
  className,
  buttonClassName,
}: {
  className?: string;
  /** Applied to the trigger control (e.g. full width in the planning column). */
  buttonClassName?: string;
}) {
  const baseId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { config, setConfig } = useShuttle();
  const [kind, setKind] = useState<ShuttleDayKind>("inbound");
  const [weekdayLabel, setWeekdayLabel] = useState("");
  const [dateLine, setDateLine] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasOutbound = outboundShuttleDaySpecs(config.shuttleDays).length > 0;

  const resetForm = useCallback(() => {
    setKind("inbound");
    setWeekdayLabel("");
    setDateLine("");
    setError(null);
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => resetForm();
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [resetForm]);

  const openDialog = () => {
    resetForm();
    dialogRef.current?.showModal();
  };

  const handleSubmit = () => {
    const w = weekdayLabel.trim();
    const d = dateLine.trim();
    if (!w || !d) {
      setError("Enter both a weekday label and a date line (e.g. Tuesday and 22 Jul).");
      return;
    }
    setError(null);
    setConfig((c) => addShuttleDayFromForm(c, { kind, weekdayLabel: w, dateLine: d }));
    dialogRef.current?.close();
  };

  return (
    <div className={cn(className)}>
      <Button
        type="button"
        variant="default"
        size="sm"
        className={buttonClassName}
        onClick={openDialog}
      >
        Add Day
      </Button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-xl [&::backdrop]:bg-black/40"
        aria-labelledby={`${baseId}-title`}
      >
        <h2 id={`${baseId}-title`} className="font-semibold text-[#111827] text-base">
          Add shuttle day
        </h2>
        <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
          Choose whether this tab is for inbound arrivals or outbound departures, and set how it reads on the day
          switcher. To change labels later, use <span className="font-medium text-foreground">Add day</span> again
          (departures updates the existing departures tab) or remove the day and add it again.
        </p>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${baseId}-kind`} className="text-xs">
              Day type
            </Label>
            <select
              id={`${baseId}-kind`}
              className="border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={kind}
              onChange={(e) => setKind(e.target.value as ShuttleDayKind)}
            >
              <option value="inbound">Arrivals (inbound)</option>
              <option value="outbound">Departures (outbound)</option>
            </select>
            {kind === "outbound" && hasOutbound ? (
              <p className="text-muted-foreground text-xs leading-snug">
                You already have a departures day—saving will update its weekday label and date line only (same day id,
                vehicles, and drivers stay put).
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${baseId}-weekday`} className="text-xs">
              Weekday label (tab title)
            </Label>
            <Input
              id={`${baseId}-weekday`}
              value={weekdayLabel}
              onChange={(e) => setWeekdayLabel(e.target.value)}
              placeholder="e.g. Thursday"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${baseId}-date`} className="text-xs">
              Date line (short)
            </Label>
            <Input
              id={`${baseId}-date`}
              value={dateLine}
              onChange={(e) => setDateLine(e.target.value)}
              placeholder="e.g. 24 Jul"
              autoComplete="off"
            />
          </div>

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </Button>
          <Button type="button" variant="default" size="sm" onClick={handleSubmit}>
            {kind === "outbound" && hasOutbound ? "Update departures day" : "Add day"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
