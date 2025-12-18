"use client";

import { useMemo } from "react";
import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarItem,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
} from "@/components/kibo-ui/calendar";
import {
  deserializeFeature,
  type SerializedFeatureWithRelations,
} from "@/lib/db/types";

type CalendarViewProps = {
  features: SerializedFeatureWithRelations[];
};

export function CalendarView({
  features: serializedFeatures,
}: CalendarViewProps) {
  const features = useMemo(
    () => serializedFeatures.map(deserializeFeature),
    [serializedFeatures]
  );

  const earliestYear =
    features
      .map((feature) => feature.startAt.getFullYear())
      .sort((a, b) => a - b)
      .at(0) ?? new Date().getFullYear();

  const latestYear =
    features
      .map((feature) => feature.endAt.getFullYear())
      .sort((a, b) => a - b)
      .at(-1) ?? new Date().getFullYear();

  return (
    <CalendarProvider>
      <CalendarDate>
        <CalendarDatePicker>
          <CalendarMonthPicker />
          <CalendarYearPicker end={latestYear} start={earliestYear} />
        </CalendarDatePicker>
        <CalendarDatePagination />
      </CalendarDate>
      <CalendarHeader />
      <CalendarBody features={features}>
        {({ feature }) => <CalendarItem feature={feature} key={feature.id} />}
      </CalendarBody>
    </CalendarProvider>
  );
}
