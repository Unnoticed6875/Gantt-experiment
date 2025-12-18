"use client";

import { IconCalendarRepeat, IconMinus, IconPlus } from "@tabler/icons-react";
import groupBy from "lodash.groupby";
import { EyeIcon, LinkIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import {
  autoSchedule,
  GanttCreateMarkerTrigger,
  type GanttDependency,
  GanttDependencyLayer,
  GanttFeatureItem,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttHeader,
  GanttMarker,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
  type Range,
  recalculateSchedule,
} from "@/components/kibo-ui/gantt";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Dependency, FeatureWithRelations, Marker } from "@/lib/db/types";
import { batchUpdateFeatureDates, deleteFeature } from "../roadmap/actions";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

type GanttViewProps = {
  initialFeatures: FeatureWithRelations[];
  dependencies: Dependency[];
  markers: Marker[];
};

// Convert DB dependency to Gantt dependency type
function toGanttDependency(dep: Dependency): GanttDependency {
  return {
    id: dep.id,
    sourceId: dep.sourceId,
    targetId: dep.targetId,
    type: dep.type,
    color: dep.color ?? undefined,
  };
}

export function GanttView({
  initialFeatures,
  dependencies,
  markers,
}: GanttViewProps) {
  const ganttDependencies = dependencies.map(toGanttDependency);
  const [features, setFeatures] = useState(initialFeatures);
  const [range, setRange] = useState<Range>("monthly");
  const [zoom, setZoom] = useState(100);
  const groupedFeatures = groupBy(features, "group.name");
  const sortedGroupedFeatures = Object.fromEntries(
    Object.entries(groupedFeatures).sort(([nameA], [nameB]) =>
      nameA.localeCompare(nameB)
    )
  );

  // Flatten sorted features for index lookup
  const allSortedFeatures = Object.values(sortedGroupedFeatures).flat();

  const handleViewFeature = (id: string) =>
    console.log(`Feature selected: ${id}`);

  const handleCopyLink = (id: string) => console.log(`Copy link: ${id}`);

  const handleRemoveFeature = async (id: string) => {
    setFeatures((prev) => prev.filter((feature) => feature.id !== id));
    await deleteFeature(id);
  };

  const handleRemoveMarker = (id: string) =>
    console.log(`Remove marker: ${id}`);

  const handleCreateMarker = (date: Date) =>
    console.log(`Create marker: ${date.toISOString()}`);

  const handleMoveFeature = async (
    id: string,
    startAt: Date,
    endAt: Date | null
  ) => {
    if (!endAt) {
      return;
    }

    // Calculate all features that need to be rescheduled
    const updates = autoSchedule(
      id,
      { startAt, endAt },
      features,
      ganttDependencies
    );

    // Apply all updates locally
    setFeatures((prev) =>
      prev.map((feature) => {
        const update = updates.find((u) => u.id === feature.id);
        return update
          ? { ...feature, startAt: update.startAt, endAt: update.endAt }
          : feature;
      })
    );

    // Persist to database
    await batchUpdateFeatureDates(updates);

    console.log(`Auto-scheduled ${updates.length} feature(s)`);
  };

  const handleAddFeature = (date: Date) =>
    console.log(`Add feature: ${date.toISOString()}`);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));

  const handleRecalculateSchedule = async () => {
    const updates = recalculateSchedule(features, ganttDependencies);

    if (updates.length === 0) {
      console.log("Schedule is already up to date");
      return;
    }

    setFeatures((prev) =>
      prev.map((feature) => {
        const update = updates.find((u) => u.id === feature.id);
        return update
          ? { ...feature, startAt: update.startAt, endAt: update.endAt }
          : feature;
      })
    );

    // Persist to database
    await batchUpdateFeatureDates(updates);

    console.log(`Recalculated ${updates.length} feature(s)`);
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center gap-4 border-b p-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">View:</span>
          <select
            className="rounded border px-2 py-1 text-sm"
            onChange={(e) => setRange(e.target.value as Range)}
            value={range}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-sm">Zoom:</span>
          <button
            className="rounded border p-1 hover:bg-secondary"
            onClick={handleZoomOut}
            type="button"
          >
            <IconMinus size={16} />
          </button>
          <span className="min-w-12 text-center text-sm">{zoom}%</span>
          <button
            className="rounded border p-1 hover:bg-secondary"
            onClick={handleZoomIn}
            type="button"
          >
            <IconPlus size={16} />
          </button>
        </div>
        <button
          className="flex items-center gap-1.5 rounded border px-2 py-1 text-sm hover:bg-secondary"
          onClick={handleRecalculateSchedule}
          type="button"
        >
          <IconCalendarRepeat size={16} />
          Recalculate
        </button>
      </div>
      <GanttProvider
        className="flex-1 border"
        onAddItem={handleAddFeature}
        range={range}
        zoom={zoom}
      >
        <GanttSidebar>
          {Object.entries(sortedGroupedFeatures).map(
            ([group, groupFeatures]) => (
              <GanttSidebarGroup key={group} name={group}>
                {groupFeatures.map((feature) => (
                  <GanttSidebarItem
                    allFeatures={allSortedFeatures}
                    dependencies={ganttDependencies}
                    feature={feature}
                    featureIndex={
                      allSortedFeatures.findIndex((f) => f.id === feature.id) +
                      1
                    }
                    key={feature.id}
                    onSelectItem={handleViewFeature}
                  />
                ))}
              </GanttSidebarGroup>
            )
          )}
        </GanttSidebar>
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            {Object.entries(sortedGroupedFeatures).map(
              ([group, groupFeatures]) => (
                <GanttFeatureListGroup key={group}>
                  {groupFeatures.map((feature) => (
                    <div
                      className="flex"
                      key={feature.id}
                      style={{ height: "var(--gantt-row-height)" }}
                    >
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <button
                            onClick={() => handleViewFeature(feature.id)}
                            type="button"
                          >
                            <GanttFeatureItem
                              onMove={handleMoveFeature}
                              {...feature}
                            >
                              <p className="flex-1 truncate text-xs">
                                {feature.name}
                              </p>
                              {feature.owner ? (
                                <Avatar className="h-4 w-4">
                                  <AvatarImage
                                    src={feature.owner.image ?? ""}
                                  />
                                  <AvatarFallback>
                                    {feature.owner.name?.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                              ) : null}
                            </GanttFeatureItem>
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            className="flex items-center gap-2"
                            onClick={() => handleViewFeature(feature.id)}
                          >
                            <EyeIcon
                              className="text-muted-foreground"
                              size={16}
                            />
                            View feature
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center gap-2"
                            onClick={() => handleCopyLink(feature.id)}
                          >
                            <LinkIcon
                              className="text-muted-foreground"
                              size={16}
                            />
                            Copy link
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center gap-2 text-destructive"
                            onClick={() => handleRemoveFeature(feature.id)}
                          >
                            <TrashIcon size={16} />
                            Remove from roadmap
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>
                  ))}
                </GanttFeatureListGroup>
              )
            )}
          </GanttFeatureList>
          {markers.map((marker) => (
            <GanttMarker
              key={marker.id}
              {...marker}
              onRemove={handleRemoveMarker}
            />
          ))}
          <GanttDependencyLayer dependencies={ganttDependencies} />
          <GanttToday />
          <GanttCreateMarkerTrigger onCreateMarker={handleCreateMarker} />
        </GanttTimeline>
      </GanttProvider>
    </div>
  );
}
