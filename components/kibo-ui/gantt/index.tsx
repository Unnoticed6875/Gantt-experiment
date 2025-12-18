"use client";

import {
  DndContext,
  MouseSensor,
  useDraggable,
  useSensor,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { useMouse, useThrottle, useWindowScroll } from "@uidotdev/usehooks";
import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  endOfDay,
  endOfMonth,
  format,
  formatDate,
  formatDistance,
  getDate,
  getDaysInMonth,
  isSameDay,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { atom, useAtom } from "jotai";
import throttle from "lodash.throttle";
import { PlusIcon, TrashIcon } from "lucide-react";
import type {
  CSSProperties,
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
  RefObject,
} from "react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

const draggingAtom = atom(false);
const scrollXAtom = atom(0);
const featurePositionsAtom = atom<Map<string, FeaturePosition>>(new Map());

export const useGanttDragging = () => useAtom(draggingAtom);
export const useGanttScrollX = () => useAtom(scrollXAtom);
export const useFeaturePositions = () => useAtom(featurePositionsAtom);

export type GanttStatus = {
  id: string;
  name: string;
  color: string;
};

export type GanttFeature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: GanttStatus;
  lane?: string; // Optional: features with the same lane will share a row
};

export type GanttMarkerProps = {
  id: string;
  date: Date;
  label: string;
};

export type GanttDependencyType = "FS" | "SS" | "FF" | "SF";

export type GanttDependency = {
  id: string;
  sourceId: string;
  targetId: string;
  type: GanttDependencyType;
  color?: string;
};

type FeaturePosition = {
  id: string;
  left: number;
  width: number;
  top: number;
  height: number;
};

export type Range = "daily" | "monthly" | "quarterly";

export type TimelineData = {
  year: number;
  quarters: {
    months: {
      days: number;
    }[];
  }[];
}[];

export type GanttContextProps = {
  zoom: number;
  range: Range;
  columnWidth: number;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
  onAddItem: ((date: Date) => void) | undefined;
  placeholderLength: number;
  timelineData: TimelineData;
  ref: RefObject<HTMLDivElement | null> | null;
  scrollToFeature?: (feature: GanttFeature) => void;
};

const getsDaysIn = (range: Range) => {
  // For when range is daily
  let fn = (_date: Date) => 1;

  if (range === "monthly" || range === "quarterly") {
    fn = getDaysInMonth;
  }

  return fn;
};

const getDifferenceIn = (range: Range) => {
  let fn = differenceInDays;

  if (range === "monthly" || range === "quarterly") {
    fn = differenceInMonths;
  }

  return fn;
};

const getInnerDifferenceIn = (range: Range) => {
  let fn = differenceInHours;

  if (range === "monthly" || range === "quarterly") {
    fn = differenceInDays;
  }

  return fn;
};

const getStartOf = (range: Range) => {
  let fn = startOfDay;

  if (range === "monthly" || range === "quarterly") {
    fn = startOfMonth;
  }

  return fn;
};

const getEndOf = (range: Range) => {
  let fn = endOfDay;

  if (range === "monthly" || range === "quarterly") {
    fn = endOfMonth;
  }

  return fn;
};

const getAddRange = (range: Range) => {
  let fn = addDays;

  if (range === "monthly" || range === "quarterly") {
    fn = addMonths;
  }

  return fn;
};

const getDateByMousePosition = (context: GanttContextProps, mouseX: number) => {
  const timelineStartDate = new Date(context.timelineData[0].year, 0, 1);
  const columnWidth = (context.columnWidth * context.zoom) / 100;
  const offset = Math.floor(mouseX / columnWidth);
  const daysIn = getsDaysIn(context.range);
  const addRange = getAddRange(context.range);
  const month = addRange(timelineStartDate, offset);
  const daysInMonth = daysIn(month);
  const pixelsPerDay = Math.round(columnWidth / daysInMonth);
  const dayOffset = Math.floor((mouseX % columnWidth) / pixelsPerDay);
  const actualDate = addDays(month, dayOffset);

  return actualDate;
};

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

const getOffset = (
  date: Date,
  timelineStartDate: Date,
  context: GanttContextProps
) => {
  const parsedColumnWidth = (context.columnWidth * context.zoom) / 100;
  const differenceIn = getDifferenceIn(context.range);
  const startOf = getStartOf(context.range);
  const fullColumns = differenceIn(startOf(date), timelineStartDate);

  if (context.range === "daily") {
    return parsedColumnWidth * fullColumns;
  }

  const partialColumns = date.getDate();
  const daysInMonth = getDaysInMonth(date);
  const pixelsPerDay = parsedColumnWidth / daysInMonth;

  return fullColumns * parsedColumnWidth + partialColumns * pixelsPerDay;
};

const getWidth = (
  startAt: Date,
  endAt: Date | null,
  context: GanttContextProps
) => {
  const parsedColumnWidth = (context.columnWidth * context.zoom) / 100;

  if (!endAt) {
    return parsedColumnWidth * 2;
  }

  const differenceIn = getDifferenceIn(context.range);

  if (context.range === "daily") {
    const delta = differenceIn(endAt, startAt);

    return parsedColumnWidth * (delta ? delta : 1);
  }

  const daysInStartMonth = getDaysInMonth(startAt);
  const pixelsPerDayInStartMonth = parsedColumnWidth / daysInStartMonth;

  if (isSameDay(startAt, endAt)) {
    return pixelsPerDayInStartMonth;
  }

  const innerDifferenceIn = getInnerDifferenceIn(context.range);
  const startOf = getStartOf(context.range);

  if (isSameDay(startOf(startAt), startOf(endAt))) {
    return innerDifferenceIn(endAt, startAt) * pixelsPerDayInStartMonth;
  }

  const startRangeOffset = daysInStartMonth - getDate(startAt);
  const endRangeOffset = getDate(endAt);
  const fullRangeOffset = differenceIn(startOf(endAt), startOf(startAt));
  const daysInEndMonth = getDaysInMonth(endAt);
  const pixelsPerDayInEndMonth = parsedColumnWidth / daysInEndMonth;

  return (
    (fullRangeOffset - 1) * parsedColumnWidth +
    startRangeOffset * pixelsPerDayInStartMonth +
    endRangeOffset * pixelsPerDayInEndMonth
  );
};

