import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/input";
import { createCategory, updateCategory } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { PublicCategory } from "@/lib/types";

interface CategoryFormProps {
  category?: PublicCategory;
  onSaved: () => void;
  onCancel: () => void;
}

export function CategoryForm({ category, onSaved, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedColor = color.trim();
    const parsedSortOrder = Number(sortOrder);

    if (!trimmedName) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (trimmedColor && !/^#[0-9a-fA-F]{6}$/.test(trimmedColor)) {
      setError("El color debe tener el formato hexadecimal #RRGGBB.");
      return;
    }

    if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0 || parsedSortOrder > 1000) {
      setError("El orden debe ser un entero entre 0 y 1000.");
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        name: trimmedName,
        color: trimmedColor || undefined,
        sortOrder: parsedSortOrder,
        isActive,
      };

      if (category) {
        await updateCategory(category.id, body);
      } else {
        await createCategory(body);
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
      <Field label="Nombre" htmlFor="category-name" required>
        <Input
          id="category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Bebidas"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Color" htmlFor="category-color" hint="Formato #RRGGBB. Opcional.">
          <Input
            id="category-color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            placeholder="#22C55E"
          />
        </Field>

        <Field label="Orden" htmlFor="category-order" hint="Entero entre 0 y 1000.">
          <Input
            id="category-order"
            inputMode="numeric"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </Field>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-300">
        <Checkbox checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Activa
      </label>

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
