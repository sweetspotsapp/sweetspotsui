import { useState, useCallback } from "react";

const KEYS = {
  searches: "ss_anon_searches",
  saves: "ss_anon_saves",
  trips: "ss_anon_trips",
};

const LIMITS = {
  searches: 2,
  saves: 3,
  trips: 1,
};

function getCount(key: string): number {
  try {
    return parseInt(localStorage.getItem(key) || "0", 10);
  } catch {
    return 0;
  }
}

function increment(key: string) {
  try {
    localStorage.setItem(key, String(getCount(key) + 1));
  } catch {}
}

export type AnonGateType = "search" | "save" | "trip";

const GATE_MESSAGES: Record<AnonGateType, { title: string; description: string }> = {
  search: {
    title: "Sign in to keep discovering",
    description: "You've used your free searches. Create an account to unlock unlimited discovery.",
  },
  save: {
    title: "Sign in to save more spots",
    description: "You've saved 3 spots already! Sign in to keep building your collection.",
  },
  trip: {
    title: "Sign in to plan more trips",
    description: "You've tried a trip plan! Sign in to create unlimited trips.",
  },
};

export function useAnonLimits() {
  const [gateType, setGateType] = useState<AnonGateType | null>(null);

  /** Returns true if the action is allowed. If blocked, sets gateType to show auth dialog. */
  const checkLimit = useCallback((type: AnonGateType): boolean => {
    const keyMap: Record<AnonGateType, string> = {
      search: KEYS.searches,
      save: KEYS.saves,
      trip: KEYS.trips,
    };
    const count = getCount(keyMap[type]);
    if (count >= LIMITS[type === "search" ? "searches" : type === "save" ? "saves" : "trips"]) {
      setGateType(type);
      return false;
    }
    return true;
  }, []);

  /** Call after a successful action to increment the counter */
  const recordUsage = useCallback((type: AnonGateType) => {
    const keyMap: Record<AnonGateType, string> = {
      search: KEYS.searches,
      save: KEYS.saves,
      trip: KEYS.trips,
    };
    increment(keyMap[type]);
  }, []);

  const dismissGate = useCallback(() => setGateType(null), []);

  const gateMessage = gateType ? GATE_MESSAGES[gateType] : null;

  return { checkLimit, recordUsage, gateType, gateMessage, dismissGate };
}
