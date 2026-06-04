import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  refetch: () => void;
}

/**
 * Run an async function and track loading/error, re-running when
 * `deps` change. `refetch` re-runs without changing deps.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    fn()
      .then((res) => {
        if (active && mounted.current) setData(res);
      })
      .catch((err) => {
        if (active && mounted.current) setError(err as Error);
      })
      .finally(() => {
        if (active && mounted.current) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, refetch };
}
