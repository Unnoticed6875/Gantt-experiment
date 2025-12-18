"use client";

import {
  IconCalendarRepeat,
  IconDeviceFloppy,
  IconMinus,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import groupBy from "lodash.groupby";
import {
  CalendarIcon,
  ChevronRightIcon,
  EyeIcon,
  GanttChartSquareIcon,
  KanbanSquareIcon,
  LinkIcon,
  ListIcon,
  TableIcon,
  TrashIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SaveChangesDialog } from "@/app/gantt/save-changes-dialog";
import type { PendingChange } from "@/app/gantt/types";
import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarItem,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
} from "@/components/kibo-ui/calendar";
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
  recalculateSchedule,
} from "@/components/kibo-ui/gantt";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/kibo-ui/kanban";
import {
  type DragEndEvent,
  ListGroup,
  ListHeader,
  ListItem,
  ListItems,
  ListProvider,
} from "@/components/kibo-ui/list";
import type { ColumnDef } from "@/components/kibo-ui/table";
import {
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHead,
  TableHeader,
  TableHeaderGroup,
  TableProvider,
  TableRow,
} from "@/components/kibo-ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type Dependency,
  deserializeFeature,
  deserializeMarker,
  type FeatureWithRelations,
  type Marker,
  type SerializedFeatureWithRelations,
  type SerializedMarker,
  type Status,
} from "@/lib/db/types";
import {
  batchUpdateFeatureDates,
  deleteFeature,
  updateFeatureStatus,
} from "../actions";

