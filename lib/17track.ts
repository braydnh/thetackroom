/**
 * 17track API helper — creates tracking records and maps carrier codes.
 *
 * 17track carrier codes: https://www.17track.net/en/apidoc
 * Docs: https://api.17track.net/track/v2.2
 */

const SEVENTEEN_TRACK_BASE = "https://api.17track.net/track/v2.2";

// 17track uses numeric carrier codes
const CARRIER_CODE_MAP: Record<string, number> = {
  auspost: 100066,
  startrack: 100038,
  sendle: 100024,
  courier_please: 100018,
  fastway: 100064, // Fastway / Aramex Australia
  toll: 100045,
  imile: 190438,
  dhl: 100002,
  tnt: 100058,
  other: 0, // 0 = auto-detect carrier
};

export function to17TrackCode(carrier: string): number {
  return CARRIER_CODE_MAP[carrier] ?? 100066;
}

export async function create17TrackTracking({
  trackingNumber,
  carrier,
  orderId,
}: {
  trackingNumber: string;
  carrier: string;
  orderId: string;
}): Promise<{ tracking_id: string } | null> {
  const apiKey = process.env.SEVENTEEN_TRACK_API_KEY;
  if (!apiKey) {
    console.warn("SEVENTEEN_TRACK_API_KEY not set — skipping tracking creation");
    return null;
  }

  const res = await fetch(`${SEVENTEEN_TRACK_BASE}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "17token": apiKey,
    },
    body: JSON.stringify([
      {
        number: trackingNumber,
        carrier: 0, // always auto-detect — carrier dropdown is display-only
        extra: {
          order_no: orderId,
        },
      },
    ]),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("17track createTracking error:", res.status, body);
    return null;
  }

  const data = await res.json();
  const accepted = data?.data?.accepted?.[0];
  if (!accepted) {
    console.error("17track: tracking not accepted", data?.data?.rejected);
    return null;
  }
  return { tracking_id: accepted.number };
}
