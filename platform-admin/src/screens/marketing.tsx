import { useCallback, useState } from 'react'
import { Button, Field, Pill, useToast, type Column } from '../ui'
import { formatDate } from '../api/formats'
import { useList, View } from '../api/list'
import {
  MARKETING_TASKS, providerTone, tryParseJson, useAiGenerate,
  type MarketingTask, type Subscriber, type SubscribersResponse,
} from '../api/marketing'
import { PanelTitle } from './shared'

export function MarketingScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <AiAssistantPanel />
      <SubscribersPanel />
    </div>
  )
}

/* ================= AI copy assistant ================= */
interface CtxField { key: string; label: string; type?: string; multiline?: boolean; placeholder?: string }

const CTX_FIELDS: Record<MarketingTask, CtxField[]> = {
  'product-description': [
    { key: 'productName', label: 'Product name', placeholder: 'Cold-Pressed Groundnut Oil' },
    { key: 'oilType', label: 'Oil type', placeholder: 'GROUNDNUT' },
    { key: 'sizeMl', label: 'Size (ml)', type: 'number', placeholder: '500' },
    { key: 'notes', label: 'Notes', multiline: true, placeholder: 'Single-origin harvest, wooden press…' },
  ],
  'email-campaign': [
    { key: 'productName', label: 'Product name', placeholder: 'Cold-Pressed Groundnut Oil' },
    { key: 'batchDate', label: 'Batch date', type: 'date' },
  ],
  'hero-copy': [],
  'ticker-lines': [],
  'testimonial': [],
}

/** Structured copy comes back as JSON for these tasks — render fields, not raw JSON. */
function structuredFields(task: MarketingTask, text: string): { label: string; value: string }[] | null {
  if (task === 'product-description' || task === 'email-campaign') return null
  const parsed = tryParseJson(text)
  if (parsed == null) return null
  if (task === 'ticker-lines') {
    const arr = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object'
        ? (Object.values(parsed as Record<string, unknown>).find(Array.isArray) ?? null)
        : null
    if (!arr) return null
    const lines = arr.filter((x): x is string => typeof x === 'string' && !!x.trim())
    return lines.length ? lines.map((line, i) => ({ label: `Line ${i + 1}`, value: line })) : null
  }
  const obj = Array.isArray(parsed) ? parsed[0] : parsed
  if (typeof obj !== 'object' || obj === null) return null
  const o = obj as Record<string, unknown>
  if (task === 'hero-copy') {
    if (typeof o.headline !== 'string') return null
    const fields = [{ label: 'Headline', value: o.headline }]
    if (typeof o.subcopy === 'string') fields.push({ label: 'Subcopy', value: o.subcopy })
    return fields
  }
  if (typeof o.quote !== 'string') return null
  const fields = [{ label: 'Quote', value: o.quote }]
  if (typeof o.author === 'string') fields.push({ label: 'Author', value: o.author })
  if (typeof o.location === 'string') fields.push({ label: 'Location', value: o.location })
  return fields
}

function AiAssistantPanel() {
  const [task, setTask] = useState<MarketingTask>('product-description')
  const [ctx, setCtx] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ text: string; provider: string } | null>(null)
  const ai = useAiGenerate()
  const toast = useToast()

  const fields = CTX_FIELDS[task]
  const buildContext = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const f of fields) {
      const v = (ctx[f.key] ?? '').trim()
      if (!v) continue
      out[f.key] = f.type === 'number' ? Number(v) : v
    }
    return out
  }

  const generate = async () => {
    const res = await ai.run(task, buildContext())
    if (res) setResult({ text: res.text, provider: res.provider })
  }

  const copy = async () => {
    if (!result) return
    const s = structuredFields(task, result.text)
    const text = s
      ? task === 'ticker-lines'
        ? s.map((f) => f.value).join('\n')
        : s.map((f) => `${f.label}: ${f.value}`).join('\n')
      : result.text
    try {
      await navigator.clipboard.writeText(text)
      toast('success', 'Copied to clipboard')
    } catch {
      toast('error', 'Couldn’t copy — the browser refused clipboard access.')
    }
  }

  const shown = result ? structuredFields(task, result.text) : null

  return (
    <div className="card">
      <PanelTitle action={<Pill tone="forest">5 tasks</Pill>}>AI copy assistant</PanelTitle>
      <div style={{ padding: 16, maxWidth: 860 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Task">
            <select className="input" style={{ minWidth: 220 }} value={task}
              onChange={(e) => { setTask(e.target.value as MarketingTask); setResult(null) }}>
              {MARKETING_TASKS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.multiline
                ? <textarea className="input" style={{ width: 260, minHeight: 60 }} value={ctx[f.key] ?? ''} placeholder={f.placeholder}
                    onChange={(e) => setCtx((c) => ({ ...c, [f.key]: e.target.value }))} />
                : <input className="input" type={f.type ?? 'text'} style={{ width: f.type === 'date' ? 170 : 200 }} value={ctx[f.key] ?? ''} placeholder={f.placeholder}
                    onChange={(e) => setCtx((c) => ({ ...c, [f.key]: e.target.value }))} />}
            </Field>
          ))}
          <Button variant="gold" disabled={ai.busy} onClick={generate}>{ai.busy ? 'Generating…' : 'Generate'}</Button>
        </div>
        {fields.length === 0 && (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--muted)' }}>No extra context needed for this task.</p>
        )}

        {result && (
          <div style={{ border: '1px solid var(--hairline)', borderRadius: 8, padding: 12, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Result</span>
              <Pill tone={providerTone(result.provider)}>{result.provider}</Pill>
              <span style={{ flex: 1 }} />
              <Button variant="ghost" small onClick={copy}>Copy</Button>
            </div>
            {shown ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {shown.map((f) => (
                  <div key={f.label}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{f.label}</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{f.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{result.text}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ================= newsletter subscribers ================= */
function useSubscribers() {
  const [provider, setProvider] = useState<string | null>(null)
  const adapt = useCallback((raw: SubscribersResponse) => {
    setProvider(raw.provider)
    return raw.subscribers
  }, [])
  const { data, error, loading, reload } = useList<Subscriber, SubscribersResponse>('/marketing/subscribers', adapt)
  return { rows: data, error, loading, reload, provider }
}

function SubscribersPanel() {
  const { rows, error, loading, reload, provider } = useSubscribers()
  const cols: Column<never>[] = [
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name', render: (s: Subscriber) => s.name || '—' },
    { key: 'source', label: 'Source', render: (s: Subscriber) => <Pill tone="plain">{s.source || '—'}</Pill> },
    { key: 'createdAt', label: 'Subscribed', render: (s: Subscriber) => formatDate(s.createdAt) },
  ] as never
  return (
    <div className="card">
      <PanelTitle action={provider ? <Pill tone={providerTone(provider)}>{provider}</Pill> : undefined}>
        Newsletter subscribers
      </PanelTitle>
      <div className="toolbar" style={{ padding: '10px 16px 0' }}>
        <Pill tone="forest">{rows?.length ?? 0} subscribers</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
      </div>
      <View loading={loading} error={error} rows={rows as never[] | null} cols={cols}
        empty="No subscribers yet — the storefront form feeds this list." onRetry={reload} />
    </div>
  )
}
