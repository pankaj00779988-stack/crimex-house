import {
  del,
  get,
  head,
  put,
  BlobError,
  BlobPreconditionFailedError,
} from "@vercel/blob";
import { CrewError, type Account } from "./model";
export interface Stored<T> {
  value: T;
  etag: string;
}
export interface CrewStore {
  read<T>(key: string): Promise<Stored<T> | null>;
  write<T>(key: string, value: T, etag?: string): Promise<void>;
  remove(key: string, etag: string): Promise<void>;
}
export class Conflict extends Error {}
interface Snapshot {
  value: unknown;
  etag: string;
}
export async function consistentSnapshot(
  load: () => Promise<Snapshot | null>,
  revision: () => Promise<string>,
): Promise<Snapshot | null> {
  const first = await load();
  if (!first || (first.etag && !first.etag.startsWith("W/"))) return first;
  // Some delivery layers omit or weaken HTTP ETags. Discard that first body.
  // A revision sandwich binds a new origin read to a stable control-plane ETag.
  for (let attempt = 0; attempt < 4; attempt++) {
    const before = await revision();
    const current = await load();
    const after = await revision();
    if (!current) return null;
    if (before && before === after)
      return { value: current.value, etag: after };
  }
  throw new CrewError(
    "Your wallet changed while it was loading. Please retry.",
    409,
  );
}
const prefix =
  process.env.VERCEL_ENV === "preview" ? "crew-preview-v1" : "crew-v1";
export const privateStore: CrewStore = {
  async remove(key, etag) {
    const metadata = await head(`${prefix}/${key}.json`);
    try {
      await del(metadata.url, { ifMatch: etag });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError)
        throw new CrewError(
          "Your account changed. Please retry deletion.",
          409,
        );
      throw error;
    }
  },
  async read<T>(key: string) {
    const path = `${prefix}/${key}.json`;
    const read = await consistentSnapshot(
      async () => {
        const result = await get(path, {
          access: "private",
          useCache: false,
          headers: { "accept-encoding": "identity" },
        });
        if (!result || result.statusCode !== 200 || !result.stream) return null;
        return {
          value: await new Response(result.stream).json(),
          etag: result.blob.etag,
        };
      },
      async () => (await head(path)).etag,
    );
    return read as Stored<T> | null;
  },
  async write<T>(key: string, value: T, etag?: string) {
    try {
      await put(`${prefix}/${key}.json`, JSON.stringify(value), {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/json",
        ...(etag
          ? { allowOverwrite: true, ifMatch: etag }
          : { allowOverwrite: false }),
      });
    } catch (error) {
      if (
        error instanceof BlobPreconditionFailedError ||
        (error instanceof BlobError && /already exists/i.test(error.message))
      ) {
        throw new Conflict();
      }
      throw error;
    }
  },
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
