"use client";

import { createContext, useContext } from "react";
import type { GanttContextProps } from "./types";

export const GanttContext = createContext<GanttContextProps>({
  zoom: 100,
  range: "monthly",
  columnWidth: 50,
  headerHeight: 60,
  sidebarWidth: 300,
  rowHeight: 36,
  onAddItem: undefined,
  placeholderLength: 2,
  timelineData: [],
  ref: null,
  scrollToFeature: undefined,
});

export const useGantt = () => useContext(GanttContext);
