export type PendingChange = {
  id: string;
  featureId: string;
  featureName: string;
  groupName: string;
  originalStartAt: Date;
  originalEndAt: Date;
  newStartAt: Date;
  newEndAt: Date;
  source: "drag" | "recalculate";
  timestamp: Date;
};
