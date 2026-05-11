"use client";

import { Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShuttle } from "@/context/shuttle-context";
import {
  defaultManualPassengerInput,
  type ManualPassengerInput,
} from "@/lib/manual-passenger";

export function ManualBookingCard() {
  const baseId = useId();
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-name`} className="text-xs">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${baseId}-name`}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-group`} className="text-xs">
              Group size
            </Label>
            <Input
              id={`${baseId}-group`}
              type="number"
              min={1}
              step={1}
              className="max-w-[8rem]"
              value={form.groupSize}
              onChange={(e) => update("groupSize", Number(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-spouse`} className="text-xs">
              Spouse / second name (optional)
            </Label>
            <Input
              id={`${baseId}-spouse`}
              value={form.spouseName}
              onChange={(e) => update("spouseName", e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-arrival`} className="text-xs">
              Arrival date answer (matches inbound day tabs)
            </Label>
            <Input
              id={`${baseId}-arrival`}
              value={form.arrivalDateLabel}
              onChange={(e) => update("arrivalDateLabel", e.target.value)}
              placeholder="e.g. Tuesday 22 Jul"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-terminal`} className="text-xs">
              Arrival terminal
            </Label>
            <Input
              id={`${baseId}-terminal`}
              value={form.terminal}
              onChange={(e) => update("terminal", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-depterm`} className="text-xs">
              Departure terminal
            </Label>
            <Input
              id={`${baseId}-depterm`}
              value={form.departureTerminal}
              onChange={(e) => update("departureTerminal", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-airline`} className="text-xs">
              Inbound airline
            </Label>
            <Input
              id={`${baseId}-airline`}
              value={form.airline}
              onChange={(e) => update("airline", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-flight-in`} className="text-xs">
              Inbound flight
            </Label>
            <Input
              id={`${baseId}-flight-in`}
              value={form.inboundFlight}
              onChange={(e) => update("inboundFlight", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-time-in`} className="text-xs">
              Inbound lands (local)
            </Label>
            <Input
              id={`${baseId}-time-in`}
              value={form.inboundArrivalTime}
              onChange={(e) => update("inboundArrivalTime", e.target.value)}
              placeholder="14:00"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-airline-out`} className="text-xs">
              Outbound airline
            </Label>
            <Input
              id={`${baseId}-airline-out`}
              value={form.outboundAirline}
              onChange={(e) => update("outboundAirline", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-flight-out`} className="text-xs">
              Outbound flight
            </Label>
            <Input
              id={`${baseId}-flight-out`}
              value={form.outboundFlight}
              onChange={(e) => update("outboundFlight", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-time-out`} className="text-xs">
              Outbound departs (local)
            </Label>
            <Input
              id={`${baseId}-time-out`}
              value={form.outboundDepartureTime}
              onChange={(e) => update("outboundDepartureTime", e.target.value)}
              placeholder="12:00"
            />
          </div>
          <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${baseId}-in-shuttle`}
                checked={form.inboundShuttleRequested}
                onCheckedChange={(v) =>
                  update("inboundShuttleRequested", v === true)
                }
              />
              <Label htmlFor={`${baseId}-in-shuttle`} className="text-sm font-normal">
                Inbound Heathrow shuttle (same as form “Heathrow” day choice)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${baseId}-out-shuttle`}
                checked={form.outboundShuttleRequested}
                onCheckedChange={(v) =>
                  update("outboundShuttleRequested", v === true)
                }
              />
              <Label htmlFor={`${baseId}-out-shuttle`} className="text-sm font-normal">
                Outbound shuttle to Heathrow (Saturday)
              </Label>
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-drop`} className="text-xs">
              Inbound drop-off stop
            </Label>
            <Input
              id={`${baseId}-drop`}
              value={form.inboundDropOffRaw}
              onChange={(e) => update("inboundDropOffRaw", e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-pick`} className="text-xs">
              Outbound pick-up stop
            </Label>
            <Input
              id={`${baseId}-pick`}
              value={form.outboundPickUpRaw}
              onChange={(e) => update("outboundPickUpRaw", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-mobile`} className="text-xs">
              Mobile
            </Label>
            <Input
              id={`${baseId}-mobile`}
              value={form.mobile}
              onChange={(e) => update("mobile", e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-email`} className="text-xs">
              Email
            </Label>
            <Input
              id={`${baseId}-email`}
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
        </div>

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
