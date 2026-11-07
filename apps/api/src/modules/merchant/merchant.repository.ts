import type { PrismaClient } from "@prisma/client";
import type { MerchantRecord } from "../auth/auth.types.js";
import type {
  BranchRecord,
  MerchantContext,
  MerchantRepository,
  UpdateMerchantInput,
} from "./merchant.types.js";

export class PrismaMerchantRepository implements MerchantRepository {
  constructor(private readonly db: PrismaClient) {}

  async findMembership(userId: string, merchantId: string): Promise<MerchantContext | null> {
    const membership = await this.db.membership.findUnique({
      where: { userId_merchantId: { userId, merchantId } },
    });

    if (!membership) {
      return null;
    }

    return {
      merchantId: membership.merchantId,
      membershipStatus: membership.status,
    };
  }

  findMerchantById(merchantId: string): Promise<MerchantRecord | null> {
    return this.db.merchant.findUnique({ where: { id: merchantId } });
  }

  updateMerchant(merchantId: string, data: UpdateMerchantInput): Promise<MerchantRecord> {
    return this.db.merchant.update({ where: { id: merchantId }, data });
  }

  listBranches(merchantId: string): Promise<BranchRecord[]> {
    return this.db.branch.findMany({
      where: { merchantId },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        phone: true,
        isActive: true,
      },
    });
  }
}
