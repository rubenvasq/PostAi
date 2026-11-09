import { useEffect, useState } from "react";

export type Route =
  | { name: "dashboard" }
  | { name: "sales" }
  | { name: "sale-detail"; saleId: string }
  | { name: "products" }
  | { name: "customers" }
  | { name: "inventory" }
  | { name: "cash" }
  | { name: "not-found"; path: string };

function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "").replace(/\/+$/, "");

  if (path === "" || path === "dashboard") {
    return { name: "dashboard" };
  }

  if (path === "sales") {
    return { name: "sales" };
  }

  const saleMatch = /^sales\/([^/]+)$/.exec(path);

  if (saleMatch?.[1]) {
    return { name: "sale-detail", saleId: saleMatch[1] };
  }

  if (path === "products") {
    return { name: "products" };
  }

  if (path === "customers") {
    return { name: "customers" };
  }

  if (path === "inventory") {
    return { name: "inventory" };
  }

  if (path === "cash") {
    return { name: "cash" };
  }

  return { name: "not-found", path };
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith("/") ? `#${path}` : `#/${path}`;
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return route;
}
