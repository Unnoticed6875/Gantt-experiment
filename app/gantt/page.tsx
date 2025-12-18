import { getSerializedRoadmapData } from "@/lib/db/queries/features";
import { GanttView } from "./gantt-view";

export const dynamic = "force-dynamic";

export default async function GanttPage() {
  const { features, dependencies, markers } = await getSerializedRoadmapData();

  return (
    <GanttView
      dependencies={dependencies}
      initialFeatures={features}
      markers={markers}
    />
  );
}
