import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const baseControl =
  "w-full rounded-lg border border-line bg-canvas-2 px-3 text-sm text-ink placeholder:text-ink-faint " +
  "transition-colors focus:border-copper/60 focus:outline-none focus-visible:shadow-none disabled:opacity-50";

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between">
      <span className="label">{children}</span>
      {hint && <span className="text-2xs text-ink-faint">{hint}</span>}
    </label>
  );
}

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}
export function Field({ label, hint, error, htmlFor, children, className }: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor} hint={hint}>
          {label}
        </Label>
      )}
      {children}
      {error && <p className="mt-1 text-2xs font-medium text-bad">{error}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: ReactNode;
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, iconLeft, invalid, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {iconLeft && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          {iconLeft}
        </span>
      )}
      <input
        ref={ref}
        className={cn(baseControl, "h-10", iconLeft && "pl-9", invalid && "border-bad/60", className)}
        {...rest}
      />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(baseControl, "min-h-[84px] py-2 leading-relaxed", className)} {...rest} />;
  },
);

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(baseControl, "h-10 appearance-none bg-[length:14px] bg-[right_0.7rem_center] bg-no-repeat pr-9", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%235E6B65' stroke-width='2'><path d='M3 5l4 4 4-4'/></svg>\")",
      }}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface text-ink">
          {o.label}
        </option>
      ))}
    </select>
  );
});
