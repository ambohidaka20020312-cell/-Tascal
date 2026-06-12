import api from "./api";

interface QueuedOperation {
  id: string;
  method: "POST" | "PATCH" | "DELETE";
  url: string;
  data?: object;
  timestamp: number;
}

const STORAGE_KEY = "tascal_offline_queue";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function load(): QueuedOperation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(ops: QueuedOperation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

export const offlineQueue = {
  add(op: Omit<QueuedOperation, "id" | "timestamp">): void {
    const ops = load();
    ops.push({ ...op, id: generateId(), timestamp: Date.now() });
    save(ops);
  },

  getAll(): QueuedOperation[] {
    return load();
  },

  async flush(): Promise<void> {
    const ops = load();
    if (ops.length === 0) return;

    const remaining: QueuedOperation[] = [];

    for (const op of ops) {
      try {
        await api.request({ method: op.method, url: op.url, data: op.data });
      } catch {
        remaining.push(op);
      }
    }

    save(remaining);
  },
};
