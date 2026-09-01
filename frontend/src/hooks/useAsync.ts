import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@/lib/apiClient";

interface UseAsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

// Runs `fn` on mount (and whenever `deps` change), tracking loading/error/data
// state so pages don't hand-roll the same three useState calls. `refetch` lets
// a page re-run the same request after a mutation (e.g. after an upload).
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    return fnRef
      .current()
      .then((data) => {
        setState({ data, error: null, isLoading: false });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof ApiRequestError ? error.message : "Something went wrong.";
        setState({ data: null, error: message, isLoading: false });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}
