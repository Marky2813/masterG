import type { MasterGEvents } from "./types";

type Handler<T> = (payload: T) => void;

export function createBus<E extends object>() {
  const handlers = new Map<keyof E, Set<Handler<never>>>();

  return {
    on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler as Handler<never>);
      return () => handlers.get(event)?.delete(handler as Handler<never>);
    },
    emit<K extends keyof E>(event: K, payload: E[K]): void {
      handlers.get(event)?.forEach((h) => (h as Handler<E[K]>)(payload));
    },
  };
}

// The one bus every part of the app talks through.
export const bus = createBus<MasterGEvents>();
