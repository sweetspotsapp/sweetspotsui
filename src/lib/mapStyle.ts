// Premium Google Maps style — warm neutrals, hidden POIs, muted roads
export const premiumMapStyle: google.maps.MapTypeStyle[] = [
  // Geometry — soft cream base
  { elementType: "geometry", stylers: [{ color: "#f5f3ee" }] },
  // Labels — muted text
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f3ee" }, { weight: 2 }] },
  // Water — soft blue
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#c6dce8" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#8fafc4" }] },
  // Roads — light gray
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#e8e4dd" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#ddd8cf" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#b0a99a" }] },
  // Highway — slightly visible
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ddd8cf" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#cdc6b9" }] },
  // Parks & green — gentle sage
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#d4dece" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#8a9a7e" }] },
  // Hide all POI icons & labels
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  // Hide transit
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#b0a99a" }] },
  // Administrative — subtle borders
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#ddd8cf" }] },
  { featureType: "administrative.land_parcel", elementType: "labels", stylers: [{ visibility: "off" }] },
  // Landscape — warm neutral
  { featureType: "landscape.man_made", elementType: "geometry.fill", stylers: [{ color: "#efe9e0" }] },
  { featureType: "landscape.natural", elementType: "geometry.fill", stylers: [{ color: "#eee8de" }] },
];
