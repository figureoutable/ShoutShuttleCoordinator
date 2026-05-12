"use client";

import { UserPlus } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ManualBookingFormFields } from "@/components/coordinator/manual-booking-form-fields";
import { useShuttle } from "@/context/shuttle-context";
import {
  defaultManualPassengerInput,
  type ManualPassengerInput,
} from "@/lib/manual-passenger";
import { cn } from "@/lib/utils";

/**
 * Planning toolbar: add a walk-up booking without leaving the page.
 * `arrivalDateHint` should match the Forms “What date do you arrive?” style for the active tab.
 */
export function AddManualBookingButton({
  arrivalDateHint,
  className,
}: {
  arrivalDateHint?: string;
  className?: string;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { config, addManualPassenger } = useShuttle();
  const [form, setForm] = useState<ManualPassengerInput>(() =>
    defaultManualPassengerInput(config)
  );
  const [hint, setHint] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    const base = defaultManualPassengerInput(config);
    const hintTrim = arrivalDateHint?.trim();
    setForm({
      ...base,
      arrivalDateLabel: hintTrim || base.arrivalDateLabel,
    });
  }, [config, arrivalDateHint]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => setHint(null);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  const openDialog = () => {
    resetForm();
    setHint(null);
    dialogRef.current?.showModal();
  };

  const update = <K extends keyof ManualPassengerInput>(
    key: K,
    value: ManualPassengerInput[K]
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      setHint("Enter at least a name before adding a booking.");
      return;
    }
    setHint(null);
    addManualPassenger(form);
    dialogRef.current?.close();
  };

  return (
    <div className={cn(className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={openDialog}
      >
        <UserPlus className="size-3.5 opacity-80" aria-hidden />
        Add booking
      </Button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 z-50 max-h-[min(90vh,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-xl [&::backdrop]:bg-black/40"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="font-semibold text-[#111827] text-base">
          Add booking manually
        </h2>
        <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
          Same fields as the Dashboard manual booking: walk-up, late signup, or correction. Assign
          to a run from the list or Timeline after saving.
        </p>

        {hint ? (
          <p
            className="mt-3 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-destructive text-sm"
            role="alert"
          >
            {hint}
          </p>
        ) : null}

        <div className="mt-4">
          <ManualBookingFormFields form={form} onChange={update} />
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
          <Button type="button" variant="default" size="sm" onClick={handleAdd}>
            Add booking
          </Button>
        </div>
      </dialog>
    </div>
  );
}
