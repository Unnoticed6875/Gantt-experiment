import { atom, useAtom } from "jotai";
import type { FeaturePosition } from "./types";

export const draggingAtom = atom(false);
export const scrollXAtom = atom(0);
export const featurePositionsAtom = atom<Map<string, FeaturePosition>>(
  new Map()
);

export type SidebarColumns = {
  name: boolean;
  status: boolean;
  start: boolean;
  end: boolean;
  deps: boolean;
};

export const sidebarColumnsAtom = atom<SidebarColumns>({
  name: true,
  status: true,
  start: true,
  end: true,
  deps: true,
});

export const COLUMN_WIDTHS = {
  name: 240,
  status: 80,
  start: 60,
  end: 60,
  deps: 40,
} as const;

export const useGanttDragging = () => useAtom(draggingAtom);
export const useGanttScrollX = () => useAtom(scrollXAtom);
export const useFeaturePositions = () => useAtom(featurePositionsAtom);
export const useSidebarColumns = () => useAtom(sidebarColumnsAtom);
