import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  ScrollText,
  Settings,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import type { Route } from "@/hooks/useHashRoute";
import { cn } from "@/lib/utils";

interface NavItem {
  route: string;
  label: string;
  icon: LucideIcon;
  matches: (route: Route) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    route: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    matches: (route) => route.name === "dashboard",
  },
  {
    route: "sales",
    label: "Ventas",
    icon: ReceiptText,
    matches: (route) => route.name === "sales" || route.name === "sale-detail",
  },
  {
    route: "products",
    label: "Catálogo",
    icon: Package,
    matches: (route) => route.name === "products",
  },
  {
    route: "customers",
    label: "Clientes",
    icon: Users,
    matches: (route) => route.name === "customers",
  },
  {
    route: "inventory",
    label: "Inventario",
    icon: Boxes,
    matches: (route) => route.name === "inventory",
  },
  {
    route: "cash",
    label: "Caja y gastos",
    icon: Wallet,
    matches: (route) => route.name === "cash",
  },
  {
    route: "audit",
    label: "Auditoría",
    icon: ScrollText,
    matches: (route) => route.name === "audit",
  },
  {
    route: "settings",
    label: "Configuración",
    icon: Settings,
    matches: (route) => route.name === "settings",
  },
];

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const { user, memberships, merchantId, selectMerchant, logout } = useAuth();
  const activeMemberships = memberships.filter((membership) => membership.status === "ACTIVE");
  const activeMerchant = activeMemberships.find(
    (membership) => membership.merchantId === merchantId,
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 lg:flex-row">
      <aside className="border-b border-slate-800 bg-slate-900/50 print:hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400">
            <Store className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-50">PostAi</p>
            <p className="text-[11px] text-slate-500">Panel administrativo</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.matches(route);

            return (
              <a
                key={item.route}
                href={`#/${item.route}`}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4" />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto hidden border-t border-slate-800 px-5 py-3 text-[11px] text-slate-500 lg:block">
          Panel de gestión. No procesa pagos reales.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3 print:hidden lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">Comercio activo</p>
              {activeMemberships.length > 1 ? (
                <select
                  value={merchantId ?? ""}
                  onChange={(event) => selectMerchant(event.target.value)}
                  className="max-w-64 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  aria-label="Seleccionar comercio"
                >
                  {activeMemberships.map((membership) => (
                    <option key={membership.merchantId} value={membership.merchantId}>
                      {membership.merchantName}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="truncate text-sm font-medium text-slate-200">
                  {activeMerchant?.merchantName ?? "Sin comercio"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-200">{user?.fullName}</p>
              <p className="text-[11px] text-slate-500">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="mr-1 size-3.5" />
              Salir
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 print:p-0 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