const calculateInnerOffset = (
  date: Date,
  range: Range,
  columnWidth: number
) => {
  const startOf = getStartOf(range);
  const endOf = getEndOf(range);
  const differenceIn = getInnerDifferenceIn(range);
  const startOfRange = startOf(date);
  const endOfRange = endOf(date);
  const totalRangeDays = differenceIn(endOfRange, startOfRange);
  const dayOfMonth = date.getDate();

  return (dayOfMonth / totalRangeDays) * columnWidth;
};

// Dependency arrow calculation functions
type ArrowEndpoint = {
  x: number;
  y: number;
};

type Obstacle = {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

// Check if horizontal line segment intersects an obstacle
const horizontalLineIntersectsObstacle = (
  y: number,
  x1: number,
  x2: number,
  obstacle: Obstacle
): boolean => {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  // Check if y is within obstacle's vertical bounds
  if (y <= obstacle.top || y >= obstacle.bottom) {
    return false;
  }

  // Check if x range overlaps with obstacle
  return !(maxX <= obstacle.left || minX >= obstacle.right);
};

// Check if vertical line segment intersects an obstacle
const verticalLineIntersectsObstacle = (
  x: number,
  y1: number,
  y2: number,
  obstacle: Obstacle
): boolean => {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  // Check if x is within obstacle's horizontal bounds
  if (x <= obstacle.left || x >= obstacle.right) {
    return false;
  }

  // Check if y range overlaps with obstacle
  return !(maxY <= obstacle.top || minY >= obstacle.bottom);
};

type SafeHorizontalYParams = {
  baseY: number;
  direction: "above" | "below";
  minX: number;
  maxX: number;
  obstacles: Obstacle[];
};

// Find a Y coordinate that doesn't intersect any obstacles in a horizontal span
const findSafeHorizontalY = ({
  baseY,
  direction,
  minX,
  maxX,
  obstacles,
}: SafeHorizontalYParams): number => {
  const step = 20;
  const maxIterations = 20;

  for (let i = 0; i < maxIterations; i++) {
    const testY = direction === "above" ? baseY - i * step : baseY + i * step;

    const hasCollision = obstacles.some((obs) =>
      horizontalLineIntersectsObstacle(testY, minX, maxX, obs)
    );

    if (!hasCollision) {
      return testY;
    }
  }

  return baseY;
};

type SafeVerticalXParams = {
  baseX: number;
  direction: "left" | "right";
  minY: number;
  maxY: number;
  obstacles: Obstacle[];
};

// Find an X coordinate that doesn't intersect any obstacles in a vertical span
const findSafeVerticalX = ({
  baseX,
  direction,
  minY,
  maxY,
  obstacles,
}: SafeVerticalXParams): number => {
  const step = 20;
  const maxIterations = 20;

  for (let i = 0; i < maxIterations; i++) {
    const testX = direction === "left" ? baseX - i * step : baseX + i * step;

    const hasCollision = obstacles.some((obs) =>
      verticalLineIntersectsObstacle(testX, minY, maxY, obs)
    );

    if (!hasCollision) {
      return testX;
    }
  }

  return baseX;
};

type DependencyEndpoints = {
  source: ArrowEndpoint;
  target: ArrowEndpoint;
  targetFromRight: boolean; // true if arrow connects to right side of target bar
};

const calculateDependencyEndpoints = (
  dependency: GanttDependency,
  featurePositions: Map<string, FeaturePosition>
): DependencyEndpoints | null => {
  const sourcePos = featurePositions.get(dependency.sourceId);
  const targetPos = featurePositions.get(dependency.targetId);

  if (!(sourcePos && targetPos)) {
    return null;
  }

  // Calculate vertical center of each feature
  const sourceVerticalCenter = sourcePos.top + sourcePos.height / 2;
  const targetVerticalCenter = targetPos.top + targetPos.height / 2;

  let sourceX: number;
  let targetX: number;
  let targetFromRight = false;

  switch (dependency.type) {
    case "FS": // Finish-to-Start: arrow enters target from left
      sourceX = sourcePos.left + sourcePos.width;
      targetX = targetPos.left;
      break;
    case "SS": // Start-to-Start: arrow enters target from left
      sourceX = sourcePos.left;
      targetX = targetPos.left;
      break;
    case "FF": // Finish-to-Finish: arrow enters target from right
      sourceX = sourcePos.left + sourcePos.width;
      targetX = targetPos.left + targetPos.width;
      targetFromRight = true;
      break;
    case "SF": // Start-to-Finish: arrow enters target from right
      sourceX = sourcePos.left;
      targetX = targetPos.left + targetPos.width;
      targetFromRight = true;
      break;
    default: // Default to FS
      sourceX = sourcePos.left + sourcePos.width;
      targetX = targetPos.left;
  }

  return {
    source: { x: sourceX, y: sourceVerticalCenter },
    target: { x: targetX, y: targetVerticalCenter },
    targetFromRight,
  };
};

// Calculate path between dependency endpoints
type PathParams = {
  source: ArrowEndpoint;
  target: ArrowEndpoint;
  targetFromRight: boolean;
  obstacles: Obstacle[];
};

const calculateDependencyPath = ({
  source,
  target,
  targetFromRight,
  obstacles,
}: PathParams): string => {
  const padding = 12;
  const dy = target.y - source.y;

  // Same row - simple horizontal line
  if (Math.abs(dy) < 5) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }

  if (targetFromRight) {
    // Arrow connects to right side of target bar
    const dx = target.x - source.x;

    // Source is to the left of target - go right, then up/down, then left to target
    if (dx > 0) {
      const baseExitX = target.x + padding;
      // Find safe X for vertical segment
      const exitX = findSafeVerticalX({
        baseX: baseExitX,
        direction: "right",
        minY: Math.min(source.y, target.y),
        maxY: Math.max(source.y, target.y),
        obstacles,
      });
      return (
        `M ${source.x} ${source.y} ` +
        `L ${exitX} ${source.y} ` +
        `L ${exitX} ${target.y} ` +
        `L ${target.x} ${target.y}`
      );
    }

    // Source is to the right or close - need to route around
    const exitX = source.x + padding;
    const entryX = target.x + padding;
    const baseY =
      dy > 0 ? Math.max(source.y, target.y) : Math.min(source.y, target.y);
    const direction = dy > 0 ? "below" : "above";

    // Find safe Y for horizontal segment
    const midY = findSafeHorizontalY({
      baseY: direction === "below" ? baseY + 20 : baseY - 20,
      direction,
      minX: Math.min(exitX, entryX),
      maxX: Math.max(exitX, entryX),
      obstacles,
    });

    return (
      `M ${source.x} ${source.y} ` +
      `L ${exitX} ${source.y} ` +
      `L ${exitX} ${midY} ` +
      `L ${entryX} ${midY} ` +
      `L ${entryX} ${target.y} ` +
      `L ${target.x} ${target.y}`
    );
  }

  // Arrow connects to left side of target bar (default)
  const dx = target.x - source.x;

  // Target is to the right - standard elbow (right, down/up, right)
  if (dx > padding * 2) {
    const baseTurnX = source.x + padding;
    // Find safe X for vertical segment
    const turnX = findSafeVerticalX({
      baseX: baseTurnX,
      direction: "right",
      minY: Math.min(source.y, target.y),
      maxY: Math.max(source.y, target.y),
      obstacles,
    });
    return (
      `M ${source.x} ${source.y} ` +
      `L ${turnX} ${source.y} ` +
      `L ${turnX} ${target.y} ` +
      `L ${target.x} ${target.y}`
    );
  }

  // Target is to the left or very close - need to go around
  const exitX = source.x + padding;
  const entryX = target.x - padding;
  const baseY =
    dy > 0 ? Math.max(source.y, target.y) : Math.min(source.y, target.y);
  const direction = dy > 0 ? "below" : "above";

  // Find safe Y for horizontal segment
  const midY = findSafeHorizontalY({
    baseY: direction === "below" ? baseY + 20 : baseY - 20,
    direction,
    minX: Math.min(exitX, entryX),
    maxX: Math.max(exitX, entryX),
    obstacles,
  });

  return (
    `M ${source.x} ${source.y} ` +
    `L ${exitX} ${source.y} ` +
    `L ${exitX} ${midY} ` +
    `L ${entryX} ${midY} ` +
    `L ${entryX} ${target.y} ` +
    `L ${target.x} ${target.y}`
  );
};

