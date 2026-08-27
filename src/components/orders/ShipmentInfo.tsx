import React from "react";
import { ExternalLink } from "lucide-react";
import { trackingUrlFor } from "@/lib/carriers";

interface ShipmentInfoProps {
  carrier: string | null | undefined;
  trackingNumber: string | null | undefined;
  /** Heading text; defaults to "Shipment". */
  label?: string;
}

/**
 * Read-only shipment display shared by the personal, store and buylist order
 * pages. Shows the carrier + tracking number and a "Track" link that opens the
 * carrier's tracking page (or a universal auto-detecting tracker as fallback).
 */
const ShipmentInfo: React.FC<ShipmentInfoProps> = ({ carrier, trackingNumber, label = "Shipment" }) => {
  if (!trackingNumber) return null;
  const url = trackingUrlFor(carrier, trackingNumber);

  return (
    <div className="text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {carrier ? `${carrier} · ` : ""}
        {trackingNumber}
      </p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Track parcel <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
};

export default ShipmentInfo;
