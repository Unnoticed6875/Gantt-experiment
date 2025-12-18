"use client";

import { useState } from "react";
import type { DragEndEvent } from "@/components/kibo-ui/list";
import {
  ListGroup,
  ListHeader,
  ListItem,
  ListItems,
  ListProvider,
} from "@/components/kibo-ui/list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  deserializeFeature,
  type SerializedFeatureWithRelations,
  type Status,
} from "@/lib/db/types";
import { updateFeatureStatus } from "../roadmap/actions";

type ListViewProps = {
  initialFeatures: SerializedFeatureWithRelations[];
  statuses: Status[];
};

export function ListView({ initialFeatures, statuses }: ListViewProps) {
  const [features, setFeatures] = useState(() =>
    initialFeatures.map(deserializeFeature)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const targetStatus = statuses.find((status) => status.name === over.id);

    if (!targetStatus) {
      return;
    }

    setFeatures(
      features.map((feature) => {
        if (feature.id === active.id) {
          return { ...feature, status: targetStatus, column: targetStatus.id };
        }

        return feature;
      })
    );

    await updateFeatureStatus(active.id as string, targetStatus.id);
  };

  return (
    <ListProvider onDragEnd={handleDragEnd}>
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
}
