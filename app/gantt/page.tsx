import { getRoadmapData } from "@/lib/db/queries/features";
import type {
  SerializedFeatureWithRelations,
  SerializedMarker,
} from "@/lib/db/types";
import { GanttView } from "./gantt-view";

export const dynamic = "force-dynamic";

export default async function GanttPage() {
  const { features, dependencies, markers } = await getRoadmapData();

  // RSC serialization converts Date objects to ISO strings automatically
  return (
    <GanttView
      dependencies={dependencies}
      initialFeatures={features as unknown as SerializedFeatureWithRelations[]}
      markers={markers as unknown as SerializedMarker[]}
    />
  );
}
