// Shared by storefront totals, the back office and the generated server payment
// catalogue. Self-contained (no imports): the catalogue script loads it directly.

/** Own-delivery area: 35 km around the East Rand base towns. */
const RADIUS_KM = 35;
const CENTRES: [number, number][] = [
  [-26.1885, 28.3208], // Benoni
  [-26.2367, 28.3694], // Brakpan
  [-26.2125, 28.2625], // Boksburg
  [-26.1, 28.2333], // Kempton Park
];

/** Town centres (approximate) used to place a delivery address. Unknown towns go by courier. */
const TOWNS: Record<string, [number, number]> = {
  benoni: [-26.1885, 28.3208], brakpan: [-26.2367, 28.3694], boksburg: [-26.2125, 28.2625], "kempton park": [-26.1, 28.2333],
  germiston: [-26.2178, 28.1672], springs: [-26.25, 28.4], edenvale: [-26.1411, 28.1528], bedfordview: [-26.18, 28.136],
  alberton: [-26.2672, 28.1222], nigel: [-26.431, 28.477], tembisa: [-25.996, 28.227], daveyton: [-26.15, 28.417],
  etwatwa: [-26.117, 28.45], vosloorus: [-26.35, 28.2], katlehong: [-26.333, 28.15], thokoza: [-26.353, 28.129],
  kwathema: [-26.293, 28.388], tsakane: [-26.35, 28.367], duduza: [-26.383, 28.4], isando: [-26.144, 28.205],
  bapsfontein: [-26.01, 28.43], modderfontein: [-26.089, 28.17], midrand: [-25.999, 28.126], johannesburg: [-26.2041, 28.0473],
  sandton: [-26.1076, 28.0567], randburg: [-26.0936, 28.0064], centurion: [-25.8603, 28.1894], pretoria: [-25.7479, 28.2293],
  heidelberg: [-26.504, 28.359], delmas: [-26.146, 28.68], soweto: [-26.2485, 27.854], olifantsfontein: [-25.96, 28.23],
};

function km([a, b]: [number, number], [c, d]: [number, number]): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Towns inside the own-delivery area, worked out once from the table above. */
const localTowns = Object.entries(TOWNS)
  .filter(([, at]) => CENTRES.some((c) => km(c, at) <= RADIUS_KM))
  .map(([name]) => name)
  .sort();

export const courierRates = { fee: 200, freeFrom: { "5": 10, "25": 10, "0.5": 12 }, localRadiusKm: RADIUS_KM, localTowns };

/** The delivery town matched in a free-text city ("Benoni, Gauteng" → "benoni"), if it is inside the area. */
export function localTown(city: string | null | undefined, towns: string[] = localTowns): string | null {
  const words = (typeof city === "string" ? city : "").toLowerCase().replace(/[^a-z]+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return null;
  // Whole words only: "Boksburg North" matches Boksburg, "Kemptonpark" matches Kempton Park, "Benonix" matches nothing.
  return towns.find((t) => {
    const tw = t.split(" ");
    return words.some((_, i) => tw.every((w, j) => words[i + j] === w)) || words.includes(tw.join(""));
  }) ?? null;
}
