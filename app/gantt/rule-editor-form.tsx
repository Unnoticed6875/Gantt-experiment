"use client";

import { useState } from "react";
import {
  RULE_CATEGORIES,
  type SchedulingRuleCategory,
  type SchedulingRuleType,
} from "@/components/kibo-ui/gantt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SchedulingRule } from "@/lib/db/types";

type RuleEditorFormProps = {
  rule?: SchedulingRule;
  category: SchedulingRuleCategory;
  onSave: (data: { type: string; name: string; config: unknown }) => void;
  onCancel: () => void;
};

const RULE_TYPE_LABELS: Record<SchedulingRuleType, string> = {
  holiday: "Holiday",
  blackout: "Blackout Period",
  slack: "Slack Buffer",
  lag: "Lag/Lead Time",
  constraint: "Constraint",
  duration: "Duration Limit",
  alignment: "Week Alignment",
  capacity: "Capacity Limit",
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function RuleEditorForm({
  rule,
  category,
  onSave,
  onCancel,
}: RuleEditorFormProps) {
  const availableTypes = RULE_CATEGORIES[category];
  const [type, setType] = useState<SchedulingRuleType>(
    (rule?.type as SchedulingRuleType) || availableTypes[0]
  );
  const [name, setName] = useState(rule?.name || "");

  // Config state for different rule types
  const config = rule?.config as Record<string, unknown> | undefined;

  // Holiday config
  const [holidayMode, setHolidayMode] = useState<
    "weekdays" | "dates" | "recurring"
  >(config?.weekdays ? "weekdays" : config?.dates ? "dates" : "recurring");
  const [weekdays, setWeekdays] = useState<number[]>(
    (config?.weekdays as number[]) || [0, 6]
  );
  const [dates, setDates] = useState<string>(
    ((config?.dates as string[]) || []).join(", ")
  );
  const [recurringMonth, setRecurringMonth] = useState(
    String(config?.month || 1)
  );
  const [recurringDay, setRecurringDay] = useState(String(config?.day || 1));

  // Blackout config
  const [blackoutStart, setBlackoutStart] = useState(
    (config?.startDate as string) || ""
  );
  const [blackoutEnd, setBlackoutEnd] = useState(
    (config?.endDate as string) || ""
  );

  // Slack/Lag config
  const [slackDays, setSlackDays] = useState(String(config?.days || 1));

  // Constraint config
  const [constraintType, setConstraintType] = useState(
    (config?.constraintType as string) || "fixed_end"
  );

  // Duration config
  const [minDays, setMinDays] = useState(String(config?.minDays || ""));
  const [maxDays, setMaxDays] = useState(String(config?.maxDays || ""));

  // Alignment config
  const [alignmentDay, setAlignmentDay] = useState(
    String(config?.startDay || 1)
  );

  // Capacity config
  const [maxConcurrent, setMaxConcurrent] = useState(
    String(config?.maxConcurrent || 3)
  );
  const [groupBy, setGroupBy] = useState<"owner" | "group">(
    (config?.groupBy as "owner" | "group") || "owner"
  );

  const handleWeekdayToggle = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const buildConfig = (): unknown => {
    switch (type) {
      case "holiday":
        if (holidayMode === "weekdays") {
          return { weekdays };
        }
        if (holidayMode === "dates") {
          return {
            dates: dates
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean),
          };
        }
        return {
          month: Number.parseInt(recurringMonth, 10),
          day: Number.parseInt(recurringDay, 10),
          recurring: true,
        };
      case "blackout":
        return { startDate: blackoutStart, endDate: blackoutEnd };
      case "slack":
      case "lag":
        return { days: Number.parseInt(slackDays, 10) };
      case "constraint":
        return { constraintType, featureIds: [] };
      case "duration": {
        const durationConfig: Record<string, number> = {};
        if (minDays) durationConfig.minDays = Number.parseInt(minDays, 10);
        if (maxDays) durationConfig.maxDays = Number.parseInt(maxDays, 10);
        return durationConfig;
      }
      case "alignment":
        return { startDay: Number.parseInt(alignmentDay, 10) };
      case "capacity":
        return {
          maxConcurrent: Number.parseInt(maxConcurrent, 10),
          groupBy,
        };
      default:
        return {};
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ type, name, config: buildConfig() });
  };

  const renderConfigFields = () => {
    switch (type) {
      case "holiday":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Holiday Type</Label>
              <Select
                onValueChange={(v) => setHolidayMode(v as typeof holidayMode)}
                value={holidayMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekdays">Skip Weekdays</SelectItem>
                  <SelectItem value="dates">Specific Dates</SelectItem>
                  <SelectItem value="recurring">Recurring Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {holidayMode === "weekdays" && (
              <div className="space-y-2">
                <Label>Days to Skip</Label>
                <div className="flex flex-wrap gap-1">
                  {DAY_NAMES.map((dayName, index) => (
                    <Button
                      key={dayName}
                      onClick={() => handleWeekdayToggle(index)}
                      size="sm"
                      type="button"
                      variant={weekdays.includes(index) ? "default" : "outline"}
                    >
                      {dayName.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {holidayMode === "dates" && (
              <div className="space-y-2">
                <Label>Dates (comma-separated, YYYY-MM-DD)</Label>
                <Input
                  onChange={(e) => setDates(e.target.value)}
                  placeholder="2025-12-25, 2025-01-01"
                  value={dates}
                />
              </div>
            )}

            {holidayMode === "recurring" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month (1-12)</Label>
                  <Input
                    max={12}
                    min={1}
                    onChange={(e) => setRecurringMonth(e.target.value)}
                    type="number"
                    value={recurringMonth}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Day (1-31)</Label>
                  <Input
                    max={31}
                    min={1}
                    onChange={(e) => setRecurringDay(e.target.value)}
                    type="number"
                    value={recurringDay}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case "blackout":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                onChange={(e) => setBlackoutStart(e.target.value)}
                type="date"
                value={blackoutStart}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                onChange={(e) => setBlackoutEnd(e.target.value)}
                type="date"
                value={blackoutEnd}
              />
            </div>
          </div>
        );

      case "slack":
        return (
          <div className="space-y-2">
            <Label>Buffer Days</Label>
            <Input
              min={1}
              onChange={(e) => setSlackDays(e.target.value)}
              type="number"
              value={slackDays}
            />
            <p className="text-muted-foreground text-xs">
              Days of buffer to add between dependent tasks.
            </p>
          </div>
        );

      case "lag":
        return (
          <div className="space-y-2">
            <Label>Lag Days</Label>
            <Input
              onChange={(e) => setSlackDays(e.target.value)}
              type="number"
              value={slackDays}
            />
            <p className="text-muted-foreground text-xs">
              Positive = delay, Negative = overlap (lead time).
            </p>
          </div>
        );

      case "constraint":
        return (
          <div className="space-y-2">
            <Label>Constraint Type</Label>
            <Select
              onValueChange={(v) => {
                if (v) {
                  setConstraintType(v);
                }
              }}
              value={constraintType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed_end">Fixed Deadline</SelectItem>
                <SelectItem value="fixed_start">Fixed Start Date</SelectItem>
                <SelectItem value="fixed_both">Fixed Both Dates</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "duration":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Days</Label>
              <Input
                min={0}
                onChange={(e) => setMinDays(e.target.value)}
                placeholder="Optional"
                type="number"
                value={minDays}
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Days</Label>
              <Input
                min={0}
                onChange={(e) => setMaxDays(e.target.value)}
                placeholder="Optional"
                type="number"
                value={maxDays}
              />
            </div>
          </div>
        );

      case "alignment":
        return (
          <div className="space-y-2">
            <Label>Tasks Start On</Label>
            <Select
              onValueChange={(v) => {
                if (v) {
                  setAlignmentDay(v);
                }
              }}
              value={alignmentDay}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((dayName, index) => (
                  <SelectItem key={dayName} value={String(index)}>
                    {dayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "capacity":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Max Concurrent Tasks</Label>
              <Input
                min={1}
                onChange={(e) => setMaxConcurrent(e.target.value)}
                type="number"
                value={maxConcurrent}
              />
            </div>
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select
                onValueChange={(v) => setGroupBy(v as "owner" | "group")}
                value={groupBy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label>Rule Type</Label>
        <Select
          onValueChange={(v) => setType(v as SchedulingRuleType)}
          value={type}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {RULE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Rule Name</Label>
        <Input
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a descriptive name"
          required
          value={name}
        />
      </div>

      {renderConfigFields()}

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit">{rule ? "Save Changes" : "Create Rule"}</Button>
      </div>
    </form>
  );
}
