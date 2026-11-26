/**
 * Storefront product slug → backend oil_product id (ADR-0028, shared by the
 * PDP, the collection grid ratings, and the account review flow).
 * Sunflower has no backend catalog entry yet — it renders no reviews or
 * genealogy by design.
 */
export const OIL_ID = { groundnut: 1, sesame: 2, coconut: 3 }

/** Resolve a backend oil id from a display product name ("Bull Pressed Groundnut Oil"). */
export function oilIdFromName(name: string): number | null {
  const n = name.toLowerCase()
  if (n.includes('groundnut') || n.includes('peanut')) return OIL_ID.groundnut
  if (n.includes('sesame') || n.includes('gingelly')) return OIL_ID.sesame
  if (n.includes('coconut') || n.includes('copra')) return OIL_ID.coconut
  return null
}
