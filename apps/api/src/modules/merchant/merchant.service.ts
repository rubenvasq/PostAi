import { AppError } from "../../middleware/error-handler.js";
import { toPublicMerchant } from "../auth/auth.mappers.js";
import type { PublicMerchant } from "../auth/auth.types.js";
import { toPublicBranch } from "./merchant.mappers.js";
import type {
  MerchantContext,
  MerchantRepository,
  PublicBranch,
  UpdateMerchantInput,
} from "./merchant.types.js";

export interface MerchantService {
  resolveContext(userId: string, merchantId: string): Promise<MerchantContext>;
  getMerchant(context: MerchantContext): Promise<PublicMerchant>;
  updateMerchant(context: MerchantContext, input: UpdateMerchantInput): Promise<PublicMerchant>;
  listBranches(context: MerchantContext): Promise<PublicBranch[]>;
}

export function createMerchantService(repository: MerchantRepository): MerchantService {
  async function loadMerchant(merchantId: string): Promise<PublicMerchant> {
    const merchant = await repository.findMerchantById(merchantId);

    if (!merchant) {
      throw new AppError(404, "NOT_FOUND", "Comercio no encontrado");
    }

    return toPublicMerchant(merchant);
  }

  return {
    async resolveContext(userId, merchantId) {
      const context = await repository.findMembership(userId, merchantId);

      if (!context || context.membershipStatus !== "ACTIVE") {
        throw new AppError(403, "FORBIDDEN", "Sin acceso al comercio indicado");
      }

      return context;
    },

    getMerchant(context) {
      return loadMerchant(context.merchantId);
    },

    async updateMerchant(context, input) {
      await repository.updateMerchant(context.merchantId, input);
      return loadMerchant(context.merchantId);
    },

    async listBranches(context) {
      const branches = await repository.listBranches(context.merchantId);
      return branches.map(toPublicBranch);
    },
  };
}
