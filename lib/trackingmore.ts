/**
 * Trackingmore API helper — creates tracking records and maps carrier codes.
 *
 * Trackingmore carrier codes: https://www.trackingmore.com/couriers.html
 * Docs: https://www.trackingmore.com/docs/trackingmore/
 */

const TRACKINGMORE_BASE = "https://api.trackingmore.com/v4";

const CARRIER_CODE_MAP: Record<string, string> = {
  auspost:        "australia-post",
  startrack:      "startrack",
  sendle:         "sendle",
  courier_please: "couriers-please",
  fastway:        "aramex-australia",
  toll:           "toll",
  imile:          "imile",
  dhl:            "dhl",
  tnt:            "tnt",
  other:          "", // empty = auto-detect
};

export function toTrackingmoreCode(carrier: string): string {
  return CARRIER_CODE_MAP[carrier] ?? "";
}

export async function createTrackingmoreTracking({
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
  const apiKey = process.env.TRACKINGMORE_API_KEY;
  if (!apiKey) {
    console.warn("TRACKINGMORE_API_KEY not set — skipping tracking creation");
    return null;
  }

  const courierCode = toTrackingmoreCode(carrier);

  const body: Record<string, any> = {
    tracking_number: trackingNumber,
    order_id: orderId,
    title: title.slice(0, 256),
  };
  if (courierCode) body.courier_code = courierCode;

  const res = await fetch(`${TRACKINGMORE_BASE}/trackings/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Tracking-Api-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  // 200/201 = created, code 4013 = tracking already exists (both are fine)
  if (res.ok || data?.meta?.code === 4013) {
    const id = data?.data?.id ?? trackingNumber;
    return { tracking_id: id };
  }

  console.error("Trackingmore createTracking error:", res.status, JSON.stringify(data));
  return null;
}
