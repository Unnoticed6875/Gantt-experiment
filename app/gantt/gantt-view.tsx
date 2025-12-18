"use client";

import {
  IconCalendarRepeat,
  IconDeviceFloppy,
  IconMinus,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import groupBy from "lodash.groupby";
import { EyeIcon, LinkIcon, TrashIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import {
  type Dependency,
  deserializeFeature,
  deserializeMarker,
  type FeatureWithRelations,
  type SerializedFeatureWithRelations,
  type SerializedMarker,
} from "@/lib/db/types";
import { batchUpdateFeatureDates, deleteFeature } from "../roadmap/actions";
import { SaveChangesDialog } from "./save-changes-dialog";
import type { PendingChange } from "./types";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

type GanttViewProps = {
  initialFeatures: SerializedFeatureWithRelations[];
  dependencies: Dependency[];
  markers: SerializedMarker[];
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
  markers: serializedMarkers,
}: GanttViewProps) {
  const ganttDependencies = dependencies.map(toGanttDependency);
  const markers = serializedMarkers.map(deserializeMarker);
  const [features, setFeatures] = useState<FeatureWithRelations[]>(() =>
    initialFeatures.map(deserializeFeature)
  );
  const [range, setRange] = useState<Range>("monthly");
  const [zoom, setZoom] = useState(100);

  // Pending changes state
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, PendingChange>
  >(new Map());
  const originalFeaturesRef = useRef<
    Map<string, { startAt: Date; endAt: Date }>
  >(new Map());
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(
    new Set()
  );

  // Initialize original features on mount only
  useEffect(() => {
    // Skip if already initialized to preserve original values across re-renders
    if (originalFeaturesRef.current.size > 0) {
      return;
    }
    const originalMap = new Map<string, { startAt: Date; endAt: Date }>();
    for (const feature of initialFeatures) {
      originalMap.set(feature.id, {
        startAt: new Date(feature.startAt),
        endAt: new Date(feature.endAt),
      });
    }
    originalFeaturesRef.current = originalMap;
  }, [initialFeatures]);

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

  // Track pending change for a feature
  const trackPendingChange = (
    featureId: string,
    newStartAt: Date,
    newEndAt: Date,
    source: "drag" | "recalculate"
  ) => {
    const feature = features.find((f) => f.id === featureId);
    const original = originalFeaturesRef.current.get(featureId);
    if (!(feature && original)) {
      return;
    }

    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(featureId, {
        id: crypto.randomUUID(),
        featureId,
        featureName: feature.name,
        groupName: feature.group.name,
        originalStartAt: original.startAt,
        originalEndAt: original.endAt,
        newStartAt,
        newEndAt,
        source,
        timestamp: new Date(),
      });
      return next;
    });
  };

  const handleMoveFeature = (id: string, startAt: Date, endAt: Date | null) => {
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

    // Apply all updates locally for immediate visual feedback
    setFeatures((prev) =>
      prev.map((feature) => {
        const update = updates.find((u) => u.id === feature.id);
        return update
          ? { ...feature, startAt: update.startAt, endAt: update.endAt }
          : feature;
      })
    );

    // Track pending changes (don't save to DB yet)
    for (const update of updates) {
      trackPendingChange(update.id, update.startAt, update.endAt, "drag");
    }

    console.log(`Tracked ${updates.length} pending change(s)`);
  };

  const handleAddFeature = (date: Date) =>
    console.log(`Add feature: ${date.toISOString()}`);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));

  const handleRecalculateSchedule = () => {
    const updates = recalculateSchedule(features, ganttDependencies);

    if (updates.length === 0) {
      console.log("Schedule is already up to date");
      return;
    }

    // Apply all updates locally for immediate visual feedback
    setFeatures((prev) =>
      prev.map((feature) => {
        const update = updates.find((u) => u.id === feature.id);
        return update
          ? { ...feature, startAt: update.startAt, endAt: update.endAt }
          : feature;
      })
    );

    // Track pending changes (don't save to DB yet)
    for (const update of updates) {
      trackPendingChange(
        update.id,
        update.startAt,
        update.endAt,
        "recalculate"
      );
    }

    console.log(`Tracked ${updates.length} pending recalculation(s)`);
  };

  // Open verification dialog with all changes selected by default
  const handleOpenVerificationDialog = () => {
    setSelectedChanges(new Set(pendingChanges.keys()));
    setIsVerificationOpen(true);
  };

  // Save selected changes to database
  const handleSaveSelected = async () => {
    const changesToSave = Array.from(selectedChanges)
      .map((featureId) => pendingChanges.get(featureId))
      .filter((change): change is PendingChange => change !== undefined)
      .map((change) => ({
        id: change.featureId,
        startAt: change.newStartAt,
        endAt: change.newEndAt,
      }));

    // Revert unselected changes in local state
    const unselectedFeatureIds = Array.from(pendingChanges.keys()).filter(
      (id) => !selectedChanges.has(id)
    );

    setFeatures((prev) =>
      prev.map((feature) => {
        if (unselectedFeatureIds.includes(feature.id)) {
          const original = originalFeaturesRef.current.get(feature.id);
          if (original) {
            return {
              ...feature,
              startAt: original.startAt,
              endAt: original.endAt,
            };
          }
        }
        return feature;
      })
    );

    // Save selected changes to database
    if (changesToSave.length > 0) {
      await batchUpdateFeatureDates(changesToSave);
    }

    // Update original features ref with saved changes
    for (const change of changesToSave) {
      originalFeaturesRef.current.set(change.id, {
        startAt: change.startAt,
        endAt: change.endAt,
      });
    }

    // Clear pending changes and close dialog
    setPendingChanges(new Map());
    setSelectedChanges(new Set());
    setIsVerificationOpen(false);

    console.log(`Saved ${changesToSave.length} change(s)`);
  };

  // Discard all pending changes
  const handleDiscardChanges = () => {
    // Revert all features to original values
    setFeatures((prev) =>
      prev.map((feature) => {
        if (pendingChanges.has(feature.id)) {
          const original = originalFeaturesRef.current.get(feature.id);
          if (original) {
            return {
              ...feature,
              startAt: original.startAt,
              endAt: original.endAt,
            };
          }
        }
        return feature;
      })
    );
    setPendingChanges(new Map());
  };

  // Selection handlers for dialog
  const handleSelectionChange = (featureId: string, selected: boolean) => {
    setSelectedChanges((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(featureId);
      } else {
        next.delete(featureId);
      }
      return next;
    });
  };

  const handleSelectAll = () =>
    setSelectedChanges(new Set(pendingChanges.keys()));
  const handleDeselectAll = () => setSelectedChanges(new Set());

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
        {pendingChanges.size > 0 && (
          <>
            <button
              className="flex items-center gap-1.5 rounded border px-2 py-1 text-destructive text-sm hover:bg-destructive/10"
              onClick={handleDiscardChanges}
              type="button"
            >
              <IconTrash size={16} />
              Discard
            </button>
            <button
              className="flex items-center gap-1.5 rounded bg-primary px-2 py-1 text-primary-foreground text-sm hover:bg-primary/90"
              onClick={handleOpenVerificationDialog}
              type="button"
            >
              <IconDeviceFloppy size={16} />
              Save Changes ({pendingChanges.size})
            </button>
          </>
        )}
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
      <SaveChangesDialog
        onCancel={() => setIsVerificationOpen(false)}
        onDeselectAll={handleDeselectAll}
        onSave={handleSaveSelected}
        onSelectAll={handleSelectAll}
        onSelectionChange={handleSelectionChange}
        open={isVerificationOpen}
        pendingChanges={pendingChanges}
        selectedChanges={selectedChanges}
      />
    </div>
  );
}
