"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ManualPassengerInput } from "@/lib/manual-passenger";

export function ManualBookingFormFields({
  form,
  onChange,
}: {
  form: ManualPassengerInput;
  onChange: <K extends keyof ManualPassengerInput>(
    key: K,
    value: ManualPassengerInput[K]
  ) => void;
}) {
  const baseId = useId();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${baseId}-name`} className="text-xs">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${baseId}-name`}
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
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
          onChange={(e) => onChange("groupSize", Number(e.target.value) || 1)}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${baseId}-spouse`} className="text-xs">
          Spouse / second name (optional)
        </Label>
        <Input
          id={`${baseId}-spouse`}
          value={form.spouseName}
          onChange={(e) => onChange("spouseName", e.target.value)}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${baseId}-arrival`} className="text-xs">
          Arrival date answer (matches inbound day tabs)
        </Label>
        <Input
          id={`${baseId}-arrival`}
          value={form.arrivalDateLabel}
          onChange={(e) => onChange("arrivalDateLabel", e.target.value)}
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
          onChange={(e) => onChange("terminal", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-depterm`} className="text-xs">
          Departure terminal
        </Label>
        <Input
          id={`${baseId}-depterm`}
          value={form.departureTerminal}
          onChange={(e) => onChange("departureTerminal", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-airline`} className="text-xs">
          Inbound airline
        </Label>
        <Input
          id={`${baseId}-airline`}
          value={form.airline}
          onChange={(e) => onChange("airline", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-flight-in`} className="text-xs">
          Inbound flight
        </Label>
        <Input
          id={`${baseId}-flight-in`}
          value={form.inboundFlight}
          onChange={(e) => onChange("inboundFlight", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-time-in`} className="text-xs">
          Inbound lands (local)
        </Label>
        <Input
          id={`${baseId}-time-in`}
          value={form.inboundArrivalTime}
          onChange={(e) => onChange("inboundArrivalTime", e.target.value)}
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
          onChange={(e) => onChange("outboundAirline", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-flight-out`} className="text-xs">
          Outbound flight
        </Label>
        <Input
          id={`${baseId}-flight-out`}
          value={form.outboundFlight}
          onChange={(e) => onChange("outboundFlight", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-time-out`} className="text-xs">
          Outbound departs (local)
        </Label>
        <Input
          id={`${baseId}-time-out`}
          value={form.outboundDepartureTime}
          onChange={(e) => onChange("outboundDepartureTime", e.target.value)}
          placeholder="12:00"
        />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${baseId}-in-shuttle`}
            checked={form.inboundShuttleRequested}
            onCheckedChange={(v) => onChange("inboundShuttleRequested", v === true)}
          />
          <Label htmlFor={`${baseId}-in-shuttle`} className="text-sm font-normal">
            Inbound Heathrow shuttle (same as form “Heathrow” day choice)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${baseId}-out-shuttle`}
            checked={form.outboundShuttleRequested}
            onCheckedChange={(v) => onChange("outboundShuttleRequested", v === true)}
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
          onChange={(e) => onChange("inboundDropOffRaw", e.target.value)}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${baseId}-pick`} className="text-xs">
          Outbound pick-up stop
        </Label>
        <Input
          id={`${baseId}-pick`}
          value={form.outboundPickUpRaw}
          onChange={(e) => onChange("outboundPickUpRaw", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${baseId}-mobile`} className="text-xs">
          Mobile
        </Label>
        <Input
          id={`${baseId}-mobile`}
          value={form.mobile}
          onChange={(e) => onChange("mobile", e.target.value)}
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
          onChange={(e) => onChange("email", e.target.value)}
        />
      </div>
    </div>
  );
}
