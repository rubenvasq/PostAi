import { describe, expect, it } from "vitest";
import { createAttemptRateLimiter } from "../src/lib/rate-limiter.js";

describe("createAttemptRateLimiter", () => {
  it("bloquea al alcanzar el máximo y calcula la espera restante", () => {
    let now = 1_000_000;
    const limiter = createAttemptRateLimiter({
      maxAttempts: 2,
      windowMs: 60_000,
      now: () => now,
    });

    expect(limiter.check("clave")).toEqual({ allowed: true, retryAfterSeconds: 0 });

    limiter.recordFailure("clave");
    expect(limiter.check("clave").allowed).toBe(true);

    limiter.recordFailure("clave");
    expect(limiter.check("clave")).toEqual({ allowed: false, retryAfterSeconds: 60 });

    now += 30_000;
    expect(limiter.check("clave")).toEqual({ allowed: false, retryAfterSeconds: 30 });

    now += 30_001;
    expect(limiter.check("clave")).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("separa las claves y permite reiniciar una clave", () => {
    const limiter = createAttemptRateLimiter({ maxAttempts: 1, windowMs: 60_000 });

    limiter.recordFailure("a");
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);

    limiter.reset("a");
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("rechaza opciones inválidas", () => {
    expect(() => createAttemptRateLimiter({ maxAttempts: 0, windowMs: 60_000 })).toThrow();
    expect(() => createAttemptRateLimiter({ maxAttempts: 1, windowMs: 0 })).toThrow();
  });
});
