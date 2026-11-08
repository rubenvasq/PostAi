export interface RateLimitDecision {
  allowed: boolean;
  /** Segundos que faltan para que la ventana libere un intento. */
  retryAfterSeconds: number;
}

export interface RateLimiterOptions {
  /** Intentos permitidos dentro de la ventana. */
  maxAttempts: number;
  /** Duración de la ventana en milisegundos. */
  windowMs: number;
  /** Máximo de claves en memoria para acotar el consumo. */
  maxKeys?: number;
  /** Reloj inyectable para pruebas. */
  now?: () => number;
}

export interface AttemptRateLimiter {
  check(key: string): RateLimitDecision;
  recordFailure(key: string): RateLimitDecision;
  reset(key: string): void;
}

const DEFAULT_MAX_KEYS = 10_000;

/**
 * Limitador de intentos fallidos con ventana deslizante en memoria.
 *
 * Solo se registran fallos explícitos para no penalizar inicios de sesión
 * correctos ni tráfico legítimo detrás de una misma IP. Las claves las construye
 * el llamador y no se registran en logs.
 */
export function createAttemptRateLimiter(options: RateLimiterOptions): AttemptRateLimiter {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) {
    throw new Error("maxAttempts debe ser un entero mayor o igual a 1");
  }

  if (!Number.isFinite(options.windowMs) || options.windowMs < 1) {
    throw new Error("windowMs debe ser mayor o igual a 1");
  }

  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  const readNow = options.now ?? Date.now;
  const entries = new Map<string, number[]>();

  function recentFailures(key: string, nowMs: number): number[] {
    const stored = entries.get(key);

    if (!stored) {
      return [];
    }

    const cutoff = nowMs - options.windowMs;
    const fresh = stored.filter((timestamp) => timestamp > cutoff);

    if (fresh.length === 0) {
      entries.delete(key);
    } else if (fresh.length !== stored.length) {
      entries.set(key, fresh);
    }

    return fresh;
  }

  function toDecision(timestamps: number[], nowMs: number): RateLimitDecision {
    if (timestamps.length < options.maxAttempts) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const oldest = timestamps[0];

    if (oldest === undefined) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + options.windowMs - nowMs) / 1000));

    return { allowed: false, retryAfterSeconds };
  }

  function prune(nowMs: number): void {
    if (entries.size <= maxKeys) {
      return;
    }

    for (const key of [...entries.keys()]) {
      if (recentFailures(key, nowMs).length === 0) {
        entries.delete(key);
      }

      if (entries.size <= maxKeys) {
        return;
      }
    }

    while (entries.size > maxKeys) {
      const oldestKey = entries.keys().next().value;

      if (oldestKey === undefined) {
        return;
      }

      entries.delete(oldestKey);
    }
  }

  return {
    check(key) {
      const nowMs = readNow();

      return toDecision(recentFailures(key, nowMs), nowMs);
    },

    recordFailure(key) {
      const nowMs = readNow();
      const timestamps = recentFailures(key, nowMs);

      timestamps.push(nowMs);
      entries.set(key, timestamps);
      prune(nowMs);

      return toDecision(timestamps, nowMs);
    },

    reset(key) {
      entries.delete(key);
    },
  };
}
