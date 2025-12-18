import { getRoadmapData } from "@/lib/db/queries/features";
import { KanbanView } from "./kanban-view";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const { features, statuses } = await getRoadmapData();

  return <KanbanView initialFeatures={features} statuses={statuses} />;
}
