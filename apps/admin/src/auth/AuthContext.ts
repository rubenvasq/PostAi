import { createContext } from "react";
import type { PublicMembership, PublicUser } from "@/lib/types";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  memberships: PublicMembership[];
  merchantId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectMerchant: (merchantId: string) => void;
  /** Vuelve a leer `GET /v1/auth/me` (p. ej. tras renombrar el comercio). */
  reloadProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
