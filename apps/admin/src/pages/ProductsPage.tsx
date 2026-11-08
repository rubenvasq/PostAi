import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/DataState";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { ProductForm } from "@/components/forms/ProductForm";
import { TaxRateForm } from "@/components/forms/TaxRateForm";
import { PageHeader } from "@/components/PageHeader";
import { ActiveBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  deactivateCategory,
  deactivateProduct,
  listCategories,
  listProducts,
  listTaxRates,
} from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatMoney, formatRateBp } from "@/lib/format";
import type { PublicCategory, PublicProduct } from "@/lib/types";

type ActiveFilter = "" | "true" | "false";

export function ProductsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("");
  const [page, setPage] = useState(1);
  const [productModal, setProductModal] = useState<{ product?: PublicProduct } | null>(null);
  const [categoryModal, setCategoryModal] = useState<{ category?: PublicCategory } | null>(null);
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const products = useAsyncData(
    () =>
      listProducts({
        search: search || undefined,
        active: active === "" ? undefined : active === "true",
        page,
        pageSize: 20,
      }),
    [search, active, page],
  );
  const categories = useAsyncData(() => listCategories(), []);
  const taxRates = useAsyncData(() => listTaxRates(), []);

  const categoryList = categories.data?.data ?? [];
  const taxRateList = taxRates.data?.data ?? [];

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  async function handleDeactivateProduct(product: PublicProduct): Promise<void> {
    if (!window.confirm(`¿Desactivar el producto "${product.name}"?`)) {
      return;
    }

    setActionError(null);

    try {
      await deactivateProduct(product.id);
      products.reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
    }
  }

  async function handleDeactivateCategory(category: PublicCategory): Promise<void> {
    if (!window.confirm(`¿Desactivar la categoría "${category.name}"?`)) {
      return;
    }

    setActionError(null);

    try {
      await deactivateCategory(category.id);
      categories.reload();
    } catch (caught) {
      setActionError(errorMessage(caught));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo"
        description="Productos, servicios, categorías e impuestos del comercio. Los importes se guardan en pesos enteros."
        actions={
          <Button onClick={() => setProductModal({})}>
            <Plus className="mr-1 size-4" />
            Nuevo producto
          </Button>
        }
      />

      {actionError ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {actionError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Productos y servicios</CardTitle>
          <CardDescription>Búsqueda por nombre, SKU o código de barras.</CardDescription>
        </CardHeader>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-800 px-5 py-3">
          <form className="flex flex-1 flex-wrap items-end gap-2" onSubmit={handleSearch}>
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-slate-400">
              Buscar
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nombre, SKU o código"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Estado
              <Select
                value={active}
                onChange={(event) => {
                  setActive(event.target.value as ActiveFilter);
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </Select>
            </label>
            <Button type="submit" variant="outline">
              <Search className="mr-1 size-4" />
              Buscar
            </Button>
          </form>
        </div>

        {products.loading && !products.data ? <LoadingState label="Cargando productos…" /> : null}
        {products.error && !products.data ? (
          <ErrorState message={products.error} onRetry={products.reload} />
        ) : null}

        {products.data && products.data.data.length === 0 ? (
          <EmptyState
            title="No hay productos con estos filtros"
            description="Crea un producto o cambia la búsqueda."
            action={
              <Button size="sm" onClick={() => setProductModal({})}>
                Crear producto
              </Button>
            }
          />
        ) : null}

        {products.data && products.data.data.length > 0 ? (
          <>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th>SKU</Th>
                    <Th>Categoría</Th>
                    <Th className="text-right">Precio</Th>
                    <Th>Inventario</Th>
                    <Th>Estado</Th>
                    <Th className="text-right">Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {products.data.data.map((product) => {
                    const category = categoryList.find((item) => item.id === product.categoryId);

                    return (
                      <tr key={product.id} className="hover:bg-slate-800/40">
                        <Td>
                          <div className="flex flex-col">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-xs text-slate-500">
                              {product.type === "SERVICE" ? "Servicio" : "Producto"}
                            </span>
                          </div>
                        </Td>
                        <Td className="text-xs text-slate-400">{product.sku ?? "—"}</Td>
                        <Td className="text-xs text-slate-400">{category?.name ?? "—"}</Td>
                        <Td className="text-right font-medium">
                          {formatMoney(product.price, product.currency)}
                        </Td>
                        <Td className="text-xs text-slate-400">
                          {product.trackInventory ? "Sí" : "No"}
                        </Td>
                        <Td>
                          <ActiveBadge active={product.isActive} />
                        </Td>
                        <Td>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => setProductModal({ product })}
                              aria-label={`Editar ${product.name}`}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => void handleDeactivateProduct(product)}
                              aria-label={`Desactivar ${product.name}`}
                              disabled={!product.isActive}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
            <Pagination meta={products.data.meta} onPageChange={setPage} />
          </>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Categorías</CardTitle>
                <CardDescription>Organiza el catálogo por grupos.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCategoryModal({})}>
                <Plus className="mr-1 size-3.5" />
                Nueva
              </Button>
            </div>
          </CardHeader>

          {categories.loading && !categories.data ? <LoadingState /> : null}
          {categories.error && !categories.data ? (
            <ErrorState message={categories.error} onRetry={categories.reload} />
          ) : null}
          {categories.data && categoryList.length === 0 ? (
            <EmptyState title="Sin categorías" description="Crea la primera categoría." />
          ) : null}

          {categoryList.length > 0 ? (
            <CardContent className="flex flex-col gap-2">
              {categoryList.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full border border-slate-700"
                      style={{ backgroundColor: category.color ?? "#334155" }}
                    />
                    <span className="truncate text-sm text-slate-200">{category.name}</span>
                    <span className="text-[11px] text-slate-500">Orden {category.sortOrder}</span>
                    <ActiveBadge active={category.isActive} />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => setCategoryModal({ category })}
                      aria-label={`Editar ${category.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => void handleDeactivateCategory(category)}
                      aria-label={`Desactivar ${category.name}`}
                      disabled={!category.isActive}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Impuestos</CardTitle>
                <CardDescription>
                  Se aplican a los productos que los tengan asignados.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setTaxModalOpen(true)}>
                <Plus className="mr-1 size-3.5" />
                Nuevo
              </Button>
            </div>
          </CardHeader>

          {taxRates.loading && !taxRates.data ? <LoadingState /> : null}
          {taxRates.error && !taxRates.data ? (
            <ErrorState message={taxRates.error} onRetry={taxRates.reload} />
          ) : null}
          {taxRates.data && taxRateList.length === 0 ? (
            <EmptyState title="Sin impuestos" description="Crea el primer impuesto." />
          ) : null}

          {taxRateList.length > 0 ? (
            <CardContent className="flex flex-col gap-2">
              {taxRateList.map((taxRate) => (
                <div
                  key={taxRate.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-200">{taxRate.name}</span>
                    <span className="text-xs text-slate-400">{formatRateBp(taxRate.rateBp)}</span>
                    {taxRate.isDefault ? <Badge tone="info">Predeterminado</Badge> : null}
                  </div>
                  <ActiveBadge active={taxRate.isActive} />
                </div>
              ))}
            </CardContent>
          ) : null}
        </Card>
      </div>

      <Modal
        open={productModal !== null}
        title={productModal?.product ? "Editar producto" : "Nuevo producto"}
        description="El precio y los impuestos se validan en el backend."
        onClose={() => setProductModal(null)}
      >
        <ProductForm
          product={productModal?.product}
          categories={categoryList}
          taxRates={taxRateList}
          onSaved={() => {
            setProductModal(null);
            products.reload();
          }}
          onCancel={() => setProductModal(null)}
        />
      </Modal>

      <Modal
        open={categoryModal !== null}
        title={categoryModal?.category ? "Editar categoría" : "Nueva categoría"}
        onClose={() => setCategoryModal(null)}
      >
        <CategoryForm
          category={categoryModal?.category}
          onSaved={() => {
            setCategoryModal(null);
            categories.reload();
          }}
          onCancel={() => setCategoryModal(null)}
        />
      </Modal>

      <Modal
        open={taxModalOpen}
        title="Nuevo impuesto"
        description="La tasa se envía al backend en puntos base."
        onClose={() => setTaxModalOpen(false)}
      >
        <TaxRateForm
          onSaved={() => {
            setTaxModalOpen(false);
            taxRates.reload();
          }}
          onCancel={() => setTaxModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
