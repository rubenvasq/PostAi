import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/input";
import { closeCashSession } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import type { PublicCashSession } from "@/lib/types";

interface CashCloseFormProps {
  session: PublicCashSession;
  onSaved: () => void;
  onCancel: () => void;
}

const MONEY_PATTERN = /^\d+$/;

export function CashCloseForm({ session, onSaved, onCancel }: CashCloseFormProps) {
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const amount = closingAmount.trim();

    if (!MONEY_PATTERN.test(amount)) {
      setError("El monto debe ser un entero en pesos, sin decimales.");
      return;
    }

    setSubmitting(true);

    try {
      await closeCashSession(session.id, {
        closingAmount: amount,
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
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
        <p className="font-medium text-slate-200">Cierre de caja</p>
        <p className="text-xs text-slate-400">
          Apertura: {formatMoney(session.openingAmount, "COP")} · El esperado lo calcula el backend
          con los movimientos registrados.
        </p>
      </div>

      <Field
        label="Efectivo contado"
        htmlFor="cash-closing-amount"
        hint="Importe real contado al cerrar. La diferencia se calcula solo."
        required
      >
        <Input
          id="cash-closing-amount"
          inputMode="numeric"
          value={closingAmount}
          onChange={(event) => setClosingAmount(event.target.value)}
          placeholder="65000"
        />
      </Field>

      <Field label="Notas de cierre" htmlFor="cash-closing-notes">
        <Textarea
          id="cash-closing-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={500}
          placeholder="Explicación de faltantes o sobrantes (opcional)"
        />
      </Field>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Cerrando…" : "Cerrar caja"}
        </Button>
      </div>
    </form>
  );
}
