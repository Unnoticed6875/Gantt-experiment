"use client";

import { faker } from "@faker-js/faker";
import groupBy from "lodash.groupby";

// Seed faker to ensure consistent data between server and client renders
faker.seed(12_345);

import {
  IconCalendarRepeat,
  IconEye,
  IconLink,
  IconMinus,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
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

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

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

// Example dependencies between features demonstrating all 4 types
const exampleDependencies: GanttDependency[] = [
  // Finish-to-Start: Feature 0 must finish before Feature 1 can start
  {
    id: "dep-fs-1",
    sourceId: exampleFeatures[0].id,
    targetId: exampleFeatures[1].id,
    type: "FS",
  },
  // Finish-to-Start: Feature 2 must finish before Feature 3 can start
  {
    id: "dep-fs-2",
    sourceId: exampleFeatures[2].id,
    targetId: exampleFeatures[3].id,
    type: "FS",
    color: "#3b82f6", // Blue
  },
  // Start-to-Start: Feature 4 and Feature 5 start together
  {
    id: "dep-ss-1",
    sourceId: exampleFeatures[4].id,
    targetId: exampleFeatures[5].id,
    type: "SS",
    color: "#22c55e", // Green
  },
  // Finish-to-Finish: Feature 6 and Feature 7 finish together
  {
    id: "dep-ff-1",
    sourceId: exampleFeatures[6].id,
    targetId: exampleFeatures[7].id,
    type: "FF",
    color: "#a855f7", // Purple
  },
  // Start-to-Finish: Feature 8 start triggers Feature 9 finish
  {
    id: "dep-sf-1",
    sourceId: exampleFeatures[8].id,
    targetId: exampleFeatures[9].id,
    type: "SF",
    color: "#f97316", // Orange
  },
];

const Example = () => {
  const [features, setFeatures] = useState(exampleFeatures);
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
                                  <AvatarImage src={feature.owner.image} />
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
                            <IconEye
                              className="text-muted-foreground"
                              size={16}
                            />
                            View feature
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center gap-2"
                            onClick={() => handleCopyLink(feature.id)}
                          >
                            <IconLink
                              className="text-muted-foreground"
                              size={16}
                            />
                            Copy link
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center gap-2 text-destructive"
                            onClick={() => handleRemoveFeature(feature.id)}
                          >
                            <IconTrash size={16} />
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

export default Example;
