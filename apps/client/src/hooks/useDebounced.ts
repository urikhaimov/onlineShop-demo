// src/hooks/useDebounced.ts
import * as React from 'react';
export function useDebounced<T>(value: T, delay = 250) {
  const [d, setD] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}
