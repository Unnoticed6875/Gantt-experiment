"use client";

import type { FC } from "react";
import { memo, useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useFeaturePositions } from "../store";
import type { FeaturePosition, GanttDependency } from "../types";
import {
  calculateDependencyEndpoints,
  calculateDependencyPath,
} from "../utils/dependencies";

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

  // Debounce position updates to avoid race conditions when multiple features update
  // Using 100ms to account for RAF delays in position calculations
  const [stablePositions, setStablePositions] = useState<
    Map<string, FeaturePosition>
  >(() => new Map());

  useEffect(() => {
    const timer = setTimeout(() => {
      setStablePositions(new Map(featurePositions));
    }, 100);
    return () => clearTimeout(timer);
  }, [featurePositions]);

  const allObstacles = useMemo(() => {
    const margin = 4;
    return Array.from(stablePositions.values()).map((pos) => ({
      id: pos.id,
      left: pos.left - margin,
      top: pos.top - margin,
      right: pos.left + pos.width + margin,
      bottom: pos.top + pos.height + margin,
    }));
  }, [stablePositions]);

  const calculatedDependencies = useMemo(
    () =>
      dependencies
        .map((dep) => {
          const endpoints = calculateDependencyEndpoints(dep, stablePositions);
          if (!endpoints) {
            return null;
          }

          const obstacles = allObstacles.filter(
            (obs) => obs.id !== dep.sourceId && obs.id !== dep.targetId
          );

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
        ),
    [dependencies, stablePositions, defaultColor, allObstacles]
  );

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
