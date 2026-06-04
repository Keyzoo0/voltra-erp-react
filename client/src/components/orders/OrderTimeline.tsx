import type { StatusLog, User } from "@/types";
import { STATUS_META, TONE } from "@/lib/domain";
import { fmtDateTime, fromNow } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Props {
  logs: StatusLog[];
  userMap: Map<string, User>;
}

export function OrderTimeline({ logs, userMap }: Props) {
  if (!logs.length) return <p className="py-4 text-center text-xs text-ink-dim">Belum ada riwayat.</p>;

  return (
    <ol className="relative space-y-1">
      {logs.map((log, i) => {
        const meta = STATUS_META[log.toStatus];
        const last = i === logs.length - 1;
        const user = userMap.get(log.userId);
        return (
          <li key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* rail */}
            <div className="flex flex-col items-center">
              <span className={cn("led mt-1.5 shrink-0", TONE[meta.tone].dot, last && "animate-pulse-led")} />
              {!last && <span className="mt-1 w-px flex-1 bg-line" />}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className={cn("text-sm font-semibold", TONE[meta.tone].text)}>{meta.label}</span>
                <span className="text-2xs text-ink-faint" title={fmtDateTime(log.at)}>
                  · {fromNow(log.at)}
                </span>
              </div>
              <p className="text-2xs text-ink-dim">
                oleh {user?.name ?? "—"}
                {log.fromStatus && <span className="text-ink-faint"> · dari {STATUS_META[log.fromStatus].label}</span>}
              </p>
              {log.notes && (
                <p className="mt-1 rounded-md border border-line bg-canvas-2 px-2 py-1 text-xs text-ink-dim">
                  {log.notes}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
