import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/input";
import { adjustInventory } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatQuantity } from "@/lib/format";
import type { PublicInventoryItem } from "@/lib/types";

interface InventoryAdjustmentFormProps {
  item: PublicInventoryItem;
  onSaved: () => void;
  onCancel: () => void;
}

const DECIMAL_PATTERN = /^-?\d+(\.\d{1,3})?$/;

export function InventoryAdjustmentForm({ item, onSaved, onCancel }: InventoryAdjustmentFormProps) {
  const [quantityDelta, setQuantityDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const trimmedDelta = quantityDelta.trim();
    const trimmedReason = reason.trim();

    if (!DECIMAL_PATTERN.test(trimmedDelta)) {
      setError("La cantidad debe ser un número con hasta tres decimales.");
      return;
    }

    const delta = Number(trimmedDelta);

    if (!Number.isFinite(delta) || delta === 0) {
      setError("El ajuste no puede ser cero.");
      return;
    }

    if (!trimmedReason) {
      setError("El motivo es obligatorio.");
      return;
    }

    setSubmitting(true);

    try {
      await adjustInventory(item.productId, { quantityDelta: delta, reason: trimmedReason });
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
        <p className="font-medium text-slate-200">{item.productName}</p>
        <p className="text-xs text-slate-400">
          Stock actual: {formatQuantity(item.quantity)}
          {item.sku ? ` · SKU ${item.sku}` : ""}
        </p>
      </div>

      <Field
        label="Cantidad del ajuste"
        htmlFor="adjustment-quantity"
        hint="Positivo para sumar, negativo para restar. Máximo tres decimales."
        required
      >
        <Input
          id="adjustment-quantity"
          inputMode="decimal"
          value={quantityDelta}
          onChange={(event) => setQuantityDelta(event.target.value)}
          placeholder="10 o -2.5"
        />
      </Field>

      <Field label="Motivo" htmlFor="adjustment-reason" required>
        <Textarea
          id="adjustment-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={200}
          placeholder="Conteo físico, merma, devolución…"
        />
      </Field>

      <p className="text-xs text-slate-500">
        El backend rechaza el ajuste si dejaría el stock en negativo.
      </p>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Registrando…" : "Registrar ajuste"}
        </Button>
      </div>
    </form>
  );
}
