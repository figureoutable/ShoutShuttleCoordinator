"use client";

import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FileUpload from "@/components/kokonutui/file-upload";
import GradientButton from "@/components/kokonutui/gradient-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useShuttle } from "@/context/shuttle-context";
import { getMockParseResult } from "@/lib/mock-data";
import { parseFormRows } from "@/lib/parse-form";

export function UploadPage() {
  const router = useRouter();
  const [actionHint, setActionHint] = useState<string | null>(null);
  const {
    ingestParse,
    saveToBrowser,
    clearData,
    clearResources,
    passengers,
    uploadFlags,
    totalRows,
    inboundRunCount,
    outboundRunCount,
  } = useShuttle();

  const hasData = passengers.length > 0;

  const showHint = (msg: string) => {
    setActionHint(msg);
    window.setTimeout(() => setActionHint(null), 5000);
  };

  const handleSave = () => {
    saveToBrowser();
    showHint(
      "Saved in this browser: passenger data (if any), vehicle/driver assignments, and full configuration."
    );
  };

  const handleClearImport = () => {
    if (
      !window.confirm(
        "Remove all passenger data from this browser and clear vehicle/driver assignments on runs? Your configuration (vehicles, drivers, timing) will stay as it is."
      )
    ) {
      return;
    }
    clearData();
    saveToBrowser();
    showHint("Passenger import and run assignments cleared. Configuration unchanged.");
  };

  const handleResetResources = () => {
    if (
      !window.confirm(
        "Reset vehicles, drivers, and all timing / traffic settings to defaults? Passenger data you imported will stay loaded."
      )
    ) {
      return;
    }
    clearResources();
    saveToBrowser();
    showHint("Configuration reset to defaults. Passenger data unchanged.");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="font-semibold text-[#111827] text-2xl tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Shout Shuttle Coordinator: start by importing your Microsoft Form
          export below.
        </p>
      </header>

      <Card className="overflow-hidden border-[#E5E7EB] bg-white shadow-sm ring-0">
        <CardHeader className="border-[#E5E7EB] border-b bg-[#F9FAFB] px-5 py-4 sm:px-6">
          <CardTitle className="font-semibold text-[#111827] text-lg">
            Upload data
          </CardTitle>
          <CardDescription className="text-[#6B7280]">
            CSV or XLSX from Forms. Files are parsed in your browser only; nothing
            is uploaded to a server. New imports replace passenger rows and clear
            run assignments; configuration still updates when you change it. Use{" "}
            <span className="font-medium text-[#111827]">Save to browser</span>{" "}
            to flush storage immediately (auto-save also runs shortly after edits).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-8">
            <div className="min-w-0 flex-1">
              <FileUpload
                uploadDelay={40}
                maxFileSize={25 * 1024 * 1024}
                acceptedFileTypes={[]}
                validateFile={(file) => {
                  if (!/\.(csv|xlsx)$/i.test(file.name)) {
                    return {
                      message: "Please upload a .csv or .xlsx file.",
                      code: "INVALID_EXT",
                    };
                  }
                  return null;
                }}
                onUploadSuccess={(file) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const buf = e.target?.result;
                    if (!buf || !(buf instanceof ArrayBuffer)) return;
                    const wb = XLSX.read(buf, { type: "array" });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(sheet, {
                      header: 1,
                      defval: "",
                    }) as unknown[][];
                    const parsed = parseFormRows(rows);
                    ingestParse(parsed);
                  };
                  reader.readAsArrayBuffer(file);
                }}
                className="mx-0 max-w-none"
              />
            </div>
            <div className="flex shrink-0 flex-col items-center justify-center gap-3 border-[#E5E7EB] border-t pt-8 lg:w-56 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <p className="font-medium text-[#6B7280] text-xs uppercase tracking-wide">
                Or try sample data
              </p>
              <GradientButton
                type="button"
                label="Load demo data"
                variant="coral"
                className="h-12 w-full min-w-[10rem]"
                onClick={() => ingestParse(getMockParseResult())}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-[#E5E7EB] border-t pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="default"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              onClick={handleSave}
            >
              Save to browser
            </Button>
            <p className="text-muted-foreground text-xs leading-relaxed sm:max-w-md sm:text-right">
              Stores passengers, flags, run assignments, and configuration in local
              storage for this site.
            </p>
          </div>
        </CardContent>
      </Card>

      {actionHint ? (
        <p
          className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-[#111827] text-sm"
          role="status"
        >
          {actionHint}
        </p>
      ) : null}

      {hasData ? (
        <Card className="border-[#E5E7EB] bg-[#F9FAFB] shadow-none">
          <CardHeader className="px-5 sm:px-6">
            <CardTitle className="text-[#111827] text-lg">Import summary</CardTitle>
            <CardDescription>
              Review counts and flags before opening Planning or Day-of.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-5 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                <p className="text-muted-foreground text-sm">Passengers parsed</p>
                <p className="font-semibold text-3xl text-[#111827]">
                  {passengers.length}
                </p>
                <p className="text-muted-foreground text-xs">
                  {totalRows} data rows in file
                </p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                <p className="text-muted-foreground text-sm">Shuttle runs (est.)</p>
                <p className="font-semibold text-[#111827] text-xl">
                  Inbound:{" "}
                  <span className="text-primary">{inboundRunCount}</span>
                </p>
                <p className="font-semibold text-[#111827] text-xl">
                  Outbound (Sat):{" "}
                  <span className="text-primary">{outboundRunCount}</span>
                </p>
              </div>
            </div>

            {uploadFlags &&
            (uploadFlags.largeGroups.length > 0 ||
              uploadFlags.childSeats.length > 0 ||
              uploadFlags.gatwickCount > 0 ||
              uploadFlags.unknownLocations.length > 0 ||
              uploadFlags.duplicateEmails.length > 0) ? (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-900 text-sm">Flags</p>
                <ul className="space-y-2 text-amber-950 text-sm">
                  {uploadFlags.largeGroups.map((g) => (
                    <li key={g.name} className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-amber-500 text-white">Large group</Badge>
                      <span>
                        {g.name}: {g.groupSize} people (van fills at 8 pax slots)
                      </span>
                    </li>
                  ))}
                  {uploadFlags.childSeats.map((c) => (
                    <li key={c.name}>
                      <span className="font-medium">🧒 Child seats:</span> {c.name}:{" "}
                      {c.types.join(", ")}
                    </li>
                  ))}
                  {uploadFlags.gatwickCount > 0 ? (
                    <li>
                      <span className="font-medium">Gatwick:</span>{" "}
                      {uploadFlags.gatwickCount} passenger
                      {uploadFlags.gatwickCount === 1 ? "" : "s"} arrive at Gatwick;
                      not included in Heathrow shuttle runs.
                    </li>
                  ) : null}
                  {uploadFlags.unknownLocations.map((u) => (
                    <li key={`${u.name}-${u.field}`}>
                      <span className="font-medium">Unknown stop:</span> {u.name} (
                      {u.field}): {u.raw}
                    </li>
                  ))}
                  {uploadFlags.duplicateEmails.map((d) => (
                    <li key={d}>
                      <span className="font-medium">Duplicate email:</span> {d}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <GradientButton
                type="button"
                label="View planning"
                variant="coral"
                className="h-12 min-w-[180px]"
                onClick={() => router.push("/planning")}
              />
              <GradientButton
                type="button"
                label="View day-of"
                variant="coralSoft"
                className="h-12 min-w-[180px]"
                onClick={() => router.push("/day-of")}
              />
            </div>

            <div className="space-y-3 border-[#E5E7EB] border-t pt-6">
              <p className="font-medium text-[#111827] text-sm">Data & configuration</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleSave}
                >
                  Save everything now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-amber-200 text-amber-950 hover:bg-amber-50 sm:w-auto"
                  onClick={handleClearImport}
                >
                  Clear import & run assignments
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-destructive/40 text-destructive hover:bg-destructive/5 sm:w-auto"
                  onClick={handleResetResources}
                >
                  Reset vehicles, drivers &amp; settings
                </Button>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                <span className="font-medium text-[#111827]">Clear import</span> removes
                passengers and per-run vehicle/driver choices only.
                <span className="font-medium text-[#111827]"> Reset settings</span> restores
                default vans, drivers, and timing; your spreadsheet data stays until you
                clear it or import again.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#E5E7EB] border-dashed bg-[#FAFAFA] shadow-none">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm leading-relaxed">
              No passenger data loaded yet. Use{" "}
              <span className="font-medium text-[#111827]">Upload data</span> above,
              then your summary and shortcuts will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
