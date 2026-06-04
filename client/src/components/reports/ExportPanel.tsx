import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { ExportJob } from "@/types";
import { fmtTime } from "@/lib/format";
import { api } from "@/mock/api";
import { useCan } from "@/hooks/useCan";
import { toast } from "@/stores/ui";
import { Panel } from "@/components/common/Panel";
import { Button } from "@/components/common/Button";
import { Progress } from "@/components/common/feedback";

export function ExportPanel({ scope }: { scope: string }) {
  const can = useCan();
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const jobsRef = useRef<ExportJob[]>([]);
  jobsRef.current = jobs;

  // poll unfinished jobs (Celery worker simulation)
  useEffect(() => {
    const iv = setInterval(async () => {
      const active = jobsRef.current.filter((j) => j.status !== "done" && j.status !== "failed");
      if (!active.length) return;
      const updated = await Promise.all(active.map((j) => api.export.get(j.id)));
      setJobs((prev) => prev.map((j) => updated.find((u) => u.id === j.id) ?? j));
    }, 500);
    return () => clearInterval(iv);
  }, []);

  if (!can("reports.export")) return null;

  const start = async (kind: "pdf" | "excel") => {
    const job = await api.export.create(kind, scope);
    setJobs((j) => [job, ...j].slice(0, 5));
    toast.info("Export diproses", "Job berjalan di background, kamu akan dapat notifikasi.");
  };

  return (
    <Panel title="Export Laporan" subtitle="Async — diproses background worker (Celery)" icon={<Download className="h-4 w-4" />}>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={<FileText className="h-4 w-4 text-bad" />} onClick={() => start("pdf")}>
          Export PDF
        </Button>
        <Button variant="secondary" icon={<FileSpreadsheet className="h-4 w-4 text-ok" />} onClick={() => start("excel")}>
          Export Excel
        </Button>
      </div>

      {jobs.length > 0 && (
        <div className="mt-4 space-y-2">
          {jobs.map((job) => {
            const done = job.status === "done";
            return (
              <div key={job.id} className="rounded-lg border border-line bg-canvas-2 p-3">
                <div className="flex items-center gap-2.5">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-ok" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-copper" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      Laporan {job.scope} · {job.kind.toUpperCase()}
                    </p>
                    <p className="data text-2xs text-ink-faint">
                      job {job.id} · {done ? `selesai ${fmtTime(job.finishedAt ?? job.createdAt)}` : job.status}
                    </p>
                  </div>
                  {done && (
                    <Button
                      size="sm"
                      variant="subtle"
                      icon={<Download className="h-3.5 w-3.5" />}
                      onClick={() => toast.success("Download dimulai", `voltra-${job.scope}-${job.id}.${job.kind === "pdf" ? "pdf" : "xlsx"}`)}
                    >
                      Download
                    </Button>
                  )}
                </div>
                {!done && <Progress className="mt-2" value={job.progress} tone="copper" />}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
