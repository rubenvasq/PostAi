import { MonitorSmartphone } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormError, Input } from "@/components/ui/input";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  getBranches,
  getMerchant,
  listSessions,
  revokeSession,
  updateMerchant,
  type MerchantUpdateBody,
} from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import type { MerchantStatus, PublicMerchant } from "@/lib/types";

const MERCHANT_STATUS: Record<
  MerchantStatus,
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  ACTIVE: { label: "Activo", tone: "success" },
  SUSPENDED: { label: "Suspendido", tone: "warning" },
  CLOSED: { label: "Cerrado", tone: "neutral" },
};

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuración"
        description="Datos del comercio, sucursales y dispositivos con sesión iniciada en tu cuenta."
      />
      <MerchantSection />
      <BranchesSection />
      <SessionsSection />
    </div>
  );
}

function MerchantSection() {
  const merchant = useAsyncData(() => getMerchant(), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comercio</CardTitle>
        <CardDescription>
          Estos datos aparecen en los comprobantes. La moneda y la zona horaria son fijas en el MVP.
        </CardDescription>
      </CardHeader>
      {merchant.loading && !merchant.data ? <LoadingState label="Cargando comercio…" /> : null}
      {merchant.error && !merchant.data ? (
        <ErrorState message={merchant.error} onRetry={merchant.reload} />
      ) : null}
      {merchant.data ? (
        <CardContent>
          <MerchantForm key={merchant.data.id} merchant={merchant.data} />
        </CardContent>
      ) : null}
    </Card>
  );
}

