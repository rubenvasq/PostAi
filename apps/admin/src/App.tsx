import { Loader2, Store } from "lucide-react";
import { AuthProvider } from "@/auth/AuthProvider";
import { useAuth } from "@/auth/useAuth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useHashRoute, type Route } from "@/hooks/useHashRoute";
import { AuditPage } from "@/pages/AuditPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { CashPage } from "@/pages/CashPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { LoginPage } from "@/pages/LoginPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { SaleDetailPage } from "@/pages/SaleDetailPage";
import { SalesPage } from "@/pages/SalesPage";
import { SettingsPage } from "@/pages/SettingsPage";

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const auth = useAuth();
  const route = useHashRoute();

  if (auth.status === "loading") {
    return <FullScreenLoading />;
  }

  if (auth.status === "anonymous") {
    return <LoginPage />;
  }

  if (!auth.merchantId) {
    return <NoMerchant />;
  }

  return (
    <AppShell route={route}>
      <div key={auth.merchantId}>{renderRoute(route)}</div>
    </AppShell>
  );
}

function renderRoute(route: Route) {
  switch (route.name) {
    case "dashboard":
      return <DashboardPage />;
    case "sales":
      return <SalesPage />;
    case "sale-detail":
      return <SaleDetailPage saleId={route.saleId} />;
    case "products":
      return <ProductsPage />;
    case "customers":
      return <CustomersPage />;
    case "inventory":
      return <InventoryPage />;
    case "cash":
      return <CashPage />;
    case "audit":
      return <AuditPage />;
    case "settings":
      return <SettingsPage />;
    case "not-found":
      return (
        <div className="flex flex-col gap-4">
          <PageHeader
            title="Página no encontrada"
            description={`No existe la ruta "${route.path}".`}
          />
          <a href="#/dashboard" className="text-sm text-emerald-400 hover:underline">
            Volver al dashboard
          </a>
        </div>
      );
  }
}

function FullScreenLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
      <div className="flex items-center gap-2 text-emerald-400">
        <Store className="size-5" />
        <span className="text-sm font-semibold">PostAi</span>
      </div>
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="size-4 animate-spin" />
        Restaurando sesión…
      </p>
    </div>
  );
}

function NoMerchant() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
        <div className="mx-auto w-fit rounded-full bg-amber-500/10 p-3 text-amber-400">
          <Store className="size-5" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-50">Sin comercio activo</h1>
        <p className="mt-2 text-sm text-slate-400">
          Tu usuario no tiene una membresía activa en ningún comercio. Contacta al administrador de
          la cuenta.
        </p>
        <Button className="mt-5" variant="outline" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
