import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CircuitBoard, KeyRound, Lock, User } from "lucide-react";
import type { Role } from "@/types";
import { ROLE_META } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Form";
import { StatusLED } from "@/components/common/StatusLED";

const DEMO: { role: Role; username: string; name: string }[] = [
  { role: "admin", username: "rangga", name: "Rangga P." },
  { role: "supervisor", username: "sari", name: "Sari W." },
  { role: "operator", username: "budi", name: "Budi S." },
  { role: "viewer", username: "maya", name: "Maya H." },
];

const FEATURES = [
  "Order lifecycle dengan finite-state-machine",
  "BOM ↔ inventory dengan reservasi stok otomatis",
  "Production board real-time per workstation",
  "Laporan harian / bulanan + export async",
];

export function Login() {
  const user = useAuth((s) => s.user);
  const login = useAuth((s) => s.login);
  const status = useAuth((s) => s.status);
  const error = useAuth((s) => s.error);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [username, setUsername] = useState("rangga");
  const [password, setPassword] = useState("demo");
  const [pending, setPending] = useState<string | null>(null);

  if (user) return <Navigate to={from} replace />;

  const doLogin = async (u: string, p: string, tag: string) => {
    setPending(tag);
    try {
      await login(u, p);
      navigate(from, { replace: true });
    } catch {
      /* error surfaced via store */
    } finally {
      setPending(null);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void doLogin(username, password, "form");
  };

  return (
    <div className="bg-app grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ── brand / hero ── */}
      <div className="bg-grid relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-copper/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-signal/10 blur-3xl" />

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Logo />
        </motion.div>

        <motion.div
          className="relative max-w-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-copper">
            <CircuitBoard className="h-3.5 w-3.5" /> PCB Assembly · UMKM Elektronika
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink">
            Dari PO masuk
            <br />
            sampai barang keluar,
            <br />
            <span className="text-copper text-glow-copper">satu sistem.</span>
          </h1>
          <p className="mt-4 text-balance text-sm leading-relaxed text-ink-dim">
            Internal ERP untuk manajemen produksi & inventory PCB assembly — pengganti tumpukan
            spreadsheet yang sudah tidak sanggup handle volume order.
          </p>

          <ul className="mt-7 space-y-2.5">
            {FEATURES.map((f, i) => (
              <motion.li
                key={f}
                className="flex items-center gap-3 text-sm text-ink-dim"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
              >
                <StatusLED tone={["copper", "signal", "ok", "warn"][i] as "copper"} />
                {f}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <div className="label flex items-center gap-2 text-ink-faint">
          <span>React · TypeScript · Tailwind · Zustand</span>
          <span className="text-line-strong">/</span>
          <span>Portfolio Demo</span>
        </div>
      </div>

      {/* ── form ── */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Masuk ke workspace</h2>
          <p className="mt-1.5 text-sm text-ink-dim">
            Gunakan akun demo di bawah, atau pilih role langsung.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <Field label="Username" htmlFor="username">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                iconLeft={<User className="h-4 w-4" />}
                autoComplete="username"
                placeholder="username"
              />
            </Field>
            <Field label="Password" htmlFor="password" hint="demo: bebas">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                iconLeft={<Lock className="h-4 w-4" />}
                autoComplete="current-password"
                placeholder="••••••"
              />
            </Field>

            {error && (
              <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-xs font-medium text-bad">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={pending === "form" && status === "loading"}
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              Login
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="label text-ink-faint">Quick login · per role</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <button
                key={d.role}
                onClick={() => doLogin(d.username, "demo", d.role)}
                disabled={status === "loading"}
                className={cn(
                  "btn-press group rounded-lg border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-copper/40 disabled:opacity-60",
                  pending === d.role && "border-copper/60",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{ROLE_META[d.role].label}</span>
                  <KeyRound className="h-3.5 w-3.5 text-ink-faint group-hover:text-copper" />
                </div>
                <span className="data text-2xs text-ink-dim">@{d.username}</span>
              </button>
            ))}
          </div>

          <p className="mt-7 text-center text-2xs leading-relaxed text-ink-faint">
            Demo portfolio — berjalan di atas mock API in-browser, tanpa backend.
            Semua data dummy & reset saat reload.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
