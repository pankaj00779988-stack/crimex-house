import {
  del,
  get,
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
const prefix =
  process.env.VERCEL_ENV === "preview" ? "crew-preview-v1" : "crew-v1";
export const privateStore: CrewStore = {
  async remove(key, etag) {
    await del(`${prefix}/${key}.json`, { ifMatch: etag });
  },
  async read<T>(key: string) {
    const result = await get(`${prefix}/${key}.json`, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const value = (await new Response(result.stream).json()) as T;
    return { value, etag: result.blob.etag };
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
      )
        throw new Conflict();
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
