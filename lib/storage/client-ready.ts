"use client";

import { useSyncExternalStore } from "react";
import { PERSISTENCE_CHANGE_EVENT } from "./sync-events.ts";

let revision = 0;

const subscribe = (onStoreChange: () => void) => {
  const handleRemoteChange = (event: Event) => {
    const source = (event as CustomEvent<{ source?: string }>).detail?.source;
    if (source === "remote") {
      revision += 1;
      onStoreChange();
    }
  };
  const handleStorage = () => {
    revision += 1;
    onStoreChange();
  };
  window.addEventListener(PERSISTENCE_CHANGE_EVENT, handleRemoteChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PERSISTENCE_CHANGE_EVENT, handleRemoteChange);
    window.removeEventListener("storage", handleStorage);
  };
};
const getClientSnapshot = () => revision;
const getServerSnapshot = () => -1;

export function useClientReady() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot) >= 0;
}
