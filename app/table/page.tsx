import { getSerializedRoadmapData } from "@/lib/db/queries/features";
import { TableView } from "./table-view";

export const dynamic = "force-dynamic";

export default async function TablePage() {
  const { features } = await getSerializedRoadmapData();

  return <TableView features={features} />;
}
