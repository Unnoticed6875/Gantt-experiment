import { getRoadmapData } from "@/lib/db/queries/features";
import type { SerializedFeatureWithRelations } from "@/lib/db/types";
import { ListView } from "./list-view";

export const dynamic = "force-dynamic";

export default async function ListPage() {
  const { features, statuses } = await getRoadmapData();

  // RSC serialization converts Date objects to ISO strings automatically
  return (
    <ListView
      initialFeatures={features as unknown as SerializedFeatureWithRelations[]}
      statuses={statuses}
    />
  );
}
