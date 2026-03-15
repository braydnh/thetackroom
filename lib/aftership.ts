/**
 * AfterShip API helper — creates tracking records and maps carrier codes.
 *
 * AfterShip carrier slugs: https://www.aftership.com/couriers
 * AusPost slug: "australia-post"
 */

const AFTERSHIP_BASE = "https://api.aftership.com/v4";

const CARRIER_SLUG_MAP: Record<string, string> = {
  auspost:        "australia-post",
  startrack:      "startrack",
  sendle:         "sendle",
  courier_please: "couriers-please",
  fastway:        "aramex-australia",
  toll:           "toll-ipec",
  imile:          "imile",
  dhl:            "dhl",
  tnt:            "tnt-au",
  other:          "", // empty = AfterShip auto-detects carrier
};

export function toAfterShipSlug(carrier: string): string {
  return CARRIER_SLUG_MAP[carrier] ?? "";
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

  const trackingBody: Record<string, any> = {
    tracking_number: trackingNumber,
    title: title.slice(0, 100),
    custom_fields: { order_id: orderId },
  };
  if (slug) trackingBody.slug = slug;

  const res = await fetch(`${AFTERSHIP_BASE}/trackings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "aftership-api-key": apiKey,
    },
    body: JSON.stringify({ tracking: trackingBody }),
  });

  const data = await res.json();

  // 201 = created, meta code 4003 = already registered (idempotent — both are fine)
  if (res.status === 201 || data?.meta?.code === 4003) {
    const id = data?.data?.tracking?.id ?? trackingNumber;
    return { tracking_id: id };
  }

  console.error("AfterShip createTracking error:", res.status, JSON.stringify(data));
  return null;
}
