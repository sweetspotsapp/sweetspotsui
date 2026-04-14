import type { Activity, TimeSlot, TripDay, TripData } from "@/hooks/useTrip";

import tripTokyo from "@/assets/trip-tokyo.jpg";
import tripBali from "@/assets/trip-bali.jpg";
import tripMelbourne from "@/assets/trip-melbourne.jpg";
import tripBangkok from "@/assets/trip-bangkok.jpg";

// ── Image pool ──────────────────────────────────────────────────────
export const IMG = {
  BEACH: tripBali,
  CITY_ASIA: tripTokyo,
  CITY_WEST: tripMelbourne,
  MARKET: tripBangkok,
} as const;

// Unsplash CDN helper — real photos, no AI
const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&h=600&fit=crop&auto=format&q=80`;

// ── Destination image map ───────────────────────────────────────────
const DEST: Record<string, string> = {
  // Local assets (bundled)
  Tokyo: tripTokyo,
  Bali: tripBali,
  Melbourne: tripMelbourne,
  Bangkok: tripBangkok,

  // Australia
  Fitzroy:             u("photo-1514395462725-fb4566210144"),  // Melbourne laneway street art
  "St Kilda":          u("photo-1523482580672-f109ba8cb9be"),  // St Kilda pier sunset
  Brunswick:           u("photo-1523889234001-9b3684123b5f"),  // Melbourne street daytime
  "Mornington Peninsula": u("photo-1506905925346-21bda4d32df4"), // vineyard coastal scenery
  "Yarra Valley":      u("photo-1474487548417-781cb71495f3"), // lush green vineyard valley
  Sydney:              u("photo-1506973035872-a4ec16b8e8d9"),  // Opera House harbour
  "Gold Coast":        u("photo-1519451241324-20b4ea2c4220"),  // surf beach aerial
  "Great Ocean Road":  u("photo-1494791368093-85217fbbf8de"),  // 12 Apostles cliffs
  Tasmania:            u("photo-1516117172878-fd2c41f4a759"),  // Cradle Mountain lake
  Adelaide:            u("photo-1676878791571-72a8b48fcc97"),  // Adelaide city hill view

  // Java & Indonesia
  Yogyakarta:          u("photo-1591674585153-ca78d0339b09"),  // Borobudur temple silhouette
  Bandung:             u("photo-1588668214407-6ea9a6d8c272"),  // Kawah Putih crater
  "Malang":            u("photo-1609946860441-a51ffcf22208"),  // Mt Bromo volcanic sunrise
  Surabaya:            u("photo-1622372738946-62e02505feb3"),  // Heroes Monument
  Semarang:            u("photo-1592364395653-83e648b20cc2"),  // Lawang Sewu colonial building
  Lombok:              u("photo-1558640476-437a2b9438a2"),  // Gili Islands water
  "Raja Ampat":        u("photo-1516690561799-46d8f74f9abf"),  // pristine island aerial
  "Labuan Bajo":       u("photo-1571366343168-631c5bcca7a4"),  // Padar Island viewpoint
  "Lake Toba":         u("photo-1643005264349-aae1772b2186"),  // scenic volcanic lake

  // Thailand
  "Chiang Mai":        u("photo-1598935898639-81586f7d2129"),  // golden temple Doi Suthep
  Phuket:              u("photo-1589394815804-964ed0be2eb5"),  // Phi Phi island aerial
  Krabi:               u("photo-1552465011-b4e21bf6e79a"),  // Railay Beach limestone cliffs
  "Koh Samui":         u("photo-1537956965359-7573183d1f57"),  // tropical island palm beach
  Pai:                 u("photo-1553235848-baa22baca0fb"),  // Pai Canyon vista

  // East Asia
  Seoul:               u("photo-1538485399081-7191377e8241"),  // Gyeongbokgung Palace
  Kyoto:               u("photo-1493976040374-85c8e12f0c0e"),  // Fushimi Inari torii gates
  Singapore:           u("photo-1525625293386-3f8f99389edd"),  // Marina Bay Sands skyline

  // Southeast Asia
  "Ho Chi Minh City":  u("photo-1583417319070-4a69db38a482"),  // motorbike streets
  Hanoi:               u("photo-1509030450996-dd1a26dda07a"),  // Old Quarter lanterns

  // Oceania
  Auckland:            u("photo-1507699622108-4be3abd695ad"),  // harbour skyline

  // Europe
  Paris:               u("photo-1502602898657-3e91760cbb34"),  // Eiffel Tower
  Barcelona:           u("photo-1583422409516-2895a77efded"),  // Sagrada Familia
  London:              u("photo-1513635269975-59663e0ac1ad"),  // Big Ben Thames
  Lisbon:              u("photo-1585208798174-6cedd86e019a"),  // Tram 28 tiled street
  Rome:                u("photo-1552832230-c0197dd311b5"),  // Colosseum golden hour
  Amsterdam:           u("photo-1534351590666-13e3e96b5017"),  // canal houses
  Dubrovnik:           u("photo-1565784623522-7fdf499a94a4"),  // Dubrovnik city walls

  // Middle East & Africa
  Istanbul:            u("photo-1524231757912-21f4fe3a7200"),  // Blue Mosque sunrise
  Dubai:               u("photo-1512453979798-5ea266f8880c"),  // Burj Khalifa skyline
  Marrakech:           u("photo-1597212618440-806262de4f6b"),  // Jemaa el-Fnaa market
  "Cape Town":         u("photo-1580060839134-75a5edca2e99"),  // Table Mountain

  // Americas
  "New York":          u("photo-1496442226666-8d4d0e62e6e9"),  // Manhattan skyline
  Cusco:               u("photo-1526392060635-9d6019884377"),  // Machu Picchu
  "Mexico City":       u("photo-1518659526054-190340b32735"),  // Palacio de Bellas Artes
  Reykjavik:           u("photo-1491466424936-e304919aada7"),  // Northern lights Iceland
};

/** Get the correct image for a destination. Falls back to generic city image. */
export const destImg = (destination: string): string =>
  DEST[destination] || IMG.CITY_WEST;

// ── Compact builder helpers ──────────────────────────────────────────
export const a = (
  name: string, time: string, cat: string, desc: string
): Activity => ({ name, time, category: cat, description: desc });

export const s = (
  time: string, ...activities: Activity[]
): TimeSlot => ({ time, activities });

export const d = (
  label: string, ...slots: TimeSlot[]
): TripDay => ({ label, slots });

export const trip = (
  summary: string, ...days: TripDay[]
): TripData => ({ summary, days });

// ── CuratedTrip type ─────────────────────────────────────────────────
export interface CuratedTrip {
  id: string;
  title: string;
  subtitle: string;
  duration: number;
  image: string;
  destination: string;
  vibes: string[];
  budget: string;
  groupSize: number;
  tripData: TripData;
}

// Shorthand to create a CuratedTrip
export const ct = (
  id: string, title: string, subtitle: string,
  duration: number, image: string, destination: string,
  vibes: string[], budget: string, tripData: TripData,
  groupSize = 2,
): CuratedTrip => ({
  id, title, subtitle, duration, image, destination, vibes, budget, groupSize, tripData,
});
