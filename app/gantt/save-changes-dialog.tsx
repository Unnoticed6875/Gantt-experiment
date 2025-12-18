"use client";

import { IconSquare, IconSquareCheck } from "@tabler/icons-react";
import { format } from "date-fns";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PendingChange } from "./types";

type SaveChangesDialogProps = {
  open: boolean;
  pendingChanges: Map<string, PendingChange>;
  selectedChanges: Set<string>;
  onSelectionChange: (featureId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSave: () => void;
  onCancel: () => void;
};

export function SaveChangesDialog({
  open,
  pendingChanges,
  selectedChanges,
  onSelectionChange,
  onSelectAll,
  onDeselectAll,
  onSave,
  onCancel,
}: SaveChangesDialogProps) {
  const changes = Array.from(pendingChanges.values());
  const allSelected = selectedChanges.size === pendingChanges.size;
  const noneSelected = selectedChanges.size === 0;

  const handleToggleAll = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="rounded-lg! border border-border shadow-xl ring-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Review Changes</DialogTitle>
          <DialogDescription>
            Review and select which changes to save. Unselected changes will be
            discarded.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <span className="text-muted-foreground text-sm">
            {selectedChanges.size} of {pendingChanges.size} changes selected
          </span>
          <Button onClick={handleToggleAll} size="sm" variant="outline">
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
        </div>

        <ScrollArea className="max-h-[400px] rounded-md border">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-[30%]">Feature</TableHead>
                <TableHead className="w-[20%]">Original</TableHead>
                <TableHead className="w-[20%]">New</TableHead>
                <TableHead className="w-[15%]">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change) => {
                const isSelected = selectedChanges.has(change.featureId);
                return (
                  <TableRow
                    className="cursor-pointer"
                    key={change.featureId}
                    onClick={() =>
                      onSelectionChange(change.featureId, !isSelected)
                    }
                  >
                    <TableCell className="p-2">
                      {isSelected ? (
                        <IconSquareCheck className="text-primary" size={16} />
                      ) : (
                        <IconSquare
                          className="text-muted-foreground"
                          size={16}
                        />
                      )}
                    </TableCell>
                    <TableCell className="truncate p-2 font-medium">
                      <span
                        className="block truncate"
                        title={change.featureName}
                      >
                        {change.featureName}
                      </span>
                      <span
                        className="block truncate text-muted-foreground text-xs"
                        title={change.groupName}
                      >
                        {change.groupName}
                      </span>
                    </TableCell>
                    <TableCell className="p-2 text-muted-foreground text-xs">
                      {format(change.originalStartAt, "MMM d")} -{" "}
                      {format(change.originalEndAt, "MMM d")}
                    </TableCell>
                    <TableCell className="p-2 text-xs">
                      {format(change.newStartAt, "MMM d")} -{" "}
                      {format(change.newEndAt, "MMM d")}
                    </TableCell>
                    <TableCell className="p-2">
                      <Badge
                        className="text-xs"
                        variant={
                          change.source === "drag" ? "secondary" : "outline"
                        }
                      >
                        {change.source === "drag" ? "Drag" : "Recalc"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button disabled={noneSelected} onClick={onSave}>
            Save {selectedChanges.size} Change
            {selectedChanges.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
