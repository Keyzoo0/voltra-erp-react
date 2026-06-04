import { cn } from "@/lib/cn";
import type { User } from "@/types";

interface Props {
  user: Pick<User, "initials" | "accent" | "name">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-7 w-7 text-2xs",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
};

export function Avatar({ user, size = "md", className }: Props) {
  return (
    <span
      title={user.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-bold tracking-tight",
        SIZES[size],
        className,
      )}
      style={{
        color: user.accent,
        background: `color-mix(in srgb, ${user.accent} 16%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${user.accent} 35%, transparent)`,
      }}
    >
      {user.initials}
    </span>
  );
}
