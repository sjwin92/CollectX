import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CARRIERS, isPlausibleTrackingNumber } from "@/lib/carriers";

interface ShipmentFormProps {
  /** Called with the resolved carrier name and tracking number. */
  onSubmit: (tracking: string, carrier: string) => void;
  isPending?: boolean;
}

/**
 * "Mark as shipped" form shared by the personal, store and buylist order pages.
 * Carrier is picked from a list (with an "Other" free-text fallback) so we can
 * build a working tracking link for the buyer.
 */
const ShipmentForm: React.FC<ShipmentFormProps> = ({ onSubmit, isPending }) => {
  const [carrierChoice, setCarrierChoice] = useState<string>("");
  const [otherCarrier, setOtherCarrier] = useState("");
  const [tracking, setTracking] = useState("");

  const isOther = carrierChoice === "Other";
  const carrier = isOther ? otherCarrier.trim() : carrierChoice;
  const trackingValid = isPlausibleTrackingNumber(tracking);
  const canSubmit = !!carrier && trackingValid && !isPending;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Carrier</Label>
        <Select value={carrierChoice} onValueChange={setCarrierChoice}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a carrier" />
          </SelectTrigger>
          <SelectContent>
            {CARRIERS.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isOther && (
        <Input
          placeholder="Carrier name"
          value={otherCarrier}
          onChange={(e) => setOtherCarrier(e.target.value)}
          maxLength={80}
        />
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Tracking number</Label>
        <Input
          placeholder="e.g. AB123456789GB"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          maxLength={40}
        />
        {tracking.length > 0 && !trackingValid && (
          <p className="text-xs text-destructive">
            Enter the tracking number as it appears on your postage receipt (letters, numbers, spaces or hyphens).
          </p>
        )}
      </div>

      <Button onClick={() => onSubmit(tracking.trim(), carrier)} disabled={!canSubmit}>
        {isPending ? "Saving..." : "Mark as shipped"}
      </Button>
    </div>
  );
};

export default ShipmentForm;
