import type {
  MerchantRecord,
  MembershipRecord,
  PublicMembership,
  PublicMerchant,
  PublicSession,
  PublicUser,
  RefreshTokenRecord,
  UserRecord,
} from "./auth.types.js";

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toPublicMerchant(merchant: MerchantRecord): PublicMerchant {
  return {
    id: merchant.id,
    name: merchant.name,
    legalName: merchant.legalName,
    taxId: merchant.taxId,
    currency: merchant.currency,
    timezone: merchant.timezone,
    status: merchant.status,
    createdAt: merchant.createdAt.toISOString(),
  };
}

export function toPublicMembership(membership: MembershipRecord): PublicMembership {
  return {
    merchantId: membership.merchantId,
    merchantName: membership.merchant.name,
    status: membership.status,
  };
}

export function toPublicSession(session: RefreshTokenRecord): PublicSession {
  return {
    id: session.id,
    deviceName: session.deviceName,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}
