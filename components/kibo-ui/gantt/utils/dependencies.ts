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

type Point = { x: number; y: number };

const EPSILON = 0.001;

// Build a rounded polyline path from a series of points
const buildRoundedPath = (points: Point[], radius: number): string => {
  // Filter out consecutive duplicate points to avoid zero-length segments
  const filteredPoints = points.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.x - points[index - 1].x) > EPSILON ||
      Math.abs(point.y - points[index - 1].y) > EPSILON
  );

  if (filteredPoints.length < 2) {
    return "";
  }
  if (filteredPoints.length === 2) {
    return `M ${filteredPoints[0].x} ${filteredPoints[0].y} L ${filteredPoints[1].x} ${filteredPoints[1].y}`;
  }

  let path = `M ${filteredPoints[0].x} ${filteredPoints[0].y}`;

  for (let i = 1; i < filteredPoints.length - 1; i++) {
    const prev = filteredPoints[i - 1];
    const curr = filteredPoints[i];
    const next = filteredPoints[i + 1];

    // Direction vectors
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    // Segment lengths
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    // Skip rounding if segments are too short (avoid division by zero / NaN)
    if (len1 < EPSILON || len2 < EPSILON) {
      path += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Clamp radius to not exceed half of either segment
    const maxRadius = Math.min(len1 / 2, len2 / 2, radius);

    // Points where the curve starts and ends
    const startX = curr.x - (dx1 / len1) * maxRadius;
    const startY = curr.y - (dy1 / len1) * maxRadius;
    const endX = curr.x + (dx2 / len2) * maxRadius;
    const endY = curr.y + (dy2 / len2) * maxRadius;

    // Line to curve start, then quadratic bezier through corner to curve end
    path += ` L ${startX} ${startY} Q ${curr.x} ${curr.y} ${endX} ${endY}`;
  }

  // Line to the final point
  const last = filteredPoints.at(-1);
  if (last) {
    path += ` L ${last.x} ${last.y}`;
  }

  return path;
};

export const calculateDependencyPath = ({
  source,
  target,
  targetFromRight,
}: PathParams): string => {
  const padding = 12;
  const radius = 6;
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
      return buildRoundedPath(
        [
          { x: source.x, y: source.y },
          { x: exitX, y: source.y },
          { x: exitX, y: target.y },
          { x: target.x, y: target.y },
        ],
        radius
      );
    }

    // Source is to the right of target - need to go around
    const exitX = source.x + padding;
    const entryX = target.x + padding;
    const midY = (source.y + target.y) / 2;

    return buildRoundedPath(
      [
        { x: source.x, y: source.y },
        { x: exitX, y: source.y },
        { x: exitX, y: midY },
        { x: entryX, y: midY },
        { x: entryX, y: target.y },
        { x: target.x, y: target.y },
      ],
      radius
    );
  }

  // FS or SS dependencies - arrow enters from left side of target

  // Standard case: target is to the right with enough space
  if (dx > padding * 2) {
    const turnX = source.x + Math.min(padding, dx / 2);
    return buildRoundedPath(
      [
        { x: source.x, y: source.y },
        { x: turnX, y: source.y },
        { x: turnX, y: target.y },
        { x: target.x, y: target.y },
      ],
      radius
    );
  }

  // Target is close to or left of source - need to route around
  const exitX = source.x + padding;
  const entryX = target.x - padding;
  const midY = (source.y + target.y) / 2;

  return buildRoundedPath(
    [
      { x: source.x, y: source.y },
      { x: exitX, y: source.y },
      { x: exitX, y: midY },
      { x: entryX, y: midY },
      { x: entryX, y: target.y },
      { x: target.x, y: target.y },
    ],
    radius
  );
};
