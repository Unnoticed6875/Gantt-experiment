import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  dependencies,
  features,
  groups,
  initiatives,
  markers,
  products,
  releases,
  statuses,
  users,
} from "./schema";

// Select types (for reading from DB)
export type Status = InferSelectModel<typeof statuses>;
export type User = InferSelectModel<typeof users>;
export type Group = InferSelectModel<typeof groups>;
export type Product = InferSelectModel<typeof products>;
export type Initiative = InferSelectModel<typeof initiatives>;
export type Release = InferSelectModel<typeof releases>;
export type Feature = InferSelectModel<typeof features>;
export type Marker = InferSelectModel<typeof markers>;
export type Dependency = InferSelectModel<typeof dependencies>;

// Insert types (for inserting into DB)
export type NewStatus = InferInsertModel<typeof statuses>;
export type NewUser = InferInsertModel<typeof users>;
export type NewGroup = InferInsertModel<typeof groups>;
export type NewProduct = InferInsertModel<typeof products>;
export type NewInitiative = InferInsertModel<typeof initiatives>;
export type NewRelease = InferInsertModel<typeof releases>;
export type NewFeature = InferInsertModel<typeof features>;
export type NewMarker = InferInsertModel<typeof markers>;
export type NewDependency = InferInsertModel<typeof dependencies>;

// Feature with all relations (for roadmap page)
export type FeatureWithRelations = Feature & {
  status: Status;
  owner: User | null;
  group: Group;
  product: Product;
  initiative: Initiative;
  release: Release;
};

// Serialized types for passing data from server to client components
// Date objects are serialized to ISO strings during RSC serialization
export type SerializedFeature = Omit<
  Feature,
  "startAt" | "endAt" | "createdAt" | "updatedAt"
> & {
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SerializedMarker = Omit<
  Marker,
  "date" | "createdAt" | "updatedAt"
> & {
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type SerializedFeatureWithRelations = Omit<
  FeatureWithRelations,
  "startAt" | "endAt" | "createdAt" | "updatedAt"
> & {
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
};

// Helper functions to deserialize dates in client components
export function deserializeFeature<T extends SerializedFeature>(
  feature: T
): Omit<T, "startAt" | "endAt" | "createdAt" | "updatedAt"> & {
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    ...feature,
    startAt: new Date(feature.startAt),
    endAt: new Date(feature.endAt),
    createdAt: new Date(feature.createdAt),
    updatedAt: new Date(feature.updatedAt),
  };
}

export function deserializeMarker(marker: SerializedMarker): Marker {
  return {
    ...marker,
    date: new Date(marker.date),
    createdAt: new Date(marker.createdAt),
    updatedAt: new Date(marker.updatedAt),
  };
}
