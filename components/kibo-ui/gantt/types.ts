import type { RefObject } from "react";

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
  lane?: string;
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

export type FeaturePosition = {
  id: string;
  left: number;
  width: number;
  top: number;
  height: number;
};

export type Range = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

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

// Dependency arrow types
export type ArrowEndpoint = {
  x: number;
  y: number;
};

export type Obstacle = {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type DependencyEndpoints = {
  source: ArrowEndpoint;
  target: ArrowEndpoint;
  targetFromRight: boolean;
};

export type SafeHorizontalYParams = {
  baseY: number;
  direction: "above" | "below";
  minX: number;
  maxX: number;
  obstacles: Obstacle[];
};

export type SafeVerticalXParams = {
  baseX: number;
  direction: "left" | "right";
  minY: number;
  maxY: number;
  obstacles: Obstacle[];
};

export type PathParams = {
  source: ArrowEndpoint;
  target: ArrowEndpoint;
  targetFromRight: boolean;
  obstacles?: Obstacle[];
};
