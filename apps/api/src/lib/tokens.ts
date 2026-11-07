import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { env } from "../config/env.js";

const signingKey = new TextEncoder().encode(env.JWT_SECRET);

export async function signAccessToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ tokenType: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + env.ACCESS_TOKEN_TTL_SECONDS)
    .sign(signingKey);
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, signingKey, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: ["HS256"],
  });

  if (payload.tokenType !== "access" || typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Token de acceso inválido");
  }

  return payload.sub;
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}
