export type UserStatusValue = "ACTIVE" | "DISABLED";
export type MerchantStatusValue = "ACTIVE" | "SUSPENDED" | "CLOSED";
export type MembershipStatusValue = "ACTIVE" | "INVITED" | "SUSPENDED";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  status: UserStatusValue;
  createdAt: Date;
}

export interface MerchantRecord {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  currency: string;
  timezone: string;
  status: MerchantStatusValue;
  createdAt: Date;
}

export interface MembershipRecord {
  merchantId: string;
  status: MembershipStatusValue;
  merchant: MerchantRecord;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date;
  createdAt: Date;
}

export interface DeviceContext {
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface CreateAccountInput {
  email: string;
  passwordHash: string;
  fullName: string;
  merchantName: string;
  merchantLegalName: string | null;
  merchantTaxId: string | null;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface RotateRefreshTokenInput {
  currentId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface RevokeRefreshTokenInput {
  userId: string;
  tokenHash: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createAccount(
    input: CreateAccountInput,
  ): Promise<{ user: UserRecord; merchant: MerchantRecord; membership: MembershipRecord }>;
  listMemberships(userId: string): Promise<MembershipRecord[]>;
  createRefreshToken(input: CreateRefreshTokenInput): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean>;
  revokeRefreshToken(input: RevokeRefreshTokenInput): Promise<void>;
  listActiveSessions(userId: string): Promise<RefreshTokenRecord[]>;
  revokeSessionById(userId: string, sessionId: string): Promise<boolean>;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  merchantName: string;
  merchantLegalName?: string;
  merchantTaxId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface LogoutInput {
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: UserStatusValue;
  createdAt: string;
}

export interface PublicMerchant {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  currency: string;
  timezone: string;
  status: MerchantStatusValue;
  createdAt: string;
}

export interface PublicMembership {
  merchantId: string;
  merchantName: string;
  status: MembershipStatusValue;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface AuthResponse {
  user: PublicUser;
  merchant: PublicMerchant;
  membership: PublicMembership;
  tokens: AuthTokens;
}

export interface LoginResponse {
  user: PublicUser;
  memberships: PublicMembership[];
  tokens: AuthTokens;
}

export interface MeResponse {
  user: PublicUser;
  memberships: PublicMembership[];
}

export interface PublicSession {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export interface SessionsResponse {
  data: PublicSession[];
}
