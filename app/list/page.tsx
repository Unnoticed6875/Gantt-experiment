import { getRoadmapData } from "@/lib/db/queries/features";
import { ListView } from "./list-view";

export const dynamic = "force-dynamic";

export default async function ListPage() {
  const { features, statuses } = await getRoadmapData();

  return <ListView initialFeatures={features} statuses={statuses} />;
}