const GanttContext = createContext<GanttContextProps>({
  zoom: 100,
  range: "monthly",
  columnWidth: 50,
  headerHeight: 60,
  sidebarWidth: 300,
  rowHeight: 36,
  onAddItem: undefined,
  placeholderLength: 2,
  timelineData: [],
  ref: null,
  scrollToFeature: undefined,
});

export type GanttContentHeaderProps = {
  renderHeaderItem: (index: number) => ReactNode;
  title: string;
  columns: number;
};

export const GanttContentHeader: FC<GanttContentHeaderProps> = ({
  title,
  columns,
  renderHeaderItem,
}) => {
  const id = useId();

  return (
    <div
      className="sticky top-0 z-20 grid w-full shrink-0 bg-backdrop/90 backdrop-blur-sm"
      style={{ height: "var(--gantt-header-height)" }}
    >
      <div>
        <div
          className="sticky inline-flex whitespace-nowrap px-3 py-2 text-muted-foreground text-xs"
          style={{
            left: "var(--gantt-sidebar-width)",
          }}
        >
          <p>{title}</p>
        </div>
      </div>
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))`,
        }}
      >
        {Array.from({ length: columns }).map((_, index) => {
          const uniqueKey = `${id}-header-${index}`;
          return (
            <div
              className="shrink-0 border-border/50 border-b py-1 text-center text-xs"
              key={uniqueKey}
            >
              {renderHeaderItem(index)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DailyHeader: FC = () => {
  const gantt = useContext(GanttContext);

  return gantt.timelineData.map((year) =>
    year.quarters
      .flatMap((quarter) => quarter.months)
      .map((monthData, index) => (
        <div className="relative flex flex-col" key={`${year.year}-${index}`}>
          <GanttContentHeader
            columns={monthData.days}
            renderHeaderItem={(item: number) => (
              <div className="flex items-center justify-center gap-1">
                <p>
                  {format(addDays(new Date(year.year, index, 1), item), "d")}
                </p>
                <p className="text-muted-foreground">
                  {format(
                    addDays(new Date(year.year, index, 1), item),
                    "EEEEE"
                  )}
                </p>
              </div>
            )}
            title={format(new Date(year.year, index, 1), "MMMM yyyy")}
          />
          <GanttColumns
            columns={monthData.days}
            isColumnSecondary={(item: number) =>
              [0, 6].includes(
                addDays(new Date(year.year, index, 1), item).getDay()
              )
            }
          />
        </div>
      ))
  );
};

const MonthlyHeader: FC = () => {
  const gantt = useContext(GanttContext);

  return gantt.timelineData.map((year) => (
    <div className="relative flex flex-col" key={year.year}>
      <GanttContentHeader
        columns={year.quarters.flatMap((quarter) => quarter.months).length}
        renderHeaderItem={(item: number) => (
          <p>{format(new Date(year.year, item, 1), "MMM")}</p>
        )}
        title={`${year.year}`}
      />
      <GanttColumns
        columns={year.quarters.flatMap((quarter) => quarter.months).length}
      />
    </div>
  ));
};

const QuarterlyHeader: FC = () => {
  const gantt = useContext(GanttContext);

  return gantt.timelineData.map((year) =>
    year.quarters.map((quarter, quarterIndex) => (
      <div
        className="relative flex flex-col"
        key={`${year.year}-${quarterIndex}`}
      >
        <GanttContentHeader
          columns={quarter.months.length}
          renderHeaderItem={(item: number) => (
            <p>
              {format(new Date(year.year, quarterIndex * 3 + item, 1), "MMM")}
            </p>
          )}
          title={`Q${quarterIndex + 1} ${year.year}`}
        />
        <GanttColumns columns={quarter.months.length} />
      </div>
    ))
  );
};

const headers: Record<Range, FC> = {
  daily: DailyHeader,
  monthly: MonthlyHeader,
  quarterly: QuarterlyHeader,
};

export type GanttHeaderProps = {
  className?: string;
};

export const GanttHeader: FC<GanttHeaderProps> = ({ className }) => {
  const gantt = useContext(GanttContext);
  const Header = headers[gantt.range];

  return (
    <div
      className={cn(
        "-space-x-px flex h-full w-max divide-x divide-border/50",
        className
      )}
    >
      <Header />
    </div>
  );
};

export type GanttSidebarItemProps = {
  feature: GanttFeature;
  onSelectItem?: (id: string) => void;
  className?: string;
};

export const GanttSidebarItem: FC<GanttSidebarItemProps> = ({
  feature,
  onSelectItem,
  className,
}) => {
  const gantt = useContext(GanttContext);
  const tempEndAt =
    feature.endAt && isSameDay(feature.startAt, feature.endAt)
      ? addDays(feature.endAt, 1)
      : feature.endAt;
  const duration = tempEndAt
    ? formatDistance(feature.startAt, tempEndAt)
    : `${formatDistance(feature.startAt, new Date())} so far`;

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (event.target === event.currentTarget) {
      // Scroll to the feature in the timeline
      gantt.scrollToFeature?.(feature);
      // Call the original onSelectItem callback
      onSelectItem?.(feature.id);
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === "Enter") {
      // Scroll to the feature in the timeline
      gantt.scrollToFeature?.(feature);
      // Call the original onSelectItem callback
      onSelectItem?.(feature.id);
    }
  };

  return (
    <button
      className={cn(
        "relative flex w-full items-center gap-2.5 p-2.5 text-left text-xs hover:bg-secondary",
        className
      )}
      key={feature.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        height: "var(--gantt-row-height)",
      }}
      type="button"
    >
      {/* <Checkbox onCheckedChange={handleCheck} className="shrink-0" /> */}
      <div
        className="pointer-events-none h-2 w-2 shrink-0 rounded-full"
        style={{
          backgroundColor: feature.status.color,
        }}
      />
      <p className="pointer-events-none flex-1 truncate text-left font-medium">
        {feature.name}
      </p>
      <p className="pointer-events-none text-muted-foreground">{duration}</p>
    </button>
  );
};

export const GanttSidebarHeader: FC = () => (
  <div
    className="sticky top-0 z-10 flex shrink-0 items-end justify-between gap-2.5 border-border/50 border-b bg-backdrop/90 p-2.5 font-medium text-muted-foreground text-xs backdrop-blur-sm"
    style={{ height: "var(--gantt-header-height)" }}
  >
    {/* <Checkbox className="shrink-0" /> */}
    <p className="flex-1 truncate text-left">Issues</p>
    <p className="shrink-0">Duration</p>
  </div>
);

export type GanttSidebarGroupProps = {
  children: ReactNode;
  name: string;
  className?: string;
};

export const GanttSidebarGroup: FC<GanttSidebarGroupProps> = ({
  children,
  name,
  className,
}) => (
  <div className={className}>
    <p
      className="w-full truncate p-2.5 text-left font-medium text-muted-foreground text-xs"
      style={{ height: "var(--gantt-row-height)" }}
    >
      {name}
    </p>
    <div className="divide-y divide-border/50">{children}</div>
  </div>
);

export type GanttSidebarProps = {
  children: ReactNode;
  className?: string;
};

export const GanttSidebar: FC<GanttSidebarProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "sticky left-0 z-30 h-max min-h-full overflow-clip border-border/50 border-r bg-background/90 backdrop-blur-md",
      className
    )}
    data-roadmap-ui="gantt-sidebar"
  >
    <GanttSidebarHeader />
    <div>{children}</div>
  </div>
);

export type GanttAddFeatureHelperProps = {
  top: number;
  className?: string;
};

export const GanttAddFeatureHelper: FC<GanttAddFeatureHelperProps> = ({
  top,
  className,
}) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useContext(GanttContext);
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();

  const handleClick = () => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x =
      mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const currentDate = getDateByMousePosition(gantt, x);

    gantt.onAddItem?.(currentDate);
  };

  return (
    <div
      className={cn("absolute top-0 w-full px-0.5", className)}
      ref={mouseRef}
      style={{
        marginTop: -gantt.rowHeight / 2,
        transform: `translateY(${top}px)`,
      }}
    >
      <button
        className="flex h-full w-full items-center justify-center rounded-md border border-dashed p-2"
        onClick={handleClick}
        type="button"
      >
        <PlusIcon
          className="pointer-events-none select-none text-muted-foreground"
          size={16}
        />
      </button>
    </div>
  );
};

export type GanttColumnProps = {
  index: number;
  isColumnSecondary?: (item: number) => boolean;
};

export const GanttColumn: FC<GanttColumnProps> = ({
  index,
  isColumnSecondary,
}) => {
  const gantt = useContext(GanttContext);
  const [dragging] = useGanttDragging();
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [hovering, setHovering] = useState(false);
  const [windowScroll] = useWindowScroll();

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => setHovering(false);

  const top = useThrottle(
    mousePosition.y -
      (mouseRef.current?.getBoundingClientRect().y ?? 0) -
      (windowScroll.y ?? 0),
    10
  );

  return (
    // biome-ignore lint: Mouse events are for hover detection only, not user interaction
    <div
      className={cn(
        "group relative h-full overflow-hidden",
        isColumnSecondary?.(index) ? "bg-secondary" : ""
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={mouseRef}
    >
      {!dragging && hovering && gantt.onAddItem ? (
        <GanttAddFeatureHelper top={top} />
      ) : null}
    </div>
  );
};

export type GanttColumnsProps = {
  columns: number;
  isColumnSecondary?: (item: number) => boolean;
};

export const GanttColumns: FC<GanttColumnsProps> = ({
  columns,
  isColumnSecondary,
}) => {
  const id = useId();

  return (
    <div
      className="divide grid h-full w-full divide-x divide-border/50"
      style={{
        gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))`,
      }}
    >
      {Array.from({ length: columns }).map((_, index) => {
        const uniqueKey = `${id}-column-${index}`;
        return (
          <GanttColumn
            index={index}
            isColumnSecondary={isColumnSecondary}
            key={uniqueKey}
          />
        );
      })}
    </div>
  );
};

