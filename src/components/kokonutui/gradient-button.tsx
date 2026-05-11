import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Primary actions: coral/salmon brand. Secondary: softer coral on white. */
type ColorVariant = "coral" | "coralSoft";

interface GradientColors {
  dark: {
    border: string;
    overlay: string;
    accent: string;
    text: string;
    glow: string;
    textGlow: string;
    hover: string;
  };
  light: {
    border: string;
    base: string;
    overlay: string;
    accent: string;
    text: string;
    glow: string;
    hover: string;
  };
}

interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  label?: string;
  className?: string;
  variant?: ColorVariant;
}

const gradientColors: Record<ColorVariant, GradientColors> = {
  coral: {
    dark: {
      border: "from-[#EF6C64] via-[#0C1F21] to-[#D94A42]",
      overlay: "from-[#EF6C64]/40 via-[#0C1F21] to-[#C23D36]/30",
      accent: "from-[#FCE8E7]/10 via-[#0C1F21] to-[#8B2924]/50",
      text: "from-[#FCE8E7] to-[#F5B8B4]",
      glow: "rgba(239,108,100,0.12)",
      textGlow: "rgba(252,232,231,0.45)",
      hover: "from-[#5C201C]/20 via-[#EF6C64]/10 to-[#5C201C]/20",
    },
    light: {
      border: "from-[#F5A09A] via-[#EF6C64] to-[#F28B85]",
      base: "from-rose-50 via-orange-50/85 to-rose-50/95",
      overlay: "from-[#EF6C64]/25 via-[#F5B8B4]/20 to-[#EF6C64]/15",
      accent: "from-[#EF6C64]/18 via-[#F5A09A]/12 to-[#F5B8B4]/25",
      text: "from-[#B8322C] to-[#EF6C64]",
      glow: "rgba(239,108,100,0.18)",
      hover: "from-[#EF6C64]/22 via-[#F5B8B4]/18 to-[#EF6C64]/22",
    },
  },
  coralSoft: {
    dark: {
      border: "from-[#E88880] via-[#0C1F21] to-[#D97A72]",
      overlay: "from-[#F5B8B4]/35 via-[#0C1F21] to-[#C45C54]/25",
      accent: "from-white/10 via-[#0C1F21] to-[#6B2E2A]/40",
      text: "from-white to-[#F5D4D2]",
      glow: "rgba(245,184,180,0.12)",
      textGlow: "rgba(255,255,255,0.35)",
      hover: "from-[#4A1814]/15 via-[#F5B8B4]/10 to-[#4A1814]/15",
    },
    light: {
      border: "from-[#F5C4C0] via-[#F5B8B4] to-[#F0A8A3]",
      base: "from-white via-rose-50/90 to-orange-50/85",
      overlay: "from-[#F5B8B4]/22 via-[#FCE8E7]/30 to-[#F5A09A]/18",
      accent: "from-[#F5B8B4]/15 via-white/40 to-[#FCE8E7]/35",
      text: "from-[#C23D36] to-[#E85A52]",
      glow: "rgba(239,108,100,0.12)",
      hover: "from-[#F5B8B4]/28 via-[#FCE8E7]/22 to-[#F5B8B4]/28",
    },
  },
};

export default function GradientButton({
  label = "Welcome",
  className,
  variant = "coral",
  ...props
}: GradientButtonProps) {
  const colors = gradientColors[variant];

  return (
    <Button
      className={cn(
        "group relative h-12 overflow-hidden rounded-lg px-4 transition-all duration-500",
        className
      )}
      variant="ghost"
      {...props}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-lg bg-linear-to-b p-[2px]",
          "dark:bg-none",
          colors.light.border,
          colors.dark.border
        )}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-lg opacity-90",
            "bg-white/80",
            "dark:bg-[#0C1F21]"
          )}
        />
      </div>

      <div
        className={cn(
          "absolute inset-[2px] rounded-lg opacity-95",
          "bg-white/80",
          "dark:bg-[#0C1F21]"
        )}
      />

      <div
        className={cn(
          "absolute inset-[2px] rounded-lg bg-linear-to-r opacity-90",
          colors.light.base,
          "dark:from-[#0C1F21] dark:via-[#0C1F21] dark:to-[#0C1F21]"
        )}
      />
      <div
        className={cn(
          "absolute inset-[2px] rounded-lg bg-linear-to-b opacity-80",
          colors.light.overlay,
          colors.dark.overlay
        )}
      />
      <div
        className={cn(
          "absolute inset-[2px] rounded-lg bg-linear-to-br",
          colors.light.accent,
          colors.dark.accent
        )}
      />

      <div
        className={cn(
          "absolute inset-[2px] rounded-lg",
          `shadow-[inset_0_0_10px_${colors.light.glow}]`,
          `dark:shadow-[inset_0_0_10px_${colors.dark.glow}]`
        )}
      />

      <div className="relative flex items-center justify-center gap-2">
        <span
          className={cn(
            "bg-linear-to-b bg-clip-text font-light text-lg text-transparent tracking-tighter",
            colors.light.text,
            colors.dark.text,
            `dark:drop-shadow-[0_0_12px_${colors.dark.textGlow}]`
          )}
        >
          {label}
        </span>
      </div>

      <div
        className={cn(
          "absolute inset-[2px] rounded-lg bg-linear-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          colors.light.hover,
          colors.dark.hover
        )}
      />
    </Button>
  );
}
