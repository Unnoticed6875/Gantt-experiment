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

// Scheduling Rules types

// Holiday config: skip certain dates when scheduling
export type HolidayConfig = {
  // Specific dates (ISO format: "2025-12-25")
  dates?: string[];
  // Weekdays to skip (0=Sunday, 6=Saturday)
  weekdays?: number[];
  // Recurring yearly (month: 1-12, day: 1-31)
  month?: number;
  day?: number;
  recurring?: boolean;
};

// Slack config: add buffer between dependent tasks
export type SlackConfig = {
  days: number;
  // Optional: only apply to specific dependency types
  dependencyTypes?: GanttDependencyType[];
  // Optional: only apply between specific feature IDs
  betweenFeatures?: { sourceId: string; targetId: string }[];
};

// Constraint config: prevent certain dates from changing
export type ConstraintConfig = {
  // "fixed_end" = deadline never moves
  // "fixed_start" = start date never moves
  // "fixed_both" = neither date moves
  constraintType: "fixed_end" | "fixed_start" | "fixed_both";
  // Optional: only apply to specific feature IDs (if empty, applies to all)
  featureIds?: string[];
};

// Duration config: control min/max task duration
export type DurationConfig = {
  minDays?: number;
  maxDays?: number;
  // Optional: only apply to specific feature IDs
  featureIds?: string[];
};

// Blackout config: block scheduling during date ranges
export type BlackoutConfig = {
  startDate: string; // ISO date: "2025-12-20"
  endDate: string; // ISO date: "2026-01-02"
};

// Capacity config: limit concurrent tasks per owner/group (warn only)
export type CapacityConfig = {
  maxConcurrent: number;
  groupBy: "owner" | "group";
};

// Alignment config: force tasks to start on specific weekdays
export type AlignmentConfig = {
  startDay: number; // 0=Sunday, 1=Monday, etc.
  featureIds?: string[];
};

// Lag config: specific delay/overlap between linked tasks
export type LagConfig = {
  days: number; // Positive=lag (delay), Negative=lead (overlap)
  sourceId: string;
  targetId: string;
};

// All possible rule configs
export type SchedulingRuleConfig =
  | HolidayConfig
  | SlackConfig
  | ConstraintConfig
  | DurationConfig
  | BlackoutConfig
  | CapacityConfig
  | AlignmentConfig
  | LagConfig;

// Rule types
export type SchedulingRuleType =
  | "holiday"
  | "slack"
  | "constraint"
  | "duration"
  | "blackout"
  | "capacity"
  | "alignment"
  | "lag";

// Rule categories for UI organization
export type SchedulingRuleCategory =
  | "Time Off"
  | "Buffers"
  | "Constraints"
  | "Resources";

export const RULE_CATEGORIES: Record<
  SchedulingRuleCategory,
  SchedulingRuleType[]
> = {
  "Time Off": ["holiday", "blackout"],
  Buffers: ["slack", "lag"],
  Constraints: ["constraint", "duration", "alignment"],
  Resources: ["capacity"],
};

export type SchedulingRule = {
  id: string;
  type: SchedulingRuleType;
  name: string;
  config: SchedulingRuleConfig;
  enabled: boolean;
};
