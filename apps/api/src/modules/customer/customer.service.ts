import { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { MerchantContext } from "../merchant/merchant.types.js";
import { toPublicCustomer, type PublicCustomer } from "./customer.mappers.js";
import type {
  customerCreateSchema,
  customerListQuerySchema,
  customerUpdateSchema,
} from "./customer.schemas.js";
import type { CustomerRepository, PaginationMeta } from "./customer.types.js";

type CustomerCreate = z.infer<typeof customerCreateSchema>;
type CustomerUpdate = z.infer<typeof customerUpdateSchema>;
type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

export interface CustomerService {
  listCustomers(
    context: MerchantContext,
    query: CustomerListQuery,
  ): Promise<{ data: PublicCustomer[]; meta: PaginationMeta }>;
  getCustomer(context: MerchantContext, customerId: string): Promise<PublicCustomer>;
  createCustomer(context: MerchantContext, input: CustomerCreate): Promise<PublicCustomer>;
  updateCustomer(
    context: MerchantContext,
    customerId: string,
    input: CustomerUpdate,
  ): Promise<PublicCustomer>;
}

export function createCustomerService(repository: CustomerRepository): CustomerService {
  async function load(context: MerchantContext, customerId: string): Promise<PublicCustomer> {
    const customer = await repository.findCustomer(context.merchantId, customerId);

    if (!customer) {
      throw new AppError(404, "NOT_FOUND", "Cliente no encontrado");
    }

    return toPublicCustomer(customer);
  }

  return {
    async listCustomers(context, query) {
      const { data, total } = await repository.listCustomers(context.merchantId, {
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
      });

      return {
        data: data.map(toPublicCustomer),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
      };
    },

    getCustomer(context, customerId) {
      return load(context, customerId);
    },

    async createCustomer(context, input) {
      const customer = await repository.createCustomer(context.merchantId, {
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        taxId: input.taxId ?? null,
        notes: input.notes ?? null,
      });

      return toPublicCustomer(customer);
    },

    async updateCustomer(context, customerId, input) {
      const customer = await repository.updateCustomer(context.merchantId, customerId, input);

      if (!customer) {
        throw new AppError(404, "NOT_FOUND", "Cliente no encontrado");
      }

      return toPublicCustomer(customer);
    },
  };
}
