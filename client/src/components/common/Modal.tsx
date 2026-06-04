import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 md:items-center">
          <motion.div
            className="fixed inset-0 bg-canvas/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            className={cn(
              "panel relative z-10 my-auto w-full overflow-hidden",
              SIZES[size],
            )}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div className="rule-copper absolute inset-x-0 top-0 h-px" />
            {(title || subtitle) && (
              <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div>
                  {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
                  {subtitle && <p className="mt-0.5 text-xs text-ink-dim">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
            )}
            <div className="px-5 py-4">{children}</div>
            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-line bg-canvas-2/40 px-5 py-3">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
