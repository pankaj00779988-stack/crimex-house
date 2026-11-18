import { CrewError, type Account } from "./model";
import { createBlobStore } from "./blob-store";
import { createPostgresStore } from "./postgres-store";
import { Conflict, type CrewStore } from "./store-types";
export { Conflict, type CrewStore, type Stored } from "./store-types";
export { consistentSnapshot } from "./blob-store";

export function crewNamespace() {
  if (process.env.VERCEL_ENV === "production") return "crew-v1";
  if (process.env.VERCEL_ENV === "preview") return "crew-preview-v1";
  return "crew-development-v1";
}
export function storageConfigured() {
  const backend = process.env.CREW_STORAGE_BACKEND ?? "blob";
  return backend === "postgres"
    ? !!process.env.DATABASE_URL
    : backend === "blob" && !!process.env.BLOB_READ_WRITE_TOKEN;
}
let selected: { identity: string; store: CrewStore } | undefined;
function activeStore() {
  const backend = process.env.CREW_STORAGE_BACKEND ?? "blob";
  const namespace = crewNamespace();
  if (!storageConfigured())
    throw new CrewError(
      "Crew storage is temporarily unavailable. Please retry later.",
      503,
    );
  const identity = `${backend}:${namespace}`;
  if (selected?.identity !== identity) {
    selected = {
      identity,
      store:
        backend === "postgres"
          ? createPostgresStore(process.env.DATABASE_URL!, namespace)
          : createBlobStore(namespace),
    };
  }
  return selected.store;
}
// Select explicitly. A database failure must never fall back to a stale wallet.
export const privateStore: CrewStore = {
  read: async <T>(key: string) => activeStore().read<T>(key),
  write: async <T>(key: string, value: T, etag?: string) =>
    activeStore().write(key, value, etag),
  remove: async (key, etag) => activeStore().remove(key, etag),
};

export async function mutate<T, R>(
  store: CrewStore,
  key: string,
  change: (value: T | null) => { value: T; result: R },
) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const current = await store.read<T>(key);
    const next = change(current ? structuredClone(current.value) : null);
    if (current && JSON.stringify(current.value) === JSON.stringify(next.value))
      return next.result;
    try {
      await store.write(key, next.value, current?.etag);
      return next.result;
    } catch (error) {
      if (!(error instanceof Conflict)) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
  }
  throw new CrewError(
    "Your wallet is busy. Please retry; no duplicate credits will be awarded.",
    409,
  );
}
export async function updateAccount<R>(
  store: CrewStore,
  id: string,
  change: (account: Account) => R,
) {
  return mutate<Account, R>(store, `accounts/${id}`, (value) => {
    if (!value || value.version !== 1)
      throw new CrewError("Sign in to your crew account.", 401);
    return { value, result: change(value) };
  });
}
