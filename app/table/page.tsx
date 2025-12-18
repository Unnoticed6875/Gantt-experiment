import { getRoadmapData } from "@/lib/db/queries/features";
import { TableView } from "./table-view";

export const dynamic = "force-dynamic";

export default async function TablePage() {
  const { features } = await getRoadmapData();

  return <TableView features={features} />;
}
