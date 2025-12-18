import { getRoadmapData } from "@/lib/db/queries/features";
import type { SerializedFeatureWithRelations } from "@/lib/db/types";
import { KanbanView } from "./kanban-view";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const { features, statuses } = await getRoadmapData();

  // RSC serialization converts Date objects to ISO strings automatically
  return (
    <KanbanView
      initialFeatures={features as unknown as SerializedFeatureWithRelations[]}
      statuses={statuses}
    />
  );
}
