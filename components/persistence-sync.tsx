"use client";

import { useEffect } from "react";
import { PERSISTENCE_CHANGE_EVENT } from "../lib/storage/sync-events.ts";

async function sync() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) return;
  const { requestPersistenceSync } = await import("../lib/supabase/sync.ts");
  await requestPersistenceSync();
}

export function PersistenceSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void sync(), 400);
    };
    const handleChange = (event: Event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail?.source;
      if (source === "local") schedule();
    };

    void sync();
    window.addEventListener(PERSISTENCE_CHANGE_EVENT, handleChange);
    window.addEventListener("online", schedule);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(PERSISTENCE_CHANGE_EVENT, handleChange);
      window.removeEventListener("online", schedule);
    };
  }, []);

  return null;
}
