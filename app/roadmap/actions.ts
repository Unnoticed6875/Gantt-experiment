"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dependencies, features, markers } from "@/lib/db/schema";
import type { NewDependency, NewFeature, NewMarker } from "@/lib/db/types";

// Feature Actions
export async function createFeature(
  data: Omit<NewFeature, "id" | "createdAt" | "updatedAt">
) {
  const result = await db.insert(features).values(data).returning();
  revalidatePath("/roadmap");
  return result[0];
}

export async function updateFeature(
  id: string,
  data: Partial<Omit<NewFeature, "id" | "createdAt" | "updatedAt">>
) {
  const result = await db
    .update(features)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(features.id, id))
    .returning();
  revalidatePath("/roadmap");
  return result[0];
}

export async function updateFeatureDates(
  id: string,
  startAt: Date,
  endAt: Date
) {
  const result = await db
    .update(features)
    .set({ startAt, endAt, updatedAt: new Date() })
    .where(eq(features.id, id))
    .returning();
  revalidatePath("/roadmap");
  return result[0];
}

export async function updateFeatureStatus(id: string, statusId: string) {
  const result = await db
    .update(features)
    .set({ statusId, updatedAt: new Date() })
    .where(eq(features.id, id))
    .returning();
  revalidatePath("/roadmap");
  return result[0];
}

export async function deleteFeature(id: string) {
  await db.delete(features).where(eq(features.id, id));
  revalidatePath("/roadmap");
}

// Marker Actions
export async function createMarker(
  data: Omit<NewMarker, "id" | "createdAt" | "updatedAt">
) {
  const result = await db.insert(markers).values(data).returning();
  revalidatePath("/roadmap");
  return result[0];
}

export async function deleteMarker(id: string) {
  await db.delete(markers).where(eq(markers.id, id));
  revalidatePath("/roadmap");
}

// Dependency Actions
export async function createDependency(
  data: Omit<NewDependency, "id" | "createdAt" | "updatedAt">
) {
  const result = await db.insert(dependencies).values(data).returning();
  revalidatePath("/roadmap");
  return result[0];
}

export async function deleteDependency(id: string) {
  await db.delete(dependencies).where(eq(dependencies.id, id));
  revalidatePath("/roadmap");
}

// Batch update for auto-scheduling
export async function batchUpdateFeatureDates(
  updates: Array<{ id: string; startAt: Date; endAt: Date }>
) {
  const results = await Promise.all(
    updates.map((update) =>
      db
        .update(features)
        .set({
          startAt: update.startAt,
          endAt: update.endAt,
          updatedAt: new Date(),
        })
        .where(eq(features.id, update.id))
        .returning()
    )
  );
  revalidatePath("/roadmap");
  return results.flat();
}
