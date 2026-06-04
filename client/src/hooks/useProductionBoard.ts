import { useEffect, useState } from "react";
import type { QueueCard } from "@/types";
import { subscribeBoard } from "@/mock/socket";

/**
 * Live production board feed. Mirrors useProductionSocket from
 * DESIGN.md — subscribes to the (simulated) WS and re-renders on
 * every push. `connected` flips to show the live indicator.
 */
export function useProductionBoard() {
  const [cards, setCards] = useState<QueueCard[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsub = subscribeBoard((next) => {
      setCards(next);
      setConnected(true);
    });
    return () => {
      unsub();
      setConnected(false);
    };
  }, []);

  return { cards, connected };
}
