import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/input";
import { createCashMovement } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { CashDirection, ManualCashMovementType } from "@/lib/types";

interface CashMovementFormProps {
  sessionId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const MONEY_PATTERN = /^\d+$/;
const SELECT_CLASS =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100";

export function CashMovementForm({ sessionId, onSaved, onCancel }: CashMovementFormProps) {
  const [type, setType] = useState<ManualCashMovementType>("DEPOSIT");
  const [direction, setDirection] = useState<CashDirection>("IN");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const value = amount.trim();

    if (!MONEY_PATTERN.test(value) || Number(value) <= 0) {
      setError("El importe debe ser un entero en pesos mayor que cero.");
      return;
    }

    setSubmitting(true);

    try {
      await createCashMovement(sessionId, {
        type,
        direction,
        amount: value,
        ...(description.trim() ? { description: description.trim() } : {}),
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="cash-movement-type" required>
          <select
            id="cash-movement-type"
            className={SELECT_CLASS}
            value={type}
            onChange={(event) => setType(event.target.value as ManualCashMovementType)}
          >
            <option value="DEPOSIT">Depósito</option>
            <option value="WITHDRAWAL">Retiro</option>
            <option value="ADJUSTMENT">Ajuste</option>
          </select>
        </Field>

        <Field
          label="Dirección"
          htmlFor="cash-movement-direction"
          hint="IN suma al esperado; OUT lo resta."
          required
        >
          <select
            id="cash-movement-direction"
            className={SELECT_CLASS}
            value={direction}
            onChange={(event) => setDirection(event.target.value as CashDirection)}
          >
            <option value="IN">Entrada</option>
            <option value="OUT">Salida</option>
          </select>
        </Field>
      </div>

      <Field label="Importe" htmlFor="cash-movement-amount" required>
        <Input
          id="cash-movement-amount"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="10000"
        />
      </Field>

      <Field label="Descripción" htmlFor="cash-movement-description">
        <Textarea
          id="cash-movement-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          placeholder="Motivo del movimiento (opcional)"
        />
      </Field>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Registrando…" : "Registrar movimiento"}
        </Button>
      </div>
    </form>
  );
}