export type GanttCreateMarkerTriggerProps = {
  onCreateMarker: (date: Date) => void;
  className?: string;
};

export const GanttCreateMarkerTrigger: FC<GanttCreateMarkerTriggerProps> = ({
  onCreateMarker,
  className,
}) => {
  const gantt = useContext(GanttContext);
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [windowScroll] = useWindowScroll();
  const x = useThrottle(
    mousePosition.x -
      (mouseRef.current?.getBoundingClientRect().x ?? 0) -
      (windowScroll.x ?? 0),
    10
  );

  const date = getDateByMousePosition(gantt, x);

  const handleClick = () => onCreateMarker(date);

  return (
    <div
      className={cn(
        "group pointer-events-none absolute top-0 left-0 h-full w-full select-none overflow-visible",
        className
      )}
      ref={mouseRef}
    >
      <div
        className="-ml-2 pointer-events-auto sticky top-6 z-20 flex w-4 flex-col items-center justify-center gap-1 overflow-visible opacity-0 group-hover:opacity-100"
        style={{ transform: `translateX(${x}px)` }}
      >
        <button
          className="z-50 inline-flex h-4 w-4 items-center justify-center rounded-full bg-card"
          onClick={handleClick}
          type="button"
        >
          <PlusIcon className="text-muted-foreground" size={12} />
        </button>
        <div className="whitespace-nowrap rounded-full border border-border/50 bg-background/90 px-2 py-1 text-foreground text-xs backdrop-blur-lg">
          {formatDate(date, "MMM dd, yyyy")}
        </div>
      </div>
    </div>
  );
};

