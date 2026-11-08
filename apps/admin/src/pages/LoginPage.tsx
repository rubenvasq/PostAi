import { LockKeyhole, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    setSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "No se pudo iniciar sesión. Inténtalo de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-2xl lg:grid-cols-[1.1fr_1fr]">
        <section className="hidden flex-col justify-between gap-10 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-950 p-8 lg:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-400">
              <Store className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-50">PostAi</p>
              <p className="text-xs text-slate-400">Equipo PostAi</p>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-semibold leading-tight text-slate-50">
              Administra tu negocio desde el panel web.
            </h1>
            <p className="mt-3 max-w-sm text-sm text-slate-400">
              Consulta ventas, catálogo, clientes e inventario. Los cobros reales se gestionan desde
              la app Android con el proveedor SoftPOS.
            </p>
          </div>

          <p className="text-xs text-slate-500">
            Panel de gestión · No almacena datos de tarjeta ni procesa pagos.
          </p>
        </section>

        <section className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-emerald-400 lg:hidden">
            <Store className="size-5" />
            <span className="text-sm font-semibold">PostAi · Panel</span>
          </div>

          <h2 className="mt-4 text-xl font-semibold text-slate-50 lg:mt-0">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-400">
            Usa la cuenta del comercio creada en PostAi.
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
            <Field label="Correo electrónico" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@comercio.com"
                required
              />
            </Field>

            <Field label="Contraseña" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            {error ? <FormError>{error}</FormError> : null}

            <Button type="submit" disabled={submitting} className="mt-2 w-full">
              <LockKeyhole className="mr-2 size-4" />
              {submitting ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>

          <p className="mt-6 text-[11px] leading-relaxed text-slate-500">
            El panel guarda la sesión en esta pestaña y la renueva automáticamente. Al cerrar sesión
            se revoca el refresh token en el backend.
          </p>
        </section>
      </div>
    </div>
  );
}
