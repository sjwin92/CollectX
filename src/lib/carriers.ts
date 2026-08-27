// Carrier registry for order shipments. The `_carrier` value stored on a
// shipment is the human-readable `name` below (or a free-text value when the
// seller picks "Other"). `trackingUrlFor` maps that stored string back to a
// tracking URL so both parties get a clickable "Track" link.

export interface Carrier {
  /** Stable id, used as the <Select> option value. */
  id: string;
  /** Human-readable name — this is what gets stored on the shipment. */
  name: string;
  /** Build a tracking URL for a given tracking number, or null if unknown. */
  track: ((trackingNumber: string) => string) | null;
}

// A carrier-agnostic tracker that auto-detects most couriers from the number.
export const universalTrackingUrl = (n: string) =>
  `https://parcelsapp.com/en/tracking/${encodeURIComponent(n.trim())}`;

export const CARRIERS: Carrier[] = [
  {
    id: "royal-mail",
    name: "Royal Mail",
    track: (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(n.trim())}`,
  },
  {
    id: "evri",
    name: "Evri",
    track: (n) => `https://www.evri.com/track/parcel/${encodeURIComponent(n.trim())}`,
  },
  {
    id: "dpd-uk",
    name: "DPD (UK)",
    track: (n) => `https://track.dpd.co.uk/parcels/${encodeURIComponent(n.trim())}`,
  },
  {
    id: "parcelforce",
    name: "Parcelforce",
    track: (n) => `https://www.parcelforce.com/track-trace?trackNumber=${encodeURIComponent(n.trim())}`,
  },
  {
    id: "ups",
    name: "UPS",
    track: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n.trim())}`,
  },
  {
    id: "dhl-express",
    name: "DHL Express",
    track: (n) => `https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(n.trim())}`,
  },
  {
    id: "dhl-parcel-uk",
    name: "DHL Parcel UK",
    track: (n) => `https://www.dhlparcel.co.uk/en/tracking.html?consignment=${encodeURIComponent(n.trim())}`,
  },
  {
    id: "fedex",
    name: "FedEx",
    track: (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n.trim())}`,
  },
  {
    id: "an-post",
    name: "An Post",
    track: (n) => `https://www.anpost.com/Post-Parcels/Track/History?item=${encodeURIComponent(n.trim())}`,
  },
  {
    id: "usps",
    name: "USPS",
    track: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n.trim())}`,
  },
  {
    id: "australia-post",
    name: "Australia Post",
    track: (n) => `https://auspost.com.au/mypost/track/#/details/${encodeURIComponent(n.trim())}`,
  },
  {
    id: "canada-post",
    name: "Canada Post",
    track: (n) => `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${encodeURIComponent(n.trim())}`,
  },
  {
    id: "deutsche-post-dhl",
    name: "Deutsche Post / DHL",
    track: (n) => `https://www.dhl.de/en/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(n.trim())}`,
  },
  { id: "other", name: "Other", track: null },
];

/** Options for a <Select>, in display order. */
export const CARRIER_OPTIONS = CARRIERS.map((c) => ({ value: c.name, label: c.name }));

/**
 * Tracking URL for a stored carrier string + tracking number. Falls back to a
 * universal auto-detecting tracker when the carrier is unknown or "Other", so
 * there is always a working link as long as there is a number.
 */
export function trackingUrlFor(carrier: string | null | undefined, trackingNumber: string | null | undefined): string | null {
  const num = (trackingNumber ?? "").trim();
  if (!num) return null;
  const match = CARRIERS.find((c) => c.name.toLowerCase() === (carrier ?? "").trim().toLowerCase());
  if (match?.track) return match.track(num);
  return universalTrackingUrl(num);
}

/** Basic sanity check for a tracking number before it is submitted. */
export function isPlausibleTrackingNumber(value: string): boolean {
  const v = value.trim();
  return v.length >= 4 && v.length <= 40 && /^[A-Za-z0-9 -]+$/.test(v);
}
