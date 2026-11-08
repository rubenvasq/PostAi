import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/input";
import { createTaxRate } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

interface TaxRateFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

export function TaxRateForm({ onSaved, onCancel }: TaxRateFormProps) {
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedPercent = percent.trim();

    if (!trimmedName) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(trimmedPercent)) {
      setError("La tasa debe ser un porcentaje con hasta dos decimales.");
      return;
    }

    const rate = Number(trimmedPercent);

    if (rate < 0 || rate > 100) {
      setError("La tasa debe estar entre 0 y 100 %.");
      return;
    }

    setSubmitting(true);

    try {
      await createTaxRate({
        name: trimmedName,
        rateBp: Math.round(rate * 100),
        isDefault,
        isActive,
      });
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="Nombre" htmlFor="tax-name" required>
        <Input
          id="tax-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="IVA 19 %"
        />
      </Field>

      <Field
        label="Tasa (%)"
        htmlFor="tax-percent"
        hint="Hasta dos decimales. Ejemplo: 19."
        required
      >
        <Input
          id="tax-percent"
          inputMode="decimal"
          value={percent}
          onChange={(event) => setPercent(event.target.value)}
          placeholder="19"
        />
      </Field>

      <div className="flex flex-wrap gap-5">
        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Checkbox checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
          Predeterminado
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Checkbox checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Activo
        </label>
      </div>

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
