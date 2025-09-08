// Simple registry to collect Zustand "reset" functions in one place.
// Call `registerStoreReset(() => store.getState().reset?.())` in each store file.

export type ResetFn = () => void;

const resets = new Set<ResetFn>();

export function registerStoreReset(fn: ResetFn) {
  resets.add(fn);
  return () => resets.delete(fn);
}

export function runAllStoreResets() {
  for (const fn of resets) {
    try {
      fn();
    } catch {
      // ignore individual store reset errors
    }
  }
}
