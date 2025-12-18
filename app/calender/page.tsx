import { getRoadmapData } from "@/lib/db/queries/features";
import type { SerializedFeatureWithRelations } from "@/lib/db/types";
import { CalendarView } from "./calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { features } = await getRoadmapData();

  // RSC serialization converts Date objects to ISO strings automatically
  return (
    <CalendarView
      features={features as unknown as SerializedFeatureWithRelations[]}
    />
  );
}
