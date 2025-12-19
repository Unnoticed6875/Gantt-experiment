import { addDays, differenceInDays, format, getDay } from "date-fns";
import type {
  ConstraintConfig,
  GanttDependency,
  GanttDependencyType,
  GanttFeature,
  HolidayConfig,
  SchedulingRule,
  SlackConfig,
} from "../types";

type FeatureUpdate = {
  id: string;
  startAt: Date;
  endAt: Date;
};

// Extended feature type for capacity checking (includes owner/group info)
type FeatureWithOwner = GanttFeature & {
  owner?: { id: string; name?: string };
  group?: { id: string; name?: string };
};

// Capacity warning result
export type CapacityWarning = {
  resourceId: string;
  resourceName: string;
  resourceType: "owner" | "group";
  maxConcurrent: number;
  actualConcurrent: number;
  overlappingFeatures: string[];
};

// Duration validation result
export type DurationValidation = {
  featureId: string;
  featureName: string;
  actualDays: number;
  minDays?: number;
  maxDays?: number;
  valid: boolean;
  message?: string;
};

// ============================================================================
// Scheduling Rules Helper Functions
// ============================================================================

/**
 * Check if a date is a holiday based on the enabled holiday rules.
 */
export function isHoliday(date: Date, rules: SchedulingRule[]): boolean {
  const holidayRules = rules.filter((r) => r.type === "holiday" && r.enabled);

  for (const rule of holidayRules) {
    const config = rule.config as HolidayConfig;

    // Check weekdays (e.g., weekends)
    if (config.weekdays?.includes(getDay(date))) {
      return true;
    }

    // Check specific dates
    if (config.dates) {
      const dateStr = format(date, "yyyy-MM-dd");
      if (config.dates.includes(dateStr)) {
        return true;
      }
    }

    // Check recurring yearly dates
    if (config.recurring && config.month && config.day) {
      const month = date.getMonth() + 1; // getMonth is 0-indexed
      const day = date.getDate();
      if (month === config.month && day === config.day) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Add working days to a date, skipping holidays and blackout periods.
 * If days is 0, returns the start date (possibly adjusted if it's non-working).
 */
export function addWorkingDays(
  startDate: Date,
  days: number,
  rules: SchedulingRule[]
): Date {
  const hasTimeOffRules = rules.some(
    (r) => (r.type === "holiday" || r.type === "blackout") && r.enabled
  );

  // If no time-off rules, use simple addDays
  if (!hasTimeOffRules) {
    return addDays(startDate, days);
  }

  let currentDate = new Date(startDate);
  let daysAdded = 0;

  // First, skip any non-working days at the start date
  while (isNonWorkingDay(currentDate, rules)) {
    currentDate = addDays(currentDate, 1);
  }

  // Then add the required number of working days
  while (daysAdded < days) {
    currentDate = addDays(currentDate, 1);
    if (!isNonWorkingDay(currentDate, rules)) {
      daysAdded += 1;
    }
  }

  return currentDate;
}

/**
 * Subtract working days from a date, skipping holidays and blackout periods.
 * Used for FF and SF dependency calculations where we need to go backwards.
 */
export function subtractWorkingDays(
  startDate: Date,
  days: number,
  rules: SchedulingRule[]
): Date {
  const hasTimeOffRules = rules.some(
    (r) => (r.type === "holiday" || r.type === "blackout") && r.enabled
  );

  // If no time-off rules, use simple addDays with negative value
  if (!hasTimeOffRules) {
    return addDays(startDate, -days);
  }

  let currentDate = new Date(startDate);
  let daysSubtracted = 0;

  // First, skip any non-working days at the start date (going backwards)
  while (isNonWorkingDay(currentDate, rules)) {
    currentDate = addDays(currentDate, -1);
  }

  // Then subtract the required number of working days
  while (daysSubtracted < days) {
    currentDate = addDays(currentDate, -1);
    if (!isNonWorkingDay(currentDate, rules)) {
      daysSubtracted += 1;
    }
  }

  return currentDate;
}

/**
 * Calculate working days between two dates (excluding holidays and blackouts).
 */
export function getWorkingDaysBetween(
  startDate: Date,
  endDate: Date,
  rules: SchedulingRule[]
): number {
  const hasTimeOffRules = rules.some(
    (r) => (r.type === "holiday" || r.type === "blackout") && r.enabled
  );

  // If no time-off rules, use simple differenceInDays
  if (!hasTimeOffRules) {
    return differenceInDays(endDate, startDate);
  }

  let workingDays = 0;
  let currentDate = new Date(startDate);

  while (currentDate < endDate) {
    if (!isNonWorkingDay(currentDate, rules)) {
      workingDays += 1;
    }
    currentDate = addDays(currentDate, 1);
  }

  return workingDays;
}

/**
 * Get total slack days from all enabled slack rules.
 * Optionally filter by dependency type and specific feature pairs.
 */
export function getTotalSlackDays(
  rules: SchedulingRule[],
  depType?: GanttDependencyType,
  sourceId?: string,
  targetId?: string
): number {
  return rules
    .filter((r) => r.type === "slack" && r.enabled)
    .reduce((total, rule) => {
      const config = rule.config as SlackConfig;

      // Check if this slack rule applies to the given dependency type
      if (
        depType &&
        config.dependencyTypes?.length &&
        !config.dependencyTypes.includes(depType)
      ) {
        return total;
      }

      // Check if this slack rule applies to specific feature pairs
      if (sourceId && targetId && config.betweenFeatures?.length) {
        const matches = config.betweenFeatures.some(
          (pair) => pair.sourceId === sourceId && pair.targetId === targetId
        );
        if (!matches) {
          return total;
        }
      }

      return total + (config.days || 0);
    }, 0);
}

/**
 * Check if a feature has a constraint that prevents its dates from changing.
 */
export function getFeatureConstraint(
  featureId: string,
  rules: SchedulingRule[]
): ConstraintConfig | null {
  for (const rule of rules) {
    if (rule.type !== "constraint" || !rule.enabled) {
      continue;
    }

    const config = rule.config as ConstraintConfig;

    // If no feature IDs specified, applies to all
    if (!config.featureIds?.length) {
      return config;
    }

    // Check if this feature is in the constraint list
    if (config.featureIds.includes(featureId)) {
      return config;
    }
  }

  return null;
}

// ============================================================================
// NEW RULE TYPE HELPERS
// ============================================================================

/**
 * Check if a date falls within a blackout period.
 * Blackout periods block all scheduling during specific date ranges.
 */
export function isBlackoutPeriod(date: Date, rules: SchedulingRule[]): boolean {
  const blackoutRules = rules.filter((r) => r.type === "blackout" && r.enabled);

  const dateStr = format(date, "yyyy-MM-dd");

  for (const rule of blackoutRules) {
    const config = rule.config as { startDate: string; endDate: string };
    if (dateStr >= config.startDate && dateStr <= config.endDate) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a date is non-working (holiday OR blackout).
 * Combined check for use in scheduling calculations.
 */
export function isNonWorkingDay(date: Date, rules: SchedulingRule[]): boolean {
  return isHoliday(date, rules) || isBlackoutPeriod(date, rules);
}

/**
 * Get lag days for a specific feature pair from lag rules.
 * Positive = delay, Negative = lead (overlap).
 */
export function getLagDays(
  sourceId: string,
  targetId: string,
  rules: SchedulingRule[]
): number {
  const lagRules = rules.filter((r) => r.type === "lag" && r.enabled);

  for (const rule of lagRules) {
    const config = rule.config as {
      days: number;
      sourceId: string;
      targetId: string;
    };
    if (config.sourceId === sourceId && config.targetId === targetId) {
      return config.days;
    }
  }

  return 0;
}

/**
 * Get the alignment day (weekday to start on) for a feature.
 * Returns the target weekday (0=Sunday, 1=Monday, etc.) or null if no alignment rule.
 */
export function getAlignmentDay(
  featureId: string,
  rules: SchedulingRule[]
): number | null {
  const alignmentRules = rules.filter(
    (r) => r.type === "alignment" && r.enabled
  );

  for (const rule of alignmentRules) {
    const config = rule.config as { startDay: number; featureIds?: string[] };

    // If no feature IDs specified, applies to all
    if (!config.featureIds?.length) {
      return config.startDay;
    }

    // Check if this feature is in the alignment list
    if (config.featureIds.includes(featureId)) {
      return config.startDay;
    }
  }

  return null;
}

/**
 * Align a date to the next occurrence of a specific weekday.
 * If the date is already on the target weekday, returns it unchanged.
 */
export function alignToWeekday(date: Date, targetWeekday: number): Date {
  const currentDay = getDay(date);
  if (currentDay === targetWeekday) {
    return date;
  }

  // Calculate days until next occurrence of target weekday
  const daysUntilTarget = (targetWeekday - currentDay + 7) % 7;
  return addDays(date, daysUntilTarget || 7); // If 0, go to next week
}

/**
 * Validate a feature's duration against duration rules.
 * Returns validation result with details.
 */
export function validateDuration(
  feature: GanttFeature,
  rules: SchedulingRule[]
): { valid: boolean; minDays?: number; maxDays?: number; message?: string } {
  const durationRules = rules.filter((r) => r.type === "duration" && r.enabled);

  const actualDays = differenceInDays(feature.endAt, feature.startAt);

  for (const rule of durationRules) {
    const config = rule.config as {
      minDays?: number;
      maxDays?: number;
      featureIds?: string[];
    };

    // Check if this rule applies to the feature
    if (config.featureIds?.length && !config.featureIds.includes(feature.id)) {
      continue;
    }

    // Check minimum duration
    if (config.minDays !== undefined && actualDays < config.minDays) {
      return {
        valid: false,
        minDays: config.minDays,
        message: `Duration ${actualDays} days is less than minimum ${config.minDays} days`,
      };
    }

    // Check maximum duration
    if (config.maxDays !== undefined && actualDays > config.maxDays) {
      return {
        valid: false,
        maxDays: config.maxDays,
        message: `Duration ${actualDays} days exceeds maximum ${config.maxDays} days`,
      };
    }
  }

  return { valid: true };
}

// Helper: Group features by a resource (owner or group)
function groupFeaturesByResource(
  features: FeatureWithOwner[],
  groupBy: "owner" | "group"
): Map<string, { name: string; features: FeatureWithOwner[] }> {
  const resourceGroups = new Map<
    string,
    { name: string; features: FeatureWithOwner[] }
  >();

  for (const feature of features) {
    const resource = groupBy === "owner" ? feature.owner : feature.group;
    if (!resource) {
      continue;
    }

    const existing = resourceGroups.get(resource.id) || {
      name: resource.name || resource.id,
      features: [],
    };
    existing.features.push(feature);
    resourceGroups.set(resource.id, existing);
  }

  return resourceGroups;
}

// Helper: Calculate maximum concurrent tasks for a set of features
function calculateMaxConcurrent(features: FeatureWithOwner[]): number {
  const events: { date: Date; delta: number }[] = [];
  for (const f of features) {
    events.push({ date: f.startAt, delta: 1 });
    events.push({ date: f.endAt, delta: -1 });
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  let concurrent = 0;
  let maxConcurrent = 0;
  for (const event of events) {
    concurrent += event.delta;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
  }

  return maxConcurrent;
}

// Helper: Check a single resource group for capacity violations
function checkResourceCapacity(params: {
  resourceId: string;
  resourceName: string;
  resourceFeatures: FeatureWithOwner[];
  maxAllowed: number;
  resourceType: "owner" | "group";
}): CapacityWarning | null {
  const maxConcurrent = calculateMaxConcurrent(params.resourceFeatures);

  if (maxConcurrent > params.maxAllowed) {
    return {
      resourceId: params.resourceId,
      resourceName: params.resourceName,
      resourceType: params.resourceType,
      maxConcurrent: params.maxAllowed,
      actualConcurrent: maxConcurrent,
      overlappingFeatures: params.resourceFeatures.map((f) => f.name),
    };
  }

  return null;
}

/**
 * Check for capacity violations across features.
 * Returns warnings for any resources exceeding their concurrent task limits.
 */
export function checkCapacity(
  features: FeatureWithOwner[],
  rules: SchedulingRule[]
): CapacityWarning[] {
  const capacityRules = rules.filter((r) => r.type === "capacity" && r.enabled);
  const warnings: CapacityWarning[] = [];

  for (const rule of capacityRules) {
    const config = rule.config as {
      maxConcurrent: number;
      groupBy: "owner" | "group";
    };

    const resourceGroups = groupFeaturesByResource(features, config.groupBy);

    for (const [
      resourceId,
      { name, features: resourceFeatures },
    ] of resourceGroups) {
      const warning = checkResourceCapacity({
        resourceId,
        resourceName: name,
        resourceFeatures,
        maxAllowed: config.maxConcurrent,
        resourceType: config.groupBy,
      });

      if (warning) {
        warnings.push(warning);
      }
    }
  }

  return warnings;
}

// Build dependency graph for efficient traversal
function buildDependencyGraph(
  dependencies: GanttDependency[]
): Map<string, GanttDependency[]> {
  const graph = new Map<string, GanttDependency[]>();
  for (const dep of dependencies) {
    const existing = graph.get(dep.sourceId) || [];
    existing.push(dep);
    graph.set(dep.sourceId, existing);
  }
  return graph;
}

// Calculate new dates for target feature based on dependency type
function calculateTargetDates(
  source: GanttFeature,
  target: GanttFeature,
  depType: GanttDependency["type"]
): { startAt: Date; endAt: Date } {
  const duration = differenceInDays(target.endAt, target.startAt);

  switch (depType) {
    case "FS": // Target starts when source finishes
      return {
        startAt: source.endAt,
        endAt: addDays(source.endAt, duration),
      };
    case "SS": // Target starts when source starts
      return {
        startAt: source.startAt,
        endAt: addDays(source.startAt, duration),
      };
    case "FF": // Target finishes when source finishes
      return {
        startAt: addDays(source.endAt, -duration),
        endAt: source.endAt,
      };
    case "SF": // Target finishes when source starts
      return {
        startAt: addDays(source.startAt, -duration),
        endAt: source.startAt,
      };
    default:
      throw new Error(`Unknown dependency type: ${depType satisfies never}`);
  }
}

// Update a feature with new dates and add to updates
function updateFeatureDates(
  feature: GanttFeature,
  newDates: { startAt: Date; endAt: Date },
  updates: FeatureUpdate[]
): void {
  feature.startAt = newDates.startAt;
  feature.endAt = newDates.endAt;
  updates.push({ id: feature.id, ...newDates });
}

// Process a single dependency and update target if needed
function processDependency(
  dep: GanttDependency,
  source: GanttFeature,
  target: GanttFeature,
  context: { updates: FeatureUpdate[]; queue: string[] }
): void {
  const calculatedDates = calculateTargetDates(source, target, dep.type);

  // Only update if dates actually changed
  if (
    target.startAt.getTime() !== calculatedDates.startAt.getTime() ||
    target.endAt.getTime() !== calculatedDates.endAt.getTime()
  ) {
    updateFeatureDates(target, calculatedDates, context.updates);
    context.queue.push(dep.targetId);
  }
}

/**
 * Auto-schedule dependent features when a feature is moved.
 * Uses BFS to propagate changes downstream through the dependency graph.
 *
 * @param movedFeatureId - ID of the feature that was moved
 * @param newDates - New start and end dates for the moved feature
 * @param features - Array of all features
 * @param dependencies - Array of all dependencies
 * @returns Array of feature updates to apply
 */
export function autoSchedule(
  movedFeatureId: string,
  newDates: { startAt: Date; endAt: Date },
  features: GanttFeature[],
  dependencies: GanttDependency[]
): FeatureUpdate[] {
  const updates: FeatureUpdate[] = [];
  const featuresMap = new Map(features.map((f) => [f.id, { ...f }]));
  const depGraph = buildDependencyGraph(dependencies);

  // Update the moved feature first
  const movedFeature = featuresMap.get(movedFeatureId);
  if (movedFeature) {
    updateFeatureDates(movedFeature, newDates, updates);
  }

  // BFS to propagate changes to all dependents
  const queue: string[] = [movedFeatureId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const source = featuresMap.get(currentId);
    const outgoingDeps = depGraph.get(currentId) || [];

    for (const dep of outgoingDeps) {
      const target = featuresMap.get(dep.targetId);
      if (source && target) {
        processDependency(dep, source, target, { updates, queue });
      }
    }
  }

  return updates;
}

// Build reverse dependency graph (target -> sources that depend on it)
function buildReverseDependencyGraph(
  dependencies: GanttDependency[]
): Map<string, GanttDependency[]> {
  const graph = new Map<string, GanttDependency[]>();
  for (const dep of dependencies) {
    const existing = graph.get(dep.targetId) || [];
    existing.push(dep);
    graph.set(dep.targetId, existing);
  }
  return graph;
}

// Topological sort to get processing order
function topologicalSort(
  features: GanttFeature[],
  dependencies: GanttDependency[]
): string[] {
  const depGraph = buildDependencyGraph(dependencies);
  const visited = new Set<string>();
  const result: string[] = [];

  // Find root features (those with no predecessors)
  const hasIncoming = new Set(dependencies.map((d) => d.targetId));
  const roots = features.filter((f) => !hasIncoming.has(f.id)).map((f) => f.id);

  // DFS from each root
  const visit = (id: string) => {
    if (visited.has(id)) {
      return;
    }
    visited.add(id);
    result.push(id);

    // Visit all features that depend on this one
    const outgoing = depGraph.get(id) || [];
    for (const dep of outgoing) {
      visit(dep.targetId);
    }
  };

  // Start from roots
  for (const root of roots) {
    visit(root);
  }

  // Add any remaining features (in case of cycles or disconnected)
  for (const feature of features) {
    if (!visited.has(feature.id)) {
      visit(feature.id);
    }
  }

  return result;
}

// Calculate constraint start date for a single dependency (with rules support)
function getConstraintStartWithRules(params: {
  source: GanttFeature;
  targetWorkingDays: number;
  depType: GanttDependency["type"];
  rules: SchedulingRule[];
  sourceId: string;
  targetId: string;
}): Date {
  const { source, targetWorkingDays, depType, rules, sourceId, targetId } =
    params;
  const slackDays = getTotalSlackDays(rules, depType, sourceId, targetId);

  switch (depType) {
    case "FS": {
      // Target starts when source finishes + slack
      const baseStart = addWorkingDays(source.endAt, slackDays, rules);
      return baseStart;
    }
    case "SS": {
      // Target starts when source starts + slack
      const baseStart = addWorkingDays(source.startAt, slackDays, rules);
      return baseStart;
    }
    case "FF": {
      // Target finishes when source finishes, so start = finish - duration
      // First find when source finishes + slack, then subtract working days for duration
      const targetEnd = addWorkingDays(source.endAt, slackDays, rules);
      return subtractWorkingDays(targetEnd, targetWorkingDays, rules);
    }
    case "SF": {
      // Target finishes when source starts
      const targetEnd = addWorkingDays(source.startAt, slackDays, rules);
      return subtractWorkingDays(targetEnd, targetWorkingDays, rules);
    }
    default:
      throw new Error(`Unknown dependency type: ${depType satisfies never}`);
  }
}

// Calculate constraint start date for a single dependency (legacy, no rules)
function getConstraintStart(
  source: GanttFeature,
  targetDuration: number,
  depType: GanttDependency["type"]
): Date {
  switch (depType) {
    case "FS":
      return source.endAt;
    case "SS":
      return source.startAt;
    case "FF":
      return addDays(source.endAt, -targetDuration);
    case "SF":
      return addDays(source.startAt, -targetDuration);
    default:
      throw new Error(`Unknown dependency type: ${depType satisfies never}`);
  }
}

// Find most restrictive constraint start from all dependencies (with rules)
function findConstraintStartWithRules(
  feature: GanttFeature,
  incomingDeps: GanttDependency[],
  featuresMap: Map<string, GanttFeature>,
  rules: SchedulingRule[]
): Date | null {
  const workingDays = getWorkingDaysBetween(
    feature.startAt,
    feature.endAt,
    rules
  );
  let constraintStart: Date | null = null;

  for (const dep of incomingDeps) {
    const source = featuresMap.get(dep.sourceId);
    if (!source) {
      continue;
    }

    // Calculate base constraint start
    let minStart = getConstraintStartWithRules({
      source,
      targetWorkingDays: workingDays,
      depType: dep.type,
      rules,
      sourceId: dep.sourceId,
      targetId: dep.targetId,
    });

    // Apply lag rules for this specific feature pair
    const lagDays = getLagDays(dep.sourceId, dep.targetId, rules);
    if (lagDays !== 0) {
      minStart = addWorkingDays(minStart, lagDays, rules);
    }

    if (!constraintStart || minStart > constraintStart) {
      constraintStart = minStart;
    }
  }

  return constraintStart;
}

// Find most restrictive constraint start from all dependencies (legacy)
function findConstraintStart(
  feature: GanttFeature,
  incomingDeps: GanttDependency[],
  featuresMap: Map<string, GanttFeature>
): Date | null {
  const duration = differenceInDays(feature.endAt, feature.startAt);
  let constraintStart: Date | null = null;

  for (const dep of incomingDeps) {
    const source = featuresMap.get(dep.sourceId);
    if (!source) {
      continue;
    }

    const minStart = getConstraintStart(source, duration, dep.type);

    if (!constraintStart || minStart > constraintStart) {
      constraintStart = minStart;
    }
  }

  return constraintStart;
}

// Apply constraint to feature and return update if changed (with rules)
function applyConstraintWithRules(
  feature: GanttFeature,
  constraintStart: Date,
  featureId: string,
  rules: SchedulingRule[]
): FeatureUpdate | null {
  const workingDays = getWorkingDaysBetween(
    feature.startAt,
    feature.endAt,
    rules
  );

  // Apply alignment rules - snap to specific weekday if configured
  let alignedStart = constraintStart;
  const alignmentDay = getAlignmentDay(featureId, rules);
  if (alignmentDay !== null) {
    alignedStart = alignToWeekday(constraintStart, alignmentDay);
  }

  const newEndAt = addWorkingDays(alignedStart, workingDays, rules);

  if (feature.startAt.getTime() !== alignedStart.getTime()) {
    feature.startAt = alignedStart;
    feature.endAt = newEndAt;
    return { id: featureId, startAt: alignedStart, endAt: newEndAt };
  }

  return null;
}

// Apply constraint to feature and return update if changed (legacy)
function applyConstraint(
  feature: GanttFeature,
  constraintStart: Date,
  featureId: string
): FeatureUpdate | null {
  const duration = differenceInDays(feature.endAt, feature.startAt);
  const newEndAt = addDays(constraintStart, duration);

  if (feature.startAt.getTime() !== constraintStart.getTime()) {
    feature.startAt = constraintStart;
    feature.endAt = newEndAt;
    return { id: featureId, startAt: constraintStart, endAt: newEndAt };
  }

  return null;
}

// Process a single feature for recalculation with rules
function processFeatureWithRules(
  featureId: string,
  featuresMap: Map<string, GanttFeature>,
  reverseGraph: Map<string, GanttDependency[]>,
  rules: SchedulingRule[]
): FeatureUpdate | null {
  const feature = featuresMap.get(featureId);
  if (!feature) {
    return null;
  }

  // Check if this feature has a constraint rule that prevents date changes
  const featureConstraint = getFeatureConstraint(featureId, rules);
  if (featureConstraint) {
    // fixed_both: neither date can move
    if (featureConstraint.constraintType === "fixed_both") {
      return null;
    }
    // fixed_start: start date can't move, so skip recalculation
    // (recalculation would move start based on dependencies)
    if (featureConstraint.constraintType === "fixed_start") {
      return null;
    }
    // fixed_end: end date can't move - we could potentially adjust start
    // but for simplicity, we skip recalculation for constrained features
    if (featureConstraint.constraintType === "fixed_end") {
      return null;
    }
  }

  const incomingDeps = reverseGraph.get(featureId) || [];
  if (incomingDeps.length === 0) {
    return null;
  }

  const constraintStart = findConstraintStartWithRules(
    feature,
    incomingDeps,
    featuresMap,
    rules
  );

  if (!constraintStart) {
    return null;
  }

  return applyConstraintWithRules(feature, constraintStart, featureId, rules);
}

// Process a single feature for recalculation without rules (legacy)
function processFeatureLegacy(
  featureId: string,
  featuresMap: Map<string, GanttFeature>,
  reverseGraph: Map<string, GanttDependency[]>
): FeatureUpdate | null {
  const feature = featuresMap.get(featureId);
  if (!feature) {
    return null;
  }

  const incomingDeps = reverseGraph.get(featureId) || [];
  if (incomingDeps.length === 0) {
    return null;
  }

  const constraintStart = findConstraintStart(
    feature,
    incomingDeps,
    featuresMap
  );

  if (!constraintStart) {
    return null;
  }

  return applyConstraint(feature, constraintStart, featureId);
}

/**
 * Recalculate the entire schedule based on dependencies and scheduling rules.
 * Processes features in topological order, adjusting dates based on predecessors.
 * Snaps all dependent features to start exactly when their predecessors allow.
 *
 * When rules are provided:
 * - Holiday rules cause dates to skip non-working days
 * - Slack rules add buffer time between dependent tasks
 *
 * @param features - Array of all features
 * @param dependencies - Array of all dependencies
 * @param rules - Optional array of scheduling rules (holidays, slack, etc.)
 * @returns Array of feature updates to apply
 */
export function recalculateSchedule(
  features: GanttFeature[],
  dependencies: GanttDependency[],
  rules: SchedulingRule[] = []
): FeatureUpdate[] {
  const updates: FeatureUpdate[] = [];
  const featuresMap = new Map(features.map((f) => [f.id, { ...f }]));
  const reverseGraph = buildReverseDependencyGraph(dependencies);
  const order = topologicalSort(features, dependencies);
  const enabledRules = rules.filter((r) => r.enabled);
  const useRules = enabledRules.length > 0;

  for (const featureId of order) {
    const update = useRules
      ? processFeatureWithRules(
          featureId,
          featuresMap,
          reverseGraph,
          enabledRules
        )
      : processFeatureLegacy(featureId, featuresMap, reverseGraph);

    if (update) {
      updates.push(update);
    }
  }

  return updates;
}
