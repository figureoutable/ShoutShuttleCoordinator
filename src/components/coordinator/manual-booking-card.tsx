"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { ManualBookingFormFields } from "@/components/coordinator/manual-booking-form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useShuttle } from "@/context/shuttle-context";
import {
  defaultManualPassengerInput,
  type ManualPassengerInput,
} from "@/lib/manual-passenger";

export function ManualBookingCard() {
  const { config, passengers, addManualPassenger, removePassenger } = useShuttle();
  const [form, setForm] = useState<ManualPassengerInput>(() =>
    defaultManualPassengerInput(config)
  );
  const [hint, setHint] = useState<string | null>(null);

  const showHint = (msg: string) => {
    setHint(msg);
    window.setTimeout(() => setHint(null), 4000);
  };

  const update = <K extends keyof ManualPassengerInput>(
    key: K,
    value: ManualPassengerInput[K]
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      showHint("Enter at least a name before adding a booking.");
      return;
    }
    addManualPassenger(form);
    setForm(defaultManualPassengerInput(config));
    showHint("Booking added. Open Planning to assign runs if needed.");
  };

  return (
    <Card className="border-[#E5E7EB] bg-white shadow-sm ring-0">
      <CardHeader className="border-[#E5E7EB] border-b bg-[#F9FAFB] px-5 py-4 sm:px-6">
        <CardTitle className="font-semibold text-[#111827] text-lg">
          Manual booking
        </CardTitle>
        <CardDescription className="text-[#6B7280]">
          Add or remove someone who is not on the Form export (walk-up, late signup, or
          correction). Uses the same shuttle rules as imported rows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-4 py-6 sm:px-6">
        {hint ? (
          <p
            className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-[#111827] text-sm"
            role="status"
          >
            {hint}
          </p>
        ) : null}

        <ManualBookingFormFields form={form} onChange={update} />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleAdd}>
            Add booking
          </Button>
        </div>

        {passengers.length > 0 ? (
          <div className="space-y-2 border-[#E5E7EB] border-t pt-6">
            <p className="font-medium text-[#111827] text-sm">Current passengers</p>
            <ul className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-sm">
              {passengers.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-transparent bg-white px-2 py-1.5 hover:border-[#E5E7EB]"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{p.name}</span>
                    {p.groupSize > 1 ? (
                      <span className="text-muted-foreground"> · {p.groupSize} pax</span>
                    ) : null}
                    {p.inboundFlight ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · in {p.inboundFlight}
                      </span>
                    ) : null}
                    {p.outboundFlight ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · out {p.outboundFlight}
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Remove ${p.name} from the passenger list? Run assignments for them are cleared.`
                        )
                      ) {
                        return;
                      }
                      removePassenger(p.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
