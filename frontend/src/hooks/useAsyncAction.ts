import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@/lib/apiClient";

// The mutation counterpart to useAsync: wraps a service call (submit,
// upload, delete, ...) with the same isSubmitting/error bookkeeping every
// form/action component used to hand-roll around its own service import.
// Components call the hooks in hooks/use*Actions.ts (built on top of this)
// instead of importing services/*.ts directly, so services stay an
// implementation detail of the hooks layer.
export function useAsyncAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const run = useCallback(async (...args: Args) => {
    setError(null);
    setIsSubmitting(true);
    try {
      return await actionRef.current(...args);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
  }, []);

  return { run, isSubmitting, error, reset };
}
