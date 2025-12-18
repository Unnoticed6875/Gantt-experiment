import { addDays, differenceInDays } from "date-fns";
import type { GanttDependency, GanttFeature } from "../types";

type FeatureUpdate = {
  id: string;
  startAt: Date;
  endAt: Date;
};

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

// Calculate constraint start date for a single dependency
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

// Find most restrictive constraint start from all dependencies
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

// Apply constraint to feature and return update if changed
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

/**
 * Recalculate the entire schedule based on dependencies.
 * Processes features in topological order, adjusting dates based on predecessors.
 * Snaps all dependent features to start exactly when their predecessors allow.
 *
 * @param features - Array of all features
 * @param dependencies - Array of all dependencies
 * @returns Array of feature updates to apply
 */
export function recalculateSchedule(
  features: GanttFeature[],
  dependencies: GanttDependency[]
): FeatureUpdate[] {
  const updates: FeatureUpdate[] = [];
  const featuresMap = new Map(features.map((f) => [f.id, { ...f }]));
  const reverseGraph = buildReverseDependencyGraph(dependencies);
  const order = topologicalSort(features, dependencies);

  for (const featureId of order) {
    const feature = featuresMap.get(featureId);
    if (!feature) {
      continue;
    }

    const incomingDeps = reverseGraph.get(featureId) || [];
    if (incomingDeps.length === 0) {
      continue;
    }

    const constraintStart = findConstraintStart(
      feature,
      incomingDeps,
      featuresMap
    );

    if (constraintStart) {
      const update = applyConstraint(feature, constraintStart, featureId);
      if (update) {
        updates.push(update);
      }
    }
  }

  return updates;
}
