import { db } from "../index";
import { dependencies, markers, statuses } from "../schema";
import type { FeatureWithRelations } from "../types";

export async function getAllFeaturesWithRelations(): Promise<
  FeatureWithRelations[]
> {
  const result = await db.query.features.findMany({
    with: {
      status: true,
      owner: true,
      group: true,
      product: true,
      initiative: true,
      release: true,
    },
  });

  return result as FeatureWithRelations[];
}

export async function getAllStatuses() {
  return await db.select().from(statuses);
}

export async function getAllDependencies() {
  return await db.select().from(dependencies);
}

export async function getAllMarkers() {
  return await db.select().from(markers);
}

// Get all roadmap data in one call
export async function getRoadmapData() {
  const [featuresData, statusesData, dependenciesData, markersData] =
    await Promise.all([
      getAllFeaturesWithRelations(),
      getAllStatuses(),
      getAllDependencies(),
      getAllMarkers(),
    ]);

  return {
    features: featuresData,
    statuses: statusesData,
    dependencies: dependenciesData,
    markers: markersData,
  };
}
