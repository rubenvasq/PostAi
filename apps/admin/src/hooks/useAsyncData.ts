import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";

interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
): AsyncDataState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncDataState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({ data: current.data, loading: true, error: null }));

    loader()
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: errorMessage(error) });
        }
      });

    return () => {
      cancelled = true;
    };
    // El arreglo de dependencias lo controla cada página.
  }, [reloadToken, ...deps]);

  return { ...state, reload };
}
