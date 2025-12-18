import { db } from "../index";
import { dependencies, markers, statuses } from "../schema";
import {
  type Dependency,
  type FeatureWithRelations,
  type SerializedFeatureWithRelations,
  type SerializedMarker,
  type Status,
  serializeFeature,
  serializeMarker,
} from "../types";

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

// Get roadmap data with proper serialization for RSC boundary
// Use this instead of getRoadmapData to avoid 'as unknown as' type casts
export async function getSerializedRoadmapData(): Promise<{
  features: SerializedFeatureWithRelations[];
  statuses: Status[];
  dependencies: Dependency[];
  markers: SerializedMarker[];
}> {
  const [featuresData, statusesData, dependenciesData, markersData] =
    await Promise.all([
      getAllFeaturesWithRelations(),
      getAllStatuses(),
      getAllDependencies(),
      getAllMarkers(),
    ]);

  return {
    features: featuresData.map(serializeFeature),
    statuses: statusesData,
    dependencies: dependenciesData,
    markers: markersData.map(serializeMarker),
  };
}
