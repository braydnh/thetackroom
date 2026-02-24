#!/bin/bash
# Regenerates Supabase TypeScript types and appends the named aliases
# Run after every SQL migration: npm run types

set -e

PROJECT_ID="hwgcfhsnfalkbxpipumr"
OUT="types/database.types.ts"

echo "→ Pulling types from Supabase..."
supabase gen types typescript --project-id "$PROJECT_ID" > "$OUT"

echo "→ Appending named type aliases..."
cat >> "$OUT" << 'ALIASES'

// ── Named type aliases (used throughout the codebase) ──────────────
export type UserRole = "buyer" | "seller" | "admin";
export type ListingStatus = "draft" | "active" | "reserved" | "sold" | "suspended" | "deleted";
export type ListingCondition = "new_with_tags" | "like_new" | "good" | "fair" | "worn";
export type ListingCategory = "horse" | "rider" | "sale";
export type OrderStatus =
  | "pending_payment"
  | "payment_captured"
  | "awaiting_shipment"
  | "shipped"
  | "delivered"
  | "dispute_window"
  | "completed"
  | "disputed"
  | "refunded"
  | "cancelled";
export type PickupMethod = "shipping" | "local_pickup";
ALIASES

echo "→ Type-checking..."
npx tsc --noEmit

echo "✓ Done — $OUT is up to date"
