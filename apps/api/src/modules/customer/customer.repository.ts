import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  CreateCustomerInput,
  CustomerRecord,
  CustomerRepository,
  ListCustomersParams,
  Paginated,
  UpdateCustomerInput,
} from "./customer.types.js";

const CUSTOMER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  taxId: true,
  notes: true,
  createdAt: true,
} as const;

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly db: PrismaClient) {}

  async listCustomers(
    merchantId: string,
    params: ListCustomersParams,
  ): Promise<Paginated<CustomerRecord>> {
    const where: Prisma.CustomerWhereInput = {
      merchantId,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { email: { contains: params.search, mode: "insensitive" } },
              { phone: { contains: params.search, mode: "insensitive" } },
              { taxId: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.db.$transaction([
      this.db.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: CUSTOMER_SELECT,
      }),
      this.db.customer.count({ where }),
    ]);

    return { data, total };
  }

  findCustomer(merchantId: string, customerId: string): Promise<CustomerRecord | null> {
    return this.db.customer.findFirst({
      where: { id: customerId, merchantId },
      select: CUSTOMER_SELECT,
    });
  }

  createCustomer(merchantId: string, data: CreateCustomerInput): Promise<CustomerRecord> {
    return this.db.customer.create({
      data: { merchantId, ...data },
      select: CUSTOMER_SELECT,
    });
  }

  async updateCustomer(
    merchantId: string,
    customerId: string,
    data: UpdateCustomerInput,
  ): Promise<CustomerRecord | null> {
    const existing = await this.db.customer.findFirst({
      where: { id: customerId, merchantId },
      select: { id: true },
    });

    if (!existing) return null;

    return this.db.customer.update({
      where: { id: customerId },
      data,
      select: CUSTOMER_SELECT,
    });
  }
}