export type GanttFeatureDragHelperProps = {
  featureId: GanttFeature["id"];
  direction: "left" | "right";
  date: Date | null;
};

export const GanttFeatureDragHelper: FC<GanttFeatureDragHelperProps> = ({
  direction,
  featureId,
  date,
}) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `feature-drag-helper-${featureId}`,
  });

  const isPressed = Boolean(attributes["aria-pressed"]);

  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);

  const pressedLeftClass = isPressed && direction === "left" ? "left-0" : "";
  const pressedRightClass = isPressed && direction === "right" ? "right-0" : "";
  const pressedPositionClass = pressedLeftClass || pressedRightClass;

  return (
    <div
      className={cn(
        "group -translate-y-1/2 absolute top-1/2 z-3 h-full w-6 cursor-col-resize rounded-md outline-none",
        direction === "left" ? "-left-2.5" : "-right-2.5"
      )}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
    >
      <div
        className={cn(
          "-translate-y-1/2 absolute top-1/2 h-[80%] w-1 rounded-sm bg-muted-foreground opacity-0 transition-all",
          direction === "left" ? "left-2.5" : "right-2.5",
          direction === "left" ? "group-hover:left-0" : "group-hover:right-0",
          pressedPositionClass,
          "group-hover:opacity-100",
          isPressed ? "opacity-100" : ""
        )}
      />
      {date ? (
        <div
          className={cn(
            "-translate-x-1/2 absolute top-10 whitespace-nowrap rounded-lg border border-border/50 bg-background/90 px-2 py-1 text-foreground text-xs backdrop-blur-lg",
            isPressed ? "block" : "hidden group-hover:block"
          )}
        >
          {format(date, "MMM dd, yyyy")}
        </div>
      ) : null}
    </div>
  );
};

export type GanttFeatureItemCardProps = Pick<GanttFeature, "id"> & {
  children?: ReactNode;
};

