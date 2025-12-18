import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  getDaysInMonth,
  getDaysInYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type { Range } from "../types";

export const getsDaysIn = (range: Range) => {
  if (range === "weekly") {
    return (_date: Date) => 7;
  }
  if (range === "monthly" || range === "quarterly") {
    return getDaysInMonth;
  }
  if (range === "yearly") {
    return getDaysInYear;
  }
  return (_date: Date) => 1;
};

export const getDifferenceIn = (range: Range) => {
  if (range === "weekly") {
    return differenceInWeeks;
  }
  if (range === "monthly" || range === "quarterly") {
    return differenceInMonths;
  }
  if (range === "yearly") {
    return differenceInYears;
  }
  return differenceInDays;
};

export const getInnerDifferenceIn = (range: Range) => {
  if (range === "weekly") {
    return differenceInDays;
  }
  if (range === "monthly" || range === "quarterly") {
    return differenceInDays;
  }
  if (range === "yearly") {
    return differenceInMonths;
  }
  return differenceInHours;
};

export const getStartOf = (range: Range) => {
  if (range === "weekly") {
    return startOfWeek;
  }
  if (range === "monthly" || range === "quarterly") {
    return startOfMonth;
  }
  if (range === "yearly") {
    return startOfYear;
  }
  return startOfDay;
};

export const getEndOf = (range: Range) => {
  if (range === "weekly") {
    return endOfWeek;
  }
  if (range === "monthly" || range === "quarterly") {
    return endOfMonth;
  }
  if (range === "yearly") {
    return endOfYear;
  }
  return endOfDay;
};

export const getAddRange = (range: Range) => {
  if (range === "weekly") {
    return addWeeks;
  }
  if (range === "monthly" || range === "quarterly") {
    return addMonths;
  }
  if (range === "yearly") {
    return addYears;
  }
  return addDays;
};
