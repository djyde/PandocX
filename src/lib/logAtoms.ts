import { atom } from 'jotai';
import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { listen } from "@tauri-apps/api/event";

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  details?: string;
}

// Base atoms
export const logsAtom = atom<LogEntry[]>([]);
export const isExpandedAtom = atom<boolean>(false);

// Derived atoms
export const addLogAtom = atom(
  null,
  (get, set, log: LogEntry) => {
    const currentLogs = get(logsAtom);
    set(logsAtom, [...currentLogs, log]);
  }
);

export const clearLogsAtom = atom(
  null,
  (_get, set) => {
    set(logsAtom, []);
  }
);

export const toggleExpandedAtom = atom(
  null,
  (get, set) => {
    const current = get(isExpandedAtom);
    set(isExpandedAtom, !current);
  }
);

export const setExpandedAtom = atom(
  null,
  (_get, set, expanded: boolean) => {
    set(isExpandedAtom, expanded);
  }
);

// Custom hook to setup event listeners with Jotai
export const useLogEventListener = () => {
  const addLog = useSetAtom(addLogAtom);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await listen<LogEntry>("conversion_log", (event) => {
          addLog(event.payload);
        });
      } catch (error) {
        console.error("Failed to setup log event listener:", error);
      }
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, [addLog]);
};
