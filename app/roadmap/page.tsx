import { getRoadmapData } from "@/lib/db/queries/features";
import { RoadmapView } from "./components/roadmap-view";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const { features, statuses, dependencies, markers } = await getRoadmapData();

  return (
    <RoadmapView
      dependencies={dependencies}
      initialFeatures={features}
      markers={markers}
      statuses={statuses}
    />
  );
}
