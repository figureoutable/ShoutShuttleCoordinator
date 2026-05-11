"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/planning", label: "Planning" },
  { href: "/logic", label: "Logic" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="no-print border-[#E5E7EB] border-b bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/"
            className="mt-0.5 shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Shout Shuttle Coordinator home"
          >
            <Image
              src="/bus-icon.png"
              alt=""
              width={35}
              height={35}
              className="h-9 w-9 [image-rendering:pixelated]"
              priority
            />
          </Link>
          <div>
            <p className="font-semibold text-primary text-xs uppercase tracking-wide">
              Internal ops
            </p>
            <h1 className="font-semibold text-[#111827] text-xl tracking-tight">
              Shout Shuttle Coordinator
            </h1>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-2 font-medium text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-[#F9FAFB] text-[#111827] hover:bg-primary/10"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
