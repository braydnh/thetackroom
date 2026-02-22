/** Format integer cents as AUD string: 2500 → "$25.00" */
export function formatAUD(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Format cents as compact string: 250000 → "$2,500" */
export function formatAUDCompact(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Calculate commission amount in cents */
export function calculateCommission(subtotalCents: number, commissionPct: number): number {
  return Math.round(subtotalCents * (commissionPct / 100));
}

/** Calculate seller payout in cents after commission and Stripe fee */
export function calculateSellerPayout(
  subtotalCents: number,
  shippingCents: number,
  commissionPct: number
): { commission: number; stripeFee: number; sellerPayout: number } {
  const total = subtotalCents + shippingCents;
  const commission = calculateCommission(subtotalCents, commissionPct);
  // Stripe AU domestic: 1.7% + $0.30
  const stripeFee = Math.round(total * 0.017) + 30;
  const sellerPayout = total - commission - stripeFee;
  return { commission, stripeFee, sellerPayout };
}
