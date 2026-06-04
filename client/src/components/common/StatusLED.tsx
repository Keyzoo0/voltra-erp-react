import { cn } from "@/lib/cn";
import { TONE, type Tone } from "@/lib/domain";

interface Props {
  tone: Tone;
  pulse?: boolean;
  className?: string;
}

/** A small glowing hardware-style indicator LED. */
export function StatusLED({ tone, pulse, className }: Props) {
  return (
    <span
      className={cn("led", TONE[tone].dot, pulse && "animate-pulse-led", className)}
      aria-hidden
    />
  );
}
