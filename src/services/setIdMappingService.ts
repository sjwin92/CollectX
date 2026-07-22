// Set ID normalization. There is no legitimate remapping needed between the
// Pokemon TCG API's set IDs and our mirror — they're the same IDs. A prior
// version of this file remapped some IDs (e.g. rsv10pt5 -> sv8pt5), but that
// was actively wrong: rsv10pt5 ("White Flare") and sv8pt5 ("Prismatic
// Evolutions") are two distinct, real sets, so that remap silently showed the
// wrong set's cards. normalizeSetId is now just a safe trim/lowercase.
export const normalizeSetId = (setId: string): string => {
  if (!setId) return setId;
  return setId.toLowerCase().trim();
};

// Suggested sets for the "no results, try these" UI. Names verified against
// the actual mirrored set data.
export const getPopularSetIds = (): Array<{ id: string; name: string }> => {
  return [
    { id: 'sv8pt5', name: 'Prismatic Evolutions' },
    { id: 'sv8', name: 'Surging Sparks' },
    { id: 'sv7', name: 'Stellar Crown' },
    { id: 'sv6', name: 'Twilight Masquerade' },
    { id: 'sv5', name: 'Temporal Forces' },
    { id: 'zsv10pt5', name: 'Black Bolt' },
    { id: 'rsv10pt5', name: 'White Flare' },
    { id: 'swsh12pt5', name: 'Crown Zenith' },
    { id: 'swsh12', name: 'Silver Tempest' },
    { id: 'swsh11', name: 'Lost Origin' },
    { id: 'base1', name: 'Base' },
    { id: 'base2', name: 'Jungle' },
    { id: 'base3', name: 'Fossil' },
  ];
};
