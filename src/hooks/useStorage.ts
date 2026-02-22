import { useState, useCallback } from "react";

export function usePersistentState<T>(
  key: string,
  initialValue: T,
) {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        const sameType =
          typeof parsed === typeof initialValue &&
          Array.isArray(parsed) === Array.isArray(initialValue);
        if (sameType) return parsed;
        console.warn(`Corrupt localStorage for key "${key}", resetting`);
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn("Failed to load state", error);
      localStorage.removeItem(key);
    }
    return initialValue;
  });

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

  return [state, setValue, false] as const;
}
