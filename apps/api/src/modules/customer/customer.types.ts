export interface CustomerRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface CreateCustomerInput {
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  notes: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  notes?: string | null;
}

export interface ListCustomersParams {
  search?: string;
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface CustomerRepository {
  listCustomers(
    merchantId: string,
    params: ListCustomersParams,
  ): Promise<Paginated<CustomerRecord>>;
  findCustomer(merchantId: string, customerId: string): Promise<CustomerRecord | null>;
  createCustomer(merchantId: string, data: CreateCustomerInput): Promise<CustomerRecord>;
  updateCustomer(
    merchantId: string,
    customerId: string,
    data: UpdateCustomerInput,
  ): Promise<CustomerRecord | null>;
}
