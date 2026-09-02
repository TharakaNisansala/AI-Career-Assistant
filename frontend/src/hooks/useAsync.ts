import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@/lib/apiClient";

interface UseAsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

// Shared across every useAsync call in the app: without it, navigating from
// e.g. Resumes to Job Matching and back re-fetched the same resume list from
// scratch (full spinner included) even though nothing had changed. Keyed by
// the caller-supplied cacheKey, not by `fn` identity, since `fn` is a new
// closure on every render.
const cache = new Map<string, unknown>();

// Runs `fn` on mount (and whenever `deps` change), tracking loading/error/data
// state so pages don't hand-roll the same three useState calls. `refetch` lets
// a page re-run the same request after a mutation (e.g. after an upload).
//
// When `cacheKey` is given, a cached value is shown immediately (no loading
// spinner) while `fn` re-runs in the background to revalidate it -- the same
// stale-while-revalidate trade-off SWR/React Query make, without pulling in
// a dependency for it. Give the same key to every call site that fetches the
// same resource (e.g. "resumes-list") so they share one cache entry.
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], cacheKey?: string) {
  const [state, setState] = useState<UseAsyncState<T>>(() => {
    const cached = cacheKey !== undefined ? (cache.get(cacheKey) as T | undefined) : undefined;
    return { data: cached ?? null, error: null, isLoading: cached === undefined };
  });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  // Tags each call so a slower, older request can't overwrite state with its
  // stale result after a newer call (triggered by a deps change or refetch)
  // has already resolved -- e.g. quickly switching between two resumes no
  // longer risks showing resume A's data under resume B's heading.
  const latestCallIdRef = useRef(0);

  const run = useCallback(() => {
    const callId = ++latestCallIdRef.current;
    setState((prev) => ({ ...prev, isLoading: prev.data === null, error: null }));
    return fnRef
      .current()
      .then((data) => {
        if (callId === latestCallIdRef.current) {
          if (cacheKey !== undefined) cache.set(cacheKey, data);
          setState({ data, error: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (callId === latestCallIdRef.current) {
          const message =
            error instanceof ApiRequestError ? error.message : "Something went wrong.";
          setState((prev) => ({ data: prev.data, error: message, isLoading: false }));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}
