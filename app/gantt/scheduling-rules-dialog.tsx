"use client";

import {
  IconArrowRight,
  IconCalendarCheck,
  IconCalendarOff,
  IconCalendarX,
  IconClock,
  IconLock,
  IconPlus,
  IconRuler,
  IconToggleLeft,
  IconToggleRight,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import {
  RULE_CATEGORIES,
  type SchedulingRuleCategory,
  type SchedulingRuleType,
} from "@/components/kibo-ui/gantt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SchedulingRule } from "@/lib/db/types";
import { RuleEditorForm } from "./rule-editor-form";

type SchedulingRulesDialogProps = {
  open: boolean;
  rules: SchedulingRule[];
  onToggleRule: (id: string, enabled: boolean) => void;
  onDeleteRule: (id: string) => void;
  onCreateRule: (data: { type: string; name: string; config: unknown }) => void;
  onClose: () => void;
};

function getRuleIcon(type: SchedulingRuleType) {
  switch (type) {
    case "holiday":
      return <IconCalendarOff className="text-orange-500" size={16} />;
    case "blackout":
      return <IconCalendarX className="text-red-500" size={16} />;
    case "slack":
      return <IconClock className="text-blue-500" size={16} />;
    case "lag":
      return <IconArrowRight className="text-blue-500" size={16} />;
    case "constraint":
      return <IconLock className="text-purple-500" size={16} />;
    case "duration":
      return <IconRuler className="text-purple-500" size={16} />;
    case "alignment":
      return <IconCalendarCheck className="text-purple-500" size={16} />;
    case "capacity":
      return <IconUsers className="text-green-500" size={16} />;
    default:
      return null;
  }
}

function getRuleTypeBadge(type: SchedulingRuleType) {
  const labels: Record<SchedulingRuleType, string> = {
    holiday: "Holiday",
    blackout: "Blackout",
    slack: "Slack",
    lag: "Lag",
    constraint: "Constraint",
    duration: "Duration",
    alignment: "Alignment",
    capacity: "Capacity",
  };
  return (
    <Badge className="ml-2 text-[10px]" variant="outline">
      {labels[type]}
    </Badge>
  );
}

function describeHoliday(config: Record<string, unknown>): string {
  if (config.weekdays) {
    const days = config.weekdays as number[];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `Skip: ${days.map((d) => dayNames[d]).join(", ")}`;
  }
  if (config.dates) {
    const dates = config.dates as string[];
    return `${dates.length} specific date${dates.length !== 1 ? "s" : ""}`;
  }
  if (config.recurring) {
    return `Recurring: ${config.month}/${config.day}`;
  }
  return "";
}

function describeDuration(config: Record<string, unknown>): string {
  const parts: string[] = [];
  if (config.minDays !== undefined) {
    parts.push(`Min: ${config.minDays} days`);
  }
  if (config.maxDays !== undefined) {
    parts.push(`Max: ${config.maxDays} days`);
  }
  return parts.join(", ");
}

function describeLag(config: Record<string, unknown>): string {
  const days = config.days as number;
  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""} delay`;
  }
  return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overlap`;
}

