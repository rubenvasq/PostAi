import { Eye, Search, SlidersHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/DataState";
import { InventoryAdjustmentForm } from "@/components/forms/InventoryAdjustmentForm";
import { PageHeader } from "@/components/PageHeader";
import { MovementTypeLabel } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/useAsyncData";
import { listInventory, listInventoryMovements } from "@/lib/api";
import { formatDateTime, formatQuantity, shortId } from "@/lib/format";
import type { PublicInventoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "stock" | "movements";

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [stockPage, setStockPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const [movementProductId, setMovementProductId] = useState("");
  const [adjustmentItem, setAdjustmentItem] = useState<PublicInventoryItem | null>(null);

  const stock = useAsyncData(
    () =>
      listInventory({
        search: search || undefined,
        lowStock: lowStock || undefined,
        page: stockPage,
        pageSize: 20,
      }),
    [search, lowStock, stockPage],
  );
  const movements = useAsyncData(
    () =>
      listInventoryMovements({
        productId: movementProductId || undefined,
        page: movementPage,
        pageSize: 20,
      }),
    [movementProductId, movementPage],
  );

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSearch(searchInput.trim());
    setStockPage(1);
  }

  function showMovementsFor(item: PublicInventoryItem): void {
    setMovementProductId(item.productId);
    setMovementPage(1);
    setTab("movements");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventario"
        description="Stock de la sucursal principal. Los ajustes quedan registrados como movimientos inmutables."
      />

      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition",
            tab === "stock"
              ? "bg-emerald-500/15 text-emerald-300"
              : "text-slate-400 hover:text-slate-100",
          )}
          onClick={() => setTab("stock")}
        >
          Stock
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition",
            tab === "movements"
              ? "bg-emerald-500/15 text-emerald-300"
              : "text-slate-400 hover:text-slate-100",
          )}
          onClick={() => setTab("movements")}
        >
          Movimientos
        </button>
      </div>

      {tab === "stock" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <form
            className="flex flex-wrap items-end gap-3 border-b border-slate-800 px-5 py-3"
            onSubmit={handleSearch}
          >
            <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs text-slate-400">
              Buscar
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nombre o SKU"
              />
            </label>
            <label className="inline-flex items-center gap-2 pb-2 text-sm text-slate-300">
              <Checkbox
                checked={lowStock}
                onChange={(event) => {
                  setLowStock(event.target.checked);
                  setStockPage(1);
                }}
              />
              Solo stock bajo
            </label>
            <Button type="submit" variant="outline">
              <Search className="mr-1 size-4" />
              Buscar
            </Button>
          </form>

          {stock.loading && !stock.data ? <LoadingState label="Cargando inventario…" /> : null}
          {stock.error && !stock.data ? (
            <ErrorState message={stock.error} onRetry={stock.reload} />
          ) : null}

          {stock.data && stock.data.data.length === 0 ? (
            <EmptyState
              title="No hay productos inventariables"
              description="Solo aparecen productos con control de inventario activo."
            />
          ) : null}

          {stock.data && stock.data.data.length > 0 ? (
            <>
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Producto</Th>
                      <Th>SKU</Th>
                      <Th className="text-right">Stock</Th>
                      <Th className="text-right">Umbral</Th>
                      <Th>Actualizado</Th>
                      <Th className="text-right">Acciones</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.data.data.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-800/40">
                        <Td className="font-medium">{item.productName}</Td>
                        <Td className="text-xs text-slate-400">{item.sku ?? "—"}</Td>
                        <Td className="text-right font-medium">{formatQuantity(item.quantity)}</Td>
                        <Td className="text-right text-xs text-slate-400">
                          {item.lowStockThreshold === null
                            ? "—"
                            : formatQuantity(item.lowStockThreshold)}
                        </Td>
                        <Td className="whitespace-nowrap text-xs text-slate-400">
                          {formatDateTime(item.updatedAt)}
                        </Td>
                        <Td>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => setAdjustmentItem(item)}
                              aria-label={`Ajustar ${item.productName}`}
                            >
                              <SlidersHorizontal className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => showMovementsFor(item)}
                              aria-label={`Ver movimientos de ${item.productName}`}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
              <Pagination meta={stock.data.meta} onPageChange={setStockPage} />
            </>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
            <p className="text-xs text-slate-400">
              {movementProductId
                ? `Filtrado por producto ${shortId(movementProductId)}`
                : "Últimos movimientos del comercio"}
            </p>
            {movementProductId ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMovementProductId("");
                  setMovementPage(1);
                }}
              >
                Quitar filtro
              </Button>
            ) : null}
          </div>

          {movements.loading && !movements.data ? (
            <LoadingState label="Cargando movimientos…" />
          ) : null}
          {movements.error && !movements.data ? (
            <ErrorState message={movements.error} onRetry={movements.reload} />
          ) : null}

          {movements.data && movements.data.data.length === 0 ? (
            <EmptyState
              title="Sin movimientos"
              description="No hay ajustes ni ventas registrados."
            />
          ) : null}

          {movements.data && movements.data.data.length > 0 ? (
            <>
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Fecha</Th>
                      <Th>Tipo</Th>
                      <Th>Producto</Th>
                      <Th className="text-right">Cambio</Th>
                      <Th className="text-right">Antes → Después</Th>
                      <Th>Motivo</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.data.data.map((movement) => (
                      <tr key={movement.id}>
                        <Td className="whitespace-nowrap text-xs text-slate-400">
                          {formatDateTime(movement.createdAt)}
                        </Td>
                        <Td className="text-xs">
                          <MovementTypeLabel type={movement.type} />
                        </Td>
                        <Td className="text-xs text-slate-400">{shortId(movement.productId)}</Td>
                        <Td className="text-right">
                          <span
                            className={
                              movement.quantityDelta < 0 ? "text-rose-300" : "text-emerald-300"
                            }
                          >
                            {movement.quantityDelta > 0 ? "+" : ""}
                            {formatQuantity(movement.quantityDelta)}
                          </span>
                        </Td>
                        <Td className="text-right text-xs text-slate-400">
                          {formatQuantity(movement.previousQuantity)} →{" "}
                          {formatQuantity(movement.newQuantity)}
                        </Td>
                        <Td className="text-xs text-slate-400">{movement.reason ?? "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
              <Pagination meta={movements.data.meta} onPageChange={setMovementPage} />
            </>
          ) : null}
        </div>
      )}

      <Modal
        open={adjustmentItem !== null}
        title="Ajuste de inventario"
        description="El ajuste se registra con tu usuario y queda en la bitácora."
        onClose={() => setAdjustmentItem(null)}
      >
        {adjustmentItem ? (
          <InventoryAdjustmentForm
            item={adjustmentItem}
            onSaved={() => {
              setAdjustmentItem(null);
              stock.reload();
              movements.reload();
            }}
            onCancel={() => setAdjustmentItem(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