type RoadmapViewProps = {
  initialFeatures: SerializedFeatureWithRelations[];
  statuses: Status[];
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

const GanttView = ({
  features: initialFeatures,
  dependencies,
  markers,
}: {
  features: FeatureWithRelations[];
  dependencies: GanttDependency[];
  markers: Marker[];
}) => {
  const [features, setFeatures] = useState(initialFeatures);
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
        startAt: feature.startAt,
        endAt: feature.endAt,
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
      dependencies
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
    const updates = recalculateSchedule(features, dependencies);

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
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b p-2">
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
        className="flex-1 rounded-none"
        onAddItem={handleAddFeature}
        range="monthly"
        zoom={zoom}
      >
        <GanttSidebar>
          {Object.entries(sortedGroupedFeatures).map(
            ([group, groupFeatures]) => (
              <GanttSidebarGroup key={group} name={group}>
                {groupFeatures.map((feature) => (
                  <GanttSidebarItem
                    allFeatures={allSortedFeatures}
                    dependencies={dependencies}
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
                        <ContextMenuTrigger
                          onClick={() => handleViewFeature(feature.id)}
                          render={<button type="button" />}
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
                                <AvatarImage src={feature.owner.image ?? ""} />
                                <AvatarFallback>
                                  {feature.owner.name?.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            ) : null}
                          </GanttFeatureItem>
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
          <GanttDependencyLayer dependencies={dependencies} />
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
};

const CalendarView = ({ features }: { features: FeatureWithRelations[] }) => {
  const earliestYear =
    features
      .map((feature) => feature.startAt.getFullYear())
      .sort((a, b) => a - b)
      .at(0) ?? new Date().getFullYear();

  const latestYear =
    features
      .map((feature) => feature.endAt.getFullYear())
      .sort((a, b) => a - b)
      .at(-1) ?? new Date().getFullYear();

  return (
    <CalendarProvider className="h-full">
      <CalendarDate>
        <CalendarDatePicker>
          <CalendarMonthPicker />
          <CalendarYearPicker end={latestYear} start={earliestYear} />
        </CalendarDatePicker>
        <CalendarDatePagination />
      </CalendarDate>
      <CalendarHeader />
      <CalendarBody features={features}>
        {({ feature }) => <CalendarItem feature={feature} key={feature.id} />}
      </CalendarBody>
    </CalendarProvider>
  );
};

const ListView = ({
  features: initialFeatures,
  statuses,
}: {
  features: FeatureWithRelations[];
  statuses: Status[];
}) => {
  const [features, setFeatures] = useState(initialFeatures);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const status = statuses.find((s) => s.name === over.id);

    if (!status) {
      return;
    }

    setFeatures(
      features.map((feature) => {
        if (feature.id === active.id) {
          return { ...feature, status, column: status.id };
        }

        return feature;
      })
    );

    await updateFeatureStatus(active.id as string, status.id);
  };

  return (
    <ListProvider className="overflow-auto" onDragEnd={handleDragEnd}>
      {statuses.map((status) => (
        <ListGroup id={status.name} key={status.name}>
          <ListHeader color={status.color} name={status.name} />
          <ListItems>
            {features
              .filter((feature) => feature.status.name === status.name)
              .map((feature, index) => (
                <ListItem
                  id={feature.id}
                  index={index}
                  key={feature.id}
                  name={feature.name}
                  parent={feature.status.name}
                >
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: feature.status.color }}
                  />
                  <p className="m-0 flex-1 font-medium text-sm">
                    {feature.name}
                  </p>
                  {feature.owner ? (
                    <Avatar className="h-4 w-4 shrink-0">
                      <AvatarImage src={feature.owner.image ?? ""} />
                      <AvatarFallback>
                        {feature.owner.name?.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                </ListItem>
              ))}
          </ListItems>
        </ListGroup>
      ))}
    </ListProvider>
  );
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const KanbanView = ({
  features: initialFeatures,
  statuses,
}: {
  features: FeatureWithRelations[];
  statuses: Status[];
}) => {
  const [features, setFeatures] = useState(
    initialFeatures.map((feature) => ({
      ...feature,
      column: feature.status.id,
    }))
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const status = statuses.find(({ id }) => id === over.id);

    if (!status) {
      return;
    }

    setFeatures(
      features.map((feature) => {
        if (feature.id === active.id) {
          return { ...feature, status, column: status.id };
        }

        return feature;
      })
    );

    await updateFeatureStatus(active.id as string, status.id);
  };

  return (
    <KanbanProvider
      className="p-4"
      columns={statuses}
      data={features}
      onDataChange={setFeatures}
      onDragEnd={handleDragEnd}
    >
      {(column) => (
        <KanbanBoard id={column.id} key={column.id}>
          <KanbanHeader>{column.name}</KanbanHeader>
          <KanbanCards id={column.id}>
            {(feature: (typeof features)[number]) => (
              <KanbanCard
                column={column.id}
                id={feature.id}
                key={feature.id}
                name={feature.name}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <p className="m-0 flex-1 font-medium text-sm">
                      {feature.name}
                    </p>
                    <p className="m-0 text-muted-foreground text-xs">
                      {feature.initiative.name}
                    </p>
                  </div>
                  {feature.owner ? (
                    <Avatar className="h-4 w-4 shrink-0">
                      <AvatarImage src={feature.owner.image ?? ""} />
                      <AvatarFallback>
                        {feature.owner.name?.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                </div>
                <p className="m-0 text-muted-foreground text-xs">
                  {shortDateFormatter.format(feature.startAt)} -{" "}
                  {dateFormatter.format(feature.endAt)}
                </p>
              </KanbanCard>
            )}
          </KanbanCards>
        </KanbanBoard>
      )}
    </KanbanProvider>
  );
};

const TableView = ({ features }: { features: FeatureWithRelations[] }) => {
  const columns: ColumnDef<FeatureWithRelations>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Avatar className="size-6">
              <AvatarImage src={row.original.owner?.image ?? ""} />
              <AvatarFallback>
                {row.original.owner?.name?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div
              className="absolute right-0 bottom-0 h-2 w-2 rounded-full ring-2 ring-background"
              style={{
                backgroundColor: row.original.status.color,
              }}
            />
          </div>
          <div>
            <span className="font-medium">{row.original.name}</span>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <span>{row.original.product.name}</span>
              <ChevronRightIcon size={12} />
              <span>{row.original.group.name}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "startAt",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Start At" />
      ),
      cell: ({ row }) =>
        new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
        }).format(row.original.startAt),
    },
    {
      accessorKey: "endAt",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="End At" />
      ),
      cell: ({ row }) =>
        new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
        }).format(row.original.endAt),
    },
    {
      id: "release",
      accessorFn: (row) => row.release.id,
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Release" />
      ),
      cell: ({ row }) => row.original.release.name,
    },
  ];

  return (
    <div className="size-full overflow-auto">
      <TableProvider columns={columns} data={features}>
        <TableHeader>
          {({ headerGroup }) => (
            <TableHeaderGroup headerGroup={headerGroup} key={headerGroup.id}>
              {({ header }) => <TableHead header={header} key={header.id} />}
            </TableHeaderGroup>
          )}
        </TableHeader>
        <TableBody>
          {({ row }) => (
            <TableRow key={row.id} row={row}>
              {({ cell }) => <TableCell cell={cell} key={cell.id} />}
            </TableRow>
          )}
        </TableBody>
      </TableProvider>
    </div>
  );
};

export function RoadmapView({
  initialFeatures: serializedFeatures,
  statuses,
  dependencies,
  markers: serializedMarkers,
}: RoadmapViewProps) {
  // Deserialize dates from server component
  const features = serializedFeatures.map(deserializeFeature);
  const markers = serializedMarkers.map(deserializeMarker);

  // Convert dependencies to Gantt format
  const ganttDependencies = dependencies.map(toGanttDependency);

  const views = [
    {
      id: "gantt",
      label: "Gantt",
      icon: GanttChartSquareIcon,
      component: () => (
        <GanttView
          dependencies={ganttDependencies}
          features={features}
          markers={markers}
        />
      ),
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: CalendarIcon,
      component: () => <CalendarView features={features} />,
    },
    {
      id: "list",
      label: "List",
      icon: ListIcon,
      component: () => <ListView features={features} statuses={statuses} />,
    },
    {
      id: "kanban",
      label: "Kanban",
      icon: KanbanSquareIcon,
      component: () => <KanbanView features={features} statuses={statuses} />,
    },
    {
      id: "table",
      label: "Table",
      icon: TableIcon,
      component: () => <TableView features={features} />,
    },
  ];

  return (
    <Tabs
      className="not-prose h-screen w-full gap-0 divide-y"
      defaultValue="gantt"
    >
      <div className="flex items-center justify-between gap-4 p-4">
        <p className="font-medium">Roadmap</p>
        <TabsList>
          {views.map((view) => (
            <TabsTrigger key={view.id} value={view.id}>
              <view.icon size={16} />
              <span className="sr-only">{view.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {views.map((view) => (
        <TabsContent
          className="min-h-0 overflow-hidden"
          key={view.id}
          value={view.id}
        >
          <view.component />
        </TabsContent>
      ))}
    </Tabs>
  );
}
