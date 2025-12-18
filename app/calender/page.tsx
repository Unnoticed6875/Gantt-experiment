import { getSerializedRoadmapData } from "@/lib/db/queries/features";
import { CalendarView } from "./calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { features } = await getSerializedRoadmapData();

  return <CalendarView features={features} />;
}
