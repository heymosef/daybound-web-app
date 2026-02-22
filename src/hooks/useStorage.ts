import { useState, useEffect, useCallback, useRef } from "react";

export function usePersistentState<T>(
  key: string,
  initialValue: T,
) {
  const [state, setState] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const isLoaded = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setState(JSON.parse(saved));
      }
    } catch (error) {
      console.warn("Failed to load state", error);
    } finally {
      setLoading(false);
      isLoaded.current = true;
    }
  }, [key]);

  const setValue = useCallback(
    (newValue: T) => {
      setState(newValue);
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.warn("Failed to save state", error);
      }
    },
    [key],
  );

  return [state, setValue, loading] as const;
}
