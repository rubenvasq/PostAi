import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/DataState";
import { PageHeader } from "@/components/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/useAsyncData";
import { listAuditLogs } from "@/lib/api";
import { dateKeyToIso, formatDateTime, shortId } from "@/lib/format";
import type { PublicAuditLog } from "@/lib/types";

/** Acciones que el backend registra hoy; cualquier otra se muestra con su código. */
const ACTIONS: Record<string, { label: string; tone: BadgeTone }> = {
  "sale.created": { label: "Venta creada", tone: "info" },
  "sale.cancelled": { label: "Venta anulada", tone: "danger" },
  "payment.approved": { label: "Pago aprobado", tone: "success" },
  "payment.refunded": { label: "Pago reembolsado", tone: "warning" },
  "cash.session_opened": { label: "Caja abierta", tone: "info" },
  "cash.session_closed": { label: "Caja cerrada", tone: "neutral" },
  "cash.movement_created": { label: "Movimiento de caja", tone: "neutral" },
  "expense.created": { label: "Gasto registrado", tone: "warning" },
};

const ENTITY_LABELS: Record<string, string> = {
  Sale: "Venta",
  Payment: "Pago",
  Refund: "Reembolso",
  CashSession: "Caja",
  CashMovement: "Movimiento de caja",
  Expense: "Gasto",
};

interface Filters {
  from: string;
  to: string;
  action: string;
}

const EMPTY_FILTERS: Filters = { from: "", to: "", action: "" };

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function MetadataList({ metadata }: { metadata: PublicAuditLog["metadata"] }) {
  const entries = Object.entries(metadata ?? {});

  if (entries.length === 0) {
    return <span className="text-slate-500">—</span>;
  }

  return (
    <dl className="flex flex-col gap-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-1.5">
          <dt className="shrink-0 text-slate-500">{key}:</dt>
          <dd className="break-all text-slate-300">{formatMetadataValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditPage() {
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [filterError, setFilterError] = useState<string | null>(null);
  const logs = useAsyncData(
    () =>
      listAuditLogs({
        from: dateKeyToIso(filters.from),
        to: dateKeyToIso(filters.to, true),
        action: filters.action || undefined,
        page,
        pageSize: 20,
      }),
    [filters, page],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (draft.from && draft.to && draft.from > draft.to) {
      setFilterError("La fecha inicial no puede ser posterior a la final.");
      return;
    }

    setFilterError(null);
    setFilters(draft);
    setPage(1);
  }

  function handleClear(): void {
    setFilterError(null);
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Auditoría"
        description="Registro de operaciones relevantes del comercio. Es de solo lectura: lo escribe el backend."
      />

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <form
          className="flex flex-wrap items-end gap-2 border-b border-slate-800 px-5 py-3"
          onSubmit={handleSubmit}
        >
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Desde
            <Input
              type="date"
              value={draft.from}
              onChange={(event) => setDraft({ ...draft, from: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Hasta
            <Input
              type="date"
              value={draft.to}
              onChange={(event) => setDraft({ ...draft, to: event.target.value })}
            />
          </label>
          <label className="flex min-w-48 flex-col gap-1 text-xs text-slate-400">
            Acción
            <Select
              value={draft.action}
              onChange={(event) => setDraft({ ...draft, action: event.target.value })}
            >
              <option value="">Todas</option>
              {Object.entries(ACTIONS).map(([code, action]) => (
                <option key={code} value={code}>
                  {action.label}
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit" variant="outline">
            <Search className="mr-1 size-4" />
            Filtrar
          </Button>
          <Button type="button" variant="ghost" onClick={handleClear}>
            Limpiar
          </Button>
          {filterError ? <p className="w-full text-xs text-rose-300">{filterError}</p> : null}
        </form>

        {logs.loading && !logs.data ? <LoadingState label="Cargando auditoría…" /> : null}
        {logs.error && !logs.data ? (
          <ErrorState message={logs.error} onRetry={logs.reload} />
        ) : null}

        {logs.data && logs.data.data.length === 0 ? (
          <EmptyState
            title="No hay eventos con estos filtros"
            description="Los eventos aparecen al crear o anular ventas, aprobar o reembolsar pagos y operar la caja."
          />
        ) : null}

        {logs.data && logs.data.data.length > 0 ? (
          <>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Acción</Th>
                    <Th>Entidad</Th>
                    <Th>Autor</Th>
                    <Th>Detalle</Th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data.data.map((log) => {
                    const action = ACTIONS[log.action];
                    const entityLabel = ENTITY_LABELS[log.entityType] ?? log.entityType;

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <Td className="whitespace-nowrap text-xs text-slate-400">
                          {formatDateTime(log.createdAt)}
                        </Td>
                        <Td>
                          <Badge tone={action?.tone ?? "neutral"}>
                            {action?.label ?? log.action}
                          </Badge>
                        </Td>
                        <Td className="whitespace-nowrap text-xs">
                          {log.entityType === "Sale" ? (
                            <a
                              href={`#/sales/${log.entityId}`}
                              className="text-emerald-400 hover:underline"
                            >
                              {entityLabel} {shortId(log.entityId)}
                            </a>
                          ) : (
                            <span className="text-slate-300">
                              {entityLabel} {shortId(log.entityId)}
                            </span>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-xs text-slate-400">
                          {log.actorUserId ? shortId(log.actorUserId) : "Sistema"}
                        </Td>
                        <Td className="max-w-md text-xs">
                          <MetadataList metadata={log.metadata} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
            <Pagination meta={logs.data.meta} onPageChange={setPage} />
          </>
        ) : null}
      </div>
    </div>
  );
}
