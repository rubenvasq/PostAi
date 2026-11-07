import { Prisma, type PrismaClient } from "@prisma/client";
import { DEFAULT_PAYMENT_METHODS } from "../../config/payment-methods.js";
import { MAIN_BRANCH } from "./auth.constants.js";
import { EmailAlreadyRegisteredError } from "./auth.errors.js";
import type {
  AuthRepository,
  CreateAccountInput,
  CreateRefreshTokenInput,
  MembershipRecord,
  MerchantRecord,
  RefreshTokenRecord,
  RevokeRefreshTokenInput,
  RotateRefreshTokenInput,
  UserRecord,
} from "./auth.types.js";

function isEmailUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  return JSON.stringify(error.meta?.target ?? "").includes("email");
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  findUserById(id: string): Promise<UserRecord | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async createAccount(
    input: CreateAccountInput,
  ): Promise<{ user: UserRecord; merchant: MerchantRecord; membership: MembershipRecord }> {
    try {
      return await this.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            passwordHash: input.passwordHash,
            fullName: input.fullName,
          },
        });

        const merchant = await tx.merchant.create({
          data: {
            name: input.merchantName,
            legalName: input.merchantLegalName,
            taxId: input.merchantTaxId,
          },
        });

        await tx.branch.create({
          data: {
            merchantId: merchant.id,
            code: MAIN_BRANCH.code,
            name: MAIN_BRANCH.name,
          },
        });

        await tx.paymentMethod.createMany({
          data: DEFAULT_PAYMENT_METHODS.map((method) => ({
            merchantId: merchant.id,
            code: method.code,
            name: method.name,
            type: method.type,
            isSimulated: method.isSimulated,
            requiresProvider: method.requiresProvider,
            isActive: method.isActive,
            sortOrder: method.sortOrder,
          })),
        });

        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            merchantId: merchant.id,
          },
          include: { merchant: true },
        });

        return { user, merchant, membership };
      });
    } catch (error) {
      if (isEmailUniqueViolation(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }

  listMemberships(userId: string): Promise<MembershipRecord[]> {
    return this.db.membership.findMany({
      where: { userId },
      include: { merchant: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<void> {
    await this.db.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        deviceName: input.deviceName,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      },
    });
  }

  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.db.refreshToken.findUnique({ where: { tokenHash } });
  }

  async rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const now = new Date();
      const revoked = await tx.refreshToken.updateMany({
        where: {
          id: input.currentId,
          userId: input.userId,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) {
        return false;
      }

      await tx.refreshToken.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          deviceName: input.deviceName,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
        },
      });

      return true;
    });
  }

  async revokeRefreshToken(input: RevokeRefreshTokenInput): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  listActiveSessions(userId: string): Promise<RefreshTokenRecord[]> {
    return this.db.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: "desc" },
    });
  }

  async revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
    const revoked = await this.db.refreshToken.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return revoked.count === 1;
  }
}
