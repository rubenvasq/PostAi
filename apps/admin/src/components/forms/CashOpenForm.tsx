import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/input";
import { openCashSession } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

interface CashOpenFormProps {
  onSaved: () => void;
}

const MONEY_PATTERN = /^\d+$/;

export function CashOpenForm({ onSaved }: CashOpenFormProps) {
  const [openingAmount, setOpeningAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const amount = openingAmount.trim();

    if (!MONEY_PATTERN.test(amount)) {
      setError("El monto debe ser un entero en pesos, sin decimales.");
      return;
    }

    setSubmitting(true);

    try {
      await openCashSession({
        openingAmount: amount,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
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
      <Field
        label="Monto de apertura"
        htmlFor="cash-opening-amount"
        hint="Efectivo con el que inicia la caja, en pesos enteros."
        required
      >
        <Input
          id="cash-opening-amount"
          inputMode="numeric"
          value={openingAmount}
          onChange={(event) => setOpeningAmount(event.target.value)}
          placeholder="50000"
        />
      </Field>

      <Field label="Notas" htmlFor="cash-opening-notes">
        <Textarea
          id="cash-opening-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={500}
          placeholder="Observaciones de apertura (opcional)"
        />
      </Field>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex justify-end border-t border-slate-800 pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Abriendo…" : "Abrir caja"}
        </Button>
      </div>
    </form>
  );
}