export const GanttFeatureItemCard: FC<GanttFeatureItemCardProps> = ({
  id,
  children,
}) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  const isPressed = Boolean(attributes["aria-pressed"]);

  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);

  return (
    <Card className="h-full w-full rounded-md bg-background p-2 text-xs shadow-sm">
      <div
        className={cn(
          "flex h-full w-full items-center justify-between gap-2 text-left",
          isPressed ? "cursor-grabbing" : ""
        )}
        {...attributes}
        {...listeners}
        ref={setNodeRef}
      >
        {children}
      </div>
    </Card>
  );
};

export type GanttFeatureItemProps = GanttFeature & {
  onMove?: (id: string, startDate: Date, endDate: Date | null) => void;
  children?: ReactNode;
  className?: string;
};

export const GanttFeatureItem: FC<GanttFeatureItemProps> = ({
  onMove,
  children,
  className,
  ...feature
}) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useContext(GanttContext);
  const [, setFeaturePositions] = useFeaturePositions();
  const itemRef = useRef<HTMLDivElement>(null);
  const timelineStartDate = useMemo(
    () => new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1),
    [gantt.timelineData]
  );
  const [startAt, setStartAt] = useState<Date>(feature.startAt);
  const [endAt, setEndAt] = useState<Date | null>(feature.endAt);

  // Memoize expensive calculations
  const width = useMemo(
    () => getWidth(startAt, endAt, gantt),
    [startAt, endAt, gantt]
  );
  const offset = useMemo(
    () => getOffset(startAt, timelineStartDate, gantt),
    [startAt, timelineStartDate, gantt]
  );

  const addRange = useMemo(() => getAddRange(gantt.range), [gantt.range]);
  const [mousePosition] = useMouse<HTMLDivElement>();

  const [previousMouseX, setPreviousMouseX] = useState(0);
  const [previousStartAt, setPreviousStartAt] = useState(startAt);
  const [previousEndAt, setPreviousEndAt] = useState(endAt);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const handleItemDragStart = useCallback(() => {
    setPreviousMouseX(mousePosition.x);
    setPreviousStartAt(startAt);
    setPreviousEndAt(endAt);
  }, [mousePosition.x, startAt, endAt]);

  const handleItemDragMove = useCallback(() => {
    const currentDate = getDateByMousePosition(gantt, mousePosition.x);
    const originalDate = getDateByMousePosition(gantt, previousMouseX);
    const delta =
      gantt.range === "daily"
        ? getDifferenceIn(gantt.range)(currentDate, originalDate)
        : getInnerDifferenceIn(gantt.range)(currentDate, originalDate);
    const newStartDate = addDays(previousStartAt, delta);
    const newEndDate = previousEndAt ? addDays(previousEndAt, delta) : null;

    setStartAt(newStartDate);
    setEndAt(newEndDate);
  }, [gantt, mousePosition.x, previousMouseX, previousStartAt, previousEndAt]);

  const onDragEnd = useCallback(
    () => onMove?.(feature.id, startAt, endAt),
    [onMove, feature.id, startAt, endAt]
  );

  const handleLeftDragMove = useCallback(() => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x =
      mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const newStartAt = getDateByMousePosition(gantt, x);

    setStartAt(newStartAt);
  }, [gantt, mousePosition.x, scrollX]);

  const handleRightDragMove = useCallback(() => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x =
      mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const newEndAt = getDateByMousePosition(gantt, x);

    setEndAt(newEndAt);
  }, [gantt, mousePosition.x, scrollX]);

  // Register feature position for dependency arrows
  useEffect(() => {
    const updatePosition = () => {
      if (!(itemRef.current && gantt.ref?.current)) {
        return;
      }

      const itemRect = itemRef.current.getBoundingClientRect();
      const containerRect = gantt.ref.current.getBoundingClientRect();

      // Calculate position relative to the timeline container
      const relativeTop = itemRect.top - containerRect.top - gantt.headerHeight;

      setFeaturePositions((prev) => {
        const next = new Map(prev);
        next.set(feature.id, {
          id: feature.id,
          left: Math.round(offset),
          width: Math.round(width),
          top: relativeTop,
          height: gantt.rowHeight,
        });
        return next;
      });
    };

    updatePosition();

    return () => {
      setFeaturePositions((prev) => {
        const next = new Map(prev);
        next.delete(feature.id);
        return next;
      });
    };
  }, [
    feature.id,
    offset,
    width,
    gantt.ref,
    gantt.headerHeight,
    gantt.rowHeight,
    setFeaturePositions,
  ]);

  return (
    <div
      className={cn("relative flex w-max min-w-full py-0.5", className)}
      ref={itemRef}
      style={{ height: "var(--gantt-row-height)" }}
    >
      <div
        className="pointer-events-auto absolute top-0.5 z-20"
        style={{
          height: "calc(var(--gantt-row-height) - 4px)",
          width: Math.round(width),
          left: Math.round(offset),
        }}
      >
        {onMove ? (
          <DndContext
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={onDragEnd}
            onDragMove={handleLeftDragMove}
            sensors={[mouseSensor]}
          >
            <GanttFeatureDragHelper
              date={startAt}
              direction="left"
              featureId={feature.id}
            />
          </DndContext>
        ) : null}
        <DndContext
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={onDragEnd}
          onDragMove={handleItemDragMove}
          onDragStart={handleItemDragStart}
          sensors={[mouseSensor]}
        >
          <GanttFeatureItemCard id={feature.id}>
            {children ?? (
              <p className="flex-1 truncate text-xs">{feature.name}</p>
            )}
          </GanttFeatureItemCard>
        </DndContext>
        {onMove ? (
          <DndContext
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={onDragEnd}
            onDragMove={handleRightDragMove}
            sensors={[mouseSensor]}
          >
            <GanttFeatureDragHelper
              date={endAt ?? addRange(startAt, 2)}
              direction="right"
              featureId={feature.id}
            />
          </DndContext>
        ) : null}
      </div>
    </div>
  );
};

