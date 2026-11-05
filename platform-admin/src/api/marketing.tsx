import { useCallback, useState } from 'react'
import { api } from './client'
import { useToast } from '../ui'

/* ---- AI marketing layer (ADR-0016): POST /g/marketing/generate, GET /g/marketing/subscribers ---- */
export type MarketingTask = 'product-description' | 'hero-copy' | 'ticker-lines' | 'testimonial' | 'email-campaign'

export const MARKETING_TASKS: { id: MarketingTask; label: string }[] = [
  { id: 'product-description', label: 'Product description' },
  { id: 'hero-copy', label: 'Homepage hero copy' },
  { id: 'ticker-lines', label: 'Ticker lines' },
  { id: 'testimonial', label: 'Testimonial' },
  { id: 'email-campaign', label: 'Email campaign' },
]

export interface GenerateResponse { text: string; provider: string }
export interface Subscriber { id: number; email: string; name?: string; source?: string; createdAt: string }
export interface SubscribersResponse { subscribers: Subscriber[]; provider: string }

/* ---- bulk campaigns (ADR-0018): create-and-send via the ADR-0016 newsletter gateway ---- */
export interface Campaign {
  id: number; name: string; subject: string; status: string
  recipientCount: number; provider: string; createdAt: string; sentAt?: string
}
export interface CreateCampaignRequest { name: string; subject: string; body: string }

export const marketing = {
  generate: (task: MarketingTask, context: Record<string, unknown>) =>
    api.post<GenerateResponse>('/g/marketing/generate', { task, context }),
  subscribers: () => api.get<SubscribersResponse>('/g/marketing/subscribers'),
  campaigns: () => api.get<Campaign[]>('/g/marketing/campaigns'),
  createCampaign: (body: CreateCampaignRequest) =>
    api.post<Campaign>('/g/marketing/campaigns', body),
}

/** Lenient JSON parse for AI output — tolerates ```json fences, null when not JSON. */
export function tryParseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(t)
  } catch {
    return null
  }
}

/** demo provider renders brand-voice templates; anything else is the live engine. */
export function providerTone(provider: string): 'gold' | 'forest' {
  return provider === 'demo' ? 'gold' : 'forest'
}

/** Shared busy/error wrapper so every "Generate" button behaves the same. */
export function useAiGenerate() {
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const run = useCallback(async (task: MarketingTask, context: Record<string, unknown>): Promise<GenerateResponse | null> => {
    setBusy(true)
    try {
      return await marketing.generate(task, context)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setBusy(false)
    }
  }, [toast])
  return { busy, run }
}
