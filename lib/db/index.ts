import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
// biome-ignore lint/performance/noNamespaceImport: required for relations
import * as relations from "./relations";
// biome-ignore lint/performance/noNamespaceImport: required for schema
import * as schema from "./schema";

type DrizzleClient = ReturnType<
  typeof drizzle<{
    [K in keyof typeof schema | keyof typeof relations]: (typeof schema &
      typeof relations)[K];
  }>
>;

let _db: DrizzleClient | null = null;

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Please set it in your .env.local file or environment variables."
    );
  }
  return connectionString;
}

function createDatabaseClient(): DrizzleClient {
  const connectionString = getConnectionString();
  const queryClient = postgres(connectionString);
  return drizzle(queryClient, { schema: { ...schema, ...relations } });
}

/**
 * Get the database client instance.
 * Uses lazy initialization to avoid crashes on module import when DATABASE_URL is not set.
 * The error is thrown only when the database is actually accessed.
 */
export function getDb(): DrizzleClient {
  if (!_db) {
    _db = createDatabaseClient();
  }
  return _db;
}

/**
 * Check if the database is configured (DATABASE_URL is set).
 * Use this for graceful degradation in components that can work without a database.
 */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// For backwards compatibility - lazily initialized
// This will throw a helpful error when accessed if DATABASE_URL is not set
export const db = new Proxy({} as DrizzleClient, {
  get(_target, prop) {
    const client = getDb();
    const value = client[prop as keyof DrizzleClient];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

// Export for type inference
export type Database = DrizzleClient;
