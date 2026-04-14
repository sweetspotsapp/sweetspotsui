export type { CuratedTrip } from "@/data/tripHelpers";
import type { CuratedTrip } from "@/data/tripHelpers";

import {
  MELBOURNE_SUBURBS,
  AUSTRALIA_STATES,
  JAVA_CITIES,
  INDONESIA_PROVINCES,
  BANGKOK_LOCAL,
  THAILAND_PROVINCES,
} from "@/data/localTrips";

import {
  ABROAD_SHARED,
  GLOBAL_DESTINATIONS,
} from "@/data/globalTrips";

// ── Sectioned trips (for display with headers) ──────────────────────
export interface TripSection {
  title: string;
  trips: CuratedTrip[];
}

// ── Region detection ─────────────────────────────────────────────────
export function detectRegion(
  locationName: string | null | undefined,
  lat?: number | null,
): string {
  const loc = (locationName || "").toLowerCase();

  // City-level
  if (/melbourne/.test(loc)) return "melbourne";
  if (/jakarta/.test(loc)) return "jakarta";
  if (/bangkok/.test(loc)) return "bangkok";

  // Country / state-level
  if (/sydney|brisbane|perth|adelaide|australia|auckland|new zealand|nz|hobart|gold coast|canberra/.test(loc)) return "australia";
  if (/bandung|surabaya|bali|yogyakarta|indonesia|kuala lumpur|malaysia|singapore|semarang|malang/.test(loc)) return "indonesia";
  if (/chiang mai|phuket|thailand|krabi|samui|pai|pattaya/.test(loc)) return "thailand";
  if (/tokyo|osaka|kyoto|japan|seoul|korea|taipei|taiwan/.test(loc)) return "east_asia";
  if (/london|paris|berlin|amsterdam|barcelona|rome|europe|uk|england|lisbon|dublin/.test(loc)) return "europe";
  if (/new york|los angeles|san francisco|usa|america|canada|toronto|vancouver/.test(loc)) return "north_america";
  if (/dubai|abu dhabi|doha|riyadh|uae/.test(loc)) return "middle_east";
  if (/ho chi minh|hanoi|vietnam|phnom penh|cambodia/.test(loc)) return "southeast_asia";

  // Latitude fallback
  if (lat != null) {
    if (lat < -10) return "australia";
    if (lat >= -10 && lat < 2) return "indonesia";
    if (lat >= 2 && lat < 10) return "southeast_asia";
    if (lat >= 10 && lat < 22) return "thailand";
    if (lat >= 22 && lat < 45) return "east_asia";
    if (lat >= 45 && lat < 65) return "europe";
  }

  return "global";
}

// ── Helpers to pick "abroad" trips ───────────────────────────────────
const find = (id: string): CuratedTrip | undefined =>
  ABROAD_SHARED.find((t) => t.id === id) || GLOBAL_DESTINATIONS.find((t) => t.id === id);

const pick = (...ids: string[]): CuratedTrip[] =>
  ids.map(find).filter(Boolean) as CuratedTrip[];

// Abroad picks per home region
const AU_ABROAD = pick("intl-tokyo", "gl-bali", "intl-singapore", "intl-seoul", "intl-hcmc");
const ID_ABROAD = pick("intl-tokyo", "intl-singapore", "intl-seoul", "gl-bangkok", "gl-melbourne");
const TH_ABROAD = pick("intl-tokyo", "gl-bali", "intl-singapore", "intl-hcmc", "intl-seoul");

// ── Region → sectioned trip lists ────────────────────────────────────
export const CURATED_SECTIONS: Record<string, TripSection[]> = {
  melbourne: [
    { title: "Around Melbourne", trips: MELBOURNE_SUBURBS },
    { title: "Across Australia", trips: AUSTRALIA_STATES },
    { title: "Go abroad", trips: AU_ABROAD },
  ],
  australia: [
    { title: "Across Australia", trips: AUSTRALIA_STATES },
    { title: "Go abroad", trips: AU_ABROAD },
  ],
  jakarta: [
    { title: "Explore Java", trips: JAVA_CITIES },
    { title: "Across Indonesia", trips: INDONESIA_PROVINCES },
    { title: "Go abroad", trips: ID_ABROAD },
  ],
  indonesia: [
    { title: "Across Indonesia", trips: INDONESIA_PROVINCES },
    { title: "Go abroad", trips: ID_ABROAD },
  ],
  bangkok: [
    { title: "Bangkok by neighbourhood", trips: BANGKOK_LOCAL },
    { title: "Across Thailand", trips: THAILAND_PROVINCES },
    { title: "Go abroad", trips: TH_ABROAD },
  ],
  thailand: [
    { title: "Across Thailand", trips: THAILAND_PROVINCES },
    { title: "Go abroad", trips: TH_ABROAD },
  ],
  east_asia:      [{ title: "Popular destinations", trips: GLOBAL_DESTINATIONS }],
  europe:         [{ title: "Popular destinations", trips: GLOBAL_DESTINATIONS }],
  north_america:  [{ title: "Popular destinations", trips: GLOBAL_DESTINATIONS }],
  middle_east:    [{ title: "Popular destinations", trips: GLOBAL_DESTINATIONS }],
  southeast_asia: [{ title: "Popular destinations", trips: GLOBAL_DESTINATIONS }],
  global:         [{ title: "Popular destinations", trips: GLOBAL_DESTINATIONS }],
};

// Flat list (legacy compat)
export const CURATED_TRIPS: Record<string, CuratedTrip[]> = Object.fromEntries(
  Object.entries(CURATED_SECTIONS).map(([region, sections]) => [
    region,
    sections.flatMap((s) => s.trips),
  ]),
);