const CONSTRAINT_LABELS: Record<string, string> = {
  fixed_end: "Fixed deadline",
  fixed_start: "Fixed start date",
  fixed_both: "Fixed dates",
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

function getRuleDescription(rule: SchedulingRule): string {
  const config = rule.config as Record<string, unknown>;

  switch (rule.type) {
    case "holiday":
      return describeHoliday(config);
    case "blackout":
      return `${config.startDate} to ${config.endDate}`;
    case "slack":
      return `${config.days} day${(config.days as number) !== 1 ? "s" : ""} buffer`;
    case "lag":
      return describeLag(config);
    case "constraint":
      return (
        CONSTRAINT_LABELS[config.constraintType as string] ||
        (config.constraintType as string)
      );
    case "duration":
      return describeDuration(config);
    case "alignment":
      return `Start on ${DAY_NAMES[config.startDay as number]}s`;
    case "capacity":
      return `Max ${config.maxConcurrent} concurrent per ${config.groupBy}`;
    default:
      return "";
  }
}

function RuleRow({
  rule,
  onToggle,
  onDelete,
}: {
  rule: SchedulingRule;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b p-3 last:border-b-0">
      <div className="flex items-center gap-3">
        {getRuleIcon(rule.type as SchedulingRuleType)}
        <div>
          <div className="flex items-center font-medium text-sm">
            {rule.name}
            {getRuleTypeBadge(rule.type as SchedulingRuleType)}
          </div>
          <div className="text-muted-foreground text-xs">
            {getRuleDescription(rule)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={rule.enabled ? "default" : "secondary"}>
          {rule.enabled ? "Active" : "Inactive"}
        </Badge>
        <Button
          onClick={() => onToggle(!rule.enabled)}
          size="sm"
          title={rule.enabled ? "Disable rule" : "Enable rule"}
          variant="ghost"
        >
          {rule.enabled ? (
            <IconToggleRight className="text-primary" size={20} />
          ) : (
            <IconToggleLeft className="text-muted-foreground" size={20} />
          )}
        </Button>
        <Button
          onClick={onDelete}
          size="sm"
          title="Delete rule"
          variant="ghost"
        >
          <IconTrash className="text-destructive" size={16} />
        </Button>
      </div>
    </div>
  );
}

const CATEGORY_DESCRIPTIONS: Record<SchedulingRuleCategory, string> = {
  "Time Off":
    "Holidays and blackout periods skip non-working days when scheduling.",
  Buffers: "Slack and lag rules add buffer time between dependent tasks.",
  Constraints: "Rules that limit task dates, duration, or alignment.",
  Resources: "Capacity rules warn when resources are overallocated.",
};

export function SchedulingRulesDialog({
  open,
  rules,
  onToggleRule,
  onDeleteRule,
  onCreateRule,
  onClose,
}: SchedulingRulesDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] =
    useState<SchedulingRuleCategory>("Time Off");
  const enabledCount = rules.filter((r) => r.enabled).length;

  // Group rules by category
  const rulesByCategory = (
    Object.keys(RULE_CATEGORIES) as SchedulingRuleCategory[]
  ).reduce(
    (acc, category) => {
      const types = RULE_CATEGORIES[category];
      acc[category] = rules.filter((r) =>
        types.includes(r.type as SchedulingRuleType)
      );
      return acc;
    },
    {} as Record<SchedulingRuleCategory, SchedulingRule[]>
  );

  const categories = Object.keys(RULE_CATEGORIES) as SchedulingRuleCategory[];

  const handleCreateRule = (data: {
    type: string;
    name: string;
    config: unknown;
  }) => {
    onCreateRule(data);
    setIsCreating(false);
  };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? "Create New Rule" : "Scheduling Rules"}
          </DialogTitle>
          <DialogDescription>
            {isCreating ? (
              `Add a new ${activeTab.toLowerCase()} rule.`
            ) : (
              <>
                Configure rules that affect how tasks are scheduled when you
                click "Recalculate".
                {enabledCount > 0 && (
                  <span className="ml-1 font-medium text-primary">
                    {enabledCount} rule{enabledCount !== 1 ? "s" : ""} active
                  </span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isCreating ? (
          <RuleEditorForm
            category={activeTab}
            onCancel={() => setIsCreating(false)}
            onSave={handleCreateRule}
          />
        ) : (
          <>
            <Tabs
              className="w-full"
              onValueChange={(v) => setActiveTab(v as SchedulingRuleCategory)}
              value={activeTab}
            >
              <TabsList className="grid w-full grid-cols-4">
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {category.split(" ")[0]} ({rulesByCategory[category].length}
                    )
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => (
                <TabsContent className="mt-4" key={category} value={category}>
                  <ScrollArea className="h-[300px] rounded-md border">
                    {rulesByCategory[category].length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No {category.toLowerCase()} rules configured
                      </div>
                    ) : (
                      rulesByCategory[category].map((rule) => (
                        <RuleRow
                          key={rule.id}
                          onDelete={() => onDeleteRule(rule.id)}
                          onToggle={(enabled) => onToggleRule(rule.id, enabled)}
                          rule={rule}
                        />
                      ))
                    )}
                  </ScrollArea>
                  <p className="mt-2 text-muted-foreground text-xs">
                    {CATEGORY_DESCRIPTIONS[category]}
                  </p>
                </TabsContent>
              ))}
            </Tabs>

            <DialogFooter className="flex-row justify-between sm:justify-between">
              <Button
                className="gap-1"
                onClick={() => setIsCreating(true)}
                variant="outline"
              >
                <IconPlus size={16} />
                Add Rule
              </Button>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
