import type { BranchRecord, PublicBranch } from "./merchant.types.js";

export function toPublicBranch(branch: BranchRecord): PublicBranch {
  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    isActive: branch.isActive,
  };
}