export type GanttFeatureListGroupProps = {
  children: ReactNode;
  className?: string;
};

export const GanttFeatureListGroup: FC<GanttFeatureListGroupProps> = ({
  children,
  className,
}) => (
  <div className={className} style={{ paddingTop: "var(--gantt-row-height)" }}>
    {children}
  </div>
);

export type GanttFeatureRowProps = {
  features: GanttFeature[];
  onMove?: (id: string, startAt: Date, endAt: Date | null) => void;
  children?: (feature: GanttFeature) => ReactNode;
  className?: string;
};

export const GanttFeatureRow: FC<GanttFeatureRowProps> = ({
  features,
  onMove,
  children,
  className,
}) => {
  // Sort features by start date to handle potential overlaps
  const sortedFeatures = [...features].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime()
  );

  // Calculate sub-row positions for overlapping features using a proper algorithm
  const featureWithPositions: Array<GanttFeature & { subRow: number }> = [];
  const subRowEndTimes: Date[] = []; // Track when each sub-row becomes free

  for (const feature of sortedFeatures) {
    let subRow = 0;

    // Find the first sub-row that's free (doesn't overlap)
    while (
      subRow < subRowEndTimes.length &&
      subRowEndTimes[subRow] > feature.startAt
    ) {
      subRow += 1;
    }

    // Update the end time for this sub-row
    if (subRow === subRowEndTimes.length) {
      subRowEndTimes.push(feature.endAt);
    } else {
      subRowEndTimes[subRow] = feature.endAt;
    }

    featureWithPositions.push({ ...feature, subRow });
  }

  const maxSubRows = Math.max(1, subRowEndTimes.length);
  const subRowHeight = 36; // Base row height

  return (
    <div
      className={cn("relative", className)}
      style={{
        height: `${maxSubRows * subRowHeight}px`,
        minHeight: "var(--gantt-row-height)",
      }}
    >
      {featureWithPositions.map((feature) => (
        <div
          className="absolute w-full"
          key={feature.id}
          style={{
            top: `${feature.subRow * subRowHeight}px`,
            height: `${subRowHeight}px`,
          }}
        >
          <GanttFeatureItem {...feature} onMove={onMove}>
            {children ? (
              children(feature)
            ) : (
              <p className="flex-1 truncate text-xs">{feature.name}</p>
            )}
          </GanttFeatureItem>
        </div>
      ))}
    </div>
  );
};

export type GanttFeatureListProps = {
  className?: string;
  children: ReactNode;
};

export const GanttFeatureList: FC<GanttFeatureListProps> = ({
  className,
  children,
}) => (
  <div
    className={cn("absolute top-0 left-0 h-full w-max", className)}
    style={{ marginTop: "var(--gantt-header-height)" }}
  >
    {children}
  </div>
);

export const GanttMarker: FC<
  GanttMarkerProps & {
    onRemove?: (id: string) => void;
    className?: string;
  }
> = memo(({ label, date, id, onRemove, className }) => {
  const gantt = useContext(GanttContext);
  const differenceIn = useMemo(
    () => getDifferenceIn(gantt.range),
    [gantt.range]
  );
  const timelineStartDate = useMemo(
    () => new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1),
    [gantt.timelineData]
  );

  // Memoize expensive calculations
  const offset = useMemo(
    () => differenceIn(date, timelineStartDate),
    [differenceIn, date, timelineStartDate]
  );
  const innerOffset = useMemo(
    () =>
      calculateInnerOffset(
        date,
        gantt.range,
        (gantt.columnWidth * gantt.zoom) / 100
      ),
    [date, gantt.range, gantt.columnWidth, gantt.zoom]
  );

  const handleRemove = useCallback(() => onRemove?.(id), [onRemove, id]);

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
      style={{
        width: 0,
        transform: `translateX(calc(var(--gantt-column-width) * ${offset} + ${innerOffset}px))`,
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <div
              className={cn(
                "group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-card px-2 py-1 text-foreground text-xs",
                className
              )}
            />
          }
        >
          {label}
          <span className="max-h-0 overflow-hidden opacity-80 transition-all group-hover:max-h-8">
            {formatDate(date, "MMM dd, yyyy")}
          </span>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onRemove ? (
            <ContextMenuItem
              className="flex items-center gap-2 text-destructive"
              onClick={handleRemove}
            >
              <TrashIcon size={16} />
              Remove marker
            </ContextMenuItem>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      <div className={cn("h-full w-px bg-card", className)} />
    </div>
  );
});

