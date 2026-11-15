// Genuine customer reviews only — never add sample or dummy entries.
// Expected shape (every field nullable and optional):
// { id: number, rating: 1–5 | null, review: string | null, customerName: string | null, orderCount: number | null, avatar: string | null }
export const testimonials = []

// Optional section subtitle. Keep null until real review data exists —
// do not claim feedback from customer groups we have not heard from.
export const testimonialSubtitle = null
