import { getRoadmapData } from "@/lib/db/queries/features";
import type {
  SerializedFeatureWithRelations,
  SerializedMarker,
} from "@/lib/db/types";
import { RoadmapView } from "./components/roadmap-view";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const { features, statuses, dependencies, markers } = await getRoadmapData();

  // RSC serialization converts Date objects to ISO strings automatically
  return (
    <RoadmapView
      dependencies={dependencies}
      initialFeatures={features as unknown as SerializedFeatureWithRelations[]}
      markers={markers as unknown as SerializedMarker[]}
      statuses={statuses}
    />
  );
}
