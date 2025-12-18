import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// Enum for dependency types (matching Gantt component types)
export const dependencyTypeEnum = pgEnum("dependency_type", [
  "FS",
  "SS",
  "FF",
  "SF",
]);

// Statuses table
export const statuses = pgTable("statuses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  image: varchar("image", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Groups table
export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products table
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Initiatives table
export const initiatives = pgTable("initiatives", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Releases table
export const releases = pgTable("releases", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Features table
export const features = pgTable("features", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  statusId: uuid("status_id")
    .notNull()
    .references(() => statuses.id),
  ownerId: uuid("owner_id").references(() => users.id),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  initiativeId: uuid("initiative_id")
    .notNull()
    .references(() => initiatives.id),
  releaseId: uuid("release_id")
    .notNull()
    .references(() => releases.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Markers table
export const markers = pgTable("markers", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: timestamp("date").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  className: varchar("class_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dependencies table
export const dependencies = pgTable("dependencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" }),
  targetId: uuid("target_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" }),
  type: dependencyTypeEnum("type").notNull(),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
