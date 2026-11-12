import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthStatus } from "@/auth/AuthContext";
import { getMe, loginRequest, logoutRequest } from "@/lib/api";
import {
  clearSession,
  getSession,
  setSession,
  subscribeSession,
  updateSession,
} from "@/lib/session";
import type { PublicMembership, PublicUser } from "@/lib/types";

interface AuthState {
  status: AuthStatus;
  user: PublicUser | null;
  memberships: PublicMembership[];
  merchantId: string | null;
}

const INITIAL_STATE: AuthState = {
  status: "loading",
  user: null,
  memberships: [],
  merchantId: null,
};

function activeMemberships(memberships: PublicMembership[]): PublicMembership[] {
  return memberships.filter((membership) => membership.status === "ACTIVE");
}

function resolveMerchantId(
  memberships: PublicMembership[],
  preferredMerchantId: string | null,
): string | null {
  const active = activeMemberships(memberships);

  if (preferredMerchantId && active.some((item) => item.merchantId === preferredMerchantId)) {
    return preferredMerchantId;
  }

  return active[0]?.merchantId ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  useEffect(() => {
    const session = getSession();

    if (!session) {
      setState({ ...INITIAL_STATE, status: "anonymous" });
      return;
    }

    let cancelled = false;

    getMe()
      .then(({ user, memberships }) => {
        if (cancelled) {
          return;
        }

        const merchantId = resolveMerchantId(memberships, session.merchantId);

        if (merchantId !== session.merchantId) {
          updateSession({ merchantId });
        }

        setState({ status: "authenticated", user, memberships, merchantId });
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
          setState({ ...INITIAL_STATE, status: "anonymous" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeSession((session) => {
      if (!session) {
        setState((current) =>
          current.status === "anonymous" ? current : { ...INITIAL_STATE, status: "anonymous" },
        );
      }
    });
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const response = await loginRequest(email, password);
    const merchantId = resolveMerchantId(response.memberships, null);

    setSession({
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      merchantId,
    });
    setState({
      status: "authenticated",
      user: response.user,
      memberships: response.memberships,
      merchantId,
    });
  }

  async function logout(): Promise<void> {
    const session = getSession();

    try {
      if (session?.refreshToken) {
        await logoutRequest();
      }
    } catch {
      // El cierre de sesión local no debe depender de la API.
    } finally {
      clearSession();
      setState({ ...INITIAL_STATE, status: "anonymous" });
    }
  }

  function selectMerchant(merchantId: string): void {
    if (
      !state.memberships.some((item) => item.merchantId === merchantId && item.status === "ACTIVE")
    ) {
      return;
    }

    updateSession({ merchantId });
    setState((current) => ({ ...current, merchantId }));
  }

  async function reloadProfile(): Promise<void> {
    const { user, memberships } = await getMe();

    setState((current) =>
      current.status === "authenticated" ? { ...current, user, memberships } : current,
    );
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        selectMerchant,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
