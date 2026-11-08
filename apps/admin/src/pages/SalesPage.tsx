import { Eye, ReceiptText, RotateCcw } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/DataState";
import { PageHeader } from "@/components/PageHeader";
import { SaleStatusBadge, SimulatedBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/useAsyncData";
import { listSales } from "@/lib/api";
import {
  dateKeyToIso,
  formatDateTime,
  formatMoney,
  paymentMethodLabel,
  shortId,
} from "@/lib/format";
import type { SaleStatus } from "@/lib/types";

const SALE_STATUSES: Array<{ value: SaleStatus; label: string }> = [
  { value: "DRAFT", label: "Borrador" },
  { value: "PENDING_PAYMENT", label: "Pendiente de pago" },
  { value: "PAID", label: "Pagada" },
  { value: "PARTIALLY_REFUNDED", label: "Reembolso parcial" },
  { value: "REFUNDED", label: "Reembolsada" },
  { value: "CANCELLED", label: "Anulada" },
];

export function SalesPage() {
  const [status, setStatus] = useState<SaleStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const state = useAsyncData(
    () =>
      listSales({
        status: status || undefined,
        from: dateKeyToIso(from),
        to: dateKeyToIso(to, true),
        page,
        pageSize: 20,
      }),
    [status, from, to, page],
  );

  function updateFilter(action: () => void): void {
    action();
    setPage(1);
  }

  function clearFilters(): void {
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Historial de ventas"
        description="Consulta las ventas registradas por el backend. El panel no crea ni aprueba pagos."
        actions={
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <RotateCcw className="mr-1 size-3.5" />
            Limpiar filtros
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Estado" htmlFor="sales-status">
          <Select
            id="sales-status"
            value={status}
            onChange={(event) =>
              updateFilter(() => setStatus(event.target.value as SaleStatus | ""))
            }
          >
            <option value="">Todos</option>
            {SALE_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Desde" htmlFor="sales-from">
          <Input
            id="sales-from"
            type="date"
            value={from}
            onChange={(event) => updateFilter(() => setFrom(event.target.value))}
          />
        </Field>
        <Field label="Hasta" htmlFor="sales-to">
          <Input
            id="sales-to"
            type="date"
            value={to}
            onChange={(event) => updateFilter(() => setTo(event.target.value))}
          />
        </Field>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        {state.loading && !state.data ? <LoadingState label="Cargando ventas…" /> : null}
        {state.error && !state.data ? (
          <ErrorState message={state.error} onRetry={state.reload} />
        ) : null}

        {state.data && state.data.data.length === 0 ? (
          <EmptyState
            title="No hay ventas con estos filtros"
            description="Cambia el rango de fechas o el estado para ver otros resultados."
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : null}

        {state.data && state.data.data.length > 0 ? (
          <>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Comprobante</Th>
                    <Th>Fecha</Th>
                    <Th>Estado</Th>
                    <Th>Pagos</Th>
                    <Th className="text-right">Total</Th>
                    <Th className="text-right">Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.data.map((sale) => {
                    const simulated = sale.payments.some((payment) => payment.isSimulated);

                    return (
                      <tr key={sale.id} className="transition-colors hover:bg-slate-800/40">
                        <Td>
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-2 font-medium">
                              <ReceiptText className="size-3.5 text-slate-500" />
                              {sale.receiptNumber ?? shortId(sale.id)}
                            </span>
                            {simulated ? <SimulatedBadge /> : null}
                          </div>
                        </Td>
                        <Td className="whitespace-nowrap">{formatDateTime(sale.createdAt)}</Td>
                        <Td>
                          <SaleStatusBadge status={sale.status} />
                        </Td>
                        <Td>
                          {sale.payments.length === 0 ? (
                            <span className="text-xs text-slate-500">Sin pagos</span>
                          ) : (
                            <span className="text-xs text-slate-300">
                              {sale.payments
                                .map((payment) => paymentMethodLabel(payment.methodCode))
                                .join(", ")}
                            </span>
                          )}
                        </Td>
                        <Td className="text-right font-medium">
                          {formatMoney(sale.total, sale.currency)}
                        </Td>
                        <Td className="text-right">
                          <a
                            href={`#/sales/${sale.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-800"
                          >
                            <Eye className="size-3.5" />
                            Ver
                          </a>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
            <Pagination meta={state.data.meta} onPageChange={setPage} />
          </>
        ) : null}
      </div>
    </div>
  );
}
