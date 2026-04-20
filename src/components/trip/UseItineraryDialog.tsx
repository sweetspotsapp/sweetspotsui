import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  duration: number;
  onConfirm: (overrides: { name: string; startDate: string }) => void;
}

const UseItineraryDialog = ({ open, onOpenChange, defaultName, duration, onConfirm }: Props) => {
  const [name, setName] = useState(defaultName);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (open) {
      setName(defaultName);
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setStartDate(d.toISOString().split("T")[0]);
    }
  }, [open, defaultName]);

  const endDateLabel = (() => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(0, duration - 1));
    return end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  })();

  const handleSubmit = () => {
    if (!name.trim() || !startDate) return;
    onConfirm({ name: name.trim(), startDate });
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create your trip</DialogTitle>
          <DialogDescription>
            Give it a name and pick a start date. You can edit everything later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="trip-name" className="text-xs font-medium text-muted-foreground">Trip name</Label>
            <Input
              id="trip-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My adventure"
              className="rounded-xl"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="start-date" className="text-xs font-medium text-muted-foreground">Start date</Label>
            <Input
              id="start-date"
              type="date"
              min={todayStr}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl"
            />
            {endDateLabel && (
              <p className="text-xs text-muted-foreground">
                {duration} {duration === 1 ? "day" : "days"} · ends {endDateLabel}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!name.trim() || !startDate}
          >
            Create Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UseItineraryDialog;
