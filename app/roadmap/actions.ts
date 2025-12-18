"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dependencies, features, markers } from "@/lib/db/schema";
import type {
  Dependency,
  Feature,
  Marker,
  NewDependency,
  NewFeature,
  NewMarker,
} from "@/lib/db/types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// All routes that display feature data and need revalidation
const FEATURE_ROUTES = [
  "/roadmap",
  "/gantt",
  "/kanban",
  "/calendar",
  "/list",
  "/table",
] as const;

function revalidateFeatureRoutes() {
  for (const route of FEATURE_ROUTES) {
    revalidatePath(route);
  }
}

// Feature Actions
export async function createFeature(
  data: Omit<NewFeature, "id" | "createdAt" | "updatedAt">
): Promise<ActionResult<Feature>> {
  try {
    const result = await db.insert(features).values(data).returning();
    revalidateFeatureRoutes();
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to create feature:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create feature",
    };
  }
}

export async function updateFeature(
  id: string,
  data: Partial<Omit<NewFeature, "id" | "createdAt" | "updatedAt">>
): Promise<ActionResult<Feature>> {
  try {
    const result = await db
      .update(features)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(features.id, id))
      .returning();
    if (result.length === 0) {
      return { success: false, error: "Feature not found" };
    }
    revalidateFeatureRoutes();
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to update feature:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update feature",
    };
  }
}

export async function updateFeatureDates(
  id: string,
  startAt: Date,
  endAt: Date
): Promise<ActionResult<Feature>> {
  try {
    const result = await db
      .update(features)
      .set({ startAt, endAt, updatedAt: new Date() })
      .where(eq(features.id, id))
      .returning();
    if (result.length === 0) {
      return { success: false, error: "Feature not found" };
    }
    revalidateFeatureRoutes();
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to update feature dates:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update feature dates",
    };
  }
}

export async function updateFeatureStatus(
  id: string,
  statusId: string
): Promise<ActionResult<Feature>> {
  try {
    const result = await db
      .update(features)
      .set({ statusId, updatedAt: new Date() })
      .where(eq(features.id, id))
      .returning();
    if (result.length === 0) {
      return { success: false, error: "Feature not found" };
    }
    revalidateFeatureRoutes();
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to update feature status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update feature status",
    };
  }
}

export async function deleteFeature(id: string): Promise<ActionResult<void>> {
  try {
    await db.delete(features).where(eq(features.id, id));
    revalidateFeatureRoutes();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete feature:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete feature",
    };
  }
}

// Marker Actions
export async function createMarker(
  data: Omit<NewMarker, "id" | "createdAt" | "updatedAt">
): Promise<ActionResult<Marker>> {
  try {
    const result = await db.insert(markers).values(data).returning();
    revalidateFeatureRoutes();
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to create marker:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create marker",
    };
  }
}

export async function deleteMarker(id: string): Promise<ActionResult<void>> {
  try {
    await db.delete(markers).where(eq(markers.id, id));
    revalidateFeatureRoutes();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete marker:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete marker",
    };
  }
}

// Dependency Actions
export async function createDependency(
  data: Omit<NewDependency, "id" | "createdAt" | "updatedAt">
): Promise<ActionResult<Dependency>> {
  try {
    const result = await db.insert(dependencies).values(data).returning();
    revalidateFeatureRoutes();
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to create dependency:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create dependency",
    };
  }
}

export async function deleteDependency(
  id: string
): Promise<ActionResult<void>> {
  try {
    await db.delete(dependencies).where(eq(dependencies.id, id));
    revalidateFeatureRoutes();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete dependency:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete dependency",
    };
  }
}

// Batch update for auto-scheduling
export async function batchUpdateFeatureDates(
  updates: Array<{ id: string; startAt: Date; endAt: Date }>
): Promise<ActionResult<Feature[]>> {
  if (updates.length === 0) {
    return { success: true, data: [] };
  }

  try {
    const now = new Date();
    // Use a transaction to batch all updates into a single database round-trip
    const results = await db.transaction(async (tx) => {
      const updateResults: Feature[] = [];
      for (const update of updates) {
        const result = await tx
          .update(features)
          .set({
            startAt: update.startAt,
            endAt: update.endAt,
            updatedAt: now,
          })
          .where(eq(features.id, update.id))
          .returning();
        if (result[0]) {
          updateResults.push(result[0]);
        }
      }
      return updateResults;
    });
    revalidateFeatureRoutes();
    return { success: true, data: results };
  } catch (error) {
    console.error("Failed to batch update feature dates:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to batch update feature dates",
    };
  }
}
