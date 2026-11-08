import { ArrowLeft, Printer, Undo2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ErrorState, LoadingState } from "@/components/DataState";
import { PageHeader } from "@/components/PageHeader";
import { PaymentStatusBadge, SaleStatusBadge, SimulatedBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/useAsyncData";
import { createRefund, getCustomer, getReceipt, getSale, listRefunds } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import {
  formatDateTime,
  formatMoney,
  formatQuantity,
  paymentMethodLabel,
  shortId,
} from "@/lib/format";
import type { PublicCustomer, PublicRefund, Receipt } from "@/lib/types";

interface SaleDetailData {
  sale: Awaited<ReturnType<typeof getSale>>;
  receipt: Receipt | null;
  receiptError: string | null;
  customer: PublicCustomer | null;
  refunds: PublicRefund[];
}

export function SaleDetailPage({ saleId }: { saleId: string }) {
  const [printed, setPrinted] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const state = useAsyncData<SaleDetailData>(async () => {
    const sale = await getSale(saleId);
    const hasApprovedPayment = sale.payments.some((payment) => payment.status === "APPROVED");
    let receipt: Receipt | null = null;
    let receiptError: string | null = null;

    if (sale.status === "PAID" || hasApprovedPayment) {
      try {
        receipt = await getReceipt(saleId);
      } catch (error) {
        receiptError = errorMessage(error);
      }
    }

    let customer: PublicCustomer | null = null;

    if (sale.customerId) {
      try {
        customer = await getCustomer(sale.customerId);
      } catch {
        customer = null;
      }
    }

    const refundLists = await Promise.all(
      sale.payments.map(async (payment) => {
        try {
          return (await listRefunds(payment.id)).data;
        } catch {
          return [];
        }
      }),
    );
    const refunds = refundLists.flat();

    return { sale, receipt, receiptError, customer, refunds };
  }, [saleId]);

  function startRefund(paymentId: string) {
    setRefundingId(paymentId);
    setRefundReason("");
    setRefundError(null);
  }

  async function submitRefund(paymentId: string, amount: string) {
    setRefundSubmitting(true);
    setRefundError(null);

    try {
      await createRefund(paymentId, {
        amount,
        reason: refundReason.trim() ? refundReason.trim() : undefined,
      });
      setRefundingId(null);
      setRefundReason("");
      await state.reload();
    } catch (error) {
      setRefundError(errorMessage(error));
    } finally {
      setRefundSubmitting(false);
    }
  }

  if (state.loading && !state.data) {
    return <LoadingState label="Cargando venta…" />;
  }

  if (state.error) {
    return (
      <div className="flex flex-col gap-4">
        <a href="#/sales" className="inline-flex items-center gap-1 text-sm text-slate-400">
          <ArrowLeft className="size-4" />
          Volver a ventas
        </a>
        <ErrorState message={state.error} onRetry={state.reload} />
      </div>
    );
  }

  if (!state.data) {
    return null;
  }

  const { sale, receipt, receiptError, customer, refunds } = state.data;
  const simulated = sale.payments.some((payment) => payment.isSimulated) || receipt?.simulated;

  function refundableAmount(payment: SaleDetailData["sale"]["payments"][number]): bigint {
    if (payment.status !== "APPROVED") return 0n;
    if (payment.methodCode === "CARD_SOFTPOS") return 0n;
    return BigInt(payment.amount) - BigInt(payment.refunded);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <a href="#/sales" className="inline-flex items-center gap-1 text-sm text-slate-400">
          <ArrowLeft className="size-4" />
          Volver a ventas
        </a>
      </div>

      <PageHeader
        title={`Venta ${sale.receiptNumber ?? shortId(sale.id)}`}
        description={`Registrada el ${formatDateTime(sale.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <SaleStatusBadge status={sale.status} />
            {simulated ? <SimulatedBadge /> : null}
            {receipt ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrinted(true);
                  window.print();
                }}
              >
                <Printer className="mr-1 size-3.5" />
                Imprimir comprobante
              </Button>
            ) : null}
          </div>
        }
      />

      {printed ? (
        <p className="text-xs text-slate-500 print:hidden">
          Se abrió el diálogo de impresión del navegador.
        </p>
      ) : null}

      {simulated ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Esta venta incluye un <strong>pago simulado</strong>. No representa un cobro real con
          tarjeta ni dinero recibido.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Detalle de la venta</CardTitle>
            <CardDescription>Importes calculados y validados por el backend.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="Cliente">
              {customer
                ? `${customer.name}${customer.email ? ` · ${customer.email}` : ""}`
                : sale.customerId
                  ? shortId(sale.customerId)
                  : "Consumidor final"}
            </Detail>
            <Detail label="Sucursal">{shortId(sale.branchId)}</Detail>
            <Detail label="Vendedor">{shortId(sale.sellerUserId)}</Detail>
            <Detail label="Completada">{formatDateTime(sale.completedAt)}</Detail>
            <Detail label="Anulada">{formatDateTime(sale.cancelledAt)}</Detail>
            <Detail label="Notas">{sale.notes ?? "—"}</Detail>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totales</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <TotalRow label="Subtotal" value={formatMoney(sale.subtotal, sale.currency)} />
            <TotalRow label="Descuento" value={formatMoney(sale.discount, sale.currency)} />
            <TotalRow label="Impuestos" value={formatMoney(sale.tax, sale.currency)} />
            <div className="my-1 border-t border-slate-800" />
            <TotalRow label="Total" value={formatMoney(sale.total, sale.currency)} emphasized />
            <TotalRow label="Reembolsado" value={formatMoney(sale.refunded, sale.currency)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>{sale.items.length} línea(s) en la venta.</CardDescription>
        </CardHeader>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th className="text-right">Cantidad</Th>
                <Th className="text-right">Precio unitario</Th>
                <Th className="text-right">Impuesto</Th>
                <Th className="text-right">Total línea</Th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-xs text-slate-500">
                        {item.sku ?? shortId(item.productId)}
                      </span>
                    </div>
                  </Td>
                  <Td className="text-right">{formatQuantity(item.quantity)}</Td>
                  <Td className="text-right">{formatMoney(item.unitPrice, sale.currency)}</Td>
                  <Td className="text-right">
                    {formatMoney(item.tax, sale.currency)}{" "}
                    <span className="text-xs text-slate-500">({item.taxRateBp / 100} %)</span>
                  </Td>
                  <Td className="text-right font-medium">
                    {formatMoney(item.lineTotal, sale.currency)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagos</CardTitle>
          <CardDescription>
            El estado del pago lo determina el backend; el panel solo lo muestra.
          </CardDescription>
        </CardHeader>
        {sale.payments.length === 0 ? (
          <CardContent>
            <p className="text-sm text-slate-400">
              La venta no tiene pagos registrados. No se genera comprobante hasta que exista un pago
              aprobado.
            </p>
          </CardContent>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Método</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Importe</Th>
                  <Th>Aprobado</Th>
                  <Th>Detalle</Th>
                  <Th className="text-right print:hidden">Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {sale.payments.map((payment) => {
                  const refundable = refundableAmount(payment);
                  const isRefunding = refundingId === payment.id;

                  return (
                    <tr key={payment.id}>
                      <Td>
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {paymentMethodLabel(payment.methodCode)}
                          {payment.isSimulated ? <SimulatedBadge /> : null}
                        </span>
                      </Td>
                      <Td>
                        <PaymentStatusBadge status={payment.status} />
                      </Td>
                      <Td className="text-right">
                        {formatMoney(payment.amount, payment.currency)}
                      </Td>
                      <Td>{formatDateTime(payment.approvedAt)}</Td>
                      <Td className="text-xs text-slate-400">
                        {payment.failureMessage ?? payment.failureCode ?? "—"}
                      </Td>
                      <Td className="text-right print:hidden">
                        {refundable > 0n ? (
                          isRefunding ? (
                            <div className="flex flex-col items-end gap-2">
                              <Input
                                value={refundReason}
                                onChange={(event) => setRefundReason(event.target.value)}
                                placeholder="Motivo (opcional)"
                                maxLength={500}
                                className="w-56"
                              />
                              {refundError ? (
                                <p className="text-xs text-rose-300">{refundError}</p>
                              ) : null}
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={refundSubmitting}
                                  onClick={() => setRefundingId(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={refundSubmitting}
                                  onClick={() => submitRefund(payment.id, refundable.toString())}
                                >
                                  {refundSubmitting
                                    ? "Reembolsando…"
                                    : `Reembolsar ${formatMoney(refundable.toString(), payment.currency)}`}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startRefund(payment.id)}
                            >
                              <Undo2 className="mr-1 size-3.5" />
                              Reembolsar
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>

      {refunds.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Reembolsos</CardTitle>
            <CardDescription>
              En el MVP solo se admiten reembolsos totales de pagos sin proveedor.
            </CardDescription>
          </CardHeader>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Estado</Th>
                  <Th className="text-right">Importe</Th>
                  <Th>Motivo</Th>
                  <Th>Registrado</Th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <Td>
                      <PaymentStatusBadge status={refund.status} />
                    </Td>
                    <Td className="text-right">{formatMoney(refund.amount, refund.currency)}</Td>
                    <Td className="text-slate-300">{refund.reason ?? "—"}</Td>
                    <Td>{formatDateTime(refund.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Comprobante</CardTitle>
          <CardDescription>
            Comprobante interno, no fiscal. {receipt ? "Listo para imprimir." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!receipt ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Badge tone="warning">Sin comprobante</Badge>
              {receiptError ?? "El comprobante se genera cuando la venta tiene un pago aprobado."}
            </div>
          ) : (
            <div className="flex flex-col gap-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Comercio">
                  {receipt.merchant.name}
                  {receipt.merchant.taxId ? ` · NIT ${receipt.merchant.taxId}` : ""}
                </Detail>
                <Detail label="Sucursal">
                  {receipt.branch.name}
                  {receipt.branch.address ? ` · ${receipt.branch.address}` : ""}
                </Detail>
                <Detail label="Comprobante">{receipt.receiptNumber}</Detail>
                <Detail label="Emitido">{formatDateTime(receipt.issuedAt)}</Detail>
              </div>

              {receipt.simulated ? (
                <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-200">
                  Comprobante con pago <strong>simulado</strong>.
                </p>
              ) : null}

              <div className="flex flex-col gap-2">
                <TotalRow
                  label="Subtotal"
                  value={formatMoney(receipt.totals.subtotal, sale.currency)}
                />
                <TotalRow
                  label="Descuento"
                  value={formatMoney(receipt.totals.discount, sale.currency)}
                />
                <TotalRow
                  label="Impuestos"
                  value={formatMoney(receipt.totals.tax, sale.currency)}
                />
                <TotalRow
                  label="Total"
                  value={formatMoney(receipt.totals.total, sale.currency)}
                  emphasized
                />
              </div>

              <p className="text-xs text-slate-500">
                Los comprobantes del MVP son internos y no fiscales.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-slate-200">{children}</p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${emphasized ? "font-semibold" : ""}`}>
      <span className={emphasized ? "text-slate-100" : "text-slate-400"}>{label}</span>
      <span className={emphasized ? "text-slate-50" : "text-slate-200"}>{value}</span>
    </div>
  );
}
