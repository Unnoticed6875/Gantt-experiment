"use client";

import { format } from "date-fns";
import type {
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
} from "react";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useGantt } from "../context";
import {
  COLUMN_WIDTHS,
  type SidebarColumns,
  useSidebarColumns,
} from "../store";
import type { GanttDependency, GanttFeature } from "../types";

const getGridTemplateColumns = (columns: SidebarColumns): string => {
  const parts: string[] = [`minmax(${COLUMN_WIDTHS.name}px, 1fr)`];
  if (columns.status) {
    parts.push(`${COLUMN_WIDTHS.status}px`);
  }
  if (columns.start) {
    parts.push(`${COLUMN_WIDTHS.start}px`);
  }
  if (columns.end) {
    parts.push(`${COLUMN_WIDTHS.end}px`);
  }
  if (columns.deps) {
    parts.push(`${COLUMN_WIDTHS.deps}px`);
  }
  return parts.join(" ");
};

export const getSidebarWidth = (columns: SidebarColumns): number => {
  let width = COLUMN_WIDTHS.name;
  if (columns.status) {
    width += COLUMN_WIDTHS.status;
  }
  if (columns.start) {
    width += COLUMN_WIDTHS.start;
  }
  if (columns.end) {
    width += COLUMN_WIDTHS.end;
  }
  if (columns.deps) {
    width += COLUMN_WIDTHS.deps;
  }
  return width;
};

export type GanttSidebarItemProps = {
  feature: GanttFeature;
  onSelectItem?: (id: string) => void;
  className?: string;
  dependencies?: GanttDependency[];
};

export const GanttSidebarItem: FC<GanttSidebarItemProps> = ({
  feature,
  onSelectItem,
  className,
  dependencies = [],
}) => {
  const gantt = useGantt();
  const [columns] = useSidebarColumns();

  const depCount = dependencies.filter(
    (dep) => dep.sourceId === feature.id || dep.targetId === feature.id
  ).length;

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (event.target === event.currentTarget) {
      gantt.scrollToFeature?.(feature);
      onSelectItem?.(feature.id);
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === "Enter") {
      gantt.scrollToFeature?.(feature);
      onSelectItem?.(feature.id);
    }
  };

  return (
    <button
      className={cn(
        "relative grid w-full items-center text-left text-xs hover:bg-secondary",
        className
      )}
      key={feature.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        height: "var(--gantt-row-height)",
        gridTemplateColumns: getGridTemplateColumns(columns),
      }}
      type="button"
    >
      {/* Name column - always visible */}
      <div className="pointer-events-none flex items-center gap-2 truncate px-2.5">
        <div
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: feature.status.color }}
        />
        <span className="truncate font-medium">{feature.name}</span>
      </div>

      {/* Status column */}
      {columns.status ? (
        <div className="pointer-events-none truncate px-2 text-muted-foreground">
          {feature.status.name}
        </div>
      ) : null}

      {/* Start date column */}
      {columns.start ? (
        <div className="pointer-events-none truncate px-2 text-muted-foreground">
          {format(feature.startAt, "MMM d")}
        </div>
      ) : null}

      {/* End date column */}
      {columns.end ? (
        <div className="pointer-events-none truncate px-2 text-muted-foreground">
          {format(feature.endAt, "MMM d")}
        </div>
      ) : null}

      {/* Dependencies column */}
      {columns.deps ? (
        <div className="pointer-events-none truncate px-2 text-center text-muted-foreground">
          {depCount > 0 ? depCount : "-"}
        </div>
      ) : null}
    </button>
  );
};

export const GanttSidebarHeader: FC = () => {
  const [columns, setColumns] = useSidebarColumns();

  const toggleColumn = (column: keyof SidebarColumns) => {
    if (column === "name") {
      return;
    }
    setColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const headerContent = (
    <div
      className="sticky top-0 z-10 grid shrink-0 items-end border-border/50 border-b bg-backdrop/90 font-medium text-muted-foreground text-xs backdrop-blur-sm"
      style={{
        height: "var(--gantt-header-height)",
        gridTemplateColumns: getGridTemplateColumns(columns),
      }}
    >
      <div className="flex items-end px-2.5 pb-2">Name</div>
      {columns.status ? (
        <div className="flex items-end px-2 pb-2">Status</div>
      ) : null}
      {columns.start ? (
        <div className="flex items-end px-2 pb-2">Start</div>
      ) : null}
      {columns.end ? <div className="flex items-end px-2 pb-2">End</div> : null}
      {columns.deps ? (
        <div className="flex items-end justify-center px-2 pb-2">Deps</div>
      ) : null}
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>{headerContent}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuCheckboxItem checked disabled>
          Name
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem
          checked={columns.status}
          onCheckedChange={() => toggleColumn("status")}
        >
          Status
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem
          checked={columns.start}
          onCheckedChange={() => toggleColumn("start")}
        >
          Start Date
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem
          checked={columns.end}
          onCheckedChange={() => toggleColumn("end")}
        >
          End Date
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem
          checked={columns.deps}
          onCheckedChange={() => toggleColumn("deps")}
        >
          Dependencies
        </ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

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
      className="flex w-full items-center truncate px-2.5 text-left font-medium text-muted-foreground text-xs"
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
}) => {
  const [columns] = useSidebarColumns();
  const width = getSidebarWidth(columns);

  return (
    <div
      className={cn(
        "sticky left-0 z-30 h-max min-h-full overflow-clip border-border/50 border-r bg-background/90 backdrop-blur-md",
        className
      )}
      data-roadmap-ui="gantt-sidebar"
      style={{ width: `${width}px` }}
    >
      <GanttSidebarHeader />
      <div>{children}</div>
    </div>
  );
};
