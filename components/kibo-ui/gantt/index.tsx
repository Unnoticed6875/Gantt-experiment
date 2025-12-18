"use client";

import { getDaysInMonth } from "date-fns";
import throttle from "lodash.throttle";
import type { CSSProperties, FC, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { GanttContext } from "./context";
import { useGanttScrollX } from "./store";
import type { GanttFeature, Range, TimelineData } from "./types";
import { getOffset } from "./utils/timeline";

export {
  GanttAddFeatureHelper,
  type GanttAddFeatureHelperProps,
  GanttColumn,
  type GanttColumnProps,
  GanttColumns,
  type GanttColumnsProps,
} from "./components/columns";
export {
  GanttDependencyLayer,
  type GanttDependencyLayerProps,
} from "./components/dependencies";
export {
  GanttFeatureDragHelper,
  type GanttFeatureDragHelperProps,
  GanttFeatureItem,
  GanttFeatureItemCard,
  type GanttFeatureItemCardProps,
  type GanttFeatureItemProps,
  GanttFeatureList,
  GanttFeatureListGroup,
  type GanttFeatureListGroupProps,
  type GanttFeatureListProps,
  GanttFeatureRow,
  type GanttFeatureRowProps,
} from "./components/features";
// Re-export components
export {
  GanttContentHeader,
  type GanttContentHeaderProps,
  GanttHeader,
  type GanttHeaderProps,
} from "./components/headers";
export {
  GanttCreateMarkerTrigger,
  type GanttCreateMarkerTriggerProps,
  GanttMarker,
  GanttToday,
  type GanttTodayProps,
} from "./components/markers";
export {
  GanttSidebar,
  GanttSidebarGroup,
  type GanttSidebarGroupProps,
  GanttSidebarHeader,
  GanttSidebarItem,
  type GanttSidebarItemProps,
  type GanttSidebarProps,
} from "./components/sidebar";
export { GanttTimeline, type GanttTimelineProps } from "./components/timeline";
// Re-export store hooks
export {
  type SidebarColumns,
  useFeaturePositions,
  useGanttDragging,
  useGanttScrollX,
  useSidebarColumns,
} from "./store";
// Re-export types
export type {
  FeaturePosition,
  GanttContextProps,
  GanttDependency,
  GanttDependencyType,
  GanttFeature,
  GanttMarkerProps,
  GanttStatus,
  Range,
  TimelineData,
} from "./types";
// Re-export utilities
export { autoSchedule, recalculateSchedule } from "./utils/autoSchedule";

const createInitialTimelineData = (today: Date) => {
  const data: TimelineData = [];

  data.push(
    { year: today.getFullYear() - 1, quarters: new Array(4).fill(null) },
    { year: today.getFullYear(), quarters: new Array(4).fill(null) },
    { year: today.getFullYear() + 1, quarters: new Array(4).fill(null) }
  );

  for (const yearObj of data) {
    yearObj.quarters = new Array(4).fill(null).map((_, quarterIndex) => ({
      // biome-ignore lint: monthInQuarter is a descriptive local variable that doesn't actually shadow
      months: new Array(3).fill(null).map((_, monthInQuarter) => {
        const monthNum = quarterIndex * 3 + monthInQuarter;
        return {
          days: getDaysInMonth(new Date(yearObj.year, monthNum, 1)),
        };
      }),
    }));
  }

  return data;
};

export type GanttProviderProps = {
  range?: Range;
  zoom?: number;
  onAddItem?: (date: Date) => void;
  children: ReactNode;
  className?: string;
};

export const GanttProvider: FC<GanttProviderProps> = ({
  zoom = 100,
  range = "monthly",
  onAddItem,
  children,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [timelineData, setTimelineData] = useState<TimelineData>(
    createInitialTimelineData(new Date())
  );
  const [, setScrollX] = useGanttScrollX();
  const [sidebarWidth, setSidebarWidth] = useState(0);

  const headerHeight = 60;
  const rowHeight = 36;
  let columnWidth = 50;

  if (range === "weekly") {
    columnWidth = 80;
  } else if (range === "monthly") {
    columnWidth = 150;
  } else if (range === "quarterly") {
    columnWidth = 100;
  } else if (range === "yearly") {
    columnWidth = 200;
  }

  const cssVariables = useMemo(
    () =>
      ({
        "--gantt-zoom": `${zoom}`,
        "--gantt-column-width": `${(zoom / 100) * columnWidth}px`,
        "--gantt-header-height": `${headerHeight}px`,
        "--gantt-row-height": `${rowHeight}px`,
        "--gantt-sidebar-width": `${sidebarWidth}px`,
      }) as CSSProperties,
    [zoom, columnWidth, sidebarWidth]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft =
        scrollRef.current.scrollWidth / 2 - scrollRef.current.clientWidth / 2;
      setScrollX(scrollRef.current.scrollLeft);
    }
  }, [setScrollX]);

  useEffect(() => {
    const updateSidebarWidth = () => {
      const sidebarElement = scrollRef.current?.querySelector(
        '[data-roadmap-ui="gantt-sidebar"]'
      ) as HTMLElement | null;
      const newWidth = sidebarElement ? sidebarElement.offsetWidth : 0;
      setSidebarWidth(newWidth);
    };

    updateSidebarWidth();

    const observer = new MutationObserver(updateSidebarWidth);
    if (scrollRef.current) {
      observer.observe(scrollRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style"],
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleScroll = useCallback(
    throttle(() => {
      const scrollElement = scrollRef.current;
      if (!scrollElement) {
        return;
      }

      const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
      setScrollX(scrollLeft);

      if (scrollLeft === 0) {
        const firstYear = timelineData[0]?.year;

        if (!firstYear) {
          return;
        }

        const newTimelineData: TimelineData = [...timelineData];
        newTimelineData.unshift({
          year: firstYear - 1,
          quarters: new Array(4).fill(null).map((_, quarterIndex) => ({
            // biome-ignore lint: monthInQuarter is a descriptive local variable that doesn't actually shadow
            months: new Array(3).fill(null).map((_, monthInQuarter) => {
              const monthNum = quarterIndex * 3 + monthInQuarter;
              return {
                days: getDaysInMonth(new Date(firstYear, monthNum, 1)),
              };
            }),
          })),
        });

        setTimelineData(newTimelineData);

        scrollElement.scrollLeft = scrollElement.clientWidth;
        setScrollX(scrollElement.scrollLeft);
      } else if (scrollLeft + clientWidth >= scrollWidth) {
        const lastYear = timelineData.at(-1)?.year;

        if (!lastYear) {
          return;
        }

        const newTimelineData: TimelineData = [...timelineData];
        newTimelineData.push({
          year: lastYear + 1,
          quarters: new Array(4).fill(null).map((_, quarterIndex) => ({
            // biome-ignore lint: monthInQuarter is a descriptive local variable that doesn't actually shadow
            months: new Array(3).fill(null).map((_, monthInQuarter) => {
              const monthNum = quarterIndex * 3 + monthInQuarter;
              return {
                days: getDaysInMonth(new Date(lastYear, monthNum, 1)),
              };
            }),
          })),
        });

        setTimelineData(newTimelineData);

        scrollElement.scrollLeft =
          scrollElement.scrollWidth - scrollElement.clientWidth;
        setScrollX(scrollElement.scrollLeft);
      }
    }, 100),
    []
  );

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]);

  const scrollToFeature = useCallback(
    (feature: GanttFeature) => {
      const scrollElement = scrollRef.current;
      if (!scrollElement) {
        return;
      }

      const timelineStartDate = new Date(timelineData[0].year, 0, 1);

      const offset = getOffset(feature.startAt, timelineStartDate, {
        zoom,
        range,
        columnWidth,
        sidebarWidth,
        headerHeight,
        rowHeight,
        onAddItem,
        placeholderLength: 2,
        timelineData,
        ref: scrollRef,
      });

      const targetScrollLeft = Math.max(0, offset);

      scrollElement.scrollTo({
        left: targetScrollLeft,
        behavior: "smooth",
      });
    },
    [timelineData, zoom, range, columnWidth, sidebarWidth, onAddItem]
  );

  return (
    <GanttContext.Provider
      value={{
        zoom,
        range,
        headerHeight,
        columnWidth,
        sidebarWidth,
        rowHeight,
        onAddItem,
        timelineData,
        placeholderLength: 2,
        ref: scrollRef,
        scrollToFeature,
      }}
    >
      <div
        className={cn(
          "gantt relative isolate grid h-full w-full flex-none select-none overflow-auto rounded-sm bg-secondary",
          range,
          className
        )}
        ref={scrollRef}
        style={{
          ...cssVariables,
          gridTemplateColumns: "var(--gantt-sidebar-width) 1fr",
        }}
      >
        {children}
      </div>
    </GanttContext.Provider>
  );
};
