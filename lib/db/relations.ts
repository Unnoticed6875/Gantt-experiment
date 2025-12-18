import { relations } from "drizzle-orm";
import {
  dependencies,
  features,
  groups,
  initiatives,
  products,
  releases,
  statuses,
  users,
} from "./schema";

export const statusesRelations = relations(statuses, ({ many }) => ({
  features: many(features),
}));

export const usersRelations = relations(users, ({ many }) => ({
  features: many(features),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  features: many(features),
}));

export const productsRelations = relations(products, ({ many }) => ({
  features: many(features),
}));

export const initiativesRelations = relations(initiatives, ({ many }) => ({
  features: many(features),
}));

export const releasesRelations = relations(releases, ({ many }) => ({
  features: many(features),
}));

export const featuresRelations = relations(features, ({ one, many }) => ({
  status: one(statuses, {
    fields: [features.statusId],
    references: [statuses.id],
  }),
  owner: one(users, {
    fields: [features.ownerId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [features.groupId],
    references: [groups.id],
  }),
  product: one(products, {
    fields: [features.productId],
    references: [products.id],
  }),
  initiative: one(initiatives, {
    fields: [features.initiativeId],
    references: [initiatives.id],
  }),
  release: one(releases, {
    fields: [features.releaseId],
    references: [releases.id],
  }),
  sourceDependencies: many(dependencies, {
    relationName: "sourceDependencies",
  }),
  targetDependencies: many(dependencies, {
    relationName: "targetDependencies",
  }),
}));

export const dependenciesRelations = relations(dependencies, ({ one }) => ({
  source: one(features, {
    fields: [dependencies.sourceId],
    references: [features.id],
    relationName: "sourceDependencies",
  }),
  target: one(features, {
    fields: [dependencies.targetId],
    references: [features.id],
    relationName: "targetDependencies",
  }),
}));
