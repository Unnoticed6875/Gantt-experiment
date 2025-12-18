"use client";

import { faker } from "@faker-js/faker";
import { IconCalendarRepeat, IconMinus, IconPlus } from "@tabler/icons-react";
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
import { useState } from "react";
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

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const statuses = [
  { id: faker.string.uuid(), name: "Planned", color: "#6B7280" },
  { id: faker.string.uuid(), name: "In Progress", color: "#F59E0B" },
  { id: faker.string.uuid(), name: "Done", color: "#10B981" },
];

const users = Array.from({ length: 4 })
  .fill(null)
  .map(() => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    image: faker.image.avatar(),
  }));

const exampleGroups = Array.from({ length: 6 })
  .fill(null)
  .map(() => ({
    id: faker.string.uuid(),
    name: capitalize(faker.company.buzzPhrase()),
  }));

const exampleProducts = Array.from({ length: 4 })
  .fill(null)
  .map(() => ({
    id: faker.string.uuid(),
    name: capitalize(faker.company.buzzPhrase()),
  }));

const exampleInitiatives = Array.from({ length: 2 })
  .fill(null)
  .map(() => ({
    id: faker.string.uuid(),
    name: capitalize(faker.company.buzzPhrase()),
  }));

const exampleReleases = Array.from({ length: 3 })
  .fill(null)
  .map(() => ({
    id: faker.string.uuid(),
    name: capitalize(faker.company.buzzPhrase()),
  }));

const exampleFeatures = Array.from({ length: 20 })
  .fill(null)
  .map(() => ({
    id: faker.string.uuid(),
    name: capitalize(faker.company.buzzPhrase()),
    startAt: faker.date.past({ years: 0.5, refDate: new Date() }),
    endAt: faker.date.future({ years: 0.5, refDate: new Date() }),
    status: faker.helpers.arrayElement(statuses),
    owner: faker.helpers.arrayElement(users),
    group: faker.helpers.arrayElement(exampleGroups),
    product: faker.helpers.arrayElement(exampleProducts),
    initiative: faker.helpers.arrayElement(exampleInitiatives),
    release: faker.helpers.arrayElement(exampleReleases),
  }));

const exampleMarkers = Array.from({ length: 6 })
  .fill(null)
  .map(() => ({
    id: faker.string.uuid(),
    date: faker.date.past({ years: 0.5, refDate: new Date() }),
    label: capitalize(faker.company.buzzPhrase()),
    className: faker.helpers.arrayElement([
      "bg-blue-100 text-blue-900",
      "bg-green-100 text-green-900",
      "bg-purple-100 text-purple-900",
      "bg-red-100 text-red-900",
      "bg-orange-100 text-orange-900",
      "bg-teal-100 text-teal-900",
    ]),
  }));

// Dependencies for all features demonstrating all 4 types
const exampleDependencies: GanttDependency[] = [
  // Chain 1: Features 0 → 1 → 2 (FS chain)
  {
    id: "dep-1",
    sourceId: exampleFeatures[0].id,
    targetId: exampleFeatures[1].id,
    type: "FS",
  },
  {
    id: "dep-2",
    sourceId: exampleFeatures[1].id,
    targetId: exampleFeatures[2].id,
    type: "FS",
  },
  // Chain 2: Features 3 → 4 → 5 (FS with colors)
  {
    id: "dep-3",
    sourceId: exampleFeatures[3].id,
    targetId: exampleFeatures[4].id,
    type: "FS",
    color: "#3b82f6", // Blue
  },
  {
    id: "dep-4",
    sourceId: exampleFeatures[4].id,
    targetId: exampleFeatures[5].id,
    type: "FS",
    color: "#3b82f6", // Blue
  },
  // Start-to-Start: Features 6 and 7 start together
  {
    id: "dep-5",
    sourceId: exampleFeatures[6].id,
    targetId: exampleFeatures[7].id,
    type: "SS",
    color: "#22c55e", // Green
  },
  // Finish-to-Finish: Features 8 and 9 finish together
  {
    id: "dep-6",
    sourceId: exampleFeatures[8].id,
    targetId: exampleFeatures[9].id,
    type: "FF",
    color: "#a855f7", // Purple
  },
  // Chain 3: Features 10 → 11 → 12 → 13 (longer FS chain)
  {
    id: "dep-7",
    sourceId: exampleFeatures[10].id,
    targetId: exampleFeatures[11].id,
    type: "FS",
    color: "#f97316", // Orange
  },
  {
    id: "dep-8",
    sourceId: exampleFeatures[11].id,
    targetId: exampleFeatures[12].id,
    type: "FS",
    color: "#f97316", // Orange
  },
  {
    id: "dep-9",
    sourceId: exampleFeatures[12].id,
    targetId: exampleFeatures[13].id,
    type: "FS",
    color: "#f97316", // Orange
  },
  // Start-to-Finish: Feature 14 start triggers Feature 15 finish
  {
    id: "dep-10",
    sourceId: exampleFeatures[14].id,
    targetId: exampleFeatures[15].id,
    type: "SF",
    color: "#ec4899", // Pink
  },
  // Chain 4: Features 16 → 17 → 18 → 19 (final chain)
  {
    id: "dep-11",
    sourceId: exampleFeatures[16].id,
    targetId: exampleFeatures[17].id,
    type: "FS",
    color: "#14b8a6", // Teal
  },
  {
    id: "dep-12",
    sourceId: exampleFeatures[17].id,
    targetId: exampleFeatures[18].id,
    type: "SS",
    color: "#14b8a6", // Teal
  },
  {
    id: "dep-13",
    sourceId: exampleFeatures[18].id,
    targetId: exampleFeatures[19].id,
    type: "FF",
    color: "#14b8a6", // Teal
  },
];

