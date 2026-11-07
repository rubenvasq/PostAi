import { env } from "../../config/env.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "../../lib/tokens.js";
import { AppError } from "../../middleware/error-handler.js";
import { EmailAlreadyRegisteredError } from "./auth.errors.js";
import {
  toPublicMembership,
  toPublicMerchant,
  toPublicSession,
  toPublicUser,
} from "./auth.mappers.js";
import type {
  AuthRepository,
  AuthResponse,
  AuthTokens,
  DeviceContext,
  LoginInput,
  LoginResponse,
  LogoutInput,
  MeResponse,
  RefreshInput,
  RegisterInput,
  SessionsResponse,
  UserRecord,
} from "./auth.types.js";

const EMPTY_DEVICE_CONTEXT: DeviceContext = {
  deviceName: null,
  userAgent: null,
  ipAddress: null,
};

const DUMMY_PASSWORD_HASH = "$2b$12$Id2ABbJ/C8aU1x7FA1phK.bT6VeZnmgb0MSsFigzev.PHRol.pMPW";
const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface AuthService {
  register(input: RegisterInput, device?: DeviceContext): Promise<AuthResponse>;
  login(input: LoginInput, device?: DeviceContext): Promise<LoginResponse>;
  refresh(input: RefreshInput, device?: DeviceContext): Promise<AuthTokens>;
  logout(userId: string, input: LogoutInput): Promise<void>;
  authenticate(accessToken: string): Promise<UserRecord>;
  getMe(user: UserRecord): Promise<MeResponse>;
  listSessions(userId: string): Promise<SessionsResponse>;
  revokeSession(userId: string, sessionId: string): Promise<void>;
}

export function createAuthService(repository: AuthRepository): AuthService {
  async function issueTokens(userId: string, device: DeviceContext): Promise<AuthTokens> {
    const refreshToken = generateRefreshToken();

    await repository.createRefreshToken({
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      deviceName: device.deviceName,
      userAgent: device.userAgent,
      ipAddress: device.ipAddress,
    });

    const accessToken = await signAccessToken(userId);

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  return {
    async register(input, device = EMPTY_DEVICE_CONTEXT) {
      const email = input.email.toLowerCase();
      const existing = await repository.findUserByEmail(email);

      if (existing) {
        throw new AppError(409, "CONFLICT", "El correo ya está registrado");
      }

      const passwordHash = await hashPassword(input.password);

      try {
        const { user, merchant, membership } = await repository.createAccount({
          email,
          passwordHash,
          fullName: input.fullName,
          merchantName: input.merchantName,
          merchantLegalName: input.merchantLegalName ?? null,
          merchantTaxId: input.merchantTaxId ?? null,
        });

        return {
          user: toPublicUser(user),
          merchant: toPublicMerchant(merchant),
          membership: toPublicMembership(membership),
          tokens: await issueTokens(user.id, device),
        };
      } catch (error) {
        if (error instanceof EmailAlreadyRegisteredError) {
          throw new AppError(409, "CONFLICT", "El correo ya está registrado");
        }
        throw error;
      }
    },

    async login(input, device = EMPTY_DEVICE_CONTEXT) {
      const user = await repository.findUserByEmail(input.email.toLowerCase());
      const passwordMatches = await verifyPassword(
        input.password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      );

      if (!user || !passwordMatches || user.status !== "ACTIVE") {
        throw new AppError(401, "UNAUTHORIZED", "Credenciales inválidas");
      }

      const memberships = await repository.listMemberships(user.id);

      return {
        user: toPublicUser(user),
        memberships: memberships.map(toPublicMembership),
        tokens: await issueTokens(user.id, device),
      };
    },

    async refresh(input, device = EMPTY_DEVICE_CONTEXT) {
      const current = await repository.findRefreshToken(hashRefreshToken(input.refreshToken));

      if (!current || current.revokedAt || current.expiresAt.getTime() <= Date.now()) {
        throw new AppError(401, "UNAUTHORIZED", "Refresh token inválido o expirado");
      }

      const refreshToken = generateRefreshToken();
      const rotated = await repository.rotateRefreshToken({
        currentId: current.id,
        userId: current.userId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        deviceName: device.deviceName ?? current.deviceName,
        userAgent: device.userAgent ?? current.userAgent,
        ipAddress: device.ipAddress ?? current.ipAddress,
      });

      if (!rotated) {
        throw new AppError(401, "UNAUTHORIZED", "Refresh token inválido o expirado");
      }

      return {
        accessToken: await signAccessToken(current.userId),
        refreshToken,
        tokenType: "Bearer",
        expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
      };
    },

    async logout(userId, input) {
      await repository.revokeRefreshToken({
        userId,
        tokenHash: hashRefreshToken(input.refreshToken),
      });
    },

    async authenticate(accessToken) {
      let userId: string;

      try {
        userId = await verifyAccessToken(accessToken);
      } catch {
        throw new AppError(401, "UNAUTHORIZED", "Token de acceso inválido o expirado");
      }

      const user = await repository.findUserById(userId);

      if (!user || user.status !== "ACTIVE") {
        throw new AppError(401, "UNAUTHORIZED", "Usuario no válido");
      }

      return user;
    },

    async getMe(user) {
      const memberships = await repository.listMemberships(user.id);

      return {
        user: toPublicUser(user),
        memberships: memberships.map(toPublicMembership),
      };
    },

    async listSessions(userId) {
      const sessions = await repository.listActiveSessions(userId);

      return { data: sessions.map(toPublicSession) };
    },

    async revokeSession(userId, sessionId) {
      const revoked = await repository.revokeSessionById(userId, sessionId);

      if (!revoked) {
        throw new AppError(404, "NOT_FOUND", "Sesión no encontrada");
      }
    },
  };
}
