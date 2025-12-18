"use client";

import { useMouse, useThrottle, useWindowScroll } from "@uidotdev/usehooks";
import { PlusIcon } from "lucide-react";
import type { FC } from "react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { useGantt } from "../context";
import { useGanttDragging, useGanttScrollX } from "../store";
import { getDateByMousePosition } from "../utils/timeline";

export type GanttAddFeatureHelperProps = {
  top: number;
  className?: string;
};

export const GanttAddFeatureHelper: FC<GanttAddFeatureHelperProps> = ({
  top,
  className,
}) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useGantt();
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
  const gantt = useGantt();
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
    // biome-ignore lint: Mouse events are for hover detection only
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
