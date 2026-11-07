import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAuthService } from "../src/modules/auth/auth.service.js";
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
} from "../src/modules/auth/auth.types.js";

type StoredMembership = MembershipRecord & { userId: string };

class InMemoryAuthRepository implements AuthRepository {
  readonly users = new Map<string, UserRecord>();
  readonly refreshTokens = new Map<string, RefreshTokenRecord>();
  readonly memberships: StoredMembership[] = [];

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async createAccount(
    input: CreateAccountInput,
  ): Promise<{ user: UserRecord; merchant: MerchantRecord; membership: MembershipRecord }> {
    const now = new Date();
    const user: UserRecord = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      phone: null,
      status: "ACTIVE",
      createdAt: now,
    };
    const merchant: MerchantRecord = {
      id: randomUUID(),
      name: input.merchantName,
      legalName: input.merchantLegalName,
      taxId: input.merchantTaxId,
      currency: "COP",
      timezone: "America/Bogota",
      status: "ACTIVE",
      createdAt: now,
    };
    const membership: MembershipRecord = {
      merchantId: merchant.id,
      status: "ACTIVE",
      merchant,
    };

    this.users.set(user.id, user);
    this.memberships.push({ ...membership, userId: user.id });

    return { user, merchant, membership };
  }

  async listMemberships(userId: string): Promise<MembershipRecord[]> {
    return this.memberships
      .filter((membership) => membership.userId === userId)
      .map(({ userId: _userId, ...membership }) => membership);
  }

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<void> {
    const now = new Date();
    const record: RefreshTokenRecord = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      deviceName: input.deviceName,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt: input.expiresAt,
      revokedAt: null,
      lastUsedAt: now,
      createdAt: now,
    };

    this.refreshTokens.set(record.id, record);
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return [...this.refreshTokens.values()].find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean> {
    const current = this.refreshTokens.get(input.currentId);

    if (
      !current ||
      current.userId !== input.userId ||
      current.revokedAt ||
      current.expiresAt.getTime() <= Date.now()
    ) {
      return false;
    }

    current.revokedAt = new Date();
    await this.createRefreshToken({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      deviceName: input.deviceName,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    return true;
  }

  async revokeRefreshToken(input: RevokeRefreshTokenInput): Promise<void> {
    for (const token of this.refreshTokens.values()) {
      if (
        token.userId === input.userId &&
        token.tokenHash === input.tokenHash &&
        !token.revokedAt
      ) {
        token.revokedAt = new Date();
      }
    }
  }

  async listActiveSessions(userId: string): Promise<RefreshTokenRecord[]> {
    const now = Date.now();

    return [...this.refreshTokens.values()]
      .filter(
        (token) => token.userId === userId && !token.revokedAt && token.expiresAt.getTime() > now,
      )
      .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime());
  }

  async revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
    const token = this.refreshTokens.get(sessionId);

    if (!token || token.userId !== userId || token.revokedAt) {
      return false;
    }

    token.revokedAt = new Date();
    return true;
  }
}

const registerBody = {
  email: "Owner@Example.com",
  password: "secreto123",
  fullName: "Ana Pérez",
  merchantName: "Tienda PostAi",
};

function setup() {
  const repository = new InMemoryAuthRepository();
  const app = createApp({ authService: createAuthService(repository) });

  return { app, repository };
}

