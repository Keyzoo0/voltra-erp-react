import { cn } from "@/lib/cn";
import { TONE, type Tone } from "@/lib/domain";

interface Props {
  tone: Tone;
  pulse?: boolean;
  className?: string;
}

/** A small glowing hardware-style indicator LED. */
export function StatusLED({ tone, pulse, className }: Props) {
  const style = TONE[tone] ?? TONE.neutral;
  return (
    <span
      className={cn("led", style.dot, pulse && "animate-pulse-led", className)}
      aria-hidden
    />
  );
}
