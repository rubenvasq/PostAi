import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/input";
import { createCustomer, updateCustomer } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { PublicCustomer } from "@/lib/types";

interface CustomerFormProps {
  customer?: PublicCustomer;
  onSaved: () => void;
  onCancel: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CustomerForm({ customer, onSaved, onCancel }: CustomerFormProps) {
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [taxId, setTaxId] = useState(customer?.taxId ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
      setError("El correo no tiene un formato válido.");
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        name: trimmedName,
        email: trimmedEmail || null,
        phone: phone.trim() || null,
        taxId: taxId.trim() || null,
        notes: notes.trim() || null,
      };

      if (customer) {
        await updateCustomer(customer.id, body);
      } else {
        await createCustomer(body);
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
      <Field label="Nombre" htmlFor="customer-name" required>
        <Input
          id="customer-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Cliente de mostrador"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Correo" htmlFor="customer-email">
          <Input
            id="customer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="cliente@correo.com"
          />
        </Field>

        <Field label="Teléfono" htmlFor="customer-phone">
          <Input
            id="customer-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="300 000 0000"
          />
        </Field>

        <Field
          label="Identificación tributaria"
          htmlFor="customer-tax-id"
          className="sm:col-span-2"
        >
          <Input
            id="customer-tax-id"
            value={taxId}
            onChange={(event) => setTaxId(event.target.value)}
            placeholder="NIT o cédula"
          />
        </Field>
      </div>

      <Field label="Notas" htmlFor="customer-notes">
        <Textarea
          id="customer-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={500}
        />
      </Field>

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