describe("POST /v1/auth/register", () => {
  let app: ReturnType<typeof setup>["app"];
  let repository: InMemoryAuthRepository;

  beforeEach(() => {
    ({ app, repository } = setup());
  });

  it("crea usuario, comercio, membresía y tokens", async () => {
    const response = await request(app).post("/v1/auth/register").send(registerBody);

    expect(response.status).toBe(201);
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.body.user).toMatchObject({
      email: "owner@example.com",
      fullName: "Ana Pérez",
      status: "ACTIVE",
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.body.merchant).toMatchObject({
      name: "Tienda PostAi",
      currency: "COP",
      timezone: "America/Bogota",
    });
    expect(response.body.membership).toMatchObject({
      merchantId: response.body.merchant.id,
      merchantName: "Tienda PostAi",
      status: "ACTIVE",
    });
    expect(response.body.membership).not.toHaveProperty("role");
    expect(response.body.tokens).toMatchObject({ tokenType: "Bearer", expiresIn: 900 });

    const refreshTokens = [...repository.refreshTokens.values()];
    expect(refreshTokens).toHaveLength(1);
    expect(refreshTokens[0]?.tokenHash).not.toBe(response.body.tokens.refreshToken);
  });

  it("rechaza un correo ya registrado sin distinguir mayúsculas", async () => {
    await request(app).post("/v1/auth/register").send(registerBody);
    const response = await request(app)
      .post("/v1/auth/register")
      .send({ ...registerBody, email: "OWNER@example.com" });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({ code: "CONFLICT" });
  });

  it("valida la contraseña mínima", async () => {
    const response = await request(app)
      .post("/v1/auth/register")
      .send({ ...registerBody, password: "corta" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("POST /v1/auth/login", () => {
  it("devuelve tokens y membresías con credenciales válidas", async () => {
    const { app } = setup();
    await request(app).post("/v1/auth/register").send(registerBody);

    const response = await request(app)
      .post("/v1/auth/login")
      .send({ email: "owner@example.com", password: "secreto123" });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("owner@example.com");
    expect(response.body.memberships).toHaveLength(1);
    expect(response.body.memberships[0]).toMatchObject({ status: "ACTIVE" });
    expect(response.body.memberships[0]).not.toHaveProperty("role");
    expect(response.body.tokens.accessToken).toBeTruthy();
  });

  it("rechaza credenciales inválidas", async () => {
    const { app } = setup();
    await request(app).post("/v1/auth/register").send(registerBody);

    const response = await request(app)
      .post("/v1/auth/login")
      .send({ email: "owner@example.com", password: "incorrecta" });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("POST /v1/auth/refresh", () => {
  it("rota el refresh token y rechaza el anterior", async () => {
    const { app } = setup();
    const register = await request(app).post("/v1/auth/register").send(registerBody);
    const firstRefreshToken = register.body.tokens.refreshToken as string;

    const refresh = await request(app)
      .post("/v1/auth/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(refresh.status).toBe(200);
    expect(refresh.body.refreshToken).not.toBe(firstRefreshToken);

    const replay = await request(app)
      .post("/v1/auth/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(replay.status).toBe(401);
    expect(replay.body.error).toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("POST /v1/auth/logout", () => {
  it("revoca el refresh token", async () => {
    const { app } = setup();
    const register = await request(app).post("/v1/auth/register").send(registerBody);
    const { accessToken, refreshToken } = register.body.tokens;

    const logout = await request(app)
      .post("/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ refreshToken });

    expect(logout.status).toBe(204);

    const refresh = await request(app).post("/v1/auth/refresh").send({ refreshToken });
    expect(refresh.status).toBe(401);
  });
});

describe("GET /v1/auth/me", () => {
  it("devuelve el usuario y sus membresías", async () => {
    const { app } = setup();
    const register = await request(app).post("/v1/auth/register").send(registerBody);

    const response = await request(app)
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${register.body.tokens.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("owner@example.com");
    expect(response.body.memberships).toHaveLength(1);
  });

  it("rechaza peticiones sin bearer token", async () => {
    const { app } = setup();
    const response = await request(app).get("/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("GET /v1/auth/sessions", () => {
  it("lista las sesiones activas del usuario con metadatos del dispositivo", async () => {
    const { app } = setup();
    const register = await request(app)
      .post("/v1/auth/register")
      .set("X-Device-Name", "Pixel 8 de Ana")
      .set("User-Agent", "PostAiApp/1.0")
      .send(registerBody);
    const accessToken = register.body.tokens.accessToken as string;

    await request(app)
      .post("/v1/auth/login")
      .set("X-Device-Name", "iPhone de Ana")
      .send({ email: "owner@example.com", password: "secreto123" });

    const response = await request(app)
      .get("/v1/auth/sessions")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data).not.toHaveProperty("tokenHash");
    const deviceNames = response.body.data.map(
      (session: { deviceName: string }) => session.deviceName,
    );
    expect(deviceNames).toContain("Pixel 8 de Ana");
    expect(deviceNames).toContain("iPhone de Ana");
  });

  it("rechaza peticiones sin bearer token", async () => {
    const { app } = setup();
    const response = await request(app).get("/v1/auth/sessions");

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("DELETE /v1/auth/sessions/{sessionId}", () => {
  it("revoca la sesión indicada e invalida su refresh token", async () => {
    const { app, repository } = setup();
    const register = await request(app).post("/v1/auth/register").send(registerBody);
    const accessToken = register.body.tokens.accessToken as string;

    await request(app)
      .post("/v1/auth/login")
      .send({ email: "owner@example.com", password: "secreto123" });

    const sessions = await request(app)
      .get("/v1/auth/sessions")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(sessions.body.data).toHaveLength(2);

    const sessionToRevoke = [...repository.refreshTokens.values()].find(
      (token) => !token.revokedAt,
    );
    const revoke = await request(app)
      .delete(`/v1/auth/sessions/${sessionToRevoke?.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(revoke.status).toBe(204);

    const remaining = await request(app)
      .get("/v1/auth/sessions")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(remaining.body.data).toHaveLength(1);
  });

  it("devuelve 404 cuando la sesión no existe o no es del usuario", async () => {
    const { app } = setup();
    const register = await request(app).post("/v1/auth/register").send(registerBody);
    const accessToken = register.body.tokens.accessToken as string;

    const response = await request(app)
      .delete(`/v1/auth/sessions/${randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: "NOT_FOUND" });
  });

  it("rechaza un identificador de sesión inválido", async () => {
    const { app } = setup();
    const register = await request(app).post("/v1/auth/register").send(registerBody);
    const accessToken = register.body.tokens.accessToken as string;

    const response = await request(app)
      .delete("/v1/auth/sessions/no-es-uuid")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
