import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileCacheStore, StorageCacheStore } from "../index";

class MemoryStorage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const createTempDir = () => mkdtempSync(join(tmpdir(), "task-storage-"));

describe("StorageCacheStore", () => {
  it("stores, retrieves, and lists entries with prefix", () => {
    const storage = new MemoryStorage();
    const store = new StorageCacheStore(storage, { prefix: "cache:" });

    store.set("a", { value: 1, createdAt: 1, updatedAt: 1 });
    store.set("b", { value: 2, createdAt: 1, updatedAt: 1 });
    storage.setItem("other:x", JSON.stringify({ value: 9 }));

    expect(store.get<number>("a")?.value).toBe(1);
    expect(store.has("b")).toBe(true);
    expect(Array.from(store.keys())).toEqual(["a", "b"]);
  });

  it("removes invalid entries on read", () => {
    const storage = new MemoryStorage();
    const store = new StorageCacheStore(storage, { prefix: "cache:" });

    storage.setItem("cache:bad", "not-json");

    expect(store.get("bad")).toBeUndefined();
    expect(storage.getItem("cache:bad")).toBeNull();
  });

  it("removes entries when deserialize throws", () => {
    const storage = new MemoryStorage();
    const store = new StorageCacheStore(storage, {
      deserialize: () => {
        throw new Error("bad deserialize");
      },
    });

    storage.setItem("task-cache:bad", "boom");

    expect(store.get("bad")).toBeUndefined();
    expect(storage.getItem("task-cache:bad")).toBeNull();
  });

  it("clears only prefixed entries", () => {
    const storage = new MemoryStorage();
    const store = new StorageCacheStore(storage, { prefix: "cache:" });

    store.set("a", { value: 1, createdAt: 1, updatedAt: 1 });
    storage.setItem("other:x", JSON.stringify({ value: 9 }));

    store.clear();

    expect(storage.getItem("cache:a")).toBeNull();
    expect(storage.getItem("other:x")).toBeTruthy();
  });

  it("emits events and isolates listener errors", () => {
    const storage = new MemoryStorage();
    const store = new StorageCacheStore(storage);
    const events: string[] = [];
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    store.subscribe((event) => {
      events.push(event.type);
      throw new Error("listener boom");
    });
    store.subscribe((event) => events.push(`ok:${event.type}`));

    store.set("a", { value: 1, createdAt: 1, updatedAt: 1 });
    store.delete("a");

    expect(events).toEqual(["set", "ok:set", "invalidate", "ok:invalidate"]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("stops emitting to unsubscribed listeners", () => {
    const storage = new MemoryStorage();
    const store = new StorageCacheStore(storage);
    const events: string[] = [];

    const unsubscribe = store.subscribe((event) => events.push(event.type));

    store.set("a", { value: 1, createdAt: 1, updatedAt: 1 });
    unsubscribe();
    store.delete("a");

    expect(events).toEqual(["set"]);
  });

  it("invalidates by tags", () => {
    const storage = new MemoryStorage();
    const store = new StorageCacheStore(storage);

    store.set("a", { value: 1, createdAt: 1, updatedAt: 1, tags: ["t1"] });
    store.set("b", { value: 2, createdAt: 1, updatedAt: 1, tags: ["t2"] });

    store.invalidateTags(["t1"]);

    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(true);
  });

  it("uses custom serialize and deserialize", () => {
    const storage = new MemoryStorage();
    const store = new StorageCacheStore(storage, {
      serialize: (entry) => `value:${(entry.value as number) ?? 0}`,
      deserialize: (raw) => ({ value: Number(raw.split(":")[1]), createdAt: 1, updatedAt: 1 }),
    });

    store.set("a", { value: 7, createdAt: 1, updatedAt: 1 });
    expect(storage.getItem("task-cache:a")).toBe("value:7");
    expect(store.get<number>("a")?.value).toBe(7);
  });
});

describe("FileCacheStore", () => {
  it("persists entries to disk", () => {
    const dir = createTempDir();
    const filePath = join(dir, "cache.json");
    const store = new FileCacheStore(filePath);

    store.set("a", { value: 1, createdAt: 1, updatedAt: 1 });

    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, { value: number }>;
    expect(parsed.a.value).toBe(1);

    rmSync(dir, { recursive: true, force: true });
  });

  it("loads entries from disk", () => {
    const dir = createTempDir();
    const filePath = join(dir, "cache.json");
    writeFileSync(
      filePath,
      JSON.stringify({ a: { value: 2, createdAt: 1, updatedAt: 1 } }),
      "utf8"
    );

    const store = new FileCacheStore(filePath);
    expect(store.get<number>("a")?.value).toBe(2);

    rmSync(dir, { recursive: true, force: true });
  });

  it("clears store when file is invalid", () => {
    const dir = createTempDir();
    const filePath = join(dir, "cache.json");
    writeFileSync(filePath, "{not-json", "utf8");

    const store = new FileCacheStore(filePath);
    expect(Array.from(store.keys())).toEqual([]);

    rmSync(dir, { recursive: true, force: true });
  });

  it("emits events and isolates listener errors", () => {
    const dir = createTempDir();
    const filePath = join(dir, "cache.json");
    const store = new FileCacheStore(filePath);
    const events: string[] = [];
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    store.subscribe((event) => {
      events.push(event.type);
      throw new Error("listener boom");
    });
    store.subscribe((event) => events.push(`ok:${event.type}`));

    store.set("a", { value: 1, createdAt: 1, updatedAt: 1 });
    store.delete("a");
    store.clear();

    expect(events).toEqual([
      "set",
      "ok:set",
      "invalidate",
      "ok:invalidate",
      "clear",
      "ok:clear",
    ]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();

    rmSync(dir, { recursive: true, force: true });
  });

  it("stops emitting to unsubscribed listeners", () => {
    const dir = createTempDir();
    const filePath = join(dir, "cache.json");
    const store = new FileCacheStore(filePath);
    const events: string[] = [];

    const unsubscribe = store.subscribe((event) => events.push(event.type));

    store.set("a", { value: 1, createdAt: 1, updatedAt: 1 });
    unsubscribe();
    store.delete("a");

    expect(events).toEqual(["set"]);

    rmSync(dir, { recursive: true, force: true });
  });

  it("invalidates by tags", () => {
    const dir = createTempDir();
    const filePath = join(dir, "cache.json");
    const store = new FileCacheStore(filePath);

    store.set("a", { value: 1, createdAt: 1, updatedAt: 1, tags: ["t1"] });
    store.set("b", { value: 2, createdAt: 1, updatedAt: 1, tags: ["t2"] });

    store.invalidateTags(["t1"]);

    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});