GanttMarker.displayName = "GanttMarker";

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

  if (range === "monthly") {
    columnWidth = 150;
  } else if (range === "quarterly") {
    columnWidth = 100;
  }

  // Memoize CSS variables to prevent unnecessary re-renders
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

  // Update sidebar width when DOM is ready
  useEffect(() => {
    const updateSidebarWidth = () => {
      const sidebarElement = scrollRef.current?.querySelector(
        '[data-roadmap-ui="gantt-sidebar"]'
      );
      const newWidth = sidebarElement ? 300 : 0;
      setSidebarWidth(newWidth);
    };

    // Update immediately
    updateSidebarWidth();

    // Also update on resize or when children change
    const observer = new MutationObserver(updateSidebarWidth);
    if (scrollRef.current) {
      observer.observe(scrollRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Fix the useCallback to include all dependencies
  const handleScroll = useCallback(
    throttle(() => {
      const scrollElement = scrollRef.current;
      if (!scrollElement) {
        return;
      }

      const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
      setScrollX(scrollLeft);

      if (scrollLeft === 0) {
        // Extend timelineData to the past
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

        // Scroll a bit forward so it's not at the very start
        scrollElement.scrollLeft = scrollElement.clientWidth;
        setScrollX(scrollElement.scrollLeft);
      } else if (scrollLeft + clientWidth >= scrollWidth) {
        // Extend timelineData to the future
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

        // Scroll a bit back so it's not at the very end
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
      // Fix memory leak by properly referencing the scroll element
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

      // Calculate timeline start date from timelineData
      const timelineStartDate = new Date(timelineData[0].year, 0, 1);

      // Calculate the horizontal offset for the feature's start date
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

      // Scroll to align the feature's start with the right side of the sidebar
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

export type GanttTimelineProps = {
  children: ReactNode;
  className?: string;
};

export const GanttTimeline: FC<GanttTimelineProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "relative flex h-full w-max flex-none overflow-clip",
      className
    )}
  >
    {children}
  </div>
);

export type GanttTodayProps = {
  className?: string;
};

export const GanttToday: FC<GanttTodayProps> = ({ className }) => {
  const label = "Today";
  const date = useMemo(() => new Date(), []);
  const gantt = useContext(GanttContext);
  const differenceIn = useMemo(
    () => getDifferenceIn(gantt.range),
    [gantt.range]
  );
  const timelineStartDate = useMemo(
    () => new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1),
    [gantt.timelineData]
  );

  // Memoize expensive calculations
  const offset = useMemo(
    () => differenceIn(date, timelineStartDate),
    [differenceIn, date, timelineStartDate]
  );
  const innerOffset = useMemo(
    () =>
      calculateInnerOffset(
        date,
        gantt.range,
        (gantt.columnWidth * gantt.zoom) / 100
      ),
    [date, gantt.range, gantt.columnWidth, gantt.zoom]
  );

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
      style={{
        width: 0,
        transform: `translateX(calc(var(--gantt-column-width) * ${offset} + ${innerOffset}px))`,
      }}
    >
      <div
        className={cn(
          "group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-card px-2 py-1 text-foreground text-xs",
          className
        )}
      >
        {label}
        <span className="max-h-0 overflow-hidden opacity-80 transition-all group-hover:max-h-8">
          {formatDate(date, "MMM dd, yyyy")}
        </span>
      </div>
      <div className={cn("h-full w-px bg-card", className)} />
    </div>
  );
};

// Dependency Arrow Components
type GanttDependencyArrowProps = {
  path: string;
  color: string;
  strokeWidth: number;
  markerId: string;
};

const GanttDependencyArrow: FC<GanttDependencyArrowProps> = memo(
  ({ path, color, strokeWidth, markerId }) => (
    <path
      className="transition-all duration-150"
      d={path}
      fill="none"
      markerEnd={`url(#${markerId})`}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  )
);

GanttDependencyArrow.displayName = "GanttDependencyArrow";

export type GanttDependencyLayerProps = {
  dependencies: GanttDependency[];
  className?: string;
  defaultColor?: string;
  strokeWidth?: number;
  arrowSize?: number;
};

export const GanttDependencyLayer: FC<GanttDependencyLayerProps> = ({
  dependencies,
  className,
  defaultColor = "#94a3b8",
  strokeWidth = 2,
  arrowSize = 6,
}) => {
  const [featurePositions] = useFeaturePositions();
  const markerId = useId();

  // Convert feature positions to obstacles with margin for collision detection
  const allObstacles = useMemo(() => {
    const margin = 4;
    return Array.from(featurePositions.values()).map((pos) => ({
      id: pos.id,
      left: pos.left - margin,
      top: pos.top - margin,
      right: pos.left + pos.width + margin,
      bottom: pos.top + pos.height + margin,
    }));
  }, [featurePositions]);

  // Calculate arrow paths for all dependencies
  const calculatedDependencies = useMemo(() => {
    return dependencies
      .map((dep) => {
        const endpoints = calculateDependencyEndpoints(dep, featurePositions);
        if (!endpoints) {
          return null;
        }

        // Filter out source and target from obstacles
        const obstacles = allObstacles.filter(
          (obs) => obs.id !== dep.sourceId && obs.id !== dep.targetId
        );

        // Calculate path with collision avoidance
        const path = calculateDependencyPath({
          source: endpoints.source,
          target: endpoints.target,
          targetFromRight: endpoints.targetFromRight,
          obstacles,
        });

        return {
          id: dep.id,
          path,
          color: dep.color ?? defaultColor,
        };
      })
      .filter(
        (
          d
        ): d is {
          id: string;
          path: string;
          color: string;
        } => d !== null
      );
  }, [dependencies, featurePositions, defaultColor, allObstacles]);

  if (calculatedDependencies.length === 0) {
    return null;
  }

  return (
    <svg
      aria-label="Dependency arrows"
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-5 h-full w-full overflow-visible",
        className
      )}
      role="img"
      style={{ marginTop: "var(--gantt-header-height)" }}
    >
      <title>Dependency arrows between features</title>
      <defs>
        {/* Arrow marker - orient="auto" automatically rotates to match path direction */}
        <marker
          id={markerId}
          markerHeight={arrowSize}
          markerUnits="strokeWidth"
          markerWidth={arrowSize}
          orient="auto"
          refX={arrowSize - 1}
          refY={arrowSize / 2}
        >
          <path
            d={`M0,0 L0,${arrowSize} L${arrowSize},${arrowSize / 2} z`}
            fill={defaultColor}
          />
        </marker>
      </defs>

      {calculatedDependencies.map((dep) => (
        <GanttDependencyArrow
          color={dep.color}
          key={dep.id}
          markerId={markerId}
          path={dep.path}
          strokeWidth={strokeWidth}
        />
      ))}
    </svg>
  );
};
