import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Serverless function that serves HTML with OG meta tags for /place/:placeId.
 * Called by middleware when a bot/crawler is detected.
 * Real users never hit this — they get the normal SPA.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { placeId } = req.query;
  if (!placeId || typeof placeId !== "string") {
    return res.status(400).send("Missing placeId");
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://gbgnydljseuxmrdywfkb.supabase.co";
  const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const SITE_URL = "https://www.findyoursweetspots.com";

  try {
    // Fetch place data from Supabase
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/places?place_id=eq.${encodeURIComponent(placeId)}&select=name,address,rating,ratings_total,photo_name,ai_reason,best_for,categories&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await response.json();
    const place = data?.[0];

    if (!place) {
      // Fallback to generic OG tags
      return res.status(200).setHeader("Content-Type", "text/html").send(buildHtml({
        title: "SweetSpots — Find places that feel right",
        description: "Save spots you find anywhere, and let AI plan your trip.",
        image: `${SITE_URL}/og-image.jpg`,
        url: `${SITE_URL}/place/${placeId}`,
      }));
    }

    // Build OG data
    const title = `${place.name} — SweetSpots`;
    const description = place.ai_reason
      || (place.best_for?.length ? `Perfect for: ${place.best_for.join(", ")}` : null)
      || `${place.name}${place.address ? ` · ${place.address}` : ""}${place.rating ? ` · ★ ${place.rating}` : ""}`;
    const image = place.photo_name
      ? `${SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(place.photo_name)}&maxWidthPx=1200`
      : `${SITE_URL}/og-image.jpg`;
    const url = `${SITE_URL}/place/${placeId}`;

    return res
      .status(200)
      .setHeader("Content-Type", "text/html")
      .setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
      .send(buildHtml({ title, description, image, url, rating: place.rating, address: place.address }));
  } catch (err) {
    console.error("OG fetch error:", err);
    return res.status(200).setHeader("Content-Type", "text/html").send(buildHtml({
      title: "SweetSpots — Find places that feel right",
      description: "Save spots you find anywhere, and let AI plan your trip.",
      image: `${SITE_URL}/og-image.jpg`,
      url: `${SITE_URL}/place/${placeId}`,
    }));
  }
}

interface OgData {
  title: string;
  description: string;
  image: string;
  url: string;
  rating?: number | null;
  address?: string | null;
}

function buildHtml({ title, description, image, url, rating, address }: OgData): string {
  const escapedTitle = escapeHtml(title);
  const escapedDesc = escapeHtml(description.slice(0, 200));
  const escapedImage = escapeHtml(image);
  const escapedUrl = escapeHtml(url);

  // JSON-LD for rich results
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Place",
    name: title.replace(" — SweetSpots", ""),
    ...(address && { address }),
    ...(rating && { aggregateRating: { "@type": "AggregateRating", ratingValue: rating, bestRating: 5 } }),
    url,
    image,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDesc}" />

  <!-- OpenGraph -->
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDesc}" />
  <meta property="og:type" content="place" />
  <meta property="og:url" content="${escapedUrl}" />
  <meta property="og:image" content="${escapedImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="SweetSpots" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDesc}" />
  <meta name="twitter:image" content="${escapedImage}" />

  <!-- JSON-LD -->
  <script type="application/ld+json">${jsonLd}</script>

  <!-- Redirect real users to the SPA -->
  <meta http-equiv="refresh" content="0;url=${escapedUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${escapedUrl}">${escapedTitle}</a>...</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
