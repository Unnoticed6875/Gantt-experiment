import { atom, useAtom } from "jotai";
import type { FeaturePosition } from "./types";

export const draggingAtom = atom(false);
export const scrollXAtom = atom(0);
export const featurePositionsAtom = atom<Map<string, FeaturePosition>>(
  new Map()
);

export const useGanttDragging = () => useAtom(draggingAtom);
export const useGanttScrollX = () => useAtom(scrollXAtom);
export const useFeaturePositions = () => useAtom(featurePositionsAtom);