const GanttView = () => {
  const [features, setFeatures] = useState(exampleFeatures);
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

  const handleRemoveFeature = (id: string) =>
    setFeatures((prev) => prev.filter((feature) => feature.id !== id));

  const handleRemoveMarker = (id: string) =>
    console.log(`Remove marker: ${id}`);

  const handleCreateMarker = (date: Date) =>
    console.log(`Create marker: ${date.toISOString()}`);

  const handleMoveFeature = (id: string, startAt: Date, endAt: Date | null) => {
    if (!endAt) {
      return;
    }

    // Calculate all features that need to be rescheduled
    const updates = autoSchedule(
      id,
      { startAt, endAt },
      features,
      exampleDependencies
    );

    // Apply all updates
    setFeatures((prev) =>
      prev.map((feature) => {
        const update = updates.find((u) => u.id === feature.id);
        return update
          ? { ...feature, startAt: update.startAt, endAt: update.endAt }
          : feature;
      })
    );

    console.log(`Auto-scheduled ${updates.length} feature(s)`);
  };

  const handleAddFeature = (date: Date) =>
    console.log(`Add feature: ${date.toISOString()}`);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));

  const handleRecalculateSchedule = () => {
    const updates = recalculateSchedule(features, exampleDependencies);

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

    console.log(`Recalculated ${updates.length} feature(s)`);
  };

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
                    dependencies={exampleDependencies}
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
                    <div className="flex" key={feature.id}>
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
                                <AvatarImage src={feature.owner.image} />
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
          {exampleMarkers.map((marker) => (
            <GanttMarker
              key={marker.id}
              {...marker}
              onRemove={handleRemoveMarker}
            />
          ))}
          <GanttDependencyLayer dependencies={exampleDependencies} />
          <GanttToday />
          <GanttCreateMarkerTrigger onCreateMarker={handleCreateMarker} />
        </GanttTimeline>
      </GanttProvider>
    </div>
  );
};

const earliestYear =
  exampleFeatures
    .map((feature) => feature.startAt.getFullYear())
    .sort()
    .at(0) ?? new Date().getFullYear();

const latestYear =
  exampleFeatures
    .map((feature) => feature.endAt.getFullYear())
    .sort()
    .at(-1) ?? new Date().getFullYear();

const CalendarView = () => (
  <CalendarProvider>
    <CalendarDate>
      <CalendarDatePicker>
        <CalendarMonthPicker />
        <CalendarYearPicker end={latestYear} start={earliestYear} />
      </CalendarDatePicker>
      <CalendarDatePagination />
    </CalendarDate>
    <CalendarHeader />
    <CalendarBody features={exampleFeatures}>
      {({ feature }) => <CalendarItem feature={feature} key={feature.id} />}
    </CalendarBody>
  </CalendarProvider>
);

const ListView = () => {
  const [features, setFeatures] = useState(exampleFeatures);

  const handleDragEnd = (event: DragEndEvent) => {
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
          return { ...feature, status };
        }

        return feature;
      })
    );
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
                      <AvatarImage src={feature.owner.image} />
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

const KanbanView = () => {
  const [features, setFeatures] = useState(
    exampleFeatures.map((feature) => ({
      ...feature,
      column: feature.status.id,
    }))
  );

  const handleDragEnd = (event: DragEndEvent) => {
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
          return { ...feature, status };
        }

        return feature;
      })
    );
  };

  return (
    <KanbanProvider
      className="p-4"
      columns={statuses}
      data={features}
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
                  {feature.owner !== undefined ? (
                    <Avatar className="h-4 w-4 shrink-0">
                      <AvatarImage src={feature.owner.image} />
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

const TableView = () => {
  const columns: ColumnDef<(typeof exampleFeatures)[number]>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Avatar className="size-6">
              <AvatarImage src={row.original.owner.image} />
              <AvatarFallback>
                {row.original.owner.name?.slice(0, 2)}
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
      <TableProvider columns={columns} data={exampleFeatures}>
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

const Example = () => {
  const views = [
    {
      id: "gantt",
      label: "Gantt",
      icon: GanttChartSquareIcon,
      component: GanttView,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: CalendarIcon,
      component: CalendarView,
    },
    {
      id: "list",
      label: "List",
      icon: ListIcon,
      component: ListView,
    },
    {
      id: "kanban",
      label: "Kanban",
      icon: KanbanSquareIcon,
      component: KanbanView,
    },
    {
      id: "table",
      label: "Table",
      icon: TableIcon,
      component: TableView,
    },
  ];

  return (
    <Tabs className="not-prose size-full gap-0 divide-y" defaultValue="gantt">
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
        <TabsContent className="overflow-hidden" key={view.id} value={view.id}>
          <view.component />
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default Example;
