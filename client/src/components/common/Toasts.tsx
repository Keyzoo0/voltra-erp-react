import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useUi, type ToastKind } from "@/stores/ui";
import { cn } from "@/lib/cn";

const ICON: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warn: AlertTriangle,
};
const TONE: Record<ToastKind, string> = {
  success: "text-ok",
  error: "text-bad",
  info: "text-signal",
  warn: "text-warn",
};

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismissToast);

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="panel pointer-events-auto flex items-start gap-3 p-3 pr-2.5 shadow-panel"
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TONE[t.kind])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs text-ink-dim">{t.message}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded p-1 text-ink-faint transition-colors hover:text-ink"
                aria-label="Tutup notifikasi"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
