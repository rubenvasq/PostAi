import { Activity, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type HealthState = { status: "loading" } | { status: "ok"; version?: string } | { status: "error" };

export function App() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch("/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<{ status: string; version?: string }>;
      })
      .then((data) => {
        if (!cancelled) {
          setHealth({ status: "ok", version: data.version });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
        <header className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-400">
            <Store className="size-6" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Equipo PostAi</p>
            <h1 className="text-3xl font-semibold">PostAi — Panel administrativo</h1>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Activity className="size-4" />
            Estado de la API
          </div>

          <p className="mt-3 text-lg" aria-live="polite">
            {health.status === "loading" && "Comprobando…"}
            {health.status === "ok" && `Disponible${health.version ? ` · v${health.version}` : ""}`}
            {health.status === "error" && "No disponible"}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Scaffolding inicial. Los módulos del POS se implementarán en las siguientes tareas.
          </p>

          <Button className="mt-6" onClick={() => window.location.reload()}>
            Volver a comprobar
          </Button>
        </section>
      </div>
    </main>
  );
}
