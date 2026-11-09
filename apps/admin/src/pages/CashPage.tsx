import { ArrowDownLeft, ArrowUpRight, Plus, Receipt, Wallet } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/DataState";
import { CashCloseForm } from "@/components/forms/CashCloseForm";
import { CashMovementForm } from "@/components/forms/CashMovementForm";
import { CashOpenForm } from "@/components/forms/CashOpenForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { CashMovementTypeLabel, CashSessionStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  ApiError,
  getCurrentCashSession,
  listCashMovements,
  listCashSessions,
  listExpenses,
} from "@/lib/api";
import { formatDateTime, formatMoney, shortId } from "@/lib/format";
import type { PublicCashMovement } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "session" | "expenses";

export function CashPage() {
  const [tab, setTab] = useState<Tab>("session");
  const [refreshKey, setRefreshKey] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);

  const refresh = () => setRefreshKey((value) => value + 1);

  const current = useAsyncData(async () => {
    try {
      return await getCurrentCashSession();
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }, [refreshKey]);

  const sessionId = current.data?.id ?? null;

  const movements = useAsyncData(
    () => (sessionId ? listCashMovements(sessionId) : Promise.resolve({ data: [] })),
    [sessionId, refreshKey],
  );
  const history = useAsyncData(
    () => listCashSessions({ page: historyPage, pageSize: 10 }),
    [historyPage, refreshKey],
  );
  const expenses = useAsyncData(
    () => listExpenses({ page: expensePage, pageSize: 10 }),
    [expensePage, refreshKey],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Caja y gastos"
        description="Apertura, movimientos, cierre y gastos de la sucursal principal."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setExpenseModal(true)}>
              <Receipt className="mr-1 size-4" />
              Registrar gasto
            </Button>
            {current.data ? (
              <Button variant="outline" onClick={() => setMovementModal(true)}>
                <Plus className="mr-1 size-4" />
                Movimiento
              </Button>
            ) : (
              <Button onClick={() => setOpenModal(true)}>Abrir caja</Button>
            )}
          </div>
        }
      />

      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition",
            tab === "session"
              ? "bg-emerald-500/15 text-emerald-300"
              : "text-slate-400 hover:text-slate-100",
          )}
          onClick={() => setTab("session")}
        >
          Caja
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition",
            tab === "expenses"
              ? "bg-emerald-500/15 text-emerald-300"
              : "text-slate-400 hover:text-slate-100",
          )}
          onClick={() => setTab("expenses")}
        >
          Gastos
        </button>
      </div>

      {tab === "session" ? (
        <>
          {current.loading && !current.data ? <LoadingState label="Cargando caja…" /> : null}
          {current.error && !current.data ? (
            <ErrorState message={current.error} onRetry={current.reload} />
          ) : null}

          {!current.loading && !current.error && !current.data ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay una caja abierta</CardTitle>
                <CardDescription>
                  Abre la caja para registrar el efectivo inicial, ventas en efectivo, retiros,
                  gastos y el cierre del turno.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setOpenModal(true)}>
                  <Wallet className="mr-1 size-4" />
                  Abrir caja
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {current.data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Estado"
                  value={current.data.status === "OPEN" ? "Abierta" : "Cerrada"}
                  hint={`Sesión ${shortId(current.data.id)}`}
                  icon={<Wallet className="size-4" />}
                />
                <StatCard
                  label="Apertura"
                  value={formatMoney(current.data.openingAmount)}
                  hint={formatDateTime(current.data.openedAt)}
                  icon={<ArrowUpRight className="size-4" />}
                />
                <StatCard
                  label="Movimientos"
                  value={String(movements.data?.data.length ?? 0)}
                  hint="Incluye apertura, ventas, retiros y gastos"
                  icon={<Receipt className="size-4" />}
                />
                <StatCard
                  label="Sucursal"
                  value={shortId(current.data.branchId)}
                  hint="Sucursal principal del comercio"
                  icon={<Wallet className="size-4" />}
                />
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>Movimientos de la caja abierta</CardTitle>
                      <CardDescription>
                        Cada movimiento es inmutable y ajusta el efectivo esperado del cierre.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setMovementModal(true)}>
                        <Plus className="mr-1 size-3.5" />
                        Movimiento
                      </Button>
                      <Button size="sm" onClick={() => setCloseModal(true)}>
                        Cerrar caja
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {movements.loading && !movements.data ? (
                  <LoadingState label="Cargando movimientos…" />
                ) : null}
                {movements.error && !movements.data ? (
                  <ErrorState message={movements.error} onRetry={movements.reload} />
                ) : null}
                {movements.data && movements.data.data.length === 0 ? (
                  <EmptyState
                    title="Sin movimientos todavía"
                    description="Registra un depósito, retiro o gasto para verlo aquí."
                  />
                ) : null}
                {movements.data && movements.data.data.length > 0 ? (
                  <TableWrap>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Fecha</Th>
                          <Th>Tipo</Th>
                          <Th>Dirección</Th>
                          <Th className="text-right">Importe</Th>
                          <Th>Descripción</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.data.data.map((movement) => (
                          <tr key={movement.id}>
                            <Td className="whitespace-nowrap text-xs text-slate-400">
                              {formatDateTime(movement.createdAt)}
                            </Td>
                            <Td className="text-xs">
                              <CashMovementTypeLabel type={movement.type} />
                            </Td>
                            <Td>
                              <DirectionLabel movement={movement} />
                            </Td>
                            <Td
                              className={cn(
                                "text-right font-medium",
                                movement.direction === "IN" ? "text-emerald-300" : "text-rose-300",
                              )}
                            >
                              {movement.direction === "IN" ? "+" : "−"}
                              {formatMoney(movement.amount)}
                            </Td>
                            <Td className="text-xs text-slate-400">
                              {movement.description ?? "—"}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrap>
                ) : null}
              </Card>
            </>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Historial de cajas</CardTitle>
              <CardDescription>
                Cierres anteriores con el efectivo esperado y la diferencia registrada.
              </CardDescription>
            </CardHeader>

            {history.loading && !history.data ? <LoadingState label="Cargando historial…" /> : null}
            {history.error && !history.data ? (
              <ErrorState message={history.error} onRetry={history.reload} />
            ) : null}
            {history.data && history.data.data.length === 0 ? (
              <EmptyState title="Sin cajas registradas" />
            ) : null}
            {history.data && history.data.data.length > 0 ? (
              <>
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Abierta</Th>
                        <Th>Estado</Th>
                        <Th className="text-right">Apertura</Th>
                        <Th className="text-right">Cierre</Th>
                        <Th className="text-right">Esperado</Th>
                        <Th className="text-right">Diferencia</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.data.data.map((session) => (
                        <tr key={session.id}>
                          <Td className="whitespace-nowrap text-xs text-slate-400">
                            {formatDateTime(session.openedAt)}
                          </Td>
                          <Td>
                            <CashSessionStatusBadge status={session.status} />
                          </Td>
                          <Td className="text-right">{formatMoney(session.openingAmount)}</Td>
                          <Td className="text-right">
                            {session.closingAmount ? formatMoney(session.closingAmount) : "—"}
                          </Td>
                          <Td className="text-right">
                            {session.expectedAmount ? formatMoney(session.expectedAmount) : "—"}
                          </Td>
                          <Td
                            className={cn(
                              "text-right font-medium",
                              session.difference && session.difference !== "0"
                                ? "text-amber-300"
                                : "text-slate-300",
                            )}
                          >
                            {session.difference ? formatMoney(session.difference) : "—"}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
                <Pagination meta={history.data.meta} onPageChange={setHistoryPage} />
              </>
            ) : null}
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Gastos</CardTitle>
                <CardDescription>
                  Los gastos asociados a una caja abierta se descuentan del efectivo esperado.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setExpenseModal(true)}>
                <Plus className="mr-1 size-3.5" />
                Registrar gasto
              </Button>
            </div>
          </CardHeader>

          {expenses.loading && !expenses.data ? <LoadingState label="Cargando gastos…" /> : null}
          {expenses.error && !expenses.data ? (
            <ErrorState message={expenses.error} onRetry={expenses.reload} />
          ) : null}
          {expenses.data && expenses.data.data.length === 0 ? (
            <EmptyState title="Sin gastos registrados" />
          ) : null}
          {expenses.data && expenses.data.data.length > 0 ? (
            <>
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Fecha</Th>
                      <Th>Categoría</Th>
                      <Th className="text-right">Importe</Th>
                      <Th>Descripción</Th>
                      <Th>Caja</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.data.data.map((expense) => (
                      <tr key={expense.id}>
                        <Td className="whitespace-nowrap text-xs text-slate-400">
                          {formatDateTime(expense.incurredAt)}
                        </Td>
                        <Td className="font-medium">{expense.category}</Td>
                        <Td className="text-right text-rose-300">
                          {formatMoney(expense.amount, expense.currency)}
                        </Td>
                        <Td className="text-xs text-slate-400">{expense.description ?? "—"}</Td>
                        <Td className="text-xs text-slate-400">
                          {expense.sessionId ? shortId(expense.sessionId) : "Sin caja"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
              <Pagination meta={expenses.data.meta} onPageChange={setExpensePage} />
            </>
          ) : null}
        </Card>
      )}

      <Modal
        open={openModal}
        title="Abrir caja"
        description="Registra el efectivo inicial del turno."
        onClose={() => setOpenModal(false)}
      >
        <CashOpenForm
          onSaved={() => {
            setOpenModal(false);
            refresh();
          }}
        />
      </Modal>

      <Modal
        open={closeModal && current.data !== null}
        title="Cerrar caja"
        description="Cuenta el efectivo real antes de cerrar el turno."
        onClose={() => setCloseModal(false)}
      >
        {current.data ? (
          <CashCloseForm
            session={current.data}
            onSaved={() => {
              setCloseModal(false);
              refresh();
            }}
            onCancel={() => setCloseModal(false)}
          />
        ) : null}
      </Modal>

      <Modal
        open={movementModal && sessionId !== null}
        title="Registrar movimiento de caja"
        description="Depósitos, retiros y ajustes manuales."
        onClose={() => setMovementModal(false)}
      >
        {sessionId ? (
          <CashMovementForm
            sessionId={sessionId}
            onSaved={() => {
              setMovementModal(false);
              refresh();
            }}
            onCancel={() => setMovementModal(false)}
          />
        ) : null}
      </Modal>

      <Modal
        open={expenseModal}
        title="Registrar gasto"
        description="El gasto queda en el historial del comercio."
        onClose={() => setExpenseModal(false)}
      >
        <ExpenseForm
          session={current.data}
          onSaved={() => {
            setExpenseModal(false);
            refresh();
          }}
          onCancel={() => setExpenseModal(false)}
        />
      </Modal>
    </div>
  );
}

function DirectionLabel({ movement }: { movement: PublicCashMovement }) {
  const isIn = movement.direction === "IN";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        isIn ? "text-emerald-300" : "text-rose-300",
      )}
    >
      {isIn ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
      {isIn ? "Entrada" : "Salida"}
    </span>
  );
}
