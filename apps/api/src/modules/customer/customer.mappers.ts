import type { CustomerRecord } from "./customer.types.js";

export interface PublicCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  notes: string | null;
  createdAt: string;
}

export function toPublicCustomer(customer: CustomerRecord): PublicCustomer {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    taxId: customer.taxId,
    notes: customer.notes,
    createdAt: customer.createdAt.toISOString(),
  };
}
