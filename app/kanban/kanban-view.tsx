"use client";

import { useState } from "react";
import type { DragEndEvent } from "@/components/kibo-ui/kanban";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/kibo-ui/kanban";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  deserializeFeature,
  type SerializedFeatureWithRelations,
  type Status,
} from "@/lib/db/types";
import { updateFeatureStatus } from "../roadmap/actions";

type KanbanViewProps = {
  initialFeatures: SerializedFeatureWithRelations[];
  statuses: Status[];
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

export function KanbanView({ initialFeatures, statuses }: KanbanViewProps) {
  const [features, setFeatures] = useState(() =>
    initialFeatures.map((feature) => ({
      ...deserializeFeature(feature),
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
      columns={statuses}
      data={features}
      onDataChange={setFeatures}
      onDragEnd={handleDragEnd}
    >
      {(column) => (
        <KanbanBoard id={column.id} key={column.id}>
          <KanbanHeader>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: column.color }}
              />
              <span>{column.name}</span>
            </div>
          </KanbanHeader>
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
}
