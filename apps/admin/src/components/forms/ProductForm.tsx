import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/input";
import { createProduct, updateProduct } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { ProductType, PublicCategory, PublicProduct, PublicTaxRate } from "@/lib/types";

interface ProductFormProps {
  product?: PublicProduct;
  categories: PublicCategory[];
  taxRates: PublicTaxRate[];
  onSaved: () => void;
  onCancel: () => void;
}

export function ProductForm({
  product,
  categories,
  taxRates,
  onSaved,
  onCancel,
}: ProductFormProps) {
  const [type, setType] = useState<ProductType>(product?.type ?? "PRODUCT");
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [taxRateId, setTaxRateId] = useState(product?.taxRateId ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [trackInventory, setTrackInventory] = useState(product?.trackInventory ?? false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedPrice = price.trim();

    if (!trimmedName) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!/^\d+$/.test(trimmedPrice)) {
      setError("El precio debe ser un entero en pesos, sin decimales.");
      return;
    }

    setSubmitting(true);

    try {
      const common = {
        type,
        name: trimmedName,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        description: description.trim() || undefined,
        price: trimmedPrice,
        trackInventory: type === "SERVICE" ? false : trackInventory,
        isActive,
      };

      if (product) {
        await updateProduct(product.id, {
          ...common,
          categoryId: categoryId || null,
          taxRateId: taxRateId || null,
        });
      } else {
        await createProduct({
          ...common,
          categoryId: categoryId || undefined,
          taxRateId: taxRateId || undefined,
        });
      }

      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="product-type" required>
          <Select
            id="product-type"
            value={type}
            onChange={(event) => setType(event.target.value as ProductType)}
          >
            <option value="PRODUCT">Producto</option>
            <option value="SERVICE">Servicio</option>
          </Select>
        </Field>

        <Field
          label="Precio (COP)"
          htmlFor="product-price"
          hint="Entero en pesos, sin decimales."
          required
        >
          <Input
            id="product-price"
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="10000"
          />
        </Field>

        <Field label="Nombre" htmlFor="product-name" required className="sm:col-span-2">
          <Input
            id="product-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Café americano"
          />
        </Field>

        <Field label="SKU" htmlFor="product-sku">
          <Input
            id="product-sku"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder="CAF-001"
          />
        </Field>

        <Field label="Código de barras" htmlFor="product-barcode">
          <Input
            id="product-barcode"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            placeholder="7701234567890"
          />
        </Field>

        <Field label="Categoría" htmlFor="product-category">
          <Select
            id="product-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Impuesto" htmlFor="product-tax">
          <Select
            id="product-tax"
            value={taxRateId}
            onChange={(event) => setTaxRateId(event.target.value)}
          >
            <option value="">Sin impuesto</option>
            {taxRates.map((taxRate) => (
              <option key={taxRate.id} value={taxRate.id}>
                {taxRate.name} ({taxRate.rateBp / 100} %)
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Descripción" htmlFor="product-description" className="sm:col-span-2">
          <Textarea
            id="product-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Checkbox
            checked={type === "SERVICE" ? false : trackInventory}
            disabled={type === "SERVICE"}
            onChange={(event) => setTrackInventory(event.target.checked)}
          />
          Controla inventario
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Checkbox checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Activo
        </label>
      </div>

      {type === "SERVICE" ? (
        <p className="text-xs text-slate-500">Los servicios no controlan inventario.</p>
      ) : null}

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
