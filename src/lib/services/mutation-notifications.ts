export interface MutationNotification {
  id: string;
  message: string;
  undo?: () => Promise<void>;
}

type Listener = (notification: MutationNotification) => void;
const listeners = new Set<Listener>();

export function subscribeToMutations(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyMutation(
  message: string,
  undo?: () => Promise<void>,
): void {
  const notification = {
    id: crypto.randomUUID(),
    message,
    undo,
  };
  for (const listener of listeners) listener(notification);
}
