import type { MembershipStatusValue, MerchantRecord } from "../auth/auth.types.js";

export interface MerchantContext {
  merchantId: string;
  membershipStatus: MembershipStatusValue;
}

export interface BranchRecord {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface PublicBranch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface UpdateMerchantInput {
  name?: string;
  legalName?: string;
  taxId?: string;
  timezone?: string;
}

export interface MerchantRepository {
  findMembership(userId: string, merchantId: string): Promise<MerchantContext | null>;
  findMerchantById(merchantId: string): Promise<MerchantRecord | null>;
  updateMerchant(merchantId: string, data: UpdateMerchantInput): Promise<MerchantRecord>;
  listBranches(merchantId: string): Promise<BranchRecord[]>;
}
