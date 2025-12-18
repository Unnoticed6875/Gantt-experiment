import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
// biome-ignore lint/performance/noNamespaceImport: required for relations
import * as relations from "./relations";
// biome-ignore lint/performance/noNamespaceImport: required for schema
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// For query purposes
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema: { ...schema, ...relations } });

// Export for type inference
export type Database = typeof db;
