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