function MerchantForm({ merchant }: { merchant: PublicMerchant }) {
  const { reloadProfile } = useAuth();
  const [saved, setSaved] = useState(merchant);
  const [name, setName] = useState(merchant.name);
  const [legalName, setLegalName] = useState(merchant.legalName ?? "");
  const [taxId, setTaxId] = useState(merchant.taxId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const status = MERCHANT_STATUS[saved.status];

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const nextName = name.trim();
    const nextLegalName = legalName.trim();
    const nextTaxId = taxId.trim();

    if (!nextName) {
      setError("El nombre del comercio es obligatorio.");
      return;
    }

    // El contrato no permite vaciar razón social ni identificación una vez guardadas.
    if ((saved.legalName && !nextLegalName) || (saved.taxId && !nextTaxId)) {
      setError("La razón social y la identificación tributaria no se pueden dejar vacías.");
      return;
    }

    const body: MerchantUpdateBody = {};

    if (nextName !== saved.name) {
      body.name = nextName;
    }

    if (nextLegalName && nextLegalName !== (saved.legalName ?? "")) {
      body.legalName = nextLegalName;
    }

    if (nextTaxId && nextTaxId !== (saved.taxId ?? "")) {
      body.taxId = nextTaxId;
    }

    if (Object.keys(body).length === 0) {
      setNotice("No hay cambios por guardar.");
      return;
    }

    setSubmitting(true);

    try {
      const updated = await updateMerchant(body);
      setSaved(updated);
      setName(updated.name);
      setLegalName(updated.legalName ?? "");
      setTaxId(updated.taxId ?? "");
      setNotice("Cambios guardados.");

      if (body.name) {
        // El encabezado muestra el nombre que viene en las membresías.
        await reloadProfile().catch(() => undefined);
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre comercial" htmlFor="merchant-name" required>
          <Input
            id="merchant-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
          />
        </Field>
        <Field label="Razón social" htmlFor="merchant-legal-name">
          <Input
            id="merchant-legal-name"
            value={legalName}
            onChange={(event) => setLegalName(event.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="Identificación tributaria" htmlFor="merchant-tax-id">
          <Input
            id="merchant-tax-id"
            value={taxId}
            onChange={(event) => setTaxId(event.target.value)}
            placeholder="NIT"
            maxLength={50}
          />
        </Field>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-4">
        <ReadOnly label="Moneda">{saved.currency}</ReadOnly>
        <ReadOnly label="Zona horaria">{saved.timezone}</ReadOnly>
        <ReadOnly label="Estado">
          <Badge tone={status.tone}>{status.label}</Badge>
        </ReadOnly>
        <ReadOnly label="Creado">{formatDate(saved.createdAt)}</ReadOnly>
      </dl>

      {error ? <FormError>{error}</FormError> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      <div className="flex justify-end border-t border-slate-800 pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function ReadOnly({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-200">{children}</dd>
    </div>
  );
}

function BranchesSection() {
  const branches = useAsyncData(() => getBranches(), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sucursales</CardTitle>
        <CardDescription>
          El MVP opera con la sucursal principal; aquí solo se consulta.
        </CardDescription>
      </CardHeader>
      {branches.loading && !branches.data ? <LoadingState label="Cargando sucursales…" /> : null}
      {branches.error && !branches.data ? (
        <ErrorState message={branches.error} onRetry={branches.reload} />
      ) : null}
      {branches.data && branches.data.data.length === 0 ? (
        <EmptyState title="El comercio no tiene sucursales" />
      ) : null}
      {branches.data && branches.data.data.length > 0 ? (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Nombre</Th>
                <Th>Dirección</Th>
                <Th>Teléfono</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {branches.data.data.map((branch) => (
                <tr key={branch.id}>
                  <Td className="text-xs text-slate-400">{branch.code}</Td>
                  <Td className="font-medium">{branch.name}</Td>
                  <Td className="text-xs text-slate-400">{branch.address ?? "—"}</Td>
                  <Td className="text-xs text-slate-400">{branch.phone ?? "—"}</Td>
                  <Td>
                    <Badge tone={branch.isActive ? "success" : "neutral"}>
                      {branch.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      ) : null}
    </Card>
  );
}

function SessionsSection() {
  const sessions = useAsyncData(() => listSessions(), []);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke(sessionId: string): Promise<void> {
    setRevokingId(sessionId);
    setError(null);

    try {
      await revokeSession(sessionId);
      setConfirmingId(null);
      sessions.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispositivos y sesiones</CardTitle>
        <CardDescription>
          Teléfonos y navegadores con sesión activa en tu cuenta. Revocar una sesión la cierra en
          ese dispositivo; si revocas la de este navegador tendrás que volver a iniciar sesión.
        </CardDescription>
      </CardHeader>
      {error ? (
        <CardContent>
          <FormError>{error}</FormError>
        </CardContent>
      ) : null}
      {sessions.loading && !sessions.data ? <LoadingState label="Cargando sesiones…" /> : null}
      {sessions.error && !sessions.data ? (
        <ErrorState message={sessions.error} onRetry={sessions.reload} />
      ) : null}
      {sessions.data && sessions.data.data.length === 0 ? (
        <EmptyState title="No hay sesiones activas" />
      ) : null}
      {sessions.data && sessions.data.data.length > 0 ? (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Dispositivo</Th>
                <Th>IP</Th>
                <Th>Último uso</Th>
                <Th>Inicio</Th>
                <Th>Expira</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {sessions.data.data.map((session) => (
                <tr key={session.id}>
                  <Td>
                    <div className="flex items-start gap-2">
                      <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-slate-500" />
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium">
                          {session.deviceName ?? "Dispositivo sin nombre"}
                        </span>
                        <span className="line-clamp-1 max-w-72 text-xs text-slate-500">
                          {session.userAgent ?? "—"}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-400">{session.ipAddress ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">
                    {formatDateTime(session.lastUsedAt)}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">
                    {formatDateTime(session.createdAt)}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">
                    {formatDateTime(session.expiresAt)}
                  </Td>
                  <Td className="text-right">
                    {confirmingId === session.id ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          disabled={revokingId === session.id}
                          onClick={() => setConfirmingId(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          type="button"
                          disabled={revokingId === session.id}
                          onClick={() => void handleRevoke(session.id)}
                        >
                          {revokingId === session.id ? "Revocando…" : "Confirmar"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setError(null);
                          setConfirmingId(session.id);
                        }}
                      >
                        Revocar
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      ) : null}
    </Card>
  );
}
