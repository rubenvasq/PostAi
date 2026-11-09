import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Textarea } from "@/components/ui/input";
import { createExpense } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { PublicCashSession } from "@/lib/types";

interface ExpenseFormProps {
  session: PublicCashSession | null;
  onSaved: () => void;
  onCancel: () => void;
}

const MONEY_PATTERN = /^\d+$/;

export function ExpenseForm({ session, onSaved, onCancel }: ExpenseFormProps) {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [linkSession, setLinkSession] = useState(session !== null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const value = amount.trim();

    if (!category.trim()) {
      setError("La categoría es obligatoria.");
      return;
    }

    if (!MONEY_PATTERN.test(value) || Number(value) <= 0) {
      setError("El importe debe ser un entero en pesos mayor que cero.");
      return;
    }

    setSubmitting(true);

    try {
      await createExpense({
        category: category.trim(),
        amount: value,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(linkSession && session ? { sessionId: session.id } : {}),
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
      <Field label="Categoría" htmlFor="expense-category" required>
        <Input
          id="expense-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          maxLength={80}
          placeholder="Insumos, transporte, servicios…"
        />
      </Field>

      <Field label="Importe" htmlFor="expense-amount" required>
        <Input
          id="expense-amount"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="12000"
        />
      </Field>

      <Field label="Descripción" htmlFor="expense-description">
        <Textarea
          id="expense-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          placeholder="Detalle del gasto (opcional)"
        />
      </Field>

      {session ? (
        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Checkbox
            checked={linkSession}
            onChange={(event) => setLinkSession(event.target.checked)}
          />
          Descontar de la caja abierta
        </label>
      ) : (
        <p className="text-xs text-slate-500">
          No hay caja abierta: el gasto se registra sin afectar el efectivo.
        </p>
      )}

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Registrando…" : "Registrar gasto"}
        </Button>
      </div>
    </form>
  );
}
