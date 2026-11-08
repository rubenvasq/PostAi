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
}

export const AuthContext = createContext<AuthContextValue | null>(null);
