import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { SimulatedBadge } from "@/components/StatusBadge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/useAsyncData";
import { getDashboardSummary, getSalesReport } from "@/lib/api";
import {
  dateKeyToIso,
  defaultReportRange,
  formatDayKey,
  formatMoney,
  paymentMethodLabel,
} from "@/lib/format";

export function DashboardPage() {
  const [range, setRange] = useState(() => defaultReportRange());
  const state = useAsyncData(
    () =>
      Promise.all([
        getDashboardSummary({
          from: dateKeyToIso(range.from),
          to: dateKeyToIso(range.to, true),
        }),
        getSalesReport({
          from: dateKeyToIso(range.from),
          to: dateKeyToIso(range.to, true),
          groupBy: "day",
        }),
      ]),
    [range.from, range.to],
  );

  const summary = state.data?.[0];
  const report = state.data?.[1];
  const currency = summary?.currency ?? "COP";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Indicadores del comercio calculados por el backend en America/Bogota."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Desde" htmlFor="dashboard-from">
              <Input
                id="dashboard-from"
                type="date"
                value={range.from}
                onChange={(event) =>
                  setRange((current) => ({ ...current, from: event.target.value }))
                }
              />
            </Field>
            <Field label="Hasta" htmlFor="dashboard-to">
              <Input
                id="dashboard-to"
                type="date"
                value={range.to}
                onChange={(event) =>
                  setRange((current) => ({ ...current, to: event.target.value }))
                }
              />
            </Field>
          </div>
        }
      />

      {state.loading && !state.data ? <LoadingState label="Calculando indicadores…" /> : null}
      {state.error && !state.data ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : null}

      {summary && report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Ventas brutas"
              value={formatMoney(summary.grossSales, currency)}
              hint={`${summary.salesCount} venta${summary.salesCount === 1 ? "" : "s"} pagada${summary.salesCount === 1 ? "" : "s"}`}
              icon={<TrendingUp className="size-4" />}
            />
            <StatCard
              label="Ventas netas"
              value={formatMoney(summary.netSales, currency)}
              hint="Brutas menos reembolsos"
              icon={<Wallet className="size-4" />}
            />
            <StatCard
              label="Reembolsos"
              value={formatMoney(summary.refunds, currency)}
              hint="Reembolsos registrados en el periodo"
              icon={<Banknote className="size-4" />}
            />
            <StatCard
              label="Ticket promedio"
              value={formatMoney(summary.averageTicket, currency)}
              hint="Calculado sobre ventas brutas"
              icon={<ReceiptText className="size-4" />}
            />
            <StatCard
              label="Stock bajo"
              value={String(summary.lowStockCount)}
              hint="Productos por debajo del umbral configurado"
              icon={<AlertTriangle className="size-4" />}
            />
          </div>

          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            El MVP usa pagos <strong>simulados</strong> cuando el método es{" "}
            <strong>Tarjeta simulada</strong>. No representan cobros reales ni dinero recibido.
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por día</CardTitle>
                <CardDescription>Agrupadas en la zona horaria America/Bogota.</CardDescription>
              </CardHeader>
              {report.rows.length === 0 ? (
                <EmptyState
                  title="Sin ventas en el periodo"
                  description="Cambia el rango de fechas o registra ventas desde la app."
                />
              ) : (
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Día</Th>
                        <Th className="text-right">Ventas</Th>
                        <Th className="text-right">Brutas</Th>
                        <Th className="text-right">Reembolsos</Th>
                        <Th className="text-right">Netas</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((row) => (
                        <tr key={row.key}>
                          <Td className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="size-3.5 text-slate-500" />
                              {formatDayKey(row.key)}
                            </span>
                          </Td>
                          <Td className="text-right">{row.salesCount}</Td>
                          <Td className="text-right">{formatMoney(row.grossSales, currency)}</Td>
                          <Td className="text-right">{formatMoney(row.refunds, currency)}</Td>
                          <Td className="text-right font-medium">
                            {formatMoney(row.netSales, currency)}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pagos por método</CardTitle>
                <CardDescription>Solo pagos aprobados en el periodo.</CardDescription>
              </CardHeader>
              {summary.byMethod.length === 0 ? (
                <EmptyState title="Sin pagos aprobados" />
              ) : (
                <TableWrap>
                  <Table className="min-w-[360px]">
                    <thead>
                      <tr>
                        <Th>Método</Th>
                        <Th className="text-right">Pagos</Th>
                        <Th className="text-right">Importe</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byMethod.map((row) => (
                        <tr key={row.methodCode}>
                          <Td>
                            <span className="inline-flex flex-wrap items-center gap-2">
                              {paymentMethodLabel(row.methodCode)}
                              {row.methodCode === "CARD_SIMULATED" ? <SimulatedBadge /> : null}
                            </span>
                          </Td>
                          <Td className="text-right">{row.count}</Td>
                          <Td className="text-right">{formatMoney(row.amount, currency)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
