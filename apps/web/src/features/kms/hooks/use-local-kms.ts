import { useEffect, useState } from "react";
import { emptyLocalKms, readLocalKms, writeLocalKms } from "../lib/maps";
import type { LocalKms } from "../schemas/types";

export function useLocalKms(userId: string) {
  const [state, setState] = useState(emptyLocalKms);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setState(readLocalKms(window.localStorage, userId));
      setReady(true);
      setError(null);
    } catch {
      setReady(false);
      setError(
        "Could not read saved mileage maps. Check browser storage access and reload. Existing data has not been overwritten.",
      );
    }
  }, [userId]);

  function save(next: LocalKms): boolean {
    if (!ready) return false;
    try {
      writeLocalKms(window.localStorage, userId, next);
      setState(next);
      setError(null);
      return true;
    } catch {
      setError(
        "Could not save this change. Browser storage may be full or unavailable. Free up space or enable storage and try again.",
      );
      return false;
    }
  }

  return { state, ready, error, save };
}
