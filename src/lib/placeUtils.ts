export interface PriceInfo {
  symbol: string;
  estimate: string;
}

export const getPriceRangeFromLevel = (level: number | null, categories: string[] | null): PriceInfo => {
  const cats = categories?.map(c => c.toLowerCase()) || [];

  const isBarOrNightlife = cats.some(c => c.includes('bar') || c.includes('night_club') || c.includes('nightlife'));
  const isCafeOrBakery = cats.some(c => c.includes('cafe') || c.includes('bakery') || c.includes('coffee'));
  const isSpaOrWellness = cats.some(c => c.includes('spa') || c.includes('beauty') || c.includes('health'));
  const isAttraction = cats.some(c => c.includes('tourist') || c.includes('museum') || c.includes('park') || c.includes('zoo'));

  if (level === null) {
    if (isAttraction) return { symbol: '$$', estimate: '$5-15/entry' };
    if (isSpaOrWellness) return { symbol: '$$$', estimate: '$15-35' };
    return { symbol: '$$', estimate: 'Check for prices' };
  }

  const ranges: Record<string, Record<number, PriceInfo>> = {
    bar: {
      0: { symbol: 'Free', estimate: 'No cover charge' },
      1: { symbol: '$', estimate: '$3-7/drink' },
      2: { symbol: '$$', estimate: '$7-15/drink' },
      3: { symbol: '$$$', estimate: '$15-30/drink' },
      4: { symbol: '$$$$', estimate: '$30+/drink' },
    },
    cafe: {
      0: { symbol: 'Free', estimate: 'Free samples/promos' },
      1: { symbol: '$', estimate: '$2-5/person' },
      2: { symbol: '$$', estimate: '$5-10/person' },
      3: { symbol: '$$$', estimate: '$10-20/person' },
      4: { symbol: '$$$$', estimate: '$20+/person' },
    },
    spa: {
      0: { symbol: 'Free', estimate: 'Complimentary services' },
      1: { symbol: '$', estimate: '$10-25/session' },
      2: { symbol: '$$', estimate: '$25-50/session' },
      3: { symbol: '$$$', estimate: '$50-100/session' },
      4: { symbol: '$$$$', estimate: '$100+/session' },
    },
    attraction: {
      0: { symbol: 'Free', estimate: 'Free entry' },
      1: { symbol: '$', estimate: '$2-5/entry' },
      2: { symbol: '$$', estimate: '$5-10/entry' },
      3: { symbol: '$$$', estimate: '$10-20/entry' },
      4: { symbol: '$$$$', estimate: '$20+/entry' },
    },
    default: {
      0: { symbol: 'Free', estimate: 'Free tastings/promos' },
      1: { symbol: '$', estimate: '$5-15/person' },
      2: { symbol: '$$', estimate: '$15-30/person' },
      3: { symbol: '$$$', estimate: '$30-75/person' },
      4: { symbol: '$$$$', estimate: '$75+/person' },
    },
  };

  const category = isBarOrNightlife ? 'bar' : isCafeOrBakery ? 'cafe' : isSpaOrWellness ? 'spa' : isAttraction ? 'attraction' : 'default';
  return ranges[category][level] || ranges[category][2] || ranges.default[2];
};

export const parseOpeningHours = (openingHours: { open_now: boolean; weekday_text: string[] } | null) => {
  if (!openingHours?.weekday_text?.length) return null;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  return openingHours.weekday_text.map((text, index) => {
    const parts = text.split(': ');
    return {
      day: parts[0] || days[index],
      hours: parts[1] || 'Hours not available',
      isToday: index === todayIndex,
    };
  });
};

/** Haversine distance in kilometres between two lat/lng pairs. Returns 0 if any coordinate is null/undefined/NaN. */
export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null ||
      isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Haversine distance in metres. */
export const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number =>
  haversineKm(lat1, lng1, lat2, lng2) * 1000;

/** @deprecated Use haversineKm instead */
export const calculateDistance = haversineKm;
