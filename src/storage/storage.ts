/**
 * Storage interface. The app only talks to `KeyValueStore`, so swapping
 * localStorage for IndexedDB (or a sync backend later) is a one-file change.
 */
export interface KeyValueStore {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export class LocalStorageStore implements KeyValueStore {
  constructor(private prefix = 'zdravei:') {}
  getItem(key: string) {
    try {
      return localStorage.getItem(this.prefix + key);
    } catch {
      return null;
    }
  }
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(this.prefix + key, value);
    } catch {
      /* storage full or blocked: keep running in memory */
    }
  }
  removeItem(key: string) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      /* ignore */
    }
  }
}

/** In-memory store for tests and private-mode fallbacks. */
export class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

export const appStore: KeyValueStore = typeof localStorage !== 'undefined' ? new LocalStorageStore() : new MemoryStore();
