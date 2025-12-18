import type {
  DependencyEndpoints,
  FeaturePosition,
  GanttDependency,
  Obstacle,
  PathParams,
  SafeHorizontalYParams,
  SafeVerticalXParams,
} from "../types";

export const horizontalLineIntersectsObstacle = (
  y: number,
  x1: number,
  x2: number,
  obstacle: Obstacle
): boolean => {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  if (y <= obstacle.top || y >= obstacle.bottom) {
    return false;
  }

  return !(maxX <= obstacle.left || minX >= obstacle.right);
};

export const verticalLineIntersectsObstacle = (
  x: number,
  y1: number,
  y2: number,
  obstacle: Obstacle
): boolean => {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (x <= obstacle.left || x >= obstacle.right) {
    return false;
  }

  return !(maxY <= obstacle.top || minY >= obstacle.bottom);
};

export const findSafeHorizontalY = ({
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

export const findSafeVerticalX = ({
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

export const calculateDependencyEndpoints = (
  dependency: GanttDependency,
  featurePositions: Map<string, FeaturePosition>
): DependencyEndpoints | null => {
  const sourcePos = featurePositions.get(dependency.sourceId);
  const targetPos = featurePositions.get(dependency.targetId);

  if (!(sourcePos && targetPos)) {
    return null;
  }

  const sourceVerticalCenter = sourcePos.top + sourcePos.height / 2;
  const targetVerticalCenter = targetPos.top + targetPos.height / 2;

  let sourceX: number;
  let targetX: number;
  let targetFromRight = false;

  switch (dependency.type) {
    case "FS":
      sourceX = sourcePos.left + sourcePos.width;
      targetX = targetPos.left;
      break;
    case "SS":
      sourceX = sourcePos.left;
      targetX = targetPos.left;
      break;
    case "FF":
      sourceX = sourcePos.left + sourcePos.width;
      targetX = targetPos.left + targetPos.width;
      targetFromRight = true;
      break;
    case "SF":
      sourceX = sourcePos.left;
      targetX = targetPos.left + targetPos.width;
      targetFromRight = true;
      break;
    default:
      sourceX = sourcePos.left + sourcePos.width;
      targetX = targetPos.left;
  }

  return {
    source: { x: sourceX, y: sourceVerticalCenter },
    target: { x: targetX, y: targetVerticalCenter },
    targetFromRight,
  };
};

export const calculateDependencyPath = ({
  source,
  target,
  targetFromRight,
}: PathParams): string => {
  const padding = 12;
  const dy = target.y - source.y;
  const dx = target.x - source.x;

  // Horizontal line (same row or very close)
  if (Math.abs(dy) < 5) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }

  if (targetFromRight) {
    // FF or SF dependencies - arrow enters from right side of target
    if (dx > 0) {
      // Source is to the left of target
      const exitX = Math.max(source.x + padding, target.x + padding);
      return (
        `M ${source.x} ${source.y} ` +
        `L ${exitX} ${source.y} ` +
        `L ${exitX} ${target.y} ` +
        `L ${target.x} ${target.y}`
      );
    }

    // Source is to the right of target - need to go around
    const exitX = source.x + padding;
    const entryX = target.x + padding;
    // Route through midpoint between source and target Y
    const midY = (source.y + target.y) / 2;

    return (
      `M ${source.x} ${source.y} ` +
      `L ${exitX} ${source.y} ` +
      `L ${exitX} ${midY} ` +
      `L ${entryX} ${midY} ` +
      `L ${entryX} ${target.y} ` +
      `L ${target.x} ${target.y}`
    );
  }

  // FS or SS dependencies - arrow enters from left side of target

  // Standard case: target is to the right with enough space
  // Use a simple 3-segment path: right, down/up, right
  if (dx > padding * 2) {
    // Calculate midpoint X between source and target for the vertical line
    const turnX = source.x + Math.min(padding, dx / 2);
    return (
      `M ${source.x} ${source.y} ` +
      `L ${turnX} ${source.y} ` +
      `L ${turnX} ${target.y} ` +
      `L ${target.x} ${target.y}`
    );
  }

  // Target is close to or left of source - need to route around
  // Go right from source, then route to target's left side
  const exitX = source.x + padding;
  const entryX = target.x - padding;

  // Route through midpoint Y to create a clean S-curve
  const midY = (source.y + target.y) / 2;

  return (
    `M ${source.x} ${source.y} ` +
    `L ${exitX} ${source.y} ` +
    `L ${exitX} ${midY} ` +
    `L ${entryX} ${midY} ` +
    `L ${entryX} ${target.y} ` +
    `L ${target.x} ${target.y}`
  );
};
