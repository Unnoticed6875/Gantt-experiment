import { getRoadmapData } from "@/lib/db/queries/features";
import type { SerializedFeatureWithRelations } from "@/lib/db/types";
import { TableView } from "./table-view";

export const dynamic = "force-dynamic";

export default async function TablePage() {
  const { features } = await getRoadmapData();

  // RSC serialization converts Date objects to ISO strings automatically
  return (
    <TableView
      features={features as unknown as SerializedFeatureWithRelations[]}
    />
  );
}
