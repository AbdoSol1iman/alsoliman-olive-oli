"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const clientOnly = () => true;
const serverOnly = () => false;

/**
 * Hydration-safe replacement for the
 * `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`
 * pattern, which React's compiler rules reject (setState synchronously inside
 * an effect triggers a cascading render).
 *
 * Returns `false` during SSR and the first client render, then `true` — safe
 * for values that only exist in the browser (localStorage-backed cart, etc.).
 */
export function useHydrated() {
  return useSyncExternalStore(emptySubscribe, clientOnly, serverOnly);
}
