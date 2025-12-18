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
  obstacles,
}: PathParams): string => {
  const padding = 12;
  const dy = target.y - source.y;

  if (Math.abs(dy) < 5) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }

  if (targetFromRight) {
    const dx = target.x - source.x;

    if (dx > 0) {
      const baseExitX = target.x + padding;
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

    const exitX = source.x + padding;
    const entryX = target.x + padding;
    const baseY =
      dy > 0 ? Math.max(source.y, target.y) : Math.min(source.y, target.y);
    const direction = dy > 0 ? "below" : "above";

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

  const dx = target.x - source.x;

  if (dx > padding * 2) {
    const baseTurnX = source.x + padding;
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

  const exitX = source.x + padding;
  const entryX = target.x - padding;
  const baseY =
    dy > 0 ? Math.max(source.y, target.y) : Math.min(source.y, target.y);
  const direction = dy > 0 ? "below" : "above";

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
