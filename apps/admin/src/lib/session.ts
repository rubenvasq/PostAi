export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  merchantId: string | null;
}

const STORAGE_KEY = "postai.admin.session";
const listeners = new Set<(session: AdminSession | null) => void>();

function readStoredSession(): AdminSession | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AdminSession>;

    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      (parsed.merchantId !== undefined &&
        parsed.merchantId !== null &&
        typeof parsed.merchantId !== "string")
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      merchantId: parsed.merchantId ?? null,
    };
  } catch {
    return null;
  }
}

let currentSession = readStoredSession();

function notify(): void {
  for (const listener of listeners) {
    listener(currentSession);
  }
}

export function getSession(): AdminSession | null {
  return currentSession;
}

export function setSession(session: AdminSession): void {
  currentSession = session;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // La sesión sigue en memoria aunque el navegador bloquee el almacenamiento.
  }

  notify();
}

export function updateSession(patch: Partial<AdminSession>): AdminSession | null {
  if (!currentSession) {
    return null;
  }

  setSession({ ...currentSession, ...patch });
  return currentSession;
}

export function clearSession(): void {
  currentSession = null;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento que limpiar.
  }

  notify();
}

export function subscribeSession(listener: (session: AdminSession | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
