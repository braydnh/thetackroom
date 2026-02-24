/**
 * AfterShip API helper — creates tracking records and maps carrier codes.
 *
 * AfterShip carrier slugs: https://www.aftership.com/couriers
 * AusPost slug: "australia-post"
 */

const AFTERSHIP_BASE = "https://api.aftership.com/v4";

const CARRIER_SLUG_MAP: Record<string, string> = {
  auspost: "australia-post",
  startrack: "startrack",
  sendle: "sendle",
  courier_please: "couriersplease",
  dhl: "dhl",
  tnt: "tnt-au",
  other: "australia-post", // fallback
};

export function toAfterShipSlug(carrier: string): string {
  return CARRIER_SLUG_MAP[carrier] ?? "australia-post";
}

export async function createAfterShipTracking({
  trackingNumber,
  carrier,
  orderId,
  title,
}: {
  trackingNumber: string;
  carrier: string;
  orderId: string;
  title: string;
}): Promise<{ tracking_id: string } | null> {
  const apiKey = process.env.AFTERSHIP_API_KEY;
  if (!apiKey) {
    console.warn("AFTERSHIP_API_KEY not set — skipping tracking creation");
    return null;
  }

  const slug = toAfterShipSlug(carrier);

  const res = await fetch(`${AFTERSHIP_BASE}/trackings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "aftership-api-key": apiKey,
    },
    body: JSON.stringify({
      tracking: {
        tracking_number: trackingNumber,
        slug,
        title: title.slice(0, 100),
        custom_fields: {
          order_id: orderId,
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("AfterShip createTracking error:", res.status, body);
    return null;
  }

  const data = await res.json();
  return { tracking_id: data?.data?.tracking?.id ?? "" };
}
