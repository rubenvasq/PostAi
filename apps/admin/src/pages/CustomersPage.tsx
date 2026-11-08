import { Pencil, Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/DataState";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/useAsyncData";
import { listCustomers } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { PublicCustomer } from "@/lib/types";

export function CustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ customer?: PublicCustomer } | null>(null);
  const customers = useAsyncData(
    () => listCustomers({ search: search || undefined, page, pageSize: 20 }),
    [search, page],
  );

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Consulta y edita los clientes del comercio. No se eliminan, según el contrato de la API."
        actions={
          <Button onClick={() => setModal({})}>
            <Plus className="mr-1 size-4" />
            Nuevo cliente
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <form
          className="flex flex-wrap items-end gap-2 border-b border-slate-800 px-5 py-3"
          onSubmit={handleSearch}
        >
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs text-slate-400">
            Buscar
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nombre, correo, teléfono o identificación"
            />
          </label>
          <Button type="submit" variant="outline">
            <Search className="mr-1 size-4" />
            Buscar
          </Button>
        </form>

        {customers.loading && !customers.data ? <LoadingState label="Cargando clientes…" /> : null}
        {customers.error && !customers.data ? (
          <ErrorState message={customers.error} onRetry={customers.reload} />
        ) : null}

        {customers.data && customers.data.data.length === 0 ? (
          <EmptyState
            title="No hay clientes con esta búsqueda"
            description="Crea un cliente o cambia los términos de búsqueda."
            action={
              <Button size="sm" onClick={() => setModal({})}>
                Crear cliente
              </Button>
            }
          />
        ) : null}

        {customers.data && customers.data.data.length > 0 ? (
          <>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Cliente</Th>
                    <Th>Contacto</Th>
                    <Th>Identificación</Th>
                    <Th>Notas</Th>
                    <Th>Creado</Th>
                    <Th className="text-right">Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {customers.data.data.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-800/40">
                      <Td className="font-medium">{customer.name}</Td>
                      <Td>
                        <div className="flex flex-col text-xs text-slate-400">
                          <span>{customer.email ?? "—"}</span>
                          <span>{customer.phone ?? "—"}</span>
                        </div>
                      </Td>
                      <Td className="text-xs text-slate-400">{customer.taxId ?? "—"}</Td>
                      <Td className="max-w-56 text-xs text-slate-400">
                        <span className="line-clamp-2">{customer.notes ?? "—"}</span>
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-slate-400">
                        {formatDate(customer.createdAt)}
                      </Td>
                      <Td className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => setModal({ customer })}
                          aria-label={`Editar ${customer.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <Pagination meta={customers.data.meta} onPageChange={setPage} />
          </>
        ) : null}
      </div>

      <Modal
        open={modal !== null}
        title={modal?.customer ? "Editar cliente" : "Nuevo cliente"}
        description="Los campos vacíos se guardan como nulos."
        onClose={() => setModal(null)}
      >
        <CustomerForm
          customer={modal?.customer}
          onSaved={() => {
            setModal(null);
            customers.reload();
          }}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
